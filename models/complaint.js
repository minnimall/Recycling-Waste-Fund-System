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
        category: {
            type: String,
            enum: ['waste', 'service', 'noise','sale', 'other'],
            required: true
        },
        image: {
            type: String,
            required: false
        },
        status: {
            type: String,
            enum: ['pending', 'in-progress', 'resolved'],
            default: 'pending'
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
