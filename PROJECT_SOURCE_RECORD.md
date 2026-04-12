# FeeHub SaaS - Project Record

Generated on: 12/4/2026, 1:05:31 am
Note: All comments removed. Filename injected inside code blocks. Excludes test/utility scripts.

## db.js
```js
// db.js
const mongoose = require('mongoose');
const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`❌ MongoDB Connection Error: ${error.message}`);
        process.exit(1);
    }
};
module.exports = connectDB;

```

## authController.js
```js
// authController.js
const Institution = require('../models/institution');
const User = require('../models/user');
const Student = require('../models/student');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const registerInstitution = async (req, res, next) => {
    try {
        const { institutionName, adminName, email, password } = req.body;
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ success: false, message: 'Email is already registered' });
        }
        const institution = await Institution.create({
            name: institutionName,
            email: email
        });
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const user = await User.create({
            institutionId: institution._id,
            name: adminName,
            email: email,
            password: hashedPassword,
            role: 'InstitutionAdmin' // First user is always the Admin
        });
        const token = jwt.sign(
            { id: user._id, role: user.role, institutionId: institution._id },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );
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
const loginUser = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }
        if (user.role !== 'SuperAdmin' && user.institutionId) {
            const institution = await Institution.findById(user.institutionId);
            if (institution && institution.isActive === false) {
                return res.status(403).json({ success: false, message: 'Account suspended by System Director. Contact HQ.' });
            }
        }
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
const forgotPassword = async (req, res, next) => {
    let email = '';
    try {
        email = req.body.email ? req.body.email.trim().toLowerCase() : '';
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ success: false, message: 'There is no user with that email' });
        }
        const resetToken = crypto.randomBytes(20).toString('hex');
        user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        user.resetPasswordExpire = Date.now() + 60 * 60 * 1000;
        await user.save({ validateBeforeSave: false });
        const protocol = req.headers['x-forwarded-proto'] || req.protocol;
        const host = req.headers['x-forwarded-host'] || req.get('host');
        const resetUrl = `${protocol}://${host}/reset-password.html?token=${resetToken}`;
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
        <div style="background-color:#f8fafc;padding:30px 40px;text-align:center;border-top:1px solid #e2e8f0;">
            <p style="margin:0 0 10px;font-size:12px;color:#94a3b8;line-height:1.5;">
                &copy; ${new Date().getFullYear()} FeeHub SaaS. All rights reserved.<br>
                Bhapee Studios &middot; Innovating Campus Management
            </p>
            <p style="margin:0;font-size:11px;color:#cbd5e1;">
                This is a mandatory service email related to your account security.<br>
                You are receiving this because a password reset was requested for this email.
            </p>
        </div>
    </div>
</body>
</html>
            `
        };
        const { sendEmail } = require('../utils/emailService');
        await sendEmail(message);
        res.status(200).json({ success: true, message: 'Reset link sent to your email.' });
    } catch (error) {
        console.error('Forgot Password Error:', error.message);
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
const resetPassword = async (req, res, next) => {
    try {
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
        if (!req.body.password) {
            return res.status(400).json({ success: false, message: 'Please provide a new password' });
        }
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(req.body.password, salt);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
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
const studentLogin = async (req, res, next) => {
    try {
        const { email, studentIdNumber } = req.body;
        const student = await Student.findOne({ email, studentIdNumber });
        if (!student) {
            return res.status(401).json({ success: false, message: 'Invalid Student Email or Roll Number' });
        }
        if (student.institutionId) {
            const institution = await Institution.findById(student.institutionId);
            if (institution && institution.isActive === false) {
                return res.status(403).json({ success: false, message: 'Institution suspended by System Director.' });
            }
        }
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
```

## authMiddleware.js
```js
// authMiddleware.js

const jwt = require('jsonwebtoken');
const User = require('../models/user'); 
const Student = require('../models/student'); 
const protect = async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            if (decoded.role === 'Student') {
                req.user = await Student.findById(decoded.id);
                if (req.user) req.user.role = 'Student'; 
            } else {
                req.user = await User.findById(decoded.id).select('-password');
            }
            if (!req.user) return res.status(401).json({ success: false, message: 'User not found' });
            next(); 
        } catch (error) {
            return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
        }
    }
    if (!token) {
        return res.status(401).json({ success: false, message: 'Not authorized, no token provided' });
    }
};
module.exports = { protect };

```

## course.js
```js
// course.js
const mongoose = require('mongoose');
const courseSchema = new mongoose.Schema({
    institutionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Institution',
        required: true
    },
    name: {
        type: String,
        required: [true, 'Course name is required'],
        trim: true
    },
    duration: {
        type: String,
        required: [true, 'Duration is required (e.g., 3 Years)'],
        trim: true
    }
}, { timestamps: true });
courseSchema.index({ institutionId: 1, name: 1 }, { unique: true });
module.exports = mongoose.model('Course', courseSchema);

```

## FeeStructure.js
```js
// FeeStructure.js
const mongoose = require('mongoose');
const feeStructureSchema = new mongoose.Schema({
    institutionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Institution',
        required: true
    },
    course: { type: String, required: true },
    batchYear: { type: String, required: true },
    feeComponents: [{
        name: { type: String, required: true },
        amount: { type: Number, required: true }
    }],
    totalFee: { type: Number, default: 0 }
}, { timestamps: true });
feeStructureSchema.pre('save', function() {
    if (this.feeComponents && this.feeComponents.length > 0) {
        this.totalFee = this.feeComponents.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
    } else {
        this.totalFee = 0;
    }
});
module.exports = mongoose.models.FeeStructure || mongoose.model('FeeStructure', feeStructureSchema);

```

## institution.js
```js
// institution.js

const mongoose = require('mongoose');
const institutionSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please provide the institution name'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Please provide a contact email'],
        unique: true,
        match: [
            /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
            'Please add a valid email'
        ]
    },
    phone: {
        type: String,
        default: ''
    },
    address: {
        type: String,
        default: ''
    },
    subscriptionPlan: {
        type: String,
        enum: ['Free Beta', 'Pro', 'Enterprise'],
        default: 'Free Beta' 
    },
    logo: {
        type: String,
        default: ''
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true 
});
module.exports = mongoose.models.Institution || mongoose.model('Institution', institutionSchema);

```

## Payment.js
```js
// Payment.js
const mongoose = require('mongoose');
const paymentSchema = new mongoose.Schema({
    institutionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Institution', required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    receiptNumber: { type: String, unique: true, sparse: true },
    amount: { type: Number, required: true }, 
    fine: { type: Number, default: 0 },       
    paymentMethod: { type: String, required: true },
    transactionId: { type: String }, 
    components: [{ name: { type: String }, amount: { type: Number } }],
    remarks: { type: String },
    paymentDate: { type: Date, default: Date.now }, 
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });
module.exports = mongoose.model('Payment', paymentSchema);

```

## student.js
```js
// student.js
const mongoose = require('mongoose');
const studentSchema = new mongoose.Schema({
    institutionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Institution', required: true },
    name: { type: String, required: true },
    studentIdNumber: { type: String, required: true }, 
    course: { type: String, required: true },
    batch: { type: String, required: true },
    email: { type: String },
    phone: { type: String },
    parentName: { type: String },
    feeDueDate: { type: Date },
    totalFees: { type: Number, default: 0 },
    paid: { type: Number, default: 0 },
    status: { type: String, enum: ['Active', 'Completed'], default: 'Active' }
}, { timestamps: true });
studentSchema.index({ institutionId: 1, studentIdNumber: 1 }, { unique: true });
module.exports = mongoose.models.Student || mongoose.model('Student', studentSchema);

```

## user.js
```js
// user.js

const mongoose = require('mongoose');
const userSchema = new mongoose.Schema({
    institutionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Institution',
        required: false
    },
    name: {
        type: String,
        required: [true, 'Please add a name']
    },
    email: {
        type: String,
        required: [true, 'Please add an email'],
        unique: true
    },
    password: {
        type: String,
        required: [true, 'Please add a password'],
        minlength: 6,
        select: false 
    },
    role: {
        type: String,
        enum: ['SuperAdmin', 'InstitutionAdmin', 'Staff', 'Student'],
        default: 'Student'
    },
    studentIdNumber: {
        type: String,
        default: null
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date
}, {
    timestamps: true
});
module.exports = mongoose.models.User || mongoose.model('User', userSchema);

```

## package.json
```json
// package.json
{
  "name": "feehub-backend",
  "version": "1.0.0",
  "description": "FeeHub SaaS Backend API",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "node server.js",
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "engines": {
    "node": ">=18.0.0"
  },
  "keywords": [],
  "author": "Bhapee Studios",
  "license": "ISC",
  "type": "commonjs",
  "dependencies": {
    "@sendgrid/mail": "^8.1.6",
    "bcryptjs": "^3.0.3",
    "cors": "^2.8.6",
    "dotenv": "^17.3.1",
    "express": "^5.2.1",
    "helmet": "^8.1.0",
    "iconv-lite": "^0.7.2",
    "jsonwebtoken": "^9.0.3",
    "mongoose": "^9.3.1",
    "nodemailer": "^8.0.3"
  }
}

```

## authRoutes.js
```js
// authRoutes.js

const express = require('express');
const router = express.Router();
const { 
    registerInstitution, 
    loginUser, 
    forgotPassword, 
    resetPassword,
    studentLogin 
} = require('../controllers/authController');
router.post('/register', registerInstitution);
router.post('/login', loginUser);
router.post('/student-login', studentLogin); 
router.post('/forgot-password', forgotPassword);
router.put('/reset-password/:token', resetPassword);
module.exports = router;

```

## courseRoutes.js
```js
// courseRoutes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const Course = require('../models/course'); 
router.get('/', protect, async (req, res) => {
    try {
        const courses = await Course.find({ institutionId: req.user.institutionId }).sort({ createdAt: -1 });
        res.json({ success: true, data: courses });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
router.post('/', protect, async (req, res) => {
    try {
        const newCourse = await Course.create({
            ...req.body,
            institutionId: req.user.institutionId
        });
        res.status(201).json({ success: true, data: newCourse });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
router.put('/:id', protect, async (req, res) => {
    try {
        const updatedCourse = await Course.findOneAndUpdate(
            { _id: req.params.id, institutionId: req.user.institutionId },
            req.body,
            { new: true } 
        );
        if (!updatedCourse) {
            return res.status(404).json({ success: false, message: 'Course not found.' });
        }
        res.json({ success: true, data: updatedCourse });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
module.exports = router;

```

## dashboardRoutes.js
```js
// dashboardRoutes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const Student = require('../models/student');
const Payment = require('../models/Payment');
const User = require('../models/user');
const Institution = require('../models/institution');
router.get('/stats', protect, async (req, res) => {
    try {
        const institutionId = req.user.institutionId;
        const query = institutionId ? { institutionId } : {};
        const students = await Student.find(query);
        const payments = await Payment.find(query);
        const user = await User.findById(req.user._id);
        let instName = 'FeeHub Institution';
        let instLogo = '';
        if (institutionId && institutionId !== 'null') {
            try {
                const institution = await Institution.findById(institutionId);
                if (institution) {
                    instName = institution.name;
                    instLogo = institution.logo || '';
                }
            } catch (err) {
                console.log('Institution lookup failed, using default name.');
            }
        }
        let totalCollected = 0;
        let pendingDues = 0;
        let activeStudents = 0;
        students.forEach(student => {
            if (student.status !== 'Completed') {
                activeStudents++;
                totalCollected += (student.paid || 0);
                pendingDues += Math.max(0, (student.totalFees || 0) - (student.paid || 0));
            }
        });
        res.json({
            success: true,
            data: {
                userName: user ? user.name : 'Admin',
                userId: user ? user._id : null,
                userRole: user ? user.role : 'Staff',
                institutionName: instName,
                institutionLogo: instLogo,
                totalCollected,
                pendingDues,
                totalStudents: activeStudents,
                transactions: payments.length
            }
        });
    } catch (error) {
        console.error('Dashboard Stats Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});
router.get('/student-profile', protect, async (req, res) => {
    try {
        if (req.user.role !== 'Student') {
            return res.status(403).json({ success: false, message: 'Access denied.' });
        }
        const payments = await Payment.find({ studentId: req.user._id }).sort({ paymentDate: -1, createdAt: -1 });
        const institution = await Institution.findById(req.user.institutionId);
        res.json({
            success: true,
            data: {
                student: req.user,
                payments,
                institutionName: institution ? institution.name : 'FeeHub Institution'
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
router.put('/settings', protect, async (req, res) => {
    try {
        if (req.user.role !== 'InstitutionAdmin') {
            return res.status(403).json({ success: false, message: 'Only admins can update settings.' });
        }
        const { adminName, institutionName, logo } = req.body;
        const institutionId = req.user.institutionId;
        if (adminName && adminName.trim()) {
            await User.findByIdAndUpdate(req.user._id, { name: adminName.trim() });
        }
        if (institutionId) {
            const updateData = {};
            if (institutionName && institutionName.trim()) updateData.name = institutionName.trim();
            if (logo !== undefined) updateData.logo = logo;
            if (Object.keys(updateData).length > 0) {
                await Institution.findByIdAndUpdate(institutionId, updateData);
            }
        }
        res.json({ success: true, message: 'Settings updated successfully.' });
    } catch (error) {
        console.error('Settings update error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});
module.exports = router;

```

## feeStructureRoutes.js
```js
// feeStructureRoutes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware'); 
const FeeStructure = require('../models/FeeStructure'); 
const Student = require('../models/student'); 
router.get('/', protect, async (req, res) => {
    try {
        const fees = await FeeStructure.find({ institutionId: req.user.institutionId }).sort({ createdAt: -1 });
        res.json({ success: true, data: fees });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});
router.post('/', protect, async (req, res) => {
    try {
        const { course, batchYear, feeComponents, totalFee } = req.body;
        const exists = await FeeStructure.findOne({ institutionId: req.user.institutionId, course, batchYear });
        if (exists) {
            return res.status(400).json({ success: false, message: 'Structure already exists for this batch.' });
        }
        const calculatedTotal = totalFee || feeComponents.reduce((sum, item) => sum + Number(item.amount), 0);
        const newFeeStructure = await FeeStructure.create({
            institutionId: req.user.institutionId,
            course,
            batchYear,
            feeComponents,
            totalFee: calculatedTotal
        });
        const courseRegex = new RegExp(course.trim(), 'i');
        const batchRegex = new RegExp(batchYear.trim(), 'i');
        const updateResult = await Student.updateMany(
            { institutionId: req.user.institutionId, course: courseRegex, batch: batchRegex },
            { $set: { totalFees: calculatedTotal } }
        );
        console.log(`✅ [NEW CONFIG] Updated ${updateResult.modifiedCount} stranded students for ${course} ${batchYear}`);
        res.status(201).json({ success: true, data: newFeeStructure });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message }); 
    }
});
router.put('/:id', protect, async (req, res) => {
    try {
        const { course, batchYear, feeComponents, totalFee } = req.body;
        const duplicate = await FeeStructure.findOne({ 
            institutionId: req.user.institutionId, course, batchYear, _id: { $ne: req.params.id }
        });
        if (duplicate) return res.status(400).json({ success: false, message: 'Structure already exists.' });
        const calculatedTotal = totalFee || feeComponents.reduce((sum, item) => sum + Number(item.amount), 0);
        const updatedFee = await FeeStructure.findOneAndUpdate(
            { _id: req.params.id, institutionId: req.user.institutionId },
            { course, batchYear, feeComponents, totalFee: calculatedTotal },
            { new: true } 
        );
        if (!updatedFee) return res.status(404).json({ success: false, message: 'Fee structure not found.' });
        const courseRegex = new RegExp(course.trim(), 'i');
        const batchRegex = new RegExp(batchYear.trim(), 'i');
        const updateResult = await Student.updateMany(
            { institutionId: req.user.institutionId, course: courseRegex, batch: batchRegex },
            { $set: { totalFees: calculatedTotal } }
        );
        console.log(`✅ [UPDATED CONFIG] Updated ${updateResult.modifiedCount} existing students for ${course} ${batchYear}`);
        res.json({ success: true, data: updatedFee });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
});
module.exports = router;

```

## hqRoutes.js
```js
// hqRoutes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const Institution = require('../models/institution');
const User = require('../models/user');
const Student = require('../models/student');
const Payment = require('../models/Payment');
const superAdminOnly = (req, res, next) => {
    if (req.user && req.user.role === 'SuperAdmin') {
        next();
    } else {
        res.status(403).json({ success: false, message: 'HQ Clearance Required' });
    }
};
router.get('/dashboard', protect, superAdminOnly, async (req, res) => {
    try {
        const institutionsRaw = await Institution.find().lean();
        const totalUsers = await User.countDocuments({ role: { $ne: 'SuperAdmin' } });
        const totalStudents = await Student.countDocuments();
        const allPayments = await Payment.aggregate([
            { $group: { _id: null, totalVolume: { $sum: '$amount' } } }
        ]);
        const totalPlatformRevenue = allPayments.length > 0 ? allPayments[0].totalVolume : 0;
        const institutions = await Promise.all(institutionsRaw.map(async (inst) => {
            const admin = await User.findOne({ institutionId: inst._id, role: 'InstitutionAdmin' });
            return { ...inst, adminName: admin ? admin.name : 'No Admin Assigned' };
        }));
        res.json({
            success: true,
            data: {
                institutions,
                totalInstitutions: institutions.length - 1, // Subtract the HQ account
                totalPlatformUsers: totalUsers + totalStudents,
                totalPlatformRevenue
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
router.put('/institutions/:id/toggle', protect, superAdminOnly, async (req, res) => {
    try {
        const institution = await Institution.findById(req.params.id);
        if (!institution) return res.status(404).json({ success: false, message: 'Tenant not found' });
        institution.isActive = !institution.isActive;
        await institution.save();
        res.json({ success: true, message: institution.isActive ? 'Instance is now Online.' : 'Instance has been Suspended.' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
router.delete('/institutions/:id', protect, superAdminOnly, async (req, res) => {
    try {
        const instId = req.params.id;
        await User.deleteMany({ institutionId: instId });
        await Student.deleteMany({ institutionId: instId });
        await Payment.deleteMany({ institutionId: instId });
        await Institution.findByIdAndDelete(instId);
        res.json({ success: true, message: 'Tenant completely erased.' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
router.put('/institutions/:id', protect, superAdminOnly, async (req, res) => {
    try {
        const { name, adminName } = req.body;
        const instId = req.params.id;
        if (name) {
            await Institution.findByIdAndUpdate(instId, { name });
        }
        if (adminName) {
            await User.findOneAndUpdate(
                { institutionId: instId, role: 'InstitutionAdmin' },
                { name: adminName }
            );
        }
        res.json({ success: true, message: 'Institution updated successfully.' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
module.exports = router;
```

## paymentRoutes.js
```js
// paymentRoutes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const Payment = require('../models/Payment');
const Student = require('../models/student');
const Institution = require('../models/institution');
const { sendEmail } = require('../utils/emailService');
async function sendReceiptEmail(payment, student, instName) {
    try {
        const dueBalance = Math.max(0, student.totalFees - student.paid);
        const dueColor = dueBalance > 0 ? '#ef4444' : '#10b981';
        const dueText = dueBalance > 0 ? `₹${dueBalance.toLocaleString('en-IN')}` : 'Account Cleared (No Dues)';
        let componentsHtml = '';
        if (payment.components && payment.components.length > 0) {
            payment.components.forEach(c => {
                componentsHtml += `<tr><td style="padding: 10px; border-bottom: 1px solid #e2e8f0; color: #475569;">${c.name}</td><td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold; color: #0f172a;">₹${c.amount.toLocaleString('en-IN')}</td></tr>`;
            });
        } else {
            componentsHtml += `<tr><td style="padding: 10px; border-bottom: 1px solid #e2e8f0; color: #475569;">Academic Fee Payment</td><td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold; color: #0f172a;">₹${(payment.amount - (payment.fine || 0)).toLocaleString('en-IN')}</td></tr>`;
        }
        if (payment.fine > 0) {
            componentsHtml += `<tr><td style="padding: 10px; border-bottom: 1px solid #e2e8f0; color: #ef4444;">Late Fee / Fine</td><td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold; color: #ef4444;">₹${payment.fine.toLocaleString('en-IN')}</td></tr>`;
        }
        const mailOptions = {
            from: `"${instName}" <${process.env.EMAIL_USER}>`,
            to: student.email,
            subject: `Payment Receipt: ${payment.receiptNumber || 'FeeHub'} - ${instName}`,
            html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                <div style="background-color: #2c3e50; color: white; padding: 20px; text-align: center;">
                    <h1 style="margin: 0; font-size: 24px;">${instName.toUpperCase()}</h1>
                    <p style="margin: 5px 0 0 0; color: #cbd5e1;">Official Payment Receipt</p>
                </div>
                <div style="padding: 20px;">
                    <p>Dear <strong>${student.name}</strong>,</p>
                    <p>We have successfully received your fee payment. Below are the details of your transaction:</p>
                    <table style="width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px;">
                        <tr><td style="padding: 5px 0; color: #64748b;">Receipt No:</td><td style="padding: 5px 0; text-align: right; font-weight: bold;">${payment.receiptNumber || 'N/A'}</td></tr>
                        <tr><td style="padding: 5px 0; color: #64748b;">Date:</td><td style="padding: 5px 0; text-align: right; font-weight: bold;">${new Date(payment.paymentDate || payment.createdAt).toLocaleDateString('en-IN')}</td></tr>
                        <tr><td style="padding: 5px 0; color: #64748b;">Mode:</td><td style="padding: 5px 0; text-align: right; font-weight: bold;">${payment.paymentMethod}</td></tr>
                    </table>
                    <h3 style="margin-top: 30px; border-bottom: 2px solid #e2e8f0; padding-bottom: 5px;">Fee Breakdown</h3>
                    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                        ${componentsHtml}
                        <tr><td style="padding: 12px 8px; font-weight: bold; font-size: 16px;">Total Paid</td><td style="padding: 12px 8px; text-align: right; font-weight: bold; font-size: 16px; color: #10b981;">₹${payment.amount.toLocaleString('en-IN')}</td></tr>
                    </table>
                    <div style="margin-top: 25px; padding: 15px; background-color: #f8fafc; border-left: 4px solid ${dueColor}; border-radius: 4px;">
                        <p style="margin: 0; font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: bold;">Account Summary</p>
                        <p style="margin: 5px 0 0 0; font-size: 16px; font-weight: bold; color: ${dueColor};">Current Due Balance: ${dueText}</p>
                    </div>
                    <p style="margin-top: 30px; font-size: 12px; color: #64748b; text-align: center;">This is a computer-generated receipt.</p>
                </div>
            </div>`
        };
        await sendEmail(mailOptions);
        return true;
    } catch (e) {
        console.error("Email error:", e);
        return false;
    }
}
router.get('/', protect, async (req, res) => {
    try {
        const payments = await Payment.find({ institutionId: req.user.institutionId })
            .populate('studentId')
            .sort({ paymentDate: -1, createdAt: -1 });
        res.json({ success: true, data: payments });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
router.post('/', protect, async (req, res) => {
    try {
        const { studentId, academicAmount, fineAmount, method, remarks, manualReceipt, transactionId, paymentDate, components, sendEmail } = req.body;
        const student = await Student.findById(studentId);
        if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
        let finalReceipt = manualReceipt;
        if (!finalReceipt) {
            const count = await Payment.countDocuments({ institutionId: req.user.institutionId });
            finalReceipt = `FH-${new Date().getFullYear()}-${count + 101}`;
        }
        const totalAmount = academicAmount + (fineAmount || 0);
        const newPayment = await Payment.create({
            institutionId: req.user.institutionId,
            studentId,
            amount: totalAmount,
            fine: fineAmount || 0,
            paymentMethod: method,
            transactionId: transactionId || '',
            receiptNumber: finalReceipt,
            paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
            remarks: remarks || '',
            components: components || [],
            recordedBy: req.user._id
        });
        student.paid += academicAmount;
        await student.save();
        if (sendEmail === true && student.email) {
            const institution = await Institution.findById(req.user.institutionId);
            const instName = institution ? institution.name : 'FeeHub Institution';
            sendReceiptEmail(newPayment, student, instName).catch(err => console.error('Email send failed:', err));
        }
        res.status(201).json({ success: true, data: newPayment, message: 'Payment recorded. Email will be sent shortly.' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
router.post('/email-receipt/:id', protect, async (req, res) => {
    try {
        const payment = await Payment.findById(req.params.id).populate('studentId');
        if (!payment || !payment.studentId || !payment.studentId.email) {
            return res.status(400).json({ success: false, message: 'Student email not found.' });
        }
        const institution = await Institution.findById(req.user.institutionId);
        const instName = institution ? institution.name : 'FeeHub Institution';
        sendReceiptEmail(payment, payment.studentId, instName).catch(err => console.error('Email send failed:', err));
        res.json({ success: true, message: 'Receipt email will be sent shortly!' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
router.delete('/:id', protect, async (req, res) => {
    try {
        await Payment.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Payment deleted.' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
module.exports = router;

```

## staffRoutes.js
```js
// staffRoutes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const User = require('../models/user');
const bcrypt = require('bcryptjs'); 
router.get('/', protect, async (req, res) => {
    try {
        const staff = await User.find({ institutionId: req.user.institutionId }).select('-password');
        res.json({ success: true, data: staff });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
router.post('/', protect, async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        const exists = await User.findOne({ email });
        if (exists) return res.status(400).json({ success: false, message: 'Email already exists.' });
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const newStaff = await User.create({
            name, email, password: hashedPassword, role,
            institutionId: req.user.institutionId
        });
        res.json({ success: true, data: newStaff });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
router.put('/:id', protect, async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        let updateData = { name, email, role };
        if (password && password.trim() !== '') {
            const salt = await bcrypt.genSalt(10);
            updateData.password = await bcrypt.hash(password, salt);
        }
        const updatedStaff = await User.findOneAndUpdate(
            { _id: req.params.id, institutionId: req.user.institutionId },
            updateData,
            { new: true }
        ).select('-password');
        if (!updatedStaff) return res.status(404).json({ success: false, message: 'Staff member not found.' });
        res.json({ success: true, data: updatedStaff });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
router.delete('/:id', protect, async (req, res) => {
    try {
        await User.findOneAndDelete({ _id: req.params.id, institutionId: req.user.institutionId });
        res.json({ success: true, message: 'Staff removed.' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
module.exports = router;

```

## studentPortalRoutes.js
```js
// studentPortalRoutes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const Student = require('../models/student');
const Payment = require('../models/Payment');
const Institution = require('../models/institution');
router.get('/', protect, async (req, res) => {
    try {
        if (req.user.role !== 'Student') {
            return res.status(403).json({ success: false, message: 'Access denied. Students only.' });
        }
        const student = req.user;
        const institution = await Institution.findById(student.institutionId);
        const institutionName = institution ? institution.name : 'FeeHub Institution';
        const payments = await Payment.find({ studentId: student._id })
            .sort({ paymentDate: -1, createdAt: -1 });
        res.json({
            success: true,
            data: {
                student: {
                    _id: student._id,
                    name: student.name,
                    studentIdNumber: student.studentIdNumber,
                    course: student.course,
                    batch: student.batch,
                    email: student.email,
                    phone: student.phone,
                    totalFees: student.totalFees,
                    paid: student.paid,
                    status: student.status
                },
                payments,
                institutionName
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
module.exports = router;

```

## studentRoutes.js
```js
// studentRoutes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const Student = require('../models/student'); 
router.get('/', protect, async (req, res) => {
    try {
        const students = await Student.find({ institutionId: req.user.institutionId }).sort({ createdAt: -1 });
        res.json({ success: true, data: students });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
router.post('/', protect, async (req, res) => {
    try {
        const studentData = { ...req.body, institutionId: req.user.institutionId };
        if (!studentData.studentIdNumber) {
            const namePart = (studentData.name || 'STU').replace(/\s/g, '').substring(0, 3).toUpperCase();
            const phonePart = (studentData.phone && studentData.phone.length >= 4) 
                ? studentData.phone.slice(-4) 
                : (studentData.email ? studentData.email.split('@')[0].slice(-4) : '0000');
            studentData.studentIdNumber = `${namePart}${phonePart}`;
        }
        const newStudent = await Student.create(studentData);
        res.status(201).json({ success: true, data: newStudent });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
router.post('/bulk', protect, async (req, res) => {
    try {
        const operations = req.body.students.map((s, idx) => {
            let sId = s.studentIdNumber || '';
            if (!sId) {
                const namePart = (s.name || 'STU').replace(/\s/g, '').substring(0, 3).toUpperCase();
                const phonePart = (s.phone && s.phone.length >= 4) 
                    ? s.phone.slice(-4) 
                    : (s.email ? s.email.split('@')[0].slice(-4) : (1000 + idx).toString().slice(-4));
                sId = `${namePart}${phonePart}`;
            }
            s.studentIdNumber = sId;
            s.institutionId = req.user.institutionId;
            return {
                updateOne: {
                    filter: { institutionId: req.user.institutionId, studentIdNumber: sId },
                    update: { $set: s },
                    upsert: true
                }
            };
        });
        const result = await Student.bulkWrite(operations, { ordered: false });
        let count = (result.nUpserted || 0) + (result.nModified || 0) + (result.nInserted || 0);
        if (!count && count !== 0) count = result.upsertedCount + result.modifiedCount;
        if (!count && count !== 0) count = operations.length; 
        res.status(201).json({ success: true, count: count });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(201).json({ 
                success: true, 
                count: 0, 
                message: "Some students were skipped due to a duplicate Email or System constraint." 
            });
        }
        res.status(500).json({ success: false, message: error.message });
    }
});
router.put('/:id', protect, async (req, res) => {
    try {
        const updatedStudent = await Student.findOneAndUpdate(
            { _id: req.params.id, institutionId: req.user.institutionId },
            req.body,
            { new: true } 
        );
        if (!updatedStudent) return res.status(404).json({ success: false, message: 'Student not found' });
        res.json({ success: true, data: updatedStudent });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
router.delete('/:id', protect, async (req, res) => {
    try {
        await Student.findOneAndDelete({ _id: req.params.id, institutionId: req.user.institutionId });
        res.json({ success: true });
    } catch(e) {
        res.status(500).json({ success: false, message: e.message });
    }
});
module.exports = router;

```

## seed.js
```js
// seed.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const User = require('./models/user');
const Institution = require('./models/institution');
const createMasterAccount = async () => {
    try {
        console.log("Connecting to Database...");
        await mongoose.connect(process.env.MONGO_URI);
        const existingAdmin = await User.findOne({ role: 'SuperAdmin' });
        if (existingAdmin) {
            console.log("⚠️ A Super Admin already exists! Access Denied.");
            process.exit();
        }
        const hq = await Institution.create({
            name: "FeeHub Master Control",
            email: "hq@feehub.com", // ✅ Fixed!
            subscriptionPlan: "Enterprise"
        });
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash("master123", salt); // Your temporary password
        await User.create({
            name: "System Director",
            email: "director@feehub.com", // Your Director Email
            password: hashedPassword,
            role: "SuperAdmin",
            institutionId: hq._id
        });
        console.log("✅ MASTER ACCOUNT SUCCESSFULLY DEPLOYED!");
        console.log("---------------------------------------");
        console.log("Portal:   http://localhost:5000/hq-login.html");
        console.log("Email:    director@feehub.com");
        console.log("Password: master123");
        console.log("---------------------------------------");
        process.exit();
    } catch (error) {
        console.error("❌ Seeding Error:", error);
        process.exit(1);
    }
};
createMasterAccount();
```

## server.js
```js
// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const helmet = require('helmet');
dotenv.config({ path: path.join(__dirname, '.env') });
const app = express();
app.set('trust proxy', 1);
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
}));
app.use(cors());
app.use((req, res, next) => {
    if (req.headers['content-type']) {
        req.headers['content-type'] = req.headers['content-type'].replace(/"/g, '');
    }
    next();
});
app.use(express.json({ limit: '5mb' }));
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ MongoDB Connected Successfully'))
    .catch(err => {
        console.error('❌ MongoDB Connection Error:', err.message);
        process.exit(1);
    });
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/students', require('./routes/studentRoutes'));
app.use('/api/courses', require('./routes/courseRoutes'));
app.use('/api/fee-structures', require('./routes/feeStructureRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));
app.use('/api/staff', require('./routes/staffRoutes'));
app.use('/api/hq', require('./routes/hqRoutes'));
app.use('/api/student-portal', require('./routes/studentPortalRoutes'));
app.use(express.static(path.join(__dirname, '../frontend')));
app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
        res.sendFile(path.join(__dirname, '../frontend/login.html'));
    } else {
        next();
    }
});
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: process.env.NODE_ENV === 'production' ? 'Server Error' : err.message
    });
});
const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
    console.log('───────────────────────────────────────');
    console.log(`🚀 FeeHub Engine running on port ${PORT}`);
    console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('───────────────────────────────────────');
});
```

## emailService.js
```js
// emailService.js
const sgMail = require('@sendgrid/mail');
const nodemailer = require('nodemailer');
const sendEmail = async (options) => {
    const senderEmail = process.env.EMAIL_USER || '';
    const senderName = 'FeeHub';
    console.log(`🔍 [EmailService] DEBUG START:`);
    console.log(`   - To: ${options.to}`);
    console.log(`   - From: ${senderEmail}`);
    console.log(`   - SG_KEY: ${process.env.SENDGRID_API_KEY ? 'Present (Hash: ' + process.env.SENDGRID_API_KEY.substring(0, 10) + '...)' : 'MISSING'}`);
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

```

## dashboard.html
```html
<!-- dashboard.html -->
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard | FeeHub Workspace</title>
    <link rel="stylesheet" href="feehub-loader.css">
    <link rel="icon" id="faviconLink" type="image/png" href="favicon.png">
    <script>window.FEEHUB_MANUAL_LOADER = true;</script>
    <script src="feehub-loader.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.3.2/papaparse.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.28/jspdf.plugin.autotable.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
        rel="stylesheet">
    <script>
        (function() {
            var token = localStorage.getItem('feehub_token');
            if (!token) { window.location.replace('login.html'); return; }
            try {
                var payload = JSON.parse(atob(token.split('.')[1]));
                if (payload.exp * 1000 < Date.now()) { window.location.replace('login.html'); return; }
                if (payload.role === 'Student') { window.location.replace('student-dashboard.html'); return; }
                if (payload.role === 'SuperAdmin') { window.location.replace('hq-login.html'); return; }
            } catch(e) { window.location.replace('login.html'); return; }
        })();
    </script>
    <script>
        tailwind.config = { theme: { extend: { fontFamily: { sans: ['Inter', 'sans-serif'] }, animation: { 'fade-in': 'fadeIn 0.4s ease-out forwards', 'slide-up': 'slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards', 'scale-in': 'scaleIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards', 'float': 'float 3s ease-in-out infinite', 'shimmer': 'shimmer 2s infinite', 'glow': 'glow 2s ease-in-out infinite alternate' }, keyframes: { fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } }, slideUp: { '0%': { opacity: '0', transform: 'translateY(30px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } }, scaleIn: { '0%': { opacity: '0', transform: 'scale(0.95)' }, '100%': { opacity: '1', transform: 'scale(1)' } }, float: { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-5px)' } }, shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } }, glow: { '0%': { boxShadow: '0 0 5px rgba(99,102,241,0.2)' }, '100%': { boxShadow: '0 0 20px rgba(99,102,241,0.15)' } } } } } }
    </script>
    <style>
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #94a3b8; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: #64748b; }
        body { font-family: 'Inter', sans-serif; background: #f0f2f5; }
        .hide-scroll::-webkit-scrollbar { display: none; }
        .glass-card {
            background: rgba(255, 255, 255, 0.85);
            backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.6);
            box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.02);
            transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .glass-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 20px 40px -12px rgba(0, 0, 0, 0.08), 0 4px 12px rgba(0,0,0,0.03);
            border-color: rgba(99,102,241,0.15);
        }
        /* Stat card upgrade */
        .stat-card {
            position: relative; overflow: hidden;
            background: white;
            border: 1px solid #e8ecf1;
            border-radius: 20px;
            padding: 24px;
            transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .stat-card::before {
            content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
            background: var(--accent-gradient);
            border-radius: 20px 20px 0 0;
        }
        .stat-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 20px 40px -12px var(--accent-shadow);
            border-color: var(--accent-border);
        }
        .stat-card .stat-icon {
            width: 44px; height: 44px; border-radius: 14px;
            display: flex; align-items: center; justify-content: center;
            transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .stat-card:hover .stat-icon { transform: scale(1.1) rotate(-5deg); }
        /* Sidebar gradient */
        .sidebar-gradient {
            background: linear-gradient(180deg, #0f172a 0%, #1e1b4b 50%, #1e293b 100%);
        }
        .nav-item {
            position: relative; display: flex; align-items: center; gap: 12px;
            padding: 11px 16px; border-radius: 12px; cursor: pointer;
            transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
            font-weight: 500; font-size: 13.5px;
        }
        .nav-item.active {
            background: linear-gradient(135deg, #4f46e5, #6366f1);
            color: white; font-weight: 600;
            box-shadow: 0 4px 15px -3px rgba(99,102,241,0.4);
        }
        .nav-item:not(.active) { color: #94a3b8; }
        .nav-item:not(.active):hover { background: rgba(255,255,255,0.06); color: #e2e8f0; }
        /* Toast upgrade */
        #toast-container {
            position: fixed; bottom: 24px; right: 24px; z-index: 9999;
            display: flex; flex-direction: column; gap: 10px;
            pointer-events: none;
        }
        .toast {
            background: white; border-left: 4px solid #10b981;
            box-shadow: 0 10px 25px -5px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.03);
            padding: 14px 20px; border-radius: 14px;
            display: flex; align-items: center; gap: 10px;
            animation: slideUp 0.3s ease-out forwards;
            transition: opacity 0.3s ease; pointer-events: auto;
            backdrop-filter: blur(10px);
        }
        /* Quick action ribbon */
        .quick-action {
            display: flex; align-items: center; gap: 10px;
            padding: 12px 16px; border-radius: 14px;
            background: white; border: 1px solid #e2e8f0;
            cursor: pointer; transition: all 0.3s;
            font-size: 13px; font-weight: 600; color: #334155;
        }
        .quick-action:hover { border-color: #818cf8; background: #f5f3ff; color: #4f46e5; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(79,70,229,0.08); }
        .quick-action .qa-icon { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        /* Activity feed */
        .activity-item {
            display: flex; align-items: flex-start; gap: 12px;
            padding: 12px 0; border-bottom: 1px solid #f1f5f9;
            transition: background 0.2s;
        }
        .activity-item:last-child { border-bottom: none; }
        .activity-dot {
            width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; margin-top: 6px;
        }
        /* Premium header */
        .header-glass {
            background: rgba(255,255,255,0.82);
            backdrop-filter: blur(20px) saturate(1.8); -webkit-backdrop-filter: blur(20px) saturate(1.8);
            border-bottom: 1px solid rgba(226,232,240,0.6);
        }
        /* Force body and dashboard root to be dark by default to perfectly match the loader.
           This ensures zero white flash even if the loader fades out slightly early. */
        body { background-color: #030712 !important; }
        #APP { opacity: 0; background-color: #f4f6f9; transition: opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1); }
        #APP.ready { opacity: 1; }
    </style>
</head>
<body class="flex h-screen overflow-hidden overflow-x-hidden text-slate-800 antialiased selection:bg-indigo-100">
    <div id="APP" class="flex w-full h-full relative overflow-x-hidden">
        <div id="sidebarOverlay" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-20 hidden lg:hidden"
            onclick="toggleSidebar()"></div>
        <aside id="sidebar"
            class="w-[260px] h-full sidebar-gradient flex flex-col shadow-2xl z-30 absolute lg:relative transform -translate-x-full lg:translate-x-0 transition-transform duration-300 ease-in-out flex-shrink-0">
            <div class="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40 bg-indigo-500/20 rounded-full blur-[60px] pointer-events-none"></div>
            <div class="h-[72px] flex items-center justify-between px-5 border-b border-white/[0.06] relative">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-[13px] flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 overflow-hidden" id="sidebarLogo">
                        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1v1H9V7zm5 0h1v1h-1V7zm-5 4h1v1H9v-1zm5 0h1v1h-1v-1z" /></svg>
                    </div>
                    <div>
                        <h1 class="text-white font-extrabold text-[17px] tracking-tight leading-none">FeeHub</h1>
                        <p class="text-indigo-300/80 text-[9px] font-bold uppercase tracking-[0.15em] mt-0.5">Cloud Workspace</p>
                    </div>
                </div>
                <button onclick="toggleSidebar()" class="lg:hidden text-slate-400 hover:text-white transition-colors"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
            </div>
            <nav class="flex-1 overflow-y-auto py-5 px-3 space-y-1" id="NAV"></nav>
            <div class="px-3 pt-2">
                <button onclick="logout()" class="w-full flex items-center justify-center gap-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 py-2.5 rounded-xl transition-all text-[13px] font-semibold"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg> Sign Out</button>
            </div>
            <div class="p-3 border-t border-white/[0.06]">
                <div onclick="openSettingsModal()" class="bg-white/[0.05] rounded-[14px] p-3.5 flex items-center gap-3 hover:bg-white/[0.08] transition-all cursor-pointer group">
                    <div class="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-md shadow-indigo-500/20 group-hover:shadow-lg group-hover:shadow-indigo-500/30 transition-shadow overflow-hidden" id="AV">...</div>
                    <div class="overflow-hidden flex-1">
                        <p class="text-white text-[13px] font-semibold truncate" id="SUN">Loading...</p>
                        <p class="text-slate-400 text-[11px] truncate capitalize" id="SUR">...</p>
                    </div>
                    <svg class="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                </div>
            </div>
        </aside>
        <main class="flex-1 flex flex-col min-w-0 relative h-full overflow-x-hidden bg-[#f4f6f9]">
            <div class="absolute top-[-8%] left-[-8%] w-[350px] sm:w-[550px] h-[350px] sm:h-[550px] bg-indigo-400/[0.07] rounded-full blur-[120px] pointer-events-none"></div>
            <div class="absolute bottom-[-8%] right-[-8%] w-[350px] sm:w-[550px] h-[350px] sm:h-[550px] bg-emerald-400/[0.06] rounded-full blur-[120px] pointer-events-none"></div>
            <div class="absolute top-[30%] right-[-5%] w-[250px] h-[250px] bg-violet-400/[0.04] rounded-full blur-[100px] pointer-events-none"></div>
            <header class="h-[68px] header-glass flex items-center justify-between px-4 sm:px-8 z-10 flex-shrink-0 sticky top-0">
                <div class="flex items-center gap-4">
                    <button onclick="toggleSidebar()" class="lg:hidden text-slate-500 hover:text-slate-800 transition-colors p-1"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg></button>
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-black text-[10px] shadow-sm flex-shrink-0">FH</div>
                        <div>
                            <h2 class="text-[17px] font-extrabold text-slate-900 truncate leading-tight" id="PT">Dashboard</h2>
                            <p class="text-[11px] text-slate-400 font-medium hidden sm:block" id="headerClock"></p>
                        </div>
                    </div>
                </div>
                <div class="flex items-center gap-3">
                    <span class="hidden sm:inline-flex items-center gap-2 text-[12px] font-bold text-indigo-700 bg-indigo-50 px-4 py-1.5 rounded-full border border-indigo-100" id="headerInstName">
                        <span class="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                        Loading...
                    </span>
                </div>
            </header>
            <div class="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-8 relative z-10" id="CT"></div>
        </main>
    </div>
    <div id="OV" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 hidden items-center justify-center p-4">
        <div
            class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-scale-in max-h-[90vh] flex flex-col">
            <div
                class="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 flex-shrink-0">
                <h3 class="text-lg font-bold text-slate-800" id="MTL">Title</h3>
                <button onclick="closeM()"
                    class="text-slate-400 hover:text-slate-600 hover:bg-slate-200 w-8 h-8 rounded-full flex items-center justify-center transition-colors">✕</button>
            </div>
            <div class="p-6 overflow-y-auto" id="MBD"></div>
        </div>
    </div>
    <div id="toast-container"></div>
    <script>
        // 🔥 1. BULLETPROOF LOGOUT
        window.logout = function () {
            localStorage.removeItem('feehub_token');
            sessionStorage.removeItem('feehub_token');
            window.location.replace('login.html');
        };
        function showToast(message, type = 'success') {
            const container = document.getElementById('toast-container');
            const toast = document.createElement('div');
            toast.className = 'toast bg-white rounded-xl shadow-xl flex items-center gap-3 px-4 py-3 border border-slate-100 pointer-events-auto';
            let icon = `<svg class="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>`;
            let borderClass = 'border-l-4 border-l-emerald-500';
            if (type === 'error') { icon = `<svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>`; borderClass = 'border-l-4 border-l-red-500'; }
            toast.classList.add(...borderClass.split(' '));
            toast.innerHTML = `${icon} <span class="font-semibold text-slate-700 text-sm">${message}</span>`;
            container.appendChild(toast);
            setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 4000);
        }
        const token = localStorage.getItem('feehub_token');
        if (!token) window.location.replace('login.html');
        let PAGE = 'dashboard';
        let CU = { name: 'Loading...', role: 'staff', institutionName: 'FeeHub Institution', institutionLogo: '' };
        let DASH_DATA = null; let STUDENTS = []; let PAYMENTS = []; let FEE_STRUCTURES = []; let COURSES = []; let STAFF_DATA = []; let ACTIVE_COURSE_FILTER = 'All';
        let STU_SEARCH_TERM = ''; let PAY_SEARCH_TERM = '';
        const fmt = n => '₹' + Number(n).toLocaleString('en-IN');
        const fmtShort = n => { n = Number(n); if (n >= 10000000) return '₹' + (n/10000000).toFixed(1) + 'Cr'; if (n >= 100000) return '₹' + (n/100000).toFixed(1) + 'L'; if (n >= 1000) return '₹' + (n/1000).toFixed(1) + 'K'; return '₹' + n; };
        const ini = n => (n || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
        const G = id => document.getElementById(id);
        function downloadStudentTemplate() {
            const csvContent = "RollNo,Name,Course,Batch,Email,Phone,ParentName,TotalFees\n"
                + "CS-001,Arjun Kumar,BCA,2025-2028,arjun.k81@gmail.com,9880000001,Rajesh Kumar,45000\n"
                + "CS-002,Priya Sharma,BCA,2025-2028,priya.s2@gmail.com,9880000002,Suresh Sharma,45000\n"
                + "BA-001,Rahul Verma,BBA,2026-2029,rahul.v681@gmail.com,9880000003,Anil Verma,50000";
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", "Student_Data_Template.csv");
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
        function closeM() { G('OV').classList.replace('flex', 'hidden'); }
        function toggleSidebar() { G('sidebar').classList.toggle('-translate-x-full'); G('sidebarOverlay').classList.toggle('hidden'); }
        const ICONS = {
            dashboard: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>`,
            course: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 14l9-5-9-5-9 5 9 5z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"></path></svg>`,
            staff: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>`,
            students: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 14l9-5-9-5-9 5 9 5z"></path><path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 14l9-5-9-5-9 5 9 5z"></path></svg>`,
            fees: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path></svg>`
        };
        function getDynamicBatches(courseName) {
            const course = COURSES.find(c => c.name === courseName); if (!course) return [];
            const durationMatch = course.duration.match(/\d+/); const years = durationMatch ? parseInt(durationMatch[0]) : 1;
            const currentYear = new Date().getFullYear(); const batches = [];
            for (let i = -1; i <= 2; i++) batches.push(`${currentYear + i}-${currentYear + i + years}`);
            return batches;
        }
        async function fetchDashboardData() {
            try {
                const res = await fetch('/api/dashboard/stats', { headers: { 'Authorization': `Bearer ${token}` } });
                const result = await res.json();
                if (res.status === 401) { logout(); return; }
                if (result.success) {
                    DASH_DATA = result.data;
                    CU.name = DASH_DATA.userName || 'Admin';
                    CU.institutionName = DASH_DATA.institutionName || 'FeeHub Institution';
                    CU.institutionLogo = DASH_DATA.institutionLogo || '';
                    CU.role = (DASH_DATA.userRole === 'InstitutionAdmin' || DASH_DATA.userRole === 'SuperAdmin') ? 'admin' : 'staff';
                    G('headerInstName').textContent = CU.institutionName;
                    // Update the favicon dynamically if institution logo exists
                    if (CU.institutionLogo) {
                        const link = document.getElementById('faviconLink');
                        if (link) link.href = CU.institutionLogo;
                    }
                    updateSidebarLogo();
                    await Promise.all([fetchStudents(), fetchPayments(), fetchFees(), fetchCourses(), fetchStaffData()]);
                    initDashboard();
                } else {
                    G('CT').innerHTML = `<div class="bg-red-50 text-red-600 p-8 rounded-2xl font-bold text-center mx-auto max-w-xl mt-12 shadow-sm border border-red-200 animate-slide-up"><h2 class="text-2xl mb-2 text-red-700">Backend Error 🛑</h2><p class="text-sm font-medium text-red-500 mb-6">${result.message}</p><button onclick="logout()" class="bg-red-600 text-white px-6 py-2.5 rounded-xl text-sm hover:bg-red-700 shadow-md">Return to Login</button></div>`;
                    G('APP').style.opacity = '1';
                }
            } catch (error) {
                G('CT').innerHTML = `<div class="bg-red-50 text-red-600 p-6 rounded-xl font-bold text-center mx-4 mt-4 shadow-sm">🔌 Cannot connect to backend server.</div>`; G('APP').style.opacity = '1';
            }
        }
        async function fetchStudents() { try { const res = await fetch('/api/students', { headers: { 'Authorization': `Bearer ${token}` } }); const result = await res.json(); if (result.success) STUDENTS = result.data; } catch (e) { } }
        async function fetchPayments() { try { const res = await fetch('/api/payments', { headers: { 'Authorization': `Bearer ${token}` } }); const result = await res.json(); if (result.success) PAYMENTS = result.data; } catch (e) { } }
        async function fetchFees() { try { const res = await fetch('/api/fee-structures', { headers: { 'Authorization': `Bearer ${token}` } }); const result = await res.json(); if (result.success) FEE_STRUCTURES = result.data; } catch (e) { } }
        async function fetchCourses() { try { const res = await fetch('/api/courses', { headers: { 'Authorization': `Bearer ${token}` } }); const result = await res.json(); if (result.success) COURSES = result.data; } catch (e) { } }
        async function fetchStaffData() { try { const res = await fetch('/api/staff', { headers: { 'Authorization': `Bearer ${token}` } }); const result = await res.json(); if (result.success) STAFF_DATA = result.data; } catch (e) { } }
        function updateSidebarLogo() {
            const logoEl = G('sidebarLogo');
            if (CU.institutionLogo && logoEl) {
                logoEl.innerHTML = `<img src="${CU.institutionLogo}" class="w-full h-full object-cover" alt="Logo">`;
            }
            // Update avatar with logo if available
            const avEl = G('AV');
            if (CU.institutionLogo && avEl) {
                avEl.innerHTML = `<img src="${CU.institutionLogo}" class="w-full h-full object-cover rounded-full" alt="Logo">`;
            } else if (avEl) {
                avEl.textContent = ini(CU.name);
            }
        }
        function initDashboard() {
            G('SUN').textContent = CU.name; G('SUR').textContent = CU.role === 'admin' ? 'Administrator' : 'Staff Member'; updateSidebarLogo();
            buildNav(); render(); startClock();
            // Instantly reveal the app and hide the loader
            requestAnimationFrame(() => {
                G('APP').classList.add('ready');
                if (typeof window.feehubLoaderHide === 'function') window.feehubLoaderHide();
            });
        }
        function startClock() {
            const update = () => { const el = G('headerClock'); if (el) el.textContent = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' }) + '  •  ' + new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }); };
            update(); setInterval(update, 30000);
        }
        const NAVS = { admin: [{ id: 'dashboard', ico: ICONS.dashboard, lbl: 'Dashboard' }, { id: 'students', ico: ICONS.students, lbl: 'Students' }, { id: 'fee-payments', ico: ICONS.fees, lbl: 'Transactions' }, { id: 'academics', ico: ICONS.course, lbl: 'Courses & Fees' }, { id: 'staff-manage', ico: ICONS.staff, lbl: 'Staff' }], staff: [{ id: 'dashboard', ico: ICONS.dashboard, lbl: 'Dashboard' }, { id: 'students', ico: ICONS.students, lbl: 'Students' }, { id: 'fee-payments', ico: ICONS.fees, lbl: 'Transactions' }] };
        function buildNav() { G('NAV').innerHTML = (NAVS[CU.role] || NAVS.staff).map(n => `<div onclick="go('${n.id}')" class="nav-item ${PAGE === n.id ? 'active' : ''}">${n.ico} <span>${n.lbl}</span></div>`).join(''); }
        function go(p) { PAGE = p; G('PT').textContent = { dashboard: 'Workspace Overview', students: 'Student Directory', 'fee-payments': 'Transaction History', academics: 'Academic Configuration', 'staff-manage': 'Staff Management' }[p] || p; buildNav(); render(); if (window.innerWidth < 1024 && !G('sidebarOverlay').classList.contains('hidden')) toggleSidebar(); }
        function render() {
            const map = { dashboard: pgDash, students: pgStu, 'fee-payments': pgFeeP, academics: pgAcademics, 'staff-manage': pgStaff };
            G('CT').innerHTML = `<div class="pb-10">${map[PAGE] ? map[PAGE]() : ''}</div>`;
            if (PAGE === 'dashboard') setTimeout(renderCharts, 50);
        }
        function renderCharts() {
            if (!window.Chart) return;
            if (window.myCourseChart) window.myCourseChart.destroy(); if (window.myRevenueChart) window.myRevenueChart.destroy();
            const ctx1 = G('courseChart'); const ctx2 = G('revenueChart'); if (!ctx1 || !ctx2) return;
            const courseCount = {}; STUDENTS.forEach(s => { courseCount[s.course] = (courseCount[s.course] || 0) + 1; });
            // Gradient bar chart
            const barCtx = ctx1.getContext('2d');
            const barGrad = barCtx.createLinearGradient(0, 0, 0, 300);
            barGrad.addColorStop(0, '#6366f1'); barGrad.addColorStop(1, '#a78bfa');
            window.myCourseChart = new Chart(ctx1, { type: 'bar', data: { labels: Object.keys(courseCount).length ? Object.keys(courseCount) : ['No Data'], datasets: [{ label: 'Students', data: Object.values(courseCount).length ? Object.values(courseCount) : [0], backgroundColor: barGrad, borderRadius: 10, barThickness: 36 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, border: { display: false }, grid: { color: '#f1f5f9', drawBorder: false }, ticks: { stepSize: 1, font: { family: "'Inter'", weight: 600, size: 11 }, color: '#94a3b8' } }, x: { border: { display: false }, grid: { display: false }, ticks: { font: { family: "'Inter'", weight: 600, size: 11 }, color: '#64748b' } } } } });
            // Doughnut with gradient
            window.myRevenueChart = new Chart(ctx2, { type: 'doughnut', data: { labels: ['Collected', 'Pending'], datasets: [{ data: [(DASH_DATA.totalCollected || 0), (DASH_DATA.pendingDues || 0)], backgroundColor: ['#10b981', '#f59e0b'], borderWidth: 3, borderColor: '#ffffff', cutout: '72%', hoverOffset: 6, borderRadius: 4 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, pointStyle: 'circle', padding: 16, font: { family: "'Inter'", weight: 600, size: 12 }, color: '#475569' } } } } });
        }
        function pgDash() {
            if (!DASH_DATA) return '';
            const collRate = DASH_DATA.totalCollected + DASH_DATA.pendingDues > 0 ? Math.round((DASH_DATA.totalCollected / (DASH_DATA.totalCollected + DASH_DATA.pendingDues)) * 100) : 0;
            // Recent payments for activity feed
            const recentPayments = PAYMENTS.slice(0, 4);
            const activityHTML = recentPayments.length > 0 ? recentPayments.map(p => {
                const date = new Date(p.paymentDate || p.createdAt);
                const timeAgo = getTimeAgo(date);
                const name = p.studentId ? p.studentId.name : 'Unknown';
                return `<div class="activity-item"><div class="activity-dot bg-emerald-400 mt-1.5"></div><div class="flex-1 min-w-0"><p class="text-[13px] font-semibold text-slate-800 truncate"><span class="text-emerald-600">+${fmt(p.amount)}</span> from ${name}</p><p class="text-[11px] text-slate-400 mt-0.5">${p.paymentMethod || 'Cash'} • ${timeAgo}</p></div></div>`;
            }).join('') : '<div class="py-6 text-center text-slate-400 text-[13px] font-medium">No recent activity</div>';
            let recentRows = STUDENTS.slice(0, 5).map(s => {
                const isZero = s.totalFees === 0; const isPaid = !isZero && s.totalFees <= s.paid;
                const statusText = isZero ? 'No Config' : isPaid ? 'Paid' : 'Pending';
                const statusColor = isZero ? 'bg-slate-100 text-slate-600' : isPaid ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200';
                return `<tr class="border-b border-slate-100/80 hover:bg-indigo-50/30 transition-colors cursor-pointer" onclick="viewStudent('${s._id}')"><td class="py-3.5 px-4"><div class="flex items-center gap-3"><div class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-[10px] border border-slate-200">${ini(s.name)}</div><span class="font-semibold text-[13px] text-slate-800">${s.name}</span></div></td><td class="py-3.5 px-4 text-[13px]"><span class="bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg text-[10px] font-bold border border-indigo-100">${s.course}</span></td><td class="py-3.5 px-4 text-[13px] text-slate-600 font-medium">${fmt(s.totalFees)}</td><td class="py-3.5 px-4"><span class="${statusColor} px-2.5 py-1 rounded-lg text-[9px] font-bold border uppercase tracking-wider">${statusText}</span></td></tr>`;
            }).join('');
            let tableHTML = STUDENTS.length > 0 ? `<div class="overflow-x-auto"><table class="w-full text-left border-collapse min-w-[600px]"><thead><tr class="bg-slate-50/80 border-b border-slate-100"><th class="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Student</th><th class="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Course</th><th class="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total</th><th class="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th></tr></thead><tbody>${recentRows}</tbody></table></div>` : `<div class="py-12 text-center text-slate-400 font-semibold text-sm">No students onboarded yet</div>`;
            return `
  <div class="mb-8 flex flex-col sm:flex-row justify-between sm:items-end gap-4 animate-fade-in">
      <div>
          <p class="text-indigo-600 text-[11px] font-bold uppercase tracking-widest mb-1">Workspace Overview</p>
          <h2 class="text-3xl font-black text-slate-900 tracking-tight">Welcome back, ${CU.name.split(' ')[0]}</h2>
          <p class="text-[13px] text-slate-500 mt-1 font-medium">Here's your institution's pulse for today.</p>
      </div>
      <div class="flex gap-2.5">
          <button onclick="go('students')" class="bg-white border border-slate-200 text-slate-700 font-bold py-2.5 px-5 rounded-xl text-[13px] shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-95 flex items-center gap-2"><svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"></path></svg> Directory</button>
          <button onclick="go('fee-payments'); setTimeout(openPaymentModal, 100);" class="bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold py-2.5 px-5 rounded-xl text-[13px] shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all active:scale-95 flex items-center gap-2"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg> Record Payment</button>
      </div>
  </div>
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
      <div class="stat-card animate-slide-up" style="--accent-gradient: linear-gradient(135deg, #10b981, #059669); --accent-shadow: rgba(16,185,129,0.15); --accent-border: #a7f3d0; animation-delay: 50ms;">
          <div class="flex items-center justify-between mb-3">
              <div class="stat-icon bg-emerald-50 text-emerald-600"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg></div>
              <span class="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">${collRate}% rate</span>
          </div>
          <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Collected</p>
          <h3 class="text-2xl xl:text-[28px] font-black text-slate-900 tracking-tight" title="${fmt(DASH_DATA.totalCollected)}">${fmtShort(DASH_DATA.totalCollected)}</h3>
      </div>
      <div class="stat-card animate-slide-up" style="--accent-gradient: linear-gradient(135deg, #f59e0b, #d97706); --accent-shadow: rgba(245,158,11,0.15); --accent-border: #fde68a; animation-delay: 100ms;">
          <div class="flex items-center justify-between mb-3">
              <div class="stat-icon bg-amber-50 text-amber-600"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg></div>
              ${DASH_DATA.pendingDues > 0 ? '<span class="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100 animate-pulse">Pending</span>' : '<span class="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">Clear</span>'}
          </div>
          <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Outstanding Dues</p>
          <h3 class="text-2xl xl:text-[28px] font-black ${DASH_DATA.pendingDues > 0 ? 'text-amber-600' : 'text-emerald-600'} tracking-tight" title="${fmt(DASH_DATA.pendingDues)}">${fmtShort(DASH_DATA.pendingDues)}</h3>
      </div>
      <div class="stat-card animate-slide-up" style="--accent-gradient: linear-gradient(135deg, #6366f1, #4f46e5); --accent-shadow: rgba(99,102,241,0.15); --accent-border: #c7d2fe; animation-delay: 150ms;">
          <div class="flex items-center justify-between mb-3">
              <div class="stat-icon bg-indigo-50 text-indigo-600"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg></div>
              <span class="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">${COURSES.length} courses</span>
          </div>
          <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Active Students</p>
          <h3 class="text-2xl xl:text-[28px] font-black text-slate-900 tracking-tight">${DASH_DATA.totalStudents}</h3>
      </div>
      <div class="stat-card animate-slide-up" style="--accent-gradient: linear-gradient(135deg, #8b5cf6, #7c3aed); --accent-shadow: rgba(139,92,246,0.15); --accent-border: #ddd6fe; animation-delay: 200ms;">
          <div class="flex items-center justify-between mb-3">
              <div class="stat-icon bg-violet-50 text-violet-600"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg></div>
          </div>
          <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Transactions</p>
          <h3 class="text-2xl xl:text-[28px] font-black text-slate-900 tracking-tight">${DASH_DATA.transactions || 0}</h3>
      </div>
  </div>
  <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8 animate-fade-in" style="animation-delay: 250ms;">
      <div class="quick-action" onclick="go('students'); setTimeout(() => openStudentModal(), 100);"><div class="qa-icon bg-blue-50 text-blue-600"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path></svg></div> Add Student</div>
      <div class="quick-action" onclick="go('fee-payments'); setTimeout(openPaymentModal, 100);"><div class="qa-icon bg-emerald-50 text-emerald-600"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path></svg></div> New Payment</div>
      ${CU.role === 'admin' ? '<div class="quick-action" onclick="go(\'academics\')"><div class="qa-icon bg-violet-50 text-violet-600"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg></div> Courses</div>' : ''}
      <div class="quick-action" onclick="go('fee-payments'); setTimeout(openExportModal, 100);"><div class="qa-icon bg-amber-50 text-amber-600"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg></div> Export</div>
  </div>
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8">
      <div class="glass-card p-6 rounded-2xl lg:col-span-2 animate-slide-up" style="animation-delay: 300ms;"><div class="flex items-center justify-between mb-5"><h3 class="text-[13px] font-bold text-slate-800 uppercase tracking-wider">Enrollment by Course</h3><span class="text-[10px] font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">${STUDENTS.length} total</span></div><div class="relative h-64 w-full"><canvas id="courseChart"></canvas></div></div>
      <div class="glass-card p-6 rounded-2xl animate-slide-up" style="animation-delay: 350ms;"><div class="flex items-center justify-between mb-5"><h3 class="text-[13px] font-bold text-slate-800 uppercase tracking-wider">Revenue Split</h3><span class="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">${collRate}% collected</span></div><div class="relative h-64 w-full flex justify-center"><canvas id="revenueChart"></canvas></div></div>
  </div>
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <div class="glass-card rounded-2xl overflow-hidden lg:col-span-2 animate-slide-up" style="animation-delay: 400ms;"><div class="px-6 py-4 border-b border-slate-100/50 flex justify-between items-center"><h3 class="font-bold text-slate-800 text-[14px]">Recent Students</h3><button onclick="go('students')" class="text-[11px] font-bold text-indigo-600 uppercase hover:underline tracking-wider">View All →</button></div>${tableHTML}</div>
      <div class="glass-card rounded-2xl overflow-hidden animate-slide-up" style="animation-delay: 450ms;"><div class="px-6 py-4 border-b border-slate-100/50 flex justify-between items-center"><h3 class="font-bold text-slate-800 text-[14px]">Recent Activity</h3><button onclick="go('fee-payments')" class="text-[11px] font-bold text-indigo-600 uppercase hover:underline tracking-wider">Ledger →</button></div><div class="px-6 py-2">${activityHTML}</div></div>
  </div>`;
        }
        function getTimeAgo(date) {
            const now = new Date(); const diff = Math.floor((now - date) / 1000);
            if (diff < 60) return 'Just now';
            if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
            if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
            if (diff < 604800) return Math.floor(diff / 86400) + 'd ago';
            return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
        }
        // ═══════════════════ PERFECT PDF GENERATION ENGINE ═══════════════════
        function downloadReceipt(id) {
            const p = PAYMENTS.find(x => x._id === id); if (!p || !p.studentId) return showToast("Receipt missing student data.", "error");
            const { jsPDF } = window.jspdf; const doc = new jsPDF();
            const colorBg = [244, 246, 249]; const colorHeader = [44, 62, 80]; const colorText = [119, 119, 119]; const colorDarkText = [51, 51, 51]; const colorDueBg = [255, 230, 230]; const colorDueText = [192, 57, 43]; const colorNoteBg = [241, 243, 245]; const colorNoteBorder = [52, 152, 219];
            const instName = CU.institutionName || 'FeeHub';
            doc.setFillColor(...colorBg); doc.rect(0, 0, 210, 297, 'F');
            doc.setFillColor(255, 255, 255); doc.roundedRect(15, 20, 180, 250, 3, 3, 'F'); doc.setDrawColor(230, 230, 230); doc.roundedRect(15, 20, 180, 250, 3, 3, 'S');
            doc.setTextColor(...colorHeader); doc.setFontSize(22); doc.setFont("helvetica", "bold"); doc.text(instName, 25, 35);
            doc.setTextColor(...colorText); doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.text("Official Payment Receipt", 25, 42);
            doc.setTextColor(...colorHeader); doc.setFontSize(14); doc.setFont("helvetica", "bold"); doc.text("RECEIPT", 185, 35, { align: "right" });
            doc.setDrawColor(238, 238, 238); doc.setLineWidth(0.5); doc.line(25, 48, 185, 48);
            doc.setTextColor(...colorDarkText); doc.setFontSize(10);
            doc.setFont("helvetica", "bold"); doc.text("Name:", 25, 58); doc.setFont("helvetica", "normal"); doc.text(p.studentId.name, 40, 58);
            doc.setFont("helvetica", "bold"); doc.text("Roll No:", 25, 65); doc.setFont("helvetica", "normal"); doc.text(p.studentId.studentIdNumber || 'N/A', 43, 65);
            doc.setFont("helvetica", "bold"); doc.text("Course:", 25, 72); doc.setFont("helvetica", "normal"); doc.text(`${p.studentId.course} (${p.studentId.batch})`, 42, 72);
            const recId = p.receiptNumber || `REC-${p._id.slice(-6).toUpperCase()}`;
            const dateStr = new Date(p.paymentDate || p.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
            doc.setFont("helvetica", "bold"); doc.text("Receipt No:", 130, 58); doc.setFont("helvetica", "normal"); doc.text(recId, 155, 58);
            doc.setFont("helvetica", "bold"); doc.text("Date:", 130, 65); doc.setFont("helvetica", "normal"); doc.text(dateStr, 142, 65);
            doc.setFont("helvetica", "bold"); doc.text("Mode:", 130, 72); doc.setFont("helvetica", "normal"); doc.text(p.paymentMethod || p.method || 'Cash', 143, 72);
            let tableBody = p.components && p.components.length > 0 ? p.components.map(c => [c.name, fmt(c.amount)]) : [['Academic Fee Payment', fmt(p.amount - (p.fine || 0))]];
            if (p.fine && p.fine > 0) tableBody.push(['Late Fee / Fine', fmt(p.fine)]);
            doc.autoTable({ startY: 82, head: [['Fee Description', 'Amount (₹)']], body: tableBody, theme: 'plain', headStyles: { fillColor: colorHeader, textColor: [255, 255, 255], fontStyle: 'bold' }, styles: { fontSize: 10, cellPadding: 6, textColor: colorDarkText }, columnStyles: { 0: { cellWidth: 100 }, 1: { halign: 'right' } }, margin: { left: 25, right: 25 }, didDrawCell: function (data) { if (data.row.section === 'body') { doc.setDrawColor(221, 221, 221); doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height); } } });
            let finalY = doc.lastAutoTable.finalY + 10;
            doc.setFontSize(12); doc.setFont("helvetica", "bold"); doc.setTextColor(...colorHeader); doc.text(`Total Paid: ${fmt(p.amount)}`, 185, finalY, { align: "right" });
            finalY += 15;
            const fullStudent = STUDENTS.find(s => s._id === p.studentId._id);
            if (fullStudent && fullStudent.totalFees > 0) {
                const dueBalance = Math.max(0, fullStudent.totalFees - fullStudent.paid);
                if (dueBalance > 0) {
                    doc.setFillColor(...colorDueBg); doc.roundedRect(25, finalY, 160, 12, 2, 2, 'F'); doc.setFontSize(10); doc.setTextColor(...colorDueText); doc.setFont("helvetica", "bold"); doc.text(`Current Due Balance: ${fmt(dueBalance)}`, 30, finalY + 8);
                    finalY += 18;
                    doc.setFillColor(...colorNoteBg); doc.roundedRect(25, finalY, 160, 14, 2, 2, 'F'); doc.setFillColor(...colorNoteBorder); doc.rect(25, finalY, 3, 14, 'F');
                    doc.setFontSize(9); doc.setTextColor(85, 85, 85); doc.setFont("helvetica", "normal"); doc.text("Note: The above due balance does not include any applicable fines or penalties.", 32, finalY + 8.5);
                    finalY += 25;
                } else {
                    doc.setFillColor(230, 255, 235); doc.roundedRect(25, finalY, 160, 12, 2, 2, 'F'); doc.setFontSize(10); doc.setTextColor(39, 174, 96); doc.setFont("helvetica", "bold"); doc.text(`Account Fully Cleared (No Dues Remaining)`, 30, finalY + 8);
                    finalY += 25;
                }
            } else { finalY += 10; }
            doc.setFontSize(10); doc.setTextColor(85, 85, 85); doc.setFont("helvetica", "normal"); doc.text("Thank you for your payment", 105, finalY, { align: "center" });
            doc.setFontSize(8); doc.text("This is a computer-generated receipt", 105, finalY + 5, { align: "center" });
            finalY += 20; doc.setDrawColor(0, 0, 0); doc.setLineWidth(0.5); doc.line(135, finalY, 185, finalY);
            doc.setFontSize(9); doc.text("Authorized Signature", 160, finalY + 5, { align: "center" });
            doc.save(`${recId}_${p.studentId.name.replace(/\\s+/g, '_')}.pdf`);
        }
        function pgAcademics() {
            let cRows = COURSES.map((c, index) => `<tr class="border-b border-slate-100 hover:bg-slate-50 transition-colors"><td class="py-4 px-4"><p class="text-sm font-bold text-slate-800">${c.name}</p></td><td class="py-4 px-4 text-sm text-slate-600">${c.duration}</td><td class="py-4 px-4 text-right"><button onclick="editCourse(${index})" class="text-blue-600 font-bold text-xs bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors">Edit</button></td></tr>`).join('');
            let cTableHTML = COURSES.length > 0 ? `<div class="overflow-x-auto"><table class="w-full text-left"><thead><tr class="bg-slate-50 border-b border-slate-100"><th class="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Course Name</th><th class="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Duration</th><th class="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th></tr></thead><tbody>${cRows}</tbody></table></div>` : `<div class="py-8 text-center text-slate-400 font-bold">No courses defined.</div>`;
            let fRows = FEE_STRUCTURES.map((f, i) => `<tr class="border-b border-slate-100 hover:bg-slate-50 transition-colors"><td class="py-4 px-4"><p class="text-sm font-bold text-slate-800">${f.course}</p><p class="text-xs text-slate-400 mt-0.5">${f.batchYear}</p></td><td class="py-4 px-4 text-sm text-slate-600">${f.feeComponents.length} Items</td><td class="py-4 px-4 text-sm font-bold text-emerald-600">${fmt(f.totalFee)}</td><td class="py-4 px-4 text-right"><button onclick="openFeeModal(${i})" class="text-blue-600 font-bold text-xs bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors">Edit</button></td></tr>`).join('');
            let fTableHTML = FEE_STRUCTURES.length > 0 ? `<div class="overflow-x-auto"><table class="w-full text-left"><thead><tr class="bg-slate-50 border-b border-slate-100"><th class="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Course & Batch</th><th class="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Components</th><th class="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Total Fee</th><th class="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th></tr></thead><tbody>${fRows}</tbody></table></div>` : `<div class="py-8 text-center text-slate-400 font-bold">No master fees defined.</div>`;
            const missingStudents = STUDENTS.filter(s => s.totalFees === 0 && s.status !== 'Completed');
            let alertHTML = '';
            if (missingStudents.length > 0) {
                const missingGroups = {};
                missingStudents.forEach(s => { const key = `${s.course} (${s.batch})`; missingGroups[key] = (missingGroups[key] || 0) + 1; });
                const listItems = Object.entries(missingGroups).map(([key, count]) => `<li class="flex items-center gap-2"><span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span><span class="font-bold">${key}</span> <span class="text-amber-600 font-medium">: ${count} Student${count > 1 ? 's' : ''}</span></li>`).join('');
                alertHTML = `<div class="bg-amber-50 border border-amber-200 text-amber-800 px-5 py-4 rounded-xl mb-6 shadow-sm animate-fade-in flex flex-col sm:flex-row justify-between sm:items-start gap-4"><div class="flex items-start gap-3"><svg class="w-6 h-6 text-amber-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg><div><p class="text-sm font-bold mb-2">Action Required: ${missingStudents.length} student(s) are missing fee configurations.</p><ul class="text-xs text-amber-700 space-y-1 ml-1">${listItems}</ul></div></div></div>`;
            }
            return `
    <div class="mb-8 animate-fade-in"><h2 class="text-3xl font-extrabold text-slate-900 tracking-tight">Courses & Fees Setup</h2><p class="text-sm text-slate-500 mt-1">Manage academic programs and their financial structures.</p></div>
    ${alertHTML}
    <div class="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <div class="glass-card rounded-2xl overflow-hidden animate-slide-up" style="animation-delay: 50ms;"><div class="px-5 py-4 border-b border-slate-100/50 flex justify-between items-center"><h3 class="font-bold text-lg">Programs <span class="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full text-xs">${COURSES.length}</span></h3><button onclick="openCourseModal()" class="bg-blue-600 text-white font-semibold py-2 px-4 rounded-xl text-sm hover:bg-blue-700 transition-colors shadow-sm">+ Add Course</button></div>${cTableHTML}</div>
        <div class="glass-card rounded-2xl overflow-hidden animate-slide-up" style="animation-delay: 100ms;"><div class="px-5 py-4 border-b border-slate-100/50 flex justify-between items-center"><h3 class="font-bold text-lg">Fee Structures <span class="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full text-xs">${FEE_STRUCTURES.length}</span></h3><button onclick="openFeeModal()" class="bg-emerald-600 text-white font-semibold py-2 px-4 rounded-xl text-sm hover:bg-emerald-700 transition-colors shadow-sm">+ Create Config</button></div>${fTableHTML}</div>
    </div>`;
        }
        function openCourseModal(editIndex = -1) {
            const isEdit = editIndex >= 0; const course = isEdit ? COURSES[editIndex] : { name: '', duration: '' }; G('MTL').textContent = isEdit ? 'Edit Course' : 'Add New Course';
            G('MBD').innerHTML = `<form onsubmit="saveCourse(event, ${editIndex})" class="space-y-4"><div><label class="block text-xs font-bold text-slate-500 mb-1">Course Name</label><input type="text" id="cName" value="${course.name}" required placeholder="e.g. BCA" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 text-sm"></div><div><label class="block text-xs font-bold text-slate-500 mb-1">Duration</label><input type="text" id="cDuration" value="${course.duration}" required placeholder="e.g. 3 Years" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 text-sm"></div><div class="pt-4 border-t border-slate-100 mt-6"><button type="submit" class="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-xl shadow-md hover:bg-blue-700 transition-all">Save Course</button></div></form>`; G('OV').classList.replace('hidden', 'flex');
        }
        async function saveCourse(e, index = -1) {
            e.preventDefault(); const isEdit = index >= 0; const courseId = isEdit ? COURSES[index]._id : null; const url = isEdit ? `/api/courses/${courseId}` : '/api/courses';
            try {
                const res = await fetch(url, { method: isEdit ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ name: G('cName').value, duration: G('cDuration').value }) });
                const data = await res.json(); if (data.success) { closeM(); fetchDashboardData(); showToast("Course saved!"); } else { showToast(data.message, 'error'); }
            } catch (error) { showToast('Failed to connect to server.', 'error'); }
        }
        function openFeeModal(index = -1) {
            const isEdit = index >= 0; const feeToEdit = isEdit ? FEE_STRUCTURES[index] : null;
            const courseOptions = COURSES.map(c => `<option value="${c.name}" ${isEdit && feeToEdit.course === c.name ? 'selected' : ''}>${c.name}</option>`).join('');
            G('MTL').textContent = isEdit ? 'Edit Master Fee Structure' : 'Define Master Fee Structure';
            let rowsHTML = isEdit && feeToEdit.feeComponents.length > 0 ? feeToEdit.feeComponents.map(comp => renderFeeRow(comp.name, comp.amount)).join('') : renderFeeRow('Tuition Fee', '');
            G('MBD').innerHTML = `<form onsubmit="saveFeeStructure(event, ${index})" class="space-y-6"><div class="grid grid-cols-2 gap-4"><div><label class="block text-xs font-bold text-slate-500 uppercase mb-1">Course</label><select id="fCourse" required onchange="updateFeeModalBatches()" class="w-full px-4 py-2.5 bg-slate-50 border rounded-xl text-sm outline-none focus:border-blue-500"><option value="" disabled ${!isEdit ? 'selected' : ''}>Select Course</option>${courseOptions}</select></div><div><label class="block text-xs font-bold text-slate-500 uppercase mb-1">Batch Year</label><input type="text" id="fBatch" list="fBatchList" required placeholder="2025-2028" class="w-full px-4 py-2.5 bg-slate-50 border rounded-xl text-sm outline-none focus:border-blue-500"><datalist id="fBatchList"></datalist></div></div><div><div class="flex justify-between mb-3"><label class="text-xs font-bold text-slate-500 uppercase">Fee Components</label><button type="button" onclick="addFeeRow()" class="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors">+ Add Type</button></div><div id="feeRows" class="space-y-3">${rowsHTML}</div></div><div class="pt-6 border-t flex justify-between items-center"><div><p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Calculated Total</p><p class="text-2xl font-black text-slate-900" id="fTotalDisplay">₹0</p></div><button type="submit" id="saveFeeBtn" class="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold shadow-md hover:bg-blue-700 transition-all">${isEdit ? 'Update Config' : 'Save Structure'}</button></div></form>`;
            G('OV').classList.replace('hidden', 'flex'); if (isEdit) { updateFeeModalBatches(); G('fBatch').value = feeToEdit.batchYear; calcFeeTotal(); }
        }
        function updateFeeModalBatches() { const course = G('fCourse').value; G('fBatchList').innerHTML = getDynamicBatches(course).map(b => `<option value="${b}">`).join(''); }
        function renderFeeRow(name = '', amt = '') { return `<div class="flex items-center gap-3 fee-row animate-fade-in"><input type="text" placeholder="Name" value="${name}" required class="f-name flex-1 px-4 py-2 border rounded-lg text-sm bg-slate-50 outline-none focus:border-blue-500"><input type="number" placeholder="Amount" value="${amt}" required oninput="calcFeeTotal()" class="f-amt w-32 px-4 py-2 border rounded-lg text-sm text-right bg-slate-50 outline-none focus:border-blue-500"><button type="button" onclick="this.parentElement.remove(); calcFeeTotal();" class="text-slate-300 hover:text-red-500 transition-colors">✕</button></div>`; }
        function addFeeRow() { G('feeRows').insertAdjacentHTML('beforeend', renderFeeRow()); }
        function calcFeeTotal() { let t = 0; document.querySelectorAll('.f-amt').forEach(i => { t += Number(i.value) || 0; }); G('fTotalDisplay').textContent = fmt(t); }
        async function saveFeeStructure(e, index = -1) {
            e.preventDefault(); G('saveFeeBtn').disabled = true;
            const feeComponents = Array.from(document.querySelectorAll('.fee-row')).map(row => ({ name: row.querySelector('.f-name').value, amount: Number(row.querySelector('.f-amt').value) })).filter(item => item.name && item.amount > 0);
            const payload = { course: G('fCourse').value, batchYear: G('fBatch').value, feeComponents: feeComponents };
            const isEdit = index >= 0; const url = isEdit ? `/api/fee-structures/${FEE_STRUCTURES[index]._id}` : '/api/fee-structures';
            try {
                const res = await fetch(url, { method: isEdit ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(payload) });
                const data = await res.json(); if (data.success) { closeM(); fetchDashboardData(); showToast("Fee structure saved."); } else { showToast(data.message, 'error'); G('saveFeeBtn').disabled = false; }
            } catch (e) { showToast('Server Error.', 'error'); G('saveFeeBtn').disabled = false; }
        }
        function setCourseFilter(course) { ACTIVE_COURSE_FILTER = course; render(); }
        function handleSearchInput(val) { STU_SEARCH_TERM = val.toLowerCase(); render(); setTimeout(() => { const box = G('stuSearchBox'); if (box) { box.focus(); box.setSelectionRange(box.value.length, box.value.length); } }, 0); }
        function viewStudent(id) {
            const s = STUDENTS.find(x => x._id === id); if (!s) return;
            const isZero = s.totalFees === 0; const isPaid = !isZero && s.totalFees <= s.paid; const isAlumni = s.status === 'Completed';
            const statusText = isZero ? 'No Config' : isPaid ? 'Cleared' : 'Pending';
            const statusColor = isZero ? 'bg-slate-100 text-slate-600' : isPaid ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200';
            const originalIndex = STUDENTS.findIndex(orig => orig._id === s._id);
            const studentPayments = PAYMENTS.filter(p => p.studentId && p.studentId._id === s._id);
            studentPayments.sort((a, b) => new Date(b.paymentDate || b.createdAt) - new Date(a.paymentDate || a.createdAt));
            let historyHTML = '';
            if (studentPayments.length > 0) {
                const rows = studentPayments.map(p => {
                    const date = new Date(p.paymentDate || p.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
                    const recId = p.receiptNumber || `REC-${p._id.slice(-6).toUpperCase()}`;
                    return `<div class="flex items-center justify-between p-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                        <div>
                            <p class="text-sm font-bold text-slate-800"><span class="text-emerald-500 font-extrabold">+</span> ${fmt(p.amount)}</p>
                            <p class="text-[10px] text-slate-400 font-mono mt-0.5">${recId} • ${p.paymentMethod || 'CASH'}</p>
                        </div>
                        <div class="text-right">
                            <p class="text-xs font-semibold text-slate-600">${date}</p>
                            <button onclick="downloadReceipt('${p._id}')" class="text-blue-600 hover:text-blue-800 text-[10px] font-bold mt-1 uppercase tracking-wider flex items-center gap-1 justify-end w-full">📥 PDF</button>
                        </div>
                    </div>`;
                }).join('');
                historyHTML = `<div>
                    <h4 class="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">Payment History <span class="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-[10px]">${studentPayments.length}</span></h4>
                    <div class="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden max-h-48 overflow-y-auto custom-scrollbar">
                        ${rows}
                    </div>
                </div>`;
            } else {
                historyHTML = `<div>
                    <h4 class="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Payment History</h4>
                    <div class="bg-slate-50 border border-slate-200 border-dashed rounded-xl p-6 text-center shadow-sm">
                        <p class="text-xs text-slate-400 font-bold">No payments recorded yet.</p>
                    </div>
                </div>`;
            }
            G('MTL').textContent = 'Student Profile';
            G('MBD').innerHTML = `
        <div class="space-y-6">
            <div class="flex items-center gap-4 pb-6 border-b border-slate-100 relative">
                <div class="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xl border">${ini(s.name)}</div>
                <div class="overflow-hidden pr-20">
                    <div class="flex items-center gap-2"><h2 class="text-xl font-bold text-slate-900 truncate">${s.name}</h2>${isAlumni ? `<span class="bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">🎓 Alumni</span>` : ''}</div>
                    <p class="text-sm text-slate-500 font-medium">${s.studentIdNumber || 'ID N/A'}</p>
                    <span class="${statusColor} px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border mt-2 inline-block">${statusText}</span>
                </div>
                <div class="absolute top-0 right-0 flex gap-2">
                    <button onclick="openStudentModal(${originalIndex})" class="bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white w-10 h-10 rounded-full flex items-center justify-center transition-colors shadow-sm">✎</button>
                    <button onclick="deleteStudent('${s._id}')" class="bg-red-50 text-red-500 hover:bg-red-500 hover:text-white w-10 h-10 rounded-full flex items-center justify-center transition-colors shadow-sm">✕</button>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div class="bg-slate-50 p-4 rounded-xl border border-slate-100"><p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Academic</p><p class="text-sm font-semibold text-slate-800">${s.course}</p><p class="text-xs text-slate-500">${s.batch}</p></div>
                <div class="bg-slate-50 p-4 rounded-xl border border-slate-100"><p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Financial</p><p class="text-sm font-bold text-slate-800">Total: ${fmt(s.totalFees)}</p><p class="text-xs font-bold text-emerald-600">Paid: ${fmt(s.paid)}</p><p class="text-xs font-bold text-red-500 mt-1">Due: ${fmt(s.totalFees - s.paid)}</p></div>
            </div>
            <div>
                <h4 class="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Contact Information</h4>
                <div class="space-y-3 bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
                    <div class="text-sm flex items-center gap-3">📧 <span class="font-medium text-slate-800">${s.email || '<i class="text-slate-400">Not provided</i>'}</span></div>
                    <div class="text-sm flex items-center gap-3">📞 <span class="font-medium text-slate-800">${s.phone || '<i class="text-slate-400">Not provided</i>'}</span></div>
                    <div class="text-sm flex items-center gap-3">👨‍👩‍👧 <span class="font-medium text-slate-800">${s.parentName || '<i class="text-slate-400">Not provided</i>'}</span></div>
                </div>
            </div>
            ${historyHTML}
        </div>`;
            G('OV').classList.replace('hidden', 'flex');
        }
        function pgStu() {
            const uniqueCourses = ['All', ...new Set(STUDENTS.map(s => s.course))];
            let filteredStudents = STUDENTS;
            if (STU_SEARCH_TERM) { filteredStudents = filteredStudents.filter(s => s.name.toLowerCase().includes(STU_SEARCH_TERM) || (s.studentIdNumber && s.studentIdNumber.toLowerCase().includes(STU_SEARCH_TERM)) || (s.course && s.course.toLowerCase().includes(STU_SEARCH_TERM))); }
            if (ACTIVE_COURSE_FILTER !== 'All') { filteredStudents = filteredStudents.filter(s => s.course === ACTIVE_COURSE_FILTER); }
            const filterHTML = uniqueCourses.map(c => `<button onclick="setCourseFilter('${c}')" class="px-5 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${ACTIVE_COURSE_FILTER === c ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}">${c}</button>`).join('');
            const cardsHTML = filteredStudents.length > 0 ? filteredStudents.map((s, i) => {
                const isZero = s.totalFees === 0; const isPaid = !isZero && s.totalFees <= s.paid; const isAlumni = s.status === 'Completed';
                const statusText = isZero ? 'No Config' : isPaid ? 'Cleared' : 'Pending';
                const statusColor = isZero ? 'bg-slate-100 text-slate-600 border-slate-300' : isPaid ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200';
                return `
        <div onclick="viewStudent('${s._id}')" class="cursor-pointer glass-card rounded-2xl p-5 group flex flex-col justify-between opacity-0 animate-slide-up ${isAlumni ? 'opacity-60 bg-slate-50/50' : ''}" style="animation-delay: ${(i % 10) * 50}ms;">
            <div>
                <div class="flex items-center gap-3 mb-4">
                    <div class="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold border border-slate-200">${ini(s.name)}</div>
                    <div class="overflow-hidden">
                        <div class="flex items-center gap-2"><h4 class="font-bold text-slate-900 truncate text-lg group-hover:text-blue-600 transition-colors">${s.name}</h4>${isAlumni ? `<span class="bg-indigo-100 text-indigo-700 px-1 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider">Alumni</span>` : ''}</div>
                        <p class="text-xs text-slate-500 font-medium truncate">${s.studentIdNumber || 'ID N/A'}</p>
                    </div>
                </div>
                <div class="flex gap-2 mb-5">
                    <span class="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md text-[10px] font-bold border border-blue-100">${s.course}</span>
                    <span class="bg-slate-50 text-slate-600 px-2.5 py-1 rounded-md text-[10px] font-bold border border-slate-200">${s.batch}</span>
                </div>
            </div>
            <div class="pt-4 border-t border-slate-100 flex justify-between items-end">
                <div><p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Due Balance</p><p class="text-xl font-black ${isPaid ? 'text-emerald-500' : 'text-slate-800'}">${fmt(s.totalFees - s.paid)}</p></div>
                <span class="${statusColor} px-3 py-1.5 rounded-full text-[10px] font-bold border uppercase tracking-wider">${statusText}</span>
            </div>
        </div>`;
            }).join('') : `<div class="col-span-full py-16 text-center text-slate-400 font-bold bg-white/50 rounded-2xl border border-dashed border-slate-300">No matching students found.</div>`;
            return `
    <div class="mb-6 flex flex-col xl:flex-row xl:items-end justify-between gap-4 animate-fade-in">
        <div><h3 class="font-bold text-2xl tracking-tight text-slate-900">Directory <span class="bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full text-xs align-middle ml-2">${filteredStudents.length}</span></h3></div>
        <div class="flex flex-col sm:flex-row gap-3">
            <input type="text" id="stuSearchBox" oninput="handleSearchInput(this.value)" value="${STU_SEARCH_TERM}" placeholder="Search name, ID..." class="w-full sm:w-64 px-4 py-2 bg-white/80 border border-slate-200 rounded-xl focus:border-blue-500 outline-none text-sm transition-all shadow-sm">
            <div class="flex gap-2">
                <button onclick="downloadStudentTemplate()" class="bg-emerald-50 text-emerald-700 font-semibold py-2 px-4 rounded-xl text-sm border border-emerald-200 hover:bg-emerald-100 transition-colors shadow-sm flex items-center justify-center gap-2">Template CSV</button>
                <button onclick="triggerBulkImport()" class="bg-white text-slate-600 font-semibold py-2 px-4 rounded-xl text-sm border border-slate-200 hover:bg-slate-50 transition-colors shadow-sm">Import CSV</button>
                <button onclick="openStudentModal()" class="bg-blue-600 text-white font-bold py-2 px-4 rounded-xl text-sm shadow-md hover:bg-blue-700 transition-colors">+ Add</button>
            </div>
        </div>
    </div>
    <div class="flex overflow-x-auto pb-4 mb-2 gap-2 hide-scroll animate-fade-in" style="animation-delay: 50ms;">${filterHTML}</div>
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-12">${cardsHTML}</div>`;
        }
        function openStudentModal(index = -1) {
            const isEdit = index >= 0; const student = isEdit ? STUDENTS[index] : null;
            const courseOptions = COURSES.map(c => `<option value="${c.name}" ${isEdit && student.course === c.name ? 'selected' : ''}>${c.name}</option>`).join('');
            G('MTL').textContent = isEdit ? 'Edit Student Details' : 'Add New Student';
            let dateStr = ''; if (isEdit && student.feeDueDate) { try { dateStr = new Date(student.feeDueDate).toISOString().split('T')[0]; } catch (e) { } }
            G('MBD').innerHTML = `
        <form id="studentForm" onsubmit="saveStudent(event, ${index})" class="space-y-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label class="block text-xs font-bold text-slate-500 mb-1">Full Name *</label><input type="text" id="sName" value="${isEdit ? student.name : ''}" required placeholder="Full Name" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 text-sm"></div>
                <div><label class="block text-xs font-bold text-slate-500 mb-1">Course *</label><select id="sCourse" required onchange="updateBatchOptions()" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 text-sm"><option value="" disabled ${!isEdit ? 'selected' : ''}>Select Course</option>${courseOptions}</select></div>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label class="block text-xs font-bold text-slate-500 mb-1">Batch *</label><input type="text" id="sBatch" list="sBatchList" required oninput="updateFeeBreakdown()" placeholder="2025-2028" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 text-sm"><datalist id="sBatchList"></datalist></div>
                <div><label class="block text-xs font-bold text-slate-500 mb-1">Roll No / Student ID</label><input type="text" id="sIdNumber" value="${isEdit ? (student.studentIdNumber || '') : ''}" placeholder="Leave blank to auto-generate" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 text-sm"></div>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label class="block text-xs font-bold text-slate-500 mb-1">Email</label><input type="email" id="sEmail" value="${isEdit ? (student.email || '') : ''}" placeholder="student@email.com" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 text-sm"></div>
                <div><label class="block text-xs font-bold text-slate-500 mb-1">Phone</label><input type="text" id="sPhone" value="${isEdit ? (student.phone || '') : ''}" placeholder="Mobile number" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 text-sm"></div>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label class="block text-xs font-bold text-slate-500 mb-1">Parent / Guardian</label><input type="text" id="sParent" value="${isEdit ? (student.parentName || '') : ''}" placeholder="Parent name" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 text-sm"></div>
                <div><label class="block text-xs font-bold text-slate-500 mb-1">Fee Due Date</label><input type="date" id="sDueDate" value="${dateStr}" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 text-sm"></div>
            </div>
            ${isEdit ? `
            <div class="mt-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <label class="block text-xs font-bold text-slate-500 mb-1">Student Status</label>
                <select id="sStatus" class="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-blue-500 text-sm font-bold text-slate-700">
                    <option value="Active" ${student.status !== 'Completed' ? 'selected' : ''}>🟢 Active</option>
                    <option value="Completed" ${student.status === 'Completed' ? 'selected' : ''}>🎓 Completed (Alumni)</option>
                </select>
            </div>` : `<input type="hidden" id="sStatus" value="Active">`}
            <div id="feeBreakdownBox" class="hidden mt-4 p-4 bg-blue-50/50 border border-blue-100 rounded-xl text-blue-700 text-xs font-medium"></div>
            <div class="pt-4 border-t border-slate-100 flex justify-end gap-3"><button type="button" onclick="closeM()" class="px-6 py-2.5 rounded-xl font-bold border border-slate-200 text-slate-600 text-sm hover:bg-slate-50 transition-colors">Cancel</button><button type="submit" id="saveStuBtn" class="bg-blue-600 text-white font-bold py-2.5 px-6 rounded-xl shadow-md shadow-blue-600/20 text-sm hover:bg-blue-700 transition-all">${isEdit ? 'Update Student' : 'Add Student'}</button></div>
            <input type="hidden" id="sFeesDisplay" value="${isEdit ? student.totalFees : '0'}">
        </form>`;
            G('OV').classList.replace('hidden', 'flex');
            if (isEdit) { updateBatchOptions(); G('sBatch').value = student.batch; updateFeeBreakdown(); }
        }
        function updateBatchOptions() { const course = G('sCourse').value; G('sBatchList').innerHTML = getDynamicBatches(course).map(b => `<option value="${b}">`).join(''); updateFeeBreakdown(); }
        function updateFeeBreakdown() {
            const course = G('sCourse').value; const batch = G('sBatch').value;
            const breakdownBox = G('feeBreakdownBox'); const feeDisplay = G('sFeesDisplay'); const saveBtn = G('saveStuBtn');
            if (!course || !batch) { breakdownBox.classList.add('hidden'); feeDisplay.value = '0'; saveBtn.disabled = true; return; }
            const structure = FEE_STRUCTURES.find(f => String(f.course).trim().toLowerCase() === course.trim().toLowerCase() && String(f.batchYear).trim().toLowerCase() === batch.trim().toLowerCase());
            if (structure) {
                const total = structure.feeComponents.reduce((sum, item) => sum + item.amount, 0); feeDisplay.value = total;
                breakdownBox.className = "mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl text-blue-800 text-xs font-medium";
                breakdownBox.innerHTML = structure.feeComponents.map(c => `${c.name}: ${fmt(c.amount)}`).join(' • ') + ` = <strong>${fmt(total)}</strong>`;
                breakdownBox.classList.remove('hidden'); saveBtn.disabled = false;
            } else {
                feeDisplay.value = '0'; breakdownBox.className = "mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs font-medium";
                breakdownBox.innerHTML = `⚠️ <strong>Missing Config:</strong> No master fees defined for ${course} (${batch}).`;
                breakdownBox.classList.remove('hidden'); saveBtn.disabled = true;
            }
        }
        async function saveStudent(e, index = -1) {
            e.preventDefault(); const btn = G('saveStuBtn'); btn.disabled = true;
            const isEdit = index >= 0; const studentIdToEdit = isEdit ? STUDENTS[index]._id : null;
            let providedId = G('sIdNumber').value.trim();
            if (!providedId && !isEdit) { providedId = G('sCourse').value.substring(0, 3).toUpperCase() + '-' + Date.now().toString().slice(-4) + Math.floor(Math.random() * 100); }
            const payload = { name: G('sName').value, course: G('sCourse').value, batch: G('sBatch').value, totalFees: Number(G('sFeesDisplay').value), status: G('sStatus').value };
            if (providedId) payload.studentIdNumber = providedId;
            if (G('sEmail').value.trim()) payload.email = G('sEmail').value.trim();
            if (G('sPhone').value.trim()) payload.phone = G('sPhone').value.trim();
            if (G('sParent').value.trim()) payload.parentName = G('sParent').value.trim();
            if (G('sDueDate').value) payload.feeDueDate = G('sDueDate').value;
            const url = isEdit ? `/api/students/${studentIdToEdit}` : '/api/students';
            try {
                const res = await fetch(url, { method: isEdit ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(payload) });
                const data = await res.json(); if (data.success) { closeM(); fetchDashboardData(); showToast(isEdit ? "Student updated." : "Student added."); } else { showToast(data.message, 'error'); btn.disabled = false; }
            } catch (e) { showToast('Server unreachable.', 'error'); btn.disabled = false; }
        }
        async function deleteStudent(studentId) {
            if (!confirm('Are you sure you want to completely remove this student?')) return;
            try {
                const res = await fetch(`/api/students/${studentId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
                const result = await res.json(); if (result.success) { closeM(); fetchDashboardData(); showToast("Student deleted."); } else { showToast(result.message, 'error'); }
            } catch (e) { showToast('Server Error.', 'error'); }
        }
        // ═══════════════════ TRANSACTIONS ═══════════════════
        function handlePaySearch(val) { PAY_SEARCH_TERM = val.toLowerCase(); render(); setTimeout(() => { const box = G('paySearchBox'); if (box) { box.focus(); box.setSelectionRange(box.value.length, box.value.length); } }, 0); }
        function pgFeeP() {
            let filtered = PAYMENTS;
            if (PAY_SEARCH_TERM) { filtered = filtered.filter(p => (p.studentId && p.studentId.name.toLowerCase().includes(PAY_SEARCH_TERM)) || (p.remarks && p.remarks.toLowerCase().includes(PAY_SEARCH_TERM)) || (p._id.slice(-6).toLowerCase().includes(PAY_SEARCH_TERM)) || (p.receiptNumber && p.receiptNumber.toLowerCase().includes(PAY_SEARCH_TERM))); }
            let rows = filtered.map(p => {
                const date = new Date(p.paymentDate || p.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
                const recId = p.receiptNumber || `REC-${p._id.slice(-6).toUpperCase()}`;
                return `
        <tr class="hover:bg-slate-50/80 border-b border-slate-100 transition-colors"><td class="py-4 px-4 text-sm font-mono text-slate-500">${recId}</td><td class="py-4 px-4"><p class="text-sm font-bold text-slate-800">${p.studentId ? p.studentId.name : 'Unknown'}</p><p class="text-xs text-slate-400 mt-0.5">${p.studentId ? p.studentId.course + ' (' + p.studentId.batch + ')' : ''}</p></td><td class="py-4 px-4 text-sm text-slate-600">${date}</td><td class="py-4 px-4"><span class="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-[10px] font-bold border border-slate-200">${p.paymentMethod || p.method || 'CASH'}</span></td><td class="py-4 px-4 text-sm font-bold text-emerald-600">+ ${fmt(p.amount)}</td><td class="py-4 px-4 text-right flex justify-end gap-2">
            <button onclick="emailReceipt('${p._id}', this)" class="text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-600 hover:text-white transition-colors" title="Send Email">Email</button>
            <button onclick="downloadReceipt('${p._id}')" class="text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-700 hover:text-white transition-colors" title="Download PDF">PDF</button>
            <button onclick="openPaymentModal('${p._id}')" class="text-blue-600 hover:bg-blue-50 font-bold text-xs px-2 py-1.5 rounded-lg transition-colors">Edit</button>
            <button onclick="deletePayment('${p._id}')" class="text-red-400 hover:bg-red-50 hover:text-red-600 font-bold text-xs px-2 py-1.5 rounded-lg transition-colors">✕</button>
        </td></tr>`;
            }).join('');
            let tableHTML = filtered.length > 0 ? `<div class="overflow-x-auto"><table class="w-full text-left border-collapse min-w-[800px]"><thead><tr class="bg-slate-50/50 border-b border-slate-100"><th class="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Receipt No</th><th class="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Student</th><th class="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th><th class="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Method</th><th class="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Amount</th><th class="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th></tr></thead><tbody>${rows}</tbody></table></div>` : `<div class="py-12 text-center text-slate-400 font-bold bg-slate-50/50 border border-dashed rounded-xl m-4">No payments found.</div>`;
            return `
    <div class="animate-fade-in mb-4"><h2 class="text-3xl font-extrabold text-slate-900 tracking-tight">Transaction Ledger</h2><p class="text-sm text-slate-500 mt-1">Monitor and manage all fee collections.</p></div>
    <div class="glass-card rounded-2xl overflow-hidden animate-slide-up" style="animation-delay: 50ms;">
        <div class="px-5 py-4 border-b border-slate-100/50 flex flex-col xl:flex-row xl:justify-between xl:items-center gap-4">
            <h3 class="font-bold text-lg text-slate-800">Ledger <span class="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-xs ml-2">${filtered.length}</span></h3>
            <div class="flex flex-col sm:flex-row gap-2">
                <input type="text" id="paySearchBox" oninput="handlePaySearch(this.value)" value="${PAY_SEARCH_TERM}" placeholder="Search transactions..." class="px-4 py-2 border border-slate-200 bg-white/80 rounded-xl text-sm w-full sm:w-64 outline-none focus:border-blue-500 transition-colors shadow-sm">
                <div class="flex gap-2">
                    <button onclick="openExportModal()" class="bg-indigo-50 text-indigo-600 font-semibold py-2 px-4 rounded-xl text-sm border border-indigo-100 hover:bg-indigo-100 transition-colors whitespace-nowrap">Export</button>
                    <button onclick="openPaymentModal()" class="bg-emerald-600 text-white font-semibold py-2 px-4 rounded-xl text-sm shadow-md shadow-emerald-600/20 hover:bg-emerald-700 transition-all active:scale-95 whitespace-nowrap">Record Payment</button>
                </div>
            </div>
        </div>
        ${tableHTML}
    </div>`;
        }
        // 🔥 MANUAL EMAIL TRIGGER WITH INSTANT BUTTON FEEDBACK
        async function emailReceipt(id, btnElement) {
            try {
                const p = PAYMENTS.find(x => x._id === id);
                if (!p || !p.studentId) return showToast("Receipt missing student data.", "error");
                const fullStudent = STUDENTS.find(s => s._id === p.studentId._id);
                if (!fullStudent || !fullStudent.email) return showToast("Student does not have an email address on file.", "error");
                const originalText = btnElement.innerHTML;
                btnElement.innerHTML = "Sending...";
                btnElement.disabled = true;
                btnElement.classList.add('opacity-50', 'cursor-wait');
                const res = await fetch(`/api/payments/email-receipt/${id}`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                if (data.success) {
                    showToast("Receipt emailed successfully!");
                    btnElement.innerHTML = "Sent!";
                    btnElement.classList.replace('bg-indigo-50', 'bg-green-50');
                    btnElement.classList.replace('text-indigo-600', 'text-green-600');
                    setTimeout(() => {
                        btnElement.innerHTML = originalText;
                        btnElement.disabled = false;
                        btnElement.classList.remove('opacity-50', 'cursor-wait');
                        btnElement.classList.replace('bg-green-50', 'bg-indigo-50');
                        btnElement.classList.replace('text-green-600', 'text-indigo-600');
                    }, 3000);
                } else {
                    showToast(data.message, "error");
                    btnElement.innerHTML = "Error";
                    setTimeout(() => { btnElement.innerHTML = originalText; btnElement.disabled = false; btnElement.classList.remove('opacity-50', 'cursor-wait'); }, 2000);
                }
            } catch (e) {
                showToast("Server connection error.", "error");
                btnElement.innerHTML = originalText; btnElement.disabled = false; btnElement.classList.remove('opacity-50', 'cursor-wait');
            }
        }
        function filterPaymentStudents() {
            const term = G('pStudentSearch').value.toLowerCase(); const list = G('pStudentList'); list.innerHTML = '';
            const sortedStudents = [...STUDENTS].sort((a, b) => a.name.localeCompare(b.name));
            const filtered = sortedStudents.filter(s => s.name.toLowerCase().includes(term) || (s.studentIdNumber && s.studentIdNumber.toLowerCase().includes(term)));
            if (filtered.length === 0) { list.innerHTML = `<div class="p-3 text-sm text-slate-500 text-center">No students found</div>`; return; }
            filtered.forEach(s => {
                const due = s.totalFees - s.paid; const div = document.createElement('div'); div.className = 'p-3 hover:bg-blue-50 cursor-pointer border-b border-slate-100 text-sm transition-colors';
                div.innerHTML = `<div class="font-bold text-slate-800">${s.name} <span class="font-normal text-slate-500">(${s.studentIdNumber})</span></div><div class="text-xs ${due > 0 ? 'text-red-500' : 'text-emerald-500'} font-semibold mt-0.5">Due: ${fmt(due)}</div>`;
                div.onclick = () => { G('pStudentSearch').value = `${s.name} (${s.studentIdNumber})`; G('pStudentId').value = s._id; list.classList.add('hidden'); updatePaymentFormUX(false); }; list.appendChild(div);
            });
        }
        function showPaymentStudents() { G('pStudentList').classList.remove('hidden'); filterPaymentStudents(); }
        document.addEventListener('click', (e) => { if (G('pStudentList') && !e.target.closest('.custom-dropdown')) G('pStudentList').classList.add('hidden'); });
        function calculateComponentTotal(inputElem = null, maxAllowed = null) {
            if (inputElem && maxAllowed !== null && Number(inputElem.value) > maxAllowed) inputElem.value = maxAllowed;
            let aca = 0; document.querySelectorAll('.pay-comp-amt').forEach(input => { aca += Number(input.value) || 0; });
            const acaInput = G('pAcademicAmount'); if (acaInput && acaInput.readOnly) { acaInput.value = aca; } else { aca = Number(acaInput.value) || 0; }
            let fine = Number(G('pFineAmount').value) || 0; if (G('pGrandTotal')) G('pGrandTotal').value = aca + fine;
        }
        function updatePaymentFormUX(isEditMode = false) {
            const sid = G('pStudentId').value; const student = STUDENTS.find(s => s._id === sid);
            const summaryBox = G('paymentSummaryBox'); const compBox = G('paymentComponentsBox');
            if (!student) { summaryBox.classList.add('hidden'); compBox.innerHTML = ''; return; }
            let existingPayment = window.CURRENT_EDIT_PAYMENT; let compPaidHist = {};
            PAYMENTS.forEach(p => { if (p.studentId && p.studentId._id === student._id) { if (isEditMode && existingPayment && p._id === existingPayment._id) return; if (p.components) { p.components.forEach(c => { compPaidHist[c.name] = (compPaidHist[c.name] || 0) + c.amount; }); } } });
            let actualPaid = student.paid; if (isEditMode && existingPayment) { actualPaid -= (existingPayment.amount - (existingPayment.fine || 0)); }
            const due = student.totalFees - actualPaid;
            summaryBox.innerHTML = `<div><p class="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Fee</p><p class="text-sm font-semibold text-slate-800">${fmt(student.totalFees)}</p></div><div><p class="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Paid</p><p class="text-sm font-semibold text-emerald-600">${fmt(actualPaid)}</p></div><div class="text-right"><p class="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Due</p><p class="text-lg font-black ${due > 0 ? 'text-red-500' : 'text-emerald-500'}">${fmt(due)}</p></div>`;
            summaryBox.classList.replace('hidden', 'flex');
            const structure = FEE_STRUCTURES.find(f => f.course === student.course && f.batchYear === student.batch);
            if (structure && structure.feeComponents.length > 0) {
                let compHTML = `<label class="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Component Breakdown</label><div class="space-y-2 bg-white border border-slate-200 p-4 rounded-xl shadow-sm">`;
                let remainingDue = due;
                structure.feeComponents.forEach((c, i) => {
                    let maxAllowed = Math.max(0, c.amount - (compPaidHist[c.name] || 0)); let defaultAmt = '';
                    if (isEditMode && existingPayment && existingPayment.components) { const prevComp = existingPayment.components.find(pc => pc.name === c.name); if (prevComp) defaultAmt = prevComp.amount; }
                    else if (!isEditMode && remainingDue > 0 && maxAllowed > 0) { let allocate = Math.min(remainingDue, maxAllowed); defaultAmt = allocate; remainingDue -= allocate; } else if (!isEditMode) { defaultAmt = 0; }
                    compHTML += `<div class="flex justify-between items-center"><span class="text-sm w-1/2 text-slate-700 font-medium">${c.name} <span class="text-[10px] ${maxAllowed === 0 ? 'text-emerald-500 font-bold' : 'text-amber-500 font-bold'}">(${maxAllowed === 0 ? 'Paid' : 'Due: ' + fmt(maxAllowed)})</span></span><input type="number" data-name="${c.name}" value="${defaultAmt}" max="${maxAllowed}" oninput="calculateComponentTotal(this, ${maxAllowed})" class="pay-comp-amt w-1/2 px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-sm text-right font-bold text-emerald-600 outline-none focus:border-blue-500 transition-colors" ${maxAllowed === 0 && !isEditMode ? 'disabled' : ''}></div>`;
                });
                compHTML += `</div>`; compBox.innerHTML = compHTML;
                const acaInput = G('pAcademicAmount'); if (acaInput) { acaInput.readOnly = true; acaInput.classList.add('bg-slate-100', 'pointer-events-none'); acaInput.classList.remove('bg-white'); }
            } else {
                compBox.innerHTML = `<div class="bg-amber-50 p-3 rounded-lg border border-amber-200 text-amber-800 text-xs">⚠️ No master config found. Enter total below.</div>`;
                const acaInput = G('pAcademicAmount'); if (acaInput) { acaInput.readOnly = false; acaInput.classList.remove('bg-slate-100', 'pointer-events-none'); acaInput.classList.add('bg-white'); if (!isEditMode) acaInput.value = due > 0 ? due : 0; }
            }
            calculateComponentTotal();
        }
        function openPaymentModal(editId = null) {
            const isEdit = !!editId; const p = isEdit ? PAYMENTS.find(x => x._id === editId) : null; G('MTL').textContent = isEdit ? 'Edit Payment' : 'Record Payment';
            const sId = isEdit && p.studentId ? p.studentId._id : ''; const sName = isEdit && p.studentId ? `${p.studentId.name} (${p.studentId.studentIdNumber})` : '';
            let pDate = new Date().toISOString().split('T')[0]; if (isEdit && (p.paymentDate || p.createdAt)) { pDate = new Date(p.paymentDate || p.createdAt).toISOString().split('T')[0]; }
            // 🔥 ADDED AUTO-EMAIL TOGGLE TO THE FORM
            G('MBD').innerHTML = `
        <form onsubmit="savePayment(event, '${editId || ''}')" class="space-y-4">
            <div class="grid grid-cols-2 gap-4"><div class="custom-dropdown relative z-20"><label class="block text-xs font-bold text-slate-500 mb-1">Student *</label><input type="text" id="pStudentSearch" value="${sName}" oninput="filterPaymentStudents()" onfocus="showPaymentStudents()" placeholder="Search..." class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 text-sm transition-colors" ${isEdit ? 'disabled' : 'required'}><input type="hidden" id="pStudentId" value="${sId}"><div id="pStudentList" class="absolute w-full mt-1 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl hidden"></div></div><div><label class="block text-xs font-bold text-slate-500 mb-1">Receipt No</label><input type="text" id="pReceipt" value="${isEdit ? (p.receiptNumber || '') : ''}" placeholder="Auto-generate" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 text-sm uppercase transition-colors"></div></div>
            <div id="paymentSummaryBox" class="hidden bg-slate-50 p-4 rounded-xl border border-slate-200 flex justify-between items-center shadow-inner"></div>
            <div id="paymentComponentsBox"></div>
            <div class="grid grid-cols-3 gap-4 items-end bg-slate-50/50 p-4 rounded-xl border border-slate-200 mt-4"><div><label class="block text-xs font-bold text-slate-500 mb-1">Academic (₹)</label><input type="number" id="pAcademicAmount" value="${isEdit ? (p.amount - (p.fine || 0)) : '0'}" required min="0" oninput="calculateComponentTotal()" class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none text-sm font-bold text-slate-700 transition-colors"></div><div><label class="block text-xs font-bold text-amber-600 mb-1">Fine (₹)</label><input type="number" id="pFineAmount" value="${isEdit ? (p.fine || 0) : '0'}" min="0" oninput="calculateComponentTotal()" class="w-full px-4 py-2.5 bg-white border border-amber-200 rounded-xl outline-none focus:border-amber-400 text-sm font-bold text-amber-700 transition-colors"></div><div><label class="block text-xs font-bold text-emerald-600 mb-1">Total (₹)</label><input type="number" id="pGrandTotal" value="${isEdit ? p.amount : '0'}" readonly class="w-full px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl outline-none text-sm font-black text-emerald-700 pointer-events-none"></div></div>
            <div class="grid grid-cols-2 gap-4"><div><label class="block text-xs font-bold text-slate-500 mb-1">Method *</label><select id="pMethod" required onchange="document.getElementById('upiBox').className = this.value !== 'Cash' ? '' : 'hidden';" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 text-sm transition-colors"><option value="Cash" ${isEdit && p.paymentMethod === 'Cash' ? 'selected' : ''}>Cash</option><option value="UPI" ${isEdit && p.paymentMethod.includes('UPI') ? 'selected' : ''}>UPI</option><option value="Bank Transfer" ${isEdit && p.paymentMethod === 'Bank Transfer' ? 'selected' : ''}>Bank Transfer</option></select></div><div><label class="block text-xs font-bold text-slate-500 mb-1">Date *</label><input type="date" id="pDate" required value="${pDate}" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 text-sm transition-colors"></div></div>
            <div id="upiBox" class="${isEdit && p.paymentMethod !== 'Cash' ? '' : 'hidden'}"><label class="block text-xs font-bold text-slate-500 mb-1">Txn ID</label><input type="text" id="pUpiId" value="${isEdit ? (p.transactionId || '') : ''}" placeholder="e.g. T202..." class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 text-sm uppercase transition-colors"></div>
            <div><label class="block text-xs font-bold text-slate-500 mb-1">Remarks</label><input type="text" id="pRemarks" value="${isEdit ? (p.remarks || '') : ''}" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 text-sm transition-colors"></div>
            ${!isEdit ? `
            <div class="flex items-center justify-between bg-white border border-slate-200 p-4 rounded-xl shadow-sm mt-4">
                <div>
                    <p class="text-sm font-bold text-slate-800">Auto-Email Receipt</p>
                    <p class="text-xs text-slate-500 font-medium">Send an instant copy to the student's email</p>
                </div>
                <label class="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" id="pSendEmail" class="sr-only peer" ${sessionStorage.getItem('feehub_autoEmail') !== 'off' ? 'checked' : ''} onchange="sessionStorage.setItem('feehub_autoEmail', this.checked ? 'on' : 'off')">
                    <div class="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
            </div>` : ''}
            <div class="pt-4 border-t border-slate-100 flex justify-end gap-3"><button type="button" onclick="closeM()" class="px-6 py-2.5 rounded-xl font-bold border border-slate-200 text-slate-600 text-sm hover:bg-slate-50 transition-colors">Cancel</button><button type="submit" id="savePayBtn" class="bg-emerald-600 text-white font-bold py-2.5 px-6 rounded-xl shadow-md shadow-emerald-600/20 text-sm hover:bg-emerald-700 transition-all active:scale-95">${isEdit ? 'Update' : 'Save'}</button></div>
        </form>`;
            G('OV').classList.replace('hidden', 'flex'); if (isEdit) { window.CURRENT_EDIT_PAYMENT = p; updatePaymentFormUX(true); } else { window.CURRENT_EDIT_PAYMENT = null; }
        }
        async function savePayment(e, editId = '') {
            e.preventDefault(); const btn = G('savePayBtn'); const studentId = G('pStudentId').value;
            if (!editId && !studentId) return alert("Select a student."); btn.disabled = true; btn.textContent = "Saving...";
            // 🔥 GRAB THE TOGGLE VALUE
            const sendEmail = G('pSendEmail') ? G('pSendEmail').checked : false;
            const components = []; document.querySelectorAll('.pay-comp-amt').forEach(i => { if (Number(i.value) > 0) components.push({ name: i.getAttribute('data-name'), amount: Number(i.value) }); });
            const payload = { academicAmount: Number(G('pAcademicAmount').value), fineAmount: Number(G('pFineAmount').value), method: G('pMethod').value, remarks: G('pRemarks').value, manualReceipt: G('pReceipt') ? G('pReceipt').value : '', transactionId: G('pUpiId') ? G('pUpiId').value : '', paymentDate: G('pDate').value, components: components, sendEmail: sendEmail }; // Include it in payload
            if (!editId) payload.studentId = studentId;
            const url = editId ? `/api/payments/${editId}` : '/api/payments';
            try {
                const res = await fetch(url, { method: editId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(payload) });
                const data = await res.json(); if (data.success) { closeM(); fetchDashboardData(); showToast("Transaction saved successfully!"); } else { showToast(data.message, 'error'); btn.disabled = false; btn.textContent = editId ? 'Update' : 'Save'; }
            } catch (e) { showToast('Server Error', 'error'); btn.disabled = false; }
        }
        async function deletePayment(paymentId) {
            if (!confirm("Permanently delete this payment?")) return;
            try {
                const res = await fetch(`/api/payments/${paymentId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
                const result = await res.json(); if (result.success) { fetchDashboardData(); showToast("Payment deleted."); } else showToast(result.message, 'error');
            } catch (e) { showToast('Server Error.', 'error'); }
        }
        function openExportModal() {
            G('MTL').textContent = 'Export Transaction Ledger';
            G('MBD').innerHTML = `
        <form class="space-y-4">
            <div class="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-4"><p class="text-sm text-blue-800 font-medium">Download a detailed report of all recorded transactions.</p></div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4"><div><label class="block text-xs font-bold text-slate-500 mb-1">Start Date</label><input type="date" id="expStart" class="w-full px-4 py-2.5 bg-slate-50 border rounded-xl text-sm outline-none focus:border-blue-500"></div><div><label class="block text-xs font-bold text-slate-500 mb-1">End Date</label><input type="date" id="expEnd" class="w-full px-4 py-2.5 bg-slate-50 border rounded-xl text-sm outline-none focus:border-blue-500"></div></div>
            <div class="pt-4 border-t mt-6 flex justify-end gap-3"><button type="button" onclick="closeM()" class="px-6 py-2.5 rounded-xl font-bold border text-slate-600 text-sm hover:bg-slate-50 transition-colors">Cancel</button><button type="button" onclick="exportLedgerCSV(event)" class="bg-emerald-600 text-white font-bold py-2.5 px-6 rounded-xl shadow-md text-sm hover:bg-emerald-700 transition-colors">CSV Excel</button><button type="button" onclick="exportLedgerPDF(event)" class="bg-blue-600 text-white font-bold py-2.5 px-6 rounded-xl shadow-md text-sm hover:bg-blue-700 transition-colors">PDF Report</button></div>
        </form>`;
            G('OV').classList.replace('hidden', 'flex');
        }
        function getFilteredExportData() {
            const startStr = G('expStart').value; const endStr = G('expEnd').value; let filtered = PAYMENTS;
            if (startStr) { const startDate = new Date(startStr); filtered = filtered.filter(p => new Date(p.paymentDate || p.createdAt) >= startDate); }
            if (endStr) { const endDate = new Date(endStr); endDate.setHours(23, 59, 59, 999); filtered = filtered.filter(p => new Date(p.paymentDate || p.createdAt) <= endDate); }
            return filtered;
        }
        function exportLedgerCSV(e) {
            e.preventDefault(); const filtered = getFilteredExportData(); if (filtered.length === 0) return alert("No transactions found.");
            const csvData = filtered.map(p => ({ "Date": new Date(p.paymentDate || p.createdAt).toLocaleDateString('en-IN'), "Receipt No": p.receiptNumber || `REC-${p._id.slice(-6).toUpperCase()}`, "Student Name": p.studentId ? p.studentId.name : 'Unknown', "Course": p.studentId ? p.studentId.course : '-', "Batch": p.studentId ? p.studentId.batch : '-', "Method": p.paymentMethod || p.method || 'CASH', "Txn ID": p.transactionId || '-', "Academic Fee": p.amount - (p.fine || 0), "Late Fee": p.fine || 0, "Total Amount": p.amount, "Remarks": p.remarks || '-' }));
            const csv = Papa.unparse(csvData); const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' }); const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = `FeeHub_Ledger_${Date.now()}.csv`; a.click(); closeM();
        }
        function exportLedgerPDF(e) {
            e.preventDefault(); const filtered = getFilteredExportData(); if (filtered.length === 0) return alert("No transactions found.");
            const { jsPDF } = window.jspdf; const doc = new jsPDF('landscape');
            const safeInstName = CU.institutionName ? CU.institutionName.toUpperCase() : 'FEEHUB INSTITUTION';
            doc.setFillColor(37, 99, 235); doc.rect(0, 0, 300, 35, 'F'); doc.setTextColor(255, 255, 255); doc.setFontSize(18); doc.setFont("helvetica", "bold"); doc.text(safeInstName, 14, 22);
            doc.setFontSize(10); doc.setFont("helvetica", "normal"); const startStr = G('expStart').value; const endStr = G('expEnd').value;
            doc.text(`Transaction Report | Date Range: ${startStr || endStr ? `${startStr || 'Start'} to ${endStr || 'End'}` : 'All Time'} | Total: ${filtered.length}`, 14, 28);
            const tableData = filtered.map(p => [new Date(p.paymentDate || p.createdAt).toLocaleDateString('en-IN'), p.receiptNumber || `REC-${p._id.slice(-6).toUpperCase()}`, p.studentId ? p.studentId.name : 'Unknown', p.studentId ? `${p.studentId.course} (${p.studentId.batch})` : '-', p.paymentMethod || p.method || 'CASH', p.transactionId || '-', fmt(p.amount)]);
            const totalRevenue = filtered.reduce((sum, p) => sum + p.amount, 0); tableData.push([{ content: 'TOTAL REVENUE', colSpan: 6, styles: { halign: 'right', fontStyle: 'bold' } }, { content: fmt(totalRevenue), styles: { fontStyle: 'bold', textColor: [16, 185, 129] } }]);
            doc.autoTable({ startY: 45, head: [['Date', 'Receipt No', 'Student', 'Course/Batch', 'Method', 'Txn ID', 'Amount']], body: tableData, theme: 'grid', headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' }, styles: { fontSize: 9 }, columnStyles: { 6: { halign: 'right' } } });
            doc.save(`FeeHub_Ledger_${Date.now()}.pdf`); closeM();
        }
        function pgStaff() {
            let rows = STAFF_DATA.map((st, index) => {
                const isMe = st._id === DASH_DATA.userId;
                return `<tr class="hover:bg-slate-50/80 border-b border-slate-100 transition-colors"><td class="py-4 px-4 sm:px-6 whitespace-nowrap"><div class="flex items-center gap-3"><div class="w-10 h-10 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center font-bold text-slate-600 text-sm border border-slate-300">${ini(st.name)}</div><div><p class="text-sm font-bold text-slate-900">${st.name} ${isMe ? '<span class="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded ml-1 tracking-wider uppercase font-bold">You</span>' : ''}</p><p class="text-xs text-slate-500 font-medium mt-0.5">${st.email}</p></div></div></td><td class="py-4 px-4 sm:px-6 whitespace-nowrap"><span class="${st.role === 'InstitutionAdmin' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-slate-50 text-slate-700 border-slate-200'} px-2.5 py-1 rounded-md text-[10px] font-bold border uppercase tracking-wider">${st.role === 'InstitutionAdmin' ? 'Admin' : 'Cashier / Staff'}</span></td><td class="py-4 px-4 sm:px-6 whitespace-nowrap text-right">${!isMe ? `<button onclick="deleteStaff('${st._id}')" class="text-red-500 hover:text-red-700 font-bold text-xs bg-red-50 hover:bg-red-100 border border-red-100 px-3 py-1.5 rounded-lg transition-colors">Revoke Access</button>` : ''}</td></tr>`;
            }).join('');
            let tableHTML = STAFF_DATA.length > 0 ? `<div class="overflow-x-auto"><table class="w-full text-left border-collapse min-w-[500px]"><thead><tr class="bg-slate-50/50 border-b border-slate-100"><th class="py-3 px-4 sm:px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">User</th><th class="py-3 px-4 sm:px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Role</th><th class="py-3 px-4 sm:px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th></tr></thead><tbody>${rows}</tbody></table></div>` : `<div class="py-12 text-center text-slate-400 font-bold">No staff accounts found.</div>`;
            return `
    <div class="mb-8 animate-fade-in"><h2 class="text-3xl font-extrabold text-slate-900 tracking-tight">Staff Management</h2><p class="text-sm text-slate-500 mt-1">Create accounts for your cashiers and admins.</p></div>
    <div class="glass-card rounded-2xl overflow-hidden animate-slide-up" style="animation-delay: 50ms;">
        <div class="px-5 py-4 border-b border-slate-100/50 flex justify-between items-center">
            <h3 class="font-bold text-lg text-slate-800">Institution Accounts <span class="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full text-xs ml-2">${STAFF_DATA.length}</span></h3>
            <button onclick="openStaffModal()" class="bg-slate-900 text-white font-semibold py-2 px-4 rounded-xl text-sm shadow-md hover:bg-slate-800 transition-colors">+ Add User</button>
        </div>
        ${tableHTML}
    </div>`;
        }
        function openStaffModal() {
            G('MTL').textContent = 'Add New Staff Member';
            G('MBD').innerHTML = `
        <form onsubmit="saveStaff(event)" class="space-y-4">
            <div><label class="block text-xs font-bold text-slate-500 mb-1">Full Name</label><input type="text" id="stName" required placeholder="e.g. John Doe" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500"></div>
            <div><label class="block text-xs font-bold text-slate-500 mb-1">Login Email</label><input type="email" id="stEmail" required placeholder="staff@institution.com" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500"></div>
            <div><label class="block text-xs font-bold text-slate-500 mb-1">Temporary Password</label><input type="text" id="stPass" required placeholder="Min 6 characters" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500"></div>
            <div><label class="block text-xs font-bold text-slate-500 mb-1">Access Level</label><select id="stRole" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-blue-500"><option value="Staff">Cashier / Staff (Read/Write Payments)</option><option value="InstitutionAdmin">Admin (Full Workspace Access)</option></select></div>
            <div class="pt-4 border-t border-slate-100 mt-6 flex justify-end gap-3"><button type="button" onclick="closeM()" class="px-6 py-2.5 rounded-xl font-bold border border-slate-200 text-slate-600 text-sm hover:bg-slate-50 transition-colors">Cancel</button><button type="submit" id="saveStaffBtn" class="bg-slate-900 text-white font-bold py-2.5 px-6 rounded-xl shadow-md text-sm hover:bg-slate-800 transition-colors">Create Account</button></div>
        </form>`;
            G('OV').classList.replace('hidden', 'flex');
        }
        async function saveStaff(e) {
            e.preventDefault(); const btn = G('saveStaffBtn'); btn.disabled = true; btn.textContent = "Creating...";
            const payload = { name: G('stName').value, email: G('stEmail').value, password: G('stPass').value, role: G('stRole').value };
            try {
                const res = await fetch('/api/staff', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(payload) });
                const data = await res.json(); if (data.success) { closeM(); fetchDashboardData(); showToast("Staff account created."); } else { showToast(data.message, 'error'); btn.disabled = false; btn.textContent = "Create Account"; }
            } catch (error) { showToast('Server Error.', 'error'); btn.disabled = false; }
        }
        async function deleteStaff(id) {
            if (!confirm("Revoke this user's access immediately?")) return;
            try {
                const res = await fetch(`/api/staff/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
                const result = await res.json(); if (result.success) { fetchDashboardData(); showToast("Access revoked."); } else showToast(result.message, 'error');
            } catch (e) { showToast('Server Error.', 'error'); }
        }
        // 🔥 BULK CSV IMPORT ENGINE
        function triggerBulkImport() {
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = '.csv';
            fileInput.onchange = (e) => {
                const file = e.target.files[0];
                if (!file) return;
                Papa.parse(file, {
                    header: true,
                    skipEmptyLines: true,
                    complete: async function (results) {
                        const data = results.data;
                        if (data.length === 0) return showToast('CSV is empty.', 'error');
                        showToast(`Processing records... Please wait.`);
                        // Map the CSV data with aggressive fallback for alternate header names (e.g. 'ID' vs 'RollNo')
                        const studentsToUpload = data.map((row) => {
                            const parsedCourse = row.Course || row.course || '';
                            const parsedBatch = row.Batch || row.batch || '';
                            // 🚀 Auto-Assign Fees if missing based on Master Config (Reimplemented User Feature)
                            let assignedFee = Number(row.TotalFees || row.totalFees || row.Total || row.total || 0);
                            if (assignedFee === 0 && parsedCourse && parsedBatch) {
                                const structure = FEE_STRUCTURES.find(f =>
                                    String(f.course).trim().toLowerCase() === String(parsedCourse).trim().toLowerCase() &&
                                    String(f.batchYear).trim().toLowerCase() === String(parsedBatch).trim().toLowerCase()
                                );
                                if (structure) assignedFee = structure.totalFee;
                            }
                            return {
                                name: row.Name || row.name || '',
                                studentIdNumber: row.RollNo || row.rollno || row.studentIdNumber || row.ID || row.id || '',
                                course: parsedCourse,
                                batch: parsedBatch,
                                email: row.Email || row.email || '',
                                phone: row.Phone || row.phone || '',
                                parentName: row.ParentName || row.parentName || row.Parent || row.parent || '',
                                totalFees: assignedFee,
                                status: 'Active'
                            };
                        }).filter(s => s.name && s.course && s.batch);
                        if (studentsToUpload.length === 0) {
                            return showToast('No valid rows found. Please check your column headers.', 'error');
                        }
                        // Send the mapped payload to the backend
                        try {
                            const res = await fetch('/api/students/bulk', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                                body: JSON.stringify({ students: studentsToUpload })
                            });
                            const result = await res.json();
                            if (result.success) {
                                fetchDashboardData();
                                showToast(`Successfully upserted/imported ${result.count} students!`);
                            } else {
                                showToast(result.message || "Failed to import students. Check IDs.", 'error');
                            }
                        } catch (e) {
                            showToast('Server error during upload.', 'error');
                        }
                    }
                });
            };
            fileInput.click();
        }
        // ═══════════════════ INSTITUTION SETTINGS MODAL ═══════════════════
        let SETTINGS_LOGO_DATA = null; // holds the new logo base64
        function openSettingsModal() {
            if (CU.role !== 'admin') {
                showToast('Only admins can edit settings.', 'error');
                return;
            }
            SETTINGS_LOGO_DATA = null;
            G('MTL').textContent = 'Institution Settings';
            const currentLogo = CU.institutionLogo || '';
            const logoPreviewHTML = currentLogo 
                ? `<img src="${currentLogo}" class="w-full h-full object-cover" id="settingsLogoPreview">`
                : `<div class="flex flex-col items-center justify-center text-slate-400" id="settingsLogoPreview">
                    <svg class="w-8 h-8 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                    <span class="text-[10px] font-bold">No Logo</span>
                   </div>`;
            G('MBD').innerHTML = `
        <form onsubmit="saveSettings(event)" class="space-y-5">
            <div class="flex flex-col items-center">
                <div class="relative group">
                    <div class="w-28 h-28 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center overflow-hidden transition-all group-hover:border-indigo-400 group-hover:bg-indigo-50/30" id="settingsLogoContainer">
                        ${logoPreviewHTML}
                    </div>
                    <button type="button" onclick="document.getElementById('logoFileInput').click()" class="absolute -bottom-2 -right-2 w-9 h-9 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 transition-all hover:scale-110 active:scale-95">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                    </button>
                    ${currentLogo ? `<button type="button" onclick="removeSettingsLogo()" class="absolute -top-2 -right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition-all text-xs font-bold" title="Remove logo">✕</button>` : ''}
                </div>
                <input type="file" id="logoFileInput" accept="image/png,image/jpeg,image/webp,image/svg+xml" class="hidden" onchange="handleLogoSelect(event)">
                <p class="text-[11px] text-slate-400 font-medium mt-3">Upload institution logo (PNG, JPG, WebP — max 2MB)</p>
            </div>
            <div>
                <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Admin Name</label>
                <input type="text" id="setAdminName" value="${CU.name}" required placeholder="Your name" class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 text-sm font-medium transition-all">
            </div>
            <div>
                <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Institution Name</label>
                <input type="text" id="setInstName" value="${CU.institutionName}" required placeholder="Your institution name" class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 text-sm font-medium transition-all">
            </div>
            <div class="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button type="button" onclick="closeM()" class="px-6 py-2.5 rounded-xl font-bold border border-slate-200 text-slate-600 text-sm hover:bg-slate-50 transition-colors">Cancel</button>
                <button type="submit" id="saveSettingsBtn" class="bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold py-2.5 px-6 rounded-xl shadow-lg shadow-indigo-500/25 text-sm hover:shadow-indigo-500/40 transition-all active:scale-95">Save Changes</button>
            </div>
        </form>`;
            G('OV').classList.replace('hidden', 'flex');
        }
        function handleLogoSelect(event) {
            const file = event.target.files[0];
            if (!file) return;
            if (file.size > 2 * 1024 * 1024) { showToast('Logo must be under 2MB.', 'error'); return; }
            if (!['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'].includes(file.type)) { showToast('Unsupported file type.', 'error'); return; }
            const reader = new FileReader();
            reader.onload = function(e) {
                SETTINGS_LOGO_DATA = e.target.result;
                const container = G('settingsLogoContainer');
                container.innerHTML = `<img src="${SETTINGS_LOGO_DATA}" class="w-full h-full object-cover" id="settingsLogoPreview">`;
                // Add remove button if not present
                const parent = container.parentElement;
                if (!parent.querySelector('.remove-logo-btn')) {
                    const removeBtn = document.createElement('button');
                    removeBtn.type = 'button';
                    removeBtn.className = 'remove-logo-btn absolute -top-2 -right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition-all text-xs font-bold';
                    removeBtn.title = 'Remove logo';
                    removeBtn.textContent = '✕';
                    removeBtn.onclick = () => removeSettingsLogo();
                    parent.appendChild(removeBtn);
                }
            };
            reader.readAsDataURL(file);
        }
        function removeSettingsLogo() {
            SETTINGS_LOGO_DATA = ''; // empty string = clear logo
            const container = G('settingsLogoContainer');
            container.innerHTML = `<div class="flex flex-col items-center justify-center text-slate-400" id="settingsLogoPreview">
                <svg class="w-8 h-8 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                <span class="text-[10px] font-bold">No Logo</span>
            </div>`;
            // Remove the remove button
            const parent = container.parentElement;
            const removeBtn = parent.querySelector('.remove-logo-btn');
            if (removeBtn) removeBtn.remove();
            // Also remove the static one
            const staticRemoveBtn = parent.querySelector('button[title="Remove logo"]');
            if (staticRemoveBtn) staticRemoveBtn.remove();
        }
        async function saveSettings(e) {
            e.preventDefault();
            const btn = G('saveSettingsBtn');
            btn.disabled = true; btn.textContent = 'Saving...';
            const payload = {
                adminName: G('setAdminName').value,
                institutionName: G('setInstName').value
            };
            // Only include logo if changed
            if (SETTINGS_LOGO_DATA !== null) {
                payload.logo = SETTINGS_LOGO_DATA;
            }
            try {
                const res = await fetch('/api/dashboard/settings', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify(payload)
                });
                const data = await res.json();
                if (data.success) {
                    closeM();
                    showToast('Settings updated successfully!');
                    fetchDashboardData(); // Reload everything
                } else {
                    showToast(data.message, 'error');
                    btn.disabled = false; btn.textContent = 'Save Changes';
                }
            } catch (err) {
                showToast('Server error. Please try again.', 'error');
                btn.disabled = false; btn.textContent = 'Save Changes';
            }
        }
        // BOOT ENGINE
        fetchDashboardData();
    </script>
    <script>
        // 🔒 CORRECT DASHBOARD SECURITY
        window.addEventListener('pageshow', function (event) {
            if (event.persisted && !localStorage.getItem('feehub_token')) {
                window.location.replace('login.html');
            }
        });
    </script>
</body>
</html>
```

## feehub-loader.css
```css
/* feehub-loader.css */

:root {
  --loader-bg: #030712;
  --loader-accent: #6366f1;
  --loader-accent-glow: rgba(99, 102, 241, 0.4);
  --loader-secondary: #0ea5e9;
  --loader-success: #10b981;
}
#feehub-page-loader {
  position: fixed;
  inset: 0;
  z-index: 999999;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  background: var(--loader-bg);
  opacity: 1;
  transition: opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  pointer-events: all;
  overflow: hidden;
  font-family: 'Inter', -apple-system, sans-serif;
}
#feehub-page-loader.loader-hidden {
  opacity: 0;
  pointer-events: none;
}
.loader-nebula {
  position: absolute;
  inset: 0;
  overflow: hidden;
}
.loader-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.15;
  animation: bgOrbit 25s ease-in-out infinite alternate;
}
.orb-1 { width: 500px; height: 500px; background: var(--loader-accent); top: -10%; left: -5%; }
.orb-2 { width: 400px; height: 400px; background: var(--loader-secondary); bottom: -5%; right: -5%; animation-delay: -5s; }
.orb-3 { width: 300px; height: 300px; background: #7c3aed; top: 40%; left: 30%; animation-delay: -10s; }
@keyframes bgOrbit {
  0% { transform: translate(0, 0) scale(1); }
  100% { transform: translate(80px, 40px) scale(1.2); }
}
.loader-grid {
  position: absolute;
  inset: 0;
  background-image: 
    linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
  background-size: 50px 50px;
  perspective: 1000px;
  mask-image: radial-gradient(circle at center, black 30%, transparent 80%);
}
.loader-grid-inner {
  position: absolute;
  inset: -100%;
  background-image: inherit;
  background-size: inherit;
  transform: rotateX(45deg);
  animation: gridMove 40s linear infinite;
}
@keyframes gridMove {
  from { background-position: 0 0; }
  to { background-position: 0 1000px; }
}
.loader-glass {
  position: relative;
  z-index: 10;
  background: rgba(255, 255, 255, 0.02);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 40px;
  padding: 60px 80px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 40px;
  box-shadow: 
    0 25px 50px -12px rgba(0, 0, 0, 0.5),
    inset 0 1px 1px rgba(255, 255, 255, 0.05);
}
.logo-stack {
  position: relative;
  width: 120px;
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.logo-main {
  width: 72px;
  height: 72px;
  background: linear-gradient(135deg, var(--loader-accent), #7c3aed);
  border-radius: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 900;
  font-size: 26px;
  letter-spacing: -1px;
  box-shadow: 0 0 40px var(--loader-accent-glow);
  position: relative;
  z-index: 5;
  animation: logoBreath 3s ease-in-out infinite;
}
@keyframes logoBreath {
  0%, 100% { transform: scale(1); box-shadow: 0 0 30px var(--loader-accent-glow); }
  50% { transform: scale(1.04); box-shadow: 0 0 50px var(--loader-accent-glow); }
}
.logo-rings {
  position: absolute;
  inset: -10px;
  border: 2px solid transparent;
  border-top-color: var(--loader-accent);
  border-radius: 50%;
  animation: ringSpin 2s cubic-bezier(0.5, 0, 0.5, 1) infinite;
  opacity: 0.6;
}
.ring-2 {
  inset: -20px;
  border-top-color: var(--loader-secondary);
  animation-duration: 3s;
  animation-direction: reverse;
  opacity: 0.3;
}
.ring-3 {
  inset: -30px;
  border-top-color: var(--loader-success);
  animation-duration: 4s;
  opacity: 0.15;
}
@keyframes ringSpin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
.brand-txt {
  text-align: center;
}
.brand-name {
  font-size: 32px;
  font-weight: 900;
  letter-spacing: -1.5px;
  background: linear-gradient(to bottom, #fff 30%, #94a3b8);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 4px;
}
.brand-status {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 5px;
  text-transform: uppercase;
  color: #64748b;
  opacity: 0.8;
}
.progress-wrap {
  width: 280px;
  position: relative;
}
.progress-track {
  height: 4px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 20px;
  overflow: hidden;
  position: relative;
  border: 1px solid rgba(255, 255, 255, 0.03);
}
.progress-fill {
  height: 100%;
  width: 0%;
  background: linear-gradient(90deg, #4f46e5, #0ea5e9, #10b981);
  background-size: 200% 100%;
  box-shadow: 0 0 15px rgba(99, 102, 241, 0.4);
  transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  animation: flowGradient 2s linear infinite;
}
@keyframes flowGradient {
  0% { background-position: 0% 50%; }
  100% { background-position: 200% 50%; }
}
.progress-scanner {
  position: absolute;
  top: 0; left: 0; height: 100%;
  width: 40px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
  animation: scanning 1.5s ease-in-out infinite;
}
@keyframes scanning {
  0% { transform: translateX(-50px); }
  100% { transform: translateX(330px); }
}
.status-label {
  margin-top: 14px;
  color: #94a3b8;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: opacity 0.3s ease;
}
.loader-dot {
  width: 3px;
  height: 3px;
  background: var(--loader-accent);
  border-radius: 50%;
  animation: dotPulse 1.5s ease-in-out infinite;
}
@keyframes dotPulse {
  0%, 100% { opacity: 0.2; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1.4); }
}
.loader-scan-line {
  position: absolute;
  top: 0; left: 0; width: 100%; height: 100px;
  background: linear-gradient(to bottom, rgba(99, 102, 241, 0.05), transparent);
  animation: vScan 3s linear infinite;
  pointer-events: none;
}
@keyframes vScan {
  from { transform: translateY(-100%); }
  to { transform: translateY(100vh); }
}
@media (max-width: 640px) {
  .loader-glass {
    padding: 40px 30px;
    width: 90%;
    border-radius: 30px;
  }
  .progress-wrap { width: 200px; }
  .logo-stack { transform: scale(0.8); }
}

```

## feehub-loader.js
```js
// feehub-loader.js
(function () {
  'use strict';
  const START_TIME = Date.now();
  const MIN_DELAY = 2500; 
  let hideRequested = false;
  const antiFlashStyle = document.createElement('style');
  antiFlashStyle.id = 'feehub-anti-flash';
  antiFlashStyle.innerHTML = `
    html, body { background-color: #030712 !important; }
    body > *:not(#feehub-page-loader) {
      opacity: 0 !important;
      visibility: hidden !important;
      transition: opacity 0.5s ease-in-out !important;
    }
  `;
  document.documentElement.appendChild(antiFlashStyle);
  const loaderHTML = `
  <div id="feehub-page-loader">
    <div class="loader-nebula">
      <div class="loader-orb orb-1"></div>
      <div class="loader-orb orb-2"></div>
      <div class="loader-orb orb-3"></div>
    </div>
    <div class="loader-grid">
      <div class="loader-grid-inner"></div>
    </div>
    <div class="loader-scan-line"></div>
    <div class="loader-glass">
      <div class="logo-stack">
        <div class="logo-rings"></div>
        <div class="logo-rings ring-2"></div>
        <div class="logo-rings ring-3"></div>
        <div class="logo-main">FH</div>
      </div>
      <div class="brand-txt">
        <div class="brand-name">FeeHub</div>
        <div class="brand-status">Secure Workspace</div>
      </div>
      <div class="progress-wrap">
        <div class="progress-track">
          <div class="progress-fill" id="loader-progress-bar" style="width: 0%"></div>
          <div class="progress-scanner"></div>
        </div>
        <div class="status-label">
          <span id="loader-status-text">Initializing Engine</span>
          <div class="loader-dot"></div>
          <div class="loader-dot" style="animation-delay: 0.2s"></div>
          <div class="loader-dot" style="animation-delay: 0.4s"></div>
        </div>
      </div>
    </div>
  </div>`;
  function injectLoader() {
    if (document.getElementById('feehub-page-loader')) return;
    const wrapper = document.createElement('div');
    wrapper.innerHTML = loaderHTML.trim();
    const loaderEl = wrapper.firstChild;
    document.body.insertBefore(loaderEl, document.body.firstChild);
    setTimeout(() => {
        const bar = document.getElementById('loader-progress-bar');
        if (bar) bar.style.width = '30%';
    }, 20);
  }
  const statusMessages = [
    'Secure Handshake',
    'Decrypting Vault',
    'Initializing Multi-Tenancy',
    'Syncing Fee Masters',
    'Compiling Dashboard',
    'Environment Ready'
  ];
  let msgIndex = 0;
  let statusInterval = null;
  function startStatusCycle() {
    const statusEl = document.getElementById('loader-status-text');
    const bar = document.getElementById('loader-progress-bar');
    if (!statusEl) return;
    statusInterval = setInterval(function () {
      msgIndex = (msgIndex + 1) % statusMessages.length;
      statusEl.style.opacity = '0';
      setTimeout(function () {
        statusEl.textContent = statusMessages[msgIndex];
        statusEl.style.opacity = '1';
        if (bar) {
            const currentWidth = parseInt(bar.style.width) || 30;
            if (currentWidth < 95) {
                const boost = 95 - currentWidth;
                bar.style.width = (currentWidth + Math.min(10, boost * 0.4)) + '%';
            }
        }
      }, 300);
    }, 1500);
  }
  function hideLoader() {
    if (hideRequested) return;
    hideRequested = true;
    const elapsed = Date.now() - START_TIME;
    const remaining = Math.max(200, MIN_DELAY - elapsed);
    setTimeout(function () {
        if (statusInterval) clearInterval(statusInterval);
        const loader = document.getElementById('feehub-page-loader');
        const bar = document.getElementById('loader-progress-bar');
        const statusEl = document.getElementById('loader-status-text');
        if (bar) bar.style.width = '100%';
        if (statusEl) statusEl.textContent = 'System Ready';
        setTimeout(function () {
            if (loader) loader.classList.add('loader-hidden');
            const antiFlash = document.getElementById('feehub-anti-flash');
            if (antiFlash) antiFlash.remove();
            setTimeout(function () {
                if (loader && loader.parentNode) loader.parentNode.removeChild(loader);
            }, 600);
        }, 150);
    }, remaining);
  }
  if (document.body) {
    injectLoader();
    startStatusCycle();
  } else {
    document.addEventListener('DOMContentLoaded', function () {
      injectLoader();
      startStatusCycle();
    });
  }
  window.feehubLoaderHide = hideLoader;
  window.addEventListener('load', function () {
    if (!window.FEEHUB_MANUAL_LOADER) {
        hideLoader();
    }
  });
  setTimeout(() => {
    if (!hideRequested) hideLoader();
  }, 20000);
})();

```

## hq-dashboard.html
```html
<!-- hq-dashboard.html -->
﻿<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Platform Control Center | FeeHub HQ</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
    <script>
        (function() {
            var t = localStorage.getItem('feehub_token');
            if (!t) { window.location.replace('hq-login.html'); return; }
            try { var p = JSON.parse(atob(t.split('.')[1]));
                if (p.exp * 1000 < Date.now() || p.role !== 'SuperAdmin') { window.location.replace('hq-login.html'); }
            } catch(e) { window.location.replace('hq-login.html'); }
        })();
    </script>
    <script>
        tailwind.config = { theme: { extend: { fontFamily: { sans: ['Inter', 'sans-serif'] } } } }
    </script>
    <style>
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .glass { background: rgba(255,255,255,0.7); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); }
        .card { background: #fff; border: 1px solid #f1f5f9; border-radius: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); transition: all 0.35s cubic-bezier(.4,0,.2,1); }
        .card:hover { border-color: #e2e8f0; transform: translateY(-3px); box-shadow: 0 20px 40px -12px rgba(0,0,0,0.08); }
        .input-hq { background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 14px; padding: 12px 18px; font-size: 14px; font-weight: 600; color: #0f172a; transition: all 0.25s; outline: none; width: 100%; }
        .input-hq::placeholder { color: #94a3b8; font-weight: 500; }
        .input-hq:focus { background: #fff; border-color: #818cf8; box-shadow: 0 0 0 4px rgba(99,102,241,0.08); }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        .animate-up { animation: fadeUp 0.5s cubic-bezier(.16,1,.3,1) forwards; opacity: 0; }
        .delay-1 { animation-delay: 60ms; } .delay-2 { animation-delay: 120ms; } .delay-3 { animation-delay: 180ms; } .delay-4 { animation-delay: 240ms; }
    </style>
    <link rel="stylesheet" href="feehub-loader.css">
    <script src="feehub-loader.js"></script>
</head>
<body class="bg-[#f8fafc] font-sans text-slate-800 antialiased overflow-x-hidden selection:bg-indigo-100 min-h-screen">
    <header class="lg:hidden glass sticky top-0 z-40 border-b border-slate-200/60 px-4 py-3 flex items-center justify-between">
        <div class="flex items-center gap-3">
            <div class="w-9 h-9 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-lg shadow-indigo-500/20">FH</div>
            <span class="font-black text-slate-900 text-lg tracking-tight">FeeHub HQ</span>
        </div>
        <div class="flex items-center gap-2">
            <button onclick="openModal()" class="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-transform shadow-lg">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M12 4v16m8-8H4"></path></svg> New
            </button>
            <button onclick="logout()" class="text-red-500 hover:bg-red-50 p-2 rounded-xl transition-colors" title="Sign Out">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
            </button>
        </div>
    </header>
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-6 lg:py-10">
        <div class="hidden lg:flex items-center justify-between mb-10 animate-up">
            <div class="flex items-center gap-4">
                <div class="w-12 h-12 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-xl shadow-indigo-500/20">FH</div>
                <div>
                    <h1 class="text-2xl font-black text-slate-900 tracking-tight">Platform Control Center</h1>
                    <p class="text-sm text-slate-500 font-medium">FeeHub HQ &middot; Master Administration</p>
                </div>
            </div>
            <div class="flex items-center gap-3">
                <button onclick="openModal()" class="group relative overflow-hidden bg-slate-900 text-white font-bold py-3 px-7 rounded-2xl transition-all shadow-xl shadow-slate-900/15 active:scale-95 flex items-center gap-2.5 text-sm">
                    <span class="relative z-10 flex items-center gap-2.5">
                        <svg class="w-4 h-4 text-indigo-400 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M12 4v16m8-8H4"></path></svg>
                        Deploy Instance
                    </span>
                    <div class="absolute inset-0 bg-gradient-to-r from-indigo-600 to-violet-600 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out z-0"></div>
                </button>
                <button onclick="logout()" class="bg-white border border-slate-200 text-red-500 hover:bg-red-50 hover:border-red-200 font-bold px-5 py-3 rounded-2xl text-sm transition-all flex items-center gap-2 shadow-sm">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                    Sign Out
                </button>
            </div>
        </div>
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 mb-8">
            <div class="card p-4 sm:p-6 animate-up delay-1">
                <div class="flex items-center gap-2 mb-3">
                    <div class="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center"><svg class="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1v1H9V7zm5 0h1v1h-1V7zm-5 4h1v1H9v-1zm5 0h1v1h-1v-1z"></path></svg></div>
                    <span class="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-slate-400">Instances</span>
                </div>
                <h3 class="text-3xl sm:text-4xl font-black text-slate-900" id="statInst">0</h3>
            </div>
            <div class="card p-4 sm:p-6 animate-up delay-2">
                <div class="flex items-center gap-2 mb-3">
                    <div class="w-8 h-8 rounded-xl bg-violet-50 flex items-center justify-center"><svg class="w-4 h-4 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg></div>
                    <span class="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-slate-400">Users</span>
                </div>
                <h3 class="text-3xl sm:text-4xl font-black text-slate-900" id="statUsers">0</h3>
            </div>
            <div class="card p-4 sm:p-6 animate-up delay-3">
                <div class="flex items-center gap-2 mb-3">
                    <div class="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center"><svg class="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg></div>
                    <span class="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-slate-400">Revenue</span>
                </div>
                <h3 class="text-2xl sm:text-4xl font-black text-emerald-600" id="statRevenue">&#8377;0</h3>
            </div>
            <div class="card p-4 sm:p-6 animate-up delay-4">
                <div class="flex items-center gap-2 mb-3">
                    <div class="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center"><svg class="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg></div>
                    <span class="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-slate-400">Uptime</span>
                </div>
                <h3 class="text-3xl sm:text-4xl font-black text-amber-600">99.9%</h3>
            </div>
        </div>
        <div class="card overflow-hidden animate-up delay-4">
            <div class="px-4 sm:px-8 py-5 border-b border-slate-100 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                <div>
                    <h3 class="font-bold text-slate-900 text-base sm:text-lg">Instance Registry</h3>
                    <p class="text-xs text-slate-500 font-medium">Live deployment targets across the network</p>
                </div>
                <div class="text-[10px] font-bold tracking-widest uppercase text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100 self-start flex items-center gap-1.5">
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> All Systems Nominal
                </div>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse min-w-[750px]">
                    <thead>
                        <tr class="bg-slate-50/80 border-b border-slate-100">
                            <th class="py-4 px-4 sm:px-8 text-[10px] font-bold uppercase tracking-widest text-slate-400">Institution</th>
                            <th class="py-4 px-4 sm:px-8 text-[10px] font-bold uppercase tracking-widest text-slate-400">Admin</th>
                            <th class="py-4 px-4 sm:px-8 text-[10px] font-bold uppercase tracking-widest text-slate-400">Status</th>
                            <th class="py-4 px-4 sm:px-8 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="tableBody" class="divide-y divide-slate-50">
                        <tr><td colspan="4" class="py-20 text-center">
                            <svg class="animate-spin h-6 w-6 text-indigo-500 mx-auto mb-3" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                            <p class="text-sm text-slate-400 font-medium">Connecting to network...</p>
                        </td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
    <div id="OV" class="fixed inset-0 z-[100] hidden items-center justify-center p-4" style="background:rgba(15,23,42,0.4);backdrop-filter:blur(8px);">
        <div class="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden transform scale-95 transition-transform duration-300 border border-slate-200" id="OVBox">
            <div class="px-6 sm:px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-indigo-50/60 to-white">
                <div>
                    <h3 class="text-xl font-black text-slate-900">Deploy New Instance</h3>
                    <p class="text-indigo-600 text-[10px] font-bold uppercase tracking-widest mt-1">Automated Provisioning</p>
                </div>
                <button onclick="closeModal()" class="w-9 h-9 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition-colors">&#10005;</button>
            </div>
            <div class="p-6 sm:p-8">
                <form id="deployForm" onsubmit="createInstitution(event)" class="space-y-6">
                    <div>
                        <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Institution Name</label>
                        <input type="text" id="iName" required placeholder="e.g. ABC College of Engineering" class="input-hq">
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div><label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Admin Name</label><input type="text" id="aName" required placeholder="Full Name" class="input-hq"></div>
                        <div><label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Contact Phone</label><input type="text" id="iPhone" placeholder="Phone (optional)" class="input-hq"></div>
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div><label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Login Email</label><input type="email" id="aEmail" required placeholder="admin@college.com" class="input-hq"></div>
                        <div><label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Temp Password</label><input type="text" id="aPass" required placeholder="Set initial password" class="input-hq"></div>
                    </div>
                    <div class="pt-4 border-t border-slate-100 flex flex-col-reverse sm:flex-row justify-end gap-3">
                        <button type="button" onclick="closeModal()" class="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-all text-sm text-center">Cancel</button>
                        <button type="submit" id="deployBtn" class="bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold py-3 px-8 rounded-xl hover:shadow-lg hover:shadow-indigo-500/25 transition-all flex items-center justify-center gap-2 active:scale-95 text-sm">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg> Deploy
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>
    <div id="editOV" class="fixed inset-0 z-[100] hidden items-center justify-center p-4" style="background:rgba(15,23,42,0.4);backdrop-filter:blur(8px);">
        <div class="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200">
            <div class="px-6 sm:px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-amber-50/60 to-white">
                <div>
                    <h3 class="text-xl font-black text-slate-900">Edit Instance</h3>
                    <p class="text-amber-600 text-[10px] font-bold uppercase tracking-widest mt-1">Modify Configuration</p>
                </div>
                <button onclick="closeEditModal()" class="w-9 h-9 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition-colors">&#10005;</button>
            </div>
            <div class="p-6 sm:p-8">
                <form id="editForm" onsubmit="saveEdit(event)" class="space-y-5">
                    <input type="hidden" id="editId">
                    <div><label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Institution Name</label><input type="text" id="editInstName" required class="input-hq"></div>
                    <div><label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Admin Name</label><input type="text" id="editAdminName" required class="input-hq"></div>
                    <div class="pt-4 border-t border-slate-100 flex flex-col-reverse sm:flex-row justify-end gap-3">
                        <button type="button" onclick="closeEditModal()" class="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-all text-sm text-center">Cancel</button>
                        <button type="submit" id="editBtn" class="bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold py-3 px-8 rounded-xl hover:shadow-lg hover:shadow-amber-500/25 transition-all flex items-center justify-center gap-2 active:scale-95 text-sm">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Save Changes
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>
    <div id="toast" class="fixed bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:w-auto bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl transform translate-y-24 opacity-0 transition-all duration-300 z-[200] flex items-center gap-3 font-semibold text-sm">
        <span id="toastIcon" class="flex-shrink-0">&#9889;</span>
        <span id="toastMsg">Notification</span>
    </div>
<script>
const token = localStorage.getItem('feehub_token');
if (!token) window.location.replace('hq-login.html');
const fmt = n => 'â‚¹' + Number(n).toLocaleString('en-IN');
const fmtShort = n => { n = Number(n); if (n >= 10000000) return 'â‚¹' + (n/10000000).toFixed(1) + 'Cr'; if (n >= 100000) return 'â‚¹' + (n/100000).toFixed(1) + 'L'; if (n >= 1000) return 'â‚¹' + (n/1000).toFixed(1) + 'K'; return 'â‚¹' + n; };
function logout() { localStorage.removeItem('feehub_token'); window.location.replace('hq-login.html'); }
function showToast(msg, isError = false) {
    const t = document.getElementById('toast');
    document.getElementById('toastMsg').textContent = msg;
    document.getElementById('toastIcon').innerHTML = isError ? '&#10060;' : '&#9889;';
    t.className = t.className.replace('bg-red-600', 'bg-slate-900').replace('bg-slate-900', isError ? 'bg-red-600' : 'bg-slate-900');
    t.classList.remove('translate-y-24', 'opacity-0');
    setTimeout(() => t.classList.add('translate-y-24', 'opacity-0'), 3500);
}
/* Deploy Modal */
function openModal() {
    const m = document.getElementById('OV'); m.classList.replace('hidden','flex');
    setTimeout(() => document.getElementById('OVBox').classList.replace('scale-95','scale-100'), 10);
}
function closeModal() {
    document.getElementById('OVBox').classList.replace('scale-100','scale-95');
    setTimeout(() => { document.getElementById('OV').classList.replace('flex','hidden'); document.getElementById('deployForm').reset(); }, 250);
}
/* Edit Modal */
function openEditModal(id, instName, adminName) {
    document.getElementById('editId').value = id;
    document.getElementById('editInstName').value = instName;
    document.getElementById('editAdminName').value = adminName;
    document.getElementById('editOV').classList.replace('hidden','flex');
}
function closeEditModal() { document.getElementById('editOV').classList.replace('flex','hidden'); }
async function saveEdit(e) {
    e.preventDefault();
    const id = document.getElementById('editId').value;
    const btn = document.getElementById('editBtn'); const orig = btn.innerHTML;
    btn.innerHTML = 'Saving...'; btn.disabled = true;
    try {
        const res = await fetch(`/api/hq/institutions/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ name: document.getElementById('editInstName').value, adminName: document.getElementById('editAdminName').value })
        });
        const data = await res.json();
        if (data.success) { closeEditModal(); showToast('Instance updated successfully.'); setTimeout(loadDashboard, 400); }
        else showToast(data.message, true);
    } catch(e) { showToast('Update failed.', true); }
    btn.innerHTML = orig; btn.disabled = false;
}
async function loadDashboard() {
    try {
        const res = await fetch('/api/hq/dashboard', { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await res.json();
        if (!data.success) { if (res.status === 403) { alert('SuperAdmin access required.'); logout(); } return; }
        const d = data.data;
        const clients = d.institutions.filter(i => i.email !== 'hq@feehub.com');
        document.getElementById('statInst').textContent = d.totalInstitutions;
        document.getElementById('statUsers').textContent = d.totalPlatformUsers;
        document.getElementById('statRevenue').textContent = fmtShort(d.totalPlatformRevenue);
        const tbody = document.getElementById('tableBody');
        if (clients.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" class="py-20 text-center"><p class="text-slate-400 font-semibold text-base mb-2">No instances deployed yet</p><p class="text-slate-400 text-sm">Click "Deploy Instance" to create your first one.</p></td></tr>`;
            return;
        }
        tbody.innerHTML = clients.map((inst, i) => {
            const off = inst.isActive === false;
            const sc = off ? 'bg-red-50 text-red-600 border-red-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100';
            const dc = off ? 'bg-red-500' : 'bg-emerald-500 animate-pulse';
            const st = off ? 'Suspended' : 'Online';
            const an = inst.adminName || 'N/A';
            const ae = inst.adminEmail || inst.email || '';
            return `
            <tr class="group hover:bg-indigo-50/30 transition-all duration-200 animate-up" style="animation-delay:${i*50}ms">
                <td class="py-5 px-4 sm:px-8">
                    <p class="font-bold text-slate-900 text-sm group-hover:text-indigo-700 transition-colors">${inst.name}</p>
                    <p class="text-[10px] text-slate-400 font-mono mt-0.5 truncate max-w-[180px]">${inst._id}</p>
                </td>
                <td class="py-5 px-4 sm:px-8">
                    <p class="font-semibold text-slate-700 text-sm">${an}</p>
                    <p class="text-[11px] text-slate-400 mt-0.5 truncate max-w-[180px]">${ae}</p>
                </td>
                <td class="py-5 px-4 sm:px-8">
                    <span class="inline-flex items-center gap-1.5 border px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest ${sc}">
                        <span class="w-1.5 h-1.5 rounded-full ${dc}"></span> ${st}
                    </span>
                </td>
                <td class="py-5 px-4 sm:px-8">
                    <div class="flex items-center justify-end gap-1.5">
                        <button onclick="openEditModal('${inst._id}','${inst.name.replace(/'/g,"\\'")}','${an.replace(/'/g,"\\'")}')" class="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 p-2 rounded-xl border border-transparent hover:border-indigo-100 transition-all" title="Edit">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                        </button>
                        <button onclick="toggleInstitution('${inst._id}')" class="${off ? 'text-emerald-500 hover:bg-emerald-50 hover:border-emerald-100' : 'text-amber-500 hover:bg-amber-50 hover:border-amber-100'} p-2 rounded-xl border border-transparent transition-all" title="${off ? 'Activate' : 'Suspend'}">
                            ${off ? '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>' : '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>'}
                        </button>
                        <button onclick="deleteInstitution('${inst._id}','${inst.name.replace(/'/g,"\\'")}')" class="text-slate-300 hover:text-red-500 hover:bg-red-50 hover:border-red-100 p-2 rounded-xl border border-transparent transition-all" title="Terminate">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                    </div>
                </td>
            </tr>`;
        }).join('');
    } catch(e) {
        document.getElementById('tableBody').innerHTML = `<tr><td colspan="4" class="py-20 text-center text-red-500 font-semibold">Failed to connect to HQ server.</td></tr>`;
    }
}
async function createInstitution(e) {
    e.preventDefault();
    const btn = document.getElementById('deployBtn'); const orig = btn.innerHTML;
    btn.innerHTML = '<svg class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg> Deploying...';
    btn.disabled = true;
    try {
        const res = await fetch('/api/auth/register', {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ institutionName: document.getElementById('iName').value, adminName: document.getElementById('aName').value, email: document.getElementById('aEmail').value, password: document.getElementById('aPass').value })
        });
        const data = await res.json();
        if (data.success) { closeModal(); showToast('Instance deployed successfully!'); setTimeout(loadDashboard, 400); }
        else showToast('Deploy failed: ' + data.message, true);
    } catch(e) { showToast('Connection failed.', true); }
    btn.innerHTML = orig; btn.disabled = false;
}
async function deleteInstitution(id, name) {
    const p = prompt(`WARNING! This permanently destroys "${name}" and all its data.\n\nType the institution name to confirm:`);
    if (p !== name) return;
    try {
        const res = await fetch(`/api/hq/institutions/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
        const data = await res.json();
        if (data.success) { showToast('Instance terminated.'); loadDashboard(); }
        else showToast(data.message, true);
    } catch(e) { showToast('Termination failed.', true); }
}
async function toggleInstitution(id) {
    if (!confirm('Toggle the status of this institution? Suspended instances cannot log in.')) return;
    try {
        const res = await fetch(`/api/hq/institutions/${id}/toggle`, { method: 'PUT', headers: { 'Authorization': `Bearer ${token}` } });
        const data = await res.json();
        if (data.success) { showToast(data.message); loadDashboard(); }
        else showToast(data.message, true);
    } catch(e) { showToast('Toggle failed.', true); }
}
document.addEventListener('DOMContentLoaded', loadDashboard);
</script>
</body>
</html>

```

## hq-login.html
```html
<!-- hq-login.html -->
﻿<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HQ Access | FeeHub Master Control</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    fontFamily: { sans: ['Inter', 'sans-serif'] },
                    animation: {
                        'fade-in-up': 'fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                    },
                    keyframes: {
                        fadeInUp: {
                            '0%': { opacity: '0', transform: 'translateY(20px)' },
                            '100%': { opacity: '1', transform: 'translateY(0)' }
                        }
                    }
                }
            }
        }
    </script>
    <style>
        body { font-family: 'Inter', sans-serif; background-color: #f8fafc; }
        /* Modern Dot Grid Background */
        .bg-grid-pattern {
            background-image: radial-gradient(#cbd5e1 1px, transparent 1px);
            background-size: 24px 24px;
        }
        .smooth-focus { transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
    </style>
    <link rel="stylesheet" href="feehub-loader.css">
    <script src="feehub-loader.js"></script>
</head>
<body class="relative min-h-screen flex items-center justify-center overflow-hidden selection:bg-indigo-200 selection:text-indigo-900">
    <div class="absolute inset-0 bg-grid-pattern z-0 opacity-40"></div>
    <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-400/10 rounded-full blur-[100px] pointer-events-none z-0 animate-pulse-slow"></div>
    <div class="relative z-10 w-full max-w-md px-6">
        <div class="flex flex-col items-center mb-8 animate-fade-in-up" style="animation-delay: 0ms; opacity: 0;">
            <div class="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-slate-900/20 mb-4 ring-4 ring-white">
                <svg class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1v1H9V7zm5 0h1v1h-1V7zm-5 4h1v1H9v-1zm5 0h1v1h-1v-1zm-5 4h1v1H9v-1zm5 0h1v1h-1v-1z" />
                </svg>
            </div>
            <h1 class="text-3xl font-black text-slate-900 tracking-tight">FeeHub HQ</h1>
            <p class="text-sm font-semibold text-indigo-600 uppercase tracking-widest mt-2 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">Director Access Only</p>
        </div>
        <div class="bg-white rounded-3xl shadow-2xl shadow-slate-200/50 border border-slate-100 p-8 sm:p-10 animate-fade-in-up relative overflow-hidden" style="animation-delay: 150ms; opacity: 0;">
            <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-blue-500"></div>
            <div class="mb-8">
                <h2 class="text-xl font-bold text-slate-800">System Authentication</h2>
                <p class="text-sm text-slate-500 mt-1 font-medium">Enter your master credentials to override standard protocols.</p>
            </div>
            <form id="hqLoginForm" class="space-y-5">
                <div id="formNotification" class="hidden p-4 rounded-xl text-sm font-bold border transition-all duration-300 flex items-center gap-3"></div>
                <div>
                    <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Director Email</label>
                    <div class="relative">
                        <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"></path></svg>
                        </div>
                        <input type="email" id="email" required placeholder="admin@headquarters.com" class="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 smooth-focus text-sm font-medium text-slate-900">
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Master Password</label>
                    <div class="relative">
                        <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                        </div>
                        <input type="password" id="password" required placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢" class="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 smooth-focus text-sm font-medium text-slate-900">
                    </div>
                </div>
                <div class="pt-2">
                    <button type="submit" id="loginBtn" class="w-full bg-slate-900 text-white px-6 py-4 rounded-xl font-bold hover:bg-indigo-600 active:scale-[0.98] smooth-focus shadow-lg shadow-slate-900/20 flex items-center justify-center gap-2">
                        Initiate Override
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                    </button>
                </div>
            </form>
        </div>
        <div class="text-center mt-8 animate-fade-in-up" style="animation-delay: 300ms; opacity: 0;">
            <p class="text-xs font-medium text-slate-400 flex items-center justify-center gap-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                Restricted System Network. All attempts are logged.
            </p>
            <a href="login.html" class="inline-block mt-4 text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors">â† Return to Client Portal</a>
        </div>
    </div>
    <script>
        document.getElementById('hqLoginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('loginBtn');
            const notif = document.getElementById('formNotification');
            const originalText = btn.innerHTML;
            // Loading state
            btn.innerHTML = `<svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Authenticating...`;
            btn.disabled = true;
            btn.classList.add('opacity-90');
            notif.classList.add('hidden');
            const payload = {
                email: document.getElementById('email').value,
                password: document.getElementById('password').value
            };
            try {
                const res = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await res.json();
                if (data.success) {
                    const payloadObj = JSON.parse(atob(data.token.split('.')[1]));
                    // ðŸ”¥ THE HQ GUARD: Kick out regular users and students
                    if (payloadObj.role !== 'SuperAdmin') {
                        notif.className = 'p-4 rounded-xl text-sm font-bold border border-rose-200 bg-rose-50 text-rose-600 mb-2 flex items-start gap-3 animate-fade-in-up';
                        notif.innerHTML = '<span class="mt-0.5">â›”</span> <div><p class="text-rose-800">Clearance Denied</p><p class="text-xs font-medium text-rose-600 mt-1">This portal is restricted to System Directors. Please use the client portal.</p></div>';
                        btn.innerHTML = originalText; 
                        btn.disabled = false; 
                        btn.classList.remove('opacity-90');
                        return;
                    }
                    // Success! Log the SuperAdmin in.
                    localStorage.setItem('feehub_token', data.token);
                    btn.innerHTML = 'Override Successful';
                    btn.classList.replace('bg-slate-900', 'bg-emerald-500');
                    setTimeout(() => {
                        window.location.replace('superadmin.html');
                    }, 800);
                } else {
                    notif.className = 'p-4 rounded-xl text-sm font-bold border border-red-200 bg-red-50 text-red-600 mb-2 flex items-center gap-3 animate-fade-in-up';
                    notif.innerHTML = `<span>âŒ</span> ${data.message || 'Invalid credentials'}`;
                    btn.innerHTML = originalText; 
                    btn.disabled = false; 
                    btn.classList.remove('opacity-90');
                }
            } catch (err) {
                notif.className = 'p-4 rounded-xl text-sm font-bold border border-red-200 bg-red-50 text-red-600 mb-2 flex items-center gap-3 animate-fade-in-up';
                notif.innerHTML = '<span>ðŸ”Œ</span> Server connection error.';
                btn.innerHTML = originalText; 
                btn.disabled = false; 
                btn.classList.remove('opacity-90');
            }
        });
    </script>
</body>
</html>

```

## index.html
```html
<!-- index.html -->
<!DOCTYPE html>
<html lang="en" class="scroll-smooth">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FeeHub | Enterprise Cloud Fee Management</title>
    <link rel="icon" type="image/png" href="favicon.png">
    <meta name="description" content="The ultimate multi-tenant cloud platform for educational fee management. Automated receipts, real-time dashboards, and military-grade security.">
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    fontFamily: { sans: ['Inter', 'sans-serif'] },
                    animation: {
                        'float': 'float 6s ease-in-out infinite',
                        'float-delayed': 'float 6s ease-in-out 2s infinite',
                        'fade-in-up': 'fadeInUp 1s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                        'spin-slow': 'spin 20s linear infinite',
                        'draw': 'draw 2s ease forwards',
                    },
                    keyframes: {
                        fadeInUp: { '0%': { opacity: '0', transform: 'translateY(30px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
                        float: { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-15px)' } },
                        draw: { '0%': { strokeDashoffset: '1000' }, '100%': { strokeDashoffset: '0' } }
                    }
                }
            }
        }
    </script>
    <link rel="stylesheet" href="feehub-loader.css">
    <style>
        .glass-nav { background: rgba(255,255,255,0.85); backdrop-filter: blur(12px); border-bottom: 1px solid rgba(226,232,240,0.8); }
        .gradient-text { background: linear-gradient(135deg, #2563eb, #7c3aed); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
        .feature-card:hover .feature-icon { transform: scale(1.1) rotate(-5deg); }
        .hero-svg-line { stroke-dasharray: 1000; stroke-dashoffset: 1000; animation: draw 2.5s ease forwards; }
        .scroll-reveal { opacity: 0; transform: translateY(40px); transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1); }
        .scroll-reveal.visible { opacity: 1; transform: translateY(0); }
    </style>
</head>
<body class="bg-slate-50 font-sans text-slate-800 antialiased overflow-x-hidden selection:bg-blue-200 selection:text-blue-900">
    <nav class="fixed w-full top-0 z-50 glass-nav transition-all duration-300">
        <div class="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div class="flex items-center gap-2 group cursor-pointer" onclick="window.scrollTo({top:0,behavior:'smooth'})">
                <div class="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black text-sm shadow-md group-hover:shadow-blue-500/30 transition-all">FH</div>
                <span class="text-xl font-black text-slate-900 tracking-tight">FeeHub</span>
            </div>
            <div class="hidden md:flex gap-8 text-sm font-bold text-slate-500">
                <a href="#features" class="hover:text-blue-600 transition-colors">Platform</a>
                <a href="#audience" class="hover:text-blue-600 transition-colors">Use Cases</a>
                <a href="#security" class="hover:text-blue-600 transition-colors">Security</a>
            </div>
            <div class="flex items-center gap-4">
                <div class="hidden sm:flex items-center gap-4">
                    <a href="login.html" class="text-sm font-bold text-slate-600 hover:text-blue-600 transition-colors">Client Login</a>
                    <a href="register.html" class="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-800 transition-all shadow-lg hover:shadow-slate-900/20 active:scale-95">Open Workspace</a>
                </div>
                <button id="mobile-menu-btn" class="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16m-7 6h7"></path></svg>
                </button>
            </div>
        </div>
        <div id="mobile-menu" class="hidden md:hidden absolute top-full left-0 w-full bg-white border-b border-slate-200 p-6 flex flex-col gap-4 shadow-xl animate-fade-in-up">
            <a href="#features" class="text-lg font-bold text-slate-900 hover:text-blue-600 py-2 border-b border-slate-50">Platform</a>
            <a href="#audience" class="text-lg font-bold text-slate-900 hover:text-blue-600 py-2 border-b border-slate-50">Use Cases</a>
            <a href="#security" class="text-lg font-bold text-slate-900 hover:text-blue-600 py-2 border-b border-slate-50">Security</a>
            <div class="flex flex-col gap-3 pt-4">
                <a href="login.html" class="w-full text-center py-3 font-bold text-slate-600 bg-slate-50 rounded-xl">Client Login</a>
                <a href="register.html" class="w-full text-center py-3 font-bold text-white bg-blue-600 rounded-xl">Open Workspace</a>
            </div>
        </div>
    </nav>
    <header class="relative pt-32 md:pt-40 pb-24 max-w-7xl mx-auto px-6 z-10 overflow-hidden md:overflow-visible">
        <div class="absolute top-20 left-1/2 -translate-x-1/2 w-[300px] md:w-[800px] h-[300px] md:h-[400px] bg-blue-400/15 rounded-full blur-[80px] md:blur-[120px] -z-10 animate-pulse-slow"></div>
        <div class="grid lg:grid-cols-2 gap-16 items-center">
            <div class="animate-fade-in-up text-center lg:text-left">
                <h1 class="text-4xl md:text-6xl xl:text-7xl font-black text-slate-900 tracking-tight leading-[1.1]">
                    Campus Finance, <br/><span class="gradient-text">Perfectly Automated.</span>
                </h1>
                <p class="mt-8 text-base md:text-lg text-slate-500 max-w-xl leading-relaxed font-medium mx-auto lg:mx-0">
                    The ultimate multi-tenant cloud platform for educational institutions. Ditch the dusty ledger books, eliminate duplicate data entry, and stop revenue leakage today.
                </p>
                <div class="mt-10 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                    <a href="register.html" class="bg-blue-600 text-white px-8 py-4 rounded-2xl text-lg font-bold hover:bg-blue-700 active:scale-95 transition-all duration-200 shadow-xl shadow-blue-600/30 flex items-center justify-center gap-2">
                        Deploy Free Workspace <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                    </a>
                </div>
                <div class="mt-10 flex flex-wrap items-center gap-x-6 gap-y-4 text-xs md:text-sm text-slate-400 font-medium justify-center lg:justify-start">
                    <div class="flex items-center gap-2 whitespace-nowrap"><svg class="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg> No credit card</div>
                    <div class="flex items-center gap-2 whitespace-nowrap"><svg class="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg> Setup in 2 min</div>
                    <div class="flex items-center gap-2 whitespace-nowrap"><svg class="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg> 256-bit encrypted</div>
                </div>
            </div>
            <div class="relative flex items-center justify-center animate-float hidden lg:flex">
                <svg viewBox="0 0 500 420" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full max-w-lg drop-shadow-2xl">
                    <rect x="40" y="30" width="420" height="280" rx="24" fill="white" stroke="#e2e8f0" stroke-width="1.5"/>
                    <rect x="40" y="30" width="420" height="48" rx="24" fill="#f8fafc"/>
                    <rect x="40" y="54" width="420" height="24" fill="#f8fafc"/>
                    <circle cx="68" cy="54" r="6" fill="#f87171"/>
                    <circle cx="88" cy="54" r="6" fill="#fbbf24"/>
                    <circle cx="108" cy="54" r="6" fill="#34d399"/>
                    <rect x="80" y="200" width="40" height="80" rx="8" fill="#dbeafe"/>
                    <rect x="140" y="160" width="40" height="120" rx="8" fill="#bfdbfe"/>
                    <rect x="200" y="130" width="40" height="150" rx="8" fill="#93c5fd"/>
                    <rect x="260" y="110" width="40" height="170" rx="8" fill="#60a5fa"/>
                    <rect x="320" y="90" width="40" height="190" rx="8" fill="#3b82f6"/>
                    <rect x="380" y="120" width="40" height="160" rx="8" fill="#2563eb"/>
                    <path d="M100 240 L160 195 L220 170 L280 145 L340 125 L400 150" stroke="#7c3aed" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="hero-svg-line" fill="none"/>
                    <g class="animate-float">
                        <rect x="320" y="320" width="180" height="80" rx="16" fill="white" stroke="#e2e8f0" stroke-width="1.5" filter="url(#shadow1)"/>
                        <circle cx="350" cy="360" r="18" fill="#ecfdf5"/>
                        <path d="M343 360l4 4 8-8" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                        <rect x="378" y="348" width="100" height="8" rx="4" fill="#e2e8f0"/>
                        <rect x="378" y="362" width="65" height="8" rx="4" fill="#f1f5f9"/>
                    </g>
                    <g class="animate-float-delayed" style="animation-delay:1.5s;">
                        <rect x="0" y="240" width="160" height="70" rx="16" fill="white" stroke="#e2e8f0" stroke-width="1.5" filter="url(#shadow1)"/>
                        <circle cx="30" cy="275" r="18" fill="#eff6ff"/>
                        <text x="24" y="280" font-size="16" fill="#3b82f6">₹</text>
                        <rect x="58" y="262" width="85" height="8" rx="4" fill="#e2e8f0"/>
                        <rect x="58" y="278" width="55" height="8" rx="4" fill="#dbeafe"/>
                    </g>
                    <defs>
                        <filter id="shadow1" x="-4" y="-2" width="108%" height="120%">
                            <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="#0f172a" flood-opacity="0.08"/>
                        </filter>
                    </defs>
                </svg>
            </div>
        </div>
    </header>
    <section id="features" class="py-24 bg-white border-y border-slate-200 relative">
        <div class="max-w-7xl mx-auto px-6">
            <div class="text-center mb-12 md:mb-20 scroll-reveal">
                <h2 class="text-sm font-bold text-blue-600 uppercase tracking-widest mb-3">Enterprise Capabilities</h2>
                <h3 class="text-3xl md:text-4xl font-black text-slate-900 tracking-tight px-4 md:px-0">Everything a modern campus needs.</h3>
            </div>
            <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                <div class="feature-card bg-slate-50 p-8 rounded-3xl border border-slate-100 hover:border-blue-200 hover:bg-white transition-all duration-300 group scroll-reveal">
                    <div class="w-14 h-14 bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200/50 rounded-2xl flex items-center justify-center mb-6 shadow-sm feature-icon transition-transform duration-300">
                        <svg class="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                    </div>
                    <h4 class="text-xl font-bold text-slate-900 mb-3">PDF Receipts</h4>
                    <p class="text-slate-500 leading-relaxed text-sm">Our jsPDF engine generates Fortune-500 quality receipts in milliseconds with dynamic component breakdowns and "Due Balance" logic.</p>
                </div>
                <div class="feature-card bg-slate-50 p-8 rounded-3xl border border-slate-100 hover:border-violet-200 hover:bg-white transition-all duration-300 group scroll-reveal">
                    <div class="w-14 h-14 bg-gradient-to-br from-violet-50 to-violet-100 border border-violet-200/50 rounded-2xl flex items-center justify-center mb-6 shadow-sm feature-icon transition-transform duration-300">
                        <svg class="w-7 h-7 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                    </div>
                    <h4 class="text-xl font-bold text-slate-900 mb-3">Automated Emails</h4>
                    <p class="text-slate-500 leading-relaxed text-sm">Our Nodemailer backend dispatches beautiful, mobile-responsive HTML email receipts directly to parents the second a payment clears.</p>
                </div>
                <div class="feature-card bg-slate-50 p-8 rounded-3xl border border-slate-100 hover:border-emerald-200 hover:bg-white transition-all duration-300 group scroll-reveal">
                    <div class="w-14 h-14 bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200/50 rounded-2xl flex items-center justify-center mb-6 shadow-sm feature-icon transition-transform duration-300">
                        <svg class="w-7 h-7 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                    </div>
                    <h4 class="text-xl font-bold text-slate-900 mb-3">Smart Guardrails</h4>
                    <p class="text-slate-500 leading-relaxed text-sm">The backend cross-references past transactions to dynamically cap input fields, preventing critical accounting overcharge errors.</p>
                </div>
                <div class="feature-card bg-slate-50 p-8 rounded-3xl border border-slate-100 hover:border-amber-200 hover:bg-white transition-all duration-300 group scroll-reveal">
                    <div class="w-14 h-14 bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200/50 rounded-2xl flex items-center justify-center mb-6 shadow-sm feature-icon transition-transform duration-300">
                        <svg class="w-7 h-7 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                    </div>
                    <h4 class="text-xl font-bold text-slate-900 mb-3">Bulk CSV Import</h4>
                    <p class="text-slate-500 leading-relaxed text-sm">Onboard 1,000 students in 2 seconds. Smart CSV parser validates duplicates and auto-assigns fee master configurations instantly.</p>
                </div>
                <div class="feature-card bg-slate-50 p-8 rounded-3xl border border-slate-100 hover:border-rose-200 hover:bg-white transition-all duration-300 group scroll-reveal">
                    <div class="w-14 h-14 bg-gradient-to-br from-rose-50 to-rose-100 border border-rose-200/50 rounded-2xl flex items-center justify-center mb-6 shadow-sm feature-icon transition-transform duration-300">
                        <svg class="w-7 h-7 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                    </div>
                    <h4 class="text-xl font-bold text-slate-900 mb-3">Strict RBAC</h4>
                    <p class="text-slate-500 leading-relaxed text-sm">Admins command the workspace while Cashiers operate sandboxed. Sub-account access can be instantly revoked to protect data.</p>
                </div>
                <div class="feature-card bg-slate-50 p-8 rounded-3xl border border-slate-100 hover:border-cyan-200 hover:bg-white transition-all duration-300 group scroll-reveal">
                    <div class="w-14 h-14 bg-gradient-to-br from-cyan-50 to-cyan-100 border border-cyan-200/50 rounded-2xl flex items-center justify-center mb-6 shadow-sm feature-icon transition-transform duration-300">
                        <svg class="w-7 h-7 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
                    </div>
                    <h4 class="text-xl font-bold text-slate-900 mb-3">Real-Time Analytics</h4>
                    <p class="text-slate-500 leading-relaxed text-sm">Chart.js renders live visual representations of financial health, cohort enrollment, and debt deficits on your dashboard.</p>
                </div>
            </div>
        </div>
    </section>
    <section id="audience" class="py-24 bg-slate-900 text-white relative overflow-hidden">
        <div class="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none"></div>
        <div class="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-600/20 rounded-full blur-[100px] pointer-events-none"></div>
        <div class="max-w-7xl mx-auto px-6 relative z-10">
            <div class="grid lg:grid-cols-2 gap-16 items-center">
                <div class="scroll-reveal">
                    <h2 class="text-sm font-bold text-indigo-400 uppercase tracking-widest mb-3">Use Cases</h2>
                    <h3 class="text-3xl md:text-5xl font-black text-white tracking-tight mb-6 px-4 md:px-0">Built for scale. Designed for speed.</h3>
                    <p class="text-slate-400 text-lg leading-relaxed mb-8">FeeHub's flexible fee structure engine was engineered because different institutions have radically different billing needs.</p>
                    <ul class="space-y-6">
                        <li class="flex items-start gap-4">
                            <div class="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center flex-shrink-0 border border-indigo-500/30">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 14l9-5-9-5-9 5 9 5zm0 7l-9-5 9-5 9 5-9 5z"/></svg>
                            </div>
                            <div><strong class="text-white text-lg block mb-1">Colleges & Universities</strong><span class="text-slate-400 text-sm">Complex semester-based components (Tuition, Library, Lab, Hostel) with varying fine structures.</span></div>
                        </li>
                        <li class="flex items-start gap-4">
                            <div class="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0 border border-emerald-500/30">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
                            </div>
                            <div><strong class="text-white text-lg block mb-1">K-12 Schools</strong><span class="text-slate-400 text-sm">Configure annual batches, track partial payments, and auto-identify overdue balances at term-end.</span></div>
                        </li>
                        <li class="flex items-start gap-4">
                            <div class="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0 border border-amber-500/30">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>
                            </div>
                            <div><strong class="text-white text-lg block mb-1">Tuition Centers</strong><span class="text-slate-400 text-sm">Simple flat-fee structures that let you onboard a student and process cash payment in 12 seconds.</span></div>
                        </li>
                    </ul>
                </div>
                <div class="scroll-reveal">
                    <div class="bg-slate-800/50 backdrop-blur-xl border border-slate-700 p-8 rounded-3xl shadow-2xl">
                        <div class="mb-6 flex justify-between items-center border-b border-slate-700 pb-4">
                            <span class="text-white font-bold">Transaction Preview</span>
                            <span class="text-xs font-mono text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded border border-emerald-400/20">LIVE DATA</span>
                        </div>
                        <div class="space-y-4">
                            <div class="flex items-center justify-between p-4 bg-slate-900 rounded-xl border border-slate-800">
                                <div class="flex items-center gap-3">
                                    <div class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white">BB</div>
                                    <div><p class="text-sm font-bold text-white">Bhavani B.</p><p class="text-xs text-slate-400">MBA (2026-2028)</p></div>
                                </div>
                                <div class="text-right"><p class="text-emerald-400 font-bold text-sm">+ ₹77,000</p><p class="text-xs text-slate-500 font-mono">REC-A9F32</p></div>
                            </div>
                            <div class="flex items-center justify-between p-4 bg-slate-900 rounded-xl border border-slate-800">
                                <div class="flex items-center gap-3">
                                    <div class="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-xs font-bold text-white">AK</div>
                                    <div><p class="text-sm font-bold text-white">Arjun K.</p><p class="text-xs text-slate-400">BCA (2025-2028)</p></div>
                                </div>
                                <div class="text-right"><p class="text-emerald-400 font-bold text-sm">+ ₹15,000</p><p class="text-xs text-slate-500 font-mono">REC-B71X9</p></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>
    <section id="security" class="py-16 md:py-24 bg-slate-50 relative overflow-hidden">
        <div class="max-w-5xl mx-auto px-6">
            <div class="scroll-reveal bg-white rounded-3xl border border-slate-200 p-8 md:p-16 text-center shadow-xl relative overflow-hidden">
                <div class="absolute -right-20 -top-20 w-60 h-60 bg-blue-50 rounded-full blur-3xl pointer-events-none"></div>
                <div class="w-16 h-16 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-xl">
                    <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                </div>
                <h2 class="text-3xl md:text-4xl font-black text-slate-900 mb-6 relative z-10">Military-Grade Multi-Tenancy</h2>
                <p class="text-slate-600 text-lg leading-relaxed mb-10 max-w-2xl mx-auto relative z-10">
                    Your institution's financial data is sacrosanct. FeeHub employs strict architectural separation at the database level. Every API call is mathematically bound to your cryptographic JWT <code class="bg-slate-100 px-2 py-0.5 rounded text-sm font-mono text-blue-600">institutionId</code>. Your data cannot leak.
                </p>
                <a href="register.html" class="inline-flex bg-slate-900 text-white px-8 py-4 rounded-xl text-lg font-bold hover:bg-slate-800 active:scale-95 transition-all shadow-xl relative z-10">
                    Secure your institution today
                </a>
            </div>
        </div>
    </section>
    <footer class="bg-white border-t border-slate-200 py-12 text-center text-slate-500">
        <div class="max-w-7xl mx-auto px-6 flex flex-col items-center">
            <div class="flex items-center gap-2 mb-6">
                <div class="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white font-black text-sm">FH</div>
                <span class="text-xl font-black text-slate-900 tracking-tight">FeeHub</span>
            </div>
            <p class="text-sm border-t border-slate-100 pt-8 w-full max-w-md mx-auto">
                © 2026 FeeHub SaaS. Engineered by Bhapee Studios.<br>
            </p>
        </div>
    </footer>
    <script>
        // Scroll Reveal
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
        document.querySelectorAll('.scroll-reveal').forEach(el => observer.observe(el));
        // Mobile Menu Logic
        const mobileMenuBtn = document.getElementById('mobile-menu-btn');
        const mobileMenu = document.getElementById('mobile-menu');
        if (mobileMenuBtn && mobileMenu) {
            mobileMenuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                mobileMenu.classList.toggle('hidden');
            });
            // Close on click outside
            document.addEventListener('click', (e) => {
                if (!mobileMenu.classList.contains('hidden') && !mobileMenu.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
                    mobileMenu.classList.add('hidden');
                }
            });
            // Close on link click
            mobileMenu.querySelectorAll('a').forEach(link => {
                link.addEventListener('click', () => mobileMenu.classList.add('hidden'));
            });
        }
    </script>
</body>
</html>
```

## login.html
```html
<!-- login.html -->
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Log In | FeeHub Workspace</title>
    <link rel="icon" type="image/png" href="favicon.png">
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Inter', sans-serif; background-color: #f8fafc; }
        .smooth-transition { transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
        /* Slick Form Animations */
        .form-enter { animation: formFadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes formFadeIn {
            0% { opacity: 0; transform: translateY(20px) scale(0.98); }
            100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        /* Animated Tab Background */
        .tab-bg { transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
        .tab-staff .tab-bg { transform: translateX(0%); }
        .tab-student .tab-bg { transform: translateX(100%); }
        /* Modal Overlay */
        .modal-overlay {
            background: rgba(15, 23, 42, 0.6);
            backdrop-filter: blur(8px);
            opacity: 0;
            transition: opacity 0.3s ease;
            pointer-events: none;
        }
        .modal-overlay.active {
            opacity: 1;
            pointer-events: auto;
        }
        .modal-content {
            transform: translateY(24px) scale(0.96);
            opacity: 0;
            transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .modal-overlay.active .modal-content {
            transform: translateY(0) scale(1);
            opacity: 1;
        }
        @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
        }
        .btn-loading {
            background: linear-gradient(90deg, #2563eb 25%, #3b82f6 50%, #2563eb 75%);
            background-size: 200% 100%;
            animation: shimmer 1.5s infinite;
        }
    </style>
    <link rel="stylesheet" href="feehub-loader.css">
    <script src="feehub-loader.js"></script>
</head>
<body class="flex min-h-screen selection:bg-blue-200 selection:text-blue-900">
    <div class="hidden lg:flex w-1/2 bg-slate-900 relative overflow-hidden flex-col justify-center p-16">
        <div class="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none mix-blend-screen"></div>
        <div class="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-emerald-500/20 rounded-full blur-[100px] pointer-events-none mix-blend-screen"></div>
        <div class="relative z-10 max-w-lg">
            <div class="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-xl shadow-blue-600/30 mb-8">FH</div>
            <h2 class="text-4xl font-black text-white mb-6 leading-tight tracking-tight">The smart financial engine for modern campuses.</h2>
            <p class="text-slate-400 text-lg leading-relaxed mb-12">Seamless fee collections, automated digital receipts, and real-time ledger synchronizations for institutions globally.</p>
            <div class="flex items-center gap-4 text-sm font-semibold text-slate-500">
                <div class="flex -space-x-3">
                    <div class="w-10 h-10 rounded-full bg-slate-800 border-2 border-slate-900 flex items-center justify-center text-slate-300">A</div>
                    <div class="w-10 h-10 rounded-full bg-slate-700 border-2 border-slate-900 flex items-center justify-center text-slate-300">B</div>
                    <div class="w-10 h-10 rounded-full bg-slate-600 border-2 border-slate-900 flex items-center justify-center text-slate-300">C</div>
                </div>
                <p>Trusted by 10,000+ students daily.</p>
            </div>
        </div>
    </div>
    <div class="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative bg-white">
        <div class="w-full max-w-[400px] form-enter lg:mt-0 mt-6 md:mt-0">
            <div class="flex lg:hidden items-center justify-center sm:justify-start gap-2 mb-8">
                <div class="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold shadow-md">FH</div>
                <span class="text-xl font-extrabold text-slate-900 tracking-tight">FeeHub</span>
            </div>
            <div class="mb-8 text-center sm:text-left">
                <h1 class="text-3xl font-black text-slate-900 tracking-tight mb-2">Welcome back</h1>
                <p class="text-slate-500 font-medium">Please enter your details to sign in.</p>
            </div>
            <div id="tabContainer" class="tab-staff relative flex p-1 bg-slate-100 rounded-xl mb-8">
                <div class="tab-bg absolute top-1 left-1 w-[calc(50%-4px)] h-[calc(100%-8px)] bg-white rounded-lg shadow-sm border border-slate-200/50"></div>
                <button onclick="switchTab('staff')" id="btnStaff" class="relative z-10 flex-1 py-2.5 text-sm font-bold text-slate-900 transition-colors duration-300">Institution</button>
                <button onclick="switchTab('student')" id="btnStudent" class="relative z-10 flex-1 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors duration-300">Student</button>
            </div>
            <form id="loginForm" class="flex flex-col gap-5">
                <div id="formNotification" class="hidden p-4 rounded-xl text-sm font-semibold border flex items-center gap-3 transition-all duration-300"></div>
                <div class="smooth-transition">
                    <label id="lblEmail" class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Work Email</label>
                    <input type="email" id="loginEmail" required placeholder="name@college.edu" class="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-300 text-sm font-medium text-slate-900 shadow-sm">
                </div>
                <div class="smooth-transition">
                    <div class="flex items-center justify-between mb-2">
                        <label id="lblPass" class="block text-xs font-bold text-slate-500 uppercase tracking-wider">Password</label>
                        <button type="button" id="forgotBtn" onclick="openForgotModal()" class="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors">Forgot password?</button>
                    </div>
                    <div class="relative">
                        <input type="password" id="loginPassword" required placeholder="••••••••" class="w-full px-4 py-3.5 pr-12 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-300 text-sm font-medium text-slate-900 shadow-sm">
                        <button type="button" id="eyeToggleBtn" onclick="togglePassword('loginPassword', this)" class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1" aria-label="Toggle password visibility">
                            <svg class="w-5 h-5 eye-off" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/></svg>
                            <svg class="w-5 h-5 eye-on hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                        </button>
                    </div>
                </div>
                <button type="submit" id="loginBtn" class="w-full bg-blue-600 text-white px-6 py-4 rounded-xl font-bold hover:bg-blue-700 active:scale-[0.98] transition-all duration-300 mt-2 shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2">
                    Sign In <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                </button>
            </form>
            <p id="regText" class="text-center text-sm text-slate-500 mt-8 font-medium">Don't have a workspace? <a href="register.html" class="font-bold text-blue-600 hover:text-blue-800 transition-colors">Register institution</a></p>
        </div>
    </div>
    <div id="forgotModal" class="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="modal-content bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 relative border border-slate-100">
            <button onclick="closeForgotModal()" class="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all" aria-label="Close">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
            <div class="w-14 h-14 bg-blue-50 border border-blue-100 rounded-2xl flex items-center justify-center mb-6">
                <svg class="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/></svg>
            </div>
            <h2 class="text-2xl font-black text-slate-900 tracking-tight mb-2">Reset your password</h2>
            <p class="text-slate-500 text-sm mb-6 leading-relaxed">Enter the email address tied to your account and we'll send you a secure reset link.</p>
            <div id="forgotNotification" class="hidden p-4 rounded-xl text-sm font-semibold mb-5 flex items-center gap-3"></div>
            <form id="forgotForm" class="space-y-5">
                <div>
                    <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Email Address</label>
                    <input type="email" id="forgotEmail" required placeholder="name@college.edu" class="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-300 text-sm font-medium text-slate-900 shadow-sm">
                </div>
                <button type="submit" id="forgotSubmitBtn" class="w-full bg-blue-600 text-white px-6 py-4 rounded-xl font-bold hover:bg-blue-700 active:scale-[0.98] transition-all duration-300 shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                    Send Reset Link
                </button>
            </form>
            <p class="text-center text-xs text-slate-400 mt-6">Remember your password? <button onclick="closeForgotModal()" class="font-bold text-blue-600 hover:text-blue-800 transition-colors">Back to login</button></p>
        </div>
    </div>
    <script>
        function togglePassword(inputId, btn) {
            const input = document.getElementById(inputId);
            const eyeOff = btn.querySelector('.eye-off');
            const eyeOn = btn.querySelector('.eye-on');
            if (input.type === 'password') {
                input.type = 'text';
                eyeOff.classList.add('hidden');
                eyeOn.classList.remove('hidden');
            } else {
                input.type = 'password';
                eyeOff.classList.remove('hidden');
                eyeOn.classList.add('hidden');
            }
        }
        let currentMode = 'staff';
        function switchTab(mode) {
            currentMode = mode;
            const container = document.getElementById('tabContainer');
            const btnStaff = document.getElementById('btnStaff');
            const btnStudent = document.getElementById('btnStudent');
            const form = document.getElementById('loginForm');
            form.style.transform = 'scale(0.98)';
            form.style.opacity = '0.8';
            setTimeout(() => { form.style.transform = 'scale(1)'; form.style.opacity = '1'; }, 150);
            if (mode === 'staff') {
                container.className = "tab-staff relative flex p-1 bg-slate-100 rounded-xl mb-8";
                btnStaff.className = "relative z-10 flex-1 py-2.5 text-sm font-bold text-slate-900 transition-colors duration-300";
                btnStudent.className = "relative z-10 flex-1 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors duration-300";
                document.getElementById('lblEmail').textContent = "Work Email";
                document.getElementById('lblPass').textContent = "Password";
                document.getElementById('loginPassword').type = "password";
                document.getElementById('loginPassword').placeholder = "••••••••";
                document.getElementById('forgotBtn').style.opacity = "1";
                document.getElementById('forgotBtn').style.pointerEvents = "auto";
                document.getElementById('regText').style.display = "block";
                document.getElementById('eyeToggleBtn').style.display = "block";
            } else {
                container.className = "tab-student relative flex p-1 bg-slate-100 rounded-xl mb-8";
                btnStudent.className = "relative z-10 flex-1 py-2.5 text-sm font-bold text-slate-900 transition-colors duration-300";
                btnStaff.className = "relative z-10 flex-1 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors duration-300";
                document.getElementById('lblEmail').textContent = "Registered Student Email";
                document.getElementById('lblPass').textContent = "Roll Number / Student ID";
                document.getElementById('loginPassword').type = "text"; 
                document.getElementById('loginPassword').placeholder = "e.g. BCA-2026-105";
                document.getElementById('forgotBtn').style.opacity = "0";
                document.getElementById('forgotBtn').style.pointerEvents = "none";
                document.getElementById('regText').style.display = "none";
                document.getElementById('eyeToggleBtn').style.display = "none";
            }
        }
        // Instant dark overlay injected before the browser navigates away.
        // This bridges the white flash gap between login.html unloading and dashboard.html loading.
        function navigateTo(url) {
            const overlay = document.createElement('div');
            overlay.style.cssText = [
                'position:fixed', 'inset:0', 'z-index:999999',
                'background:#030712',
                'display:flex', 'flex-direction:column',
                'align-items:center', 'justify-content:center',
                'gap:20px', 'transition:none'
            ].join(';');
            overlay.innerHTML = `
                <div style="position:relative;width:56px;height:56px;">
                    <div style="position:absolute;inset:0;border:3px solid rgba(99,102,241,0.2);border-radius:50%;"></div>
                    <div style="position:absolute;inset:0;border:3px solid #6366f1;border-top-color:transparent;border-radius:50%;animation:_fhspin 0.8s linear infinite;"></div>
                    <div style="position:absolute;inset:6px;background:#1e293b;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#6366f1;font-weight:900;font-size:11px;letter-spacing:-0.5px;">FH</div>
                </div>
                <div style="color:#94a3b8;font-size:12px;font-weight:600;letter-spacing:2px;font-family:'Inter',sans-serif;text-transform:uppercase;">Opening Workspace</div>
                <style>@keyframes _fhspin{to{transform:rotate(360deg)}}</style>
            `;
            document.body.appendChild(overlay);
            requestAnimationFrame(() => requestAnimationFrame(() => {
                window.location.replace(url);
            }));
        }
        // Handle the login form submission
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('loginBtn');
            const notif = document.getElementById('formNotification');
            btn.innerHTML = '<svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Authenticating...';
            btn.disabled = true;
            btn.classList.add('opacity-90');
            notif.classList.add('hidden');
            const payload = currentMode === 'staff' 
                ? { email: document.getElementById('loginEmail').value, password: document.getElementById('loginPassword').value }
                : { email: document.getElementById('loginEmail').value, studentIdNumber: document.getElementById('loginPassword').value };
            const endpoint = currentMode === 'staff' ? '/api/auth/login' : '/api/auth/student-login';
            try {
                const res = await fetch(`${endpoint}`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
                });
                const data = await res.json();
                if (data.success) {
                    const payloadObj = JSON.parse(atob(data.token.split('.')[1]));
                    if (payloadObj.role === 'SuperAdmin') {
                        notif.className = 'p-4 rounded-xl text-sm font-bold border bg-red-50 text-red-600 mb-4 flex items-center gap-3';
                        notif.innerHTML = '<span>⚠️</span> Super Admins must use the HQ Portal.';
                        btn.innerHTML = 'Sign In'; btn.disabled = false; btn.classList.remove('opacity-90');
                        return;
                    }
                    localStorage.setItem('feehub_token', data.token);
                    if (payloadObj.role === 'Student') {
                        navigateTo('student-dashboard.html');
                    } else {
                        navigateTo('dashboard.html');
                    }
                } else {
                    notif.className = 'p-4 rounded-xl text-sm font-bold border bg-red-50 text-red-600 mb-4 flex items-center gap-3';
                    notif.innerHTML = `<span>❌</span> ${data.message || 'Invalid credentials.'}`;
                }
            } catch (err) {
                notif.className = 'p-4 rounded-xl text-sm font-bold border bg-red-50 text-red-600 mb-4 flex items-center gap-3';
                notif.innerHTML = '<span>🔌</span> Server connection error.';
            } finally {
                btn.innerHTML = 'Sign In <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>'; 
                btn.disabled = false;
                btn.classList.remove('opacity-90');
            }
        });
        // Forgot password modal controls
        function openForgotModal() {
            const modal = document.getElementById('forgotModal');
            modal.classList.add('active');
            document.getElementById('forgotEmail').value = document.getElementById('loginEmail').value || '';
            document.getElementById('forgotNotification').classList.add('hidden');
            document.getElementById('forgotForm').style.display = 'block';
            document.body.style.overflow = 'hidden';
            setTimeout(() => document.getElementById('forgotEmail').focus(), 350);
        }
        function closeForgotModal() {
            const modal = document.getElementById('forgotModal');
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
        // Close modal on overlay click
        document.getElementById('forgotModal').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) closeForgotModal();
        });
        // Close modal on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeForgotModal();
        });
        // Handle the forgot password form submission
        document.getElementById('forgotForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('forgotSubmitBtn');
            const notif = document.getElementById('forgotNotification');
            const email = document.getElementById('forgotEmail').value;
            // Loading state
            btn.disabled = true;
            btn.classList.add('btn-loading');
            btn.innerHTML = '<svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Sending...';
            notif.classList.add('hidden');
            try {
                const res = await fetch('/api/auth/forgot-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email })
                });
                const data = await res.json();
                notif.classList.remove('hidden', 'bg-red-50', 'text-red-600', 'border-red-100', 'bg-emerald-50', 'text-emerald-700', 'border-emerald-100');
                if (data.success) {
                    notif.className = 'p-4 rounded-xl text-sm font-semibold mb-5 flex items-center gap-3 bg-emerald-50 text-emerald-700 border border-emerald-200';
                    notif.innerHTML = `
                        <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                        <span>Reset link sent! Check your inbox at <strong>${email}</strong>. <br><br> <strong class="text-emerald-800 underline">⚠️ IMPORTANT:</strong> If you don't see it, please check your <strong>Spam or Junk</strong> folder. The link expires in 60 minutes.</span>
                    `;
                    document.getElementById('forgotForm').style.display = 'none';
                } else {
                    notif.className = 'p-4 rounded-xl text-sm font-semibold mb-5 flex items-center gap-3 bg-red-50 text-red-600 border border-red-200';
                    notif.innerHTML = `
                        <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                        <span>${data.message || 'Something went wrong. Please try again.'}</span>
                    `;
                }
            } catch (err) {
                notif.classList.remove('hidden');
                notif.className = 'p-4 rounded-xl text-sm font-semibold mb-5 flex items-center gap-3 bg-red-50 text-red-600 border border-red-200';
                notif.innerHTML = `
                    <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    <span>Server connection error. Please try again later.</span>
                `;
            } finally {
                btn.disabled = false;
                btn.classList.remove('btn-loading');
                btn.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg> Send Reset Link';
            }
        });
    </script>
</body>
</html>
```

## register.html
```html
<!-- register.html -->
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Create Workspace | FeeHub</title>
    <link rel="icon" type="image/png" href="favicon.png">
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    fontFamily: { sans: ['Inter', 'sans-serif'] },
                    colors: {
                        brand: {
                            50: '#E3FDFD',
                            100: '#CBF1F5',
                            200: '#A6E3E9',
                            500: '#71C9CE',
                            600: '#5eaeb3',
                        }
                    },
                    animation: {
                        'fade-in': 'fadeIn 0.6s ease-out forwards',
                        'float': 'float 6s ease-in-out infinite',
                    },
                    keyframes: {
                        fadeIn: {
                            '0%': { opacity: '0', transform: 'translateY(10px)' },
                            '100%': { opacity: '1', transform: 'translateY(0)' }
                        },
                        float: {
                            '0%, 100%': { transform: 'translateY(0)' },
                            '50%': { transform: 'translateY(-15px)' },
                        }
                    }
                }
            }
        }
    </script>
    <link rel="stylesheet" href="feehub-loader.css">
    <script src="feehub-loader.js"></script>
</head>
<body class="bg-white font-sans text-slate-800 flex min-h-screen selection:bg-brand-200 selection:text-slate-900">
    <div class="hidden lg:flex w-1/2 bg-slate-900 relative overflow-hidden flex-col justify-between p-12 xl:p-16">
        <div class="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-brand-500/20 rounded-full blur-[100px] pointer-events-none"></div>
        <div class="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-indigo-500/20 rounded-full blur-[100px] pointer-events-none"></div>
        <div class="relative z-10 flex items-center gap-3">
            <div class="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/20">
                <svg class="w-6 h-6 text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                </svg>
            </div>
            <span class="text-2xl font-extrabold text-white tracking-tight">FeeHub</span>
        </div>
        <div class="relative z-10 max-w-lg animate-float">
            <h2 class="text-4xl xl:text-5xl font-bold text-white mb-6 leading-tight tracking-tight">
                Manage campus finances on <span class="text-brand-500">autopilot.</span>
            </h2>
            <p class="text-slate-400 text-lg leading-relaxed mb-10">
                Join hundreds of educational institutions using FeeHub to automate fee collections, generate dynamic structures, and instantly notify parents.
            </p>
            <div class="bg-slate-800/60 backdrop-blur-md border border-slate-700/50 rounded-2xl p-6 shadow-2xl">
                <div class="flex justify-between items-center mb-4 border-b border-slate-700/50 pb-4">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 bg-brand-100 text-brand-500 rounded-full flex items-center justify-center font-bold">AK</div>
                        <div>
                            <div class="text-sm font-bold text-white">Anil Kumar</div>
                            <div class="text-xs text-slate-400">Paid: Semester 1</div>
                        </div>
                    </div>
                    <span class="text-brand-500 font-bold">+ ₹45,000</span>
                </div>
                <div class="flex justify-between items-center">
                    <div class="text-sm text-slate-400">Total Collected Today</div>
                    <div class="text-lg font-bold text-white">₹1,25,000</div>
                </div>
            </div>
        </div>
        <div class="relative z-10">
            <p class="text-sm text-slate-500 font-medium">© 2026 Bhapee Studios. Enterprise Edition.</p>
        </div>
    </div>
    <div class="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 xl:p-24 relative overflow-y-auto">
        <div class="w-full max-w-md animate-fade-in mt-6 md:mt-12 lg:mt-0">
            <div class="flex lg:hidden items-center justify-center sm:justify-start gap-2 mb-8">
                <div class="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center shadow-md">
                    <svg class="w-5 h-5 text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
                </div>
                <span class="text-xl font-extrabold text-slate-900 tracking-tight">FeeHub</span>
            </div>
            <div class="mb-10 text-center sm:text-left">
                <h1 class="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-2">Create Workspace</h1>
                <p class="text-slate-500 font-medium">Setup your institution in under 30 seconds.</p>
            </div>
            <form id="registerForm" class="flex flex-col gap-5">
                <div id="formError" class="hidden bg-red-50 text-red-600 p-4 rounded-xl text-sm font-semibold border border-red-100 flex items-center gap-2"></div>
                <div id="formSuccess" class="hidden bg-brand-50 text-brand-600 p-4 rounded-xl text-sm font-semibold border border-brand-200 flex items-center gap-2"></div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                        <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Institution Name</label>
                        <input type="text" id="regInstName" required placeholder="e.g. TMG College" 
                            class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20 transition-all duration-200 text-slate-900 font-medium">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Admin Name</label>
                        <input type="text" id="regAdminName" required placeholder="e.g. Bharath" 
                            class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20 transition-all duration-200 text-slate-900 font-medium">
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Work Email</label>
                    <input type="email" id="regEmail" required placeholder="admin@college.edu" 
                        class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20 transition-all duration-200 text-slate-900 font-medium">
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Secure Password</label>
                    <div class="relative">
                        <input type="password" id="regPassword" required placeholder="••••••••" minlength="6"
                            class="w-full px-4 py-3 pr-12 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20 transition-all duration-200 text-slate-900 font-medium">
                        <button type="button" onclick="togglePassword('regPassword', this)" class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1" aria-label="Toggle password visibility">
                            <svg class="w-5 h-5 eye-off" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/></svg>
                            <svg class="w-5 h-5 eye-on hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                        </button>
                    </div>
                </div>
                <button type="submit" id="regBtn" class="w-full bg-brand-500 text-slate-900 px-6 py-3.5 rounded-xl font-bold text-[15px] hover:bg-brand-600 active:scale-[0.98] transition-all duration-200 mt-4 flex justify-center items-center gap-2 shadow-lg shadow-brand-500/25">
                    Register Institution
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                </button>
            </form>
            <p class="text-center text-sm text-slate-500 mt-8 font-medium">
                Already registered? <a href="login.html" class="font-bold text-brand-500 hover:text-brand-600 transition-colors">Sign in to workspace</a>
            </p>
        </div>
    </div>
    <script>
        function togglePassword(inputId, btn) {
            const input = document.getElementById(inputId);
            const eyeOff = btn.querySelector('.eye-off');
            const eyeOn = btn.querySelector('.eye-on');
            if (input.type === 'password') {
                input.type = 'text';
                eyeOff.classList.add('hidden');
                eyeOn.classList.remove('hidden');
            } else {
                input.type = 'password';
                eyeOff.classList.remove('hidden');
                eyeOn.classList.add('hidden');
            }
        }
        const registerForm = document.getElementById('registerForm');
        const formError = document.getElementById('formError');
        const formSuccess = document.getElementById('formSuccess');
        const regBtn = document.getElementById('regBtn');
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const institutionName = document.getElementById('regInstName').value;
            const adminName = document.getElementById('regAdminName').value;
            const email = document.getElementById('regEmail').value;
            const password = document.getElementById('regPassword').value;
            regBtn.innerHTML = '<svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-slate-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Registering...';
            regBtn.classList.add('opacity-80', 'cursor-wait');
            formError.classList.add('hidden');
            formSuccess.classList.add('hidden');
            try {
                const response = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ institutionName, adminName, email, password })
                });
                const data = await response.json();
                if (data.success) {
                    formSuccess.innerHTML = '<span>✅</span> Workspace created! Redirecting to login...';
                    formSuccess.classList.remove('hidden');
                    registerForm.reset();
                    setTimeout(() => { window.location.href = 'login.html'; }, 2000);
                } else {
                    formError.innerHTML = '<span>❌</span> ' + (data.message || 'Registration failed.');
                    formError.classList.remove('hidden');
                }
            } catch (error) {
                formError.innerHTML = '<span>🔌</span> Cannot connect to server. Is Node.js running?';
                formError.classList.remove('hidden');
            } finally {
                if(!formSuccess.classList.contains('hidden')) return; 
                regBtn.innerHTML = 'Register Institution <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>';
                regBtn.classList.remove('opacity-80', 'cursor-wait');
            }
        });
    </script>
</body>
</html>

```

## reset-password.html
```html
<!-- reset-password.html -->
﻿<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Password | FeeHub</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Inter', sans-serif; }
        .form-enter { animation: formFadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes formFadeIn { 0% { opacity: 0; transform: translateY(20px) scale(0.98); } 100% { opacity: 1; transform: translateY(0) scale(1); } }
    </style>
    <link rel="stylesheet" href="feehub-loader.css">
    <script src="feehub-loader.js"></script>
</head>
<body class="bg-slate-50 flex items-center justify-center min-h-screen p-6 selection:bg-blue-200 selection:text-blue-900">
    <div class="w-full max-w-md form-enter">
        <div class="flex items-center justify-center gap-2 mb-10">
            <div class="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-lg shadow-blue-600/25">FH</div>
            <span class="text-xl font-black text-slate-900 tracking-tight">FeeHub</span>
        </div>
        <div class="bg-white p-8 sm:p-10 rounded-2xl shadow-xl border border-slate-100">
            <div class="w-14 h-14 bg-blue-50 border border-blue-100 rounded-2xl flex items-center justify-center mb-6">
                <svg class="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
            </div>
            <h1 class="text-2xl font-black text-slate-900 tracking-tight mb-2">Set new password</h1>
            <p class="text-slate-500 text-sm mb-8 leading-relaxed">Choose a strong password that you haven't used before. Must be at least 6 characters.</p>
            <div id="statusMessage" class="hidden p-4 rounded-xl text-sm font-semibold mb-6 flex items-center gap-3"></div>
            <form id="resetForm" class="space-y-5">
                <div>
                    <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">New Password</label>
                    <div class="relative">
                        <input type="password" id="newPassword" required minlength="6" placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
                            class="w-full px-4 py-3.5 pr-12 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-300 text-sm font-medium text-slate-900 shadow-sm">
                        <button type="button" onclick="togglePassword('newPassword', this)" class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1" aria-label="Toggle password visibility">
                            <svg class="w-5 h-5 eye-off" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/></svg>
                            <svg class="w-5 h-5 eye-on hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                        </button>
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Confirm Password</label>
                    <div class="relative">
                        <input type="password" id="confirmPassword" required minlength="6" placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
                            class="w-full px-4 py-3.5 pr-12 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-300 text-sm font-medium text-slate-900 shadow-sm">
                        <button type="button" onclick="togglePassword('confirmPassword', this)" class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1" aria-label="Toggle password visibility">
                            <svg class="w-5 h-5 eye-off" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/></svg>
                            <svg class="w-5 h-5 eye-on hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                        </button>
                    </div>
                </div>
                <button type="submit" id="resetBtn" class="w-full bg-blue-600 text-white px-6 py-4 rounded-xl font-bold hover:bg-blue-700 active:scale-[0.98] transition-all duration-300 mt-2 shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
                    Update Password
                </button>
            </form>
        </div>
        <p class="text-center text-sm text-slate-500 mt-6 font-medium">
            Remember your password? <a href="login.html" class="font-bold text-blue-600 hover:text-blue-800 transition-colors">Back to login</a>
        </p>
    </div>
    <script>
        function togglePassword(inputId, btn) {
            const input = document.getElementById(inputId);
            const eyeOff = btn.querySelector('.eye-off');
            const eyeOn = btn.querySelector('.eye-on');
            if (input.type === 'password') {
                input.type = 'text';
                eyeOff.classList.add('hidden');
                eyeOn.classList.remove('hidden');
            } else {
                input.type = 'password';
                eyeOff.classList.remove('hidden');
                eyeOn.classList.add('hidden');
            }
        }
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        const statusDiv = document.getElementById('statusMessage');
        if (!token) {
            statusDiv.classList.remove('hidden');
            statusDiv.className = 'p-4 rounded-xl text-sm font-semibold mb-6 flex items-center gap-3 bg-red-50 text-red-600 border border-red-200';
            statusDiv.innerHTML = '<svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg> Invalid or missing reset token. Please request a new reset link.';
            document.getElementById('resetForm').style.display = 'none';
        }
        document.getElementById('resetForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const password = document.getElementById('newPassword').value;
            const confirm = document.getElementById('confirmPassword').value;
            if (password !== confirm) {
                statusDiv.classList.remove('hidden');
                statusDiv.className = 'p-4 rounded-xl text-sm font-semibold mb-6 flex items-center gap-3 bg-red-50 text-red-600 border border-red-200';
                statusDiv.innerHTML = '<svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg> Passwords do not match.';
                return;
            }
            const btn = document.getElementById('resetBtn');
            btn.innerHTML = '<svg class="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Updating...';
            btn.disabled = true;
            try {
                const response = await fetch(`/api/auth/reset-password/${token}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password })
                });
                const data = await response.json();
                statusDiv.classList.remove('hidden');
                if (data.success) {
                    statusDiv.className = 'p-4 rounded-xl text-sm font-semibold mb-6 flex items-center gap-3 bg-emerald-50 text-emerald-700 border border-emerald-200';
                    statusDiv.innerHTML = '<svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg> Password updated! Redirecting to login...';
                    document.getElementById('resetForm').style.display = 'none';
                    setTimeout(() => window.location.href = 'login.html', 3000);
                } else {
                    statusDiv.className = 'p-4 rounded-xl text-sm font-semibold mb-6 flex items-center gap-3 bg-red-50 text-red-600 border border-red-200';
                    statusDiv.innerHTML = '<svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg> ' + data.message;
                    btn.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg> Update Password';
                    btn.disabled = false;
                }
            } catch (err) {
                statusDiv.classList.remove('hidden');
                statusDiv.className = 'p-4 rounded-xl text-sm font-semibold mb-6 flex items-center gap-3 bg-red-50 text-red-600 border border-red-200';
                statusDiv.innerHTML = '<svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg> Connection error. Please try again.';
                btn.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg> Update Password';
                btn.disabled = false;
            }
        });
    </script>
</body>
</html>

```

## student-dashboard.html
```html
<!-- student-dashboard.html -->
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Student Portal | FeeHub</title>
    <link rel="icon" type="image/png" href="favicon.png">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.28/jspdf.plugin.autotable.min.js"></script>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <script>
        (function() {
            var token = localStorage.getItem('feehub_token');
            if (!token) { window.location.replace('login.html'); return; }
            try {
                var payload = JSON.parse(atob(token.split('.')[1]));
                if (payload.exp * 1000 < Date.now()) { window.location.replace('login.html'); return; }
                if (payload.role !== 'Student') { window.location.replace('dashboard.html'); return; }
            } catch(e) { window.location.replace('login.html'); return; }
        })();
    </script>
    <script>
        tailwind.config = { theme: { extend: { fontFamily: { sans: ['Inter', 'sans-serif'] }, animation: { 'fade-in': 'fadeIn 0.4s ease-out forwards', 'slide-up': 'slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards' }, keyframes: { fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } }, slideUp: { '0%': { opacity: '0', transform: 'translateY(30px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } } } } } }
    </script>
    <style>
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        body { font-family: 'Inter', sans-serif; background-color: #f8fafc; }
        .glass-card { background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.8); transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
        .glass-card:hover { transform: translateY(-3px); box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.05); }
    </style>
    <link rel="stylesheet" href="feehub-loader.css">
    <script src="feehub-loader.js"></script>
</head>
<body class="text-slate-800 antialiased selection:bg-blue-200 opacity-0 transition-opacity duration-500 overflow-x-hidden" id="APP">
<div class="fixed top-[-10%] left-[-10%] w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] bg-blue-400/10 rounded-full blur-[100px] pointer-events-none z-0"></div>
<div class="fixed bottom-[-10%] right-[-10%] w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] bg-emerald-400/10 rounded-full blur-[100px] pointer-events-none z-0"></div>
<div class="relative z-10 min-h-screen flex flex-col max-w-6xl mx-auto p-4 sm:p-8">
    <header class="flex flex-col sm:flex-row justify-between sm:items-end gap-6 mb-12 animate-fade-in border-b border-slate-200 pb-6">
        <div class="flex items-center gap-5">
            <div class="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl shadow-lg shadow-blue-500/20 flex items-center justify-center text-white font-black text-2xl" id="avatarBox">FH</div>
            <div>
                <p class="text-xs font-bold text-blue-600 uppercase tracking-widest mb-1" id="instNameDisplay">Loading Institution...</p>
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 bg-blue-600 rounded-lg flex lg:hidden items-center justify-center text-white font-black text-[10px] shadow-sm flex-shrink-0">FH</div>
                    <h1 class="text-3xl font-black text-slate-900 tracking-tight" id="studentNameDisplay">Loading...</h1>
                </div>
                <p class="text-sm font-semibold text-slate-500 mt-1" id="studentIdDisplay">Please wait...</p>
            </div>
        </div>
        <div class="flex items-center gap-3">
            <span class="bg-slate-100 text-slate-600 px-4 py-2 rounded-xl text-sm font-bold border border-slate-200" id="courseBatchDisplay">Loading / Course</span>
            <button onclick="logout()" class="bg-white border border-slate-200 text-red-500 hover:bg-red-50 hover:border-red-100 font-bold px-5 py-2 rounded-xl text-sm transition-colors shadow-sm">Sign Out</button>
        </div>
    </header>
    <div id="errorBox" class="hidden bg-red-50 border border-red-200 text-red-700 p-6 rounded-2xl text-center max-w-md mx-auto animate-slide-up mt-12">
        <h3 class="font-bold text-lg mb-2">Session Expired</h3>
        <p class="text-sm mb-4" id="errorMsgText">Please log in again to view your dashboard.</p>
        <button onclick="logout()" class="bg-red-600 text-white px-6 py-2 rounded-xl text-sm font-bold hover:bg-red-700">Return to Login</button>
    </div>
    <div id="mainContent" class="hidden">
        <h2 class="text-xl font-bold text-slate-900 mb-6 animate-fade-in">Financial Overview</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div class="glass-card rounded-3xl p-6 border-t-4 border-t-slate-400 animate-slide-up" style="animation-delay: 50ms;">
                <p class="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Total Program Fee</p>
                <h3 class="text-4xl font-black text-slate-900" id="statTotalFee">₹0</h3>
            </div>
            <div class="glass-card rounded-3xl p-6 border-t-4 border-t-emerald-500 shadow-sm shadow-emerald-500/10 animate-slide-up" style="animation-delay: 100ms;">
                <p class="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-2">Total Paid Amount</p>
                <h3 class="text-4xl font-black text-emerald-600" id="statPaid">₹0</h3>
            </div>
            <div class="glass-card rounded-3xl p-6 border-t-4 border-t-red-500 shadow-md shadow-red-500/10 animate-slide-up" style="animation-delay: 150ms;" id="dueCard">
                <p class="text-xs font-bold text-red-500 uppercase tracking-widest mb-2">Pending Due Balance</p>
                <h3 class="text-4xl font-black text-red-500" id="statDue">₹0</h3>
            </div>
        </div>
        <div class="flex justify-between items-end mb-6 animate-fade-in">
            <h2 class="text-xl font-bold text-slate-900">Payment History</h2>
            <span class="text-xs font-bold text-slate-500 bg-slate-200 px-3 py-1 rounded-full" id="historyCount">0 Transactions</span>
        </div>
        <div class="glass-card rounded-3xl overflow-hidden animate-slide-up shadow-sm border border-slate-200" style="animation-delay: 200ms;">
            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse min-w-[700px]">
                    <thead>
                        <tr class="bg-slate-50 border-b border-slate-100">
                            <th class="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-widest">Date</th>
                            <th class="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-widest">Receipt No</th>
                            <th class="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-widest">Mode</th>
                            <th class="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-widest">Amount</th>
                            <th class="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Receipt</th>
                        </tr>
                    </thead>
                    <tbody id="paymentHistoryBody">
                    </tbody>
                </table>
            </div>
        </div>
    </div>
    <footer class="mt-16 py-8 text-center text-xs font-semibold text-slate-400 animate-fade-in" style="animation-delay: 300ms;">
        <p>Powered by FeeHub SECURE Engine</p>
    </footer>
</div>
<script>
const token = localStorage.getItem('feehub_token');
if (!token) window.location.replace('login.html');
let STUDENT_DATA = null;
let PAYMENTS = [];
let INSTITUTION_NAME = "FeeHub";
const fmt = n => '₹' + Number(n).toLocaleString('en-IN');
const ini = n => (n || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
function logout() {
    localStorage.removeItem('feehub_token');
    window.location.replace('login.html');
}
window.addEventListener('pageshow', function (event) {
    if (event.persisted && !localStorage.getItem('feehub_token')) {
        window.location.replace('login.html');
    }
});
async function loadData() {
    try {
        const res = await fetch('/api/student-portal', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await res.json();
        if (res.status === 401 || res.status === 403) {
            logout(); return;
        }
        if (result.success) {
            STUDENT_DATA = result.data.student;
            PAYMENTS = result.data.payments;
            INSTITUTION_NAME = result.data.institutionName;
            renderDashboard();
        } else {
            showError(result.message);
        }
    } catch (error) {
        showError("Unable to connect to the server.");
    }
    document.getElementById('APP').style.opacity = '1';
}
function showError(msg) {
    document.getElementById('errorBox').classList.remove('hidden');
    document.getElementById('errorMsgText').textContent = msg;
}
function renderDashboard() {
    document.getElementById('mainContent').classList.remove('hidden');
    document.getElementById('instNameDisplay').textContent = INSTITUTION_NAME;
    document.getElementById('studentNameDisplay').textContent = STUDENT_DATA.name;
    document.getElementById('studentIdDisplay').textContent = `Roll No: ${STUDENT_DATA.studentIdNumber || 'N/A'}`;
    document.getElementById('avatarBox').textContent = ini(STUDENT_DATA.name);
    document.getElementById('courseBatchDisplay').textContent = `${STUDENT_DATA.course} • ${STUDENT_DATA.batch}`;
    const due = Math.max(0, STUDENT_DATA.totalFees - STUDENT_DATA.paid);
    document.getElementById('statTotalFee').textContent = fmt(STUDENT_DATA.totalFees);
    document.getElementById('statPaid').textContent = fmt(STUDENT_DATA.paid);
    document.getElementById('statDue').textContent = fmt(due);
    const dueCard = document.getElementById('dueCard');
    if (due <= 0 && STUDENT_DATA.totalFees > 0) {
        dueCard.className = "glass-card rounded-3xl p-6 border-t-4 border-t-emerald-500 bg-emerald-50 shadow-sm animate-slide-up";
        dueCard.innerHTML = `<p class="text-xs font-bold text-emerald-700 uppercase tracking-widest mb-2">Pending Due Balance</p><h3 class="text-2xl font-black text-emerald-600 mt-3 flex items-center gap-2"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg> Fully Cleared</h3>`;
    }
    document.getElementById('historyCount').textContent = `${PAYMENTS.length} Transactions`;
    const tbody = document.getElementById('paymentHistoryBody');
    if (PAYMENTS.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="py-12 text-center text-slate-400 font-bold bg-white/50 border border-dashed border-slate-200">No payment history found based on your student ID.</td></tr>`;
        return;
    }
    tbody.innerHTML = PAYMENTS.map((p, i) => {
        const date = new Date(p.paymentDate || p.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        const recId = p.receiptNumber || `REC-${p._id.slice(-6).toUpperCase()}`;
        return `
        <tr class="hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0 group">
            <td class="py-5 px-6 font-semibold text-slate-700">${date}</td>
            <td class="py-5 px-6 font-mono text-sm text-slate-500">${recId}</td>
            <td class="py-5 px-6"><span class="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold border border-indigo-100 uppercase tracking-wider">${p.paymentMethod || p.method || 'CASH'}</span></td>
            <td class="py-5 px-6 font-bold text-emerald-600 text-lg">+ ${fmt(p.amount)}</td>
            <td class="py-5 px-6 text-right">
                <button onclick="downloadReceipt('${p._id}')" class="bg-white border border-slate-200 text-blue-600 px-4 py-2 rounded-xl text-xs font-bold shadow-sm hover:bg-blue-50 hover:border-blue-200 transition-colors opacity-80 group-hover:opacity-100">
                    PDF Receipt
                </button>
            </td>
        </tr>`;
    }).join('');
}
function downloadReceipt(id) {
    const p = PAYMENTS.find(x => x._id === id); if (!p) return alert("Receipt data missing");
    const { jsPDF } = window.jspdf; const doc = new jsPDF();
    const colorBg = [244, 246, 249]; const colorHeader = [44, 62, 80]; const colorText = [119, 119, 119]; const colorDarkText = [51, 51, 51]; const colorDueBg = [255, 230, 230]; const colorDueText = [192, 57, 43]; const colorNoteBg = [241, 243, 245]; const colorNoteBorder = [52, 152, 219];
    doc.setFillColor(...colorBg); doc.rect(0, 0, 210, 297, 'F');
    doc.setFillColor(255, 255, 255); doc.roundedRect(15, 20, 180, 250, 3, 3, 'F'); doc.setDrawColor(230, 230, 230); doc.roundedRect(15, 20, 180, 250, 3, 3, 'S');
    doc.setTextColor(...colorHeader); doc.setFontSize(22); doc.setFont("helvetica", "bold"); doc.text(INSTITUTION_NAME, 25, 35);
    doc.setTextColor(...colorText); doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.text("Official Payment Receipt", 25, 42);
    doc.setTextColor(...colorHeader); doc.setFontSize(14); doc.setFont("helvetica", "bold"); doc.text("RECEIPT", 185, 35, { align: "right" });
    doc.setDrawColor(238, 238, 238); doc.setLineWidth(0.5); doc.line(25, 48, 185, 48);
    doc.setTextColor(...colorDarkText); doc.setFontSize(10); 
    doc.setFont("helvetica", "bold"); doc.text("Name:", 25, 58); doc.setFont("helvetica", "normal"); doc.text(STUDENT_DATA.name, 40, 58);
    doc.setFont("helvetica", "bold"); doc.text("Roll No:", 25, 65); doc.setFont("helvetica", "normal"); doc.text(STUDENT_DATA.studentIdNumber || 'N/A', 43, 65);
    doc.setFont("helvetica", "bold"); doc.text("Course:", 25, 72); doc.setFont("helvetica", "normal"); doc.text(`${STUDENT_DATA.course} (${STUDENT_DATA.batch})`, 42, 72);
    const recId = p.receiptNumber || `REC-${p._id.slice(-6).toUpperCase()}`;
    const dateStr = new Date(p.paymentDate || p.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    doc.setFont("helvetica", "bold"); doc.text("Receipt No:", 130, 58); doc.setFont("helvetica", "normal"); doc.text(recId, 155, 58);
    doc.setFont("helvetica", "bold"); doc.text("Date:", 130, 65); doc.setFont("helvetica", "normal"); doc.text(dateStr, 142, 65);
    doc.setFont("helvetica", "bold"); doc.text("Mode:", 130, 72); doc.setFont("helvetica", "normal"); doc.text(p.paymentMethod || p.method || 'Cash', 143, 72);
    let tableBody = p.components && p.components.length > 0 ? p.components.map(c => [c.name, fmt(c.amount)]) : [['Academic Fee Payment', fmt(p.amount - (p.fine||0))]];
    if (p.fine && p.fine > 0) tableBody.push(['Late Fee / Fine', fmt(p.fine)]);
    doc.autoTable({ startY: 82, head: [['Fee Description', 'Amount (Rs.)']], body: tableBody, theme: 'plain', headStyles: { fillColor: colorHeader, textColor: [255, 255, 255], fontStyle: 'bold' }, styles: { fontSize: 10, cellPadding: 6, textColor: colorDarkText }, columnStyles: { 0: { cellWidth: 100 }, 1: { halign: 'right' } }, margin: { left: 25, right: 25 }, didDrawCell: function(data) { if (data.row.section === 'body') { doc.setDrawColor(221, 221, 221); doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height); } } });
    let finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(12); doc.setFont("helvetica", "bold"); doc.setTextColor(...colorHeader); doc.text(`Total Paid: ${fmt(p.amount)}`, 185, finalY, { align: "right" });
    finalY += 15;
    if (STUDENT_DATA.totalFees > 0) {
        const dueBalance = Math.max(0, STUDENT_DATA.totalFees - STUDENT_DATA.paid);
        if (dueBalance > 0) {
            doc.setFillColor(...colorDueBg); doc.roundedRect(25, finalY, 160, 12, 2, 2, 'F'); doc.setFontSize(10); doc.setTextColor(...colorDueText); doc.setFont("helvetica", "bold"); doc.text(`Current Due Balance: ${fmt(dueBalance)}`, 30, finalY + 8);
            finalY += 18;
            doc.setFillColor(...colorNoteBg); doc.roundedRect(25, finalY, 160, 14, 2, 2, 'F'); doc.setFillColor(...colorNoteBorder); doc.rect(25, finalY, 3, 14, 'F'); 
            doc.setFontSize(9); doc.setTextColor(85, 85, 85); doc.setFont("helvetica", "normal"); doc.text("Note: The above due balance does not include any applicable fines or penalties.", 32, finalY + 8.5);
            finalY += 25;
        } else {
            doc.setFillColor(230, 255, 235); doc.roundedRect(25, finalY, 160, 12, 2, 2, 'F'); doc.setFontSize(10); doc.setTextColor(39, 174, 96); doc.setFont("helvetica", "bold"); doc.text(`Account Fully Cleared (No Dues Remaining)`, 30, finalY + 8);
            finalY += 25;
        }
    } else { finalY += 10; }
    doc.setFontSize(10); doc.setTextColor(85, 85, 85); doc.setFont("helvetica", "normal"); doc.text("Thank you for your payment", 105, finalY, { align: "center" });
    doc.setFontSize(8); doc.text("This is a computer-generated receipt", 105, finalY + 5, { align: "center" });
    finalY += 20; doc.setDrawColor(0, 0, 0); doc.setLineWidth(0.5); doc.line(135, finalY, 185, finalY);
    doc.setFontSize(9); doc.text("Authorized Signature", 160, finalY + 5, { align: "center" });
    doc.save(`${recId}_Fee_Receipt.pdf`);
}
loadData();
</script>
</body>
</html>

```

## superadmin.html
```html
<!-- superadmin.html -->
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HQ Control | FeeHub</title>
    <link rel="icon" type="image/png" href="favicon.png">
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap"
        rel="stylesheet">
    <script>
        (function() {
            var token = localStorage.getItem('feehub_token');
            if (!token) { window.location.replace('hq-login.html'); return; }
            try {
                var payload = JSON.parse(atob(token.split('.')[1]));
                if (payload.exp * 1000 < Date.now() || payload.role !== 'SuperAdmin') {
                    window.location.replace('hq-login.html'); return;
                }
            } catch(e) { window.location.replace('hq-login.html'); return; }
        })();
    </script>
    <script>
        tailwind.config = { theme: { extend: { fontFamily: { sans: ['Inter', 'sans-serif'] }, animation: { 'fade-in': 'fadeIn 0.4s ease-out forwards', 'slide-up': 'slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards' }, keyframes: { fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } }, slideUp: { '0%': { opacity: '0', transform: 'translateY(20px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } } } } } }
    </script>
    <style>
        body {
            font-family: 'Inter', sans-serif;
            background-color: #f8fafc;
        }
        .bg-grid-pattern {
            background-image: radial-gradient(#cbd5e1 1px, transparent 1px);
            background-size: 24px 24px;
        }
        ::-webkit-scrollbar {
            width: 6px;
            height: 6px;
        }
        ::-webkit-scrollbar-track {
            background: transparent;
        }
        ::-webkit-scrollbar-thumb {
            background: #94a3b8;
            border-radius: 10px;
        }
        #toast-container {
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            gap: 10px;
            pointer-events: none;
        }
        .toast {
            background: white;
            border-left: 4px solid #4f46e5;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
            padding: 16px 24px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            gap: 12px;
            animation: slideUp 0.3s ease-out forwards;
            transition: opacity 0.3s ease;
            pointer-events: auto;
        }
    </style>
    <link rel="stylesheet" href="feehub-loader.css">
    <script src="feehub-loader.js"></script>
</head>
<body class="text-slate-800 antialiased selection:bg-indigo-200 min-h-screen flex flex-col relative overflow-x-hidden">
    <div class="fixed inset-0 bg-grid-pattern z-0 opacity-30 pointer-events-none"></div>
    <div
        class="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-[400px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none z-0">
    </div>
    <header
        class="h-20 bg-white/80 backdrop-blur-lg border-b border-slate-200/50 flex items-center justify-between px-6 sm:px-12 z-20 sticky top-0 shadow-sm">
        <div class="flex items-center gap-4">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-lg shadow-slate-900/20">
                    <svg class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5"
                            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1v1H9V7zm5 0h1v1h-1V7zm-5 4h1v1H9v-1zm5 0h1v1h-1v-1zm-5 4h1v1H9v-1zm5 0h1v1h-1v-1z" />
                    </svg>
                </div>
                <div>
                    <h1 class="text-xl font-black text-slate-900 tracking-tight leading-none">System Director</h1>
                    <p class="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mt-0.5">Global Override Active
                    </p>
                </div>
            </div>
        </div>
        <div class="flex items-center gap-6">
            <span class="hidden sm:block text-sm font-bold text-slate-500" id="adminNameDisplay">Director</span>
            <button onclick="logout()"
                class="bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-600 px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2">
                Sign Out <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1">
                    </path>
                </svg>
            </button>
        </div>
    </header>
    <main class="flex-1 w-full max-w-7xl mx-auto px-6 sm:px-12 py-10 z-10 flex flex-col">
        <div class="mb-10 flex flex-col sm:flex-row justify-between sm:items-end gap-4 animate-fade-in">
            <div>
                <h2 class="text-4xl font-black text-slate-900 tracking-tight">Platform Command</h2>
                <p class="text-sm text-slate-500 mt-2 font-medium">Monitor all tenants and global SaaS metrics.</p>
            </div>
            <button onclick="openProvisionModal()"
                class="bg-indigo-600 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 active:scale-95 transition-all flex items-center gap-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                </svg>
                Provision New Client
            </button>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
            <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 border-t-4 border-t-indigo-500 animate-slide-up"
                style="animation-delay: 50ms;">
                <p class="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Total Active Tenants</p>
                <h3 class="text-4xl font-black text-slate-900" id="statTenants">0</h3>
            </div>
            <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 border-t-4 border-t-emerald-500 animate-slide-up"
                style="animation-delay: 100ms;">
                <p class="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Global Processed Volume</p>
                <h3 class="text-4xl font-black text-slate-900 truncate" id="statVolume">₹0</h3>
            </div>
            <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 border-t-4 border-t-blue-500 animate-slide-up"
                style="animation-delay: 150ms;">
                <p class="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Total Platform Users</p>
                <h3 class="text-4xl font-black text-slate-900" id="statUsers">0</h3>
            </div>
        </div>
        <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex-1 flex flex-col animate-slide-up"
            style="animation-delay: 200ms;">
            <div class="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 class="font-bold text-lg text-slate-800">Deployed Institutions</h3>
                <div class="relative">
                    <input type="text" id="searchClient" oninput="filterClients(this.value)"
                        placeholder="Search domain or ID..."
                        class="pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500 bg-white shadow-sm w-64 transition-colors">
                    <svg class="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" fill="none" stroke="currentColor"
                        viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                    </svg>
                </div>
            </div>
            <div class="overflow-x-auto flex-1">
                <table class="w-full text-left border-collapse min-w-[900px]">
                    <thead>
                        <tr class="bg-white border-b border-slate-100">
                            <th class="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Institution
                                Details</th>
                            <th class="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Admin
                                Contact</th>
                            <th class="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">System
                                Status</th>
                            <th class="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">
                                Director Actions</th>
                        </tr>
                    </thead>
                    <tbody id="tenantTableBody">
                    </tbody>
                </table>
            </div>
        </div>
    </main>
    <div id="OV" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 hidden items-center justify-center p-4">
        <div
            class="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-slide-up transform scale-95 transition-all">
            <div class="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div>
                    <h3 class="text-xl font-black text-slate-900">Provision New Tenant</h3>
                    <p class="text-xs font-medium text-slate-500 mt-1">Deploy an isolated workspace environment.</p>
                </div>
                <button onclick="closeM()"
                    class="text-slate-400 hover:text-slate-800 bg-white hover:bg-slate-200 border border-slate-200 w-8 h-8 rounded-full flex items-center justify-center transition-colors">✖</button>
            </div>
            <div class="p-8">
                <form id="provisionForm" onsubmit="handleProvision(event)" class="space-y-5">
                    <div>
                        <label
                            class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Institution
                            Name</label>
                        <input type="text" id="instName" required placeholder="e.g. Harvard University"
                            class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all text-sm font-semibold">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Root Admin
                            Name</label>
                        <input type="text" id="adminName" required placeholder="e.g. Dean John Doe"
                            class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all text-sm font-semibold">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Admin
                            Login Email</label>
                        <input type="email" id="adminEmail" required placeholder="admin@harvard.edu"
                            class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all text-sm font-semibold">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Initial
                            Master Password</label>
                        <input type="text" id="adminPass" required placeholder="Generate a secure password"
                            class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all text-sm font-semibold">
                    </div>
                    <div class="bg-indigo-50 border border-indigo-100 p-4 rounded-xl mt-6 flex items-start gap-3">
                        <svg class="w-5 h-5 text-indigo-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor"
                            viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        <p class="text-xs text-indigo-800 font-medium leading-relaxed">Deploying a tenant automatically
                            provisions a new isolated database schema and creates the Root Administrator account.</p>
                    </div>
                    <div class="pt-6 border-t border-slate-100 flex justify-end gap-3">
                        <button type="button" onclick="closeM()"
                            class="px-6 py-3 rounded-xl font-bold bg-white border border-slate-200 text-slate-600 text-sm hover:bg-slate-50 transition-colors">Cancel</button>
                        <button type="submit" id="provBtn"
                            class="bg-indigo-600 text-white font-bold py-3 px-8 rounded-xl shadow-md shadow-indigo-600/20 text-sm hover:bg-indigo-700 transition-all active:scale-95">Deploy
                            Workspace</button>
                    </div>
                </form>
            </div>
        </div>
    </div>
    <div id="toast-container"></div>
    <script>
        // 🔐 SECURITY CHECK
        const token = localStorage.getItem('feehub_token');
        if (!token) window.location.replace('hq-login.html');
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            if (payload.role !== 'SuperAdmin') throw new Error("Unauthorized");
        } catch (e) { window.location.replace('hq-login.html'); }
        let INSTITUTIONS = [];
        function logout() { localStorage.removeItem('feehub_token'); window.location.replace('hq-login.html'); }
        function closeM() { document.getElementById('OV').classList.replace('flex', 'hidden'); }
        function openProvisionModal() {
            document.getElementById('provisionForm').reset();
            document.getElementById('OV').classList.replace('hidden', 'flex');
        }
        function showToast(message, type = 'success') {
            const container = document.getElementById('toast-container');
            const toast = document.createElement('div');
            toast.className = `toast border-l-4 bg-white rounded-xl shadow-lg px-4 py-3 flex items-center gap-3 ${type === 'error' ? 'border-rose-500 text-rose-700' : 'border-indigo-500 text-indigo-700'}`;
            toast.innerHTML = `<span class="font-bold text-sm">${message}</span>`;
            container.appendChild(toast);
            setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 4000);
        }
        const fmt = n => '₹' + Number(n).toLocaleString('en-IN');
        // Fetch Global Data from HQ Route
        async function fetchGlobalData() {
            try {
                // Fetch from the specific HQ route we will create in the backend
                const res = await fetch('/api/hq/dashboard', { headers: { 'Authorization': `Bearer ${token}` } });
                const result = await res.json();
                if (res.status === 401 || res.status === 403) return logout();
                if (result.success) {
                    INSTITUTIONS = result.data.institutions;
                    document.getElementById('statTenants').textContent = result.data.totalInstitutions;
                    document.getElementById('statVolume').textContent = fmt(result.data.totalPlatformRevenue);
                    document.getElementById('statUsers').textContent = result.data.totalPlatformUsers;
                    renderTable(INSTITUTIONS);
                } else {
                    showToast(result.message, 'error');
                }
            } catch (e) {
                showToast("Connection to Server failed.", "error");
            }
        }
        function renderTable(data) {
            const tbody = document.getElementById('tenantTableBody');
            if (data.length === 0) {
                tbody.innerHTML = `<tr><td colspan="4" class="py-12 text-center text-slate-400 font-bold bg-slate-50/50">No external clients found on platform.</td></tr>`;
                return;
            }
            tbody.innerHTML = data.map(inst => {
                // Hide the invisible HQ account from the list
                if (inst.email === 'hq@feehub.com') return '';
                const isSuspended = inst.isActive === false;
                const statusBadge = isSuspended
                    ? `<span class="bg-rose-50 text-rose-600 border border-rose-200 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm">Suspended</span>`
                    : `<span class="bg-emerald-50 text-emerald-600 border border-emerald-200 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm">Operational</span>`;
                const toggleBtn = isSuspended
                    ? `<button onclick="toggleStatus('${inst._id}', true)" class="bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white font-bold text-xs px-4 py-2 rounded-lg transition-colors border border-emerald-100 w-24">Reactivate</button>`
                    : `<button onclick="toggleStatus('${inst._id}', false)" class="bg-amber-50 text-amber-600 hover:bg-amber-600 hover:text-white font-bold text-xs px-4 py-2 rounded-lg transition-colors border border-amber-100 w-24">Suspend</button>`;
                return `
                <tr class="border-b border-slate-100 hover:bg-slate-50/80 transition-colors group">
                    <td class="py-5 px-6">
                        <p class="font-bold text-slate-900 text-sm">${inst.name}</p>
                        <p class="text-[10px] text-slate-400 font-mono mt-1 uppercase tracking-widest">${inst._id}</p>
                    </td>
                    <td class="py-5 px-6">
                        <p class="text-sm font-semibold text-slate-700">${inst.adminName || 'Unknown Admin'}</p>
                        <p class="text-xs text-slate-500 font-medium">${inst.email}</p>
                    </td>
                    <td class="py-5 px-6">${statusBadge}</td>
                    <td class="py-5 px-6 text-right flex justify-end gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                        ${toggleBtn}
                        <button onclick="deleteTenant('${inst._id}')" class="bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white font-bold text-xs px-4 py-2 rounded-lg transition-colors border border-rose-100 shadow-sm flex items-center justify-center">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                    </td>
                </tr>`;
            }).join('');
        }
        function filterClients(term) {
            const lower = term.toLowerCase();
            const filtered = INSTITUTIONS.filter(i => i.name.toLowerCase().includes(lower) || i._id.toLowerCase().includes(lower) || i.email.toLowerCase().includes(lower));
            renderTable(filtered);
        }
        // Deploy New Client (Hooks into our existing Register Route!)
        async function handleProvision(e) {
            e.preventDefault();
            const btn = document.getElementById('provBtn');
            btn.innerHTML = "Deploying..."; btn.disabled = true;
            const payload = {
                institutionName: document.getElementById('instName').value,
                adminName: document.getElementById('adminName').value,
                email: document.getElementById('adminEmail').value,
                password: document.getElementById('adminPass').value
            };
            try {
                // We securely use the auth/register route we already built
                const res = await fetch('/api/auth/register', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
                });
                const data = await res.json();
                if (data.success) {
                    showToast("Tenant Successfully Deployed!");
                    closeM();
                    fetchGlobalData(); // Refresh the table
                } else {
                    showToast(data.message, 'error');
                }
            } catch (err) {
                showToast('Deployment failed due to network error.', 'error');
            } finally {
                btn.innerHTML = "Deploy Workspace"; btn.disabled = false;
            }
        }
        // Toggle Suspension
        async function toggleStatus(id, makeActive) {
            const action = makeActive ? 'reactivate' : 'suspend';
            if (!confirm(`Are you sure you want to ${action} this institution? All staff and students will be locked out.`)) return;
            try {
                const res = await fetch(`/api/hq/institutions/${id}/toggle`, {
                    method: 'PUT', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ isActive: makeActive })
                });
                const data = await res.json();
                if (data.success) {
                    showToast(`Tenant has been ${makeActive ? 'reactivated' : 'suspended'}.`);
                    fetchGlobalData();
                } else showToast(data.message, 'error');
            } catch (e) { showToast('Server Error', 'error'); }
        }
        // Nuclear Delete
        async function deleteTenant(id) {
            const confirm1 = confirm("WARNING: This will permanently delete the Institution, all their Staff, Students, Courses, and Payment History. Proceed?");
            if (!confirm1) return;
            const typed = prompt("To confirm, type the word 'DELETE' below:");
            if (typed !== "DELETE") return showToast("Deletion aborted.", "error");
            try {
                const res = await fetch(`/api/hq/institutions/${id}`, {
                    method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                if (data.success) {
                    showToast("Tenant completely erased from the server.");
                    fetchGlobalData();
                } else showToast(data.message, 'error');
            } catch (e) { showToast('Server Error', 'error'); }
        }
        // Boot
        fetchGlobalData();
    </script>
</body>
</html>

```

## fees.js
```js
// fees.js

function pgFeeS() { 
    return `
    <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center text-slate-500 mx-auto max-w-2xl mt-4">
        <div class="text-4xl mb-4">📋</div>
        <h3 class="text-lg font-bold text-slate-800 mb-1">Fee Structure Module</h3>
        <p class="text-sm">Define master fees for your courses here.</p>
        <button onclick="openFeeModal()" class="mt-6 bg-brand-500 text-slate-900 px-6 py-2.5 rounded-xl font-bold shadow-lg">
            Create New Structure
        </button>
    </div>`; 
}
function pgFeeP() { 
    return `
    <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center text-slate-500 mx-auto max-w-2xl mt-4">
        <div class="text-4xl mb-4">💳</div>
        <h3 class="text-lg font-bold text-slate-800 mb-1">Fee Payments Ledger</h3>
        <p class="text-sm">Transaction history will appear here.</p>
    </div>`; 
}

```

## home.js
```js
// home.js
function pgDash() {
  if (!DASH_DATA) return '';
  let recentRows = STUDENTS.slice(0, 5).map(s => `
    <tr class="hover:bg-slate-50 border-b border-slate-100 transition-colors cursor-pointer">
        <td class="py-4 px-4 sm:px-6 text-sm font-semibold text-slate-800 whitespace-nowrap">${s.name}</td>
        <td class="py-4 px-4 sm:px-6 text-sm whitespace-nowrap"><span class="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold border border-blue-100">${s.course}</span></td>
        <td class="py-4 px-4 sm:px-6 text-sm text-slate-600 font-medium whitespace-nowrap">${fmt(s.totalFees)}</td>
        <td class="py-4 px-4 sm:px-6 text-sm whitespace-nowrap"><span class="${s.totalFees <= s.paid ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'} px-3 py-1 rounded-full text-xs font-bold border">${s.totalFees <= s.paid ? 'Paid' : 'Pending'}</span></td>
    </tr>`).join('');
  let tableHTML = STUDENTS.length > 0 
    ? `<div class="overflow-x-auto"><table class="w-full text-left border-collapse min-w-[600px]"><thead><tr class="bg-slate-50 border-b border-slate-100"><th class="py-3 px-4 sm:px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Student</th><th class="py-3 px-4 sm:px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Course</th><th class="py-3 px-4 sm:px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Total</th><th class="py-3 px-4 sm:px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th></tr></thead><tbody>${recentRows}</tbody></table></div>` 
    : `<div class="py-12 flex flex-col items-center justify-center text-slate-400 px-4 text-center">
        <svg class="w-16 h-16 text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path></svg>
        <p class="font-semibold text-slate-600">No students onboarded</p>
        <p class="text-xs mt-1">Head to the Students tab to add your first record.</p>
       </div>`;
  return `
  <div class="mb-6 sm:mb-8">
    <h2 class="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Welcome back, ${CU.name.split(' ')[0]} 👋</h2>
    <p class="text-slate-500 text-sm sm:text-base mt-1">Here is what is happening at ${DASH_DATA.institutionName} today.</p>
  </div>
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
    <div class="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-200 hover:shadow-md hover:-translate-y-1 transition-all duration-300">
        <div class="w-10 h-10 sm:w-12 sm:h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-3 sm:mb-4">
            <svg class="w-6 h-6 sm:w-7 sm:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 8h6m-5 0a3 3 0 110 6H9l3 3m-3-6h6m6 1a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        </div>
        <p class="text-slate-500 text-xs sm:text-sm font-semibold mb-1">Total Collected</p>
        <h3 class="text-xl sm:text-2xl font-bold text-slate-900 truncate">${fmt(DASH_DATA.totalCollected)}</h3>
    </div>
    <div class="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-200 hover:shadow-md hover:-translate-y-1 transition-all duration-300">
        <div class="w-10 h-10 sm:w-12 sm:h-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center mb-3 sm:mb-4">
            <svg class="w-6 h-6 sm:w-7 sm:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        </div>
        <p class="text-slate-500 text-xs sm:text-sm font-semibold mb-1">Pending Dues</p>
        <h3 class="text-xl sm:text-2xl font-bold text-slate-900 truncate">${fmt(DASH_DATA.pendingDues)}</h3>
    </div>
    <div class="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-200 hover:shadow-md hover:-translate-y-1 transition-all duration-300">
        <div class="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-3 sm:mb-4">
            <svg class="w-6 h-6 sm:w-7 sm:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 14l9-5-9-5-9 5 9 5z"></path><path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 14l9-5-9-5-9 5 9 5z"></path></svg>
        </div>
        <p class="text-slate-500 text-xs sm:text-sm font-semibold mb-1">Total Students</p>
        <h3 class="text-xl sm:text-2xl font-bold text-slate-900">${DASH_DATA.totalStudents}</h3>
    </div>
    <div class="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-200 hover:shadow-md hover:-translate-y-1 transition-all duration-300">
        <div class="w-10 h-10 sm:w-12 sm:h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center mb-3 sm:mb-4">
            <svg class="w-6 h-6 sm:w-7 sm:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
        </div>
        <p class="text-slate-500 text-xs sm:text-sm font-semibold mb-1">Transactions</p>
        <h3 class="text-xl sm:text-2xl font-bold text-slate-900">0</h3>
    </div>
  </div>
  <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
    <div class="px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-100"><h3 class="font-bold text-slate-800">Recent Enrollments</h3></div>
    ${tableHTML}
  </div>`;
}

```

## staff.js
```js
// staff.js
function pgStaff() { 
    return `
    <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 sm:p-12 text-center text-slate-500 mx-auto max-w-2xl mt-4">
        <svg class="w-16 h-16 mx-auto text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
        <h3 class="text-lg font-bold text-slate-800 mb-1">Staff Management</h3>
        <p class="text-sm">Create accounts for your cashiers and admins.</p>
    </div>`; 
}

```

## student.js
```js
// student.js
function downloadStudentTemplate() {
    const csvContent = "ID,Name,Course,Batch,Email,Phone,Parent\n"
        + "1,Arjun Kumar,BCA,2025-2028,arjun.k81@gmail.com,9880000001,Rajesh Kumar\n"
        + "2,Priya Sharma,BCA,2025-2028,priya.s2@gmail.com,9880000002,Suresh Sharma\n"
        + "3,Rahul Verma,BBA,2026-2029,rahul.v681@gmail.com,9880000003,Anil Verma";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "Student_Data_Template.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
function openStudentModal() {
    G('MTL').textContent = 'Register New Student';
    G('MBD').innerHTML = `
        <form id="studentForm" onsubmit="saveStudent(event)" class="space-y-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label class="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Full Name</label><input type="text" id="sName" required class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-500 transition-all text-sm"></div>
                <div><label class="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Course/Class</label><input type="text" id="sCourse" required placeholder="e.g. BCA" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-500 transition-all text-sm"></div>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label class="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Batch Year</label><input type="text" id="sBatch" required placeholder="2024-2027" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-500 transition-all text-sm"></div>
                <div><label class="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Total Fees (₹)</label><input type="number" id="sFees" required class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-500 transition-all text-sm"></div>
            </div>
            <div class="pt-4 border-t border-slate-100 mt-6"><button type="submit" id="saveStuBtn" class="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-xl hover:bg-blue-700 active:scale-95 transition-all shadow-md">Save Student Record</button></div>
        </form>
    `;
    G('OV').classList.replace('hidden', 'flex'); 
}
async function saveStudent(e) {
    e.preventDefault(); 
    const btn = G('saveStuBtn'); btn.textContent = 'Saving...'; btn.disabled = true;
    const payload = { name: G('sName').value, course: G('sCourse').value, batch: G('sBatch').value, totalFees: Number(G('sFees').value) };
    try {
        const res = await fetch('http:
        if ((await res.json()).success) { closeM(); await fetchStudents(); render(); } else { alert('Error saving'); btn.textContent = 'Save'; btn.disabled = false; }
    } catch (error) { alert('Server Error.'); btn.textContent = 'Save'; btn.disabled = false; }
}
function pgStu() { 
    let rows = STUDENTS.map(s => `
        <tr class="hover:bg-slate-50 border-b border-slate-100 transition-colors">
            <td class="py-4 px-4 sm:px-6 whitespace-nowrap"><p class="text-sm font-bold text-slate-900">${s.name}</p><p class="text-xs text-slate-400 mt-0.5">${s.batch}</p></td>
            <td class="py-4 px-4 sm:px-6 whitespace-nowrap"><span class="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold border border-blue-100">${s.course}</span></td>
            <td class="py-4 px-4 sm:px-6 text-sm text-slate-600 font-medium whitespace-nowrap">${fmt(s.totalFees)}</td>
            <td class="py-4 px-4 sm:px-6 text-sm text-slate-600 font-medium whitespace-nowrap">${fmt(s.paid)}</td>
            <td class="py-4 px-4 sm:px-6 whitespace-nowrap"><span class="${s.totalFees <= s.paid ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'} px-3 py-1 rounded-full text-xs font-bold border">${s.totalFees <= s.paid ? 'Paid' : 'Pending'}</span></td>
        </tr>`).join('');
    let tableHTML = STUDENTS.length > 0 
        ? `<div class="overflow-x-auto"><table class="w-full text-left border-collapse min-w-[700px]"><thead><tr class="bg-slate-50 border-b border-slate-100"><th class="py-3 px-4 sm:px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Student Info</th><th class="py-3 px-4 sm:px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Course</th><th class="py-3 px-4 sm:px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Total Fees</th><th class="py-3 px-4 sm:px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Amount Paid</th><th class="py-3 px-4 sm:px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th></tr></thead><tbody>${rows}</tbody></table></div>` 
        : `<div class="py-12 sm:py-16 flex flex-col items-center justify-center text-slate-400 px-4 text-center">
            <svg class="w-20 h-20 text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
            <p class="font-bold text-slate-600 text-base sm:text-lg">Your directory is empty</p>
            <p class="text-xs sm:text-sm mt-1 mb-6">Start by adding your first student record.</p>
            <button onclick="openStudentModal()" class="bg-white border-2 border-slate-200 text-slate-600 font-bold py-2 px-6 rounded-xl hover:bg-slate-50 transition-all">Add Student</button>
           </div>`;
    return `
    <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div class="px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-100 flex flex-col sm:flex-row sm:justify-between sm:items-center bg-white gap-4">
            <h3 class="font-bold text-slate-800 text-lg flex items-center">Directory <span class="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full text-xs ml-2">${STUDENTS.length}</span></h3>
            <div class="flex gap-2 w-full sm:w-auto">
                <button onclick="downloadStudentTemplate()" class="flex-1 sm:flex-none bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold py-2 px-4 rounded-xl hover:bg-emerald-100 hover:border-emerald-300 active:scale-95 transition-all text-sm flex items-center justify-center gap-2">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg> Template CSV
                </button>
                <button onclick="openStudentModal()" class="flex-1 sm:flex-none bg-blue-600 text-white font-semibold py-2 px-4 rounded-xl hover:bg-blue-700 shadow-sm shadow-blue-600/20 active:scale-95 transition-all text-sm flex items-center justify-center gap-2">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg> Add Student
                </button>
            </div>
        </div>
        ${tableHTML}
    </div>`; 
}

```

## package.json
```json
// package.json
{
  "name": "feehub-saas",
  "version": "1.0.0",
  "description": "FeeHub - Smart Fee Management SaaS for Educational Institutions",
  "scripts": {
    "start": "node backend/server.js",
    "postinstall": "cd backend && npm install"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}

```

## README.md
```md
[//]: # (README.md)
# 🚀 FeeHub SaaS - Smart Fee Management System

![FeeHub Logo](feehub_logo_1775929448683.png)

**FeeHub** is a premium, multi-tenant SaaS platform designed for educational institutions to streamline fee collection, track payments, and manage student financial records with ease. Built with a focus on security, scalability, and user experience.

---

## 🛠️ Comprehensive Feature Suite

### 1. 🏢 Multi-Tenant Institution Management (HQ)
*   **Centralized Command Center**: Real-time tracking of platform-wide revenue, total enrollment, and active instances from a high-level SuperAdmin perspective.
*   **Instance Lifecycle Control**: Instantly provision, suspend, or reactivate institutional tenants to manage subscription states or compliance.
*   **Logical Data Isolation**: Each tenant's data (Students, Staff, Payments) is strictly partitioned at the logic layer for multi-tenant security.
*   **Nuclear Wipe Safety**: Administrative capability to securely erase all data associated with a specific tenant while maintaining system integrity.

### 2. 💰 Advanced Fee & Revenue Architecture
*   **Dynamic Fee Modeling**: Create granular fee structures mapped to specific Courses and Academic Batches for precise financial planning.
*   **Component-based Breakdown**: Define custom fee categories (Tuition, Lab, Library, Sports, etc.) within each model for transparent billing.
*   **Automated Balance Sync**: Modifying a fee structure automatically triggers a platform-wide recalculation of dues for all enrolled students in that batch.
*   **Total Debt Management**: Systemic tracking of "Total Fees" vs "Paid" with real-time "Net Balance" calculation for every student.

### 3. 🎓 Smart Student & Staff Administration
*   **Automated ID Generation**: Proprietary logic generates unique Student IDs based on enrollment patterns and contact data.
*   **Staff RBAC Management**: Manage institution staff with specific roles, allowing for delegated payment recording and student updates.
*   **Bulk Operations Engine**: High-performance bulk import/upsert system for managing thousands of records via localized API optimization.
*   **Lifecycle Monitoring**: Real-time audit of student admission status, course progress, and contact information.

### 4. 💳 Omni-channel Payment Operations
*   **Multi-Method Recording**: Log payments via Cash, UPI, Bank Transfer, or Online gateways with custom transaction ID tracking.
*   **Late Fee & Penalty Engine**: Apply discretionary or automated fines that track independently of core academic balances.
*   **Hybrid Receipting**: Support for both auto-generated digital receipt numbers and manual physical book references.
*   **Instant Ledger Settlement**: Payments are processed in real-time, removing manual reconciliation burdens for accountants.

### 5. 📨 Automated Communication Pipeline
*   **Branded HTML Receipts**: Professional email receipts featuring the institution's colors and branding delivered instantly upon payment.
*   **Accountability Summaries**: Transaction emails include a proactive "Current Dues" summary to keep students informed of their status.
*   **Resend Mastery**: One-click administrative ability to trigger manual receipt delivery if a student loses their copy.
*   **Smart Delivery Routing**: Native integration with SendGrid and Nodemailer ensuring high deliverability to inbox (bypassing spam).

### 6. 🎨 Premium User Experience (UX/UI)
*   **Nebula Engine Loader**: A sophisticated, glassmorphic page loader that handles asset initialization while providing a premium first impression.
*   **Midnight Aesthetic**: Dark-themed, high-contrast dashboard designed for professional usage and readability.
*   **Responsive Flow**: Fully optimized for desktop and mobile browsers, ensuring access from anywhere.
*   **Anti-Flash System**: Proprietary logic prevents FOUC (Flash of Unstyled Content) during heavy page loads.

---

## 🛠️ Tech Stack

### Frontend
-   **Structure**: Semantic HTML5
-   **Styling**: Custom CSS3 (Glassmorphism & Midnight Aesthetic)
-   **Logic**: Vanilla JavaScript (Async/Await API Integration)

### Backend
-   **Runtime**: Node.js (v18+)
-   **Framework**: Express.js
-   **Database**: MongoDB (Mongoose ODM)
-   **Mailing**: SendGrid / Nodemailer
-   **Security**: Helmet, CORS, JWT, BcryptJS

---

## 🚀 Getting Started

### Prerequisites
-   [Node.js](https://nodejs.org/) installed on your system.
-   [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) account or local MongoDB instance.

### Installation

1.  **Clone the repository**:
    ```bash
    git clone <repository-url>
    cd feehub-saas
    ```

2.  **Install dependencies**:
    ```bash
    # Install root dependencies
    npm install
    ```

3.  **Environment Setup**:
    Create a `.env` file in the `backend/` directory using `.env.example` as a template:
    ```env
    PORT=5000
    MONGO_URI=your_mongodb_uri
    JWT_SECRET=your_secret_key
    EMAIL_USER=your_sendgrid_email
    EMAIL_PASS=your_sendgrid_api_key
    ```

### Running the Application

**Development Mode:**
```bash
npm start
```
The server will start on `http://localhost:5000` (or your specified port). Since the backend serves the frontend statically, you can access the app directly via this URL.

**Seeding Data (Optional):**
To populate the database with initial data:
```bash
node backend/seed.js
```

---

## 👥 User Roles & Access
| Role | Access Level | Primary Task |
| :--- | :--- | :--- |
| **SuperAdmin** | Full System | System monitoring, institution management. |
| **HQ Admin** | Institutional | Staff management, manual fee updates. |
| **Student** | Personal Portal | Fee payment, receipt downloads. |

---

## 📁 Project Structure

```text
FeeHub-SaaS/
├── backend/                # Express.js Server
│   ├── config/             # DB & Mail Config
│   ├── controllers/        # Business Logic
│   ├── models/             # Mongoose Schemas
│   ├── routes/             # API Endpoints
│   ├── utils/              # Helper Functions
│   └── server.js           # Entry Point
├── frontend/               # Client-Side Application
│   ├── index.html          # Landing Page
│   ├── login.html          # Auth Pages
│   ├── dashboard.html      # User Dashboards
│   └── feehub-loader.js    # Global Loader/Common Logic
├── package.json            # Scripts & Root Dependencies
└── README.md               # Documentation
```

---

## 🛡️ Security Features
-   **Production Ready**: Confgured for deployment on platforms like Render.
-   **Sensitive Data Protection**: All sensitive endpoints require valid JWT tokens.
-   **Input Sanitization**: Body-parser limits and Content-Type validation.

---

## 📜 License
Distributed under the **ISC License**. See `package.json` for more information.

---
*Developed by Bhapee Studios 🚀*

```

