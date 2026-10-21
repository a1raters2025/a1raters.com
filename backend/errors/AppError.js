class AppError extends Error {

    constructor(message, statusCode) {

        super(message);

        this.statusCode = statusCode;

        this.status = `${statusCode}`.startsWith("4")
            ? "fail"
            : "error";

        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }

}

export default AppError;

// explain the code above
// The code above defines a custom error class called `AppError` that extends the built-in `Error` class in JavaScript. This class is designed to handle application-specific errors in a more structured way. Here's a breakdown of its components:
// 1. **Constructor**: The constructor takes two parameters: `message` (a string describing the error) and `statusCode` (an HTTP status code associated with the error). It calls the parent class's constructor with the message. 
