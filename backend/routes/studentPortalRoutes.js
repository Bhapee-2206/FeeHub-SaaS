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
