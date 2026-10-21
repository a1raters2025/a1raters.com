const errorMiddleware = (err, req, res, next) => {
    if (!(err instanceof Error)) {
        err = new Error(typeof err === "string" ? err : "Internal Server Error");
    }

    err.statusCode = err.statusCode || 500;

    err.status = err.status || "error";

    res.status(err.statusCode).json({

        success: false,

        status: err.status,

        message: err.message,

        stack:
            process.env.NODE_ENV === "development"
                ? err.stack
                : undefined

    });

};

export default errorMiddleware;