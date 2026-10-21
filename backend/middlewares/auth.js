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

        if (user.role !== 'admin' && !user.isApproved) {
            return res.status(403).json({
                status: 'failed',
                message: 'Your account is pending administrator approval'
            })
        }

        const path = req.originalUrl.split('?')[0];
        if (user.role === 'client' && path !== '/api/v1/client/dashboard' && path !== '/api/v1/user/logout') {
            return res.status(403).json({
                status: 'failed',
                message: 'Client accounts can only access category hours'
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