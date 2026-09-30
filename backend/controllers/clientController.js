import Report from "../models/Report.js";
import AppError from "../errors/AppError.js";

export const getClientDashboard = async (req, res, next) => {
    try {
        // Get all reports with pagination
        const { page = 1, limit = 50, email, startDate, endDate } = req.query;

        const filter = {};
        if (email) filter.email = email.toLowerCase();
        if (startDate || endDate) {
            filter.date = {};
            if (startDate) filter.date.$gte = new Date(startDate);
            if (endDate) filter.date.$lte = new Date(endDate);
        }

        const skip = (Number(page) - 1) * Number(limit);

        const reports = await Report.find(filter)
            .sort({ date: -1, createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));

        const total = await Report.countDocuments(filter);

        // Calculate summary stats
        const totalHours = reports.reduce((sum, r) => sum + (Number(r.hoursWorked) || 0), 0);
        const totalTasks = reports.reduce((sum, r) => sum + (Number(r.tasksWorked) || 0), 0);
        const uniqueEmails = [...new Set(reports.map(r => r.email))];
        const uniqueRaters = [...new Set(reports.map(r => r.raterName))];

        // Get stats by email
        const emailStats = await Report.aggregate([
            { $match: filter },
            {
                $group: {
                    _id: "$email",
                    totalHours: { $sum: { $toDouble: "$hoursWorked" } },
                    totalTasks: { $sum: { $toInt: "$tasksWorked" } },
                    totalReports: { $sum: 1 },
                    totalLatePenalty: { $sum: "$latePenalty" },
                    raters: { $addToSet: "$raterName" },
                    categories: { $addToSet: "$category" },
                    proxies: { $addToSet: "$proxy" },
                    firstDate: { $min: "$date" },
                    lastDate: { $max: "$date" },
                    statuses: { $push: "$status" }
                }
            },
            {
                $project: {
                    email: "$_id",
                    totalHours: { $round: ["$totalHours", 2] },
                    totalTasks: 1,
                    totalReports: 1,
                    totalLatePenalty: 1,
                    raters: 1,
                    categories: 1,
                    proxies: 1,
                    firstDate: 1,
                    lastDate: 1,
                    activeCount: {
                        $size: {
                            $filter: { input: "$statuses", cond: { $eq: ["$$this", "Active"] } }
                        }
                    },
                    restrictedCount: {
                        $size: {
                            $filter: { input: "$statuses", cond: { $eq: ["$$this", "Restricted"] } }
                        }
                    },
                    sackedCount: {
                        $size: {
                            $filter: { input: "$statuses", cond: { $eq: ["$$this", "Sacked"] } }
                        }
                    },
                    paidCount: {
                        $size: {
                            $filter: { input: "$statuses", cond: { $eq: ["$$this", "Paid"] } }
                        }
                    },
                    _id: 0
                }
            },
            { $sort: { totalHours: -1 } }
        ]);

        // Get stats by rater
        const raterStats = await Report.aggregate([
            { $match: filter },
            {
                $group: {
                    _id: "$raterName",
                    totalHours: { $sum: { $toDouble: "$hoursWorked" } },
                    totalTasks: { $sum: { $toInt: "$tasksWorked" } },
                    totalReports: { $sum: 1 },
                    totalLatePenalty: { $sum: "$latePenalty" },
                    emails: { $addToSet: "$email" },
                    categories: { $addToSet: "$category" },
                    firstDate: { $min: "$date" },
                    lastDate: { $max: "$date" },
                }
            },
            {
                $project: {
                    raterName: "$_id",
                    totalHours: { $round: ["$totalHours", 2] },
                    totalTasks: 1,
                    totalReports: 1,
                    totalLatePenalty: 1,
                    emails: 1,
                    categories: 1,
                    firstDate: 1,
                    lastDate: 1,
                    _id: 0
                }
            },
            { $sort: { totalHours: -1 } }
        ]);

        res.status(200).json({
            status: "success",
            message: "Client dashboard data retrieved successfully",
            data: {
                reports,
                summary: {
                    totalHours: Number(totalHours.toFixed(2)),
                    totalTasks,
                    totalReports: reports.length,
                    uniqueEmails: uniqueEmails.length,
                    uniqueRaters: uniqueRaters.length,
                },
                emailStats,
                raterStats,
                pagination: {
                    currentPage: Number(page),
                    totalPages: Math.ceil(total / Number(limit)),
                    totalItems: total,
                    itemsPerPage: Number(limit),
                }
            },
        });
    } catch (err) {
        next(err);
    }
};

export const getReportsByEmail = async (req, res, next) => {
    try {
        const { email } = req.params;
        const { page = 1, limit = 50, startDate, endDate, status } = req.query;

        const filter = { email: email.toLowerCase(), isDeleted: { $ne: true } };
        if (status) filter.status = status;
        if (startDate || endDate) {
            filter.date = {};
            if (startDate) filter.date.$gte = new Date(startDate);
            if (endDate) filter.date.$lte = new Date(endDate);
        }

        const skip = (Number(page) - 1) * Number(limit);

        const reports = await Report.find(filter)
            .sort({ date: -1, createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));

        const total = await Report.countDocuments(filter);

        // Calculate summary for this email
        const summary = await Report.aggregate([
            { $match: { email: email.toLowerCase(), isDeleted: { $ne: true } } },
            {
                $group: {
                    _id: null,
                    totalHours: { $sum: { $toDouble: "$hoursWorked" } },
                    totalTasks: { $sum: { $toInt: "$tasksWorked" } },
                    totalReports: { $sum: 1 },
                    totalLatePenalty: { $sum: "$latePenalty" },
                    raters: { $addToSet: "$raterName" },
                    categories: { $addToSet: "$category" },
                    proxies: { $addToSet: "$proxy" },
                    statuses: { $push: "$status" },
                    firstDate: { $min: "$date" },
                    lastDate: { $max: "$date" },
                }
            },
            {
                $project: {
                    totalHours: { $round: ["$totalHours", 2] },
                    totalTasks: 1,
                    totalReports: 1,
                    totalLatePenalty: 1,
                    raters: 1,
                    categories: 1,
                    proxies: 1,
                    firstDate: 1,
                    lastDate: 1,
                    activeCount: {
                        $size: {
                            $filter: { input: "$statuses", cond: { $eq: ["$$this", "Active"] } }
                        }
                    },
                    restrictedCount: {
                        $size: {
                            $filter: { input: "$statuses", cond: { $eq: ["$$this", "Restricted"] } }
                        }
                    },
                    sackedCount: {
                        $size: {
                            $filter: { input: "$statuses", cond: { $eq: ["$$this", "Sacked"] } }
                        }
                    },
                    paidCount: {
                        $size: {
                            $filter: { input: "$statuses", cond: { $eq: ["$$this", "Paid"] } }
                        }
                    },
                    _id: 0
                }
            }
        ]);

        res.status(200).json({
            status: "success",
            message: `Reports for ${email} retrieved successfully`,
            data: {
                reports,
                summary: summary[0] || {
                    totalHours: 0,
                    totalTasks: 0,
                    totalReports: 0,
                    totalLatePenalty: 0,
                    raters: [],
                    categories: [],
                    proxies: [],
                    firstDate: null,
                    lastDate: null,
                    activeCount: 0,
                    restrictedCount: 0,
                    sackedCount: 0,
                    paidCount: 0,
                },
                pagination: {
                    currentPage: Number(page),
                    totalPages: Math.ceil(total / Number(limit)),
                    totalItems: total,
                    itemsPerPage: Number(limit),
                }
            },
        });
    } catch (err) {
        next(err);
    }
};

export const getClientSummary = async (req, res, next) => {
    try {
        // Overall summary stats for client dashboard
        const overallStats = await Report.aggregate([
            { $match: { isDeleted: { $ne: true } } },
            {
                $group: {
                    _id: null,
                    totalReports: { $sum: 1 },
                    totalHours: { $sum: { $toDouble: "$hoursWorked" } },
                    totalTasks: { $sum: { $toInt: "$tasksWorked" } },
                    totalLatePenalty: { $sum: "$latePenalty" },
                    uniqueEmails: { $addToSet: "$email" },
                    uniqueRaters: { $addToSet: "$raterName" },
                    categories: { $addToSet: "$category" },
                }
            },
            {
                $project: {
                    totalReports: 1,
                    totalHours: { $round: ["$totalHours", 2] },
                    totalTasks: 1,
                    totalLatePenalty: 1,
                    uniqueEmailsCount: { $size: "$uniqueEmails" },
                    uniqueRatersCount: { $size: "$uniqueRaters" },
                    categories: 1,
                    _id: 0
                }
            }
        ]);

        // Status breakdown
        const statusBreakdown = await Report.aggregate([
            { $match: { isDeleted: { $ne: true } } },
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 },
                    totalHours: { $sum: { $toDouble: "$hoursWorked" } }
                }
            },
            {
                $project: {
                    status: "$_id",
                    count: 1,
                    totalHours: { $round: ["$totalHours", 2] },
                    _id: 0
                }
            }
        ]);

        // Monthly trend (last 6 months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const monthlyTrend = await Report.aggregate([
            { $match: { date: { $gte: sixMonthsAgo, isDeleted: { $ne: true } } } },
            {
                $group: {
                    _id: {
                        year: { $year: "$date" },
                        month: { $month: "$date" }
                    },
                    totalHours: { $sum: { $toDouble: "$hoursWorked" } },
                    totalReports: { $sum: 1 },
                    uniqueEmails: { $addToSet: "$email" }
                }
            },
            {
                $project: {
                    year: "$_id.year",
                    month: "$_id.month",
                    totalHours: { $round: ["$totalHours", 2] },
                    totalReports: 1,
                    uniqueEmailsCount: { $size: "$uniqueEmails" },
                    _id: 0
                }
            },
            { $sort: { year: 1, month: 1 } }
        ]);

        res.status(200).json({
            status: "success",
            message: "Client summary retrieved successfully",
            data: {
                overview: overallStats[0] || {
                    totalReports: 0,
                    totalHours: 0,
                    totalTasks: 0,
                    totalLatePenalty: 0,
                    uniqueEmailsCount: 0,
                    uniqueRatersCount: 0,
                    categories: []
                },
                statusBreakdown,
                monthlyTrend
            }
        });
    } catch (err) {
        next(err);
    }
};

export const searchRaters = async (req, res, next) => {
    try {
        const { q } = req.query;
        if (!q || q.length < 2) {
            return res.status(200).json({
                status: "success",
                message: "Query too short",
                data: []
            });
        }

        // Search in raterName and email fields
        const raters = await Report.aggregate([
            {
                $match: {
                    $or: [
                        { raterName: { $regex: q, $options: "i" } },
                        { email: { $regex: q, $options: "i" } }
                    ]
                }
            },
            {
                $group: {
                    _id: "$email",
                    raterNames: { $addToSet: "$raterName" },
                    totalReports: { $sum: 1 },
                    totalHours: { $sum: { $toDouble: "$hoursWorked" } },
                    lastActivity: { $max: "$date" }
                }
            },
            {
                $project: {
                    email: "$_id",
                    raterNames: 1,
                    totalReports: 1,
                    totalHours: { $round: ["$totalHours", 2] },
                    lastActivity: 1,
                    _id: 0
                }
            },
            { $limit: 20 }
        ]);

        res.status(200).json({
            status: "success",
            message: "Search results retrieved",
            data: raters
        });
    } catch (err) {
        next(err);
    }
};