import mongoose from "mongoose";

const testHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    username: {
      type: String,
      required: true,
    },
    testType: {
      type: String,
      required: true,
      enum: ["practice", "test"],
    },
    category: {
      type: String,
      required: true,
      enum: ["App Store", "Video", "Music", "Podcast"],
    },
    subCategory: {
      type: String,
    },
    score: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    totalQuestions: {
      type: Number,
      required: true,
    },
    correctAnswers: {
      type: Number,
      required: true,
    },
    timeSpent: {
      type: Number, // in seconds
    },
    answers: [
      {
        taskId: { type: mongoose.Schema.Types.ObjectId, ref: "Task" },
        query: { type: String },
        userRating: { type: String },
        correctRating: { type: String },
        isCorrect: { type: Boolean },
        timeTaken: { type: Number },
      },
    ],
  },
  {
    timestamps: true,
  }
);

testHistorySchema.index({ userId: 1, createdAt: -1 });
testHistorySchema.index({ username: 1, testType: 1, category: 1 });

const TestHistory = mongoose.model("TestHistory", testHistorySchema);

export default TestHistory;