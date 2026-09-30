import File from "../models/File.js";
import { emitAdminUpdate } from "../utils/socket.js";

export const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: "Please upload a file",
      });
    }

    const file = await File.create({
      name: req.file.originalname,
      url: req.file.path,
      publicId: req.file.filename,
      resourceType: req.file.resource_type,
      title: req.body.title || req.file.originalname,
      description: req.body.description || "",
      category: req.body.category || "Training",
      audience: req.body.audience ? JSON.parse(req.body.audience) : ["user"],
      uploadedBy: req.user._id,
    });

    emitAdminUpdate({
      title: "New training published",
      message: `${file.title} is now available in the training library.`,
      type: "success",
    });

    res.status(201).json({
      status: "success",
      message: "File uploaded successfully",
      file,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      status: "Failed",
      message: "File upload failed",
      error: error.message,
    });
  }
};

export const getTraining = async (req, res) => {
  try {
    const audience = req.user.role === "admin" ? ["admin", "user", "client"] : [req.user.role];
    const training = await File.find({ category: "Training", audience: { $in: audience } })
      .sort({ createdAt: -1 })
      .populate("uploadedBy", "userName");

    res.status(200).json({ status: "success", training });
  } catch (error) {
    res.status(500).json({ status: "Failed", message: "Unable to load training", error: error.message });
  }
};