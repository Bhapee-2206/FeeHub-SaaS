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
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            host: 'smtp.gmail.com',
            port: 465,
            secure: true, // Use SSL
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
        console.error("   - Reason:", error.message);
        
        if (error.message.includes('EAUTH')) {
            console.error("   💡 TIP: This is an Authentication error. Double-check your 16-character 'App Password'.");
        } else if (error.message.includes('ECONN') || error.message.includes('ETIMEDOUT')) {
            console.error("   💡 TIP: Connection failed. This usually means your hosting provider (Render/Railway) is blocking outgoing SMTP ports.");
        }

        throw error;
    }
};

module.exports = { sendEmail };

