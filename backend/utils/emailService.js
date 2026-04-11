const nodemailer = require('nodemailer');

/**
 * FeeHub Email Engine (Gmail SMTP Edition)
 * Uses Gmail App Passwords for secure delivery.
 * Note: Ensure EMAIL_USER and EMAIL_PASS are set in your deployment dashboard.
 */
const sendEmail = async (options) => {
    const senderEmail = process.env.EMAIL_USER;
    const senderName = 'FeeHub';

    // Guard: Check for credentials
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.error("🚨 [EmailService] Missing EMAIL_USER or EMAIL_PASS in environment variables.");
        return { success: false, error: 'Missing credentials' };
    }

    console.log(`📧 Attempting Gmail SMTP delivery to: ${options.to}`);

    try {
        // Create Transporter optimized for Gmail
        // Note: 'service: gmail' automatically sets host, port, and secure settings.
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            pool: true, // Reuse connections
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        // Prepare Mail Options
        const mailOptions = {
            from: `"${senderName}" <${senderEmail}>`,
            to: options.to,
            subject: options.subject,
            html: options.html,
            text: options.text || options.html.replace(/<[^>]*>?/gm, '') // Auto-generate plain text
        };

        // Send the mail
        const info = await transporter.sendMail(mailOptions);
        
        console.log("✅ [Gmail SMTP] Message sent successfully:", info.messageId);
        return { 
            success: true, 
            provider: 'gmail', 
            messageId: info.messageId 
        };

    } catch (error) {
        console.error("❌ [Gmail SMTP] Critical Failure:");
        console.log("   - Full Error:", error);
        
        if (error.message.includes('EAUTH')) {
            console.error("   💡 TIP: Authentication failed. This usually means the 'App Password' is invalid or has been revoked.");
        } else if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
            console.error("   💡 TIP: Connection refused/timed out. Your hosting provider might be blocking SMTP (Port 465/587).");
        }

        throw error;
    }
};

module.exports = { sendEmail };

