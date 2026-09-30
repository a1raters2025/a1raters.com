import Task from "../models/Task.js";
import AppError from "../errors/AppError.js";
import { emitAdminUpdate } from "../utils/socket.js";
import { logActivity } from "../models/activityLog.js";

const normalizeCategory = (c) => {
  const map = { "Mac App Store": "Mac App Store", "AI Assist": "AI Assist", "App Image Accessibility": "App Image Accessibility" };
  return map[c] || c;
};

const buildUserCategoryFilter = (user) => {
  if (!user) return null;
  if (user.role === "admin" || user.role === "client") return null;
  if (user.role === "user" && Array.isArray(user.categories) && user.categories.length) {
    return { category: { $in: user.categories.map(normalizeCategory) } };
  }
  return null;
};

const applyCategoryScope = (filter, user) => {
  const catFilter = buildUserCategoryFilter(user);
  if (catFilter) {
    if (filter.category) {
      const existing = Array.isArray(filter.category) ? filter.category : [filter.category];
      filter.category = { $in: existing.filter((c) => catFilter.category.$in.includes(c)) };
    } else {
      Object.assign(filter, catFilter);
    }
  }
  return filter;
};

export const assignRater = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const task = await Task.findById(id);
    if (!task) {
      return next(new AppError("Task not found", 404));
    }

    if (task.status === "done" || task.status === "expired") {
      return next(new AppError("Task is no longer available", 400));
    }

    const alreadyAssigned = task.assignedRaters.includes(userId);
    if (!alreadyAssigned) {
      task.assignedRaters.push(userId);
    }

    if (!task.currentRater || task.currentRater.toString() !== userId.toString()) {
      task.currentRater = userId;
      task.status = "processing";
      task.expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    }

    await task.save();

    await logActivity({
      userId,
      userName: req.user.userName || req.user.email || "",
      userRole: req.user.role,
      action: "view_page",
      resourceType: "task",
      resourceId: id,
      ipAddress: req.ip || req.socket?.remoteAddress,
      userAgent: req.get("user-agent"),
      path: req.path,
      method: req.method,
      statusCode: 200,
      metadata: { action: "assigned_to_task", previousStatus: task.status },
    });

    res.status(200).json({
      status: "success",
      message: "Task assigned successfully",
      data: task,
    });
  } catch (err) {
    next(err);
  }
};

export const completeTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const task = await Task.findById(id);
    if (!task) {
      return next(new AppError("Task not found", 404));
    }

    if (!task.assignedRaters.includes(userId)) {
      return next(new AppError("You are not assigned to this task", 403));
    }

    if (task.status === "done") {
      return next(new AppError("Task is already completed", 400));
    }

    const finalStatus = req.body.status || "done";

    task.status = finalStatus;
    task.duration = task.duration || 0;
    if (finalStatus === "done") {
      task.currentRater = null;
      task.expiresAt = null;
    }

    await task.save();

    await logActivity({
      userId,
      userName: req.user.userName || req.user.email || "",
      userRole: req.user.role,
      action: finalStatus === "done" ? "view_page" : "view_page",
      resourceType: "task",
      resourceId: id,
      ipAddress: req.ip || req.socket?.remoteAddress,
      userAgent: req.get("user-agent"),
      path: req.path,
      method: req.method,
      statusCode: 200,
      metadata: { action: `task_${finalStatus}`, duration: task.duration },
    });

    res.status(200).json({
      status: "success",
      message: `Task ${finalStatus} successfully`,
      data: task,
    });
  } catch (err) {
    next(err);
  }
};

export const getActiveTasks = async (req, res, next) => {
  try {
    const { category, subCategory, mode, page = 1, limit = 20 } = req.query;

    const filter = { isActive: true, status: { $in: ["active", "processing", "done", "expired"] } };

    if (category) filter.category = normalizeCategory(category);
    if (subCategory) filter.subCategory = subCategory;
    if (mode) filter.usageMode = mode;

    if (req.user.role === "user") {
      const catFilter = buildUserCategoryFilter(req.user);
      if (catFilter) {
        Object.assign(filter, catFilter);
      }
    }

    const skip = (Number(page) - 1) * Number(limit);

    const tasks = await Task.find(filter)
      .populate("createdBy", "userName email")
      .populate("currentRater", "userName email")
      .populate("assignedRaters", "userName email")
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
    if (category) filter.category = normalizeCategory(category);
    if (subCategory) filter.subCategory = subCategory;
    if (mode) filter.usageMode = mode;

    if (req.user.role === "user") {
      const catFilter = buildUserCategoryFilter(req.user);
      if (catFilter) {
        Object.assign(filter, catFilter);
      }
    }

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