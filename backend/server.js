const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

// Initialize the Express app
const app = express();

// Middleware
app.use(cors());

// Fix for strict body-parser charset error (strips quotes from Content-Type if injected by browser/proxy)
app.use((req, res, next) => {
    if (req.headers['content-type']) {
        req.headers['content-type'] = req.headers['content-type'].replace(/"/g, '');
    }
    next();
});

app.use(express.json());

// Database Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ MongoDB Connected Successfully'))
    .catch(err => {
        console.error('❌ MongoDB Connection Error:', err);
        process.exit(1);
    });

// API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/students', require('./routes/studentRoutes'));
app.use('/api/courses', require('./routes/courseRoutes'));
app.use('/api/fee-structures', require('./routes/feeStructureRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));
app.use('/api/staff', require('./routes/staffRoutes'));
app.use('/api/hq', require('./routes/hqRoutes'));

// Serve Frontend Files (Crucial for CSS/HTML to sync!)
app.use(express.static(path.join(__dirname, '../frontend')));

// 🔥 THE FIX: Express 5.x Safe Catch-All Route 
// (Replaces the broken app.get('*') method)
app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
        res.sendFile(path.join(__dirname, '../frontend/login.html'));
    } else {
        next();
    }
});

// Error Handling Middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: err.message || 'Server Error'
    });
});

// Start the Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log('---------------------------------------');
    console.log(`🚀 FeeHub Engine running on port ${PORT}`);
    console.log(`🌐 Local Access: http://localhost:${PORT}`);
    console.log('---------------------------------------');
});