
const mongoose = require('mongoose');

const institutionSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please provide the institution name'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Please provide a contact email'],
        unique: true,
        match: [
            /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
            'Please add a valid email'
        ]
    },
    phone: {
        type: String,
        default: ''
    },
    address: {
        type: String,
        default: ''
    },
    subscriptionPlan: {
        type: String,
        enum: ['Free Beta', 'Pro', 'Enterprise'],
        default: 'Free Beta' 
    },
    logo: {
        type: String,
        default: ''
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true 
});

module.exports = mongoose.models.Institution || mongoose.model('Institution', institutionSchema);
