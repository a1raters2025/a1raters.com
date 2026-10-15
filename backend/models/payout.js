import mongoose from "mongoose";

const payoutSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        initiatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        amount: {
            type: Number,
            required: true,
            min: 0.01,
        },
        currency: {
            type: String,
            enum: ["NGN"],
            default: "NGN",
            required: true,
        },
        reference: {
            type: String,
            required: true,
            unique: true,
        },
        recipientCode: {
            type: String,
            required: true,
        },
        transferCode: {
            type: String,
            default: null,
        },
        status: {
            type: String,
            enum: ["initiating", "processing", "unknown", "success", "failed", "reversed", "cancelled"],
            default: "initiating",
            index: true,
        },
        paystackStatus: {
            type: String,
            default: null,
        },
        reason: {
            type: String,
            default: "Rater payout",
        },
        failureMessage: {
            type: String,
            default: null,
        },
        accountingApplied: {
            type: Boolean,
            default: false,
        },
        paidAt: {
            type: Date,
            default: null,
        },
    },
    { timestamps: true }
);

payoutSchema.index({ userId: 1, createdAt: -1 });

export const Payout = mongoose.model("Payout", payoutSchema);
export default Payout;
