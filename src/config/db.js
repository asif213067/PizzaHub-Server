import { MongoClient, ServerApiVersion } from 'mongodb';

let db = null;
let client = null;

export async function connectDB() {
  if (db) return db;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not defined in environment variables');
  }

  client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  });

  await client.connect();
  db = client.db(process.env.DB_NAME || 'pizzahub');
  console.log('MongoDB connected successfully');
  await initIndexes(db);
  return db;
}

export async function initIndexes(database = db) {
  if (!database) return;
  try {
    const menuItems = database.collection('menuItems');
    await menuItems.createIndex({ status: 1, category: 1 });
    await menuItems.createIndex({ vendorId: 1, status: 1 });
    await menuItems.createIndex({ createdAt: -1 });

    const orders = database.collection('orders');
    await orders.createIndex({ customerId: 1, createdAt: -1 });
    await orders.createIndex({ vendorId: 1, status: 1, createdAt: -1 });

    const reviews = database.collection('reviews');
    await reviews.createIndex({ itemId: 1 });
    await reviews.createIndex({ vendorId: 1 });
    await reviews.createIndex({ orderId: 1 });
    await reviews.createIndex({ customerId: 1 });

    const transactions = database.collection('transactions');
    await transactions.createIndex({ vendorId: 1, createdAt: -1 });

    const users = database.collection('users');
    await users.createIndex({ email: 1 });
    await users.createIndex({ role: 1 });
    console.log('MongoDB indexes initialized successfully');
  } catch (err) {
    console.warn('Index initialization note:', err.message);
  }
}

export function getDb() {
  if (!db) {
    throw new Error('Database not initialized. Call connectDB first.');
  }
  return db;
}

export function getCollection(name) {
  return getDb().collection(name);
}
