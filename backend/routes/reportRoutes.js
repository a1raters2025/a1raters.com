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
  getMyReports,
  updateReport,
  updateReportStatus,
  deleteReport,
  getAccountSummary,
  getMonthlyStats,
  getDeletedReports,
  getReportAuditLog,
  getRaterPerformance,
} from "../controllers/reportController.js";

const Router = express.Router();

Router.route("/summary").get(auth, admin, getAccountSummary);

Router.route("/monthly-stats").get(auth, admin, getMonthlyStats);

Router.route("/audit-log" ).get(auth, admin, getReportAuditLog);

Router.route("/audit-log/:reportId").get(auth, admin, getReportAuditLog);

Router.route("/deleted").get(auth, admin, getDeletedReports);

Router.route("/my-reports").get(auth, getMyReports);

Router.route("/performance/:raterName").get(auth, admin, getRaterPerformance);

Router.route("/")
  .get(auth, admin, getAllReports)
  .post(auth, createReport);

Router.route("/bulk").post(auth, bulkCreateReports);

Router.route("/email/:email").get(auth, getReportsByEmail);

Router.route("/rater/:raterName").get(auth, getReportsByRater);

Router.route("/:id")
  .get(auth, getReportById)
  .patch(auth, admin, updateReport)
  .delete(auth, deleteReport);

Router.route("/:id/status").patch(auth, admin, updateReportStatus);

export default Router;
