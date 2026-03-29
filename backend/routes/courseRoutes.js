const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');

const Course = require('../models/Course'); 


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
