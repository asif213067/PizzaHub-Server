// Verifies JSON Web Tokens and enforces role-based access control against the database.
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';
import { getCollection } from '../config/db.js';

export async function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Missing or malformed authorization header',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch the freshest record from the database to ensure role and block status are authoritative.
    const usersCol = getCollection('users');
    let userQuery = { email: decoded.email };

    if (decoded.id) {
      if (ObjectId.isValid(decoded.id)) {
        userQuery = { $or: [{ _id: new ObjectId(decoded.id) }, { _id: decoded.id }, { email: decoded.email }] };
      } else {
        userQuery = { $or: [{ _id: decoded.id }, { email: decoded.email }] };
      }
    }

    let user = await usersCol.findOne(userQuery);

    // Fallback to Better Auth's default 'user' collection if not in 'users'
    if (!user) {
      const userCol = getCollection('user');
      user = await userCol.findOne(userQuery);
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: User not found in database',
      });
    }

    // Blocked users must be denied access to all protected platform operations.
    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Your account has been blocked by an administrator',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Invalid or expired token',
    });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Authentication required',
      });
    }

    // Role check verifies database state rather than any untrusted client assertion.
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Requires one of [${roles.join(', ')}] role`,
      });
    }

    next();
  };
}

export const requireAdmin = requireRole('admin');
export const requireVendor = requireRole('vendor');
export const requireCustomer = requireRole('customer');
