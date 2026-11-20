import 'dotenv/config';
import { ObjectId } from 'mongodb';
import { connectDB, getCollection } from '../config/db.js';

const VENDOR_ID = new ObjectId('6b00351412182d16b6ddbc33');

const samplePizzas = [
  {
    itemName: 'Margherita Classica',
    category: 'Classic Pizzas',
    description: 'Fresh San Marzano tomato sauce, creamy fresh mozzarella, fresh sweet basil leaves, and extra-virgin olive oil on artisanal sourdough crust.',
    price: 14.99,
    location: 'Downtown, New York',
    images: ['https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?auto=format&fit=crop&w=800&q=80'],
    status: 'approved',
    vendorId: VENDOR_ID,
    createdAt: new Date('2026-11-20T10:00:00Z'),
  },
  {
    itemName: 'Pepperoni Supremo',
    category: 'Classic Pizzas',
    description: 'Loaded with double crispy cupped pepperoni, rich Italian herb marinara, melted aged mozzarella, and savory parmesan dust.',
    price: 17.50,
    location: 'Brooklyn, New York',
    images: ['https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=800&q=80'],
    status: 'approved',
    vendorId: VENDOR_ID,
    createdAt: new Date('2026-11-20T10:10:00Z'),
  },
  {
    itemName: 'Garden Medley Pesto',
    category: 'Vegetarian Pizzas',
    description: 'House-made basil pesto, roasted cherry tomatoes, grilled artichoke hearts, Kalamata olives, red onions, and crumbled goat cheese.',
    price: 16.99,
    location: 'Manhattan, New York',
    images: ['https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=800&q=80'],
    status: 'approved',
    vendorId: VENDOR_ID,
    createdAt: new Date('2026-11-20T10:20:00Z'),
  },
  {
    itemName: 'Truffle Mushroom Gourmet',
    category: 'Specialty / Gourmet Pizzas',
    description: 'Creamy garlic white sauce, sauteed wild cremini and shiitake mushrooms, fresh thyme, fontina cheese, and black truffle oil drizzle.',
    price: 21.99,
    location: 'Midtown, New York',
    images: ['https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80'],
    status: 'approved',
    vendorId: VENDOR_ID,
    createdAt: new Date('2026-11-20T10:30:00Z'),
  },
  {
    itemName: 'Fiery Carnivore Meat Feast',
    category: 'Meat Lovers',
    description: 'Spicy Italian fennel sausage, smoked bacon bits, tender sliced ham, seasoned ground beef, and signature spicy marinara sauce.',
    price: 19.99,
    location: 'Queens, New York',
    images: ['https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=800&q=80'],
    status: 'approved',
    vendorId: VENDOR_ID,
    createdAt: new Date('2026-11-20T10:40:00Z'),
  },
  {
    itemName: 'Smoky BBQ Chicken Ranch',
    category: 'Meat Lovers',
    description: 'Tender pulled rotisserie chicken, zesty sweet barbecue sauce, crisp red onions, smoked gouda, and buttermilk ranch drizzle.',
    price: 18.50,
    location: 'Long Island, New York',
    images: ['https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?auto=format&fit=crop&w=800&q=80'],
    status: 'approved',
    vendorId: VENDOR_ID,
    createdAt: new Date('2026-11-20T10:50:00Z'),
  },
  {
    itemName: 'Quattro Formaggi Riserva',
    category: 'Specialty / Gourmet Pizzas',
    description: 'A rich blend of aged parmesan, creamy gorgonzola, smoked provolone, and velvety fior di latte mozzarella with garlic-infused crust.',
    price: 18.99,
    location: 'Downtown, New York',
    images: ['https://images.unsplash.com/photo-1571407970349-bc81e7e96d47?auto=format&fit=crop&w=800&q=80'],
    status: 'approved',
    vendorId: VENDOR_ID,
    createdAt: new Date('2026-11-20T11:00:00Z'),
  },
  {
    itemName: 'Mediterranean Veggie Sun',
    category: 'Vegetarian Pizzas',
    description: 'Baby spinach, sun-dried tomatoes, diced zucchini, creamy feta crumbles, oregano, and garlic olive oil sauce.',
    price: 15.99,
    location: 'Brooklyn, New York',
    images: ['https://images.unsplash.com/photo-1541745537411-b8046dc6d66c?auto=format&fit=crop&w=800&q=80'],
    status: 'approved',
    vendorId: VENDOR_ID,
    createdAt: new Date('2026-11-20T11:10:00Z'),
  },
  {
    itemName: 'Spicy Diavola Hot Honey',
    category: 'Specialty / Gourmet Pizzas',
    description: 'Spicy Calabrian soppressata, pickled red chili peppers, fresh mozzarella, and a drizzle of artisanal hot chili-infused honey.',
    price: 20.50,
    location: 'Manhattan, New York',
    images: ['https://images.unsplash.com/photo-1588315029754-2dd089d39a1a?auto=format&fit=crop&w=800&q=80'],
    status: 'approved',
    vendorId: VENDOR_ID,
    createdAt: new Date('2026-11-20T11:20:00Z'),
  },
  {
    itemName: 'Rustic Buffalo Supreme',
    category: 'Classic Pizzas',
    description: 'Buffalo mozzarella di bufala, crushed San Marzano tomatoes, shaved pecorino romano, and fragrant organic oregano.',
    price: 16.50,
    location: 'Queens, New York',
    images: ['https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?auto=format&fit=crop&w=800&q=80'],
    status: 'approved',
    vendorId: VENDOR_ID,
    createdAt: new Date('2026-11-20T11:30:00Z'),
  },
];

async function seed() {
  try {
    const db = await connectDB();
    console.log('Connected to MongoDB.');

    // 1. Sync Vendor in both user and users collections
    const vendorData = {
      _id: VENDOR_ID,
      name: 'Vendor',
      businessName: "Luigi's Artisan Pizza",
      email: 'vendor@gmail.com',
      emailVerified: false,
      role: 'vendor',
      isBlocked: false,
      subscriptionPlan: 'premium',
      updatedAt: new Date(),
    };

    await db.collection('user').updateOne(
      { _id: VENDOR_ID },
      { $set: vendorData },
      { upsert: true }
    );

    await db.collection('users').updateOne(
      { _id: VENDOR_ID },
      { $set: vendorData },
      { upsert: true }
    );
    console.log('Vendor verified and synchronized in user/users collections.');

    // 2. Insert menu items idempotently
    const menuCol = db.collection('menuItems');
    let insertedCount = 0;
    let updatedCount = 0;

    for (const pizza of samplePizzas) {
      const res = await menuCol.updateOne(
        { itemName: pizza.itemName },
        { $set: pizza },
        { upsert: true }
      );
      if (res.upsertedCount > 0) insertedCount++;
      else if (res.modifiedCount > 0) updatedCount++;
    }

    const totalInDb = await menuCol.countDocuments({ status: 'approved' });
    console.log(`Seed finished: ${insertedCount} inserted, ${updatedCount} updated. Total approved in DB: ${totalInDb}`);

    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
}

seed();
