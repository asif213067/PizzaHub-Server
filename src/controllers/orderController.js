import { ObjectId } from 'mongodb';
import { getCollection } from '../config/db.js';

export async function createOrder(req, res, next) {
  try {
    // Restrict ordering to customers: vendors and admins cannot place customer orders.
    if (req.user.role === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admins cannot place customer food orders',
      });
    }

    const { itemId, deliveryDate, deliveryAddress, message } = req.body;

    if (!itemId || !deliveryDate || !deliveryAddress) {
      return res.status(400).json({
        success: false,
        message: 'Missing required order fields: itemId, deliveryDate, and deliveryAddress are mandatory',
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

    // Only approved and active menu items are available for customer ordering.
    if (item.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'This menu item is currently unavailable for ordering',
      });
    }

    // Prevent restaurant owners from placing orders on their own menu items.
    if (item.vendorId.toString() === req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You cannot place an order for your own menu item',
      });
    }

    const ordersCol = getCollection('orders');

    // Prevent duplicate active orders by the same customer for the same item on the same delivery date.
    const duplicateOrder = await ordersCol.findOne({
      customerId: req.user._id,
      itemId: item._id,
      deliveryDate: deliveryDate.trim(),
      status: { $in: ['pending', 'accepted'] },
    });

    if (duplicateOrder) {
      return res.status(409).json({
        success: false,
        message: 'You already have an active order for this item on the selected delivery date',
      });
    }

    const newOrder = {
      itemId: item._id,
      vendorId: item.vendorId,
      customerId: req.user._id,
      deliveryDate: deliveryDate.trim(),
      deliveryAddress: deliveryAddress.trim(),
      message: message ? message.trim() : '',
      status: 'pending',
      createdAt: new Date(),
    };

    const result = await ordersCol.insertOne(newOrder);

    res.status(201).json({
      success: true,
      message: 'Order submitted successfully and is pending vendor confirmation',
      data: { _id: result.insertedId, ...newOrder },
    });
  } catch (error) {
    next(error);
  }
}

export async function getCustomerOrders(req, res, next) {
  try {
    const ordersCol = getCollection('orders');
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
        $unwind: {
          path: '$item',
          preserveNullAndEmptyArrays: true,
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
          deliveryDate: 1,
          deliveryAddress: 1,
          message: 1,
          status: 1,
          createdAt: 1,
          updatedAt: 1,
          item: {
            _id: '$item._id',
            itemName: '$item.itemName',
            category: '$item.category',
            price: '$item.price',
            images: '$item.images',
            location: '$item.location',
          },
          vendor: {
            _id: '$vendor._id',
            name: '$vendor.name',
            businessName: '$vendor.businessName',
            email: '$vendor.email',
            image: '$vendor.image',
          },
        },
      },
      { $sort: { createdAt: -1 } },
    ];

    const orders = await ordersCol.aggregate(pipeline).toArray();

    res.json({
      success: true,
      data: orders,
    });
  } catch (error) {
    next(error);
  }
}

export async function cancelOrder(req, res, next) {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID',
      });
    }

    const ordersCol = getCollection('orders');
    const order = await ordersCol.findOne({ _id: new ObjectId(id) });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // Verify ownership so customers cannot cancel another customer's order.
    if (order.customerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permission to cancel this order',
      });
    }

    // Orders cannot be cancelled if they have already been accepted, rejected, or previously cancelled.
    if (order.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel an order that is already ${order.status}`,
      });
    }

    const updated = await ordersCol.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { status: 'cancelled', updatedAt: new Date() } },
      { returnDocument: 'after' }
    );

    res.json({
      success: true,
      message: 'Order cancelled successfully',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

export async function getVendorOrders(req, res, next) {
  try {
    const ordersCol = getCollection('orders');
    const vendorId = req.user._id;

    const pipeline = [
      {
        $match: {
          $or: [{ vendorId }, { vendorId: vendorId.toString() }],
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
        $unwind: {
          path: '$item',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'customerId',
          foreignField: '_id',
          as: 'customer',
        },
      },
      {
        $unwind: {
          path: '$customer',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          deliveryDate: 1,
          deliveryAddress: 1,
          message: 1,
          status: 1,
          createdAt: 1,
          updatedAt: 1,
          item: {
            _id: '$item._id',
            itemName: '$item.itemName',
            category: '$item.category',
            price: '$item.price',
            images: '$item.images',
          },
          customer: {
            _id: '$customer._id',
            name: '$customer.name',
            email: '$customer.email',
            image: '$customer.image',
          },
        },
      },
      { $sort: { createdAt: -1 } },
    ];

    const orders = await ordersCol.aggregate(pipeline).toArray();

    res.json({
      success: true,
      data: orders,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateOrderStatusVendor(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatuses = ['accepted', 'rejected'];
    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be either "accepted" or "rejected"',
      });
    }

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID',
      });
    }

    const ordersCol = getCollection('orders');
    const order = await ordersCol.findOne({ _id: new ObjectId(id) });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // Verify vendor ownership to prevent modification of orders belonging to other restaurants.
    if (order.vendorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: This order does not belong to your restaurant',
      });
    }

    // Business rule: vendors can only accept or reject an order while it is pending, and only once.
    if (order.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Order has already been ${order.status} and cannot be altered again`,
      });
    }

    const updated = await ordersCol.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { status, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );

    res.json({
      success: true,
      message: `Order ${status} successfully`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

export async function getOrderById(req, res, next) {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID',
      });
    }

    const ordersCol = getCollection('orders');
    const pipeline = [
      { $match: { _id: new ObjectId(id) } },
      {
        $lookup: {
          from: 'menuItems',
          localField: 'itemId',
          foreignField: '_id',
          as: 'item',
        },
      },
      {
        $unwind: {
          path: '$item',
          preserveNullAndEmptyArrays: true,
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
        $lookup: {
          from: 'users',
          localField: 'customerId',
          foreignField: '_id',
          as: 'customer',
        },
      },
      {
        $unwind: {
          path: '$customer',
          preserveNullAndEmptyArrays: true,
        },
      },
    ];

    const results = await ordersCol.aggregate(pipeline).toArray();

    if (!results || results.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    const order = results[0];
    const isCustomer = order.customerId.toString() === req.user._id.toString();
    const isVendor = order.vendorId.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    // Restrict access to order details to the customer who placed it, the vendor, or an admin.
    if (!isCustomer && !isVendor && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have access to view this order',
      });
    }

    res.json({
      success: true,
      data: order,
    });
  } catch (error) {
    next(error);
  }
}
