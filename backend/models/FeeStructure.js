const mongoose = require('mongoose');

const feeStructureSchema = new mongoose.Schema({
    institutionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Institution',
        required: true
    },
    course: { type: String, required: true },
    batchYear: { type: String, required: true },
    feeComponents: [{
        name: { type: String, required: true },
        amount: { type: Number, required: true }
    }],
    totalFee: { type: Number, default: 0 }
}, { timestamps: true });


feeStructureSchema.pre('save', function() {
    if (this.feeComponents && this.feeComponents.length > 0) {
        this.totalFee = this.feeComponents.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
    } else {
        this.totalFee = 0;
    }
});

module.exports = mongoose.models.FeeStructure || mongoose.model('FeeStructure', feeStructureSchema);
