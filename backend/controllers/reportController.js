import Report from "../models/Report.js";
import AuditLog from "../models/AuditLog.js";
import Invoice from "../models/Invoice.js";
import { User } from "../models/userSchema.js";
import AppError from "../errors/AppError.js";
import { emitAdminUpdate } from "../utils/socket.js";

const LATE_DEADLINE_UTC_HOUR = 9;
const LATE_PENALTY_AMOUNT = 10000;

const getOwnedReportFilter = async (user) => {
  const ownership = [{ submittedBy: user._id }];
  if (user.userName && await User.countDocuments({ userName: user.userName, role: "user" }) === 1) {
    ownership.push({ submittedBy: { $in: [null] }, raterName: user.userName });
  }
  return { $or: ownership };
};

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

const getTaskDateParts = (taskDate) => {
  if (typeof taskDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(taskDate)) {
    const [year, month, day] = taskDate.split("-").map(Number);
    return { year, month, day };
  }
  const date = new Date(taskDate);
  if (Number.isNaN(date.getTime())) return null;
  // Report dates stored as timestamps should be interpreted in the application's
  // business timezone, so midnight in Lagos does not shift to the previous UTC day.
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
  };
};

const isLateSubmission = (submissionTime, taskDate) => {
  const submittedAt = new Date(submissionTime);
  const taskDay = getTaskDateParts(taskDate);
  if (Number.isNaN(submittedAt.getTime()) || !taskDay) return false;

  // The 10:00 AM Africa/Lagos deadline is 09:00 UTC.
  const deadline = Date.UTC(taskDay.year, taskDay.month - 1, taskDay.day + 1, LATE_DEADLINE_UTC_HOUR);
  return submittedAt.getTime() > deadline;
};

export const createReport = async (req, res, next) => {
  try {
    const reportData = {
      ...req.body,
      submittedBy: req.user._id,
      submissionTime: new Date(),
      reviewStatus: "pending",
      reviewNote: "",
    };

    const penalty = isLateSubmission(reportData.submissionTime, reportData.date) ? LATE_PENALTY_AMOUNT : 0;
    reportData.latePenalty = penalty;

    const report = await Report.create(reportData);
    emitAdminUpdate({
      title: "New report submitted",
      message: `${report.raterName} submitted a ${report.category} report for review.`,
      type: "info",
      targetRoles: ["admin"],
    });

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
        reason: "Late submission after 10:00 AM deadline",
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
    if (!Array.isArray(req.body?.reports) || req.body.reports.length === 0) {
      return res.status(400).json({ status: "fail", message: "At least one report is required" });
    }

    const submittedAt = new Date();
    const reports = req.body.reports.map((report) => {
      const penalty = isLateSubmission(submittedAt, report.date) ? LATE_PENALTY_AMOUNT : 0;
      return {
        ...report,
        submittedBy: req.user._id,
        submissionTime: submittedAt,
        latePenalty: penalty,
        reviewStatus: "pending",
        reviewNote: "",
      };
    });

    if (reports.some((report) => typeof report.submissionId !== "string" || !report.submissionId.trim())) {
      return res.status(400).json({ status: "fail", message: "Each report must include a submission ID" });
    }
    const submissionIds = reports.map((report) => report.submissionId);
    if (new Set(submissionIds).size !== submissionIds.length) {
      return res.status(400).json({ status: "fail", message: "Each report must have a unique submission ID" });
    }
    await Promise.all(reports.map((report) => new Report(report).validate()));

    let writeResult;
    try {
      writeResult = await Report.bulkWrite(reports.map((report) => ({
        updateOne: {
          filter: { submissionId: report.submissionId },
          update: { $setOnInsert: report },
          upsert: true,
        },
      })), { ordered: true });
    } catch (error) {
      if (error.code !== 11000) throw error;
    }

    const submittedReports = await Report.find({
      submissionId: { $in: submissionIds },
    });
    const insertedIndexes = new Set(
      Object.keys(writeResult?.upsertedIds || {}).map(Number),
    );

    submittedReports.forEach((report) => {
      const reportIndex = reports.findIndex((entry) => entry.submissionId === report.submissionId);
      if (insertedIndexes.has(reportIndex) && report.latePenalty > 0) {
        void createAuditEntry({
          actionType: "penalty_applied",
          reportId: report._id,
          fieldName: "latePenalty",
          oldValue: 0,
          newValue: report.latePenalty,
          userId: req.user._id,
          userName: req.user.userName,
          ipAddress: req.ip,
          reason: "Late submission after 10:00 AM deadline",
        });
      }
    });

    emitAdminUpdate({
      title: "New reports submitted",
      message: `${submittedReports.length} report(s) were submitted for review.`,
      type: "info",
      targetRoles: ["admin"],
    });

    res.status(201).json({
      status: "success",
      message: `${submittedReports.length} reports submitted successfully`,
      data: submittedReports,
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

export const getAdminReportReviews = async (req, res, next) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 50));
    const filter = { isDeleted: { $ne: true } };

    if (req.query.category && req.query.category !== "all") {
      filter.category = req.query.category;
    }
    if (req.query.reviewStatus && req.query.reviewStatus !== "all") {
      if (req.query.reviewStatus === "pending") {
        filter.$or = [
          { reviewStatus: "pending" },
          { reviewStatus: { $exists: false } },
        ];
      } else {
        filter.reviewStatus = req.query.reviewStatus;
      }
    }
    if (req.query.raterName) {
      filter.raterName = { $regex: String(req.query.raterName).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
    }

    const [reports, total] = await Promise.all([
      Report.find(filter)
        .populate("submittedBy", "userName email")
        .populate("approvedBy", "userName email")
        .sort({ submissionTime: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Report.countDocuments(filter),
    ]);

    res.status(200).json({
      status: "success",
      message: "Rater report reviews retrieved successfully",
      data: reports,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const updateReportReviewStatus = async (req, res, next) => {
  try {
    const { reviewStatus, reviewNote = "" } = req.body;
    if (!["approved", "rejected"].includes(reviewStatus)) {
      return next(new AppError("Review status must be approved or rejected", 400));
    }
    if (typeof reviewNote !== "string" || reviewNote.length > 1000) {
      return next(new AppError("Review note must be 1000 characters or fewer", 400));
    }
    if (reviewStatus === "rejected" && !reviewNote.trim()) {
      return next(new AppError("A reason is required when rejecting a report", 400));
    }

    const report = await Report.findOne({ _id: req.params.id, isDeleted: { $ne: true } });
    if (!report) {
      return next(new AppError("Report not found", 404));
    }

    const oldReviewStatus = report.reviewStatus || "pending";
    const oldReviewNote = report.reviewNote || "";
    report.reviewStatus = reviewStatus;
    report.reviewNote = reviewNote.trim();
    report.approvedBy = req.user._id;
    report.approvedAt = new Date();
    await report.save();

    if (reviewStatus === "approved" && oldReviewStatus !== "approved" && report.submittedBy) {
        const earnings = (Number(report.hoursWorked) || 0) * (Number(report.hourlyRate) || 0) - (Number(report.latePenalty) || 0);
        if (earnings > 0) {
            await User.updateOne({ _id: report.submittedBy }, { $inc: { totalEarned: earnings } });
        }
    }
    if (reviewStatus === "rejected" && oldReviewStatus === "approved" && report.submittedBy) {
        const earnings = (Number(report.hoursWorked) || 0) * (Number(report.hourlyRate) || 0) - (Number(report.latePenalty) || 0);
        if (earnings > 0) {
            await User.updateOne({ _id: report.submittedBy }, { $inc: { totalEarned: -earnings } });
        }
    }

    await createAuditEntry({
      actionType: "status_change",
      reportId: report._id,
      fieldName: "reviewStatus",
      oldValue: oldReviewStatus,
      newValue: reviewStatus,
      userId: req.user._id,
      userName: req.user.userName,
      ipAddress: req.ip,
      reason: report.reviewNote || oldReviewNote,
    });

    await report.populate("submittedBy", "userName email");
    await report.populate("approvedBy", "userName email");
    const decisionMessage = `Report ${reviewStatus} for ${report.profileName || report.raterName}.${report.reviewNote ? ` Reason: ${report.reviewNote}` : ""}`;
    if (report.submittedBy?._id) {
      emitAdminUpdate({
        title: `Report ${reviewStatus}`,
        message: `Your ${decisionMessage}`,
        type: reviewStatus === "approved" ? "success" : "warning",
        targetUserId: report.submittedBy._id.toString(),
        targetRoles: ["admin"],
      });
    } else {
      emitAdminUpdate({
        title: `Report ${reviewStatus}`,
        message: decisionMessage,
        type: reviewStatus === "approved" ? "success" : "warning",
        targetRoles: ["admin"],
      });
    }

    res.status(200).json({
      status: "success",
      message: `Report ${reviewStatus} successfully`,
      data: report,
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
    const reportOwnerId = report.submittedBy?._id || report.submittedBy;
    const belongsToUser = reportOwnerId
      ? reportOwnerId.toString() === req.user._id.toString()
      : report.raterName === req.user.userName &&
        await User.countDocuments({ userName: req.user.userName, role: "user" }) === 1;
    if (req.user.role !== "admin" && !belongsToUser) {
      return next(new AppError("You can only view your own reports", 403));
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
    if (req.user.role !== "admin") Object.assign(filter, await getOwnedReportFilter(req.user));
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

    if (req.user.role !== "admin" && raterName !== req.user.userName) {
      return next(new AppError("You can only view your own reports", 403));
    }

    const filter = { raterName, isDeleted: { $ne: true } };
    if (req.user.role !== "admin") Object.assign(filter, await getOwnedReportFilter(req.user));
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

    const filter = { ...(await getOwnedReportFilter(req.user)), isDeleted: { $ne: true } };
    if (status) filter.status = status;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const reports = await Report.find(filter)
      .populate("approvedBy", "userName email")
      .populate("originalReportId")
      .populate("invoiceId", "status")
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

export const getEarningsLeaderboard = async (req, res, next) => {
  try {
    const { category } = req.query;
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 50));
    const match = { reviewStatus: "approved", isDeleted: { $ne: true }, submittedBy: { $exists: true } };
    if (typeof category === "string" && category.trim()) match.category = category.trim();

    const isAdmin = req.user.role === "admin";
    const leaderboard = await Report.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$submittedBy",
          totalEarned: {
            $sum: {
              $max: [0, {
                $subtract: [
                  {
                    $multiply: [
                      { $convert: { input: "$hoursWorked", to: "double", onError: 0, onNull: 0 } },
                      { $convert: { input: "$hourlyRate", to: "double", onError: 0, onNull: 0 } },
                    ],
                  },
                  { $convert: { input: "$latePenalty", to: "double", onError: 0, onNull: 0 } },
                ],
              }],
            },
          },
          totalReports: { $sum: 1 },
          totalHours: { $sum: { $convert: { input: "$hoursWorked", to: "double", onError: 0, onNull: 0 } } },
        },
      },
      { $match: { totalEarned: { $gt: 0 } } },
      {
        $lookup: {
          from: User.collection.name,
          localField: "_id",
          foreignField: "_id",
          as: "rater",
        },
      },
      { $unwind: "$rater" },
      { $match: { "rater.role": "user" } },
      { $sort: { totalEarned: -1, totalReports: -1, "rater.userName": 1 } },
      { $limit: limit },
      {
        $project: {
          ...(isAdmin ? { userId: { $toString: "$_id" } } : {}),
          username: "$rater.userName",
          ...(isAdmin ? {
            totalEarned: { $round: ["$totalEarned", 2] },
            totalReports: 1,
            totalHours: { $round: ["$totalHours", 2] },
          } : {}),
          _id: 0,
        },
      },
    ]);

    res.status(200).json({
      status: "success",
      message: "Rater earnings leaderboard retrieved successfully",
      data: leaderboard,
    });
  } catch (err) {
    next(err);
  }
};

const ALLOWED_EDIT_FIELDS = [
  "tasksWorked",
  "hoursWorked",
  "hourlyRate",
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
    if (report.isDeleted) {
      return next(new AppError("Deleted reports cannot be edited", 409));
    }

    const isAdmin = req.user.role === "admin";
    const isOwner = report.submittedBy?.toString() === req.user._id.toString();
    const wasApproved = report.reviewStatus === "approved";
    const previousApprovedEarnings = Math.max(
      0,
      (Number(report.hoursWorked) || 0) * (Number(report.hourlyRate) || 0) - (Number(report.latePenalty) || 0)
    );
    if (!isAdmin && (!isOwner || req.user.role !== "user")) {
      return next(new AppError("You can only edit your own reports", 403));
    }
    if (!isAdmin) {
      const invoice = report.invoiceId
        ? await Invoice.findById(report.invoiceId).select("status")
        : null;
      if (report.status === "Paid" || invoice?.status === "Paid") {
        return next(new AppError("This report can no longer be edited after payment", 409));
      }
    }

    const changes = [];

    const editableFields = isAdmin
      ? ALLOWED_EDIT_FIELDS
      : ALLOWED_EDIT_FIELDS.filter((field) => field !== "raterName");
    for (const key of editableFields) {
      if (req.body.hasOwnProperty(key)) {
        const oldValue = report[key];
        const newValue = req.body[key];
        if (!isAdmin && key === "status" && !["Active", "Restricted", "Sacked"].includes(newValue)) {
          return next(new AppError("Invalid report status", 400));
        }
        if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
          changes.push({ fieldName: key, oldValue, newValue });
          report[key] = newValue;
        }
      }
    }

    if (changes.length > 0 && !isAdmin) {
      const updatedSubmissionTime = new Date();
      changes.push({ fieldName: "submissionTime", oldValue: report.submissionTime, newValue: updatedSubmissionTime });
      report.submissionTime = updatedSubmissionTime;
      const updatedPenalty = isLateSubmission(updatedSubmissionTime, report.date) ? LATE_PENALTY_AMOUNT : 0;
      if (report.latePenalty !== updatedPenalty) {
        changes.push({ fieldName: "latePenalty", oldValue: report.latePenalty, newValue: updatedPenalty });
        report.latePenalty = updatedPenalty;
      }
      if (["rejected", "approved"].includes(report.reviewStatus)) {
        changes.push({ fieldName: "reviewStatus", oldValue: report.reviewStatus, newValue: "pending" });
        changes.push({ fieldName: "reviewNote", oldValue: report.reviewNote, newValue: "" });
        report.reviewStatus = "pending";
        report.reviewNote = "";
        report.approvedBy = null;
        report.approvedAt = null;
      }
    }

    if (changes.length > 0) {
        await report.save();

      if (!isAdmin && wasApproved && report.submittedBy && previousApprovedEarnings > 0) {
        await User.updateOne({ _id: report.submittedBy }, { $inc: { totalEarned: -previousApprovedEarnings } });
      }

        const earningsFields = ["hoursWorked", "hourlyRate", "latePenalty"];
        const earningsChanged = changes.some((change) => earningsFields.includes(change.fieldName));
        if (earningsChanged && report.reviewStatus === "approved" && report.submittedBy) {
            const getOldValue = (field, fallback) => {
                const change = changes.find((entry) => entry.fieldName === field);
                return change ? change.oldValue : fallback;
            };
            const oldEarnings =
                (Number(getOldValue("hoursWorked", report.hoursWorked)) || 0) *
                    (Number(getOldValue("hourlyRate", report.hourlyRate)) || 0) -
                (Number(getOldValue("latePenalty", report.latePenalty)) || 0);
            const newEarnings = (Number(report.hoursWorked) || 0) * (Number(report.hourlyRate) || 0) - (Number(report.latePenalty) || 0);
            const difference = newEarnings - oldEarnings;
            if (difference !== 0) {
                await User.updateOne({ _id: report.submittedBy }, { $inc: { totalEarned: difference } });
            }
        }

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
      if (isAdmin && report.submittedBy) {
        emitAdminUpdate({
          title: "Report updated by an administrator",
          message: "An administrator updated your report submission.",
          type: "info",
          targetUserId: report.submittedBy.toString(),
        });
      } else {
        emitAdminUpdate({
          title: "Report updated",
          message: `${report.raterName} updated a report submission.`,
          type: "info",
          targetRoles: ["admin"],
        });
      }
    }

    await report.populate("submittedBy", "userName email");
    await report.populate("approvedBy", "userName email");

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
      if (report.submittedBy) {
        emitAdminUpdate({
          title: "Report status updated",
          message: `An administrator changed your report status to ${status}.`,
          type: status === "Paid" ? "success" : "info",
          targetUserId: report.submittedBy.toString(),
        });
      }
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

      emitAdminUpdate(isAdmin ? {
        title: "Report deleted by an administrator",
        message: `An administrator removed ${report.raterName}'s report for ${report.profileName}.`,
        targetUserId: report.submittedBy?.toString(),
      } : {
        title: "Report deleted",
        message: `${report.raterName} deleted a report submission.`,
        targetRoles: ["admin"],
      });

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

    emitAdminUpdate({
      title: "Report deleted",
      message: `${report.raterName} deleted a report submission.`,
      targetRoles: ["admin"],
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
