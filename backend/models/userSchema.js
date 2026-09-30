import mongoose from "mongoose"
import validator from "validator"
import bcrypt from "bcrypt"

// create a variable that will hold the schema
let userSchema = new mongoose.Schema({
    image: {
        type: String,
        default: "efuhwudfhowdfsd9ufsdihfdu"
    },
    userName: {
        type: String,
        required: [true, "user name field is required"],
       
    },
    email: {
        type: String,
        required: [true, "Email field is required"],
        trim: true,
        unique: true,
        validate: {
            validator: (value) => validator.isEmail(value),
            message: "Please enter a valid email"
        }
    },
    proxy: {
        type: String,
        trim: true,
    },
      role:{
        type: String,
        enum: ["admin", "user", "client"],
        default: "user"
       
    },

    password: {
        type: String,
        required: [true, "Password field is required"],
        minLength: [6, "Password must be at least 6 characters long"],
        validate: {
            validator: function(value) {
                if (!value) return false;
                if (value.startsWith("$2")) return true;

                return validator.isStrongPassword(value, {
                    minLength: 6,
                    minLowercase: 1,
                    minUppercase: 1,
                    minNumbers: 1,
                    minSymbols: 1
                })
            },
            message: "Password must contain at least 6 characters, including uppercase, lowercase, number and symbol"
        }
    },

    createdAt: {
        type: Date,
        default: Date.now
    },

    isApproved: {
        type: Boolean,
        default: true
    },
     isVerified: {
        type: Boolean,
        default: false
    },
    verificationToken: {
        type: String
    },
    verificationTokenExpires: {
        type: Date
    },

    lastLoginAt: {
        type: Date,
        default: null,
    },
    lastLoginIp: {
        type: String,
        default: null,
    },
    lastSeenAt: {
        type: Date,
        default: null,
    },
    loginCount: {
        type: Number,
        default: 0,
    },

}, 
{
    timestamps: true
}
);

userSchema.pre("save", async function() {
    if (!this.isModified("password")) return;  //do not encrypt the password if the password has not been modified

    // if (this.password.startsWith("$2")) return; //do not encrypt the pawssword if the password starts with "$2"

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// create a model from the schema
// it is a convention to use capital letters for the variable name of the model

export const User = mongoose.model("User", userSchema)