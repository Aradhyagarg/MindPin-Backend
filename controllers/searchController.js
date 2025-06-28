import { Pin } from "../modules/pinModel.js";
import { User } from "../modules/userModel.js";
import TryCatch from "../utils/TryCatch.js";

export const searchContent = TryCatch(async (req, res) => {
  const { query } = req.query;
  if (!query || query.trim() === "") {
    return res.status(400).json({
      message: "Please provide a search query",
    });
  }

  const userSearch = User.find({
    $and: [
      { isDeactivated: false },
      {
        $or: [
          { name: { $regex: query, $options: "i" } },
          { username: { $regex: query, $options: "i" } },
          { email: { $regex: query, $options: "i" } },
        ],
      },
    ],
  })
    .select("-password")
    .limit(10);

    const pinSearch = Pin.find({
        title: { $regex: query, $options: "i" } 
    })
      .populate({
        path: "owner",
        match: { isDeactivated: false },
        select: "-password",
      })
      .sort({ createdAt: -1 })
      .limit(10);
  
    const [users, pins] = await Promise.all([userSearch, pinSearch]);

    const filteredUsers = users.filter((user) => {
      const isOwner = user._id.toString() === req.user._id.toString();
      const isFollower = user.followers.includes(req.user._id);
      return user.profileVisibility === "public" || isOwner || isFollower;
    })
    //const filteredPins = pins.filter((pin) => pin.owner !== null);
    const filteredPins = pins
    .filter((pin) => pin.owner !== null)
    .filter((pin) => {
      if (!pin.owner) return false;
      if (pin.owner.profileVisibility === "public") return true;
      if (pin.owner.profileVisibility === "private" && pin.owner.followers.includes(req.user._id)) return true;
      if (pin.owner.profileVisibility === "private" && pin.owner._id.toString() === req.user._id.toString()) return true;
      return false;
    });
    return res.status(200).json({
    message: "Search results retrieved successfully",
    results: {
      users: filteredUsers || [],
      pins: filteredPins || [],
    },
  });
});
