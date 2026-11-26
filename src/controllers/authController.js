import { ObjectId } from 'mongodb';
import { getCollection } from '../config/db.js';
import { signToken } from '../utils/token.js';

/**
 * Extracts Better Auth session cookie from the cookie header if present.
 */
function extractSessionCookie(cookieHeader) {
  if (!cookieHeader || typeof cookieHeader !== 'string') return null;
  const match = cookieHeader.match(/(?:^|;\s*)(?:better-auth\.session_token|__Secure-better-auth\.session_token)=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export async function createToken(req, res, next) {
  try {
    const { email } = req.body;
    const sessionToken =
      req.headers['x-session-token'] ||
      req.body.sessionToken ||
      (req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.split(' ')[1]
        : null) ||
      extractSessionCookie(req.headers.cookie);

    // Enforce that only verified callers possessing an active session can request a JWT.
    if (!sessionToken) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Active session token is required to issue a JWT',
      });
    }

    // Verify session in Better Auth session collection
    let session = null;
    const sessionCol = getCollection('session');
    if (sessionCol) {
      session = await sessionCol.findOne({
        $or: [{ token: sessionToken }, { id: sessionToken }],
        expiresAt: { $gt: new Date() },
      });
    }

    if (!session) {
      const sessionsCol = getCollection('sessions');
      if (sessionsCol) {
        session = await sessionsCol.findOne({
          $or: [{ token: sessionToken }, { id: sessionToken }],
          expiresAt: { $gt: new Date() },
        });
      }
    }

    // Fallback: verify via Better Auth HTTP endpoint if Better Auth is running
    let verifiedUser = null;
    if (!session && process.env.BETTER_AUTH_URL) {
      try {
        const verifyRes = await fetch(
          `${process.env.BETTER_AUTH_URL}/api/auth/get-session`,
          {
            headers: {
              cookie: `better-auth.session_token=${sessionToken}`,
              authorization: `Bearer ${sessionToken}`,
            },
          }
        );
        if (verifyRes.ok) {
          const authData = await verifyRes.json();
          if (authData?.session && authData?.user) {
            session = authData.session;
            verifiedUser = authData.user;
          }
        }
      } catch {
        // Fallback network failure ignored; session validation will reject below.
      }
    }

    if (!session) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Invalid or expired session',
      });
    }

    // Resolve authoritative user from session
    const usersCol = getCollection('users');
    const userCol = getCollection('user');
    let user = verifiedUser;

    if (!user && session.userId) {
      if (ObjectId.isValid(session.userId)) {
        user =
          (await usersCol?.findOne({ _id: new ObjectId(session.userId) })) ||
          (await userCol?.findOne({ _id: new ObjectId(session.userId) }));
      }
      if (!user) {
        user =
          (await usersCol?.findOne({ _id: session.userId })) ||
          (await userCol?.findOne({ _id: session.userId }));
      }
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // If an email was explicitly supplied, verify it strictly matches the authenticated session user
    if (email && user.email.toLowerCase() !== email.trim().toLowerCase()) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Session does not match requested email',
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
      id: user._id ? user._id.toString() : user.id,
      email: user.email,
      role: user.role,
    });

    res.json({
      success: true,
      token,
      user: {
        id: user._id || user.id,
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
