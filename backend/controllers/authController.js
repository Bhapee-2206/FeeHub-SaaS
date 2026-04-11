const Institution = require('../models/institution');
const User = require('../models/user');
const Student = require('../models/student');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// @desc    Register a new institution and its admin
// @route   POST /api/auth/register
const registerInstitution = async (req, res, next) => {
    try {
        const { institutionName, adminName, email, password } = req.body;

        // 1. Check if the user already exists
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ success: false, message: 'Email is already registered' });
        }

        // 2. Create the new Institution
        const institution = await Institution.create({
            name: institutionName,
            email: email
        });

        // 3. Scramble (Hash) the password for security
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 4. Create the Admin User and link them to the new Institution
        const user = await User.create({
            institutionId: institution._id,
            name: adminName,
            email: email,
            password: hashedPassword,
            role: 'InstitutionAdmin' // First user is always the Admin
        });

        // 5. Generate the JWT (Digital Key)
        const token = jwt.sign(
            { id: user._id, role: user.role, institutionId: institution._id },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        // 6. Send the success response
        res.status(201).json({
            success: true,
            message: 'Institution registered successfully!',
            token,
            data: {
                institution: institution.name,
                admin: user.name,
                role: user.role
            }
        });

    } catch (error) {
        next(error); // Sends error to your global error handler in server.js
    }
};

// @desc    Login a user
// @route   POST /api/auth/login
const loginUser = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        // 1. Find the user and grab their hashed password
        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }

        // 2. Check if the typed password matches the hashed password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }

        // 🔥 NEW: Check if their Institution has been disabled by HQ SuperAdmin
        if (user.role !== 'SuperAdmin' && user.institutionId) {
            const institution = await Institution.findById(user.institutionId);
            if (institution && institution.isActive === false) {
                return res.status(403).json({ success: false, message: 'Account suspended by System Director. Contact HQ.' });
            }
        }

        // 3. Generate the JWT
        const token = jwt.sign(
            { id: user._id, role: user.role, institutionId: user.institutionId },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.status(200).json({
            success: true,
            token,
            data: { id: user._id, name: user.name, role: user.role }
        });

    } catch (error) {
        next(error);
    }
};

// @desc    Forgot Password - Sends email with reset token
// @route   POST /api/auth/forgot-password
const forgotPassword = async (req, res, next) => {
    let email = '';
    try {
        email = req.body.email ? req.body.email.trim().toLowerCase() : '';
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ success: false, message: 'There is no user with that email' });
        }

        // Generate a random token
        const resetToken = crypto.randomBytes(20).toString('hex');

        // Hash it and save to database with a 60-minute expiration
        user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        user.resetPasswordExpire = Date.now() + 60 * 60 * 1000;
        await user.save({ validateBeforeSave: false });

        // Create the reset URL pointing to your frontend
        const protocol = req.headers['x-forwarded-proto'] || req.protocol;
        const host = req.headers['x-forwarded-host'] || req.get('host');
        const resetUrl = `${protocol}://${host}/reset-password.html?token=${resetToken}`;

        // Configure the email to be sent
        const message = {
            to: user.email.trim(),
            subject: 'Reset Your FeeHub Password',
            html: `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset</title>
</head>
<body style="margin:0;padding:20px 0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <div style="max-width:550px;margin:20px auto;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);">
        <div style="background-color:#0f172a;padding:40px;text-align:center;">
            <div style="display:inline-block;background-color:#2563eb;padding:10px 15px;border-radius:8px;color:#ffffff;font-weight:900;font-size:18px;">FH</div>
            <h1 style="color:#ffffff;font-size:24px;margin:20px 0 0;letter-spacing:-0.5px;">Password Reset</h1>
        </div>
        <div style="padding:40px;color:#334155;line-height:1.6;">
            <p style="margin-top:0;">Hi <strong>${user.name || 'there'}</strong>,</p>
            <p>We received a request to reset your FeeHub password. Clicking the button below will take you to a secure page to set a new password:</p>
            
            <div style="text-align:center;margin:35px 0;">
                <a href="${resetUrl}" style="display:inline-block;background-color:#2563eb;color:#ffffff;padding:16px 36px;text-decoration:none;border-radius:8px;font-weight:700;font-size:16px;">Set New Password</a>
            </div>

            <div style="background-color:#f1f5f9;border-radius:8px;padding:15px 20px;border:1px solid #e2e8f0;margin-bottom:25px;">
                <p style="margin:0;font-size:13px;color:#64748b;">
                    <strong>Notice:</strong> This link expires in 10 minutes. If you did not request this, please ignore this email.
                </p>
            </div>

            <p style="font-size:12px;color:#94a3b8;margin-bottom:0;">
                If you're having trouble clicking the button, copy and paste this URL into your browser:<br>
                <a href="${resetUrl}" style="color:#2563eb;word-break:break-all;">${resetUrl}</a>
            </p>
        </div>
        <div style="background-color:#f8fafc;padding:20px;text-align:center;border-top:1px solid #e2e8f0;">
            <p style="margin:0;font-size:12px;color:#94a3b8;">&copy; ${new Date().getFullYear()} FeeHub SaaS</p>
        </div>
    </div>
</body>
</html>
            `
        };

        // Send the email and wait for completion to catch errors
        const { sendEmail } = require('../utils/emailService');
        await sendEmail(message);

        res.status(200).json({ success: true, message: 'Reset link sent to your email.' });

    } catch (error) {
        console.error('Forgot Password Error:', error.message);
        // If email fails, clear the database token so they can try again
        try {
            const user = await User.findOne({ email });
            if (user) {
                user.resetPasswordToken = undefined;
                user.resetPasswordExpire = undefined;
                await user.save({ validateBeforeSave: false });
            }
        } catch (dbError) {
            console.error('Database cleanup after email failure failed:', dbError.message);
        }
        
        res.status(500).json({ 
            success: false, 
            message: error.message.includes('EAUTH') ? 'Email authentication failed. Contact developer.' : 'Email could not be sent. Please try again later.'
        });
    }
};

// @desc    Reset Password
// @route   PUT /api/auth/reset-password/:token
const resetPassword = async (req, res, next) => {
    try {
        // Re-hash the token from the URL to match what is saved in the DB
        const resetPasswordToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

        console.log(`🔑 Reset attempt with token: ...${req.params.token.slice(-5)}`);
        console.log(`🔎 Hashed token: ${resetPasswordToken.slice(0, 10)}...`);

        const user = await User.findOne({
            resetPasswordToken,
            resetPasswordExpire: { $gt: Date.now() } // Ensure it hasn't expired
        });

        if (!user) {
            console.warn('❌ Reset failed: Token not found or expired in DB');
            return res.status(400).json({ success: false, message: 'Invalid or expired token' });
        }

        // Set the new password
        if (!req.body.password) {
            return res.status(400).json({ success: false, message: 'Please provide a new password' });
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(req.body.password, salt);

        // Clear the temporary reset fields
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        
        // Use validateBeforeSave: false to avoid issues with other fields 
        // that might have been changed in the schema since the user was created
        await user.save({ validateBeforeSave: false });

        res.status(200).json({ success: true, message: 'Password reset successful. You can now log in.' });
    } catch (error) {
        console.error('CRITICAL: Reset Password Error:', error);
        res.status(500).json({ 
            success: false, 
            message: `Server Error: ${error.message}` // Expose error for debugging
        });
    }
};

// @desc    Login a Student
// @route   POST /api/auth/student-login
const studentLogin = async (req, res, next) => {
    try {
        const { email, studentIdNumber } = req.body;

        // Use Student ID / Roll Number as the secure PIN
        const student = await Student.findOne({ email, studentIdNumber });

        if (!student) {
            return res.status(401).json({ success: false, message: 'Invalid Student Email or Roll Number' });
        }

        // 🔥 NEW: Check if their Institution has been disabled by HQ SuperAdmin
        if (student.institutionId) {
            const institution = await Institution.findById(student.institutionId);
            if (institution && institution.isActive === false) {
                return res.status(403).json({ success: false, message: 'Institution suspended by System Director.' });
            }
        }

        // Generate the Student JWT
        const token = jwt.sign(
            { id: student._id, role: 'Student', institutionId: student.institutionId },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.status(200).json({
            success: true,
            token,
            data: { id: student._id, name: student.name, role: 'Student' }
        });

    } catch (error) {
        next(error);
    }
};

module.exports = { registerInstitution, loginUser, forgotPassword, resetPassword, studentLogin };