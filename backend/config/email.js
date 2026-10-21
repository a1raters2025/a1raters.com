import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config({ path: "./.env" });

// create a transporter from nodemailer 
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtp.gmail.com", //smtp = simple mail transfer protocol
    port: Number(process.env.EMAIL_PORT || 587),  //or 465
    secure:process.env.NODE_ENV == "production"? true:false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Send verification email
export const sendVerificationEmail = async (user, verificationLink) => {
    try {
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: user.email,
            subject: "Verify your Email",
            html: `
                <h2>Welcome ${user.userName}!</h2>
                <p>Please click the button below to verify your email.</p>
                <button><a href="${verificationLink}">Verify Email</a></button>
            `
        });
    } catch (error) {
        console.error("Error sending verification email:", error);
        throw error;
    }
};

export const sendAccountDecisionEmail = async (user, decision, reason = "") => {
    const approved = decision === "approved";
    await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: approved ? "Your A1 Raters account is approved" : "Update on your A1 Raters account",
        text: approved
            ? `Hi ${user.userName}, your A1 Raters account has been approved. You can now sign in.`
            : `Hi ${user.userName}, your A1 Raters account was rejected.${reason ? ` Reason: ${reason}` : ""}`,
    });
};