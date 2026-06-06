import nodemailer from "nodemailer";

// Create transporter
const transporter = nodemailer.createTransport({
  service: "gmail", // or "smtp"
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Send email function
export async function sendEmail({ to, subject, html }) {
  try {
    const mailOptions = {
      from: `"Covenant Watch" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    };

    const result = await transporter.sendMail(mailOptions);

    console.log("📧 Email sent:", result.messageId);
    return result;
  } catch (error) {
    console.error("❌ Email sending failed:", error.message);
    throw error;
  }
}