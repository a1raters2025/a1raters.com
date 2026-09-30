import express from "express";
import auth from "../middlewares/auth.js";
import admin from "../middlewares/adminMiddleware.js";
import {
  createTask,
  getAllTasks,
  getTaskById,
  getTasksByCategory,
  updateTask,
  deleteTask,
  getCategories,
  getProxies,
  getRatingOptions,
  bulkCreateTasks,
} from "../controllers/taskController.js";

const Router = express.Router();

Router.route("/categories").get(auth, getCategories);

Router.route("/proxies").get(auth, getProxies);

Router.route("/ratings").get(auth, getRatingOptions);

Router.route("/")
  .get(auth, getAllTasks)
  .post(auth, admin, createTask);

Router.route("/bulk").post(auth, admin, bulkCreateTasks);

Router.route("/category/:category").get(auth, getTasksByCategory);
Router.route("/category/:category/:subCategory").get(auth, getTasksByCategory);

Router.route("/:id")
  .get(auth, getTaskById)
  .patch(auth, admin, updateTask)
  .delete(auth, admin, deleteTask);

export default Router;