
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    
    
    institutionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Institution',
        required: true
    },
    name: {
        type: String,
        required: [true, 'Please add a name']
    },
    email: {
        type: String,
        required: [true, 'Please add an email'],
        unique: true
    },
    password: {
        type: String,
        required: [true, 'Please add a password'],
        minlength: 6,
        select: false 
    },
    role: {
        type: String,
        enum: ['SuperAdmin', 'InstitutionAdmin', 'Staff', 'Student'],
        default: 'Student'
    },
    
    studentIdNumber: {
        type: String,
        default: null
    }
}, {
    timestamps: true
});

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
