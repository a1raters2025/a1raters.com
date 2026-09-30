import { logActivity } from "../models/activityLog.js";

const SKIP_LOGGING_PATHS = new Set([
    "/api/v1/health",
    "/api/v1/user/refresh-token",
]);

const activityLogger = (req, res, next) => {
    const start = Date.now();

    res.on("finish", () => {
        if (SKIP_LOGGING_PATHS.has(req.path) || req.path.startsWith("/api/v1/files")) {
            return;
        }

        const user = req.user;
        const userName = user?.userName || user?.username || user?.email || "anonymous";
        const userRole = user?.role;
        const userId = user?._id;

        let action = "api_request";
        const method = req.method;
        const path = req.path;
        const statusCode = res.statusCode;

        const lowerPath = path.toLowerCase();
        const lowerMethod = method.toLowerCase();

        if (lowerPath === "/api/v1/user/login" && lowerMethod === "post") action = "login";
        else if (lowerPath === "/api/v1/user/logout" && lowerMethod === "post") action = "logout";
        else if (lowerPath === "/api/v1/user/register" && lowerMethod === "post") action = "account_registered";
        else if (lowerPath === "/api/v1/user/google" && lowerMethod === "post") action = "login";
        else if (lowerPath.startsWith("/api/v1/user/") && lowerPath.includes("/approval") && lowerMethod === "patch") action = "account_approved";
        else if (lowerPath === "/api/v1/user/profile" && lowerMethod === "get") action = "view_page";
        else if (lowerPath.startsWith("/api/v1/reports") && lowerMethod === "post") { action = "create_report"; }
        else if (lowerPath.startsWith("/api/v1/reports") && lowerMethod === "patch") { action = "update_report"; }
        else if (lowerPath.startsWith("/api/v1/reports") && lowerMethod === "delete") { action = "delete_report"; }
        else if (lowerPath.startsWith("/api/v1/invoices") && lowerMethod === "post") { action = "submit_invoice"; }
        else if (lowerPath.startsWith("/api/v1/test-history") && lowerMethod === "post") { action = "take_test"; }
        else if (lowerPath.startsWith("/api/v1/files") && lowerMethod === "post") { action = "upload_file"; }

        void logActivity({
            userId: userId || undefined,
            userName,
            userRole,
            action,
            resourceType: lowerPath.split("/")[4] || "system",
            ipAddress: req.ip || req.socket?.remoteAddress || undefined,
            userAgent: req.get("user-agent") || undefined,
            path,
            method,
            statusCode,
            durationMs: Date.now() - start,
            metadata: {
                originalUrl: req.originalUrl,
                ...(statusCode >= 400 ? { error: true } : {}),
            },
        }).catch(() => { /* logging failures must never block responses */ });
    });

    next();
};

export default activityLogger;
