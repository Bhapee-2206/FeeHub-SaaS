const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();


const User = require('./models/user');
const Institution = require('./models/institution');

const createMasterAccount = async () => {
    try {
        console.log("Connecting to Database...");
        await mongoose.connect(process.env.MONGO_URI);

        
        const existingAdmin = await User.findOne({ role: 'SuperAdmin' });
        if (existingAdmin) {
            console.log("⚠️ A Super Admin already exists! Access Denied.");
            process.exit();
        }

        
        const hq = await Institution.create({
            name: "FeeHub Master Control",
            email: "hq@feehub.com", 
            subscriptionPlan: "Enterprise"
        });
        
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash("master123", salt); 

        
        await User.create({
            name: "System Director",
            email: "director@feehub.com", 
            password: hashedPassword,
            role: "SuperAdmin",
            institutionId: hq._id
        });

        console.log("✅ MASTER ACCOUNT SUCCESSFULLY DEPLOYED!");
        console.log("---------------------------------------");
        console.log("Portal:   http:
        console.log("Email:    director@feehub.com");
        console.log("Password: master123");
        console.log("---------------------------------------");

        process.exit();
    } catch (error) {
        console.error("❌ Seeding Error:", error);
        process.exit(1);
    }
};

createMasterAccount();
