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
        const user = await User.findById(verified.id)

        if (!user) {
            return res.status(404).json({
                status: 'failed',
                message: 'unauthorized'
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