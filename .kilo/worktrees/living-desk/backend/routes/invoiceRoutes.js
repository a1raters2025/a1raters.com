import express from "express";
import auth from "../middlewares/auth.js";
import admin from "../middlewares/adminMiddleware.js";
import {
  createInvoice,
  getAllInvoices,
  getInvoiceById,
  getInvoicesByRater,
  updateInvoice,
  updateInvoiceStatus,
  deleteInvoice,
  getPendingInvoices,
} from "../controllers/invoiceController.js";

const Router = express.Router();

Router.route("/pending").get(auth, admin, getPendingInvoices);

Router.route("/")
  .get(auth, admin, getAllInvoices)
  .post(auth, createInvoice);

Router.route("/rater/:raterName").get(auth, getInvoicesByRater);

Router.route("/:id")
  .get(auth, getInvoiceById)
  .patch(auth, admin, updateInvoice)
  .delete(auth, admin, deleteInvoice);

Router.route("/:id/status").patch(auth, admin, updateInvoiceStatus);

export default Router;