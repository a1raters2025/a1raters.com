import mongoose from "mongoose";

const fileSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "File name is required"],
    },

    url: {
      type: String,
      required: [true, "File URL is required"],
    },

    publicId: {
      type: String,
      required: [true, "Public ID is required"],
    },

    resourceType: {
      type: String,
      required: [true, "Resource type is required"],
    },
    title: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    audience: {
      type: [String],
      enum: ["admin", "user", "client"],
      default: ["user"],
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    category: {
      type: String,
      default: "Training",
    },
    scanStatus: {
      type: String,
      enum: ["pending", "processing", "completed", "failed"],
      default: "pending",
    },
    scannedData: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    scanError: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const File = mongoose.model("File", fileSchema);

export default File;