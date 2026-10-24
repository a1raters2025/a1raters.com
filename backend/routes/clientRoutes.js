import express from "express";
import auth from "../middlewares/auth.js";
import client from "../middlewares/clientMiddleware.js";
import {
  getClientDashboard,
  getClientReports,
} from "../controllers/clientController.js";

const Router = express.Router();

// All client routes require authentication and client role
Router.use(auth, client);

Router.route("/dashboard").get(getClientDashboard);
Router.route("/reports").get(getClientReports);

export default Router;
