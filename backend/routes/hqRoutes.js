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