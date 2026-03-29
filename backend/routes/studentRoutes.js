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
        const newStudent = await Student.create({ ...req.body, institutionId: req.user.institutionId });
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
                const cPrefix = (s.course || 'STU').substring(0, 3).toUpperCase();
                sId = `${cPrefix}-${Date.now().toString().slice(-4)}${Math.floor(Math.random() * 1000)}${idx}`;
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
