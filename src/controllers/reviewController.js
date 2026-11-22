import { ObjectId } from 'mongodb';
import { getCollection } from '../config/db.js';

// Ensures unique index on orderId so database itself prevents duplicate reviews per order.
async function ensureReviewIndex() {
  try {
    const reviewsCol = getCollection('reviews');
    await reviewsCol.createIndex(
      { orderId: 1 },
      { unique: true, sparse: true, background: true }
    );
  } catch (err) {
    console.error('Error creating review index:', err);
  }
}

// Recalculates and updates rating and numReviews on the menu item.
export async function updateMenuItemRating(itemId) {
  try {
    if (!itemId) return;
    const reviewsCol = getCollection('reviews');
    const menuCol = getCollection('menuItems');
    const objectItemId = typeof itemId === 'string' && ObjectId.isValid(itemId)
      ? new ObjectId(itemId)
      : itemId;

    const stats = await reviewsCol.aggregate([
      {
        $match: {
          $or: [
            { itemId: objectItemId },
            { itemId: objectItemId.toString() },
          ],
        },
      },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 },
        },
      },
    ]).toArray();

    const avg = stats.length > 0 ? Number(stats[0].averageRating.toFixed(2)) : 0;
    const count = stats.length > 0 ? stats[0].totalReviews : 0;

    await menuCol.updateOne(
      {
        $or: [
          { _id: objectItemId },
          { _id: objectItemId.toString() },
        ],
      },
      {
        $set: {
          rating: avg,
          numReviews: count,
          updatedAt: new Date(),
        },
      }
    );
  } catch (err) {
    console.error('Error updating menu item rating:', err);
  }
}

// ─── CREATE ──────────────────────────────────────────────────────────────────

export async function addReview(req, res, next) {
  try {
    const { orderId, itemId, rating, comment } = req.body;

    if (rating === undefined || !comment || typeof comment !== 'string' || !comment.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Rating and comment are required',
      });
    }

    const numericRating = Number(rating);
    if (isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be an integer between 1 and 5',
      });
    }

    const ordersCol = getCollection('orders');
    const reviewsCol = getCollection('reviews');
    const menuCol = getCollection('menuItems');

    let verifiedOrder = null;

    if (orderId) {
      if (!ObjectId.isValid(orderId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid order ID',
        });
      }

      verifiedOrder = await ordersCol.findOne({
        _id: new ObjectId(orderId),
        $or: [
          { customerId: req.user._id },
          { customerId: req.user._id.toString() },
        ],
      });

      if (!verifiedOrder) {
        return res.status(404).json({
          success: false,
          message: 'Order not found or does not belong to you',
        });
      }
    } else if (itemId) {
      if (!ObjectId.isValid(itemId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid menu item ID',
        });
      }

      verifiedOrder = await ordersCol.findOne({
        $or: [
          { customerId: req.user._id },
          { customerId: req.user._id.toString() },
        ],
        $or: [
          { itemId: new ObjectId(itemId) },
          { itemId: itemId.toString() },
        ],
      });

      if (!verifiedOrder) {
        return res.status(404).json({
          success: false,
          message: 'No order found for this item',
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        message: 'orderId or itemId is required',
      });
    }

    // Enforce review eligibility on the backend:
    // Only accepted (or delivered/completed) orders can be reviewed.
    const orderStatus = (verifiedOrder.status || '').toLowerCase();
    if (orderStatus !== 'accepted' && orderStatus !== 'delivered' && orderStatus !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'This order has not been accepted or fulfilled yet. You can review only accepted orders.',
      });
    }

    // Check for duplicate review for this order
    const existingForOrder = await reviewsCol.findOne({
      $or: [
        { orderId: verifiedOrder._id },
        { orderId: verifiedOrder._id.toString() },
      ],
    });

    if (existingForOrder) {
      return res.status(409).json({
        success: false,
        message: 'You have already reviewed this order.',
      });
    }

    // Ensure index exists
    await ensureReviewIndex();

    // Find the item details for vendor and item ID
    const targetItemId = verifiedOrder.itemId;
    const item = await menuCol.findOne({
      $or: [
        { _id: new ObjectId(targetItemId) },
        { _id: targetItemId.toString() },
      ],
    });

    const newReview = {
      orderId: verifiedOrder._id,
      itemId: item ? item._id : new ObjectId(targetItemId),
      vendorId: item ? item.vendorId : verifiedOrder.vendorId,
      customerId: req.user._id,
      customerName: req.user.name || 'Valued Customer',
      customerImage: req.user.image || '',
      rating: Math.round(numericRating),
      comment: comment.trim(),
      verifiedPurchase: true,
      createdAt: new Date(),
      updatedAt: null,
    };

    const result = await reviewsCol.insertOne(newReview);

    // Recalculate and update the menu item's rating and count
    await updateMenuItemRating(newReview.itemId);

    res.status(201).json({
      success: true,
      message: 'Review posted successfully',
      data: { _id: result.insertedId, ...newReview },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'You have already reviewed this order.',
      });
    }
    next(error);
  }
}

// ─── READ (public — item reviews) ──────────────────────────────────────────

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
      .find({
        $or: [
          { itemId: new ObjectId(itemId) },
          { itemId: itemId.toString() },
        ],
      })
      .sort({ createdAt: -1 })
      .toArray();

    const totalReviews = reviews.length;
    const averageRating =
      totalReviews > 0
        ? Number((reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(2))
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

// ─── READ (single review by orderId) ────────────────────────────────────────

export async function getReviewByOrderId(req, res, next) {
  try {
    const { orderId } = req.params;

    if (!ObjectId.isValid(orderId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID',
      });
    }

    const reviewsCol = getCollection('reviews');
    const review = await reviewsCol.findOne({
      $or: [
        { orderId: new ObjectId(orderId) },
        { orderId: orderId.toString() },
      ],
    });

    res.json({
      success: true,
      data: review || null,
    });
  } catch (error) {
    next(error);
  }
}

// ─── READ (customer — all their own reviews) ────────────────────────────────

export async function getMyReviews(req, res, next) {
  try {
    const reviewsCol = getCollection('reviews');
    const reviews = await reviewsCol
      .find({
        $or: [
          { customerId: req.user._id },
          { customerId: req.user._id.toString() },
        ],
      })
      .sort({ createdAt: -1 })
      .toArray();

    res.json({
      success: true,
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

    const reviews = await reviewsCol
      .find({
        $or: [
          { vendorId: req.user._id },
          { vendorId: req.user._id.toString() },
        ],
      })
      .sort({ createdAt: -1 })
      .toArray();

    const totalReviews = reviews.length;
    const averageRating =
      totalReviews > 0
        ? Number((reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(2))
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

    if (review.itemId) {
      await updateMenuItemRating(review.itemId);
    }

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

    if (!isAdmin && !isOwner) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permission to delete this review',
      });
    }

    await reviewsCol.deleteOne({ _id: new ObjectId(reviewId) });

    if (review.itemId) {
      await updateMenuItemRating(review.itemId);
    }

    res.json({
      success: true,
      message: 'Review deleted successfully',
    });
  } catch (error) {
    next(error);
  }
}
