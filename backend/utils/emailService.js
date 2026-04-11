const sgMail = require('@sendgrid/mail');
const nodemailer = require('nodemailer');

/**
 * FeeHub Multi-Provider Email Engine
 * Optimized for Performance & Reliability.
 * Uses SendGrid API by default (to bypass Cloud SMTP blocking)
 * Falls back to Gmail SMTP for local redundancy.
 */
const sendEmail = async (options) => {
    const senderEmail = process.env.EMAIL_USER || '';
    const senderName = 'FeeHub';

    console.log(`🔍 [EmailService] DEBUG START:`);
    console.log(`   - To: ${options.to}`);
    console.log(`   - From: ${senderEmail}`);
    console.log(`   - SG_KEY: ${process.env.SENDGRID_API_KEY ? 'Present (Hash: ' + process.env.SENDGRID_API_KEY.substring(0, 10) + '...)' : 'MISSING'}`);

    // Strategy 1: Attempt SendGrid API 
    if (process.env.SENDGRID_API_KEY) {
        try {
            console.log(`🚀 [EmailService] Strategy 1: Attempting SendGrid API...`);
            sgMail.setApiKey(process.env.SENDGRID_API_KEY.trim());

            const msg = {
                to: options.to,
                from: {
                    email: senderEmail.trim(),
                    name: senderName
                },
                replyTo: senderEmail.trim(),
                subject: options.subject,
                html: options.html,
                text: options.text || options.html.replace(/<[^>]*>?/gm, ''),
                headers: {
                    'Precedence': 'Bulk',
                    'X-Auto-Response-Suppress': 'OOF, AutoReply',
                    'List-Unsubscribe': `<mailto:${senderEmail}?subject=unsubscribe>`
                }
            };

            const [response] = await sgMail.send(msg);
            
            console.log(`✅ [EmailService] SendGrid Success! Status code: ${response.statusCode}`);
            console.log(`   - Message ID: ${response.headers['x-message-id']}`);
            return { success: true, provider: 'sendgrid' };
        } catch (error) {
            console.error("⚠️ [EmailService] SendGrid reported an error:");
            if (error.response) {
                console.error("   - Errors:", JSON.stringify(error.response.body.errors, null, 2));
            } else {
                console.error("   - Message:", error.message);
            }
            console.log("🔄 [EmailService] Trying fallback to SMTP...");
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

