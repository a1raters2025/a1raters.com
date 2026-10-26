import express from "express";
import mongoose from "mongoose";
import auth from "../middlewares/auth.js";
import admin from "../middlewares/adminMiddleware.js";
import TrainingVideo from "../models/TrainingVideo.js";

const Router = express.Router();
const fields = ["title", "description", "videoUrl", "mediaType", "thumbnailUrl", "category", "categories", "duration", "isPublished"];
const mediaTypes = new Set(["image", "video", "audio"]);
const raterCategories = new Set([
  "App Store",
  "Mac App Store",
  "Video",
  "Video Hint",
  "Podcast",
  "Music",
  "AI Assist",
  "App Image Accessibility",
  "Manual Invoice",
  "App Store Image",
]);

const validateVideoUrl = (value) => {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

const withId = (video) => ({ ...video, id: video._id.toString() });

Router.route("/")
  .get(auth, async (req, res) => {
    try {
      const filter = req.user.role === "admin" ? {} : { isPublished: true };
      const videos = await TrainingVideo.find(filter).sort({ createdAt: -1 }).lean();
      res.status(200).json({ status: "success", data: videos.map(withId) });
    } catch (error) {
      console.error("Failed to load training videos:", error);
      res.status(500).json({ status: "fail", message: "Unable to load training videos" });
    }
  })
  .post(auth, admin, async (req, res) => {
    const { title, videoUrl, category, categories, mediaType } = req.body;
    const selectedCategories = categories === undefined ? [category] : categories;
    if (typeof title !== "string" || !title.trim() || !validateVideoUrl(videoUrl)
      || !Array.isArray(selectedCategories)
      || selectedCategories.length === 0
      || selectedCategories.some((item) => !raterCategories.has(item))) {
      return res.status(400).json({ status: "fail", message: "A title, valid media URL, and at least one valid rater category are required" });
    }
    if (mediaType !== undefined && !mediaTypes.has(mediaType)) {
      return res.status(400).json({ status: "fail", message: "Media type must be image, video, or audio" });
    }

    try {
      const video = await TrainingVideo.create({
        ...Object.fromEntries(Object.entries(req.body).filter(([key]) => fields.includes(key))),
        title: title.trim(),
        videoUrl: videoUrl.trim(),
        category: selectedCategories[0],
        categories: selectedCategories,
        createdBy: req.user._id,
      });
      res.status(201).json({ status: "success", data: withId(video.toObject()) });
    } catch (error) {
      console.error("Failed to create training video:", error);
      res.status(500).json({ status: "fail", message: "Unable to create training video" });
    }
  });

Router.route("/:id")
  .patch(auth, admin, async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ status: "fail", message: "Training video not found" });
    }
    const updates = Object.fromEntries(Object.entries(req.body).filter(([key]) => fields.includes(key)));
    if (!Object.keys(updates).length) {
      return res.status(400).json({ status: "fail", message: "No editable video fields provided" });
    }
    if (updates.title !== undefined && (typeof updates.title !== "string" || !updates.title.trim())) {
      return res.status(400).json({ status: "fail", message: "Video title is required" });
    }
    if (updates.videoUrl !== undefined && !validateVideoUrl(updates.videoUrl)) {
      return res.status(400).json({ status: "fail", message: "A valid video URL is required" });
    }
    if (updates.mediaType !== undefined && !mediaTypes.has(updates.mediaType)) {
      return res.status(400).json({ status: "fail", message: "Media type must be image, video, or audio" });
    }
    if (updates.categories !== undefined
      && (!Array.isArray(updates.categories)
        || updates.categories.length === 0
        || updates.categories.some((item) => !raterCategories.has(item)))) {
      return res.status(400).json({ status: "fail", message: "Select at least one valid rater category" });
    }
    if (updates.categories !== undefined) {
      updates.category = updates.categories[0];
    }
    if (updates.category !== undefined && (typeof updates.category !== "string" || !updates.category.trim())) {
      return res.status(400).json({ status: "fail", message: "Video category is required" });
    }

    try {
      const video = await TrainingVideo.findByIdAndUpdate(
        req.params.id,
        updates,
        { new: true, runValidators: true }
      ).lean();
      if (!video) {
        return res.status(404).json({ status: "fail", message: "Training video not found" });
      }
      res.status(200).json({ status: "success", data: withId(video) });
    } catch (error) {
      console.error("Failed to update training video:", error);
      res.status(500).json({ status: "fail", message: "Unable to update training video" });
    }
  })
  .delete(auth, admin, async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ status: "fail", message: "Training video not found" });
    }
    try {
      const video = await TrainingVideo.findByIdAndDelete(req.params.id);
      if (!video) {
        return res.status(404).json({ status: "fail", message: "Training video not found" });
      }
      res.status(200).json({ status: "success", message: "Training video deleted" });
    } catch (error) {
      console.error("Failed to delete training video:", error);
      res.status(500).json({ status: "fail", message: "Unable to delete training video" });
    }
  });

export default Router;
