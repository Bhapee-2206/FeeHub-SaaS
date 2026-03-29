const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    institutionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Institution', required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    receiptNumber: { type: String, unique: true, sparse: true },
    amount: { type: Number, required: true }, 
    fine: { type: Number, default: 0 },       
    paymentMethod: { type: String, required: true },
    transactionId: { type: String }, 
    components: [{ name: { type: String }, amount: { type: Number } }],
    remarks: { type: String },
    paymentDate: { type: Date, default: Date.now }, 
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);
