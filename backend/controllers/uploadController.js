import File from "../models/File.js";
import { emitAdminUpdate } from "../utils/socket.js";
import { scanDocument } from "../utils/geminiScan.js";

const IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
const PDF_MIME = "application/pdf";

const isImageUpload = (file) => {
  if (!file) return false;
  const mimeType = file.mimetype || file.resource_type;
  return IMAGE_TYPES.some((t) => mimeType === t || mimeType === "image");
};

const getResourceType = (file) => {
  if (file.resource_type) return file.resource_type;
  if (file.mimetype?.startsWith("image/")) return "image";
  if (file.mimetype?.startsWith("video/")) return "video";
  return "raw";
};

const parseAudience = (audience) => {
  if (!audience) return ["user"];
  try {
    const parsed = JSON.parse(audience);
    if (!Array.isArray(parsed) || parsed.some((role) => !["admin", "user", "client"].includes(role))) {
      throw new Error("Audience must be an array of valid roles");
    }
    return parsed;
  } catch {
    throw new Error("Invalid audience value");
  }
};

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
      publicId: req.file.filename || req.file.public_id || req.file.path,
      resourceType: getResourceType(req.file),
      title: req.body.title || req.file.originalname,
      description: req.body.description || "",
      category: req.body.category || "Training",
      audience: parseAudience(req.body.audience),
      uploadedBy: req.user._id,
    });

    if (isImageUpload(req.file)) {
      const documentType = req.body.documentType || "receipt";
      File.updateOne({ _id: file._id }, { scanStatus: "processing" }).exec();
      res.status(201).json({
        status: "success",
        message: "File uploaded successfully",
        file,
      });
      scanDocument(file.url, documentType)
        .then(async (scannedData) => {
          await File.updateOne(
            { _id: file._id },
            { scannedData, scanStatus: "completed" }
          );
        })
        .catch(async (err) => {
          console.error("Gemini scan failed:", err);
          await File.updateOne(
            { _id: file._id },
            { scanStatus: "failed", scanError: err.message }
          );
        });
    } else {
      res.status(201).json({
        status: "success",
        message: "File uploaded successfully",
        file,
      });
    }
  } catch (error) {
    console.error(error);

    if (error.message === "Invalid audience value") {
      return res.status(400).json({
        status: "fail",
        message: error.message,
      });
    }

    res.status(500).json({
      status: "Failed",
      message: "File upload failed",
      error: error.message,
    });
  }
};

export const scanFile = async (req, res) => {
  try {
    const file = await File.findById(req.params.id);
    if (!file) {
      return res.status(404).json({ status: "fail", message: "File not found" });
    }

    const documentType = req.body.documentType || "receipt";
    file.scanStatus = "processing";
    await file.save();

    const scannedData = await scanDocument(file.url, documentType);
    file.scannedData = scannedData;
    file.scanStatus = "completed";
    await file.save();

    res.status(200).json({ status: "success", scannedData, file });
  } catch (error) {
    console.error("Scan failed:", error);
    await File.updateOne(
      { _id: req.params.id },
      { scanStatus: "failed", scanError: error.message }
    );
    res.status(500).json({ status: "fail", message: error.message });
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
