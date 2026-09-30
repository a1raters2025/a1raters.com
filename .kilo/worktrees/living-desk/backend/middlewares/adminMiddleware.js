// admin checking middleware
const admin = (req, res, next) =>{
    if(req.user && req.user?.role === "admin"){
        next()
    }else{
        res.status(403).json({
            status: "failed",
            message: " unauthorized not an admin"
        })
    }
}

export default admin