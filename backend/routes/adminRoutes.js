import express from "express";
import mongoose from "mongoose";
import crypto from "crypto";
import auth from "../middlewares/auth.js";
import admin from "../middlewares/adminMiddleware.js";
import { ActivityLog, logActivity } from "../models/activityLog.js";
import { User } from "../models/userSchema.js";
import { Payout } from "../models/payout.js";
import Invoice from "../models/Invoice.js";
import {
  initializePaystackTransfer,
  verifyPaystackTransfer,
  createPaystackTransferRecipient,
  listBanks,
  resolveAccountNumber,
  verifyPaystackWebhook,
} from "../utils/paystack.js";
import { emitPaymentDetailsChanged } from "../utils/socket.js";

const Router = express.Router();

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const applyTransferUpdate = async (reference, transferData) => {
    const session = await mongoose.startSession();
    let result;
    const incomingStatus = transferData.status;

    try {
        await session.withTransaction(async () => {
            const payout = await Payout.findOne({ reference }).session(session);
            if (!payout) {
                const error = new Error("Payout reference not found");
                error.statusCode = 404;
                throw error;
            }

            const now = transferData.paid_at ? new Date(transferData.paid_at) : new Date();
            const transferCode = transferData.transfer_code || payout.transferCode;
            const normalizedStatus = ["success", "failed", "reversed"].includes(incomingStatus)
                ? incomingStatus
                : "processing";

            if (normalizedStatus === "success") {
                if (!Number.isFinite(Number(transferData.amount)) || Number(transferData.amount) !== Math.round(payout.amount * 100)) {
                    throw new Error("Paystack transfer amount does not match the approved payout");
                }
                if (transferData.currency !== payout.currency) {
                    throw new Error("Paystack transfer currency does not match the approved payout");
                }

                if (!payout.accountingApplied) {
                    const user = await User.findOneAndUpdate(
                        { _id: payout.userId, pendingPayoutReference: reference },
                        {
                            $inc: { totalPaid: payout.amount },
                            $set: { paymentStatus: "paid", lastPaymentDate: now },
                            $unset: { pendingPayoutReference: 1, pendingPayoutAmount: 1 },
                        },
                        { new: true, session }
                    );
                    if (!user) {
                        throw new Error("Payout is no longer reserved for this user");
                    }
                    payout.accountingApplied = true;
                }
                const recipient = await User.findById(payout.userId)
                    .select("userName email")
                    .session(session);
                if (!recipient) {
                    throw new Error("Payout recipient no longer exists");
                }
                await Invoice.findOneAndUpdate(
                    { payoutReference: reference },
                    {
                        $set: {
                            status: "Paid",
                            date: now,
                            paymentDate: now,
                            message: "Paystack confirmed this bank transfer as successful.",
                        },
                        $unset: { reversedAt: 1 },
                        $setOnInsert: {
                            reference: `INV-${crypto.randomUUID().toUpperCase()}`,
                            payoutReference: reference,
                            source: "paystack_payout",
                            userId: recipient._id,
                            userEmail: recipient.email,
                            raterName: recipient.userName,
                            type: "Invoice",
                            amount: payout.amount.toString(),
                            currency: payout.currency,
                            month: new Intl.DateTimeFormat("en-US", { month: "long", timeZone: "UTC" }).format(now),
                            submittedBy: payout.initiatedBy,
                            reviewedBy: payout.initiatedBy,
                            reviewedAt: now,
                        },
                    },
                    { new: true, upsert: true, session, runValidators: true }
                );
                payout.status = "success";
                payout.paidAt = now;
                payout.failureMessage = null;
            } else if (normalizedStatus === "failed") {
                if (payout.status !== "success" && payout.status !== "reversed") {
                    await User.updateOne(
                        { _id: payout.userId, pendingPayoutReference: reference },
                        {
                            $set: { paymentStatus: "failed" },
                            $unset: { pendingPayoutReference: 1, pendingPayoutAmount: 1 },
                        },
                        { session }
                    );
                    payout.status = "failed";
                    payout.failureMessage = transferData.reason || transferData.message || "Paystack transfer failed";
                }
            } else if (normalizedStatus === "reversed") {
                if (payout.status === "success" && payout.accountingApplied) {
                    const user = await User.findById(payout.userId).session(session);
                    if (!user) throw new Error("Payout recipient no longer exists");
                    const update = {
                        $inc: { totalPaid: -payout.amount },
                        $set: { lastPaymentDate: now },
                    };
                    if (!user.pendingPayoutReference) update.$set.paymentStatus = "failed";
                    await User.updateOne({ _id: payout.userId }, update, { session });
                    payout.accountingApplied = false;
                } else {
                    await User.updateOne(
                        { _id: payout.userId, pendingPayoutReference: reference },
                        {
                            $set: { paymentStatus: "failed" },
                            $unset: { pendingPayoutReference: 1, pendingPayoutAmount: 1 },
                        },
                        { session }
                    );
                }
                await Invoice.updateOne(
                    { payoutReference: reference },
                    {
                        $set: {
                            status: "Reversed",
                            reversedAt: now,
                            message: transferData.reason || "Paystack reversed this bank transfer.",
                        },
                    },
                    { session }
                );
                payout.status = "reversed";
                payout.failureMessage = transferData.reason || "Paystack reversed the transfer";
            } else if (payout.status !== "success" && payout.status !== "failed" && payout.status !== "reversed") {
                payout.status = incomingStatus === "unknown" ? "unknown" : "processing";
            }

            payout.paystackStatus = incomingStatus || payout.paystackStatus;
            payout.transferCode = transferCode;
            await payout.save({ session });
            result = payout.toObject();
        });
    } finally {
        await session.endSession();
    }

    return result;
};

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
        const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 50));
        const skip = (page - 1) * limit;
        const filter = { role: "user" };
        if (req.query.paymentStatus) filter.paymentStatus = req.query.paymentStatus;
        if (req.query.search) {
            const search = new RegExp(escapeRegex(String(req.query.search).trim()), "i");
            filter.$or = [{ userName: search }, { email: search }, { proxy: search }];
        }

        const [raters, total] = await Promise.all([
            User.find(filter)
                .select("userName email proxy paymentDetails.method paymentDetails.paymentProvider paymentDetails.bankName paymentDetails.accountName paymentDetails.accountNumber paymentDetails.bankCode paymentDetails.routingNumber paymentDetails.iban paymentDetails.swiftCode paymentDetails.country paymentDetails.currency paymentDetails.isVerified paymentDetails.verificationStatus paymentDetails.verificationNote paymentDetails.verifiedAt paymentDetails.reviewedAt totalEarned totalPaid paymentStatus pendingPayoutReference pendingPayoutAmount lastPaymentDate createdAt")
                .sort("-createdAt")
                .skip(skip)
                .limit(limit),
            User.countDocuments(filter),
        ]);
        const data = raters.map((rater) => {
            const item = rater.toObject();
            return {
                ...item,
                paymentDetails: {
                    ...item.paymentDetails,
                    accountNumberMasked: item.paymentDetails?.accountNumber
                        ? `•••• ${item.paymentDetails.accountNumber.slice(-4)}`
                        : null,
                    accountNumber: undefined,
                    iban: item.paymentDetails?.iban ? `•••• ${item.paymentDetails.iban.slice(-4)}` : null,
                    routingNumber: item.paymentDetails?.routingNumber ? `•••• ${item.paymentDetails.routingNumber.slice(-4)}` : null,
                    swiftCode: item.paymentDetails?.swiftCode ? `•••• ${item.paymentDetails.swiftCode.slice(-4)}` : null,
                },
            };
        });

        res.status(200).json({
            status: "success",
            data,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(total / limit),
                totalItems: total,
            },
        });
    })
);

Router.get(
    "/payments/approvals",
    auth,
    admin,
    asyncHandler(async (req, res) => {
        const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 50));
        const filter = {
            role: "user",
            $or: [
                { paymentStatus: "processing" },
                {
                    $expr: {
                        $gt: [
                            { $subtract: [{ $ifNull: ["$totalEarned", 0] }, { $ifNull: ["$totalPaid", 0] }] },
                            0,
                        ],
                    },
                },
            ],
        };
        if (req.query.search) {
            const search = new RegExp(escapeRegex(String(req.query.search).trim()), "i");
            filter.$and = [{ $or: [{ userName: search }, { email: search }, { proxy: search }] }];
        }

        const [users, total] = await Promise.all([
            User.find(filter)
                .select("userName email proxy paymentDetails.method paymentDetails.paymentProvider paymentDetails.bankName paymentDetails.accountName paymentDetails.accountNumber paymentDetails.isVerified paymentDetails.verificationStatus paymentDetails.currency paymentDetails.country paymentDetails.routingNumber paymentDetails.iban paymentDetails.swiftCode totalEarned totalPaid paymentStatus pendingPayoutReference pendingPayoutAmount lastPaymentDate createdAt")
                .sort({ paymentStatus: 1, createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            User.countDocuments(filter),
        ]);
        const data = users.map((user) => ({
            ...user,
            availableAmount: Math.max(0, (user.totalEarned || 0) - (user.totalPaid || 0)),
            paymentDetails: {
                ...user.paymentDetails,
                accountNumberMasked: user.paymentDetails?.accountNumber
                    ? `•••• ${user.paymentDetails.accountNumber.slice(-4)}`
                    : null,
                accountNumber: undefined,
            },
        }));

        res.status(200).json({
            status: "success",
            data,
            pagination: { currentPage: page, totalPages: Math.ceil(total / limit), totalItems: total },
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
            "userName email proxy paymentDetails totalEarned totalPaid paymentStatus pendingPayoutReference pendingPayoutAmount lastPaymentDate createdAt"
        );

        if (!rater) {
            return res.status(404).json({ status: "fail", message: "Rater not found" });
        }

        res.status(200).json({ status: "success", data: rater });
    })
);

Router.patch(
    "/payments/raters/:userId/payment-details/review",
    auth,
    admin,
    asyncHandler(async (req, res) => {
        const { userId } = req.params;
        const { decision, note = "" } = req.body;
        if (!["approved", "rejected"].includes(decision)) {
            return res.status(400).json({ status: "fail", message: "Choose approved or rejected" });
        }
        if (typeof note !== "string" || note.length > 500) {
            return res.status(400).json({ status: "fail", message: "Review note must be 500 characters or fewer" });
        }

        const reviewedAt = new Date();
        const rater = await User.findOneAndUpdate(
            { _id: userId, "paymentDetails.method": "manual" },
            {
                $set: {
                    "paymentDetails.verificationStatus": decision,
                    "paymentDetails.isVerified": decision === "approved",
                    "paymentDetails.verificationNote": note.trim() || null,
                    "paymentDetails.verifiedAt": decision === "approved" ? reviewedAt : null,
                    "paymentDetails.reviewedBy": req.user._id,
                    "paymentDetails.reviewedAt": reviewedAt,
                },
            },
            { new: true }
        ).select("userName email paymentDetails totalEarned totalPaid paymentStatus lastPaymentDate");

        if (!rater) {
            return res.status(404).json({ status: "fail", message: "Manual payment details not found" });
        }

        emitPaymentDetailsChanged();
        res.status(200).json({
            status: "success",
            message: decision === "approved" ? "Manual payment details approved" : "Manual payment details rejected",
            data: rater,
        });
    })
);

Router.post(
    "/payments/raters/:userId/payout",
    auth,
    admin,
    asyncHandler(async (req, res) => {
        const { userId } = req.params;
        const { amount, reason } = req.body;

        const rater = await User.findById(userId);
        if (!rater) {
            return res.status(404).json({ status: "fail", message: "Rater not found" });
        }

        if (rater.role !== "user") {
            return res.status(400).json({ status: "fail", message: "User is not a rater" });
        }

        const paymentDetails = rater.paymentDetails;
        if (paymentDetails?.method === "manual") {
            return res.status(400).json({
                status: "fail",
                message: paymentDetails.verificationStatus === "approved"
                    ? "These manually submitted details are approved for review but cannot be paid through automatic Paystack transfers"
                    : "Manually submitted payment details must be approved by an administrator before payout",
            });
        }
        if (!paymentDetails?.accountNumber || !paymentDetails?.bankName || !paymentDetails?.bankCode || !paymentDetails?.isVerified) {
            return res.status(400).json({
                status: "fail",
                message: "Rater must save Paystack-verified Nigerian bank details before receiving a payout",
            });
        }

        const availableAmount = (rater.totalEarned || 0) - (rater.totalPaid || 0);
        const payoutAmount = amount === undefined ? availableAmount : Number(amount);
        if (!Number.isFinite(payoutAmount) || payoutAmount <= 0 || Math.round(payoutAmount * 100) !== payoutAmount * 100) {
            return res.status(400).json({ status: "fail", message: "No available amount to payout" });
        }
        if (payoutAmount > availableAmount) {
            return res.status(400).json({ status: "fail", message: "Payout amount exceeds available balance" });
        }

        let reference;
        try {
            let recipientCode = paymentDetails.recipientCode;
            if (!recipientCode) {
                const recipientResponse = await createPaystackTransferRecipient({
                    name: paymentDetails.accountName,
                    accountNumber: paymentDetails.accountNumber,
                    bankCode: paymentDetails.bankCode,
                    currency: "NGN",
                });
                if (!recipientResponse.status || !recipientResponse.data?.recipient_code) {
                    return res.status(502).json({ status: "fail", message: recipientResponse.message || "Paystack could not create a bank recipient" });
                }
                recipientCode = recipientResponse.data.recipient_code;
                await User.updateOne(
                    { _id: userId, "paymentDetails.bankCode": paymentDetails.bankCode, "paymentDetails.accountNumber": paymentDetails.accountNumber },
                    { $set: { "paymentDetails.recipientCode": recipientCode } }
                );
            }

            reference = `payout_${userId}_${crypto.randomUUID()}`;
            const payout = new Payout({
                userId,
                initiatedBy: req.user._id,
                amount: payoutAmount,
                currency: "NGN",
                recipientCode,
                reference,
                reason: typeof reason === "string" && reason.trim()
                    ? reason.trim().slice(0, 200)
                    : `Rater payout to ${rater.userName}`,
            });
            await payout.save();

            const lockedUser = await User.findOneAndUpdate(
                {
                    _id: userId,
                    role: "user",
                    paymentStatus: { $ne: "processing" },
                    $expr: {
                        $gte: [
                            { $subtract: [{ $ifNull: ["$totalEarned", 0] }, { $ifNull: ["$totalPaid", 0] }] },
                            payoutAmount,
                        ],
                    },
                },
                {
                    $set: {
                        paymentStatus: "processing",
                        pendingPayoutReference: reference,
                        pendingPayoutAmount: payoutAmount,
                    },
                },
                { new: true }
            );
            if (!lockedUser) {
                await Payout.updateOne({ reference }, { $set: { status: "cancelled" } });
                return res.status(409).json({
                    status: "fail",
                    message: "This payout is already processing or the available balance has changed. Refresh and try again.",
                });
            }

            try {
                const transferResponse = await initializePaystackTransfer({
                    amount: payoutAmount,
                    recipientCode,
                    reference,
                    reason: payout.reason,
                    currency: "NGN",
                });

                if (!transferResponse.status || !transferResponse.data) {
                    await applyTransferUpdate(reference, {
                        status: "failed",
                        message: transferResponse.message || "Paystack declined the transfer",
                    });
                    return res.status(502).json({
                        status: "fail",
                        message: transferResponse.message || "Paystack declined the transfer",
                    });
                }

                const transferData = transferResponse.data;
                await Payout.updateOne(
                    { reference },
                    { $set: { transferCode: transferData.transfer_code || null } }
                );
                const updatedPayout = await applyTransferUpdate(reference, transferData);

                await logActivity({
                    userId: req.user._id,
                    userName: req.user.userName || req.user.email,
                    userRole: req.user.role,
                    action: updatedPayout.status === "success" ? "payout_success" : "payout_initiated",
                    resourceType: "user",
                    resourceId: userId,
                    path: req.path,
                    method: req.method,
                    statusCode: 200,
                    metadata: { amount: payoutAmount, currency: "NGN", reference, transferStatus: transferData.status },
                });

                res.status(200).json({
                    status: "success",
                    message: updatedPayout.status === "success" ? "Bank payout completed" : "Paystack payout submitted for processing",
                    data: {
                        reference,
                        amount: payoutAmount,
                        currency: "NGN",
                        status: updatedPayout.status,
                        rater: {
                            userId: lockedUser._id,
                            userName: lockedUser.userName,
                            paymentStatus: updatedPayout.status === "success" ? "paid" : "processing",
                            totalEarned: lockedUser.totalEarned,
                            totalPaid: updatedPayout.status === "success" ? (lockedUser.totalPaid || 0) + payoutAmount : lockedUser.totalPaid,
                            lastPaymentDate: updatedPayout.paidAt || lockedUser.lastPaymentDate,
                        },
                    },
                });
            } catch (transferError) {
                await Payout.updateOne(
                    { reference, status: { $nin: ["success", "failed", "reversed"] } },
                    { $set: { status: "unknown", failureMessage: "Transfer response was inconclusive; verify its reference before retrying" } }
                );
                console.error("Paystack payout response was inconclusive:", transferError);
                return res.status(502).json({
                    status: "fail",
                    message: "Paystack did not confirm the transfer. Verify this reference before attempting another payout.",
                    data: { reference },
                });
            }
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

        const payout = await Payout.findOne({ userId, reference });
        if (!payout) {
            return res.status(404).json({ status: "fail", message: "Payout reference not found for this user" });
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
            const updatedPayout = await applyTransferUpdate(reference, transferData);
            const rater = await User.findById(userId).select("userName totalEarned totalPaid paymentStatus lastPaymentDate");

            await logActivity({
                userId: req.user._id,
                userName: req.user.userName || req.user.email,
                userRole: req.user.role,
                action: updatedPayout.status === "success"
                    ? "payout_success"
                    : updatedPayout.status === "failed"
                        ? "payout_failed"
                        : updatedPayout.status === "reversed"
                            ? "payout_reversed"
                            : "payout_initiated",
                resourceType: "user",
                resourceId: userId,
                path: req.path,
                method: req.method,
                statusCode: 200,
                metadata: {
                    reference,
                    transferStatus: transferData.status,
                    amount: transferData.amount / 100,
                    raterPaymentStatus: rater?.paymentStatus,
                },
            });

            res.status(200).json({
                status: "success",
                message: "Transfer verification complete",
                data: {
                    reference,
                    status: updatedPayout.status,
                    amount: updatedPayout.amount,
                    currency: updatedPayout.currency,
                    paidAt: updatedPayout.paidAt,
                    rater: {
                        userId: rater?._id,
                        userName: rater?.userName,
                        paymentStatus: rater?.paymentStatus,
                        totalEarned: rater?.totalEarned,
                        totalPaid: rater?.totalPaid,
                        lastPaymentDate: rater?.lastPaymentDate,
                    },
                },
            });
        } catch (error) {
            console.error('Payout verification error:', error);
            res.status(error.statusCode || 502).json({
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

        if (!verifyPaystackWebhook(payload, signature, req.rawBody)) {
            console.warn('Invalid Paystack webhook signature');
            return res.status(400).json({ status: "fail", message: "Invalid signature" });
        }

        const event = payload.event;
        const data = payload.data;

        try {
            if (event === 'transfer.success' || event === 'transfer.failed' || event === 'transfer.reversed') {
                const payout = await Payout.findOne({ reference: data.reference });
                if (payout) {
                    if (data.recipient?.recipient_code && data.recipient.recipient_code !== payout.recipientCode) {
                        return res.status(400).json({ status: "fail", message: "Transfer recipient does not match payout reference" });
                    }
                    const transferStatus = event.replace('transfer.', '');
                    const updatedPayout = await applyTransferUpdate(data.reference, { ...data, status: transferStatus });
                    await logActivity({
                        userId: payout.initiatedBy,
                        userName: "Paystack",
                        userRole: "admin",
                        action: `payout_${updatedPayout.status}`,
                        resourceType: "user",
                        resourceId: payout.userId.toString(),
                        path: '/admin/payments/webhook',
                        method: 'POST',
                        statusCode: 200,
                        metadata: { reference: data.reference, event, amount: payout.amount, currency: payout.currency },
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
