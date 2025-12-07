const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const systemSettingsSchema = new Schema({
    minimumWithdrawAmount: {
        type: Number,
        default: 300,
        min: 0,
        required: true
    },
    systemName: {
        type: String,
        default: 'ระบบธนาคารขยะชุมชน'
    },
    isDeleted: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// ป้องกันการสร้างหลาย document - ควรมีแค่ 1 document
systemSettingsSchema.statics.getSettings = async function() {
    let settings = await this.findOne({ isDeleted: false });
    
    // ถ้ายังไม่มีการตั้งค่า ให้สร้างใหม่
    if (!settings) {
        settings = await this.create({
            minimumWithdrawAmount: 300,
            systemName: 'ระบบธนาคารขยะชุมชน'
        });
    }
    
    return settings;
};

// อัพเดทยอดเงินขั้นต่ำ
systemSettingsSchema.statics.updateMinimumWithdraw = async function(newAmount) {
    const settings = await this.getSettings();
    settings.minimumWithdrawAmount = newAmount;
    await settings.save();
    return settings;
};

const SystemSettings = mongoose.model('SystemSettings', systemSettingsSchema);
module.exports = SystemSettings;