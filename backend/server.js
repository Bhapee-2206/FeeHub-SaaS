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