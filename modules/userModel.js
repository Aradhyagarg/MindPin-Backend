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
