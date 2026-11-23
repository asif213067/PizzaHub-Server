import dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { ObjectId } from 'mongodb';
import { connectDB, getCollection } from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Shared demo password for all seeded accounts
const DEMO_PASSWORD = 'PizzaHub2026!';

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const key = crypto.scryptSync(password, salt, 64, {
    N: 16384,
    r: 8,
    p: 1,
    maxmem: 32 * 1024 * 1024,
  });
  return `${salt}:${key.toString('hex')}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. DUMMY VENDORS (3 Premium Vendors)
// ─────────────────────────────────────────────────────────────────────────────
const vendorsData = [
  {
    _id: new ObjectId('6b00351412182d16b6000001'),
    name: 'Marco Rossi',
    businessName: 'Bella Napoli Wood-Fired Pizzeria',
    email: 'marco.rossi@bellanapoli.demo',
    role: 'vendor',
    phone: '+1 (212) 555-0142',
    address: '142 Mulberry Street, Little Italy, New York, NY 10013',
    image: 'https://images.unsplash.com/photo-1583394293214-28ded15ee548?auto=format&fit=crop&w=500&q=80',
    subscriptionPlan: 'premium',
    billingCycle: 'yearly',
    subscriptionExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    isCancelled: false,
    isBlocked: false,
    emailVerified: true,
  },
  {
    _id: new ObjectId('6b00351412182d16b6000002'),
    name: 'Sofia Romano',
    businessName: 'Trattoria Sofia & Crust Co.',
    email: 'sofia.romano@trattoriasofia.demo',
    role: 'vendor',
    phone: '+1 (718) 555-0188',
    address: '68 Main Street, DUMBO, Brooklyn, NY 11201',
    image: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&w=500&q=80',
    subscriptionPlan: 'premium',
    billingCycle: 'yearly',
    subscriptionExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    isCancelled: false,
    isBlocked: false,
    emailVerified: true,
  },
  {
    _id: new ObjectId('6b00351412182d16b6000003'),
    name: 'Matteo Moretti',
    businessName: 'Moretti Artisan Slice & Pies',
    email: 'matteo.moretti@morettipizza.demo',
    role: 'vendor',
    phone: '+1 (646) 555-0125',
    address: '230 Bleecker Street, Greenwich Village, New York, NY 10014',
    image: 'https://images.unsplash.com/photo-1556157382-97eda2d62296?auto=format&fit=crop&w=500&q=80',
    subscriptionPlan: 'premium',
    billingCycle: 'monthly',
    subscriptionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    isCancelled: false,
    isBlocked: false,
    emailVerified: true,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 2. DUMMY CUSTOMERS (7 Active Customers)
// ─────────────────────────────────────────────────────────────────────────────
const customersData = [
  {
    _id: new ObjectId('6b00451412182d16b6000101'),
    name: 'Lucas Bennett',
    email: 'lucas.bennett@pizzademo.com',
    role: 'customer',
    phone: '+1 (917) 555-0174',
    address: '350 5th Ave, Apt 14B, New York, NY 10118',
    image: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=500&q=80',
    isBlocked: false,
    emailVerified: true,
  },
  {
    _id: new ObjectId('6b00451412182d16b6000102'),
    name: 'Elena Rostova',
    email: 'elena.rostova@pizzademo.com',
    role: 'customer',
    phone: '+1 (646) 555-0199',
    address: '740 Park Ave, Apt 8E, New York, NY 10021',
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=500&q=80',
    isBlocked: false,
    emailVerified: true,
  },
  {
    _id: new ObjectId('6b00451412182d16b6000103'),
    name: 'David Chen',
    email: 'david.chen@pizzademo.com',
    role: 'customer',
    phone: '+1 (212) 555-0163',
    address: '85 Broad Street, Floor 18, New York, NY 10004',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=500&q=80',
    isBlocked: false,
    emailVerified: true,
  },
  {
    _id: new ObjectId('6b00451412182d16b6000104'),
    name: 'Maya Patel',
    email: 'maya.patel@pizzademo.com',
    role: 'customer',
    phone: '+1 (718) 555-0137',
    address: '120 Atlantic Avenue, Brooklyn, NY 11201',
    image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=500&q=80',
    isBlocked: false,
    emailVerified: true,
  },
  {
    _id: new ObjectId('6b00451412182d16b6000105'),
    name: "Liam O'Connor",
    email: 'liam.oconnor@pizzademo.com',
    role: 'customer',
    phone: '+1 (917) 555-0182',
    address: '250 Bedford Ave, Williamsburg, Brooklyn, NY 11211',
    image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=500&q=80',
    isBlocked: false,
    emailVerified: true,
  },
  {
    _id: new ObjectId('6b00451412182d16b6000106'),
    name: 'Chloe Martinez',
    email: 'chloe.martinez@pizzademo.com',
    role: 'customer',
    phone: '+1 (347) 555-0145',
    address: '45-10 Court Square, Long Island City, NY 11101',
    image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=500&q=80',
    isBlocked: false,
    emailVerified: true,
  },
  {
    _id: new ObjectId('6b00451412182d16b6000107'),
    name: 'Alexander Wright',
    email: 'alexander.wright@pizzademo.com',
    role: 'customer',
    phone: '+1 (212) 555-0118',
    address: '10 Columbus Circle, Apt 42A, New York, NY 10019',
    image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=500&q=80',
    isBlocked: false,
    emailVerified: true,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 3. MENU ITEMS (8-9 per vendor, 26 items total across categories)
// ─────────────────────────────────────────────────────────────────────────────
const menuItemsData = [
  // ─── Vendor 1: Bella Napoli (Little Italy) ─────────────────────────────────
  {
    _id: new ObjectId('6b00551412182d16b6000101'),
    vendorId: vendorsData[0]._id,
    itemName: 'Neapolitan Margherita D.O.P.',
    category: 'Classic Pizzas',
    description: 'San Marzano D.O.P. tomatoes, fresh buffalo mozzarella from Campania, sweet Genovese basil, and organic extra-virgin olive oil blistered in a 900°F wood oven.',
    price: 16.99,
    location: 'Little Italy, New York',
    images: [
      'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1595854341625-f33ee10dbf94?auto=format&fit=crop&w=800&q=80',
    ],
    status: 'approved',
    isActive: true,
  },
  {
    _id: new ObjectId('6b00551412182d16b6000102'),
    vendorId: vendorsData[0]._id,
    itemName: 'Double Pepperoni Crispy Cups',
    category: 'Classic Pizzas',
    description: 'Generous layers of natural casing pepperoni charred into crispy oil-holding cups, over slow-simmered oregano tomato gravy and whole-milk mozzarella.',
    price: 18.50,
    location: 'Little Italy, New York',
    images: [
      'https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80',
    ],
    status: 'approved',
    isActive: true,
  },
  {
    _id: new ObjectId('6b00551412182d16b6000103'),
    vendorId: vendorsData[0]._id,
    itemName: 'Prosciutto di Parma & Wild Arugula',
    category: 'Specialty / Gourmet Pizzas',
    description: 'Aged 24-month Prosciutto di Parma laid over melted fontina and creamy mozzarella, topped with baby arugula, shaved Parmigiano-Reggiano, and lemon balsamic glaze.',
    price: 22.99,
    location: 'Little Italy, New York',
    images: [
      'https://images.unsplash.com/photo-1590947132387-155cc02f3212?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=800&q=80',
    ],
    status: 'approved',
    isActive: true,
  },
  {
    _id: new ObjectId('6b00551412182d16b6000104'),
    vendorId: vendorsData[0]._id,
    itemName: 'Truffle & Porcini Forest Mushroom',
    category: 'Specialty / Gourmet Pizzas',
    description: 'Velvety roasted garlic cream sauce, sautéed cremini and wild porcini mushrooms, fresh thyme leaves, and a fragrant Italian black truffle essence drizzle.',
    price: 24.50,
    location: 'Little Italy, New York',
    images: [
      'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1571407970349-bc81e7e96d47?auto=format&fit=crop&w=800&q=80',
    ],
    status: 'approved',
    isActive: true,
  },
  {
    _id: new ObjectId('6b00551412182d16b6000105'),
    vendorId: vendorsData[0]._id,
    itemName: 'Spicy Calabrian Diavola',
    category: 'Meat Lovers',
    description: 'Hot Calabrian soppressata salami, spicy nduja paste, marinated chili peppers, mozzarella di bufala, and hot wildflower honey.',
    price: 21.00,
    location: 'Little Italy, New York',
    images: [
      'https://images.unsplash.com/photo-1588315029754-2dd089d39a1a?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=800&q=80',
    ],
    status: 'approved',
    isActive: true,
  },
  {
    _id: new ObjectId('6b00551412182d16b6000106'),
    vendorId: vendorsData[0]._id,
    itemName: 'Sun-Drenched Garden Primavera',
    category: 'Vegetarian Pizzas',
    description: 'Roasted baby bell peppers, grilled zucchini ribbons, marinated artichoke hearts, kalamata olives, red onion slices, and creamy goat cheese.',
    price: 17.99,
    location: 'Little Italy, New York',
    images: [
      'https://images.unsplash.com/photo-1541745537411-b8046dc6d66c?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=800&q=80',
    ],
    status: 'approved',
    isActive: true,
  },
  {
    _id: new ObjectId('6b00551412182d16b6000107'),
    vendorId: vendorsData[0]._id,
    itemName: 'Formaggi e Miele (Four Cheeses)',
    category: 'Specialty / Gourmet Pizzas',
    description: 'Fior di latte, aged gorgonzola dolce, smoked provolone, and salty pecorino, finished with toasted pine nuts and orange blossom honey.',
    price: 19.50,
    location: 'Little Italy, New York',
    images: [
      'https://images.unsplash.com/photo-1571407970349-bc81e7e96d47?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1594007654729-407eedc4be65?auto=format&fit=crop&w=800&q=80',
    ],
    status: 'approved',
    isActive: true,
  },
  {
    _id: new ObjectId('6b00551412182d16b6000108'),
    vendorId: vendorsData[0]._id,
    itemName: 'Rustica Italian Fennel Sausage',
    category: 'Meat Lovers',
    description: 'House-made sweet fennel pork sausage, slow-caramelized red onions, roasted red peppers, whole-milk mozzarella, and chopped parsley.',
    price: 19.99,
    location: 'Little Italy, New York',
    images: [
      'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?auto=format&fit=crop&w=800&q=80',
    ],
    status: 'approved',
    isActive: true,
  },
  {
    _id: new ObjectId('6b00551412182d16b6000109'),
    vendorId: vendorsData[0]._id,
    itemName: 'Garlic Herb Dough Knots & Marinara',
    category: 'Sides & Appetizers',
    description: 'Warm, fluffy wood-fired dough knots brushed generously with crushed garlic, salted butter, oregano, pecorino romano, and house marinara dip.',
    price: 8.50,
    location: 'Little Italy, New York',
    images: [
      'https://images.unsplash.com/photo-1541745537411-b8046dc6d66c?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?auto=format&fit=crop&w=800&q=80',
    ],
    status: 'approved',
    isActive: true,
  },

  // ─── Vendor 2: Trattoria Sofia (DUMBO, Brooklyn) ───────────────────────────
  {
    _id: new ObjectId('6b00551412182d16b6000201'),
    vendorId: vendorsData[1]._id,
    itemName: 'Brooklyn Sourdough Margherita',
    category: 'Classic Pizzas',
    description: 'Naturally leavened 72-hour cold fermented sourdough crust, crushed organic Jersey tomatoes, creamy stracciatella, fresh basil, and sea salt.',
    price: 17.50,
    location: 'DUMBO, Brooklyn',
    images: [
      'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1595854341625-f33ee10dbf94?auto=format&fit=crop&w=800&q=80',
    ],
    status: 'approved',
    isActive: true,
  },
  {
    _id: new ObjectId('6b00551412182d16b6000202'),
    vendorId: vendorsData[1]._id,
    itemName: 'Smoked Gouda BBQ Pulled Chicken',
    category: 'Meat Lovers',
    description: 'Tender hickory-smoked pulled chicken breast, tangy molasses BBQ sauce, smoked gouda, sliced red onions, and fresh cilantro leaves.',
    price: 20.99,
    location: 'DUMBO, Brooklyn',
    images: [
      'https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=800&q=80',
    ],
    status: 'approved',
    isActive: true,
  },
  {
    _id: new ObjectId('6b00551412182d16b6000203'),
    vendorId: vendorsData[1]._id,
    itemName: 'Pesto Genovese & Heirloom Burrata',
    category: 'Vegetarian Pizzas',
    description: 'Fresh pine nut and sweet basil pesto base, multicolored roasted heirloom cherry tomatoes, cold-cut whole creamy burrata ball, and reduced balsamic.',
    price: 23.50,
    location: 'DUMBO, Brooklyn',
    images: [
      'https://images.unsplash.com/photo-1595854341625-f33ee10dbf94?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=800&q=80',
    ],
    status: 'approved',
    isActive: true,
  },
  {
    _id: new ObjectId('6b00551412182d16b6000204'),
    vendorId: vendorsData[1]._id,
    itemName: 'The Brooklyn Carnivore Supreme',
    category: 'Meat Lovers',
    description: 'Packed high with artisanal cup-and-char pepperoni, crumbled Italian meatballs, smoked applewood bacon, sweet sausage, and mozzarella.',
    price: 22.99,
    location: 'DUMBO, Brooklyn',
    images: [
      'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1579751626657-72bc17010498?auto=format&fit=crop&w=800&q=80',
    ],
    status: 'approved',
    isActive: true,
  },
  {
    _id: new ObjectId('6b00551412182d16b6000205'),
    vendorId: vendorsData[1]._id,
    itemName: 'Wild Roasted Mushroom Bianca',
    category: 'Vegetarian Pizzas',
    description: 'White ricotta base, roasted maitake and shiitake mushrooms, melted fontina cheese, fresh rosemary, and lemon-infused extra virgin olive oil.',
    price: 20.00,
    location: 'DUMBO, Brooklyn',
    images: [
      'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1588315029754-2dd089d39a1a?auto=format&fit=crop&w=800&q=80',
    ],
    status: 'approved',
    isActive: true,
  },
  {
    _id: new ObjectId('6b00551412182d16b6000206'),
    vendorId: vendorsData[1]._id,
    itemName: 'Sweet Fig, Gorgonzola & Speck',
    category: 'Specialty / Gourmet Pizzas',
    description: 'Black Mission fig jam, savory Italian cured speck, creamy blue gorgonzola, aged mozzarella, and fresh baby watercress.',
    price: 23.99,
    location: 'DUMBO, Brooklyn',
    images: [
      'https://images.unsplash.com/photo-1590947132387-155cc02f3212?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1571407970349-bc81e7e96d47?auto=format&fit=crop&w=800&q=80',
    ],
    status: 'approved',
    isActive: true,
  },
  {
    _id: new ObjectId('6b00551412182d16b6000207'),
    vendorId: vendorsData[1]._id,
    itemName: 'Spicy Hot Honey Sopressata',
    category: 'Classic Pizzas',
    description: 'Crisp hand-sliced spicy dry-cured sopressata, crushed tomato sauce, fresh mozzarella, red pepper flakes, and hot chili-infused honey.',
    price: 19.99,
    location: 'DUMBO, Brooklyn',
    images: [
      'https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1588315029754-2dd089d39a1a?auto=format&fit=crop&w=800&q=80',
    ],
    status: 'approved',
    isActive: true,
  },
  {
    _id: new ObjectId('6b00551412182d16b6000208'),
    vendorId: vendorsData[1]._id,
    itemName: 'Golden Crispy Cheesy Calzone',
    category: 'Sides & Appetizers',
    description: 'Folded golden sourdough pocket stuffed with seasoned whole-milk ricotta, melted mozzarella, garlic herbs, and savory parmesan side dip.',
    price: 14.50,
    location: 'DUMBO, Brooklyn',
    images: [
      'https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1541745537411-b8046dc6d66c?auto=format&fit=crop&w=800&q=80',
    ],
    status: 'approved',
    isActive: true,
  },

  // ─── Vendor 3: Moretti Artisan Slice (Greenwich Village) ───────────────────
  {
    _id: new ObjectId('6b00551412182d16b6000301'),
    vendorId: vendorsData[2]._id,
    itemName: 'Village Classic Cheese Pie',
    category: 'Classic Pizzas',
    description: 'The definitive New York style thin-crust cheese pizza with golden crispy bottom, rich tomato sauce seasoned with garlic, oregano, and low-moisture aged mozzarella.',
    price: 15.99,
    location: 'Greenwich Village, New York',
    images: [
      'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?auto=format&fit=crop&w=800&q=80',
    ],
    status: 'approved',
    isActive: true,
  },
  {
    _id: new ObjectId('6b00551412182d16b6000302'),
    vendorId: vendorsData[2]._id,
    itemName: 'Grandma Style Sicilian Square',
    category: 'Classic Pizzas',
    description: 'Olive oil-baked airy foccacia-style thick crust, crushed San Marzano plum tomatoes seasoned with garlic, fresh basil, and fresh mozzarella baked to crispy perfection.',
    price: 19.50,
    location: 'Greenwich Village, New York',
    images: [
      'https://images.unsplash.com/photo-1579751626657-72bc17010498?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?auto=format&fit=crop&w=800&q=80',
    ],
    status: 'approved',
    isActive: true,
  },
  {
    _id: new ObjectId('6b00551412182d16b6000303'),
    vendorId: vendorsData[2]._id,
    itemName: 'Buffalo Chicken & Creamy Ranch',
    category: 'Meat Lovers',
    description: 'Crispy seasoned chicken strips tossed in fiery Frank\'s RedHot sauce, shredded mozzarella, crumbles of blue cheese, and buttermilk herb ranch dressing.',
    price: 21.50,
    location: 'Greenwich Village, New York',
    images: [
      'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?auto=format&fit=crop&w=800&q=80',
    ],
    status: 'approved',
    isActive: true,
  },
  {
    _id: new ObjectId('6b00551412182d16b6000304'),
    vendorId: vendorsData[2]._id,
    itemName: 'Tuscan Sun Spinach & Feta White Pie',
    category: 'Vegetarian Pizzas',
    description: 'Garlic ricotta sauce, fresh organic baby spinach, sun-dried tomatoes, diced kalamata olives, creamy Greek feta cheese, and toasted pine nuts.',
    price: 18.99,
    location: 'Greenwich Village, New York',
    images: [
      'https://images.unsplash.com/photo-1541745537411-b8046dc6d66c?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=800&q=80',
    ],
    status: 'approved',
    isActive: true,
  },
  {
    _id: new ObjectId('6b00551412182d16b6000305'),
    vendorId: vendorsData[2]._id,
    itemName: 'Smoky Bacon & Caramelized Onion Bianco',
    category: 'Meat Lovers',
    description: 'Crisp smoked applewood bacon, slow-roasted sweet balsamic onions, fontina, fresh rosemary needles, and grated Pecorino Romano.',
    price: 20.50,
    location: 'Greenwich Village, New York',
    images: [
      'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=800&q=80',
    ],
    status: 'approved',
    isActive: true,
  },
  {
    _id: new ObjectId('6b00551412182d16b6000306'),
    vendorId: vendorsData[2]._id,
    itemName: 'Artisan Four Cheese Quattro Bianca',
    category: 'Specialty / Gourmet Pizzas',
    description: 'Whipped whole milk ricotta, sharp provolone, aged parmesan, and creamy fresh mozzarella, topped with crushed red chili and fresh basil.',
    price: 19.00,
    location: 'Greenwich Village, New York',
    images: [
      'https://images.unsplash.com/photo-1571407970349-bc81e7e96d47?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1594007654729-407eedc4be65?auto=format&fit=crop&w=800&q=80',
    ],
    status: 'approved',
    isActive: true,
  },
  {
    _id: new ObjectId('6b00551412182d16b6000307'),
    vendorId: vendorsData[2]._id,
    itemName: 'Roasted Garlic & Artichoke Medley',
    category: 'Vegetarian Pizzas',
    description: 'Whole roasted garlic cloves, fire-roasted marinated artichoke hearts, sweet red onions, shaved parmesan, and fresh oregano over marinara.',
    price: 17.99,
    location: 'Greenwich Village, New York',
    images: [
      'https://images.unsplash.com/photo-1528137871618-79d2761e3fd5?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1541745537411-b8046dc6d66c?auto=format&fit=crop&w=800&q=80',
    ],
    status: 'approved',
    isActive: true,
  },
  {
    _id: new ObjectId('6b00551412182d16b6000308'),
    vendorId: vendorsData[2]._id,
    itemName: 'Italian Meatball Ricotta Pie',
    category: 'Meat Lovers',
    description: 'Savory handmade beef and pork meatballs simmered in marinara, dollops of creamy ricotta cheese, melted mozzarella, and fresh basil.',
    price: 21.99,
    location: 'Greenwich Village, New York',
    images: [
      'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1579751626657-72bc17010498?auto=format&fit=crop&w=800&q=80',
    ],
    status: 'approved',
    isActive: true,
  },
  {
    _id: new ObjectId('6b00551412182d16b6000309'),
    vendorId: vendorsData[2]._id,
    itemName: 'Crispy Herbed Mozzarella Bites',
    category: 'Sides & Appetizers',
    description: 'Hand-breaded fresh mozzarella cubes fried to a golden crisp, seasoned with Italian herbs and served with warm marinara dipping sauce.',
    price: 9.99,
    location: 'Greenwich Village, New York',
    images: [
      'https://images.unsplash.com/photo-1541745537411-b8046dc6d66c?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?auto=format&fit=crop&w=800&q=80',
    ],
    status: 'approved',
    isActive: true,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 4. ORDERS DATA (16 orders across customers and vendors, with various statuses)
// ─────────────────────────────────────────────────────────────────────────────
const ordersData = [
  // Accepted orders (eligible for customer reviews)
  {
    _id: new ObjectId('6b00651412182d16b6000101'),
    itemId: menuItemsData[0]._id, // Neapolitan Margherita D.O.P.
    vendorId: vendorsData[0]._id,
    customerId: customersData[0]._id, // Lucas Bennett
    deliveryDate: '2026-11-20',
    deliveryAddress: '350 5th Ave, Apt 14B, New York, NY 10118',
    message: 'Please bake crust well done with extra fresh basil.',
    status: 'accepted',
    createdAt: new Date('2026-11-20T11:30:00Z'),
  },
  {
    _id: new ObjectId('6b00651412182d16b6000102'),
    itemId: menuItemsData[1]._id, // Double Pepperoni Crispy Cups
    vendorId: vendorsData[0]._id,
    customerId: customersData[1]._id, // Elena Rostova
    deliveryDate: '2026-11-20',
    deliveryAddress: '740 Park Ave, Apt 8E, New York, NY 10021',
    message: 'Ring the doorbell and leave with doorman if unavailable.',
    status: 'accepted',
    createdAt: new Date('2026-11-20T12:15:00Z'),
  },
  {
    _id: new ObjectId('6b00651412182d16b6000103'),
    itemId: menuItemsData[3]._id, // Truffle & Porcini Forest Mushroom
    vendorId: vendorsData[0]._id,
    customerId: customersData[2]._id, // David Chen
    deliveryDate: '2026-11-21',
    deliveryAddress: '85 Broad Street, Floor 18, New York, NY 10004',
    message: 'Office delivery during lunch break. Call on arrival.',
    status: 'accepted',
    createdAt: new Date('2026-11-21T11:45:00Z'),
  },
  {
    _id: new ObjectId('6b00651412182d16b6000104'),
    itemId: menuItemsData[9]._id, // Brooklyn Sourdough Margherita
    vendorId: vendorsData[1]._id,
    customerId: customersData[3]._id, // Maya Patel
    deliveryDate: '2026-11-21',
    deliveryAddress: '120 Atlantic Avenue, Brooklyn, NY 11201',
    message: 'Please slice into 8 pieces.',
    status: 'accepted',
    createdAt: new Date('2026-11-21T13:00:00Z'),
  },
  {
    _id: new ObjectId('6b00651412182d16b6000105'),
    itemId: menuItemsData[11]._id, // Pesto Genovese & Heirloom Burrata
    vendorId: vendorsData[1]._id,
    customerId: customersData[4]._id, // Liam O'Connor
    deliveryDate: '2026-11-21',
    deliveryAddress: '250 Bedford Ave, Williamsburg, Brooklyn, NY 11211',
    message: 'Keep burrata nice and fresh, thank you!',
    status: 'accepted',
    createdAt: new Date('2026-11-21T14:30:00Z'),
  },
  {
    _id: new ObjectId('6b00651412182d16b6000106'),
    itemId: menuItemsData[17]._id, // Village Classic Cheese Pie
    vendorId: vendorsData[2]._id,
    customerId: customersData[5]._id, // Chloe Martinez
    deliveryDate: '2026-11-22',
    deliveryAddress: '45-10 Court Square, Long Island City, NY 11101',
    message: 'Extra crushed red pepper packets please.',
    status: 'accepted',
    createdAt: new Date('2026-11-22T10:30:00Z'),
  },
  {
    _id: new ObjectId('6b00651412182d16b6000107'),
    itemId: menuItemsData[19]._id, // Buffalo Chicken & Creamy Ranch
    vendorId: vendorsData[2]._id,
    customerId: customersData[6]._id, // Alexander Wright
    deliveryDate: '2026-11-22',
    deliveryAddress: '10 Columbus Circle, Apt 42A, New York, NY 10019',
    message: 'Side of extra blue cheese dressing if possible.',
    status: 'accepted',
    createdAt: new Date('2026-11-22T12:00:00Z'),
  },

  // Pending orders
  {
    _id: new ObjectId('6b00651412182d16b6000108'),
    itemId: menuItemsData[2]._id, // Prosciutto di Parma & Wild Arugula
    vendorId: vendorsData[0]._id,
    customerId: customersData[0]._id, // Lucas Bennett
    deliveryDate: '2026-11-24',
    deliveryAddress: '350 5th Ave, Apt 14B, New York, NY 10118',
    message: 'Dinner order around 7 PM.',
    status: 'pending',
    createdAt: new Date('2026-11-23T08:00:00Z'),
  },
  {
    _id: new ObjectId('6b00651412182d16b6000109'),
    itemId: menuItemsData[10]._id, // Smoked Gouda BBQ Pulled Chicken
    vendorId: vendorsData[1]._id,
    customerId: customersData[1]._id, // Elena Rostova
    deliveryDate: '2026-11-24',
    deliveryAddress: '740 Park Ave, Apt 8E, New York, NY 10021',
    message: 'Please ensure contactless delivery.',
    status: 'pending',
    createdAt: new Date('2026-11-23T08:30:00Z'),
  },
  {
    _id: new ObjectId('6b00651412182d16b6000110'),
    itemId: menuItemsData[18]._id, // Grandma Style Sicilian Square
    vendorId: vendorsData[2]._id,
    customerId: customersData[2]._id, // David Chen
    deliveryDate: '2026-11-24',
    deliveryAddress: '85 Broad Street, Floor 18, New York, NY 10004',
    message: 'Warm slices for our team meetup.',
    status: 'pending',
    createdAt: new Date('2026-11-23T09:00:00Z'),
  },
  {
    _id: new ObjectId('6b00651412182d16b6000111'),
    itemId: menuItemsData[4]._id, // Spicy Calabrian Diavola
    vendorId: vendorsData[0]._id,
    customerId: customersData[3]._id, // Maya Patel
    deliveryDate: '2026-11-24',
    deliveryAddress: '120 Atlantic Avenue, Brooklyn, NY 11201',
    message: 'Make it as spicy as authentic Napoli style!',
    status: 'pending',
    createdAt: new Date('2026-11-23T09:15:00Z'),
  },

  // Rejected / Cancelled orders
  {
    _id: new ObjectId('6b00651412182d16b6000112'),
    itemId: menuItemsData[5]._id, // Sun-Drenched Garden Primavera
    vendorId: vendorsData[0]._id,
    customerId: customersData[4]._id, // Liam O'Connor
    deliveryDate: '2026-11-19',
    deliveryAddress: '250 Bedford Ave, Williamsburg, Brooklyn, NY 11211',
    message: 'Deliver before 5 PM.',
    status: 'rejected',
    createdAt: new Date('2026-11-19T10:00:00Z'),
  },
  {
    _id: new ObjectId('6b00651412182d16b6000113'),
    itemId: menuItemsData[12]._id, // The Brooklyn Carnivore Supreme
    vendorId: vendorsData[1]._id,
    customerId: customersData[5]._id, // Chloe Martinez
    deliveryDate: '2026-11-19',
    deliveryAddress: '45-10 Court Square, Long Island City, NY 11101',
    message: 'Party order for Friday evening.',
    status: 'rejected',
    createdAt: new Date('2026-11-19T15:00:00Z'),
  },
  {
    _id: new ObjectId('6b00651412182d16b6000114'),
    itemId: menuItemsData[20]._id, // Tuscan Sun Spinach & Feta White Pie
    vendorId: vendorsData[2]._id,
    customerId: customersData[6]._id, // Alexander Wright
    deliveryDate: '2026-11-18',
    deliveryAddress: '10 Columbus Circle, Apt 42A, New York, NY 10019',
    message: 'Gluten-sensitive request.',
    status: 'cancelled',
    createdAt: new Date('2026-11-18T16:00:00Z'),
  },
  {
    _id: new ObjectId('6b00651412182d16b6000115'),
    itemId: menuItemsData[8]._id, // Garlic Herb Dough Knots
    vendorId: vendorsData[0]._id,
    customerId: customersData[0]._id, // Lucas Bennett
    deliveryDate: '2026-11-18',
    deliveryAddress: '350 5th Ave, Apt 14B, New York, NY 10118',
    message: 'Added duplicate by mistake.',
    status: 'cancelled',
    createdAt: new Date('2026-11-18T18:00:00Z'),
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 5. REVIEWS DATA (7 verified reviews on accepted orders)
// ─────────────────────────────────────────────────────────────────────────────
const reviewsData = [
  {
    _id: new ObjectId('6b00751412182d16b6000101'),
    orderId: ordersData[0]._id,
    itemId: menuItemsData[0]._id,
    vendorId: vendorsData[0]._id,
    customerId: customersData[0]._id,
    customerName: customersData[0].name,
    customerImage: customersData[0].image,
    rating: 5,
    comment: 'Exceptional Neapolitan pizza! The crust had that perfect airy cornicione and leopard spotting. Tomatoes tasted sweet and fresh from Italy. Easily one of the best margheritas in NYC!',
    verifiedPurchase: true,
    createdAt: new Date('2026-11-20T14:00:00Z'),
    updatedAt: null,
  },
  {
    _id: new ObjectId('6b00751412182d16b6000102'),
    orderId: ordersData[1]._id,
    itemId: menuItemsData[1]._id,
    vendorId: vendorsData[0]._id,
    customerId: customersData[1]._id,
    customerName: customersData[1].name,
    customerImage: customersData[1].image,
    rating: 5,
    comment: 'The crispy pepperoni cups are out of this world! Packed with flavor, amazing crunch on the edges, and just the right amount of hot oil. Will be ordering every Friday night.',
    verifiedPurchase: true,
    createdAt: new Date('2026-11-20T15:30:00Z'),
    updatedAt: null,
  },
  {
    _id: new ObjectId('6b00751412182d16b6000103'),
    orderId: ordersData[2]._id,
    itemId: menuItemsData[3]._id,
    vendorId: vendorsData[0]._id,
    customerId: customersData[2]._id,
    customerName: customersData[2].name,
    customerImage: customersData[2].image,
    rating: 4,
    comment: 'The truffle aroma hit as soon as the box was opened! Wild mushrooms were tender and flavorful, and the garlic cream base was rich without feeling heavy. Highly recommended for gourmet fans.',
    verifiedPurchase: true,
    createdAt: new Date('2026-11-21T13:45:00Z'),
    updatedAt: null,
  },
  {
    _id: new ObjectId('6b00751412182d16b6000104'),
    orderId: ordersData[3]._id,
    itemId: menuItemsData[9]._id,
    vendorId: vendorsData[1]._id,
    customerId: customersData[3]._id,
    customerName: customersData[3].name,
    customerImage: customersData[3].image,
    rating: 5,
    comment: 'The sourdough flavor in this crust is spectacular. Crisp bottom, beautifully soft interior, and the stracciatella cheese adds such an indulgent texture. 10/10 Brooklyn pizza!',
    verifiedPurchase: true,
    createdAt: new Date('2026-11-21T15:10:00Z'),
    updatedAt: null,
  },
  {
    _id: new ObjectId('6b00751412182d16b6000105'),
    orderId: ordersData[4]._id,
    itemId: menuItemsData[11]._id,
    vendorId: vendorsData[1]._id,
    customerId: customersData[4]._id,
    customerName: customersData[4].name,
    customerImage: customersData[4].image,
    rating: 5,
    comment: 'The whole burrata on top was cold and creamy against the hot roasted tomatoes and fragrant pesto. Truly restaurant quality in the comfort of home.',
    verifiedPurchase: true,
    createdAt: new Date('2026-11-21T16:20:00Z'),
    updatedAt: null,
  },
  {
    _id: new ObjectId('6b00751412182d16b6000106'),
    orderId: ordersData[5]._id,
    itemId: menuItemsData[17]._id,
    vendorId: vendorsData[2]._id,
    customerId: customersData[5]._id,
    customerName: customersData[5].name,
    customerImage: customersData[5].image,
    rating: 4,
    comment: 'Classic New York slice nostalgia done right! The sauce has great herb depth, and there is zero grease pool on top. Great crust foldability and flavor.',
    verifiedPurchase: true,
    createdAt: new Date('2026-11-22T12:45:00Z'),
    updatedAt: null,
  },
  {
    _id: new ObjectId('6b00751412182d16b6000107'),
    orderId: ordersData[6]._id,
    itemId: menuItemsData[19]._id,
    vendorId: vendorsData[2]._id,
    customerId: customersData[6]._id,
    customerName: customersData[6].name,
    customerImage: customersData[6].image,
    rating: 5,
    comment: 'Spicy buffalo chicken meets cool creamy buttermilk ranch. Generous chicken chunks that remained tender and moist. Perfect game day pizza!',
    verifiedPurchase: true,
    createdAt: new Date('2026-11-22T14:00:00Z'),
    updatedAt: null,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 6. TRANSACTIONS DATA (Realistic Premium Vendor Subscriptions)
// ─────────────────────────────────────────────────────────────────────────────
const transactionsData = [
  {
    _id: new ObjectId('6b00851412182d16b6000101'),
    vendorId: vendorsData[0]._id,
    plan: 'premium_yearly',
    amount: 287.90,
    currency: 'usd',
    stripeSessionId: 'cs_test_demo_vendor1_yearly_sub',
    stripeEventId: 'evt_test_demo_vendor1_yearly_sub',
    stripeSubscriptionId: 'sub_test_demo_v1_yr',
    receiptUrl: 'https://pay.stripe.com/receipts/test/demo_vendor1_receipt',
    status: 'completed',
    createdAt: new Date('2026-10-15T09:15:00Z'),
  },
  {
    _id: new ObjectId('6b00851412182d16b6000102'),
    vendorId: vendorsData[1]._id,
    plan: 'premium_yearly',
    amount: 287.90,
    currency: 'usd',
    stripeSessionId: 'cs_test_demo_vendor2_yearly_sub',
    stripeEventId: 'evt_test_demo_vendor2_yearly_sub',
    stripeSubscriptionId: 'sub_test_demo_v2_yr',
    receiptUrl: 'https://pay.stripe.com/receipts/test/demo_vendor2_receipt',
    status: 'completed',
    createdAt: new Date('2026-10-18T11:20:00Z'),
  },
  {
    _id: new ObjectId('6b00851412182d16b6000103'),
    vendorId: vendorsData[2]._id,
    plan: 'premium_monthly',
    amount: 29.99,
    currency: 'usd',
    stripeSessionId: 'cs_test_demo_vendor3_monthly_sub',
    stripeEventId: 'evt_test_demo_vendor3_monthly_sub',
    stripeSubscriptionId: 'sub_test_demo_v3_mo',
    receiptUrl: 'https://pay.stripe.com/receipts/test/demo_vendor3_receipt',
    status: 'completed',
    createdAt: new Date('2026-11-10T14:40:00Z'),
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SEED EXECUTION FUNCTION
// ─────────────────────────────────────────────────────────────────────────────
async function runSeed() {
  console.log('🍕 Starting PizzaHub Demo Data Population...');
  const db = await connectDB();
  const passwordHash = hashPassword(DEMO_PASSWORD);

  const usersCol = db.collection('users');
  const userCol = db.collection('user');
  const accountCol = db.collection('account');
  const menuCol = db.collection('menuItems');
  const ordersCol = db.collection('orders');
  const reviewsCol = db.collection('reviews');
  const transCol = db.collection('transactions');

  // 1. Sync Vendors
  console.log('\n--- Seeding 3 Premium Vendors ---');
  for (const vendor of vendorsData) {
    const doc = {
      ...vendor,
      createdAt: vendor.createdAt || new Date('2026-10-15T09:00:00Z'),
      updatedAt: new Date(),
    };

    await usersCol.updateOne({ _id: vendor._id }, { $set: doc }, { upsert: true });
    await userCol.updateOne({ _id: vendor._id }, { $set: doc }, { upsert: true });

    // Seed credential account for Better Auth login
    await accountCol.updateOne(
      { userId: vendor._id, providerId: 'credential' },
      {
        $set: {
          accountId: vendor._id.toString(),
          providerId: 'credential',
          userId: vendor._id,
          password: passwordHash,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      { upsert: true }
    );
    console.log(`✓ Vendor: "${vendor.businessName}" (${vendor.email}) seeded with Premium plan.`);
  }

  // 2. Sync Customers
  console.log('\n--- Seeding 7 Customers ---');
  for (const customer of customersData) {
    const doc = {
      ...customer,
      createdAt: customer.createdAt || new Date('2026-10-20T10:00:00Z'),
      updatedAt: new Date(),
    };

    await usersCol.updateOne({ _id: customer._id }, { $set: doc }, { upsert: true });
    await userCol.updateOne({ _id: customer._id }, { $set: doc }, { upsert: true });

    // Seed credential account for Better Auth login
    await accountCol.updateOne(
      { userId: customer._id, providerId: 'credential' },
      {
        $set: {
          accountId: customer._id.toString(),
          providerId: 'credential',
          userId: customer._id,
          password: passwordHash,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      { upsert: true }
    );
    console.log(`✓ Customer: "${customer.name}" (${customer.email}) seeded.`);
  }

  // 3. Sync Menu Items
  console.log('\n--- Seeding 26 Menu Items (8-9 per vendor) ---');
  for (const item of menuItemsData) {
    const doc = {
      ...item,
      rating: 0,
      numReviews: 0,
      createdAt: new Date('2026-10-25T10:00:00Z'),
      updatedAt: new Date(),
    };

    await menuCol.updateOne(
      { itemName: item.itemName, vendorId: item.vendorId },
      { $set: doc },
      { upsert: true }
    );
  }
  console.log(`✓ 26 Menu Items synchronized across 3 vendors.`);

  // 4. Sync Orders
  console.log('\n--- Seeding 15 Customer Orders ---');
  for (const order of ordersData) {
    await ordersCol.updateOne(
      { _id: order._id },
      { $set: { ...order, updatedAt: new Date() } },
      { upsert: true }
    );
  }
  console.log(`✓ 15 Orders inserted (Accepted, Pending, Rejected, Cancelled).`);

  // 5. Sync Reviews
  console.log('\n--- Seeding 7 Verified Reviews ---');
  for (const review of reviewsData) {
    await reviewsCol.updateOne(
      { _id: review._id },
      { $set: { ...review, updatedAt: null } },
      { upsert: true }
    );
  }
  console.log(`✓ 7 Verified Reviews inserted for completed orders.`);

  // 6. Recalculate and update ratings on menu items
  console.log('\n--- Recalculating Menu Item Ratings & Review Counts ---');
  const distinctReviewedItems = [...new Set(reviewsData.map(r => r.itemId.toString()))];
  for (const itemIdStr of distinctReviewedItems) {
    const objectItemId = new ObjectId(itemIdStr);
    const stats = await reviewsCol.aggregate([
      {
        $match: {
          $or: [
            { itemId: objectItemId },
            { itemId: itemIdStr },
          ],
        },
      },
      {
        $group: {
          _id: null,
          avgRating: { $avg: '$rating' },
          count: { $sum: 1 },
        },
      },
    ]).toArray();

    if (stats.length > 0) {
      const avg = Number(stats[0].avgRating.toFixed(2));
      const count = stats[0].count;
      await menuCol.updateOne(
        { _id: objectItemId },
        { $set: { rating: avg, numReviews: count, updatedAt: new Date() } }
      );
      console.log(`✓ Item ${itemIdStr} updated: Rating ${avg} (${count} reviews)`);
    }
  }

  // 7. Sync Transactions
  console.log('\n--- Seeding Vendor Premium Subscription Transactions ---');
  for (const trans of transactionsData) {
    await transCol.updateOne(
      { _id: trans._id },
      { $set: trans },
      { upsert: true }
    );
  }
  console.log(`✓ 3 Transactions recorded.`);

  // 8. Summary Counts
  const totalVendors = await usersCol.countDocuments({ role: 'vendor' });
  const totalCustomers = await usersCol.countDocuments({ role: 'customer' });
  const totalMenuItems = await menuCol.countDocuments({ status: 'approved' });
  const totalOrders = await ordersCol.countDocuments({});
  const totalReviews = await reviewsCol.countDocuments({});
  const totalTransactions = await transCol.countDocuments({});

  console.log('\n======================================================');
  console.log('🎉 PizzaHub Demo Data Population Completed Successfully!');
  console.log(`• Total Vendors in DB: ${totalVendors}`);
  console.log(`• Total Customers in DB: ${totalCustomers}`);
  console.log(`• Total Approved Menu Items in DB: ${totalMenuItems}`);
  console.log(`• Total Orders in DB: ${totalOrders}`);
  console.log(`• Total Reviews in DB: ${totalReviews}`);
  console.log(`• Total Transactions in DB: ${totalTransactions}`);
  console.log(`• Shared Demo Account Password: "${DEMO_PASSWORD}"`);
  console.log('======================================================\n');

  process.exit(0);
}

runSeed().catch((err) => {
  console.error('Seed execution failed:', err);
  process.exit(1);
});
