import express from "express"
import auth from "../middlewares/auth.js"
import upload from "../middlewares/uploadMiddleware.js"
import { 
    addUser, 
    registerWithGoogle,
    getCountries,
    loginUser, 
    logoutUser,
    profile, 
    getAllUsers, 
    approveUser,
    rejectUser,
    getPendingUsers,
    updateUser, 
    deleteUser, 
    verifyEmail, 
    refreshTokenRoute, 
    getLimitedUser, 
    getFilteredUsers, 
    sortUsers, 
    getPage,
    addAdmin,
    resendVerificationEmail } from "../controllers/userController.js"
import admin from "../middlewares/adminMiddleware.js"
import { User } from "../models/userSchema.js"

const Router = express.Router()

Router.route('/users')
    .get(auth, admin, getAllUsers)

Router.route('/users/:id/approval')
    .patch(auth, admin, approveUser)

Router.route('/users/pending')
    .get(auth, admin, getPendingUsers)

Router.route('/users/:id/reject')
    .post(auth, admin, rejectUser)

Router.route('/register')
    .post(upload.single("image"), addUser)

Router.route('/admin/register')
    .post(addAdmin)

Router.route('/google')
    .post(registerWithGoogle)

Router.route('/countries')
    .get(getCountries)

Router.route('/login')
    .post(loginUser)

Router.route('/resend-verification')
    .post(resendVerificationEmail)

Router.route('/profile')
    .get(auth, profile)

Router.route('/logout')
    .post(auth, logoutUser)

Router.route('/verify-email/:token')
    .get(verifyEmail)

Router.route('/:email')
    .patch(auth, admin, updateUser)
    .delete(auth, admin, deleteUser)

Router.route('/refresh-token')
.post(refreshTokenRoute)

Router.route('/payment-details')
    .get(auth, async (req, res) => {
        try {
            const user = await User.findById(req.user._id).select('paymentDetails totalEarned totalPaid paymentStatus lastPaymentDate');
            if (!user) {
                return res.status(404).json({ status: 'fail', message: 'User not found' });
            }
            res.status(200).json({ status: 'success', data: user });
        } catch (err) {
            res.status(500).json({ status: 'fail', message: 'Internal server error' });
        }
    })
    .patch(auth, async (req, res) => {
        try {
            const { bankName, accountNumber, accountName, currency } = req.body;
            const user = await User.findById(req.user._id);
            if (!user) {
                return res.status(404).json({ status: 'fail', message: 'User not found' });
            }

            user.paymentDetails = {
                bankName: bankName || user.paymentDetails?.bankName,
                accountNumber: accountNumber || user.paymentDetails?.accountNumber,
                accountName: accountName || user.paymentDetails?.accountName,
                currency: currency || user.paymentDetails?.currency || 'USD',
                isVerified: false,
                verifiedAt: null,
            };

            await user.save();

            res.status(200).json({
                status: 'success',
                message: 'Payment details updated successfully',
                data: user,
            });
        } catch (err) {
            res.status(500).json({ status: 'fail', message: 'Internal server error' });
        }
    })


Router.route('/users/limit')
.get(auth, admin, getLimitedUser)

Router.route('/users/filter')
.get(auth, admin, getFilteredUsers)

Router.route('/users/sort')
.get(auth, admin, sortUsers)

Router.route('/users/page')
.get(auth, admin, getPage)



export default Router

