# FeeHub SaaS - Project Record

Generated on: 12-4-2026, 2.08.37 PM
Note: This record focuses on the Backend Architecture and Core Logic (~1500 lines).

## package.json
Project metadata and backend dependencies.
```json
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

## server.js
Main entry point for the backend server and middleware setup.
```js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const helmet = require('helmet');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

// Initialize the Express app
const app = express();

// ─── Production Security ───
// Trust Render's reverse proxy (required for correct HTTPS detection)
app.set('trust proxy', 1);

// Helmet CSP is disabled for now since we load CDN scripts (Tailwind, Chart.js, etc.)
// You can re-enable and whitelist domains later for extra hardening
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
}));

// ─── CORS ───
app.use(cors());

// Fix for strict body-parser charset error (strips quotes from Content-Type if injected by browser/proxy)
app.use((req, res, next) => {
    if (req.headers['content-type']) {
        req.headers['content-type'] = req.headers['content-type'].replace(/"/g, '');
    }
    next();
});

app.use(express.json({ limit: '5mb' }));

// ─── Database Connection ───
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ MongoDB Connected Successfully'))
    .catch(err => {
        console.error('❌ MongoDB Connection Error:', err.message);
        process.exit(1);
    });

// ─── API Routes ───
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/students', require('./routes/studentRoutes'));
app.use('/api/courses', require('./routes/courseRoutes'));
app.use('/api/fee-structures', require('./routes/feeStructureRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));
app.use('/api/staff', require('./routes/staffRoutes'));
app.use('/api/hq', require('./routes/hqRoutes'));
app.use('/api/student-portal', require('./routes/studentPortalRoutes'));

// ─── Serve Frontend (static files) ───
app.use(express.static(path.join(__dirname, '../frontend'), {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
            res.setHeader('Expires', '-1');
            res.setHeader('Pragma', 'no-cache');
        }
    }
}));

// SPA-style catch-all: serve login.html for any non-API GET request
app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
        res.sendFile(path.join(__dirname, '../frontend/login.html'));
    } else {
        next();
    }
});

// ─── Error Handling ───
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: process.env.NODE_ENV === 'production' ? 'Server Error' : err.message
    });
});

// ─── Start Server ───
const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
    console.log('───────────────────────────────────────');
    console.log(`🚀 FeeHub Engine running on port ${PORT}`);
    console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('───────────────────────────────────────');
});
```

## db.js
MongoDB connection configuration using Mongoose.
```js
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

## course.js
Mongoose schema for academic courses.
```js
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
Mongoose schema for defining course-specific fee models.
```js
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
Mongoose schema for multi-tenant institution management.
```js

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
Mongoose schema for tracking student financial transactions.
```js
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
Mongoose schema for student profiles and fee status.
```js
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
Mongoose schema for system users (Admins, Staff, Students).
```js

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

## authMiddleware.js
Secures routes by verifying JWT tokens and user roles.
```js

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

## authController.js
Handles registration, login, and secure password reset logic.
```js
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
```

## authRoutes.js
API routes for authentication and account recovery.
```js

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
API routes for managing courses.
```js
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
API routes for retrieving dashboard statistics.
```js
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
API routes for configuring fee models.
```js
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
Privileged routes for SuperAdmin platform control.
```js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const Institution = require('../models/institution');
const User = require('../models/user');
const Student = require('../models/student');
const Payment = require('../models/Payment');

// Middleware: Strict SuperAdmin Only Gatekeeper
const superAdminOnly = (req, res, next) => {
    if (req.user && req.user.role === 'SuperAdmin') {
        next();
    } else {
        res.status(403).json({ success: false, message: 'HQ Clearance Required' });
    }
};

// @route   GET /api/hq/dashboard
// @desc    Get global platform stats and all institutions
router.get('/dashboard', protect, superAdminOnly, async (req, res) => {
    try {
        // 1. Fetch all institutions (excluding HQ itself for clean metrics)
        const institutionsRaw = await Institution.find().lean();

        // 2. Fetch platform wide metrics
        const totalUsers = await User.countDocuments({ role: { $ne: 'SuperAdmin' } });
        const totalStudents = await Student.countDocuments();

        const allPayments = await Payment.aggregate([
            { $group: { _id: null, totalVolume: { $sum: '$amount' } } }
        ]);
        const totalPlatformRevenue = allPayments.length > 0 ? allPayments[0].totalVolume : 0;

        // 3. Attach the Admin Name to each institution for the table
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

// @route   PUT /api/hq/institutions/:id/toggle
// @desc    Suspend or Reactivate an institution
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

// @route   DELETE /api/hq/institutions/:id
// @desc    NUCLEAR: Delete an institution and ALL its data
router.delete('/institutions/:id', protect, superAdminOnly, async (req, res) => {
    try {
        const instId = req.params.id;

        // Wipe all associated data
        await User.deleteMany({ institutionId: instId });
        await Student.deleteMany({ institutionId: instId });
        await Payment.deleteMany({ institutionId: instId });
        // Optional: Add Courses and FeeStructures here if you want a perfect wipe

        // Finally, delete the institution itself
        await Institution.findByIdAndDelete(instId);

        res.json({ success: true, message: 'Tenant completely erased.' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   PUT /api/hq/institutions/:id
// @desc    Edit institution name and/or admin name
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
API routes for processing and viewing payments.
```js
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
API routes for managing institution staff.
```js
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
API routes specialized for the student-facing dashboard.
```js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const Student = require('../models/student');
const Payment = require('../models/Payment');
const Institution = require('../models/institution');

// @desc    Get student's own dashboard data (profile + payments)
// @route   GET /api/student-portal
// @access  Student (JWT with role=Student)
router.get('/', protect, async (req, res) => {
    try {
        // Ensure only students can access this route
        if (req.user.role !== 'Student') {
            return res.status(403).json({ success: false, message: 'Access denied. Students only.' });
        }

        // The student document is already loaded by the auth middleware
        const student = req.user;

        // Get the institution name
        const institution = await Institution.findById(student.institutionId);
        const institutionName = institution ? institution.name : 'FeeHub Institution';

        // Get all payments for this student
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
API routes for handling student data.
```js
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
        
        // Custom ID Logic: First 3 of Name + (Last 4 of Phone OR Last 4 of Email)
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
                // Predictable fallback: Last 4 of Phone, else Last 4 of Email, else Index-based
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

## emailService.js
Utility service for sending transactional emails (SendGrid).
```js
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


```

## seed.js
Utility script to populate the database with demo data.
```js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import your models
const User = require('./models/user');
const Institution = require('./models/institution');

const createMasterAccount = async () => {
    try {
        console.log("Connecting to Database...");
        await mongoose.connect(process.env.MONGO_URI);

        // 1. Check if a SuperAdmin already exists
        const existingAdmin = await User.findOne({ role: 'SuperAdmin' });
        if (existingAdmin) {
            console.log("⚠️ A Super Admin already exists! Access Denied.");
            process.exit();
        }

        // 2. Create the invisible "HQ" Institution (Required by your database rules)
        const hq = await Institution.create({
            name: "FeeHub Master Control",
            email: "hq@feehub.com", // ✅ Fixed!
            subscriptionPlan: "Enterprise"
        });
        // 3. Encrypt the Master Password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash("master123", salt); // Your temporary password

        // 4. Create the Director Account
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

## fresh-start.js
Developer utility to reset the entire database.
```js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');

// Import all models (to ensure they are registered and can be dropped)
const User = require('../models/user');
const Institution = require('../models/institution');
const Student = require('../models/student');
const Course = require('../models/course');
const FeeStructure = require('../models/FeeStructure');
const Payment = require('../models/Payment');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function freshStart() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // 1. Wipe all data
        console.log('🧹 Wiping all collections...');
        const collections = await mongoose.connection.db.collections();
        for (let collection of collections) {
            await collection.deleteMany({});
            console.log(`   - Cleared: ${collection.collectionName}`);
        }

        // 2. Re-create the master SuperAdmin (HQ Director)
        console.log('👑 Re-creating master SuperAdmin...');
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('bhapee#0801', salt);

        await User.create({
            name: 'HQ Director',
            email: 'director@feehub.com',
            password: hashedPassword,
            role: 'SuperAdmin'
        });

        console.log('✨ Database is now fresh and ready!');
        console.log('👉 Login: director@feehub.com / bhapee#0801');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error during fresh start:', error.message);
        process.exit(1);
    }
}

freshStart();

```

## reset-hq-admin.js
System utility to initialize the platform SuperAdmin.
```js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');
const User = require('../models/user');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function resetPassword() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        const email = 'director@feehub.com';
        const newPassword = 'bhapee#0801';

        const user = await User.findOne({ email });
        if (!user) {
            console.error(`❌ User with email ${email} not found`);
            process.exit(1);
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        
        // Ensure role is SuperAdmin if it's the director
        if (user.role !== 'SuperAdmin') {
            console.log(`ℹ️ Updating role to SuperAdmin for ${email}`);
            user.role = 'SuperAdmin';
        }

        await user.save();
        console.log(`✅ Password successfully updated for ${email}`);
        process.exit(0);
    } catch (error) {
        console.error('❌ Error updating password:', error.message);
        process.exit(1);
    }
}

resetPassword();

```
