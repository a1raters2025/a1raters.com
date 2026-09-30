import mongoose from "mongoose";

const activityLogSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: false,
            index: true,
        },
        userName: {
            type: String,
            required: false,
        },
        userRole: {
            type: String,
            enum: ["admin", "user", "client"],
            required: false,
        },
        action: {
            type: String,
            enum: [
                "login",
                "login_failed",
                "logout",
                "password_changed",
                "email_verified",
                "account_approved",
                "account_rejected",
                "account_suspended",
                "account_deleted",
                "account_updated",
                "view_page",
                "create_report",
                "update_report",
                "delete_report",
                "resubmit_report",
                "submit_invoice",
                "take_test",
                "upload_file",
                "role_changed",
                "token_refreshed",
                "admin_registered",
                "api_request",
            ],
            required: true,
        },
        resourceType: {
            type: String,
            enum: ["user", "report", "invoice", "task", "test", "file", "settings", "session", "system", "auth"],
            required: false,
        },
        resourceId: {
            type: String,
            required: false,
        },
        ipAddress: {
            type: String,
            required: false,
        },
        userAgent: {
            type: String,
            required: false,
        },
        path: {
            type: String,
            required: false,
        },
        method: {
            type: String,
            required: false,
        },
        statusCode: {
            type: Number,
            required: false,
        },
        durationMs: {
            type: Number,
            required: false,
        },
        metadata: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },
    },
    {
        timestamps: true,
        timeseries: {
            timeField: "createdAt",
            metaField: "metadata",
        },
    }
);

activityLogSchema.index({ userId: 1, createdAt: -1 });
activityLogSchema.index({ action: 1, createdAt: -1 });
activityLogSchema.index({ ipAddress: 1, createdAt: -1 });
activityLogSchema.index({ userRole: 1, createdAt: -1 });
activityLogSchema.index({ "metadata.targetUserId": 1, createdAt: -1 });

export const ActivityLog = mongoose.model("ActivityLog", activityLogSchema);

export const logActivity = async (entry) => {
    try {
        const log = new ActivityLog(entry);
        await log.save();
    } catch (err) {
        console.error("Failed to write activity log:", err);
    }
};

export default ActivityLog;
