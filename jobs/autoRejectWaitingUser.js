const cron = require('node-cron');
const wasteSaleRequest = require('../models/wasteSaleRequest');
const wasteSaleRequestLog = require('../models/wasteSaleRequestLog');

const EXPIRE_TIME = 10 * 1000; // 🧪 TEST 1 นาที
cron.schedule('*/30 * * * * *', async () => {
    try {
        console.log('[CRON] checking expired waitingUser requests');
        const now = new Date();

        const expiredRequests = await wasteSaleRequest.find({
            status: 'waitingUser',
            userConfirmDeadline: { $lt: now },
            isDeleted: false
        });

        for (const req of expiredRequests) {
            await wasteSaleRequest.findByIdAndUpdate(req._id, {
                status: 'rejected',
                reason: 'USER_NOT_CONFIRMED_IN_TIME'
            });

            await wasteSaleRequestLog.create({
                wasteSaleRequest: req._id,
                status: 'REJECTED_BY_SYSTEM',
                stage: 'WAITING_USER',
                reason: 'USER_NOT_CONFIRMED_IN_TIME',
                actionBy: 'SYSTEM',
                note: 'ผู้ใช้ไม่ยืนยันภายใน 2 ชั่วโมง'
            });
        }

        if (expiredRequests.length > 0) {
            console.log(`[AUTO-REJECT] ${expiredRequests.length} requests`);
        }


    } catch (err) {
        console.error('[AUTO-REJECT ERROR]', err);
    }
});
