import dotenv from "dotenv"
import errorMiddleware from "./middlewares/errorMiddleware.js";

dotenv.config({
    path: "./.env"
})

import express from "express"
import userRouter from "./routes/userRoutes.js"
import taskRouter from "./routes/taskRoutes.js"
import reportRouter from "./routes/reportRoutes.js"
import invoiceRouter from "./routes/invoiceRoutes.js"
import testHistoryRouter from "./routes/testHistoryRoutes.js"
import clientRouter from "./routes/clientRoutes.js"
import adminRouter from "./routes/adminRoutes.js"
import activityLogger from "./middlewares/activityLogger.js"
import morgan from "morgan"
import connect from "./utils/db.js"
import cors from "cors"
import cookieParser from "cookie-parser"
import rateLimit from "express-rate-limit"
import helmet from "helmet"
import mongoSanitize from "express-mongo-sanitize"
import hpp from "hpp"
import uploadRoutes from "./routes/uploadRoutes.js";
import { createServer } from "http";
import { Server as SocketServer } from "socket.io";
import { initializeSocket } from "./utils/socket.js";

const app = express();
const httpServer = createServer(app);
const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  if (process.env.NODE_ENV !== "production" && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return true;
  return [process.env.CLIENT_URL, "https://a1raters.com", "https://www.a1raters.com"].filter(Boolean).includes(origin);
};
const io = new SocketServer(httpServer, {
  cors: { origin: (origin, callback) => callback(null, isAllowedOrigin(origin)), credentials: true },
});
initializeSocket(io);

// Security Middlewares
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false,
}));

app.use(hpp({
  whitelist: ["category", "subCategory", "mode", "page", "limit", "sort"],
}));

app.use(cors({
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) return callback(null, true);
      return callback(new Error("Origin is not allowed by CORS"));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'PUT', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.urlencoded({ extended: true, limit: "10kb" }));

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: {
      status: "fail",
      message: "Too many requests from this IP, please try again later.",
    },
    standardHeaders: true,
    legacyHeaders: false,
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: process.env.NODE_ENV === 'production' ? 10 : 100,
    message: {
        status: "fail",
        message: "Too many authentication attempts, please try again later.",
    },
    skip: (req) => process.env.NODE_ENV !== 'production',
});

app.use(express.json({ limit: "10kb" }));

// express-mongo-sanitize 2.x assigns to req.query, which Express 5 exposes
// as a read-only getter. Sanitize mutable request objects and update query
// keys in place to preserve compatibility with Express 5.
app.use((req, res, next) => {
  if (req.body) req.body = mongoSanitize.sanitize(req.body);
  if (req.headers) Object.assign(req.headers, mongoSanitize.sanitize(req.headers));
  if (req.query) {
    const sanitizedQuery = mongoSanitize.sanitize(req.query);
    Object.keys(req.query).forEach((key) => delete req.query[key]);
    Object.assign(req.query, sanitizedQuery);
  }
  next();
});

app.use(morgan('dev'))
app.use(cookieParser())
app.use(limiter)

app.use(activityLogger)

app.use("/api/v1/user", authLimiter, userRouter)
app.use("/api/v1/tasks", taskRouter)
app.use("/api/v1/reports", reportRouter)
app.use("/api/v1/invoices", invoiceRouter)
app.use("/api/v1/test-history", testHistoryRouter)
app.use("/api/v1/client", clientRouter)
app.use("/api/v1/admin", adminRouter)
app.use("/api/v1/files", uploadRoutes);

app.use((req, res) => {
    res.status(404).json({ status: 'fail', message: 'Route not found' });
});

app.get("/api/v1/health", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "Server is healthy",
    timestamp: new Date().toISOString(),
  });
});

app.use(errorMiddleware);


connect();
// creating a server using express
let PORT = process.env.PORT
httpServer.listen(PORT, ()=>{
    console.log(`Server connected on port: ${PORT}`)
})