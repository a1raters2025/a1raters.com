import mongoose from "mongoose";

const bonusSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["Training", "Auditor"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
  },
  { _id: false }
);

const bankDetailsSchema = new mongoose.Schema(
  {
    bankName: { type: String },
    accountNumber: { type: String },
    accountName: { type: String },
  },
  { _id: false }
);

const manualReportItemSchema = new mongoose.Schema(
  {
    profileName: { type: String, required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    proxy: {
      type: String,
      enum: ["US", "UK", "Japan", "China", "Germany", "France", "Canada", "Australia"],
    },
    dateRange: { type: String },
    hours: { type: String, required: true },
  },
  { _id: false }
);

const invoiceSchema = new mongoose.Schema(
  {
    raterName: {
      type: String,
      required: [true, "Rater name is required"],
    },
    type: {
      type: String,
      enum: ["Invoice", "Dispute"],
      required: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected", "Resolved", "Paid"],
      default: "Pending",
    },
    amount: { type: String },
    hours: { type: String },
    items: [manualReportItemSchema],
    bonuses: [bonusSchema],
    message: { type: String },
    bankDetails: bankDetailsSchema,
    date: {
      type: Date,
      default: Date.now,
    },
    month: { type: String },
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    reviewedAt: { type: Date },
    paymentDate: { type: Date },
  },
  {
    timestamps: true,
  }
);

invoiceSchema.index({ raterName: 1, date: -1 });
invoiceSchema.index({ status: 1 });
invoiceSchema.index({ month: 1 });

const Invoice = mongoose.model("Invoice", invoiceSchema);

export default Invoice;