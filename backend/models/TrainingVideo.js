import mongoose from "mongoose";

const trainingVideoSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Video title is required"],
      trim: true,
      maxlength: 160,
    },
    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: 2000,
    },
    videoUrl: {
      type: String,
      required: [true, "Video URL is required"],
      trim: true,
    },
    thumbnailUrl: {
      type: String,
      trim: true,
      default: "",
    },
    category: {
      type: String,
      required: [true, "Video category is required"],
      trim: true,
      maxlength: 100,
    },
    duration: {
      type: String,
      trim: true,
      default: "",
      maxlength: 50,
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("TrainingVideo", trainingVideoSchema);
