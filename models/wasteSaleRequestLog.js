const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const wasteSaleRequestLogSchema = new Schema(
    {
        wasteSaleRequest: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'wasteSaleRequest',
            required: true
        },

        // สถานะที่เปลี่ยนไป
        status: {
            type: String,
            enum: [
                'SUBMITTED',
                'PENDING',
                'WAITING_APPROVAL',
                'APPROVED',
                'WAITING_USER',
                'CONFIRMED',
                'IN_PROGRESS',
                'COMPLETED',
                'CANCELLED_BY_USER',
                'CANCELLED_BY_EMPLOYEE',
                'REJECTED_BY_SYSTEM',
                'REJECTED'
            ],
            required: true
        },

        // ยกเลิกในขั้นตอนไหน (เฉพาะกรณียกเลิก)
        stage: {
            type: String,
            required: false
        },

        // เหตุผล (เฉพาะกรณียกเลิก)
        reason: {
            type: String,
            enum: [
                'CHANGE_PLAN',
                'NOT_AVAILABLE_DATE',
                'WANT_RESCHEDULE',
                'WASTE_NOT_READY',
                'LESS_WASTE',
                'WRONG_WASTE_TYPE',
                'LOCATION_ISSUE',
                'NO_ONE_AT_HOME',
                'PRICE_NOT_MATCH',
                'WEATHER',
                'EMERGENCY',
                'OTHER',
                'USER_NOT_CONFIRMED_IN_TIME',
                'USER_CANCELLED_AFTER_CONFIRM'
            ],
            required: false
        },
        reasonText: {
            type: String,
            required: false
        },
        approveText: {
            type: String,
            required: false
        },

        // ใครเป็นคนทำ action
        actionBy: {
            type: String,
            enum: ['USER', 'EMPLOYEE', 'ADMIN', 'SYSTEM'],
            required: true
        },

        note: {
            type: String,
            required: false
        },

        isDeleted: {
            type: Boolean,
            default: false
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model(
    'wasteSaleRequestLog',
    wasteSaleRequestLogSchema
);
