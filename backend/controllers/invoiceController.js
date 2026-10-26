import Invoice from "../models/Invoice.js";
import Report from "../models/Report.js";
import AppError from "../errors/AppError.js";
import { emitAdminUpdate } from "../utils/socket.js";

const getOwnedInvoiceFilter = (user) => ({
  $or: [
    { userId: user._id },
    { submittedBy: user._id },
    { userId: { $in: [null] }, submittedBy: { $in: [null] }, userEmail: String(user.email || "").toLowerCase() },
  ],
});

export const createInvoice = async (req, res, next) => {
  try {
    const invoiceFields = { ...req.body };
    delete invoiceFields.bankDetails;
    const invoiceData = {
      ...invoiceFields,
      raterName: req.user.role === "admin" ? req.body.raterName : req.user.userName,
      submittedBy: req.user._id,
      userId: req.user._id,
      userEmail: req.user.email,
      source: "manual",
      reference: undefined,
      payoutReference: undefined,
      bonuses: Array.isArray(req.body.bonuses)
        ? req.body.bonuses.map((bonus) => ({ ...bonus, status: "Pending", reviewNote: "", reviewedBy: undefined, reviewedAt: undefined }))
        : req.body.bonuses,
    };

    // Calculate total amount
    let total = 0;

    if (invoiceData.hours) {
      total += Number(invoiceData.hours) * 2000;
    }

    if (invoiceData.items) {
      invoiceData.items.forEach((item) => {
        total += Number(item.hours) * 2000;
      });
    }

    if (invoiceData.bonuses) {
      invoiceData.bonuses.forEach((b) => (total += b.amount));
    }

    invoiceData.amount = total.toString();

    const invoice = await Invoice.create(invoiceData);

    emitAdminUpdate({
      title: "New payment request",
      message: `${invoice.raterName} submitted a ${invoice.type.toLowerCase()} for review.`,
      type: "info",
      targetRoles: ["admin"],
    });

    res.status(201).json({
      status: "success",
      message: "Invoice submitted successfully",
      data: invoice,
    });
  } catch (err) {
    next(err);
  }
};

export const getAllInvoices = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, raterName, status, type, month } = req.query;

    const filter = {};
    if (raterName) filter.raterName = raterName;
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (month) filter.month = month;

    const skip = (Number(page) - 1) * Number(limit);

    const invoices = await Invoice.find(filter)
      .populate("submittedBy", "userName email")
      .populate("reviewedBy", "userName email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Invoice.countDocuments(filter);

    res.status(200).json({
      status: "success",
      message: "Invoices retrieved successfully",
      data: invoices,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        totalItems: total,
        itemsPerPage: Number(limit),
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getMyInvoices = async (req, res, next) => {
  try {
    const invoices = await Invoice.find({
      ...getOwnedInvoiceFilter(req.user),
    })
      .populate("submittedBy", "userName email")
      .populate("reviewedBy", "userName email")
      .sort({ date: -1, createdAt: -1 });

    res.status(200).json({
      status: "success",
      message: "Your invoices retrieved successfully",
      data: invoices,
    });
  } catch (err) {
    next(err);
  }
};

export const getInvoiceById = async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate("submittedBy", "userName email")
      .populate("reviewedBy", "userName email");

    if (!invoice) {
      return next(new AppError("Invoice not found", 404));
    }

    const isOwner = [invoice.userId, invoice.submittedBy?._id || invoice.submittedBy]
      .some((ownerId) => ownerId?.toString() === req.user._id.toString()) ||
      (!invoice.userId && !invoice.submittedBy &&
        invoice.userEmail?.toLowerCase() === String(req.user.email || "").toLowerCase());
    if (req.user.role !== "admin" && !isOwner) {
      return next(new AppError("You do not have access to this invoice", 403));
    }

    res.status(200).json({
      status: "success",
      message: "Invoice retrieved successfully",
      data: invoice,
    });
  } catch (err) {
    next(err);
  }
};

export const getInvoicesByRater = async (req, res, next) => {
  try {
    const { raterName } = req.params;
    if (req.user.role !== "admin" && raterName !== req.user.userName) {
      return next(new AppError("You can only view your own invoices", 403));
    }
    const filter = req.user.role === "admin"
      ? { raterName }
      : { raterName, ...getOwnedInvoiceFilter(req.user) };
    const invoices = await Invoice.find(filter).sort({ createdAt: -1 });

    res.status(200).json({
      status: "success",
      message: "Invoices retrieved successfully",
      data: invoices,
    });
  } catch (err) {
    next(err);
  }
};

export const updateInvoice = async (req, res, next) => {
  try {
    const existingInvoice = await Invoice.findById(req.params.id);
    if (!existingInvoice) {
      return next(new AppError("Invoice not found", 404));
    }
    if (existingInvoice.source === "paystack_payout") {
      return next(new AppError("Paystack payout receipts cannot be edited", 409));
    }

    const invoiceFields = { ...req.body };
    delete invoiceFields.bankDetails;
    const invoice = await Invoice.findByIdAndUpdate(req.params.id, invoiceFields, {
      returnDocument: 'after',
      runValidators: true,
    }).populate("submittedBy", "userName email");

    if (!invoice) {
      return next(new AppError("Invoice not found", 404));
    }

    // Recalculate amount if items or bonuses changed
    let total = 0;
    if (invoice.hours) total += Number(invoice.hours) * 2000;
    if (invoice.items) {
      invoice.items.forEach((item) => (total += Number(item.hours) * 2000));
    }
    if (invoice.bonuses) {
      invoice.bonuses.forEach((b) => (total += b.amount));
    }
    invoice.amount = total.toString();
    await invoice.save();

    res.status(200).json({
      status: "success",
      message: "Invoice updated successfully",
      data: invoice,
    });
  } catch (err) {
    next(err);
  }
};

export const updateInvoiceStatus = async (req, res, next) => {
  try {
    const { status, reason = "" } = req.body;
    const validStatuses = ["Pending", "Approved", "Rejected", "Resolved", "Paid", "Reversed"];

    if (!validStatuses.includes(status)) {
      return next(new AppError("Invalid status", 400));
    }
    if (typeof reason !== "string" || reason.length > 1000) {
      return next(new AppError("Reason must be 1000 characters or fewer", 400));
    }
    if (status === "Rejected" && !reason.trim()) {
      return next(new AppError("A reason is required when rejecting an invoice", 400));
    }

    const existingInvoice = await Invoice.findById(req.params.id);
    if (!existingInvoice) {
      return next(new AppError("Invoice not found", 404));
    }
    if (existingInvoice.source === "paystack_payout") {
      return next(new AppError("Paystack payout receipt status is managed by Paystack", 409));
    }

    let invoice;
    const settledAmount = () => {
      let total = Number(existingInvoice.hours || 0) * 2000;
      for (const item of existingInvoice.items || []) total += Number(item.hours || 0) * 2000;
      for (const bonus of existingInvoice.bonuses || []) {
        if (bonus.status === "Approved") total += Number(bonus.amount || 0);
      }
      return String(total);
    };
    const amountUpdate = status === "Approved" || status === "Paid" ? { amount: settledAmount() } : {};
    if (status === "Approved") {
      invoice = await Invoice.findByIdAndUpdate(
        req.params.id,
        {
          status,
          reviewedBy: req.user._id,
          reviewedAt: new Date(),
          reviewNote: reason.trim(),
          ...amountUpdate,
        },
        { returnDocument: 'after', runValidators: true }
      ).populate("reviewedBy", "userName email");
    } else {
      invoice = await Invoice.findByIdAndUpdate(
        req.params.id,
        {
          status,
          reviewedBy: req.user._id,
          reviewedAt: new Date(),
          reviewNote: reason.trim(),
          ...(status === "Paid" && { paymentDate: new Date() }),
          ...amountUpdate,
        },
        { returnDocument: 'after', runValidators: true }
      ).populate("reviewedBy", "userName email");
    }

    if (!invoice) {
      return next(new AppError("Invoice not found", 404));
    }

    // If approved, convert invoice items to reports
    if (status === "Approved" && invoice.items && invoice.items.length > 0 &&
        await Report.countDocuments({ invoiceId: invoice._id }) === 0) {
      const newReports = invoice.items.map((item) => ({
        raterName: invoice.raterName,
        profileName: item.profileName,
        email: item.email,
        category: "Manual Invoice",
        proxy: item.proxy || "US",
        status: "Active",
        tasksWorked: "0",
        hoursWorked: item.hours,
        date: invoice.date,
        submittedBy: invoice.userId || req.user._id,
        invoiceId: invoice._id,
      }));

      await Report.insertMany(newReports);
    }

    if (existingInvoice.status !== status) {
      emitAdminUpdate({
        title: `Payment ${status.toLowerCase()}`,
        message: `Your ${invoice.type.toLowerCase()} has been ${status.toLowerCase()}.${invoice.reviewNote ? ` Reason: ${invoice.reviewNote}` : ""}`,
        type: status === "Approved" || status === "Paid" ? "success" : status === "Rejected" ? "warning" : "info",
        targetUserId: (invoice.userId || invoice.submittedBy?._id || invoice.submittedBy)?.toString(),
        targetRoles: ["admin"],
      });
    }

    res.status(200).json({
      status: "success",
      message: `Invoice status updated to ${status}`,
      data: invoice,
    });
  } catch (err) {
    next(err);
  }
};

export const updateInvoiceBonusStatus = async (req, res, next) => {
  try {
    const { status, reason = "" } = req.body;
    const type = req.params.type;
    if (!["Training", "Auditor"].includes(type)) return next(new AppError("Invalid bonus type", 400));
    if (!["Approved", "Rejected"].includes(status)) return next(new AppError("Bonus status must be Approved or Rejected", 400));
    if (typeof reason !== "string" || reason.length > 1000) return next(new AppError("Reason must be 1000 characters or fewer", 400));
    if (status === "Rejected" && !reason.trim()) return next(new AppError("A reason is required to reject a bonus", 400));

    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return next(new AppError("Invoice not found", 404));
    if (invoice.source === "paystack_payout") return next(new AppError("Paystack payout receipts do not contain reviewable bonuses", 409));
    if (invoice.status === "Paid" || invoice.status === "Reversed") return next(new AppError("Bonuses cannot be reviewed after payment", 409));
    const bonus = invoice.bonuses.find((item) => item.type === type);
    if (!bonus) return next(new AppError(`${type} bonus was not submitted`, 404));

    bonus.status = status;
    bonus.reviewNote = reason.trim();
    bonus.reviewedBy = req.user._id;
    bonus.reviewedAt = new Date();

    if (invoice.status === "Approved") {
      let total = Number(invoice.hours || 0) * 2000;
      for (const item of invoice.items || []) total += Number(item.hours || 0) * 2000;
      for (const item of invoice.bonuses || []) if (item.status === "Approved") total += Number(item.amount || 0);
      invoice.amount = String(total);
    }
    await invoice.save();

    emitAdminUpdate({
      title: `Bonus ${status.toLowerCase()}`,
      message: `Your ${type.toLowerCase()} bonus on the ${invoice.type.toLowerCase()} was ${status.toLowerCase()}.${reason.trim() ? ` Reason: ${reason.trim()}` : ""}`,
      type: status === "Approved" ? "success" : "warning",
      targetUserId: (invoice.userId || invoice.submittedBy)?.toString(),
      targetRoles: ["admin"],
    });
    res.status(200).json({ status: "success", message: `${type} bonus ${status.toLowerCase()}`, data: invoice });
  } catch (err) {
    next(err);
  }
};

export const deleteInvoice = async (req, res, next) => {
  try {
    const existingInvoice = await Invoice.findById(req.params.id);
    if (!existingInvoice) {
      return next(new AppError("Invoice not found", 404));
    }
    if (existingInvoice.source === "paystack_payout") {
      return next(new AppError("Paystack payout receipts cannot be deleted", 409));
    }

    const invoice = await Invoice.findByIdAndDelete(req.params.id);

    if (!invoice) {
      return next(new AppError("Invoice not found", 404));
    }

    res.status(200).json({
      status: "success",
      message: "Invoice deleted successfully",
    });
  } catch (err) {
    next(err);
  }
};

export const getPendingInvoices = async (req, res, next) => {
  try {
    const { raterName, email } = req.query;

    const filter = { status: "Pending" };
    if (raterName) filter.raterName = raterName;
    if (email) filter["items.email"] = email.toLowerCase();

    const invoices = await Invoice.find(filter)
      .populate("submittedBy", "userName email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: "success",
      message: "Pending invoices retrieved successfully",
      data: invoices,
    });
  } catch (err) {
    next(err);
  }
};
