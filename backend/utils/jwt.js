import jwt from "jsonwebtoken"

// generate access and rfresh token using JWT
export const accessToken = (payload) => {
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "10s" })
}


export const refreshToken = (payload) => {
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "10s" })
}
