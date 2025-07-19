import { User } from "../modules/userModel.js";
import bcrypt from "bcrypt";
import TryCatch from "../utils/TryCatch.js";
import generateToken from "../utils/generateToken.js";
import CryptoJS from "crypto-js";
import cloudinary from "cloudinary";
import {
  sendPasswordResetOTPEmail,
  sendRegistrationSuccessEmail,
  sendPasswordResetSuccessEmail,
  sendDeactivationEmail,
  sendDeletionEmail,
} from "../utils/emailService.js";
import { redisClient } from "../database/redis.js";
import getDataUrl from "../utils/urlGenerator.js";
import { Pin } from "../modules/pinModel.js";

export const registerUser = TryCatch(async (req, res) => {
  const { name, username, email, password } = req.body;

  if (!name || !username || !email || !password) {
    return res.status(400).json({
      message: "All fields (name, username, email, password) are required",
    });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      message: "Invalid email format",
    });
  }

  const passwordRegex =
    /^(?!.*\s)(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{8,}$/;

  if (!passwordRegex.test(password)) {
    return res.status(400).json({
      message:
        "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character (!@#$%^&*) with no spaces",
    });
  }
  let user = await User.findOne({ email });
  if (user) {
    return res.status(400).json({ message: "Email already exists" });
  }

  user = await User.findOne({ username });
  if (user) {
    return res.status(400).json({ message: "Username already exists" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  user = await User.create({ name, username, email, password: hashedPassword });

  generateToken(user._id, res);

  /*try {
    await sendRegistrationSuccessEmail(email, name);
  } catch (error) {
    console.error("Failed to send registration email:", error);
  }*/

  res.status(201).json({
    user,
    message: "User created successfully",
  });
});

export const loginUser = TryCatch(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(400).json({ message: "Invalid password" });
  }

  if(user.isDeactivated) {
    user.isDeactivated = false;
    user.deactivationDate = null;
    await user.save();
  }

  generateToken(user._id, res);
  res.status(200).json({
    user,
    message: "User logged in successfully",
  });
});

export const myProfile = TryCatch(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }
  res.status(200).json({
    user,
    message: "User profile retrieved successfully",
  });
});

export const getMonthlyProfileViews = TryCatch(async (req, res) => {
  const user = await User.findOne({ username: req.params.username });
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const startDate = new Date(startOfMonth);
  const endDate = new Date(endOfMonth);

  try {
    const result = await User.aggregate([
      { $match: { _id: user._id } },
      { $unwind: "$profileViews" },
      {
        $match: {
          "profileViews.timestamp": {
            $gte: startDate,
            $lte: endDate,
          },
        },
      },
      {
        $group: {
          _id: {
            $cond: {
              if: { $ne: ["$profileViews.visitorId", null] },
              then: "$profileViews.visitorId",
              else: "$profileViews.ipAddress"
            }
          },
          count: { $sum: 1 }
        },
      },
      { $count: "uniqueViews" },
    ]);

    console.log("MongoDB aggregation result:", result);

    const monthlyViews = result.length > 0 ? result[0].uniqueViews : 0;

    res.status(200).json({
      monthlyViews,
      message: "Monthly profile views retrieved successfully",
    });
  } catch (error) {
    console.error("Error in aggregation:", error);
    res.status(500).json({
      message: "Failed to retrieve monthly profile views",
      error: error.message
    });
  }
});

export const userProfile = TryCatch(async (req, res) => {
  const user = await User.findOne({username: req.params.username}).select("-password");
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  if (user.isDeactivated && user._id.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      message: "This account is temporarily deactivated and cannot be viewed.",
    });
  }

  const isOwner = user._id.toString() === req.user._id.toString();
  const isFollower = user.followers.includes(req.user._id.toString());

  if(user.profileVisibility === "private" && !isOwner && !isFollower){
    console.log("hi not");
    return res.status(403).json({
      message: "This profile is private. Only approved followers can view it.",
    });
  }

  const shouldRecordView = req.query.recordView !== 'false';
  
  if (!isOwner && shouldRecordView) {
    const viewEntry = {
      visitorId: req.user?._id || null,
      ipAddress: !req.user?._id ? req.ip : null, // Use IP for anonymous users
      timestamp: new Date(),
    };
    user.profileViews.push(viewEntry);
    await user.save();
  }

  res.status(200).json({
    user,
    message: "User profile retrieved successfully",
  });
});

export const editProfile = TryCatch(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const { name, username, about, website, profileVisibility } = req.body;

  if (username) {
    const existingUser = await User.findOne({ username });
    if (existingUser && existingUser._id.toString() !== user._id.toString()) {
      return res.status(400).json({ message: "Username already exists" });
    }
    user.username = username;
  }

  if (name) user.name = name;
  if (about) user.about = about;
  if (website) user.website = website;
  if (profileVisibility && ["public", "private"].includes(profileVisibility)) user.profileVisibility = profileVisibility;

  if (req.file) {
    try {
      if (user.profilePhoto && user.profilePhoto.id) {
        try {
          await cloudinary.v2.uploader.destroy(user.profilePhoto.id);
        } catch (deleteError) {
          console.error(
            "Error deleting old profile photo from Cloudinary:",
            deleteError
          );
        }
      }
      const fileUri = getDataUrl(req.file);
      const result = await cloudinary.v2.uploader.upload(fileUri.content, {
        folder: "profile_photos",
        resource_type: "image",
      });
      user.profilePhoto = {
        id: result.public_id,
        url: result.secure_url,
      };
    } catch (error) {
      console.error("Cloudinary upload error:", error);
      return res
        .status(500)
        .json({ message: "Failed to upload profile photo" });
    }
  }
  await user.save();
  res.status(200).json({
    user,
    message: "Profile updated successfully",
  });
});

export const updateAccount = TryCatch(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const { email, password, action } = req.body;

  /*if (email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }
    const existingUser = await User.findOne({ email });
    if (existingUser && existingUser._id.toString() !== user._id.toString()) {
      return res.status(400).json({ message: "Email already exists" });
    }
    user.email = email;
  }*/

  if (password) {
    const passwordRegex =
      /^(?!.*\s)(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        message:
          "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character (!@#$%^&*) with no spaces",
      });
    }
    user.password = await bcrypt.hash(password, 10);
  }

  if (action === "deactivate") {
    user.isDeactivated = true;
    user.deactivationDate = new Date();
    await user.save();

    res.cookie("token", "", {
      expires: new Date(0),
      httpOnly: true,
      sameSite: "strict",
    });

    /*try {
      await sendDeactivationEmail(user.email, user.name);
    } catch (emailError) {
      console.error("Failed to send deactivation email:", emailError);
    }*/

    return res.status(200).json({
      message: "Account deactivated successfully. You have been logged out.",
    });
  } else if (action === "delete") {
    try{
      if(user.profilePhoto && user.profilePhoto.id){
        await cloudinary.v2.uploader.destroy(user.profilePhoto.id);
      }
      const pins = await Pin.find({owner: user._id});
      for(const pin of pins){
        if (pin.image?.id) {
          await cloudinary.v2.uploader.destroy(pin.image.id);
        }
      }

      await Pin.deleteMany({ owner: user._id });

      await Pin.updateMany(
        {likes: user._id},
        {$pull: {likes: user._id}}
      );

      await Pin.updateMany(
        { saved: user._id },
        { $pull: { saved: user._id } }
      );

      await User.updateMany(
        { followers: user._id },
        { $pull: { followers: user._id } }
      );
      await User.updateMany(
        { following: user._id },
        { $pull: { following: user._id } }
      );

      await user.deleteOne({_id: user._id});

      res.cookie("token", "", {
        expires: new Date(0),
        httpOnly: true,
        sameSite: "strict",
      });

      try {
        await sendDeletionEmail(user.email, user.name);
      } catch (emailError) {
        console.error("Failed to send deletion email:", emailError);
      }

      return res.status(200).json({
        message: "Account and all associated data deleted successfully.",
      });
    } catch (error) {
      console.error("Error deleting account:", error);
      return res.status(500).json({ message: "Failed to delete account" });
    }
  }

  await user.save();

  res.status(200).json({
    user,
    message: "Account updated successfully",
  });
});

export const followAndUnfollowUser = TryCatch(async (req, res) => {
  const loggedInUser = await User.findById(req.user._id);
  const user = await User.findById(req.params.id);

  if (!user) {
    return res.status(404).json({ message: "User not found with this Id" });
  }

  if (user._id.toString() === loggedInUser._id.toString()) {
    return res.status(400).json({ message: "You cannot follow yourself" });
  }

  const isFollowing = user.followers.includes(loggedInUser._id);

  if (isFollowing) {
    // Unfollow
    await User.findByIdAndUpdate(loggedInUser._id, {
      $pull: { following: user._id },
    });
    await User.findByIdAndUpdate(user._id, {
      $pull: { followers: loggedInUser._id },
    });

    res.status(200).json({
      message: "User unfollowed successfully",
    });
  } else {
    // Follow
    await User.findByIdAndUpdate(loggedInUser._id, {
      $push: { following: user._id },
    });
    await User.findByIdAndUpdate(user._id, {
      $push: { followers: loggedInUser._id },
    });

    res.status(200).json({
      message: "User followed successfully",
    });
  }
});

export const forgotPassword = TryCatch(async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  const user = await User.findOne({ email });
  if (!user) {
    return res
      .status(404)
      .json({ message: "User with this email does not exist" });
  }

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  // Create reset token hash using crypto-js
  const resetToken = CryptoJS.SHA256(otp).toString(CryptoJS.enc.Hex);

  const redisKey = `reset:${email}`;
  await redisClient.set(redisKey, resetToken);
  await redisClient.expire(redisKey, 10 * 60);

  // Set token and expiration on user document
  /*user.resetPasswordToken = resetToken;
  user.resetPasswordExpire = Date.now() + 10 * 60 * 1000;*/ // 10 minutes
  //await user.save();

  try {
    await sendPasswordResetOTPEmail(email, otp);
    res.status(200).json({
      message: "OTP sent successfully",
    });
  } catch (error) {
    // If email sending fails, clear the OTP and expiration
    /*user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;*/
    await redisClient.del(redisKey);
    //await user.save();
    return res.status(500).json({
      message: "Failed to send OTP email. Please try again later.",
    });
  }
});

export const resetPassword = TryCatch(async (req, res) => {
  const { email, otp, newPassword } = req.body;

  if (!email || !otp || !newPassword) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const passwordRegex =
    /^(?!.*\s)(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{8,}$/;
  if (!passwordRegex.test(newPassword)) {
    return res.status(400).json({
      message:
        "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character (!@#$%^&*) with no spaces",
    });
  }

  const redisKey = `reset:${email}`;
  const storedToken = await redisClient.get(redisKey);

  const resetToken = CryptoJS.SHA256(otp).toString(CryptoJS.enc.Hex);
  if (!storedToken || storedToken !== resetToken) {
    return res.status(400).json({
      message: "OTP has expired or is invalid. Please request a new one.",
    });
  }

  // Find user with the token and valid expiration
  const user = await User.findOne({ email });
  const hashPassword = await bcrypt.hash(newPassword, 10);
  user.password = hashPassword;
  /*user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;*/
  await user.save();

  await redisClient.del(redisKey);

  // Send password reset success email
  try {
    await sendPasswordResetSuccessEmail(email, user.name);
  } catch (error) {
    console.error("Failed to send password reset success email:", error);
    // Not critical, so we don't fail the reset
  }
  res.status(200).json({
    message: "Password reset successfully",
  });
});

export const getFollowers = TryCatch(async (req, res) => {
  const user = await User.findById(req.params.id).populate({
    path: "followers",
    match: { isDeactivated: false },
    select: "-password",
  });
  if (!user) {
    return res.status(404).json({ message: "User not found with this Id" });
  }
  res.status(200).json({
    followers: user.followers,
    message: "Followers retrieved successfully",
  });
});

export const getFollowings = TryCatch(async (req, res) => {
  const user = await User.findById(req.params.id).populate({
    path: "following",
    match: { isDeactivated: false },
    select: "-password",
  });
  if (!user) {
    return res.status(404).json({ message: "User not found with this Id" });
  }
  res.status(200).json({
    followings: user.following,
    message: "Followings retrieved successfully",
  });
});

export const getNotifications = TryCatch(async (req, res) => {
  const user = await User.findById(req.user._id).populate({
    path: "notifications.userId",
    select: "name username profilePhoto",
    match: { isDeactivated: false },
  }).populate({
    path: "notifications.pinId",
    select: "title image",
  });

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const unreadNotificationData = user.notifications
    .filter((notification) => !notification.isRead && notification.userId && notification.pinId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.status(200).json({
    unreadNotifications: user.unreadNotifications,
    notifications: unreadNotificationData,
    message: "Notifications retrieved successfully",
  });
});

export const markNotificationsRead = TryCatch(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const notificationId = req.params.id;
  const notification = user.notifications.find(
    (n) => n._id.toString() === notificationId
  );

  if (!notification) {
    return res.status(404).json({ message: "Notification not found" });
  }

  if (!notification.isRead) {
    notification.isRead = true;
    user.unreadNotifications = Math.max(0, (user.unreadNotifications || 0) - 1);
    await user.save();
  }

  res.status(200).json({
    message: "Notification marked as read",
    unreadNotifications: user.unreadNotifications,
  });
})

// userController.js
/*export const markNotificationsRead = TryCatch(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  user.notifications = user.notifications.map((notification) => ({
    ...notification.toObject(),
    isRead: true,
  }));
  await user.save();

  res.status(200).json({
    message: "Notifications marked as read",
  });
});*/

/*export const getUnreadNotifications = TryCatch(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }
  res.status(200).json({
    unreadNotifications: user.unreadNotifications || 0,
    message: "Unread notifications retrieved successfully",
  });
}) */

export const logOutUser = TryCatch(async (req, res) => {
  res.cookie("token", "", {
    expires: new Date(0),
    httpOnly: true,
    sameSite: "strict",
  });

  res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
});