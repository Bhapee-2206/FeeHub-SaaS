const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');
const User = require('../models/user');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function resetPassword() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        const email = 'director@feehub.com';
        const newPassword = 'bhapee#0801';

        const user = await User.findOne({ email });
        if (!user) {
            console.error(`❌ User with email ${email} not found`);
            process.exit(1);
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        
        // Ensure role is SuperAdmin if it's the director
        if (user.role !== 'SuperAdmin') {
            console.log(`ℹ️ Updating role to SuperAdmin for ${email}`);
            user.role = 'SuperAdmin';
        }

        await user.save();
        console.log(`✅ Password successfully updated for ${email}`);
        process.exit(0);
    } catch (error) {
        console.error('❌ Error updating password:', error.message);
        process.exit(1);
    }
}

resetPassword();
