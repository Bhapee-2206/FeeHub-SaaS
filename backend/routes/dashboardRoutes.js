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
