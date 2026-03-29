const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();


const User = require('./models/user');

const updateMasterPassword = async () => {
    try {
        console.log("Connecting to Database...");
        await mongoose.connect(process.env.MONGO_URI);

        
        const newSecurePassword = "455169111";

        
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newSecurePassword, salt);

        
        const updatedAdmin = await User.findOneAndUpdate(
            { role: 'SuperAdmin' },
            { password: hashedPassword },
            { new: true }
        );

        if (updatedAdmin) {
            console.log("✅ SUCCESS: Master Password has been permanently updated!");
            console.log(`Your new password is: ${newSecurePassword}`);
        } else {
            console.log("❌ ERROR: Could not find a Super Admin account.");
        }

        process.exit();
    } catch (error) {
        console.error("❌ System Error:", error);
        process.exit(1);
    }
};

updateMasterPassword();
