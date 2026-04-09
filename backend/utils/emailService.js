const nodemailer = require('nodemailer');

/**
 * FeeHub Centralized Email Service
 * Configures transporter based on available environment variables.
 * Prioritizes Gmail if EMAIL_PASS is present, otherwise falls back to SendGrid.
 */
const createTransporter = () => {
    // If Gmail App Password is provided
    if (process.env.EMAIL_PASS && process.env.EMAIL_USER) {
        return nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });
    }

    // Fallback to SendGrid
    return nodemailer.createTransport({
        host: 'smtp.sendgrid.net',
        port: 587,
        auth: {
            user: 'apikey',
            pass: process.env.SENDGRID_API_KEY
        }
    });
};

const transporter = createTransporter();

const sendEmail = async (options) => {
    const mailOptions = {
        from: options.from || `"FeeHub" <${process.env.EMAIL_USER || 'noreply@feehub.com'}>`,
        to: options.to,
        subject: options.subject,
        html: options.html
    };

    return transporter.sendMail(mailOptions);
};

module.exports = { sendEmail };
