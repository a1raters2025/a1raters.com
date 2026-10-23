import jwt from "jsonwebtoken"

const getExpiry = (value, fallback) => {
    const configured = value?.trim() || fallback;
    const seconds = Number(configured);
    return Number.isFinite(seconds) ? seconds : configured;
}

// generate access and rfresh token using JWT
export const accessToken = (payload) => {
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: getExpiry(process.env.JWT_ACCESS_EXPIRES_IN, "15m")})
}


export const refreshToken = (payload) => {
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: getExpiry(process.env.JWT_REFRESH_EXPIRES_IN, "7d") })
}
