import express from "express";
import dotenv from "dotenv";
import userRouters from "./routes/userRoutes.js"
import pinRouters from "./routes/pinRoutes.js"
//import authRouters from "./routes/authRoutes.js";
//import passport from "./config/passport.js"; // Updated path
import { connectDB } from "./database/db.js";
import cookieParser from "cookie-parser"
import cloudinary from "cloudinary"
import { redisClient, connectRedis } from './database/redis.js';

dotenv.config();
cloudinary.v2.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUD_API,
    api_secret: process.env.CLOUD_SECRET,
})
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
connectDB();
connectRedis();
// Initialize Passport (no session middleware)
//app.use(passport.initialize());
//app.use('/api/v8', pinRoutes);
app.use('/api/v8/user', userRouters);
app.use('/api/v8/pin', pinRouters);
//app.use('/api/v8/auth', authRouters);
const port = process.env.PORT;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
})