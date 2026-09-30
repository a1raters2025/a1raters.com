import express from "express";
import auth from "../middlewares/auth.js";
import admin from "../middlewares/adminMiddleware.js";
import { ActivityLog, logActivity } from "../models/activityLog.js";
import { User } from "../models/userSchema.js";

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

        const [loginsToday, failedLoginsToday, activeUsers, totalReports, totalUsers, recentLogs] = await Promise.all([
            ActivityLog.countDocuments({ action: "login", createdAt: { $gte: dayStart } }),
            ActivityLog.countDocuments({ action: "login_failed", createdAt: { $gte: dayStart } }),
            User.countDocuments({ lastSeenAt: { $gte: weekStart } }),
            ActivityLog.countDocuments({ action: "create_report" }),
            User.countDocuments({}),
            ActivityLog.find({})
                .sort("-createdAt")
                .limit(20)
                .select("action userName userRole createdAt path statusCode metadata"),
        ]);

        res.status(200).json({
            status: "success",
            data: {
                stats: {
                    loginsToday,
                    failedLoginsToday,
                    activeUsersLast7d: activeUsers,
                    totalReports,
                    totalUsers,
                },
                recentActivity: recentLogs,
            },
        });
    })
);

Router.get(
    "/settings",
    auth,
    admin,
    asyncHandler(async (req, res) => {
        const defaultSettings = {
            siteName: "A1 Raters",
            fromEmail: process.env.SMTP_FROM || "noreply@a1raters.com",
            siteDescription: "Professional AI rating platform",
            allowRegistration: true,
            requireEmailVerification: true,
            requireAdminApproval: true,
            maintenanceMode: false,
            sessionTimeout: 480,
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
            "maintenanceMode",
            "sessionTimeout",
            "siteName",
            "siteDescription",
            "fromEmail",
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
            data: { changedFields },
        });
    })
);

export default Router;
