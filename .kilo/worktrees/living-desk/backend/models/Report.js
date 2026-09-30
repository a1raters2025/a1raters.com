import mongoose from "mongoose";

const paymentDetailsSchema = new mongoose.Schema(
  {
    bankName: { type: String },
    accountNumber: { type: String },
    accountName: { type: String },
  },
  { _id: false }
);

const reportSchema = new mongoose.Schema(
  {
    raterName: {
      type: String,
      required: [true, "Rater name is required"],
    },
    profileName: {
      type: String,
      required: [true, "Profile name is required"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      lowercase: true,
      trim: true,
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      enum: [
        "App Store",
        "Video",
        "Podcast",
        "Music",
        "Manual Invoice",
      ],
    },
    proxy: {
      type: String,
      required: [true, "Proxy is required"],
      enum: ["US", "UK", "Japan", "China", "Germany", "France", "Canada", "Australia"],
    },
    status: {
      type: String,
      required: true,
      enum: ["Active", "Restricted", "Sacked", "Paid"],
      default: "Active",
    },
    tasksWorked: {
      type: String,
      required: [true, "Tasks worked is required"],
    },
    hoursWorked: {
      type: String,
      required: [true, "Hours worked is required"],
    },
    date: {
      type: Date,
      required: [true, "Date is required"],
    },
    description: {
      type: String,
    },
    paymentDetails: paymentDetailsSchema,
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    approvedAt: { type: Date },
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invoice",
    },
  },
  {
    timestamps: true,
  }
);

reportSchema.index({ email: 1, date: -1 });
reportSchema.index({ raterName: 1, date: -1 });
reportSchema.index({ status: 1 });

const Report = mongoose.model("Report", reportSchema);

export default Report;