import { ObjectId } from 'mongodb';
import { getCollection } from '../config/db.js';

export async function getOverviewStats(req, res, next) {
  try {
    const usersCol = getCollection('users');
    const menuCol = getCollection('menuItems');
    const ordersCol = getCollection('orders');
    const transCol = getCollection('transactions');

    const [
      totalUsers,
      totalVendors,
      totalCustomers,
      totalMenuItems,
      pendingMenuItems,
      totalOrders,
      totalTransactions,
      revenueResult,
    ] = await Promise.all([
      usersCol.countDocuments({}),
      usersCol.countDocuments({ role: 'vendor' }),
      usersCol.countDocuments({ role: 'customer' }),
      menuCol.countDocuments({}),
      menuCol.countDocuments({ status: 'pending' }),
      ordersCol.countDocuments({}),
      transCol.countDocuments({}),
      transCol
        .aggregate([
          { $match: { status: { $in: ['succeeded', 'completed', 'paid'] } } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ])
        .toArray(),
    ]);

    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0;

    res.json({
      success: true,
      data: {
        totalUsers,
        totalVendors,
        totalCustomers,
        totalMenuItems,
        pendingMenuItems,
        totalOrders,
        totalTransactions,
        totalRevenue,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getUsers(req, res, next) {
  try {
    const { search, role, page = 1, limit = 20 } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search.trim(), $options: 'i' } },
        { email: { $regex: search.trim(), $options: 'i' } },
        { businessName: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    if (role && role !== 'all') {
      query.role = role.trim();
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 20);
    const skip = (pageNum - 1) * limitNum;

    const usersCol = getCollection('users');

    const [users, totalCount] = await Promise.all([
      usersCol
        .find(query, { projection: { password: 0 } })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .toArray(),
      usersCol.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: users,
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

export async function toggleBlockUser(req, res, next) {
  try {
    const { id } = req.params;
    const { isBlocked } = req.body;

    if (typeof isBlocked !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'The isBlocked field must be a boolean',
      });
    }

    // Administrators must not be able to lock out their own account.
    if (id === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot block your own administrator account',
      });
    }

    const usersCol = getCollection('users');
    let targetUserQuery = { _id: id };
    if (ObjectId.isValid(id)) {
      targetUserQuery = { $or: [{ _id: new ObjectId(id) }, { _id: id }] };
    }

    const targetUser = await usersCol.findOne(targetUserQuery);

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Prevent blocking other administrators to protect governance integrity.
    if (targetUser.role === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Cannot block an administrator account',
      });
    }

    const updated = await usersCol.findOneAndUpdate(
      targetUserQuery,
      { $set: { isBlocked, updatedAt: new Date() } },
      { returnDocument: 'after', projection: { password: 0 } }
    );

    res.json({
      success: true,
      message: `User successfully ${isBlocked ? 'blocked' : 'unblocked'}`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

export async function getTransactions(req, res, next) {
  try {
    const { page = 1, limit = 20 } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 20);
    const skip = (pageNum - 1) * limitNum;

    const transCol = getCollection('transactions');

    const pipeline = [
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
          plan: 1,
          amount: 1,
          currency: 1,
          stripeSessionId: 1,
          stripeSubscriptionId: 1,
          status: 1,
          createdAt: 1,
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

    const [transactions, totalCount] = await Promise.all([
      transCol.aggregate(pipeline).toArray(),
      transCol.countDocuments({}),
    ]);

    res.json({
      success: true,
      data: transactions,
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
