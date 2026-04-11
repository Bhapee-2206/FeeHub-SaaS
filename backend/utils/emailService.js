const sgMail = require('@sendgrid/mail');
const nodemailer = require('nodemailer');

/**
 * FeeHub Multi-Provider Email Engine
 * Optimized for Performance & Reliability.
 * Uses SendGrid API by default (to bypass Cloud SMTP blocking)
 * Falls back to Gmail SMTP for local redundancy.
 */
const sendEmail = async (options) => {
    const senderEmail = process.env.EMAIL_USER;
    const senderName = 'FeeHub';

    // Strategy 1: Attempt SendGrid API (Fastest & most reliable on Render)
    if (process.env.SENDGRID_API_KEY) {
        try {
            console.log(`🚀 [EmailService] Attempting SendGrid API delivery to: ${options.to}`);
            sgMail.setApiKey(process.env.SENDGRID_API_KEY);

            const msg = {
                to: options.to,
                from: {
                    email: senderEmail,
                    name: senderName
                },
                subject: options.subject,
                html: options.html,
                text: options.text || options.html.replace(/<[^>]*>?/gm, '')
            };

            const [response] = await sgMail.send(msg);
            
            console.log("✅ [SendGrid API] Message sent instantly. Status:", response.statusCode);
            return { success: true, provider: 'sendgrid' };
        } catch (error) {
            console.error("⚠️ [SendGrid API] Failed. Falling back to SMTP...");
            if (error.response) console.error("   - Detail:", error.response.body.errors[0].message);
        }
    }

    // Strategy 2: Fallback to Gmail SMTP (May be blocked on Render, but works locally)
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        try {
            console.log(`📧 [EmailService] Attempting Gmail SMTP fallback to: ${options.to}`);
            
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                pool: true,
                connectionTimeout: 10000,
                family: 4,
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS
                }
            });

            const mailOptions = {
                from: `"${senderName}" <${senderEmail}>`,
                to: options.to,
                subject: options.subject,
                html: options.html
            };

            const info = await transporter.sendMail(mailOptions);
            console.log("✅ [Gmail SMTP] Message sent successfully:", info.messageId);
            return { success: true, provider: 'gmail' };
        } catch (error) {
            console.error("❌ [Gmail SMTP] Critical Failure:", error.message);
            throw error;
        }
    }

    console.error("🚨 [EmailService] No valid email configuration found (Missing keys).");
    return { success: false, error: 'No config' };
};

module.exports = { sendEmail };

