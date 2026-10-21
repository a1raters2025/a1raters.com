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
      enum: ["Pending", "Approved", "Rejected", "Resolved", "Paid", "Reversed"],
      default: "Pending",
    },
    source: {
      type: String,
      enum: ["manual", "paystack_payout"],
      default: "manual",
    },
    reference: {
      type: String,
      trim: true,
    },
    payoutReference: {
      type: String,
      trim: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    userEmail: {
      type: String,
      lowercase: true,
      trim: true,
    },
    currency: {
      type: String,
      enum: ["NGN"],
      default: "NGN",
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
    reviewNote: { type: String, trim: true, maxlength: 1000, default: "" },
    paymentDate: { type: Date },
    reversedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

invoiceSchema.index({ raterName: 1, date: -1 });
invoiceSchema.index({ status: 1 });
invoiceSchema.index({ month: 1 });
invoiceSchema.index({ reference: 1 }, { unique: true, sparse: true });
invoiceSchema.index({ payoutReference: 1 }, { unique: true, sparse: true });
invoiceSchema.index({ userId: 1, date: -1 });

const Invoice = mongoose.model("Invoice", invoiceSchema);

export default Invoice;
