import 'dotenv/config';
import { connectDB } from '../config/db.js';
import { getCollection } from '../config/db.js';

async function seedAdmin() {
  try {
    await connectDB();
    const usersCol = getCollection('users');

    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@pizzahub.com').toLowerCase().trim();
    const adminName = process.env.ADMIN_NAME || 'PizzaHub Master Admin';

    // Ensure the designated administrator account exists with administrative privileges.
    const existing = await usersCol.findOne({ email: adminEmail });

    if (existing) {
      await usersCol.updateOne(
        { email: adminEmail },
        {
          $set: {
            role: 'admin',
            isBlocked: false,
            subscriptionPlan: 'premium',
            updatedAt: new Date(),
          },
        }
      );
      console.log(`Admin account '${adminEmail}' updated with role: 'admin'.`);
    } else {
      await usersCol.insertOne({
        name: adminName,
        email: adminEmail,
        role: 'admin',
        isBlocked: false,
        subscriptionPlan: 'premium',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log(`Admin account created successfully: ${adminEmail}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('Error seeding admin user:', error.message);
    process.exit(1);
  }
}

seedAdmin();
