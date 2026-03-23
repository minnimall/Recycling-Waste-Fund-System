const cron = require('node-cron');
const wasteSaleRequest = require('../models/wasteSaleRequest');
const wasteSaleRequestLog = require('../models/wasteSaleRequestLog');
const Notification = require('../models/notification');

cron.schedule('*/30 * * * * *', async () => {
    try {
        console.log('[CRON] checking move confirmed → in-progress');

        const now = new Date();

        const requests = await wasteSaleRequest.find({
            status: 'confirmed',
            approvePickupDate: { $ne: null, $lte: now },
        });

        for (const req of requests) {
            req.status = 'in-progress';
            await req.save();

            await wasteSaleRequestLog.create({
                wasteSaleRequest: req._id,
                status: 'IN_PROGRESS',
                actionBy: 'SYSTEM',
                note: 'ถึงเวลาวันนัดรับ'
            });

            const contentList = `
                <div>
                    <p><strong>หมวดหมู่:</strong> แจ้งขายขยะ</p>
                    <p><strong>ข้อความร้องเรียน:</strong> คำขอขายขยะของคุณถึงเวลานัดรับแล้ว</p>
                    <hr class="my-2">
                    <p><strong>คำตอบจากพนักงาน:</strong></p>
                    <p>เจ้าหน้าที่กำลังเดินทางไปรับขยะตามสถานที่นัดหมาย</p>
                </div>
            `;
            await Notification.create({
                userId: req.family, // req.family should be the ObjectId of the owner
                type: 'waste-request',
                title: `กำลังเดินทางไปรับขยะ`,
                content: contentList,
                isRead: false,
            });
        }

        if (requests.length > 0) {
            console.log(`[AUTO-REJECT] ${requests.length} requests`);
        }
    } catch (err) {
        console.error('cron in-progress error:', err);
    }
});
