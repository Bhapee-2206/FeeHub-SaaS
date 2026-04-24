const sgMail = require('@sendgrid/mail');
const nodemailer = require('nodemailer');

// Pre-configure Nodemailer transporter using the requested "technique"
const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: parseInt(process.env.MAIL_PORT || '587'),
    secure: process.env.MAIL_PORT === '465', // true for 465, false for other ports
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
    },
});

/**
 * FeeHub Multi-Provider Email Engine
 * Main: Nodemailer (SMTP)
 * Fallback: SendGrid API
 */
const sendEmail = async (options) => {
    const fromName = options.fromName || process.env.MAIL_FROM_NAME || 'FeeHub';
    const fromEmail = process.env.MAIL_FROM || process.env.EMAIL_USER;

    console.log(`🔍 [EmailService] DEBUG START:`);
    console.log(`   - To: ${options.to}`);
    console.log(`   - Main Strategy: Nodemailer (${process.env.MAIL_HOST})`);

    // Strategy 1: Attempt Nodemailer (Main)
    try {
        console.log(`📧 [EmailService] Strategy 1: Attempting Nodemailer SMTP...`);
        
        const mailOptions = {
            from: `"${fromName}" <${fromEmail}>`,
            to: options.to,
            subject: options.subject,
            html: options.html,
            text: options.text || options.html.replace(/<[^>]*>?/gm, ''),
        };

        const info = await transporter.sendMail(mailOptions);
        console.log("✅ [EmailService] Nodemailer Success! Message ID:", info.messageId);
        return { success: true, provider: 'nodemailer', messageId: info.messageId };
    } catch (error) {
        console.error("⚠️ [EmailService] Nodemailer Failed:", error.message);
        
        // Strategy 2: Fallback to SendGrid API
        if (process.env.SENDGRID_API_KEY) {
            try {
                console.log(`🚀 [EmailService] Strategy 2: Attempting SendGrid Fallback...`);
                sgMail.setApiKey(process.env.SENDGRID_API_KEY.trim());

                const msg = {
                    to: options.to,
                    from: {
                        email: fromEmail.trim(),
                        name: fromName
                    },
                    replyTo: fromEmail.trim(),
                    subject: options.subject,
                    html: options.html,
                    text: options.text || options.html.replace(/<[^>]*>?/gm, ''),
                };

                const [response] = await sgMail.send(msg);
                console.log(`✅ [EmailService] SendGrid Fallback Success! Status code: ${response.statusCode}`);
                return { success: true, provider: 'sendgrid' };
            } catch (sgError) {
                console.error("❌ [EmailService] SendGrid Fallback also failed:");
                if (sgError.response) {
                    console.error("   - Errors:", JSON.stringify(sgError.response.body.errors, null, 2));
                } else {
                    console.error("   - Message:", sgError.message);
                }
                throw sgError;
            }
        } else {
            console.error("🚨 [EmailService] No fallback configured (Missing SendGrid API Key).");
            throw error;
        }
    }
};

module.exports = { sendEmail };
