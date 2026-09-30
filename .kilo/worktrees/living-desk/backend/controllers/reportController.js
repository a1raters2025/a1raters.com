import Report from "../models/Report.js";
import AppError from "../errors/AppError.js";

export const createReport = async (req, res, next) => {
  try {
    const reportData = {
      ...req.body,
      submittedBy: req.user._id,
    };

    const report = await Report.create(reportData);

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
    const reports = req.body.reports.map((report) => ({
      ...report,
      submittedBy: req.user._id,
    }));

    const createdReports = await Report.insertMany(reports);

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

    const filter = {};
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
      .populate("approvedBy", "userName email");

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

    const filter = { email: email.toLowerCase() };
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

    const filter = { raterName };
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

export const updateReport = async (req, res, next) => {
  try {
    const report = await Report.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate("submittedBy", "userName email");

    if (!report) {
      return next(new AppError("Report not found", 404));
    }

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

    const report = await Report.findByIdAndUpdate(
      req.params.id,
      {
        status,
        approvedBy: req.user._id,
        approvedAt: new Date(),
      },
      { new: true, runValidators: true }
    ).populate("approvedBy", "userName email");

    if (!report) {
      return next(new AppError("Report not found", 404));
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
    const report = await Report.findByIdAndDelete(req.params.id);

    if (!report) {
      return next(new AppError("Report not found", 404));
    }

    res.status(200).json({
      status: "success",
      message: "Report deleted successfully",
    });
  } catch (err) {
    next(err);
  }
};

export const getAccountSummary = async (req, res, next) => {
  try {
    const pipeline = [
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
          status: { $ne: "Paid" },
        },
      },
      {
        $group: {
          _id: "$raterName",
          totalHours: { $sum: { $toDouble: "$hoursWorked" } },
          totalTasks: { $sum: { $toInt: "$tasksWorked" } },
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