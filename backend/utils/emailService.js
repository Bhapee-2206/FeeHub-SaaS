const sgMail = require('@sendgrid/mail');

/**
 * FeeHub Email Engine (SendGrid API Edition)
 * Optimized for Hosting Providers like Render/Railway that block SMTP ports.
 * Uses HTTP Port 443 to bypass firewall restrictions.
 */
const sendEmail = async (options) => {
    // Guard: Check for SendGrid API Key
    if (!process.env.SENDGRID_API_KEY) {
        console.error("🚨 [EmailService] Missing SENDGRID_API_KEY in environment variables.");
        return { success: false, error: 'Missing API Key' };
    }

    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    const senderEmail = process.env.EMAIL_USER || 'bhapeestudios@gmail.com';
    const senderName = 'FeeHub';

    console.log(`📧 Attempting SendGrid API delivery to: ${options.to}`);

    try {
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
        
        console.log("✅ [SendGrid API] Message sent successfully. Status:", response.statusCode);
        return { 
            success: true, 
            provider: 'sendgrid', 
            statusCode: response.statusCode 
        };

    } catch (error) {
        console.error("❌ [SendGrid API] Critical Failure:");
        
        if (error.response) {
            console.error("   - Status:", error.response.body.errors[0].message);
            console.log("   💡 TIP: SendGrid returned an error. Ensure your 'EMAIL_USER' is a Verified Sender in SendGrid.");
        } else {
            console.error("   - Reason:", error.message);
        }

        throw error;
    }
};

module.exports = { sendEmail };

