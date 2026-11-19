import { ObjectId } from 'mongodb';
import { getCollection } from '../config/db.js';

export async function toggleFavorite(req, res, next) {
  try {
    const { itemId } = req.params;

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

    const favCol = getCollection('favorites');
    const existing = await favCol.findOne({
      customerId: req.user._id,
      itemId: item._id,
    });

    if (existing) {
      await favCol.deleteOne({ _id: existing._id });
      return res.json({
        success: true,
        isFavorite: false,
        message: 'Removed from favorites',
      });
    }

    await favCol.insertOne({
      customerId: req.user._id,
      itemId: item._id,
      createdAt: new Date(),
    });

    res.status(201).json({
      success: true,
      isFavorite: true,
      message: 'Added to favorites',
    });
  } catch (error) {
    next(error);
  }
}

export async function getFavorites(req, res, next) {
  try {
    const favCol = getCollection('favorites');
    const customerId = req.user._id;

    const pipeline = [
      {
        $match: {
          $or: [{ customerId }, { customerId: customerId.toString() }],
        },
      },
      {
        $lookup: {
          from: 'menuItems',
          localField: 'itemId',
          foreignField: '_id',
          as: 'item',
        },
      },
      {
        $unwind: '$item',
      },
      {
        $lookup: {
          from: 'users',
          localField: 'item.vendorId',
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
          _id: 1,
          createdAt: 1,
          item: {
            _id: '$item._id',
            itemName: '$item.itemName',
            category: '$item.category',
            price: '$item.price',
            images: '$item.images',
            location: '$item.location',
            status: '$item.status',
            vendor: {
              _id: '$vendor._id',
              name: '$vendor.name',
              businessName: '$vendor.businessName',
              subscriptionPlan: '$vendor.subscriptionPlan',
            },
          },
        },
      },
      { $sort: { createdAt: -1 } },
    ];

    const favorites = await favCol.aggregate(pipeline).toArray();

    res.json({
      success: true,
      data: favorites,
    });
  } catch (error) {
    next(error);
  }
}

export async function getFavoriteIds(req, res, next) {
  try {
    const favCol = getCollection('favorites');
    const customerId = req.user._id;

    const favorites = await favCol
      .find({
        $or: [{ customerId }, { customerId: customerId.toString() }],
      })
      .project({ itemId: 1 })
      .toArray();

    const ids = favorites.map((f) => f.itemId.toString());

    res.json({
      success: true,
      data: ids,
    });
  } catch (error) {
    next(error);
  }
}
