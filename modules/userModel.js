import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    profilePhoto: {
      id: { type: String, default: "" },
      url: { type: String, default: "" },
    },
    profileVisibility: {
      type: String,
      enum: ["public", "private"],
      default: "public",
    },
    about: {
      type: String,
      default: "",
    },
    website: {
      type: String,
      default: "",
    },
    followers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    following: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    isDeactivated: {
      type: Boolean,
      default: false,
    },
    deactivationDate: {
      type: Date,
    },
    notifications: [
      {
        type: {
          type: String,
          enum: ["comment", "follow", "like"],
          required: true,
        },
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        pinId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Pin",
          required: function () {
            return this.type === "comment" || this.type === "like";
          },
        },
        message: {
          type: String,
          required: true,
        },
        isRead: {
          type: Boolean,
          default: false,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    unreadNotifications: { 
      type: Number, 
      default: 0 
    },
    profileViews: [
      {
        visitorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        ipAddress: { type: String },
        timestamp: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
  }
);

export const User = mongoose.model("User", schema);
