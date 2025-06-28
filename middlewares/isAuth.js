import jwt from "jsonwebtoken"
import { User } from "../modules/userModel.js";

export const isAuth = async (req, res, next) => {
    try {
        const token = req.cookies.token;
        if (!token) return res.status(403).json({message: 'Please Login'});
  
        const decoded = jwt.verify(token, process.env.JWT_SEC);
        if(!decoded){
            return res.status(403).json({message: 'token expires'})
        }
        // Use decoded.id instead of _id
        const user = await User.findById(decoded.id);
        if (!user) return res.status(404).json({message: 'User not found'});
        req.user = user;
        next();
    } catch(error) {
        res.status(500).json({
            message: error.message || 'Authentication error'
        });
    }
};
/*export const isAuth = async(req, res, next) => {
    try{
        const token = req.cookies.token;
        if(!token) return res.status(403).json({message: 'Please Login'})
        const decoded = jwt.verify(token, process.env.JWT_SEC);
        if(!decoded){
            return res.status(403).json({message: 'token expires'})
        }
        const user = await User.findById(decoded.id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        req.user = user;
        next();
    }catch{
        console.log("Cookies received:", req.cookies);
        res.status(500).json({
            message: 'Error'
        })
    }
}*/