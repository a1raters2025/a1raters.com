// client checking middleware
const client = (req, res, next) => {
    if (req.user && (req.user.role === "client" || req.user.role === "admin")) {
        next()
    } else {
        res.status(403).json({
            status: "failed",
            message: "Unauthorized - Client access required"
        })
    }
}

export default client