const nodemailer = require('nodemailer');

/**
 * FeeHub Centralized Email Service
 * Battle-tested for Localhost and High-Security Cloud Cloud Deployments.
 */
const createTransporter = () => {
    // 1. Prioritize Gmail if App Password exists
    if (process.env.EMAIL_PASS && process.env.EMAIL_USER) {
        return nodemailer.createTransport({
            service: 'gmail', // Let Nodemailer handle the optimal host/port for Gmail
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            },
            tls: {
                // Critical for some cloud deployments to prevent certificate handshake errors
                rejectUnauthorized: false
            }
        });
    }

    // 2. Fallback to SendGrid SMTP
    if (process.env.SENDGRID_API_KEY) {
        return nodemailer.createTransport({
            host: 'smtp.sendgrid.net',
            port: 587,
            auth: {
                user: 'apikey',
                pass: process.env.SENDGRID_API_KEY
            }
        });
    }

    // 3. Fallback to a "No-Op" transporter to prevent crashes
    return {
        sendMail: async (opts) => { 
            console.warn("⚠️ [EmailService] No credentials found. Email log:", opts.to, opts.subject);
            return { messageId: 'log-only-' + Date.now() };
        }
    };
};

const transporter = createTransporter();

const sendEmail = async (options) => {
    const mailOptions = {
        from: options.from || `"FeeHub" <${process.env.EMAIL_USER || 'noreply@feehub.com'}>`,
        to: options.to,
        subject: options.subject,
        html: options.html
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log("✅ [EmailService] Success:", info.messageId);
        return info;
    } catch (error) {
        console.error("❌ [EmailService] Error Details:");
        console.error("   To:", options.to);
        console.error("   Reason:", error.message);
        console.error("   Code:", error.code);
        console.error("   Advice: If deploying to Cloud (Railway/Vercel), Gmail may block the request. Use SendGrid API instead.");
        throw error;
    }
};

module.exports = { sendEmail };
