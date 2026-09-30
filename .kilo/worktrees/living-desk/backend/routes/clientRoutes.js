import express from "express";
import auth from "../middlewares/auth.js";
import client from "../middlewares/clientMiddleware.js";
import {
  getClientDashboard,
  getReportsByEmail,
  getClientSummary,
  searchRaters,
} from "../controllers/clientController.js";

const Router = express.Router();

// All client routes require authentication and client role
Router.use(auth, client);

Router.route("/dashboard").get(getClientDashboard);
Router.route("/summary").get(getClientSummary);
Router.route("/search").get(searchRaters);
Router.route("/email/:email").get(getReportsByEmail);

export default Router;