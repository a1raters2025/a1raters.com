import express from "express";
import auth from "../middlewares/auth.js";
import admin from "../middlewares/adminMiddleware.js";
import { ActivityLog, logActivity } from "../models/activityLog.js";
import { User } from "../models/userSchema.js";
import {
  initializePaystackTransfer,
  verifyPaystackTransfer,
  createPaystackTransferRecipient,
  listBanks,
  resolveAccountNumber,
  verifyPaystackWebhook,
} from "../utils/paystack.js";

const Router = express.Router();

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

Router.get(
    "/activity",
    auth,
    admin,
    asyncHandler(async (req, res) => {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(200, Math.max(10, parseInt(req.query.limit) || 50));
        const skip = (page - 1) * limit;

        const filter = {};
        if (req.query.action) filter.action = req.query.action;
        if (req.query.resourceType) filter.resourceType = req.query.resourceType;
        if (req.query.userName) filter.userName = { $regex: req.query.userName, $options: "i" };
        if (req.query.userId && req.query.userId !== "all") filter.userId = req.query.userId;
        if (req.query.ipAddress) filter.ipAddress = { $regex: req.query.ipAddress, $options: "i" };
        if (req.query.role) filter.userRole = req.query.role;
        if (req.query.dateFrom || req.query.dateTo) {
            filter.createdAt = {};
            if (req.query.dateFrom) filter.createdAt.$gte = new Date(req.query.dateFrom);
            if (req.query.dateTo) filter.createdAt.$lte = new Date(req.query.dateTo);
        }

        const [logs, total] = await Promise.all([
            ActivityLog.find(filter)
                .populate("userId", "userName email role lastLoginAt")
                .sort("-createdAt")
                .skip(skip)
                .limit(limit),
            ActivityLog.countDocuments(filter),
        ]);

        const totalPages = Math.ceil(total / limit);

        res.status(200).json({
            status: "success",
            data: {
                logs,
                pagination: {
                    currentPage: page,
                    totalPages,
                    totalItems: total,
                    itemsPerPage: limit,
                },
            },
        });
    })
);

Router.get(
    "/activity/user/:userId",
    auth,
    admin,
    asyncHandler(async (req, res) => {
        const { userId } = req.params;
        const limit = Math.min(200, Math.max(10, parseInt(req.query.limit) || 50));
        const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom) : undefined;
        const dateTo = req.query.dateTo ? new Date(req.query.dateTo) : undefined;

        const filter = { userId };
        if (dateFrom || dateTo) {
            filter.createdAt = {};
            if (dateFrom) filter.createdAt.$gte = dateFrom;
            if (dateTo) filter.createdAt.$lte = dateTo;
        }

        const logs = await ActivityLog.find(filter)
            .populate("userId", "userName email role")
            .sort("-createdAt")
            .limit(limit);

        res.status(200).json({ status: "success", data: logs });
    })
);

Router.get(
    "/sessions",
    auth,
    admin,
    asyncHandler(async (req, res) => {
        const since = new Date(Date.now() - 30 * 60 * 1000);
        const activeUsers = await User.find({ lastSeenAt: { $gte: since } })
            .select("userName email role lastLoginAt lastLoginIp lastSeenAt loginCount")
            .sort("-lastSeenAt");

        res.status(200).json({ status: "success", data: activeUsers });
    })
);

Router.post(
    "/sessions/:userId/force-logout",
    auth,
    admin,
    asyncHandler(async (req, res) => {
        const { userId } = req.params;
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ status: "fail", message: "User not found" });
        }

        await logActivity({
            userId: req.user._id,
            userName: req.user.userName || req.user.email,
            userRole: req.user.role,
            action: "account_suspended",
            resourceType: "user",
            resourceId: userId,
            ipAddress: req.ip || req.socket?.remoteAddress,
            userAgent: req.get("user-agent"),
            path: req.path,
            method: req.method,
            statusCode: 200,
            metadata: { targetUserName: user.userName },
        });

        res.status(200).json({
            status: "success",
            message: `User ${user.userName || user.email} has been logged out.`,
            data: { userId },
        });
    })
);

Router.get(
    "/stats",
    auth,
    admin,
    asyncHandler(async (req, res) => {
        const now = new Date();
        const dayStart = new Date(now.setHours(0, 0, 0, 0));
        const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        const [
            loginsToday,
            failedLoginsToday,
            activeUsers,
            totalReports,
            totalUsers,
            totalTasks,
            recentLogs,
        ] = await Promise.all([
            ActivityLog.countDocuments({ action: "login", createdAt: { $gte: dayStart } }),
            ActivityLog.countDocuments({ action: "login_failed", createdAt: { $gte: dayStart } }),
            User.countDocuments({ lastSeenAt: { $gte: weekStart } }),
            ActivityLog.countDocuments({ action: "create_report" }),
            User.countDocuments({}),
            ActivityLog.countDocuments({ resourceType: "task" }),
            ActivityLog.find({})
                .sort("-createdAt")
                .limit(20)
                .select("action userName userRole createdAt path statusCode metadata"),
        ]);

        const stats = {
            totalUsers,
            totalTasks,
            totalReports,
            totalVideos: 0,
            storageUsed: "0 MB",
            apiCallsToday: loginsToday + failedLoginsToday,
        };

        res.status(200).json({
            status: "success",
            data: stats,
        });
    })
);

Router.get(
    "/settings",
    auth,
    admin,
    asyncHandler(async (req, res) => {
        const defaultSettings = {
            siteName: process.env.SITE_NAME || "A1 Raters",
            fromEmail: process.env.SMTP_FROM || process.env.EMAIL_USER || "noreply@a1raters.com",
            siteDescription: process.env.SITE_DESCRIPTION || "Professional AI rating platform",
            allowRegistration: process.env.ALLOW_REGISTRATION !== "false",
            requireEmailVerification: process.env.REQUIRE_EMAIL_VERIFICATION !== "false",
            requireAdminApproval: process.env.REQUIRE_ADMIN_APPROVAL !== "false",
            defaultRole: process.env.DEFAULT_ROLE || "user",
            maintenanceMode: process.env.MAINTENANCE_MODE === "true",
            maxFileSize: parseInt(process.env.MAX_FILE_SIZE || "10", 10),
            sessionTimeout: parseInt(process.env.SESSION_TIMEOUT || "480", 10),
            smtpHost: process.env.SMTP_HOST || "",
            smtpPort: parseInt(process.env.SMTP_PORT || "587", 10),
            smtpUser: process.env.SMTP_USER || "",
            smtpPassword: process.env.SMTP_PASSWORD || "",
            googleClientId: process.env.GOOGLE_CLIENT_ID || "",
            openaiApiKey: process.env.OPENAI_API_KEY || "",
            cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || "",
            cloudinaryApiKey: process.env.CLOUDINARY_API_KEY || "",
            cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET || "",
        };

        res.status(200).json({ status: "success", data: defaultSettings });
    })
);

Router.post(
    "/settings",
    auth,
    admin,
    asyncHandler(async (req, res) => {
        const updates = req.body;
        const allowedFields = [
            "allowRegistration",
            "requireEmailVerification",
            "requireAdminApproval",
            "defaultRole",
            "maintenanceMode",
            "sessionTimeout",
            "maxFileSize",
            "siteName",
            "siteDescription",
            "fromEmail",
            "smtpHost",
            "smtpPort",
            "smtpUser",
        ];

        const changedFields = Object.keys(updates).filter((f) => allowedFields.includes(f));

        await logActivity({
            userId: req.user._id,
            userName: req.user.userName || req.user.email,
            userRole: req.user.role,
            action: "account_updated",
            resourceType: "settings",
            ipAddress: req.ip || req.socket?.remoteAddress,
            userAgent: req.get("user-agent"),
            path: req.path,
            method: req.method,
            statusCode: 200,
            metadata: {
                changedFields,
                values: changedFields.reduce((acc, field) => {
                    acc[field] = updates[field];
                    return acc;
                }, {}),
            },
        });

        res.status(200).json({
            status: "success",
            message: "Settings updated successfully",
            data: { changedFields, updatedSettings: Object.fromEntries(changedFields.map((f) => [f, updates[f]])) },
        });
    })
);

/* Payment Details Routes */
Router.get(
    "/payments/raters",
    auth,
    admin,
    asyncHandler(async (req, res) => {
        const { page = 1, limit = 50, paymentStatus } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const filter = { role: "user" };
        if (paymentStatus) filter.paymentStatus = paymentStatus;

        const [raters, total] = await Promise.all([
            User.find(filter)
                .select("userName email proxy paymentDetails totalEarned totalPaid paymentStatus lastPaymentDate createdAt")
                .sort("-createdAt")
                .skip(skip)
                .limit(parseInt(limit)),
            User.countDocuments(filter),
        ]);

        res.status(200).json({
            status: "success",
            data: raters,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / parseInt(limit)),
                totalItems: total,
            },
        });
    })
);

Router.get(
    "/payments/raters/:userId",
    auth,
    admin,
    asyncHandler(async (req, res) => {
        const { userId } = req.params;
        const rater = await User.findById(userId).select(
            "userName email proxy paymentDetails totalEarned totalPaid paymentStatus lastPaymentDate createdAt"
        );

        if (!rater) {
            return res.status(404).json({ status: "fail", message: "Rater not found" });
        }

        res.status(200).json({ status: "success", data: rater });
    })
);

Router.patch(
    "/payments/raters/:userId/process",
    auth,
    admin,
    asyncHandler(async (req, res) => {
        const { userId } = req.params;
        const { paymentStatus, amount, notes } = req.body;

        const rater = await User.findById(userId);
        if (!rater) {
            return res.status(404).json({ status: "fail", message: "Rater not found" });
        }

        if (rater.role !== "user") {
            return res.status(400).json({ status: "fail", message: "User is not a rater" });
        }

        const updates = {};
        if (paymentStatus) {
            rater.paymentStatus = paymentStatus;
            updates.paymentStatus = paymentStatus;
        }

        if (amount && paymentStatus === "paid") {
            rater.totalPaid += Number(amount);
            rater.totalEarned -= Number(amount);
            rater.lastPaymentDate = new Date();
            updates.totalPaid = rater.totalPaid;
            updates.lastPaymentDate = rater.lastPaymentDate;
        }

        await rater.save();

        await logActivity({
            userId: req.user._id,
            userName: req.user.userName || req.user.email,
            userRole: req.user.role,
            action: "payment_processed",
            resourceType: "user",
            resourceId: userId,
            path: req.path,
            method: req.method,
            statusCode: 200,
            metadata: { ...updates, notes: notes || null, amount: amount || null },
        });

        res.status(200).json({
            status: "success",
            message: "Payment processed successfully",
            data: {
                userId,
                userName: rater.userName,
                paymentStatus: rater.paymentStatus,
                totalEarned: rater.totalEarned,
                totalPaid: rater.totalPaid,
                lastPaymentDate: rater.lastPaymentDate,
            },
        });
    })
);

Router.post(
    "/payments/raters/:userId/payout",
    auth,
    admin,
    asyncHandler(async (req, res) => {
        const { userId } = req.params;
        const { amount, reason, bankCode } = req.body;

        const rater = await User.findById(userId);
        if (!rater) {
            return res.status(404).json({ status: "fail", message: "Rater not found" });
        }

        if (rater.role !== "user") {
            return res.status(400).json({ status: "fail", message: "User is not a rater" });
        }

        const paymentDetails = rater.paymentDetails;
        if (!paymentDetails?.accountNumber || !paymentDetails?.bankName) {
            return res.status(400).json({
                status: "fail",
                message: "Rater has not provided complete bank account details",
            });
        }

        const availableAmount = (rater.totalEarned || 0) - (rater.totalPaid || 0);
        const payoutAmount = amount ? Number(amount) : availableAmount;

        if (payoutAmount <= 0) {
            return res.status(400).json({ status: "fail", message: "No available amount to payout" });
        }

        if (payoutAmount > availableAmount) {
            return res.status(400).json({ status: "fail", message: "Payout amount exceeds available balance" });
        }

        try {
            let recipientCode = paymentDetails.recipientCode;

            if (!recipientCode) {
                const bankList = await listBanks(paymentDetails.currency || 'NGN');
                const bank = bankList.data?.find((b) => b.name.toLowerCase().includes(paymentDetails.bankName.toLowerCase()));
                
                if (!bank && !bankCode) {
                    return res.status(400).json({
                        status: "fail",
                        message: `Bank "${paymentDetails.bankName}" not found in Paystack. Please provide a valid bank code.`,
                    });
                }

                const resolvedBankCode = bankCode || bank?.code;
                if (!resolvedBankCode) {
                    return res.status(400).json({
                        status: "fail",
                        message: "Could not determine bank code. Please provide bank code manually.",
                    });
                }

                const recipientResponse = await createPaystackTransferRecipient({
                    name: paymentDetails.accountName || rater.userName,
                    accountNumber: paymentDetails.accountNumber,
                    bankCode: resolvedBankCode,
                    currency: paymentDetails.currency || 'NGN',
                });

                if (!recipientResponse.status || !recipientResponse.data?.recipient_code) {
                    return res.status(400).json({
                        status: "fail",
                        message: "Failed to create Paystack transfer recipient",
                        details: recipientResponse.message,
                    });
                }

                recipientCode = recipientResponse.data.recipient_code;
                rater.paymentDetails.recipientCode = recipientCode;
                await rater.save();
            }

            const reference = `payout_${userId}_${Date.now()}`;
            const transferResponse = await initializePaystackTransfer({
                amount: payoutAmount,
                recipientCode,
                reference,
                reason: reason || `Payout to ${rater.userName}`,
                currency: paymentDetails.currency || 'NGN',
            });

            if (!transferResponse.status || !transferResponse.data) {
                return res.status(400).json({
                    status: "fail",
                    message: "Failed to initiate Paystack transfer",
                    details: transferResponse.message,
                });
            }

            rater.paymentStatus = 'processing';
            rater.lastPaymentDate = new Date();
            await rater.save();

            await logActivity({
                userId: req.user._id,
                userName: req.user.userName || req.user.email,
                userRole: req.user.role,
                action: "payout_initiated",
                resourceType: "user",
                resourceId: userId,
                path: req.path,
                method: req.method,
                statusCode: 200,
                metadata: {
                    amount: payoutAmount,
                    reference: transferResponse.data.reference,
                    recipientCode,
                    reason: reason || `Payout to ${rater.userName}`,
                    transferStatus: transferResponse.data.status,
                },
            });

            res.status(200).json({
                status: "success",
                message: "Payout initiated successfully",
                data: {
                    reference: transferResponse.data.reference,
                    amount: payoutAmount,
                    status: transferResponse.data.status,
                    recipientCode,
                    rater: {
                        userId: rater._id,
                        userName: rater.userName,
                        paymentStatus: rater.paymentStatus,
                        totalEarned: rater.totalEarned,
                        totalPaid: rater.totalPaid,
                        lastPaymentDate: rater.lastPaymentDate,
                    },
                },
            });
        } catch (error) {
            console.error('Payout error:', error);
            res.status(500).json({
                status: "fail",
                message: error.message || "Failed to process payout",
            });
        }
    })
);

Router.get(
    "/payments/raters/:userId/payout/:reference/verify",
    auth,
    admin,
    asyncHandler(async (req, res) => {
        const { userId, reference } = req.params;

        const rater = await User.findById(userId);
        if (!rater) {
            return res.status(404).json({ status: "fail", message: "Rater not found" });
        }

        try {
            const verificationResponse = await verifyPaystackTransfer(reference);

            if (!verificationResponse.status || !verificationResponse.data) {
                return res.status(400).json({
                    status: "fail",
                    message: "Failed to verify transfer",
                    details: verificationResponse.message,
                });
            }

            const transferData = verificationResponse.data;
            const isSuccessful = transferData.status === 'success';

            if (isSuccessful && rater.paymentStatus !== 'paid') {
                const amount = transferData.amount / 100;
                rater.totalPaid += amount;
                rater.totalEarned -= amount;
                rater.paymentStatus = 'paid';
                rater.lastPaymentDate = new Date();
                await rater.save();
            } else if (transferData.status === 'failed' && rater.paymentStatus !== 'failed') {
                rater.paymentStatus = 'failed';
                await rater.save();
            }

            await logActivity({
                userId: req.user._id,
                userName: req.user.userName || req.user.email,
                userRole: req.user.role,
                action: "payout_verified",
                resourceType: "user",
                resourceId: userId,
                path: req.path,
                method: req.method,
                statusCode: 200,
                metadata: {
                    reference,
                    transferStatus: transferData.status,
                    amount: transferData.amount / 100,
                    raterPaymentStatus: rater.paymentStatus,
                },
            });

            res.status(200).json({
                status: "success",
                message: "Transfer verification complete",
                data: {
                    reference,
                    status: transferData.status,
                    amount: transferData.amount / 100,
                    currency: transferData.currency,
                    paidAt: transferData.paid_at,
                    rater: {
                        userId: rater._id,
                        userName: rater.userName,
                        paymentStatus: rater.paymentStatus,
                        totalEarned: rater.totalEarned,
                        totalPaid: rater.totalPaid,
                        lastPaymentDate: rater.lastPaymentDate,
                    },
                },
            });
        } catch (error) {
            console.error('Payout verification error:', error);
            res.status(500).json({
                status: "fail",
                message: error.message || "Failed to verify payout",
            });
        }
    })
);

Router.get(
    "/payments/banks",
    auth,
    admin,
    asyncHandler(async (req, res) => {
        const { currency = 'NGN' } = req.query;

        try {
            const response = await listBanks(currency);
            res.status(200).json({
                status: "success",
                data: response.data || [],
            });
        } catch (error) {
            console.error('List banks error:', error);
            res.status(500).json({
                status: "fail",
                message: error.message || "Failed to fetch banks",
            });
        }
    })
);

Router.post(
    "/payments/resolve-account",
    auth,
    admin,
    asyncHandler(async (req, res) => {
        const { accountNumber, bankCode } = req.body;

        if (!accountNumber || !bankCode) {
            return res.status(400).json({
                status: "fail",
                message: "Account number and bank code are required",
            });
        }

        try {
            const response = await resolveAccountNumber(accountNumber, bankCode);
            res.status(200).json({
                status: "success",
                data: response.data,
            });
        } catch (error) {
            console.error('Resolve account error:', error);
            res.status(500).json({
                status: "fail",
                message: error.message || "Failed to resolve account",
            });
        }
    })
);

Router.post(
    "/payments/webhook",
    asyncHandler(async (req, res) => {
        const signature = req.headers['x-paystack-signature'];
        const payload = req.body;

        if (!verifyPaystackWebhook(payload, signature)) {
            console.warn('Invalid Paystack webhook signature');
            return res.status(400).json({ status: "fail", message: "Invalid signature" });
        }

        const event = payload.event;
        const data = payload.data;

        try {
            if (event === 'transfer.success' || event === 'transfer.failed' || event === 'transfer.reversed') {
                const reference = data.reference;
                const user = await User.findOne({ 'paymentDetails.recipientCode': data.recipient.recipient_code });
                
                if (user) {
                    const isSuccess = event === 'transfer.success';
                    user.paymentStatus = isSuccess ? 'paid' : 'failed';
                    
                    if (isSuccess) {
                        const amount = data.amount / 100;
                        user.totalPaid += amount;
                        user.totalEarned -= amount;
                        user.lastPaymentDate = new Date();
                    }
                    
                    await user.save();

                    await logActivity({
                        userId: user._id,
                        userName: user.userName || user.email,
                        userRole: user.role,
                        action: `payout_${event.replace('transfer.', '')}`,
                        resourceType: "user",
                        resourceId: user._id.toString(),
                        path: '/admin/payments/webhook',
                        method: 'POST',
                        statusCode: 200,
                        metadata: { reference, event, amount: data.amount / 100 },
                    });
                }
            }

            res.status(200).json({ status: "success", message: "Webhook processed" });
        } catch (error) {
            console.error('Webhook processing error:', error);
            res.status(500).json({ status: "fail", message: "Webhook processing failed" });
        }
    })
);

export default Router;
