import jwt from 'jsonwebtoken';
import { User } from "../models/userSchema.js";
import { sendVerificationEmail } from "../config/email.js";
import { accessToken as generateAccessToken, refreshToken as generateRefreshToken} from "../utils/jwt.js";
import AppError from '../errors/AppError.js';
import bcrypt from 'bcrypt'
import crypto from 'crypto'
import { emitAdminUpdate } from '../utils/socket.js';
import { logActivity } from '../models/activityLog.js';

const createAndSendVerificationEmail = async (user) => {
    const rawToken = crypto.randomBytes(32).toString('hex');
    user.verificationToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    user.verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save();

    const apiBaseUrl = (process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 5000}/api/v1`).replace(/\/$/, '');
    await sendVerificationEmail(user, `${apiBaseUrl}/user/verify-email/${rawToken}`);
};

export const addUser = async (req, res) => {
    try {
        const { userName, email, role, password, confirmPassword, proxy } = req.body;
        const image = req.file?.secure_url || req.file?.path || req.body.image || "";

        if (password !== confirmPassword) {
            return res.status(400).json({ status: "fail", message: "Passwords do not match" });
        }

        const findUser = await User.findOne({ email: email.toLowerCase() })

        if (findUser) {
            return res.status(400).json({ status: "fail", message: "User already exists" });
        }

        const user = await User.create({
            image,
            userName,
            email: email.toLowerCase(),
            role: role === 'client' ? 'client' : 'user',
            proxy,
            password,
            isApproved: false
        })

        try {
            await createAndSendVerificationEmail(user);
        } catch (emailError) {
            console.error("Verification email could not be sent:", emailError);
            return res.status(503).json({
                status: "failed",
                message: "Your account was created, but the verification email could not be sent. Please try resending it from the login page."
            });
        }

        const safeUser = user.toObject();
        delete safeUser.password;
        res.status(201).json({
            status: "success",
            message: "Registration submitted. An administrator must approve your account before you can sign in.",
            data: safeUser
        })
    } catch (err) {
        res.status(501).json({
            status: "failed",
            message: `unable to register user error: ${err}`
        })
    }
}

export const addAdmin = async (req, res) => {
    try {
        const { userName, email, password, confirmPassword, passcode } = req.body;
        if (!process.env.ADMIN_REGISTRATION_PASSCODE || passcode !== process.env.ADMIN_REGISTRATION_PASSCODE) {
            return res.status(403).json({ status: "fail", message: "Invalid administrator passcode" });
        }
        if (!userName || !email || !password || password !== confirmPassword) {
            return res.status(400).json({ status: "fail", message: "Valid account details and matching passwords are required" });
        }
        const existing = await User.findOne({ email: email.toLowerCase() });
        if (existing) return res.status(400).json({ status: "fail", message: "User already exists" });

        const user = await User.create({ userName, email: email.toLowerCase(), role: "admin", password, isVerified: true, isApproved: true });
        emitAdminUpdate({ title: "Administrator account created", message: "A new administrator account has been registered.", type: "info" });
        const safeUser = user.toObject();
        delete safeUser.password;
        return res.status(201).json({ status: "success", message: "Administrator registered successfully", data: safeUser });
    } catch (err) {
        return res.status(500).json({ status: "failed", message: `Unable to register administrator: ${err.message}` });
    }
};

export const registerWithGoogle = async (req, res) => {
    try {
        const { credential, proxy } = req.body;
        if (!credential) {
            return res.status(400).json({ status: 'fail', message: 'Google credential is required' });
        }
        if (!process.env.GOOGLE_CLIENT_ID) {
            return res.status(503).json({ status: 'fail', message: 'Google signup is not configured' });
        }

        const googleResponse = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
        if (!googleResponse.ok) {
            return res.status(401).json({ status: 'fail', message: 'Invalid Google credential' });
        }

        const googleUser = await googleResponse.json();
        if (googleUser.aud !== process.env.GOOGLE_CLIENT_ID) {
            return res.status(401).json({ status: 'fail', message: 'Google credential audience mismatch' });
        }

        const email = googleUser.email?.toLowerCase();
        if (!email || googleUser.email_verified !== 'true') {
            return res.status(401).json({ status: 'fail', message: 'A verified Google email is required' });
        }

        let user = await User.findOne({ email });
        if (!user) {
            const userName = googleUser.name || email.split('@')[0];
            user = await User.create({
                userName,
                email,
                role: 'user',
                proxy,
                password: crypto.randomBytes(32).toString('hex'),
                isVerified: true,
                isApproved: false,
            });
        } else if (!user.isVerified) {
            user.isVerified = true;
            user.verificationToken = undefined;
            user.verificationTokenExpires = undefined;
            await user.save();
        }

        if (user.role !== 'admin' && !user.isApproved) {
            return res.status(403).json({ status: 'fail', message: 'Your account is pending administrator approval.' });
        }

        const accessToken = generateAccessToken({ id: user._id });
        const refreshToken = generateRefreshToken({ id: user._id });
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'none',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        const safeUser = user.toObject();
        delete safeUser.password;
        return res.status(200).json({ status: 'success', message: 'Google signup successful', token: accessToken, data: safeUser });
    } catch (err) {
        return res.status(500).json({ status: 'failed', message: `Google signup failed: ${err.message}` });
    }
};

export const getCountries = async (req, res) => {
    try {
        const countriesResponse = await fetch('https://countries.dev/countries?fields=name,alpha2Code,flag');
        if (!countriesResponse.ok) {
            return res.status(502).json({ status: 'failed', message: 'Country service unavailable' });
        }

        const countries = await countriesResponse.json();
        const normalizedCountries = countries.map((country) => ({
            name: { common: country.name },
            cca2: country.alpha2Code,
            flags: { svg: country.flag ? `https://countries.dev/flags/${country.alpha2Code.toLowerCase()}.svg` : undefined },
        }));
        return res.status(200).json({ status: 'success', data: normalizedCountries });
    } catch (err) {
        return res.status(502).json({ status: 'failed', message: 'Country service unavailable' });
    }
};



// email verification controller
export const verifyEmail = async (req, res) => {
    try {
        const { token: verificationToken } = req.params;
        const hashedToken = crypto.createHash('sha256').update(verificationToken).digest('hex');
        let user = await User.findOne({
            verificationToken: hashedToken,
            verificationTokenExpires: { $gt: new Date() },
        });

        if (!user) {
            try {
                const decoded = jwt.verify(verificationToken, process.env.JWT_SECRET);
                user = await User.findOne({ _id: decoded.id, verificationToken });
            } catch {
                user = null;
            }
        }

        if (!user) {
            return res.status(400).json({ status: "fail", message: "Invalid or expired verification link. Request a new one from the login page." });
        }

        user.isVerified = true;
        user.verificationToken = undefined;
        user.verificationTokenExpires = undefined;
        await user.save();

        return res.redirect(`${process.env.CLIENT_URL || "http://localhost:5173"}/login?verified=1`);
    } catch (error) {
        return res.status(400).json({ status: "fail", message: "Invalid or expired token." })
    }
};

export const resendVerificationEmail = async (req, res) => {
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    if (!email) {
        return res.status(400).json({ status: "fail", message: "Email is required" });
    }

    const user = await User.findOne({ email });
    if (!user || user.isVerified) {
        return res.status(200).json({ status: "success", message: "If the account needs verification, a new email has been sent." });
    }

    try {
        await createAndSendVerificationEmail(user);
        return res.status(200).json({ status: "success", message: "If the account needs verification, a new email has been sent." });
    } catch (error) {
        console.error("Verification email could not be resent:", error);
        return res.status(503).json({ status: "failed", message: "Unable to send the verification email right now. Please try again later." });
    }
};

// login User
export const loginUser = async (req, res) => {
    try {

        // get email/username and password from the request body
        const { email, password } = req.body;
        
        // Check if email looks like an email address
        const isEmail = email && email.includes('@');
        
        // Find user by email or username
        let user;
        if (isEmail) {
            user = await User.findOne({ email: email.toLowerCase() });
        } else {
            // Try to find by username (userName field)
            user = await User.findOne({ userName: email });
            // If not found, try by email anyway
            if (!user) {
                user = await User.findOne({ email: email.toLowerCase() });
            }
        }


        // return an error response if user doies not exist 
        if (!user) {
            await logActivity({
                userName: email || '',
                userRole: 'unknown',
                action: 'login_failed',
                resourceType: 'auth',
                ipAddress: req.ip || req.socket?.remoteAddress,
                userAgent: req.get('user-agent'),
                path: req.path,
                method: req.method,
                statusCode: 404,
                metadata: { reason: 'user_not_found', identifier: email },
            });
            return res.status(404).json({ status: "fail", message: "invalid Email or Password" })
        }

        // compare the password in the database(hashed password and the password the user inputed)
        const comparePassword = await bcrypt.compare(password, user.password)

        // return an error if the passwords does  not match 
        if (!comparePassword) {
            await logActivity({
                userId: user._id,
                userName: user.userName || user.email || '',
                userRole: user.role,
                action: 'login_failed',
                resourceType: 'auth',
                ipAddress: req.ip || req.socket?.remoteAddress,
                userAgent: req.get('user-agent'),
                path: req.path,
                method: req.method,
                statusCode: 403,
                metadata: { reason: 'invalid_password' },
            });
            return res.status(403).json({
                status: "failed",
                message: "invalid email or password"
            })
        }

        if (!user.isVerified) {
            await logActivity({
                userId: user._id,
                userName: user.userName || user.email || '',
                userRole: user.role,
                action: 'login_failed',
                resourceType: 'auth',
                ipAddress: req.ip || req.socket?.remoteAddress,
                userAgent: req.get('user-agent'),
                path: req.path,
                method: req.method,
                statusCode: 403,
                metadata: { reason: 'email_not_verified' },
            });
            return res.status(403).json({
                status: "failed",
                message: "Please verify your email before logging in."
            })
        }

        if (user.role !== 'admin' && !user.isApproved) {
            await logActivity({
                userId: user._id,
                userName: user.userName || user.email || '',
                userRole: user.role,
                action: 'login_failed',
                resourceType: 'auth',
                ipAddress: req.ip || req.socket?.remoteAddress,
                userAgent: req.get('user-agent'),
                path: req.path,
                method: req.method,
                statusCode: 403,
                metadata: { reason: 'account_pending_approval' },
            });
            return res.status(403).json({
                status: "failed",
                message: "Your account is pending administrator approval. You can sign in after it has been approved."
            })
        }

    
        // generate a login token for authorization 
        // const logToken = token({ id: user._id })

        // generate an access and refresh Token 

        const accessToken = generateAccessToken({id: user._id})
        const refreshToken = generateRefreshToken({id: user._id})

        await User.findByIdAndUpdate(user._id, {
            lastLoginAt: new Date(),
            lastLoginIp: req.ip || req.socket?.remoteAddress,
            $inc: { loginCount: 1 },
        });

        await logActivity({
            userId: user._id,
            userName: user.userName || user.email || '',
            userRole: user.role,
            action: 'login',
            resourceType: 'auth',
            ipAddress: req.ip || req.socket?.remoteAddress,
            userAgent: req.get('user-agent'),
            path: req.path,
            method: req.method,
            statusCode: 200,
        });

        // store token using the HttpOnly XSS(cross site scripting )
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "none",
            maxAge: 7 * 24 * 60 * 60 * 1000  //changing 7days to milliseconds

        });


        // return a success response if user logged in successfully
        const safeUser = user.toObject();
        delete safeUser.password;
        res.status(200).json({
            status: "success",
            message: "login successful",
            token: accessToken,
            data: safeUser
        })
    } catch (err) {
        res.status(501).json({
            status: "failed",
            message: `Unable to login error: ${err}`
        })
    }
}

// profile controller
export const profile = (req, res) => {
    try {
        const safeUser = req.user.toObject();
        delete safeUser.password;
        res.status(200).json({
            status: "success",
            message: "welcome to the profile page",
            data: safeUser,
        })
    } catch (err) {
        res.status(403).json({
            status: "failed",
            message: `Unauthorized error: ${err}`
        })
    }
}

// get all users
export const getAllUsers = async (req, res) => {
    try {
        const user = await User.find({})
        .select("-password")

        res.status(200).json({
            status: "success",
            message: "all users retrieved",
            data: user
        })
    } catch (err) {
        res.status(404).json({
            status: "failed",
            message: `unable to get users ${err}`
        })
    }
}

export const approveUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ status: "failed", message: "User not found" });
        }
        if (user.role === 'admin') {
            return res.status(400).json({ status: "failed", message: "Administrator accounts do not require approval" });
        }

        user.isApproved = true;
        await user.save();

        const safeUser = user.toObject();
        delete safeUser.password;

        await logActivity({
            userId: user._id,
            userName: user.userName || user.email || '',
            userRole: user.role,
            action: 'account_approved',
            resourceType: 'user',
            resourceId: user._id.toString(),
            ipAddress: req.ip || req.socket?.remoteAddress,
            userAgent: req.get('user-agent'),
            path: req.path,
            method: req.method,
            statusCode: 200,
            metadata: {
                adminUserId: req.user?._id,
                adminUserName: req.user?.userName || req.user?.email || '',
            },
        });

        emitAdminUpdate({ title: "Account approved", message: `${user.userName}'s account was approved.`, type: "success" });
        return res.status(200).json({ status: "success", message: "User approved successfully", data: safeUser });
    } catch (err) {
        return res.status(500).json({ status: "failed", message: `Unable to approve user: ${err.message}` });
    }
}

export const getPendingUsers = async (req, res) => {
    try {
        const { page = 1, limit = 50, role } = req.query;
        const filter = { isApproved: false, isVerified: true };
        if (role) filter.role = role;

        const skip = (Number(page) - 1) * Number(limit);

        const users = await User.find(filter)
            .select("-password -verificationToken -verificationTokenExpires")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));

        const total = await User.countDocuments(filter);

        return res.status(200).json({
            status: "success",
            message: "Pending users retrieved successfully",
            data: users,
            pagination: {
                currentPage: Number(page),
                totalPages: Math.ceil(total / Number(limit)),
                totalItems: total,
                itemsPerPage: Number(limit),
            },
        });
    } catch (err) {
        return res.status(500).json({ status: "failed", message: `Unable to get pending users: ${err.message}` });
    }
}

export const rejectUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ status: "failed", message: "User not found" });
        }
        if (user.role === 'admin') {
            return res.status(400).json({ status: "failed", message: "Administrator accounts cannot be rejected" });
        }

        const wasApproved = user.isApproved;
        user.isApproved = false;
        user.isRejected = true;
        user.rejectionReason = reason || 'No reason provided';
        user.rejectedAt = new Date();
        user.rejectedBy = req.user?._id || null;
        await user.save();

        const safeUser = user.toObject();
        delete safeUser.password;

        await logActivity({
            userId: user._id,
            userName: user.userName || user.email || '',
            userRole: user.role,
            action: 'account_rejected',
            resourceType: 'user',
            resourceId: user._id.toString(),
            ipAddress: req.ip || req.socket?.remoteAddress,
            userAgent: req.get('user-agent'),
            path: req.path,
            method: req.method,
            statusCode: 200,
            metadata: {
                adminUserId: req.user?._id,
                adminUserName: req.user?.userName || req.user?.email || '',
                reason: reason || 'No reason provided',
            },
        });

        emitAdminUpdate({
            title: "Account rejected",
            message: `${user.userName}'s account was rejected.`,
            type: "warning",
        });

        return res.status(200).json({ status: "success", message: "User rejected successfully", data: safeUser });
    } catch (err) {
        return res.status(500).json({ status: "failed", message: `Unable to reject user: ${err.message}` });
    }
}

// updating a user using by email
export const updateUser = async (req, res) => {
    try {
        const { email } = req.params;
        const editableFields = ['userName', 'email', 'proxy', 'evaluation', 'image'];
        const updateData = Object.fromEntries(
            Object.entries(req.body).filter(([field]) => editableFields.includes(field))
        );
        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ status: "failed", message: "No editable fields provided" });
        }

        const user = await User.findOneAndUpdate(
            { email: email.toLowerCase() },
            updateData,
            { returnDocument: 'after' }
        ).select("-password")

        if (!user) {
            return res.status(404).json({
                status: "failed",
                message: `User with the email: ${email} not found`
            })
        }

        res.status(200).json({
            status: "success",
            message: `User with the email: ${email} updated successfully`,
            data: user
        })
    } catch (err) {
        res.status(500).json({
            status: "failed",
            message: `internal server error : ${err}`
        })
    }
}

export const deleteUser = async (req, res) => {
    try {
        const { email } = req.params;

        const user = await User.findOneAndDelete({ email: email.toLowerCase() });
        if (!user) {
            return res.status(404).json({
                status: "failed",
                message: `user with the email: ${email} not found`
            })
        }

        res.status(200).json({
            status: "success",
            message: `user with the ${email} deleted`
        })
    } catch (err) {
        res.status(500).json({
            status: "failed",
            message: `internal server error ${err}`
        })
    }
}

export const refreshTokenRoute = async (req, res) => {
    const token = req.cookies.refreshToken

    if(!token) return res.sendStatus(401);

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (!user || !user.isVerified || (user.role !== 'admin' && !user.isApproved)) {
            return res.status(403).json({ status: "failed", message: "Account is pending administrator approval" });
        }

        const accessToken = generateAccessToken({ id: user._id });

        await logActivity({
            userId: user._id,
            userName: user.userName || user.email || '',
            userRole: user.role,
            action: 'token_refreshed',
            resourceType: 'auth',
            ipAddress: req.ip || req.socket?.remoteAddress,
            userAgent: req.get('user-agent'),
            path: req.path,
            method: req.method,
            statusCode: 200,
        });

        return res.json({ accessToken });
    } catch {
        return res.sendStatus(403);
    }
}

// request query
// get limited users
export const getLimitedUser = async (req, res) => {
    try {

        // getting request query from the url
        const limit = Number(req.query.limit) || 10;
        const user = await User.find({})
        .select("-password")
        .limit(limit)



        res.status(200).json({
            status: "success",
            message: "all users retrieved",
            data: user
        })
    } catch (err) {
        res.status(500).json({
            status: "failed",
            message: `unable to get users ${err}`
        })
    }
}


export const getFilteredUsers = async (req, res) => {
    try {

        // getting request query from the url
        const {username} = req.query
        const limit = Number(req.query.limit) || 2;
        
    //    const user = await User.find({$e: {price: price}})
            
        const user = await User.find({userName: {$regex: username, $options: 'i'}})
        .select("-password")
        .limit(limit)
        
        if(!user) return res.sendStatus(404)

        res.status(200).json({
            status: "success",
            message: "all users retrieved",
            data: user
        })
    } catch (err) {
        res.status(500).json({
            status: "failed",
            message: `unable to get users ${err}`
        })
    }
}

    // sorting
export const sortUsers = async (req, res) => {
    try {
        const { sort } = req.query;
        const limit = Number(req.query.limit) || 10;

        let query = User.find({})
        .select("-password")
        .limit(limit);

        if (sort === "userName") {
            query = query.sort({ userName: 1 }); // Ascending: A → Z
        }

        if (sort === "-userName") {
            query = query.sort({ userName: -1 }); // Descending: Z → A
        }

        const users = await query;

        res.status(200).json({
            status: "success",
            message: `${limit} users retrieved successfully`,
            data: users
        });

    } catch (err) {
        res.status(500).json({
            status: "failed",
            message: `Unable to get users: ${err.message}`
        });
    }
};
    // pagination

    export const getPage = async (req,res) =>{
        // page = 2
        // limit = 10
        // skip = (page - 1) * limit
        // skip =(2-1) * 10

        try{
            const page = Number(req.query.page) || 1;
            const limit = Number(req.query.limit) || 2;
            const skip = (page - 1) * limit;

            const users = await User.find({})
            .limit(limit)
            .skip(skip)

            if(!users) return res.sendStatus(404)

             res.status(200).json({
            status: "success",
            message: `${limit} users retrieved successfully`,
            data: users
        });


        }catch(err){
            res.status(500).json({
            status: "failed",
            message: `Unable to get users: ${err.message}`
        });
        }
        
    }

export const logoutUser = async (req, res) => {
    try {
        if (req.user) {
            await logActivity({
                userId: req.user._id,
                userName: req.user.userName || req.user.email || '',
                userRole: req.user.role,
                action: 'logout',
                resourceType: 'auth',
                ipAddress: req.ip || req.socket?.remoteAddress,
                userAgent: req.get('user-agent'),
                path: req.path,
                method: req.method,
                statusCode: 200,
            });
        }
        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "none",
        });

        res.status(200).json({
            status: "success",
            message: "Logged out successfully"
        });
    } catch (err) {
        res.status(500).json({
            status: "failed",
            message: `Unable to logout: ${err}`
        });
    }
};
