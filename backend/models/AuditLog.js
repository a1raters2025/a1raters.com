import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    actionType: {
      type: String,
      required: [true, "Action type is required"],
      enum: ["create", "update", "delete", "status_change", "resubmit", "penalty_applied"],
    },
    reportId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Report",
      required: [true, "Report ID is required"],
    },
    fieldName: {
      type: String,
      required: [true, "Field name is required"],
    },
    oldValue: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    newValue: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Changed by is required"],
    },
    changedByName: {
      type: String,
      required: [true, "Changed by name is required"],
    },
    ipAddress: {
      type: String,
    },
    reason: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

auditLogSchema.index({ reportId: 1, createdAt: -1 });
auditLogSchema.index({ changedBy: 1, createdAt: -1 });
auditLogSchema.index({ actionType: 1, createdAt: -1 });

const AuditLog = mongoose.model("AuditLog", auditLogSchema);

export default AuditLog;
