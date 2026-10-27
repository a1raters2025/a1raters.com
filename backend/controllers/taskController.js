import Task from "../models/Task.js";
import { User } from "../models/userSchema.js";
import AppError from "../errors/AppError.js";
import { emitAdminUpdate } from "../utils/socket.js";
import { GoogleGenAI } from "@google/genai";

const notifyNewTasks = (tasks) => {
  if (!tasks.length) return;
  const categories = [...new Set(tasks.map((task) => task.category).filter(Boolean))];
  const taskLabel = tasks.length === 1 ? "A new task" : `${tasks.length} new tasks`;
  const categoryLabel = categories.length > 0 && categories.length <= 3
    ? ` for ${categories.join(", ")}`
    : "";

  emitAdminUpdate({
    title: tasks.length === 1 ? "New task available" : "New tasks available",
    message: `${taskLabel}${categoryLabel} ${tasks.length === 1 ? "is" : "are"} now available in the workspace.`,
    type: "info",
    targetRoles: ["admin", "user", "client"],
  });
};
import { logActivity } from "../models/activityLog.js";
import { getConsentedUserAgent } from "../utils/deviceConsent.js";

const normalizeCategory = (c) => {
  const map = { "Mac App Store": "Mac App Store", "AI Assist": "AI Assist", "App Image Accessibility": "App Image Accessibility" };
  return map[c] || c;
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

    const hasAnotherActiveRater = task.currentRater
      && task.currentRater.toString() !== userId.toString()
      && task.expiresAt
      && new Date(task.expiresAt).getTime() > Date.now();
    if (hasAnotherActiveRater) {
      return next(new AppError("This task is currently being worked on by another rater", 409));
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
      userAgent: getConsentedUserAgent(req),
      path: req.path,
      method: req.method,
      statusCode: 200,
      metadata: { action: "assigned_to_task", previousStatus: task.status },
    });

    emitAdminUpdate({
      title: "Rater assigned a task",
      message: `${req.user.userName || req.user.email} started a ${task.category} task.`,
      targetRoles: ["admin"],
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

export const analyzeTaskImage = async (req, res, next) => {
  try {
    const openAiApiKey = process.env.OPENAI_API_KEY;
    const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!openAiApiKey && !geminiApiKey) {
      return next(new AppError("No image analysis provider is configured on the server", 503));
    }

    const { imageUrl } = req.body;
    let parsedImageUrl;
    try {
      parsedImageUrl = new URL(imageUrl);
    } catch {
      return next(new AppError("A valid uploaded image URL is required", 400));
    }
    if (parsedImageUrl.protocol !== "https:" || parsedImageUrl.hostname !== "res.cloudinary.com") {
      return next(new AppError("Image must be uploaded to the approved media storage first", 400));
    }

    const prompt = "You are a data extraction assistant. Analyze the screenshot and extract:\n" +
      "1. Search Query (Top search bar or context)\n" +
      "2. User Intent (Deduce what the user is looking for based on the query)\n" +
      "3. Result Title (The main app/video/content name)\n" +
      "4. Subtitle (Developer/Artist/Channel)\n" +
      "5. Description (Short snippet or intro)\n" +
      "6. Suggest a Correct Rating (Navigational, Excellent, Good, Acceptable, Unacceptable).\n" +
      "7. Write a short Reason for the rating.\n\n" +
      "Return strictly valid JSON with keys: query, intent, title, subtitle, description, rating, reason. Do not wrap in markdown code blocks.";

    let openAiError;
    if (openAiApiKey) {
      try {
        const openAiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          signal: AbortSignal.timeout(90000),
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + openAiApiKey,
          },
          body: JSON.stringify({
            model: "gpt-4o",
            messages: [
              { role: "system", content: prompt },
              {
                role: "user",
                content: [
                  { type: "text", text: "Analyze this image." },
                  { type: "image_url", image_url: { url: parsedImageUrl.toString() } },
                ],
              },
            ],
            max_tokens: 500,
            response_format: { type: "json_object" },
          }),
        });

        const responseData = await openAiResponse.json().catch(() => ({}));
        if (!openAiResponse.ok) {
          throw new Error(responseData?.error?.message || "OpenAI image analysis failed");
        }

        const content = responseData?.choices?.[0]?.message?.content;
        if (typeof content !== "string") {
          throw new Error("OpenAI returned an invalid analysis response");
        }

        res.status(200).json({ status: "success", data: JSON.parse(content) });
        return;
      } catch (err) {
        openAiError = err;
        const message = err instanceof Error ? err.message : "Unknown provider error";
        console.warn("[task-image-analysis] OpenAI failed; trying Gemini fallback", {
          status: err?.status || err?.statusCode,
          code: err?.code,
          message: openAiApiKey ? message.replaceAll(openAiApiKey, "[REDACTED]") : message,
        });
      }
    }

    if (!geminiApiKey) {
      return next(new AppError(
        openAiError instanceof Error ? openAiError.message : "OpenAI image analysis failed",
        502,
      ));
    }

    try {
      const imageResponse = await fetch(parsedImageUrl, { signal: AbortSignal.timeout(30000) });
      if (!imageResponse.ok) {
        throw new Error("Could not retrieve the uploaded image for Gemini analysis");
      }

      const mimeType = imageResponse.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
      const supportedImageTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);
      if (!mimeType || !supportedImageTypes.has(mimeType)) {
        throw new Error("Uploaded image format is not supported for Gemini analysis");
      }

      const maxImageBytes = 10 * 1024 * 1024;
      const contentLength = Number(imageResponse.headers.get("content-length"));
      if (contentLength > maxImageBytes) {
        throw new Error("Uploaded image exceeds the Gemini analysis size limit");
      }
      const imageBytes = Buffer.from(await imageResponse.arrayBuffer());
      if (imageBytes.length > maxImageBytes) {
        throw new Error("Uploaded image exceeds the Gemini analysis size limit");
      }

      const ai = new GoogleGenAI({ apiKey: geminiApiKey });
      const geminiResponse = await ai.models.generateContent({
        model: process.env.GEMINI_MODEL || "gemini-3.5-flash-lite",
        contents: [{
          role: "user",
          parts: [
            { text: prompt + "\n\nAnalyze this image." },
            { inlineData: { mimeType, data: imageBytes.toString("base64") } },
          ],
        }],
        config: {
          responseMimeType: "application/json",
          temperature: 0.2,
          httpOptions: {
            timeout: 180000,
            retryOptions: { attempts: 1 },
          },
        },
      });

      if (typeof geminiResponse.text !== "string") {
        throw new Error("Gemini returned an invalid analysis response");
      }
      res.status(200).json({ status: "success", data: JSON.parse(geminiResponse.text) });
    } catch (geminiError) {
      const geminiMessage = geminiError instanceof Error
        ? geminiError.message
        : "Unknown provider error";
      const geminiCause = geminiError instanceof Error && geminiError.cause instanceof Error
        ? geminiError.cause
        : null;
      const redactedGeminiMessage = geminiApiKey
        ? geminiMessage.replaceAll(geminiApiKey, "[REDACTED]")
        : geminiMessage;
      console.error("[task-image-analysis] Gemini failed", {
        name: geminiError instanceof Error ? geminiError.name : "UnknownError",
        status: geminiError?.status || geminiError?.statusCode,
        code: geminiError?.code,
        message: redactedGeminiMessage,
        causeName: geminiCause?.name,
        causeMessage: geminiCause
          ? geminiApiKey
            ? geminiCause.message.replaceAll(geminiApiKey, "[REDACTED]")
            : geminiCause.message
          : undefined,
      });
      const openAiMessage = openAiError instanceof Error
        ? openAiApiKey
          ? openAiError.message.replaceAll(openAiApiKey, "[REDACTED]")
          : openAiError.message
        : "OpenAI image analysis failed";
      const message = openAiError
        ? `OpenAI and Gemini image analysis failed. OpenAI: ${openAiMessage.slice(0, 300)}. Gemini (${geminiError instanceof Error ? geminiError.name : "error"}): ${redactedGeminiMessage.slice(0, 300)}.`
        : `Gemini image analysis failed (${geminiError instanceof Error ? geminiError.name : "error"}): ${redactedGeminiMessage}`;
      next(new AppError(message, 502));
    }
  } catch (err) {
    next(err instanceof SyntaxError ? new AppError("AI provider returned invalid JSON", 502) : err);
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
      userAgent: getConsentedUserAgent(req),
      path: req.path,
      method: req.method,
      statusCode: 200,
      metadata: { action: `task_${finalStatus}`, duration: task.duration },
    });

    emitAdminUpdate({
      title: "Task completed",
      message: `${req.user.userName || req.user.email} ${finalStatus} a ${task.category} task.`,
      type: finalStatus === "done" ? "success" : "info",
      targetRoles: ["admin"],
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
    const { clientEmail, clientPassword, ...taskFields } = req.body;
    if (!clientEmail || !clientPassword) {
      return next(new AppError("Client email and password are required", 400));
    }
    const normalizedEmail = String(clientEmail).trim().toLowerCase();
    let clientUser = await User.findOne({ email: normalizedEmail });
    if (clientUser && clientUser.role !== "client") {
      return next(new AppError("That email is already used by a non-client account", 409));
    }
    if (!clientUser) {
      clientUser = new User({
        userName: normalizedEmail.split("@")[0], email: normalizedEmail,
        password: clientPassword, role: "client", categories: [taskFields.category],
      });
    } else {
      clientUser.password = clientPassword;
      clientUser.categories = [...new Set([...(clientUser.categories || []), taskFields.category])];
    }
    await clientUser.save();
    const taskData = {
      ...taskFields,
      client: clientUser._id,
      createdBy: req.user._id,
    };

    const task = await Task.create(taskData);

    notifyNewTasks([task]);

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
      returnDocument: 'after',
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
      { returnDocument: 'after' }
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
    notifyNewTasks(createdTasks);

    res.status(201).json({
      status: "success",
      message: `${createdTasks.length} tasks created successfully`,
      data: createdTasks,
    });
  } catch (err) {
    next(err);
  }
};
