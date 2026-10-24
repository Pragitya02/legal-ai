// =====================================================
// RESEND EMAIL SERVICE
// =====================================================

const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);


// =====================================================
// SEND OTP EMAIL
// =====================================================

async function sendOtpEmail(toEmail, otpCode, purpose = "signup") {

    const subject =
        purpose === "signup"
            ? "Verify your email — NyayaAI"
            : "Your NyayaAI verification code";

    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">

            <h2 style="color:#1E1B4B;">NyayaAI</h2>

            <p>
                Use the code below to verify your email address
                and finish creating your account.
            </p>

            <div style="
                font-size: 32px;
                font-weight: 700;
                letter-spacing: 8px;
                background:#F1F5F9;
                padding:16px 20px;
                border-radius:10px;
                text-align:center;
                margin:20px 0;
            ">
                ${otpCode}
            </div>

            <p style="color:#64748B; font-size:13px;">
                This code expires in 10 minutes.
                If you didn't request this, you can safely ignore this email.
            </p>

        </div>
    `;

    const { data, error } = await resend.emails.send({
        from: "NyayaAI <no-reply@nyayaai.online>",
        to: [toEmail],
        subject: subject,
        html: html,
        text: `Your NyayaAI verification code is ${otpCode}. It expires in 10 minutes.`
    });

    if (error) {
        console.error("RESEND EMAIL ERROR:", error);
        throw new Error(error.message || "Failed to send OTP email");
    }

    console.log("OTP email sent successfully:", data);

    return data;
}


// =====================================================
// SEND PASSWORD RESET OTP EMAIL
// =====================================================

async function sendPasswordResetOtpEmail(toEmail, otpCode, role = "citizen") {

    const portalName = role === "lawyer" ? "Advocate Portal" : "Citizen Portal";

    const subject = "Reset your NyayaAI password";

    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">

            <h2 style="color:#1E1B4B;">NyayaAI</h2>

            <p>
                We received a request to reset the password for your
                <strong>${portalName}</strong> account.
            </p>

            <p>Use the code below to continue:</p>

            <div style="
                font-size: 32px;
                font-weight: 700;
                letter-spacing: 8px;
                background:#F1F5F9;
                padding:16px 20px;
                border-radius:10px;
                text-align:center;
                margin:20px 0;
            ">
                ${otpCode}
            </div>

            <p style="color:#64748B; font-size:13px;">
                This code expires in 10 minutes. If you did not request a password reset,
                you can safely ignore this email.
            </p>

        </div>
    `;

    const { data, error } = await resend.emails.send({
        from: "NyayaAI <no-reply@nyayaai.online>",
        to: [toEmail],
        subject,
        html,
        text: `Your NyayaAI password reset code is ${otpCode}. It expires in 10 minutes.`,
    });

    if (error) {
        console.error("RESEND PASSWORD RESET ERROR:", error);
        throw new Error(error.message || "Failed to send password reset email");
    }

    console.log("Password reset email sent successfully:", data);

    return data;
}


// =====================================================
// EXPORT
// =====================================================

module.exports = {
    sendOtpEmail,
    sendPasswordResetOtpEmail
};