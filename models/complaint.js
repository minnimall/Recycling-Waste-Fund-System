const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const complaintSchema = new Schema(
    {
        family: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Family',
            required: true
        },
        complaintMessage: {
            type: String,
            required: true
        },
        isDeleted: {
            type: Boolean,
            default: false
        }
    },
    { timestamps: true }
);

const Complaint = mongoose.model('complaint', complaintSchema);
module.exports = Complaint;
