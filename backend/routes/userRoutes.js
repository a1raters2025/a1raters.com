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
import { emitAdminUpdate, emitPaymentDetailsChanged } from "../utils/socket.js";

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
            const response = await resolveAccountNumber(accountNumber, bankCode.trim());
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
            console.error('Paystack account verification failed:', {
                status: err.status,
                message: err.message,
            });
            res.status(502).json({
                status: 'fail',
                message: `Paystack account verification failed: ${err.message}`,
            });
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
            console.error('Failed to load payment details:', err);
            res.status(500).json({ status: 'fail', message: 'Internal server error' });
        }
    })
    .patch(auth, async (req, res) => {
        try {
            const { method = 'paystack' } = req.body;
            const user = await User.findById(req.user._id);
            if (!user) {
                return res.status(404).json({ status: 'fail', message: 'User not found' });
            }

            if (user.pendingPayoutReference || user.paymentStatus === 'processing') {
                return res.status(409).json({ status: 'fail', message: 'Bank details cannot be changed while a payout is processing' });
            }

            if (method === 'manual' || method === 'paypal') {
                const {
                    paymentProvider,
                    paypalEmail,
                    bankName,
                    accountNumber,
                    accountName,
                    routingNumber,
                    iban,
                    swiftCode,
                    country,
                    currency,
                } = req.body;
                const cleaned = {
                    paymentProvider: typeof paymentProvider === 'string' ? paymentProvider.trim().slice(0, 100) : '',
                    paypalEmail: typeof paypalEmail === 'string' ? paypalEmail.trim().toLowerCase().slice(0, 254) : '',
                    bankName: typeof bankName === 'string' ? bankName.trim().slice(0, 100) : '',
                    accountNumber: typeof accountNumber === 'string' ? accountNumber.trim().slice(0, 100) : '',
                    accountName: typeof accountName === 'string' ? accountName.trim().slice(0, 160) : '',
                    routingNumber: typeof routingNumber === 'string' ? routingNumber.trim().slice(0, 100) : '',
                    iban: typeof iban === 'string' ? iban.replace(/\s+/g, '').slice(0, 100).toUpperCase() : '',
                    swiftCode: typeof swiftCode === 'string' ? swiftCode.trim().slice(0, 50).toUpperCase() : '',
                    country: typeof country === 'string' ? country.trim().slice(0, 100) : '',
                    currency: typeof currency === 'string' ? currency.trim().toUpperCase() : '',
                };

                const invalidPaypalEmail = method === 'paypal' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned.paypalEmail);
                if (
                    (!cleaned.paymentProvider && method === 'manual') ||
                    (!cleaned.accountName && method === 'manual') ||
                    (!cleaned.accountNumber && method === 'manual') ||
                    !cleaned.country ||
                    !/^[A-Z]{3}$/.test(cleaned.currency) ||
                    invalidPaypalEmail
                ) {
                    return res.status(400).json({
                        status: 'fail',
                        message: method === 'paypal'
                            ? 'Enter a valid PayPal email address, country, and 3-letter currency code'
                            : 'Payment method, account holder, account number, country, and a 3-letter currency code are required',
                    });
                }

                user.paymentDetails = {
                    method,
                    paymentProvider: method === 'paypal' ? 'PayPal' : cleaned.paymentProvider,
                    paypalEmail: method === 'paypal' ? cleaned.paypalEmail : null,
                    bankName: cleaned.bankName || null,
                    bankCode: null,
                    accountNumber: method === 'manual' ? cleaned.accountNumber : null,
                    accountName: cleaned.accountName || null,
                    routingNumber: cleaned.routingNumber || null,
                    iban: cleaned.iban || null,
                    swiftCode: cleaned.swiftCode || null,
                    country: cleaned.country,
                    currency: cleaned.currency,
                    isVerified: false,
                    verificationStatus: 'pending_review',
                    verificationNote: null,
                    verifiedAt: null,
                    reviewedBy: null,
                    reviewedAt: null,
                    recipientCode: null,
                };

                await user.save();
                emitPaymentDetailsChanged(req.user._id.toString());
                emitAdminUpdate({
                    title: "Payment details submitted",
                    message: `${user.userName} submitted payment details for administrator review.`,
                    type: "info",
                    targetRoles: ["admin"],
                });
                return res.status(200).json({
                    status: 'success',
                    message: 'Payment details saved and submitted for administrator review',
                    data: {
                        paymentDetails: user.paymentDetails,
                        totalEarned: user.totalEarned,
                        totalPaid: user.totalPaid,
                        paymentStatus: user.paymentStatus,
                        lastPaymentDate: user.lastPaymentDate,
                    },
                });
            }

            if (method !== 'paystack') {
                return res.status(400).json({ status: 'fail', message: 'Select a supported payment method' });
            }

            const { bankCode, accountNumber } = req.body;
            if (typeof accountNumber !== 'string' || !/^\d{10}$/.test(accountNumber) || typeof bankCode !== 'string' || !bankCode.trim()) {
                return res.status(400).json({ status: 'fail', message: 'Enter a valid 10-digit account number and select a bank' });
            }

            let bankResponse;
            let accountResponse;
            try {
                [bankResponse, accountResponse] = await Promise.all([
                    listBanks('NGN'),
                    resolveAccountNumber(accountNumber, bankCode.trim()),
                ]);
            } catch (err) {
                console.error('Paystack payment details verification failed:', {
                    status: err.status,
                    message: err.message,
                });
                return res.status(502).json({
                    status: 'fail',
                    message: `Paystack account verification failed: ${err.message}`,
                });
            }
            const bank = (bankResponse.data || []).find((item) => item.code === bankCode.trim() && item.active && item.currency === 'NGN');
            if (!bank || !accountResponse.status || !accountResponse.data?.account_name) {
                return res.status(422).json({
                    status: 'fail',
                    message: accountResponse.message || 'Paystack could not verify the selected bank account and bank combination',
                });
            }

            user.paymentDetails = {
                method: 'paystack',
                paymentProvider: 'Paystack',
                paypalEmail: null,
                bankName: bank.name,
                bankCode: bank.code,
                accountNumber: accountResponse.data.account_number || accountNumber,
                accountName: accountResponse.data.account_name,
                currency: 'NGN',
                isVerified: true,
                verificationStatus: 'approved',
                verificationNote: null,
                verifiedAt: new Date(),
                reviewedBy: null,
                reviewedAt: null,
                recipientCode: null,
            };

            try {
                await user.save();
                emitPaymentDetailsChanged(req.user._id.toString());
            } catch (err) {
                console.error('Failed to save verified payment details:', err);
                return res.status(500).json({ status: 'fail', message: 'Unable to save verified bank details' });
            }

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
            console.error('Failed to update payment details:', err);
            res.status(500).json({ status: 'fail', message: 'Unable to update payment details' });
        }
    })

Router.route('/:email')
    .patch(auth, admin, updateUser)
    .delete(auth, admin, deleteUser)

Router.route('/users/limit')
.get(auth, admin, getLimitedUser)

Router.route('/users/filter')
.get(auth, admin, getFilteredUsers)

Router.route('/users/sort')
.get(auth, admin, sortUsers)

Router.route('/users/page')
.get(auth, admin, getPage)



export default Router
