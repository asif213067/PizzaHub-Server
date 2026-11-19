import { ObjectId } from 'mongodb';
import { getCollection } from '../config/db.js';

export async function getProfile(req, res, next) {
  try {
    const { password, ...safeUser } = req.user;
    res.json({
      success: true,
      data: safeUser,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateProfile(req, res, next) {
  try {
    const { name, image, businessName, phone, address } = req.body;
    const updateDoc = {};

    if (name !== undefined) {
      const trimmedName = name.trim();
      if (!trimmedName) {
        return res.status(400).json({
          success: false,
          message: 'Name cannot be empty',
        });
      }
      updateDoc.name = trimmedName;
    }

    if (image !== undefined) {
      updateDoc.image = image.trim();
    }

    if (phone !== undefined) {
      updateDoc.phone = phone.trim();
    }

    if (address !== undefined) {
      updateDoc.address = address.trim();
    }

    // Only vendors can manage a business/restaurant name.
    if (req.user.role === 'vendor' && businessName !== undefined) {
      updateDoc.businessName = businessName.trim();
    }

    // Role, subscription tier, and block status are strictly guarded and excluded from profile updates.
    if (Object.keys(updateDoc).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid editable fields provided for update',
      });
    }

    updateDoc.updatedAt = new Date();

    const usersCol = getCollection('users');
    let query = { _id: req.user._id };
    if (ObjectId.isValid(req.user._id)) {
      query = { $or: [{ _id: new ObjectId(req.user._id) }, { _id: req.user._id }] };
    }

    const updatedUser = await usersCol.findOneAndUpdate(
      query,
      { $set: updateDoc },
      { returnDocument: 'after', projection: { password: 0 } }
    );

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedUser,
    });
  } catch (error) {
    next(error);
  }
}
