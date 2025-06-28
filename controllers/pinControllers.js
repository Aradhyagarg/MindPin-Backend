import getDataUrl from "../utils/urlGenerator.js";
import cloudinary from "cloudinary";
import { Pin } from "../modules/pinModel.js";
import TryCatch from "../utils/TryCatch.js";
import { redisClient } from "../database/redis.js";

export const createPin = async (req, res) => {
  const { title, pin } = req.body;
  const file = req.file;
  const fileUrl = getDataUrl(file);
  const cloud = await cloudinary.v2.uploader.upload(fileUrl.content);
  const newPin = await Pin.create({
    title,
    pin,
    image: {
      id: cloud.public_id,
      url: cloud.secure_url,
    },
    owner: req.user._id,
  });

  const cacheKey = "all_pins";
  const cachedPins = await redisClient.get(cacheKey);
  let pins;
  if (cachedPins) {
    pins = JSON.parse(cachedPins);
  } else {
    pins = await Pin.find().sort({ createdAt: -1 });
  }
  pins.unshift(newPin);
  const newData = await redisClient.setEx(cacheKey, 600, JSON.stringify(pins));
  console.log(newData);

  res.json({
    message: "Pin created successfully",
  });
};

/*export const getAllPins = TryCatch(async (req, res) => {
  const cacheKey = "all_pins";
  const lockKey = "all_pins:lock";
  let pins;

  const cachedPins = await redisClient.get(cacheKey);
  if (cachedPins) {
    pins = JSON.parse(cachedPins);
  } else {
    const lockAcquired = await redisClient.setNX(lockKey, "1");
    if (lockAcquired) {
      await redisClient.expire(lockKey, 10);
      pins = await Pin.find().sort({ createdAt: -1 });
      await redisClient.setEx(cacheKey, 600, JSON.stringify(pins));
      await redisClient.del(lockKey);
    } else {
      await new Promise((resolve) => setTimeout(resolve, 100));
      const retryPins = await redisClient.get(cacheKey);
      pins = retryPins
        ? JSON.parse(retryPins)
        : await Pin.find().sort({ createdAt: -1 });
    }
  }

  res.json(pins);

  //const pins = await Pin.find().sort({createdAt: -1});
  //await redisClient.setEx(cacheKey, 200, JSON.stringify(pins));
  //res.json(pins);
});*/

export const getAllPins = TryCatch(async (req, res) => {
  /*const pins = await Pin.find().sort({ createdAt: -1 });

  const filterPins = pins.filter(pin => !pin.owner.isDeactivated);*/

  // Then filter out pins from deactivated users
  /*const filteredPins = pins.filter(pin => 
    pin.owner && !pin.owner.isDeactivated
  );*/

  //res.json(filterPins);

  const pins = await Pin.find()
    .populate({
      path: "owner",
      select: "-password",
    })
    .sort({ createdAt: -1 });

  // Then filter out pins from deactivated users
  const filteredPins = pins.filter(
    (pin) => pin.owner && !pin.owner.isDeactivated
  );

  const finalPins = filteredPins.filter((pin) => {
    if (pin.owner.profileVisibility === "public") return true;
    if (
      pin.owner.profileVisibility === "private" &&
      pin.owner._id.toString() === req.user._id.toString()
    )
      return true;
    if (
      pin.owner.profileVisibility === "private" &&
      pin.owner.followers.includes(req.user._id)
    )
      return true;
    return false;
  });

  res.json(finalPins);
});

export const getSinglePin = TryCatch(async (req, res) => {
  const singlePin = await Pin.findById(req.params.id).populate(
    "owner",
    "-password"
  );

  if (!singlePin) {
    return res.status(404).json({ message: "Pin not found" });
  }

  const isVisible =
    singlePin.owner.profileVisibility === "public" ||
    (singlePin.owner.profileVisibility === "private" &&
      singlePin.owner._id.toString() === req.user._id.toString()) ||
    (singlePin.owner.profileVisibility === "private" &&
      singlePin.owner.followers.includes(req.user._id));

  if (!isVisible) {
    return res.status(403).json({ message: "Access denied" });
  }

  res.json(singlePin);
});

export const getCurrentUserPins = TryCatch(async (req, res) => {
  const currentUser = req.user.id;
  const pins = await Pin.find({ owner: currentUser })
    .populate({
      path: "owner",
      select: "-password",
    })
    .sort({ createdAt: -1 });
  res.json(pins);
});

export const commentOnPin = TryCatch(async (req, res) => {
  const pin = await Pin.findById(req.params.id);
  if (!pin) {
    return res.status(404).json({ message: "Pin not found" });
  }
  pin.comments.push({
    user: req.user._id,
    name: req.user.name,
    comment: req.body.comment,
  });
  await pin.save();
  res.json({ message: "Comment added successfully" });
});

export const deleteComment = TryCatch(async (req, res) => {
  const pin = await Pin.findById(req.params.id);

  if (!pin)
    return res.status(400).json({
      message: "No Pin with this id",
    });

  if (!req.query.commentId)
    return res.status(404).json({
      message: "Please give comment id",
    });

  const commentIndex = pin.comments.findIndex(
    (item) => item._id.toString() === req.query.commentId.toString()
  );

  if (commentIndex === -1) {
    return res.status(404).json({
      message: "Comment not found",
    });
  }

  const comment = pin.comments[commentIndex];

  if (
    comment.user.toString() === req.user._id.toString() ||
    pin.owner.toString() === req.user._id.toString()
  ) {
    pin.comments.splice(commentIndex, 1);

    await pin.save();

    return res.json({
      message: "Comment Deleted",
    });
  } else {
    return res.status(403).json({
      message: "You are not owner of this comment",
    });
  }
});

export const updateComment = TryCatch(async (req, res) => {
  const pin = await Pin.findById(req.params.id);

  if (!pin) {
    return res.status(400).json({
      message: "No Pin with this id",
    });
  }

  if (!req.query.commentId) {
    return res.status(400).json({
      message: "Please provide comment id",
    });
  }

  // Validate comment text
  if (!req.body.comment || req.body.comment.trim() === "") {
    return res.status(400).json({
      message: "Comment text cannot be empty",
    });
  }

  const commentIndex = pin.comments.findIndex(
    (item) => item._id.toString() === req.query.commentId.toString()
  );

  if (commentIndex === -1) {
    return res.status(404).json({
      message: "Comment not found",
    });
  }

  const comment = pin.comments[commentIndex];

  if (comment.user.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      message: "You are not the owner of this comment",
    });
  }

  // Update comment
  pin.comments[commentIndex].comment = req.body.comment;
  pin.comments[commentIndex].updatedAt = Date.now();

  await pin.save();

  return res.json({
    message: "Comment Updated",
    comment: {
      _id: pin.comments[commentIndex]._id,
      user: pin.comments[commentIndex].user,
      name: pin.comments[commentIndex].name,
      comment: pin.comments[commentIndex].comment,
      createdAt: pin.comments[commentIndex].createdAt,
      updatedAt: pin.comments[commentIndex].updatedAt,
    },
  });
});

export const deletePin = TryCatch(async (req, res) => {
  const pin = await Pin.findById(req.params.id);
  if (!pin)
    return res.status(400).json({
      message: "No Pin with this id",
    });
  if (pin.owner.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      message: "You are not owner of this pin",
    });
  }
  await cloudinary.v2.uploader.destroy(pin.image.id);
  await pin.deleteOne();

  const cacheKey = "all_pins";
  const cachedPins = await redisClient.get(cacheKey);
  if (cachedPins) {
    let pins = JSON.parse(cachedPins);
    pins = pins.filter((p) => p._id.toString() !== req.params.id.toString());
    await redisClient.setEx(cacheKey, 600, JSON.stringify(pins));
  }
  return res.json({
    message: "Pin Deleted",
  });
});

export const updatePin = TryCatch(async (req, res) => {
  const pin = await Pin.findById(req.params.id);
  if (!pin)
    return res.status(400).json({
      message: "No Pin with this id",
    });
  if (pin.owner.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      message: "You are not owner of this pin",
    });
  }

  pin.title = req.body.title;
  pin.pin = req.body.pin;

  let cloud;
  if (req.file) {
    if (pin.image && pin.image.id) {
      await cloudinary.v2.uploader.destroy(pin.image.id);
    }
    const fileUrl = getDataUrl(req.file);
    cloud = await cloudinary.v2.uploader.upload(fileUrl.content);
    pin.image = {
      id: cloud.public_id,
      url: cloud.secure_url,
    };
  }

  const cacheKey = "all_pins";
  const cachedPins = await redisClient.get(cacheKey);
  if (cachedPins) {
    let pins = JSON.parse(cachedPins);
    const index = pins.findIndex(
      (p) => p._id.toString() === req.params.id.toString()
    );
    if (index !== -1) {
      pins[index].title = req.body.title;
      pins[index].pin = req.body.pin;
      if (req.file && cloud) {
        pins[index].image = {
          id: cloud.public_id,
          url: cloud.secure_url,
        };
      }
      await redisClient.setEx(cacheKey, 600, JSON.stringify(pins));
    }
  }

  await pin.save();
  return res.json({
    message: "Pin Updated",
  });
});

export const likeUnlikePin = TryCatch(async (req, res) => {
  const pin = await Pin.findById(req.params.id);
  if (!pin)
    return res.status(400).json({
      message: "No Pin with this id",
    });
  const userId = req.user._id;
  const hasLiked = pin.likes.includes(userId);
  if (hasLiked) {
    pin.likes = pin.likes.filter((id) => id.toString() !== userId.toString());
    await pin.save();

    return res.status(200).json({
      message: "Pin unliked successfully",
      likesCount: pin.likes.length,
    });
  } else {
    pin.likes.push(userId);
    await pin.save();

    return res.status(200).json({
      message: "Pin liked successfully",
      likesCount: pin.likes.length,
    });
  }
});

const escapeRegExp = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

export const getSuggestionPins = TryCatch(async (req, res) => {
  const pinId = req.params.id;
  console.log(`🔍 Fetching suggestions for pin ID: ${pinId}`);

  const currentPin = await Pin.findById(pinId).populate("owner", "-password");
  if (!currentPin) {
    return res.status(404).json({ message: "Pin not found" });
  }

  const titleKeywords = currentPin.title.toLowerCase().split(/\s+/);
  const descriptionKeywords = currentPin.description
    ? currentPin.description.toLowerCase().split(/\s+/)
    : [];

  const keywords = [...new Set([...titleKeywords, ...descriptionKeywords])]
    .filter((keyword) => keyword.length > 2 && !["in", "the", "a", "an"].includes(keyword))
    .map((keyword) => escapeRegExp(keyword));

  console.log(`🧠 Extracted keywords:`, keywords);
  if (keywords.length === 0) {
    console.log("⚠️ No valid keywords extracted for suggestions");
    return res.status(200).json([]);
  }

  const regexPattern = keywords.map((keyword) => `\\b${keyword}\\b`).join("|");
  console.log(`🔧 Regex pattern: ${regexPattern}`);

  const suggestedPins = await Pin.find({
    _id: { $ne: pinId }, 
    $or: [
      { title: { $regex: regexPattern, $options: "i" } },
      { description: { $regex: regexPattern, $options: "i" } }, 
    ],
    isDeactivated: { $ne: true },
  })
    .populate("owner", "-password")
    .limit(4);

  console.log(`✅ Found ${suggestedPins.length} suggested pins:`, suggestedPins.map(pin => pin.title));
  res.status(200).json(suggestedPins);
});

export const saveUnsavedPins = TryCatch(async (req, res) => {
  const pin = await Pin.findById(req.params.id);
  if (!pin)
    return res.status(400).json({
      message: "No Pin with this id",
    });

  const userId = req.user._id;
  const hasSaved = pin.saved.includes(userId);
  if (hasSaved) {
    pin.saved = pin.saved.filter((id) => id.toString() !== userId.toString());
    await pin.save();

    return res.status(200).json({
      message: "Pin unsaved successfully",
      savedCount: pin.saved.length,
    });
  } else {
    pin.saved.push(userId);
    await pin.save();

    return res.status(200).json({
      message: "Pin saved successfully",
      savedCount: pin.saved.length,
    });
  }
});

export const getLikedPins = TryCatch(async (req, res) => {
  const userId = req.user._id;
  const likedPins = await Pin.find({
    likes: {
      $in: [userId],
    },
  })
    .sort({ createdAt: -1 })
    .populate("owner", "-password")
    .populate("likes", "name");
  res.json(likedPins);
});

export const getSavedPins = TryCatch(async (req, res) => {
  const userId = req.user._id;
  const savedPins = await Pin.find({
    saved: {
      $in: [userId],
    },
  })
    .sort({ createdAt: -1 })
    .populate("owner", "-password")
    .populate("saved", "name");
  res.json(savedPins);
});
