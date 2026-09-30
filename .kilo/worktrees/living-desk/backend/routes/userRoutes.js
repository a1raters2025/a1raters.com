import express from "express"
import auth from "../middlewares/auth.js"
import upload from "../middlewares/uploadMiddleware.js"
import { 
    addUser, 
    registerWithGoogle,
    getCountries,
    loginUser, 
    logoutUser,
    profile, 
    getAllUsers, 
    updateUser, 
    deleteUser, 
    verifyEmail, 
    refreshTokenRoute, 
    getLimitedUser, 
    getFilteredUsers, 
    sortUsers, 
    getPage,
    addAdmin } from "../controllers/userController.js"
import admin from "../middlewares/adminMiddleware.js"

const Router = express.Router()

Router.route('/users')
    .get(auth, admin, getAllUsers)

Router.route('/register')
    .post(upload.single("image"), addUser)

Router.route('/admin/register')
    .post(addAdmin)

Router.route('/google')
    .post(registerWithGoogle)

Router.route('/countries')
    .get(getCountries)

Router.route('/login')
    .post(loginUser)

Router.route('/profile')
    .get(auth, profile)

Router.route('/logout')
    .post(auth, logoutUser)

Router.route('/verify-email/:token')
    .get(verifyEmail)

Router.route('/:email')
    .patch(auth, updateUser)
    .delete(auth, deleteUser)

Router.route('/refresh-token')
.post(refreshTokenRoute)

Router.route('/users/limit')
.get(auth, admin, getLimitedUser)

Router.route('/users/filter')
.get(auth, admin, getFilteredUsers)

Router.route('/users/sort')
.get(auth, admin, sortUsers)

Router.route('/users/page')
.get(auth, admin, getPage)



export default Router

