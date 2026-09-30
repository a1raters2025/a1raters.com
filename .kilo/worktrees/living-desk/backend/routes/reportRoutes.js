import express from "express";
import auth from "../middlewares/auth.js";
import admin from "../middlewares/adminMiddleware.js";
import {
  createReport,
  bulkCreateReports,
  getAllReports,
  getReportById,
  getReportsByEmail,
  getReportsByRater,
  updateReport,
  updateReportStatus,
  deleteReport,
  getAccountSummary,
  getMonthlyStats,
} from "../controllers/reportController.js";

const Router = express.Router();

Router.route("/summary").get(auth, admin, getAccountSummary);

Router.route("/monthly-stats").get(auth, admin, getMonthlyStats);

Router.route("/")
  .get(auth, admin, getAllReports)
  .post(auth, createReport);

Router.route("/bulk").post(auth, bulkCreateReports);

Router.route("/email/:email").get(auth, getReportsByEmail);

Router.route("/rater/:raterName").get(auth, getReportsByRater);

Router.route("/:id")
  .get(auth, getReportById)
  .patch(auth, admin, updateReport)
  .delete(auth, admin, deleteReport);

Router.route("/:id/status").patch(auth, admin, updateReportStatus);

export default Router;