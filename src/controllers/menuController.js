import { ObjectId } from 'mongodb';
import { getCollection } from '../config/db.js';

export async function getPublicMenuItems(req, res, next) {
  try {
    const {
      search,
      category,
      location,
      sort,
      page = 1,
      limit = 12,
      featured,
    } = req.query;

    const query = { status: 'approved' };

    if (search) {
      query.itemName = { $regex: search.trim(), $options: 'i' };
    }

    if (category && category !== 'all') {
      query.category = { $regex: `^${category.trim()}$`, $options: 'i' };
    }

    if (location && location !== 'all') {
      query.location = { $regex: location.trim(), $options: 'i' };
    }

    let sortOptions = { createdAt: -1 };
    if (sort === 'price-asc') {
      sortOptions = { price: 1 };
    } else if (sort === 'price-desc') {
      sortOptions = { price: -1 };
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = featured ? Math.max(6, parseInt(limit, 10) || 6) : Math.max(1, parseInt(limit, 10) || 12);
    const skip = (pageNum - 1) * limitNum;

    const menuCol = getCollection('menuItems');

    // Aggregate with users collection to attach vendor profile and subscription status.
    const pipeline = [
      { $match: query },
      {
        $lookup: {
          from: 'users',
          localField: 'vendorId',
          foreignField: '_id',
          as: 'vendor',
        },
      },
      {
        $unwind: {
          path: '$vendor',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          itemName: 1,
          category: 1,
          description: 1,
          price: 1,
          location: 1,
          images: 1,
          status: 1,
          createdAt: 1,
          vendorId: 1,
          vendor: {
            _id: '$vendor._id',
            name: '$vendor.name',
            businessName: '$vendor.businessName',
            image: '$vendor.image',
            subscriptionPlan: '$vendor.subscriptionPlan',
          },
        },
      },
      { $sort: sortOptions },
      { $skip: skip },
      { $limit: limitNum },
    ];

    const [items, totalCount] = await Promise.all([
      menuCol.aggregate(pipeline).toArray(),
      menuCol.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: items,
      pagination: {
        total: totalCount,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalCount / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getMenuItemById(req, res, next) {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid menu item ID',
      });
    }

    const menuCol = getCollection('menuItems');
    const pipeline = [
      { $match: { _id: new ObjectId(id) } },
      {
        $lookup: {
          from: 'users',
          localField: 'vendorId',
          foreignField: '_id',
          as: 'vendor',
        },
      },
      {
        $unwind: {
          path: '$vendor',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          itemName: 1,
          category: 1,
          description: 1,
          price: 1,
          location: 1,
          images: 1,
          status: 1,
          createdAt: 1,
          vendorId: 1,
          vendor: {
            _id: '$vendor._id',
            name: '$vendor.name',
            businessName: '$vendor.businessName',
            image: '$vendor.image',
            subscriptionPlan: '$vendor.subscriptionPlan',
          },
        },
      },
    ];

    const results = await menuCol.aggregate(pipeline).toArray();

    if (!results || results.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Menu item not found',
      });
    }

    res.json({
      success: true,
      data: results[0],
    });
  } catch (error) {
    next(error);
  }
}

export async function getRelatedMenuItems(req, res, next) {
  try {
    const { id } = req.params;
    const { limit = 3 } = req.query;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid menu item ID',
      });
    }

    const menuCol = getCollection('menuItems');
    const currentItem = await menuCol.findOne({ _id: new ObjectId(id) });

    if (!currentItem) {
      return res.status(404).json({
        success: false,
        message: 'Menu item not found',
      });
    }

    const limitNum = Math.max(1, parseInt(limit, 10) || 3);
    const vendorId = currentItem.vendorId;

    const pipeline = [
      {
        $match: {
          _id: { $ne: currentItem._id },
          $or: [{ vendorId }, { vendorId: vendorId.toString() }],
          status: 'approved',
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'vendorId',
          foreignField: '_id',
          as: 'vendor',
        },
      },
      {
        $unwind: {
          path: '$vendor',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          itemName: 1,
          category: 1,
          description: 1,
          price: 1,
          location: 1,
          images: 1,
          status: 1,
          createdAt: 1,
          vendorId: 1,
          vendor: {
            _id: '$vendor._id',
            name: '$vendor.name',
            businessName: '$vendor.businessName',
            image: '$vendor.image',
            subscriptionPlan: '$vendor.subscriptionPlan',
          },
        },
      },
      { $sort: { createdAt: -1 } },
      { $limit: limitNum },
    ];

    const relatedItems = await menuCol.aggregate(pipeline).toArray();

    res.json({
      success: true,
      data: relatedItems,
    });
  } catch (error) {
    next(error);
  }
}

export async function getVendorMenuItems(req, res, next) {
  try {
    const menuCol = getCollection('menuItems');
    const vendorId = req.user._id;

    const items = await menuCol
      .find({
        $or: [{ vendorId }, { vendorId: vendorId.toString() }],
      })
      .sort({ createdAt: -1 })
      .toArray();

    res.json({
      success: true,
      data: items,
    });
  } catch (error) {
    next(error);
  }
}

export async function createMenuItem(req, res, next) {
  try {
    const { itemName, category, description, price, location, images } = req.body;

    if (!itemName || !category || !description || price === undefined || !location) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: itemName, category, description, price, and location are mandatory',
      });
    }

    const numericPrice = Number(price);
    if (isNaN(numericPrice) || numericPrice <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Price must be a valid positive number',
      });
    }

    if (!images || (Array.isArray(images) && images.length === 0)) {
      return res.status(400).json({
        success: false,
        message: 'At least one image URL from ImgBB is required',
      });
    }

    const menuCol = getCollection('menuItems');
    const isPremium = req.user.subscriptionPlan === 'premium';

    // Free tier vendors are strictly limited to at most 3 active/pending menu items.
    if (!isPremium) {
      const activeCount = await menuCol.countDocuments({
        $or: [{ vendorId: req.user._id }, { vendorId: req.user._id.toString() }],
        status: { $in: ['approved', 'pending'] },
      });

      if (activeCount >= 3) {
        return res.status(403).json({
          success: false,
          message: 'Free tier limit reached (max 3 active items). Upgrade to Premium to publish unlimited menu items.',
        });
      }
    }

    const newItem = {
      vendorId: req.user._id,
      itemName: itemName.trim(),
      category: category.trim(),
      description: description.trim(),
      price: numericPrice,
      location: location.trim(),
      images: Array.isArray(images) ? images : [images],
      status: 'pending',
      createdAt: new Date(),
    };

    const result = await menuCol.insertOne(newItem);

    res.status(201).json({
      success: true,
      message: 'Menu item created successfully and is pending admin approval',
      data: { _id: result.insertedId, ...newItem },
    });
  } catch (error) {
    next(error);
  }
}

export async function updateMenuItem(req, res, next) {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid menu item ID',
      });
    }

    const menuCol = getCollection('menuItems');
    const item = await menuCol.findOne({ _id: new ObjectId(id) });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Menu item not found',
      });
    }

    // Verify ownership so vendors cannot alter menu items belonging to other restaurants.
    const isOwner = item.vendorId.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permission to update this menu item',
      });
    }

    const { itemName, category, description, price, location, images, status } = req.body;
    const updateDoc = {};

    if (itemName !== undefined) updateDoc.itemName = itemName.trim();
    if (category !== undefined) updateDoc.category = category.trim();
    if (description !== undefined) updateDoc.description = description.trim();
    if (location !== undefined) updateDoc.location = location.trim();
    if (images !== undefined) updateDoc.images = Array.isArray(images) ? images : [images];

    if (price !== undefined) {
      const numericPrice = Number(price);
      if (isNaN(numericPrice) || numericPrice <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Price must be a valid positive number',
        });
      }
      updateDoc.price = numericPrice;
    }

    // Only admins can alter the approval status directly; vendors may only toggle active/inactive.
    if (status !== undefined) {
      if (isAdmin) {
        updateDoc.status = status;
      } else if (['approved', 'inactive'].includes(item.status) && ['approved', 'inactive'].includes(status)) {
        updateDoc.status = status;
      }
    }

    updateDoc.updatedAt = new Date();

    await menuCol.updateOne({ _id: new ObjectId(id) }, { $set: updateDoc });
    const updated = await menuCol.findOne({ _id: new ObjectId(id) });

    res.json({
      success: true,
      message: 'Menu item updated successfully',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteMenuItem(req, res, next) {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid menu item ID',
      });
    }

    const menuCol = getCollection('menuItems');
    const item = await menuCol.findOne({ _id: new ObjectId(id) });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Menu item not found',
      });
    }

    // Verify ownership to ensure users cannot delete catalog items of other vendors.
    const isOwner = item.vendorId.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permission to delete this menu item',
      });
    }

    await menuCol.deleteOne({ _id: new ObjectId(id) });

    res.json({
      success: true,
      message: 'Menu item deleted successfully',
    });
  } catch (error) {
    next(error);
  }
}

export async function getAllMenuItemsAdmin(req, res, next) {
  try {
    const { status, category, search, page = 1, limit = 20 } = req.query;
    const query = {};

    if (status && status !== 'all') {
      query.status = status;
    }

    if (category && category !== 'all') {
      query.category = { $regex: `^${category.trim()}$`, $options: 'i' };
    }

    if (search) {
      query.itemName = { $regex: search.trim(), $options: 'i' };
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 20);
    const skip = (pageNum - 1) * limitNum;

    const menuCol = getCollection('menuItems');
    const pipeline = [
      { $match: query },
      {
        $lookup: {
          from: 'users',
          localField: 'vendorId',
          foreignField: '_id',
          as: 'vendor',
        },
      },
      {
        $unwind: {
          path: '$vendor',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          itemName: 1,
          category: 1,
          description: 1,
          price: 1,
          location: 1,
          images: 1,
          status: 1,
          createdAt: 1,
          updatedAt: 1,
          vendor: {
            _id: '$vendor._id',
            name: '$vendor.name',
            email: '$vendor.email',
            businessName: '$vendor.businessName',
          },
        },
      },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limitNum },
    ];

    const [items, totalCount] = await Promise.all([
      menuCol.aggregate(pipeline).toArray(),
      menuCol.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: items,
      pagination: {
        total: totalCount,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalCount / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function updateMenuItemStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'approved', 'rejected', 'inactive'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${validStatuses.join(', ')}`,
      });
    }

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid menu item ID',
      });
    }

    const menuCol = getCollection('menuItems');
    const result = await menuCol.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { status, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Menu item not found',
      });
    }

    res.json({
      success: true,
      message: `Menu item status updated to ${status}`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}
