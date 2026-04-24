require('dotenv').config();
const nodemailer = require('nodemailer');

/**
 * FeeHub Email Engine
 * Using Nodemailer (SMTP) as the exclusive provider.
 */

// Create transporter dynamically to ensure env variables are loaded
const getTransporter = () => {
    return nodemailer.createTransport({
        host: process.env.MAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.MAIL_PORT || '587'),
        secure: process.env.MAIL_PORT === '465', // true for 465, false for other ports
        auth: {
            user: process.env.MAIL_USER,
            pass: process.env.MAIL_PASS,
        },
    });
};

const sendEmail = async (options) => {
    const fromName = options.fromName || process.env.MAIL_FROM_NAME || 'FeeHub';
    const fromEmail = process.env.MAIL_FROM || process.env.MAIL_USER;

    console.log(`🔍 [EmailService] DEBUG START:`);
    console.log(`   - To: ${options.to}`);
    console.log(`   - Using Host: ${process.env.MAIL_HOST || 'smtp.gmail.com'}`);

    try {
        const transporter = getTransporter();
        
        const mailOptions = {
            from: `"${fromName}" <${fromEmail}>`,
            to: options.to,
            subject: options.subject,
            html: options.html,
            text: options.text || options.html.replace(/<[^>]*>?/gm, ''),
        };

        console.log(`📧 [EmailService] Attempting to send email via SMTP...`);
        const info = await transporter.sendMail(mailOptions);
        
        console.log("✅ [EmailService] Success! Message ID:", info.messageId);
        return { success: true, provider: 'nodemailer', messageId: info.messageId };
    } catch (error) {
        console.error("❌ [EmailService] Failed:", error.message);
        throw error;
    }
};

module.exports = { sendEmail };
