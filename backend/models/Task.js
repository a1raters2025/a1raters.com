import mongoose from "mongoose";

const taskSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      required: [true, "Category is required"],
      enum: ["App Store", "Video", "Music", "Podcast"],
    },
    subCategory: {
      type: String,
      required: [true, "Sub-category is required"],
    },
    query: {
      type: String,
      required: [true, "Query is required"],
    },
    metadata: {
      queryType: {
        type: String,
        required: true,
        enum: ["App Navigational", "Dev Navigational", "Functional", "Broad", "Video Navigational", "Video Hint", "Video Complex", "Video Siri Complex"],
      },
      distribution: {
        type: String,
        required: true,
        enum: ["Head", "Mid", "Tail"],
      },
      spelling: {
        type: String,
        required: true,
        enum: ["Spelled Correctly", "Misspelled"],
      },
      language: {
        type: String,
        required: true,
      },
      searchLinks: [
        {
          name: { type: String, required: true },
          url: { type: String, required: true },
        },
      ],
    },
    result: {
      title: { type: String, required: true },
      subtitle: { type: String },
      developer: { type: String },
      category: { type: String },
      imageUrl: { type: String },
      description: { type: String },
      attribution: { type: String },
      sourceLink: { type: String },
      sourceName: { type: String },
    },
    correctRating: {
      type: String,
      enum: ["Navigational", "Excellent", "Good", "Acceptable", "Unacceptable", "Perfect"],
    },
    correctComment: { type: String },
    usageMode: {
      type: String,
      enum: ["practice", "test", "both"],
      default: "practice",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "processing", "done", "expired"],
      default: "active",
      required: true,
    },
    assignedRaters: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    currentRater: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    duration: {
      type: Number,
      default: 0,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

taskSchema.index({ category: 1, subCategory: 1 });
taskSchema.index({ query: "text", "result.title": "text" });
taskSchema.index({ status: 1, category: 1 });
taskSchema.index({ currentRater: 1, status: 1 });

const Task = mongoose.model("Task", taskSchema);

export default Task;