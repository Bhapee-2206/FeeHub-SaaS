const nodemailer = require('nodemailer');

/**
 * FeeHub Email Engine (Gmail SMTP Edition)
 * Optimized for reliability. Note: Works best in local environments.
 * Cloud hosts (Render/Railway) may block SMTP ports; use Gmail API if that happens.
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
        // Create Transporter using Gmail Service with Pooling
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            pool: true, // Reuse connections for speed
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        // Prepare Mail Options
        const mailOptions = {
            from: senderEmail, // Simpler from address often improves deliverability
            to: options.to,
            subject: options.subject,
            html: options.html,
            text: options.text || options.html.replace(/<[^>]*>?/gm, ''),
            headers: {
                'X-Priority': '1 (Highest)',
                'Importance': 'High',
                'X-Entity-Ref-ID': Date.now().toString() // Help prevent threading/folding
            }
        };

        // Send the mail
        const info = await transporter.sendMail(mailOptions);
        
        console.log("✅ [Gmail SMTP] Message sent successfully. ID:", info.messageId);
        return { 
            success: true, 
            provider: 'gmail', 
            messageId: info.messageId 
        };

    } catch (error) {
        console.error("❌ [Gmail SMTP] Critical Failure:");
        console.error("   - Reason:", error.message);
        
        if (error.message.includes('EAUTH')) {
            console.error("   💡 TIP: Authentication failed. Check your 'App Password'.");
        } else if (error.message.includes('ETIMEDOUT')) {
            console.error("   💡 TIP: Connection timed out. This often happens on Render/Railway due to blocked SMTP ports.");
        }

        throw error;
    }
};

module.exports = { sendEmail };

