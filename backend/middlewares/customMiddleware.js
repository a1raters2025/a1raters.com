import express from "express"

const customMiddleware = (req,res,next) => {
    console.log("this is a custom middleware")
    next()
}

export default customMiddleware;