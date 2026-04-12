const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');

// Import all models (to ensure they are registered and can be dropped)
const User = require('../models/user');
const Institution = require('../models/institution');
const Student = require('../models/student');
const Course = require('../models/course');
const FeeStructure = require('../models/FeeStructure');
const Payment = require('../models/Payment');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function freshStart() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // 1. Wipe all data
        console.log('🧹 Wiping all collections...');
        const collections = await mongoose.connection.db.collections();
        for (let collection of collections) {
            await collection.deleteMany({});
            console.log(`   - Cleared: ${collection.collectionName}`);
        }

        // 2. Re-create the master SuperAdmin (HQ Director)
        console.log('👑 Re-creating master SuperAdmin...');
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('bhapee#0801', salt);

        await User.create({
            name: 'HQ Director',
            email: 'director@feehub.com',
            password: hashedPassword,
            role: 'SuperAdmin'
        });

        console.log('✨ Database is now fresh and ready!');
        console.log('👉 Login: director@feehub.com / bhapee#0801');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error during fresh start:', error.message);
        process.exit(1);
    }
}

freshStart();
