import Report from "../models/Report.js";
import AuditLog from "../models/AuditLog.js";
import AppError from "../errors/AppError.js";

const LATE_SUBMISSION_DEADLINE_HOUR = 9;
const LATE_SUBMISSION_DEADLINE_MINUTE = 0;

const createAuditEntry = async ({
  actionType,
  reportId,
  fieldName,
  oldValue,
  newValue,
  userId,
  userName,
  ipAddress = "",
  reason = "",
}) => {
  try {
    await AuditLog.create({
      actionType,
      reportId,
      fieldName,
      oldValue,
      newValue,
      changedBy: userId,
      changedByName: userName,
      ipAddress,
      reason,
    });
  } catch (logErr) {
    console.error("Failed to create audit log entry:", logErr);
  }
};

const isLateSubmission = (submissionTime) => {
  if (!submissionTime) return false;
  const d = new Date(submissionTime);
  const hour = d.getHours();
  const minute = d.getMinutes();
  if (hour > LATE_SUBMISSION_DEADLINE_HOUR) return true;
  if (hour === LATE_SUBMISSION_DEADLINE_HOUR && minute > LATE_SUBMISSION_DEADLINE_MINUTE) return true;
  return false;
};

export const createReport = async (req, res, next) => {
  try {
    const reportData = {
      ...req.body,
      submittedBy: req.user._id,
      submissionTime: req.body.submissionTime || new Date(),
    };

    const penalty = isLateSubmission(reportData.submissionTime) ? 10000 : 0;
    reportData.latePenalty = penalty;

    const report = await Report.create(reportData);

    if (penalty > 0) {
      await createAuditEntry({
        actionType: "penalty_applied",
        reportId: report._id,
        fieldName: "latePenalty",
        oldValue: 0,
        newValue: penalty,
        userId: req.user._id,
        userName: req.user.userName,
        ipAddress: req.ip,
        reason: "Late submission after 9:00 AM deadline",
      });
    }

    res.status(201).json({
      status: "success",
      message: "Report submitted successfully",
      data: report,
    });
  } catch (err) {
    next(err);
  }
};

export const bulkCreateReports = async (req, res, next) => {
  try {
    const reports = req.body.reports.map((report) => {
      const submissionTime = report.submissionTime || new Date();
      const penalty = isLateSubmission(submissionTime) ? 10000 : 0;
      return {
        ...report,
        submittedBy: req.user._id,
        submissionTime,
        latePenalty: penalty,
      };
    });

    const createdReports = await Report.insertMany(reports);

    createdReports.forEach((report) => {
      if (report.latePenalty > 0) {
        void createAuditEntry({
          actionType: "penalty_applied",
          reportId: report._id,
          fieldName: "latePenalty",
          oldValue: 0,
          newValue: report.latePenalty,
          userId: req.user._id,
          userName: req.user.userName,
          ipAddress: req.ip,
          reason: "Late submission after 9:00 AM deadline",
        });
      }
    });

    res.status(201).json({
      status: "success",
      message: `${createdReports.length} reports submitted successfully`,
      data: createdReports,
    });
  } catch (err) {
    next(err);
  }
};

export const getAllReports = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, email, raterName, status, startDate, endDate, category } = req.query;

    const filter = { isDeleted: { $ne: true } };
    if (email) filter.email = email.toLowerCase();
    if (raterName) filter.raterName = raterName;
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const skip = (Number(page) - 1) * Number(limit);

    const reports = await Report.find(filter)
      .populate("submittedBy", "userName email")
      .populate("approvedBy", "userName email")
      .populate("originalReportId")
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Report.countDocuments(filter);

    res.status(200).json({
      status: "success",
      message: "Reports retrieved successfully",
      data: reports,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        totalItems: total,
        itemsPerPage: Number(limit),
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getReportById = async (req, res, next) => {
  try {
    const report = await Report.findById(req.params.id)
      .populate("submittedBy", "userName email")
      .populate("approvedBy", "userName email")
      .populate("originalReportId");

    if (!report) {
      return next(new AppError("Report not found", 404));
    }

    res.status(200).json({
      status: "success",
      message: "Report retrieved successfully",
      data: report,
    });
  } catch (err) {
    next(err);
  }
};

export const getReportsByEmail = async (req, res, next) => {
  try {
    const { email } = req.params;
    const { startDate, endDate, status } = req.query;

    const filter = { email: email.toLowerCase(), isDeleted: { $ne: true } };
    if (status) filter.status = status;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const reports = await Report.find(filter).sort({ date: -1, createdAt: -1 });

    res.status(200).json({
      status: "success",
      message: "Reports retrieved successfully",
      data: reports,
    });
  } catch (err) {
    next(err);
  }
};

export const getReportsByRater = async (req, res, next) => {
  try {
    const { raterName } = req.params;
    const { startDate, endDate, status } = req.query;

    const filter = { raterName, isDeleted: { $ne: true } };
    if (status) filter.status = status;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const reports = await Report.find(filter)
      .populate("submittedBy", "userName email")
      .sort({ date: -1, createdAt: -1 });

    res.status(200).json({
      status: "success",
      message: "Reports retrieved successfully",
      data: reports,
    });
  } catch (err) {
    next(err);
  }
};

export const getMyReports = async (req, res, next) => {
  try {
    const { startDate, endDate, status } = req.query;

    const filter = { submittedBy: req.user._id, isDeleted: { $ne: true } };
    if (status) filter.status = status;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const reports = await Report.find(filter)
      .populate("approvedBy", "userName email")
      .populate("originalReportId")
      .sort({ date: -1, createdAt: -1 });

    res.status(200).json({
      status: "success",
      message: "Your reports retrieved successfully",
      data: reports,
    });
  } catch (err) {
    next(err);
  }
};

const ALLOWED_EDIT_FIELDS = [
  "tasksWorked",
  "hoursWorked",
  "category",
  "proxy",
  "status",
  "date",
  "profileName",
  "email",
  "description",
  "raterName",
];

export const updateReport = async (req, res, next) => {
  try {
    const report = await Report.findById(req.params.id);

    if (!report) {
      return next(new AppError("Report not found", 404));
    }

    const changes = [];

    for (const key of ALLOWED_EDIT_FIELDS) {
      if (req.body.hasOwnProperty(key)) {
        const oldValue = report[key];
        const newValue = req.body[key];
        if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
          changes.push({ fieldName: key, oldValue, newValue });
          report[key] = newValue;
        }
      }
    }

    if (changes.length > 0) {
      await report.save();

      for (const change of changes) {
        await createAuditEntry({
          actionType: "update",
          reportId: report._id,
          fieldName: change.fieldName,
          oldValue: change.oldValue,
          newValue: change.newValue,
          userId: req.user._id,
          userName: req.user.userName,
          ipAddress: req.ip,
          reason: req.body.reason || "",
        });
      }
    }

    const populated = await report.populate("submittedBy", "userName email").populate("approvedBy", "userName email").execPopulate?.() || report;

    res.status(200).json({
      status: "success",
      message: "Report updated successfully",
      data: report,
    });
  } catch (err) {
    next(err);
  }
};

export const updateReportStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const validStatuses = ["Active", "Restricted", "Sacked", "Paid"];

    if (!validStatuses.includes(status)) {
      return next(new AppError("Invalid status", 400));
    }

    const report = await Report.findById(req.params.id);

    if (!report) {
      return next(new AppError("Report not found", 404));
    }

    const oldStatus = report.status;
    report.status = status;
    report.approvedBy = req.user._id;
    report.approvedAt = new Date();
    await report.save();

    if (oldStatus !== status) {
      await createAuditEntry({
        actionType: "status_change",
        reportId: report._id,
        fieldName: "status",
        oldValue: oldStatus,
        newValue: status,
        userId: req.user._id,
        userName: req.user.userName,
        ipAddress: req.ip,
        reason: `Status changed to ${status}`,
      });
    }

    res.status(200).json({
      status: "success",
      message: `Report status updated to ${status}`,
      data: report,
    });
  } catch (err) {
    next(err);
  }
};

export const deleteReport = async (req, res, next) => {
  try {
    const report = await Report.findById(req.params.id);

    if (!report) {
      return next(new AppError("Report not found", 404));
    }

    const isOwner = report.submittedBy && req.user && report.submittedBy.toString() === req.user._id.toString();
    const isAdmin = req.user && req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return next(new AppError("You can only delete your own reports", 403));
    }

    const oldData = report.toObject();

    if (isAdmin || !req.query.hardDelete) {
      report.isDeleted = true;
      report.deletedAt = new Date();
      report.deletedBy = req.user._id;
      await report.save();

      await createAuditEntry({
        actionType: "delete",
        reportId: report._id,
        fieldName: "isDeleted",
        oldValue: false,
        newValue: true,
        userId: req.user._id,
        userName: req.user.userName,
        ipAddress: req.ip,
        reason: req.body.reason || "",
      });

      if (report.originalReportId) {
        await createAuditEntry({
          actionType: "resubmit",
          reportId: report._id,
          fieldName: "deletedAndResubmitted",
          oldValue: null,
          newValue: true,
          userId: req.user._id,
          userName: req.user.userName,
          ipAddress: req.ip,
          reason: req.body.reason || "",
        });
      }

      return res.status(200).json({
        status: "success",
        message: "Report deleted successfully (soft delete with audit record)",
        data: report,
      });
    }

    await Report.findByIdAndDelete(req.params.id);

    await createAuditEntry({
      actionType: "delete",
      reportId: report._id,
      fieldName: "deleted",
      oldValue: oldData,
      newValue: null,
      userId: req.user._id,
      userName: req.user.userName,
      ipAddress: req.ip,
      reason: req.body.reason || "",
    });

    res.status(200).json({
      status: "success",
      message: "Report deleted successfully",
    });
  } catch (err) {
    next(err);
  }
};

export const getDeletedReports = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, raterName, startDate, endDate } = req.query;

    const filter = { isDeleted: true };
    if (raterName) filter.raterName = raterName;
    if (startDate || endDate) {
      filter.deletedAt = {};
      if (startDate) filter.deletedAt.$gte = new Date(startDate);
      if (endDate) filter.deletedAt.$lte = new Date(endDate);
    }

    const skip = (Number(page) - 1) * Number(limit);

    const reports = await Report.find(filter)
      .populate("submittedBy", "userName email")
      .populate("deletedBy", "userName email")
      .populate("originalReportId")
      .sort({ deletedAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Report.countDocuments(filter);

    res.status(200).json({
      status: "success",
      message: "Deleted reports retrieved successfully",
      data: reports,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        totalItems: total,
        itemsPerPage: Number(limit),
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getReportAuditLog = async (req, res, next) => {
  try {
    const { reportId } = req.params;

    if (!reportId || reportId === 'all') {
      const { page = 1, limit = 50, actionType, raterName } = req.query;
      const filter = {};
      if (actionType) filter.actionType = actionType;
      if (raterName) filter.changedByName = raterName;

      const skip = (Number(page) - 1) * Number(limit);

      const logs = await AuditLog.find(filter)
        .populate("reportId", "raterName email category date")
        .populate("changedBy", "userName email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit));

      const total = await AuditLog.countDocuments(filter);

      return res.status(200).json({
        status: "success",
        message: "Audit log retrieved successfully",
        data: logs,
        pagination: {
          currentPage: Number(page),
          totalPages: Math.ceil(total / Number(limit)),
          totalItems: total,
          itemsPerPage: Number(limit),
        },
      });
    }

    const logs = await AuditLog.find({ reportId })
      .populate("changedBy", "userName email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: "success",
      message: "Audit log retrieved successfully",
      data: logs,
    });
  } catch (err) {
    next(err);
  }
};

export const getAccountSummary = async (req, res, next) => {
  try {
    const pipeline = [
      { $match: { isDeleted: { $ne: true } } },
      {
        $group: {
          _id: "$email",
          hasRestricted: { $max: { $cond: [{ $eq: ["$status", "Restricted"] }, true, false] } },
          hasSacked: { $max: { $cond: [{ $eq: ["$status", "Sacked"] }, true, false] } },
          lastActivity: { $max: "$date" },
        },
      },
      {
        $project: {
          email: "$_id",
          hasRestricted: 1,
          hasSacked: 1,
          lastActivity: 1,
          _id: 0,
        },
      },
    ];

    const summary = await Report.aggregate(pipeline);

    res.status(200).json({
      status: "success",
      message: "Account summary retrieved successfully",
      data: summary,
    });
  } catch (err) {
    next(err);
  }
};

export const getMonthlyStats = async (req, res, next) => {
  try {
    const { month, year } = req.query;
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const pipeline = [
      {
        $match: {
          date: { $gte: startDate, $lte: endDate },
          isDeleted: { $ne: true },
          status: { $ne: "Paid" },
        },
      },
      {
        $group: {
          _id: "$raterName",
          totalHours: { $sum: { $toDouble: "$hoursWorked" } },
          totalTasks: { $sum: { $toInt: "$tasksWorked" } },
          totalLatePenalty: { $sum: "$latePenalty" },
          reports: { $push: "$$ROOT" },
        },
      },
    ];

    const stats = await Report.aggregate(pipeline);

    res.status(200).json({
      status: "success",
      message: "Monthly stats retrieved successfully",
      data: stats,
    });
  } catch (err) {
    next(err);
  }
};

export const getRaterPerformance = async (req, res, next) => {
  try {
    const { raterName } = req.params;
    const { startDate, endDate } = req.query;

    const filter = { raterName, isDeleted: { $ne: true } };
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const pipeline = [
      { $match: filter },
      {
        $group: {
          _id: "$email",
          totalHours: { $sum: { $toDouble: "$hoursWorked" } },
          totalTasks: { $sum: { $toInt: "$tasksWorked" } },
          totalReports: { $sum: 1 },
          categories: { $addToSet: "$category" },
          proxies: { $addToSet: "$proxy" },
          totalLatePenalty: { $sum: "$latePenalty" },
          firstDate: { $min: "$date" },
          lastDate: { $max: "$date" },
        },
      },
      {
        $project: {
          email: "$_id",
          totalHours: { $round: ["$totalHours", 2] },
          totalTasks: 1,
          totalReports: 1,
          categories: 1,
          proxies: 1,
          totalLatePenalty: 1,
          firstDate: 1,
          lastDate: 1,
          _id: 0,
        }
      },
    ];

    const stats = await Report.aggregate(pipeline);

    const overallPipeline = [
      { $match: filter },
      {
        $group: {
          _id: null,
          totalHours: { $sum: { $toDouble: "$hoursWorked" } },
          totalTasks: { $sum: { $toInt: "$tasksWorked" } },
          totalReports: { $sum: 1 },
          totalLatePenalty: { $sum: "$latePenalty" },
        }
      },
    ];

    const overall = await Report.aggregate(overallPipeline);

    res.status(200).json({
      status: "success",
      message: "Rater performance retrieved successfully",
      data: {
        byEmail: stats,
        overall: overall[0] || {
          totalHours: 0,
          totalTasks: 0,
          totalReports: 0,
          totalLatePenalty: 0,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};
