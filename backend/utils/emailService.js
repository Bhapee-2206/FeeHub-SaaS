const nodemailer = require('nodemailer');
const sgMail = require('@sendgrid/mail');

/**
 * FeeHub Universal Email Engine
 * Uses SendGrid HTTP API for Reliable Cloud Deployment (Bypasses Port Blocks)
 * Uses Gmail SMTP for Localhost Development
 */
const sendEmail = async (options) => {
    // 1. PRIMARY: SendGrid API (Best for Deployment/Railway/Vercel)
    // SendGrid API uses HTTP (Port 443), which is NEVER blocked by cloud providers.
    if (process.env.SENDGRID_API_KEY) {
        try {
            sgMail.setApiKey(process.env.SENDGRID_API_KEY);
            const msg = {
                to: options.to,
                from: process.env.EMAIL_USER || 'noreply@feehub.com', 
                subject: options.subject,
                html: options.html,
            };
            const info = await sgMail.send(msg);
            console.log("✅ [SendGrid API] Email sent successfully");
            return info;
        } catch (error) {
            console.error("❌ [SendGrid API] Error:", error.response ? error.response.body : error.message);
            // If SendGrid fails, we don't return, we try the Gmail fallback below
        }
    }

    // 2. SECONDARY: Gmail SMTP (Good for Localhost, often blocked in Cloud)
    if (process.env.EMAIL_PASS && process.env.EMAIL_USER) {
        try {
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS
                }
            });

            const mailOptions = {
                from: options.from || `"FeeHub" <${process.env.EMAIL_USER}>`,
                to: options.to,
                subject: options.subject,
                html: options.html
            };

            const info = await transporter.sendMail(mailOptions);
            console.log("✅ [Gmail SMTP] Email sent successfully:", info.messageId);
            return info;
        } catch (error) {
            console.error("❌ [Gmail SMTP] Delivery failed. Reason:", error.message);
            throw error;
        }
    }

    // 3. FALLBACK: Log to console if no credentials found
    console.warn("⚠️ [EmailService] No credentials found. Email simulated for:", options.to);
    return { messageId: 'simulated-' + Date.now() };
};

module.exports = { sendEmail };
