import express from "express";
import { searchContent } from "../controllers/searchController.js";
import { followAndUnfollowUser, loginUser, logOutUser, myProfile, registerUser, userProfile, forgotPassword, resetPassword, editProfile, updateAccount, getFollowers, getFollowings, getMonthlyProfileViews, getNotifications, markNotificationsRead } from "../controllers/userControllers.js";
import { isAuth } from "../middlewares/isAuth.js";
import uploadFile from "../middlewares/multer.js";

const router = express.Router();
router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/search", isAuth, searchContent);
router.get("/logout", isAuth, logOutUser);
router.get("/me", isAuth, myProfile);
router.get("/followers/:id", isAuth, getFollowers);
router.get("/followings/:id", isAuth, getFollowings);
//router.get("/unread-notifications", isAuth, getUnreadNotifications);
router.get("/notifications", isAuth, getNotifications);
//router.put("/notifications/read", isAuth, markNotificationsRead);
/*router.get("/user/:username/views", isAuth, getMonthlyProfileViews);
router.get("/:username", isAuth, userProfile);*/
router.get("/:username", isAuth, userProfile);
router.get("/:username/monthly-views", isAuth, getMonthlyProfileViews);
router.put("/notifications/:id", isAuth, markNotificationsRead);
router.post("/follow/:id", isAuth, followAndUnfollowUser);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.put("/edit-profile", isAuth, uploadFile, editProfile);
router.put("/account", isAuth, updateAccount);

export default router