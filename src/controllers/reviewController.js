import { ObjectId } from 'mongodb';
import { getCollection } from '../config/db.js';

// Ensures a unique compound index exists so the database itself prevents duplicate reviews,
// acting as a hard constraint independent of application-level duplicate checks.
async function ensureReviewIndex() {
  const reviewsCol = getCollection('reviews');
  await reviewsCol.createIndex(
    { itemId: 1, customerId: 1 },
    { unique: true, background: true }
  );
}

// ─── CREATE ──────────────────────────────────────────────────────────────────

export async function addReview(req, res, next) {
  try {
    const { itemId, rating, comment } = req.body;

    if (!itemId || rating === undefined || !comment) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: itemId, rating, and comment are required',
      });
    }

    const numericRating = Number(rating);
    if (isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be an integer between 1 and 5',
      });
    }

    if (!ObjectId.isValid(itemId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid menu item ID',
      });
    }

    const menuCol = getCollection('menuItems');
    const item = await menuCol.findOne({ _id: new ObjectId(itemId) });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Menu item not found',
      });
    }

    // Verified Purchase: the authenticated customer must have a delivered or completed order
    // for this exact item. req.user._id comes from the live DB via verifyToken — never trusted from body.
    const ordersCol = getCollection('orders');
    const verifiedOrder = await ordersCol.findOne({
      customerId: req.user._id,
      itemId: item._id,
      status: { $in: ['delivered', 'completed'] },
    });

    if (!verifiedOrder) {
      return res.status(403).json({
        success: false,
        message: 'You can only review items from your delivered or completed orders',
      });
    }

    const reviewsCol = getCollection('reviews');

    // Application-level duplicate guard before the DB unique index fires.
    const existing = await reviewsCol.findOne({
      itemId: item._id,
      customerId: req.user._id,
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'You have already reviewed this item. Edit your existing review instead.',
      });
    }

    // Ensure the unique index exists (idempotent — MongoDB skips creation if already present).
    await ensureReviewIndex();

    const newReview = {
      itemId: item._id,
      vendorId: item.vendorId,
      customerId: req.user._id,
      customerName: req.user.name,
      customerImage: req.user.image || '',
      rating: Math.round(numericRating),
      comment: comment.trim(),
      verifiedPurchase: true,
      createdAt: new Date(),
      updatedAt: null,
    };

    const result = await reviewsCol.insertOne(newReview);

    res.status(201).json({
      success: true,
      message: 'Review posted successfully',
      data: { _id: result.insertedId, ...newReview },
    });
  } catch (error) {
    // MongoDB duplicate key error — unique index caught a race condition the app check missed.
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'You have already reviewed this item. Edit your existing review instead.',
      });
    }
    next(error);
  }
}

// ─── READ (public) ────────────────────────────────────────────────────────────

export async function getItemReviews(req, res, next) {
  try {
    const { itemId } = req.params;

    if (!ObjectId.isValid(itemId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid menu item ID',
      });
    }

    const reviewsCol = getCollection('reviews');

    const reviews = await reviewsCol
      .find({ itemId: new ObjectId(itemId) })
      .sort({ createdAt: -1 })
      .toArray();

    const totalReviews = reviews.length;
    const averageRating =
      totalReviews > 0
        ? Number((reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(1))
        : 0;

    res.json({
      success: true,
      totalReviews,
      averageRating,
      data: reviews,
    });
  } catch (error) {
    next(error);
  }
}

// ─── READ (vendor — own products only) ───────────────────────────────────────

export async function getVendorReviews(req, res, next) {
  try {
    const reviewsCol = getCollection('reviews');

    // Only return reviews for items that belong to the authenticated vendor.
    // req.user._id is sourced from the live DB — vendors cannot spoof another vendor's ID.
    const reviews = await reviewsCol
      .find({ vendorId: req.user._id })
      .sort({ createdAt: -1 })
      .toArray();

    const totalReviews = reviews.length;
    const averageRating =
      totalReviews > 0
        ? Number((reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(1))
        : 0;

    res.json({
      success: true,
      totalReviews,
      averageRating,
      data: reviews,
    });
  } catch (error) {
    next(error);
  }
}

// ─── UPDATE (customer — own review only) ─────────────────────────────────────

export async function updateReview(req, res, next) {
  try {
    const { reviewId } = req.params;
    const { rating, comment } = req.body;

    if (!reviewId || !ObjectId.isValid(reviewId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid review ID',
      });
    }

    if (rating === undefined && !comment) {
      return res.status(400).json({
        success: false,
        message: 'Provide at least one field to update: rating or comment',
      });
    }

    const reviewsCol = getCollection('reviews');
    const review = await reviewsCol.findOne({ _id: new ObjectId(reviewId) });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found',
      });
    }

    // Customers can only edit their own review — never another customer's.
    if (review.customerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You can only edit your own reviews',
      });
    }

    const updates = { updatedAt: new Date() };

    if (rating !== undefined) {
      const numericRating = Number(rating);
      if (isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
        return res.status(400).json({
          success: false,
          message: 'Rating must be an integer between 1 and 5',
        });
      }
      updates.rating = Math.round(numericRating);
    }

    if (comment) {
      if (typeof comment !== 'string' || comment.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Comment cannot be empty',
        });
      }
      updates.comment = comment.trim();
    }

    const updated = await reviewsCol.findOneAndUpdate(
      { _id: new ObjectId(reviewId) },
      { $set: updates },
      { returnDocument: 'after' }
    );

    res.json({
      success: true,
      message: 'Review updated successfully',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

// ─── DELETE (customer — own review | admin — any review) ─────────────────────

export async function deleteReview(req, res, next) {
  try {
    const { reviewId } = req.params;

    if (!reviewId || !ObjectId.isValid(reviewId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid review ID',
      });
    }

    const reviewsCol = getCollection('reviews');
    const review = await reviewsCol.findOne({ _id: new ObjectId(reviewId) });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found',
      });
    }

    const isAdmin = req.user.role === 'admin';
    const isOwner = review.customerId.toString() === req.user._id.toString();

    // Admins can remove policy-violating reviews (spam, abuse, fakes).
    // Customers can only delete their own review.
    // Vendors are explicitly blocked — they cannot suppress critical customer feedback.
    if (!isAdmin && !isOwner) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permission to delete this review',
      });
    }

    await reviewsCol.deleteOne({ _id: new ObjectId(reviewId) });

    res.json({
      success: true,
      message: 'Review deleted successfully',
    });
  } catch (error) {
    next(error);
  }
}
