import Invoice from "../models/Invoice.js";
import Report from "../models/Report.js";
import AppError from "../errors/AppError.js";

export const createInvoice = async (req, res, next) => {
  try {
    const invoiceData = {
      ...req.body,
      submittedBy: req.user._id,
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

export const getInvoiceById = async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate("submittedBy", "userName email")
      .populate("reviewedBy", "userName email");

    if (!invoice) {
      return next(new AppError("Invoice not found", 404));
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
    const invoices = await Invoice.find({ raterName }).sort({ createdAt: -1 });

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
    const invoice = await Invoice.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
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
    const { status } = req.body;
    const validStatuses = ["Pending", "Approved", "Rejected", "Resolved", "Paid"];

    if (!validStatuses.includes(status)) {
      return next(new AppError("Invalid status", 400));
    }

    const invoice = await Invoice.findByIdAndUpdate(
      req.params.id,
      {
        status,
        reviewedBy: req.user._id,
        reviewedAt: new Date(),
        ...(status === "Paid" && { paymentDate: new Date() }),
      },
      { new: true, runValidators: true }
    ).populate("reviewedBy", "userName email");

    if (!invoice) {
      return next(new AppError("Invoice not found", 404));
    }

    // If approved, convert invoice items to reports
    if (status === "Approved" && invoice.items && invoice.items.length > 0) {
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
        paymentDetails: invoice.bankDetails
          ? {
              bankName: invoice.bankDetails.bankName,
              accountNumber: invoice.bankDetails.accountNumber,
              accountName: invoice.bankDetails.accountName,
            }
          : undefined,
        submittedBy: req.user._id,
      }));

      await Report.insertMany(newReports);
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

export const deleteInvoice = async (req, res, next) => {
  try {
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