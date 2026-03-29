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
