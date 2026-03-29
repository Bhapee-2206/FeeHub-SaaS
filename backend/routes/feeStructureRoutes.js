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
