import { getCollection } from '../config/db.js';
import { signToken } from '../utils/token.js';

export async function createToken(req, res, next) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required to issue a token',
      });
    }

    const usersCol = getCollection('users');
    const user = await usersCol.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Refuse token issuance if the user has been blocked by an administrator.
    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Account is blocked',
      });
    }

    const token = signToken({
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        image: user.image,
        businessName: user.businessName,
        subscriptionPlan: user.subscriptionPlan || 'free',
      },
    });
  } catch (error) {
    next(error);
  }
}

export function getMe(req, res) {
  const { password, ...safeUser } = req.user;
  res.json({
    success: true,
    user: safeUser,
  });
}
