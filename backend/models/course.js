const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
    institutionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Institution',
        required: true
    },
    name: {
        type: String,
        required: [true, 'Course name is required'],
        trim: true
    },
    duration: {
        type: String,
        required: [true, 'Duration is required (e.g., 3 Years)'],
        trim: true
    }
}, { timestamps: true });


courseSchema.index({ institutionId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Course', courseSchema);
