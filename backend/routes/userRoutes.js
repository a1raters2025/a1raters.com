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
    profileUpdate,
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
    resendVerificationEmail,
    uploadProfileImage,
    removeProfileImage } from "../controllers/userController.js"
import admin from "../middlewares/adminMiddleware.js"
import { User } from "../models/userSchema.js"
import { listBanks, resolveAccountNumber } from "../utils/paystack.js"

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
    .patch(auth, profileUpdate)

Router.route('/:email/image')
    .post(auth, upload.single("image"), uploadProfileImage)

Router.route('/me/image')
    .delete(auth, removeProfileImage)

Router.route('/logout')
    .post(auth, logoutUser)

Router.route('/verify-email/:token')
    .get(verifyEmail)

Router.route('/:email')
    .patch(auth, admin, updateUser)
    .delete(auth, admin, deleteUser)

Router.route('/refresh-token')
.post(refreshTokenRoute)

Router.route('/payment-banks')
    .get(auth, async (req, res) => {
        try {
            const response = await listBanks('NGN');
            const banks = (response.data || [])
                .filter((bank) => bank.active && bank.currency === 'NGN')
                .map(({ name, code }) => ({ name, code }));
            res.status(200).json({ status: 'success', data: banks });
        } catch (err) {
            console.error('Failed to fetch Paystack banks:', err);
            res.status(502).json({ status: 'fail', message: err?.message || 'Unable to load Nigerian banks from Paystack' });
        }
    })

Router.route('/resolve-payment-account')
    .post(auth, async (req, res) => {
        const { accountNumber, bankCode } = req.body;
        if (typeof accountNumber !== 'string' || !/^\d{10}$/.test(accountNumber) || typeof bankCode !== 'string' || !bankCode.trim()) {
            return res.status(400).json({ status: 'fail', message: 'Enter a valid 10-digit account number and select a bank' });
        }

        try {
            const response = await resolveAccountNumber(accountNumber, bankCode);
            if (!response.status || !response.data?.account_name) {
                return res.status(422).json({ status: 'fail', message: response.message || 'Paystack could not verify this bank account' });
            }
            res.status(200).json({
                status: 'success',
                data: {
                    accountNumber: response.data.account_number,
                    accountName: response.data.account_name,
                },
            });
        } catch (err) {
            console.error('Paystack account verification error:', err);
            res.status(502).json({ status: 'fail', message: 'Unable to verify this bank account with Paystack' });
        }
    })

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
            const { bankCode, accountNumber } = req.body;
            const user = await User.findById(req.user._id);
            if (!user) {
                return res.status(404).json({ status: 'fail', message: 'User not found' });
            }

            if (user.pendingPayoutReference || user.paymentStatus === 'processing') {
                return res.status(409).json({ status: 'fail', message: 'Bank details cannot be changed while a payout is processing' });
            }

            if (typeof accountNumber !== 'string' || !/^\d{10}$/.test(accountNumber) || typeof bankCode !== 'string' || !bankCode.trim()) {
                return res.status(400).json({ status: 'fail', message: 'Enter a valid 10-digit account number and select a bank' });
            }

            const [bankResponse, accountResponse] = await Promise.all([
                listBanks('NGN'),
                resolveAccountNumber(accountNumber, bankCode),
            ]);
            const bank = (bankResponse.data || []).find((item) => item.code === bankCode && item.active && item.currency === 'NGN');
            if (!bank || !accountResponse.status || !accountResponse.data?.account_name) {
                return res.status(422).json({ status: 'fail', message: 'Paystack could not verify the selected bank account' });
            }

            user.paymentDetails = {
                bankName: bank.name,
                bankCode: bank.code,
                accountNumber: accountResponse.data.account_number || accountNumber,
                accountName: accountResponse.data.account_name,
                currency: 'NGN',
                isVerified: true,
                verifiedAt: new Date(),
                recipientCode: null,
            };

            await user.save();

            res.status(200).json({
                status: 'success',
                message: 'Paystack-verified bank details saved successfully',
                data: {
                    paymentDetails: user.paymentDetails,
                    totalEarned: user.totalEarned,
                    totalPaid: user.totalPaid,
                    paymentStatus: user.paymentStatus,
                    lastPaymentDate: user.lastPaymentDate,
                },
            });
        } catch (err) {
            console.error('Failed to save verified bank details:', err);
            res.status(502).json({ status: 'fail', message: 'Unable to verify and save bank details with Paystack' });
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
