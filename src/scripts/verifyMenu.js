import 'dotenv/config';
import { connectDB, getCollection } from '../config/db.js';

async function verify() {
  await connectDB();
  const menuCol = getCollection('menuItems');
  const pipeline = [
    { $match: { status: 'approved' } },
    {
      $lookup: {
        from: 'users',
        localField: 'vendorId',
        foreignField: '_id',
        as: 'vendor',
      },
    },
    { $unwind: { path: '$vendor', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 1,
        itemName: 1,
        category: 1,
        price: 1,
        location: 1,
        images: 1,
        vendor: {
          name: '$vendor.name',
          businessName: '$vendor.businessName',
          subscriptionPlan: '$vendor.subscriptionPlan',
        },
      },
    },
    { $limit: 6 },
  ];

  const items = await menuCol.aggregate(pipeline).toArray();
  console.log('AGGREGATION COUNT:', items.length);
  console.log('SAMPLE ITEM:', JSON.stringify(items[0], null, 2));
  process.exit(0);
}

verify().catch((err) => {
  console.error(err);
  process.exit(1);
});
