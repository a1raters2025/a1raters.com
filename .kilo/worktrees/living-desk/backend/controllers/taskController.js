import Task from "../models/Task.js";
import AppError from "../errors/AppError.js";
import { emitAdminUpdate } from "../utils/socket.js";

export const createTask = async (req, res, next) => {
  try {
    const taskData = {
      ...req.body,
      createdBy: req.user._id,
    };

    const task = await Task.create(taskData);

    emitAdminUpdate({
      title: "New task available",
      message: `${task.category} evaluation task has been added to the workspace.`,
      type: "info",
    });

    res.status(201).json({
      status: "success",
      message: "Task created successfully",
      data: task,
    });
  } catch (err) {
    next(err);
  }
};

export const getAllTasks = async (req, res, next) => {
  try {
    const { category, subCategory, mode, page = 1, limit = 20 } = req.query;

    const filter = { isActive: true };
    if (category) filter.category = category;
    if (subCategory) filter.subCategory = subCategory;
    if (mode) filter.usageMode = mode;

    const skip = (Number(page) - 1) * Number(limit);

    const tasks = await Task.find(filter)
      .populate("createdBy", "userName email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Task.countDocuments(filter);

    res.status(200).json({
      status: "success",
      message: "Tasks retrieved successfully",
      data: tasks,
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

export const getTaskById = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id).populate(
      "createdBy",
      "userName email"
    );

    if (!task) {
      return next(new AppError("Task not found", 404));
    }

    res.status(200).json({
      status: "success",
      message: "Task retrieved successfully",
      data: task,
    });
  } catch (err) {
    next(err);
  }
};

export const getTasksByCategory = async (req, res, next) => {
  try {
    const { category, subCategory } = req.params;
    const { mode } = req.query;

    const filter = { category, isActive: true };
    if (subCategory) filter.subCategory = subCategory;
    if (mode) filter.usageMode = mode;

    const tasks = await Task.find(filter).sort({ createdAt: -1 });

    res.status(200).json({
      status: "success",
      message: "Tasks retrieved successfully",
      data: tasks,
    });
  } catch (err) {
    next(err);
  }
};

export const updateTask = async (req, res, next) => {
  try {
    const task = await Task.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate("createdBy", "userName email");

    if (!task) {
      return next(new AppError("Task not found", 404));
    }

    res.status(200).json({
      status: "success",
      message: "Task updated successfully",
      data: task,
    });
  } catch (err) {
    next(err);
  }
};

export const deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!task) {
      return next(new AppError("Task not found", 404));
    }

    res.status(200).json({
      status: "success",
      message: "Task deleted successfully",
    });
  } catch (err) {
    next(err);
  }
};

export const getCategories = async (req, res, next) => {
  try {
    const categories = await Task.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: "$category",
          subCategories: { $addToSet: "$subCategory" },
        },
      },
      {
        $project: {
          category: "$_id",
          subCategories: 1,
          _id: 0,
        },
      },
    ]);

    res.status(200).json({
      status: "success",
      message: "Categories retrieved successfully",
      data: categories,
    });
  } catch (err) {
    next(err);
  }
};

export const getProxies = async (req, res, next) => {
  try {
    const proxies = ["US", "UK", "Japan", "China", "Germany", "France", "Canada", "Australia"];

    res.status(200).json({
      status: "success",
      message: "Proxies retrieved successfully",
      data: proxies,
    });
  } catch (err) {
    next(err);
  }
};

export const getRatingOptions = async (req, res, next) => {
  try {
    const ratings = ["Navigational", "Excellent", "Good", "Acceptable", "Unacceptable", "Perfect"];

    res.status(200).json({
      status: "success",
      message: "Rating options retrieved successfully",
      data: ratings,
    });
  } catch (err) {
    next(err);
  }
};

export const bulkCreateTasks = async (req, res, next) => {
  try {
    const tasks = req.body.tasks.map((task) => ({
      ...task,
      createdBy: req.user._id,
    }));

    const createdTasks = await Task.insertMany(tasks);

    res.status(201).json({
      status: "success",
      message: `${createdTasks.length} tasks created successfully`,
      data: createdTasks,
    });
  } catch (err) {
    next(err);
  }
};