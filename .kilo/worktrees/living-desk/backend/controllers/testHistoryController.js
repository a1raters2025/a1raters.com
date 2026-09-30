import TestHistory from "../models/TestHistory.js";
import AppError from "../errors/AppError.js";

export const saveTestResult = async (req, res, next) => {
  try {
    const testData = {
      ...req.body,
      userId: req.user._id,
      username: req.user.userName,
    };

    const testHistory = await TestHistory.create(testData);

    res.status(201).json({
      status: "success",
      message: "Test result saved successfully",
      data: testHistory,
    });
  } catch (err) {
    next(err);
  }
};

export const getTestHistory = async (req, res, next) => {
  try {
    const { testType, category, page = 1, limit = 20 } = req.query;

    const filter = { userId: req.user._id };
    if (testType) filter.testType = testType;
    if (category) filter.category = category;

    const skip = (Number(page) - 1) * Number(limit);

    const history = await TestHistory.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await TestHistory.countDocuments(filter);

    // Calculate aggregate stats
    const stats = await TestHistory.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalTests: { $sum: 1 },
          averageScore: { $avg: "$score" },
          bestScore: { $max: "$score" },
          totalTimeSpent: { $sum: "$timeSpent" },
        },
      },
    ]);

    res.status(200).json({
      status: "success",
      message: "Test history retrieved successfully",
      data: history,
      stats: stats[0] || {
        totalTests: 0,
        averageScore: 0,
        bestScore: 0,
        totalTimeSpent: 0,
      },
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

export const getTestHistoryByUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { testType, category, page = 1, limit = 20 } = req.query;

    // Only admin can view other users' history
    if (req.user.role !== "admin" && req.user._id.toString() !== userId) {
      return next(new AppError("Unauthorized", 403));
    }

    const filter = { userId };
    if (testType) filter.testType = testType;
    if (category) filter.category = category;

    const skip = (Number(page) - 1) * Number(limit);

    const history = await TestHistory.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await TestHistory.countDocuments(filter);

    res.status(200).json({
      status: "success",
      message: "Test history retrieved successfully",
      data: history,
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

export const getTestStats = async (req, res, next) => {
  try {
    const { username } = req.query;
    const filter = username ? { username } : { userId: req.user._id };

    const stats = await TestHistory.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$category",
          totalTests: { $sum: 1 },
          averageScore: { $avg: "$score" },
          bestScore: { $max: "$score" },
          averageTime: { $avg: "$timeSpent" },
        },
      },
      {
        $project: {
          category: "$_id",
          totalTests: 1,
          averageScore: { $round: ["$averageScore", 2] },
          bestScore: 1,
          averageTime: { $round: ["$averageTime", 2] },
          _id: 0,
        },
      },
    ]);

    const overall = await TestHistory.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalTests: { $sum: 1 },
          averageScore: { $avg: "$score" },
          bestScore: { $max: "$score" },
          totalTimeSpent: { $sum: "$timeSpent" },
        },
      },
      {
        $project: {
          totalTests: 1,
          averageScore: { $round: ["$averageScore", 2] },
          bestScore: 1,
          totalTimeSpent: 1,
          _id: 0,
        },
      },
    ]);

    res.status(200).json({
      status: "success",
      message: "Test statistics retrieved successfully",
      data: {
        byCategory: stats,
        overall: overall[0] || {
          totalTests: 0,
          averageScore: 0,
          bestScore: 0,
          totalTimeSpent: 0,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getLeaderboard = async (req, res, next) => {
  try {
    const { category, testType, limit = 10 } = req.query;

    const filter = {};
    if (category) filter.category = category;
    if (testType) filter.testType = testType;

    const leaderboard = await TestHistory.aggregate([
      { $match: filter },
      {
        $sort: { score: -1, timeSpent: 1 },
      },
      {
        $group: {
          _id: "$username",
          bestScore: { $first: "$score" },
          bestTime: { $first: "$timeSpent" },
          totalTests: { $sum: 1 },
          averageScore: { $avg: "$score" },
        },
      },
      {
        $sort: { bestScore: -1, bestTime: 1 },
      },
      {
        $limit: Number(limit),
      },
      {
        $project: {
          username: "$_id",
          bestScore: 1,
          bestTime: 1,
          totalTests: 1,
          averageScore: { $round: ["$averageScore", 2] },
          _id: 0,
        },
      },
    ]);

    res.status(200).json({
      status: "success",
      message: "Leaderboard retrieved successfully",
      data: leaderboard,
    });
  } catch (err) {
    next(err);
  }
};