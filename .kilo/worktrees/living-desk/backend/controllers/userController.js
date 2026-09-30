import jwt from 'jsonwebtoken';
import { User } from "../models/userSchema.js";
import { sendVerificationEmail } from "../config/email.js";
import { accessToken as generateAccessToken, refreshToken as generateRefreshToken} from "../utils/jwt.js";
import AppError from '../errors/AppError.js';
import bcrypt from 'bcrypt'
import crypto from 'crypto'
import { emitAdminUpdate } from '../utils/socket.js';

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
            password
        })

        const verificationToken = generateAccessToken({ id: user._id, email: user.email })
        const verificationLink = `${process.env.CLIENT_URL || "http://localhost:5173"}/verify-email/${verificationToken}`

        await User.findByIdAndUpdate(user._id, { verificationToken })

        try {
            await sendVerificationEmail(user, verificationLink)
        } catch (emailError) {
            console.warn("Verification email could not be sent, marking user as verified for local development.", emailError);
            user.isVerified = true;
            await user.save();
        }

        if (process.env.NODE_ENV !== "production" && !user.isVerified) {
            user.isVerified = true;
            await user.save();
        }

        const safeUser = user.toObject();
        delete safeUser.password;
        res.status(201).json({
            status: "success",
            message: "user registered successfully.",
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

        const user = await User.create({ userName, email: email.toLowerCase(), role: "admin", password, isVerified: true });
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
        const { credential, role = 'user', proxy } = req.body;
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
                role: role === 'client' ? 'client' : 'user',
                proxy,
                password: crypto.randomBytes(32).toString('hex'),
                isVerified: true,
            });
        }

        const accessToken = generateAccessToken({ id: user._id });
        const refreshToken = generateRefreshToken({ id: user._id });
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'Production',
            sameSite: 'strict',
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
        // get the request token from req.params
        const { token: verificationToken } = req.params;
        // decode the token(encrypted server token and client token)
        const decoded = jwt.verify(verificationToken, process.env.JWT_SECRET);

        // make the id of the user to be the decorded id 
        const user = await User.findById(decoded.id);

        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        user.isVerified = true;
        user.verificationToken = undefined;
        await user.save();

        return res.redirect(`${process.env.CLIENT_URL || "http://localhost:5173"}/login`);
    } catch (error) {
        return res.status(400).json({ status: "fail", message: "Invalid or expired token." })
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
            return res.status(404).json({ status: "fail", message: "invalid Email or Password" })
        }

        // return error if user is not verified (only enforced in production;
        // in development accounts are auto-verified at registration)
        if (!user.isVerified && process.env.NODE_ENV === "production") {
            return res.status(403).json({
                status: "failed",
                message: "please verify your email before logging in"
            })
        }

        // compare the password in the database(hashed password and the password the user inputed)
        const comparePassword = await bcrypt.compare(password, user.password)

        // return an error if the passwords does  not match 
        if (!comparePassword) {
            return res.status(403).json({
                status: "failed",
                message: "invalid email or password"
            })
        }

    
        // generate a login token for authorization 
        // const logToken = token({ id: user._id })

        // generate an access and refresh Token 

        const accessToken = generateAccessToken({id: user._id})
        const refreshToken = generateRefreshToken({id: user._id})

        // store token using the HttpOnly XSS(cross site scripting )
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "Production",
            sameSite: "strict",
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

// updating a user using by email
export const updateUser = async (req, res) => {
    try {
        const { email } = req.params;
        const updateData = req.body

        const user = await User.findOneAndUpdate(
            { email: email.toLowerCase() },
            updateData,
            { new: true }
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

export const refreshTokenRoute = (req,res)=>{
    const token = req.cookies.refreshToken

    if(!token) return res.sendStatus(401);
    

    jwt.verify(token, process.env.JWT_SECRET, (err, user)=>{
            if(err) return res.sendStatus(403);

            const accessToken = generateAccessToken(user); //generates a new accessToken

            res.json({
                accessToken   //send the updated access token in the response 
            })
        })
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
        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
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
