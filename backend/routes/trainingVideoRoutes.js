import express from "express";
import mongoose from "mongoose";
import auth from "../middlewares/auth.js";
import admin from "../middlewares/adminMiddleware.js";
import TrainingVideo from "../models/TrainingVideo.js";

const Router = express.Router();
const fields = ["title", "description", "videoUrl", "thumbnailUrl", "category", "duration", "isPublished"];

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
  .get(auth, admin, async (req, res) => {
    try {
      const videos = await TrainingVideo.find().sort({ createdAt: -1 }).lean();
      res.status(200).json({ status: "success", data: videos.map(withId) });
    } catch (error) {
      console.error("Failed to load training videos:", error);
      res.status(500).json({ status: "fail", message: "Unable to load training videos" });
    }
  })
  .post(auth, admin, async (req, res) => {
    const { title, videoUrl, category } = req.body;
    if (typeof title !== "string" || !title.trim() || !validateVideoUrl(videoUrl) || typeof category !== "string" || !category.trim()) {
      return res.status(400).json({ status: "fail", message: "A title, valid video URL, and category are required" });
    }

    try {
      const video = await TrainingVideo.create({
        ...Object.fromEntries(Object.entries(req.body).filter(([key]) => fields.includes(key))),
        title: title.trim(),
        videoUrl: videoUrl.trim(),
        category: category.trim(),
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
