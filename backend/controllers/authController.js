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
        const user = await User.findOne({ email: req.body.email });
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
        const resetUrl = `http://localhost:5000/reset-password.html?token=${resetToken}`;

        // Configure Nodemailer to use your Gmail
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        const message = {
            from: process.env.EMAIL_USER, // ✅ FIXED: Removed the broken ${} syntax
            to: user.email,
            subject: 'FeeHub Password Reset Request',
            html: `
                <h3>FeeHub Password Reset</h3>
                <p>You requested a password reset. Please click the link below to set a new password:</p>
                <a href="${resetUrl}" style="display:inline-block; padding:10px 20px; background:#71C9CE; color:#1E293B; text-decoration:none; border-radius:5px; font-weight:bold;">Reset Password</a>
                <p>This link will expire in 10 minutes.</p>
                <p>If you did not request this, please ignore this email.</p>
            `
        };

        await transporter.sendMail(message);
        res.status(200).json({ success: true, message: 'Email sent successfully' });

    } catch (error) {
        // If email fails, clear the database token so they can try again
        const user = await User.findOne({ email: req.body.email });
        if (user) {
            user.resetPasswordToken = undefined;
            user.resetPasswordExpire = undefined;
            await user.save({ validateBeforeSave: false });
        }
        res.status(500).json({ success: false, message: 'Email could not be sent' });
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