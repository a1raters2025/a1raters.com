import jwt from 'jsonwebtoken'
import { User } from '../models/userSchema.js';

const auth = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            status: 'failed',
            message: 'authorization token not found'
        })
    }

    const token = authHeader.split(' ')[1];

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET)
        const user = await User.findByIdAndUpdate(
            verified.id,
            { lastSeenAt: new Date() },
            { returnDocument: 'after', select: '-password' }
        )

        if (!user) {
            return res.status(404).json({
                status: 'failed',
                message: 'unauthorized'
            })
        }

        if (!user.isVerified) {
            return res.status(403).json({
                status: 'failed',
                message: 'Please verify your email before accessing your account'
            })
        }

        if (user.role !== 'admin' && !user.isApproved) {
            return res.status(403).json({
                status: 'failed',
                message: 'Your account is pending administrator approval'
            })
        }

        req.user = user;
        next()
    } catch (error) {
        return res.status(401).json({
            status: 'failed',
            message: 'invalid or expired token'
        })
    }
}

export default auth;