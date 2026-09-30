import express from "express";
import upload from "../middlewares/uploadMiddleware.js";
import auth from "../middlewares/auth.js";
import admin from "../middlewares/adminMiddleware.js";
import { getTraining, uploadFile } from "../controllers/uploadController.js";

const Router = express.Router();

Router.route("/upload")
  .post(
    auth,
    admin,
    upload.single("file"),
    uploadFile
  );

Router.route("/training").get(auth, getTraining);

export default Router;