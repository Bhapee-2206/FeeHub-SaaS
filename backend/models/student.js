const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
    institutionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Institution', required: true },
    name: { type: String, required: true },
    studentIdNumber: { type: String, required: true }, 
    course: { type: String, required: true },
    batch: { type: String, required: true },
    email: { type: String },
    phone: { type: String },
    parentName: { type: String },
    feeDueDate: { type: Date },
    totalFees: { type: Number, default: 0 },
    paid: { type: Number, default: 0 },
    
    status: { type: String, enum: ['Active', 'Completed'], default: 'Active' }
}, { timestamps: true });

studentSchema.index({ institutionId: 1, studentIdNumber: 1 }, { unique: true });
studentSchema.index(
    { institutionId: 1, email: 1 }, 
    { 
        unique: true, 
        partialFilterExpression: { email: { $type: "string", $gt: "" } } 
    }
);

module.exports = mongoose.models.Student || mongoose.model('Student', studentSchema);
