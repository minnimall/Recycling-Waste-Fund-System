const cron = require('node-cron');
const wasteSaleRequest = require('../models/wasteSaleRequest');
const wasteSaleRequestLog = require('../models/wasteSaleRequestLog');

cron.schedule('*/30 * * * * *', async () => {
    try {
        console.log('🚚 cron: move confirmed → in-progress');

        const now = new Date();

        const requests = await wasteSaleRequest.find({
            status: 'confirmed',
            'reply.0.pickupDate': { $lte: now },
        });

        for (const req of requests) {
            req.status = 'in-progress';
            await req.save();

            await wasteSaleRequestLog.create({
                wasteSaleRequest: req._id,
                status: 'IN_PROGRESS',
                actionBy: 'SYSTEM',
                note: 'ถึงเวลานัดรับอัตโนมัติ'
            });
        }

    } catch (err) {
        console.error('cron in-progress error:', err);
    }
});
