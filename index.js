import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectDB } from './src/config/db.js';
import { errorHandler } from './src/middleware/errorHandler.js';
import { notFound } from './src/middleware/notFound.js';
import authRoutes from './src/routes/authRoutes.js';
import menuRoutes from './src/routes/menuRoutes.js';
import orderRoutes from './src/routes/orderRoutes.js';
import adminRoutes from './src/routes/adminRoutes.js';
import paymentRoutes from './src/routes/paymentRoutes.js';
import userRoutes from './src/routes/userRoutes.js';

const app = express();
const port = process.env.PORT || 5000;

app.use(
  cors({
    origin: process.env.CLIENT_URL ? [process.env.CLIENT_URL, 'http://localhost:3000'] : '*',
    credentials: true,
  })
);

// Stripe webhooks require the raw Buffer body to verify cryptographic signatures.
app.use((req, res, next) => {
  if (req.originalUrl === '/api/payments/webhook') {
    next();
  } else {
    express.json()(req, res, next);
  }
});

// Base health and root route.
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'PizzaHub API is running',
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/users', userRoutes);

// Centralized 404 and Error handling middlewares.
app.use(notFound);
app.use(errorHandler);

async function startServer() {
  try {
    await connectDB();
  } catch (error) {
    console.error('Failed to connect to MongoDB on startup:', error.message);
  }

  app.listen(port, () => {
    console.log(`PizzaHub server is running on port ${port}`);
  });
}

startServer();
