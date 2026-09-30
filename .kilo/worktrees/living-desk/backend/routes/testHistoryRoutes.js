import express from "express";
import auth from "../middlewares/auth.js";
import admin from "../middlewares/adminMiddleware.js";
import {
  saveTestResult,
  getTestHistory,
  getTestHistoryByUser,
  getTestStats,
  getLeaderboard,
} from "../controllers/testHistoryController.js";

const Router = express.Router();

Router.route("/stats").get(auth, getTestStats);

Router.route("/leaderboard").get(auth, getLeaderboard);

Router.route("/")
  .get(auth, getTestHistory)
  .post(auth, saveTestResult);

Router.route("/user/:userId").get(auth, admin, getTestHistoryByUser);

export default Router;