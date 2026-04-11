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
    try {
        const email = req.body.email ? req.body.email.trim().toLowerCase() : '';
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ success: false, message: 'There is no user with that email' });
        }

        // Generate a random token
        const resetToken = crypto.randomBytes(20).toString('hex');

        // Hash it and save to database with a 10-minute expiration
        user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        user.resetPasswordExpire = Date.now() + 10 * 60 * 1000;
        await user.save({ validateBeforeSave: false });

        // Create the reset URL pointing to your frontend
        const protocol = req.headers['x-forwarded-proto'] || req.protocol;
        const host = req.headers['x-forwarded-host'] || req.get('host');
        const resetUrl = `${protocol}://${host}/reset-password.html?token=${resetToken}`;

        // Configure the email to be sent
        const message = {
            from: `"FeeHub" <${process.env.EMAIL_USER}>`,
            to: user.email,
            subject: 'Reset Your FeeHub Password',
            html: `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:40px 20px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
  <!-- Header -->
  <tr><td style="background:linear-gradient(135deg,#1e293b,#0f172a);padding:32px 36px;text-align:center;">
    <div style="display:inline-block;background:#2563eb;width:40px;height:40px;border-radius:10px;line-height:40px;color:#fff;font-weight:900;font-size:14px;letter-spacing:-0.5px;">FH</div>
    <h1 style="color:#ffffff;font-size:22px;font-weight:800;margin:16px 0 0;letter-spacing:-0.5px;">Password Reset Request</h1>
  </td></tr>
  <!-- Body -->
  <tr><td style="padding:36px;">
    <p style="color:#334155;font-size:15px;line-height:1.7;margin:0 0 8px;">Hi <strong>${user.name || 'there'}</strong>,</p>
    <p style="color:#64748b;font-size:14px;line-height:1.7;margin:0 0 28px;">We received a request to reset the password for your FeeHub account. Click the button below to choose a new password:</p>
    <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:4px 0 28px;">
      <a href="${resetUrl}" style="display:inline-block;padding:14px 36px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:12px;font-weight:700;font-size:15px;letter-spacing:-0.3px;box-shadow:0 4px 14px rgba(37,99,235,0.35);">Reset Password</a>
    </td></tr></table>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px 20px;margin-bottom:24px;">
      <p style="color:#64748b;font-size:13px;line-height:1.6;margin:0;">
        <strong style="color:#475569;">⏱ Expires in 10 minutes</strong><br>
        If you didn't request this reset, you can safely ignore this email. Your password won't change.
      </p>
    </div>
    <p style="color:#94a3b8;font-size:12px;line-height:1.6;margin:0;">If the button doesn't work, copy and paste this link into your browser:<br>
    <a href="${resetUrl}" style="color:#2563eb;word-break:break-all;font-size:12px;">${resetUrl}</a></p>
  </td></tr>
  <!-- Footer -->
  <tr><td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 36px;text-align:center;">
    <p style="color:#94a3b8;font-size:11px;margin:0;">© ${new Date().getFullYear()} FeeHub SaaS &middot; Engineered by Bhapee Studios</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>
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

        const user = await User.findOne({
            resetPasswordToken,
            resetPasswordExpire: { $gt: Date.now() } // Ensure it hasn't expired
        });

        if (!user) {
            return res.status(400).json({ success: false, message: 'Invalid or expired token' });
        }

        // Set the new password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(req.body.password, salt);

        // Clear the temporary reset fields
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        await user.save();

        res.status(200).json({ success: true, message: 'Password reset successful. You can now log in.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error resetting password' });
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