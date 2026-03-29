const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const FeeStructure = require('./models/feeStructure');



router.post('/', protect, async (req, res) => {
    try {
        if (req.user.role !== 'InstitutionAdmin') {
            return res.status(403).json({ success: false, message: 'Admin access required' });
        }

        const newFee = await FeeStructure.create({
            ...req.body,
            institutionId: req.user.institutionId
        });

        res.status(201).json({ success: true, data: newFee });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});



router.get('/', protect, async (req, res) => {
    try {
        const fees = await FeeStructure.find({ institutionId: req.user.institutionId });
        res.status(200).json({ success: true, data: fees });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

module.exports = router;
