const cron = require('node-cron');
const axios = require('axios');
const wasteSaleRequest = require('../models/wasteSaleRequest');
const Route = require('../models/route');

const OSRM_BASE_URL = 'https://router.project-osrm.org';

const DEPOT = {
    lat: 15.949248457125925,
    lng: 102.85507993262989,
    address: '2297, บ้านหัวขัว, เปือยน้อย, Pueai Noi, จังหวัดขอนแก่น, ประเทศไทย'
};

const formatDateKey = (date) =>
    new Date(date).toISOString().split('T')[0];

// cron.schedule('*/30 * * * * *', async () => {
cron.schedule('0 1 * * *', async () => {
    try {
        console.log('[CRON] Build daily routes (in-progress)');

        const start = new Date();
        start.setHours(0, 0, 0, 0);

        const end = new Date();
        end.setHours(23, 59, 59, 999);

        // 1. ดึง request วันนี้
        const requests = await wasteSaleRequest.find({
            status: 'in-progress',
            isDeleted: false,
            approvePickupDate: { $gte: start, $lte: end }
        });

        if (!requests.length) {
            console.log('[CRON] No requests today');
            return;
        }

        // 2. group ตามวัน
        const grouped = {};
        for (const r of requests) {
            const key = formatDateKey(r.approvePickupDate);
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(r);
        }

        // 3. สร้าง route ต่อวัน
        for (const dateKey of Object.keys(grouped)) {
            const dayRequests = grouped[dateKey]
                .filter(r => r.latitude && r.longitude);

            if (dayRequests.length === 0) continue;

            // 4. depot + requests
            const coordinatesArr = [
                `${DEPOT.lng},${DEPOT.lat}`,
                ...dayRequests.map(r => `${r.longitude},${r.latitude}`)
            ];

            const coordinates = coordinatesArr.join(';');

            const osrmUrl =
                `${OSRM_BASE_URL}/trip/v1/driving/${coordinates}` +
                `?source=first&roundtrip=true&overview=false`;

            const { data } = await axios.get(osrmUrl);

            const trip = data.trips[0];
            const waypoints = data.waypoints;

            // 5. เรียง waypoint
            const sorted = waypoints.sort(
                (a, b) => a.waypoint_index - b.waypoint_index
            );

            const points = [];
            let pointNumber = 1;

            for (const wp of sorted) {
                if (wp.waypoint_index === 0) {
                    // กรณีเป็นจุดเริ่มต้น (Depot)
                    points.push({
                        pointNumber: pointNumber++,
                        lat: DEPOT.lat,
                        lng: DEPOT.lng,
                        address: DEPOT.address,
                        status: 'active' // เพิ่ม status เริ่มต้น
                    });
                } else {
                    // ดึงข้อมูล Request ต้นฉบับโดยใช้ index (ต้อง -1 เพราะจุดแรกคือ Depot)
                    const req = dayRequests[wp.waypoint_index - 1];
                    
                    points.push({
                        pointNumber: pointNumber++,
                        lat: req.latitude,
                        lng: req.longitude,
                        address: req.location,
                        requestId: req._id, // <--- เพิ่มบรรทัดนี้เพื่อเก็บ ID ของคำขอ
                        status: 'active'    // เพิ่ม status เพื่อใช้กับ Checkbox ที่คุณต้องการ
                    });
                }
            }

            // 6. save route
            await Route.create({
                routeName: `เส้นทางเข้ารับซื้อขยะวันที่ ${dateKey}`,
                points,
                totalDistance: +(trip.distance / 1000).toFixed(2),
                totalDuration: Math.ceil(trip.duration / 60),
                numberOfPoints: points.length,
                status: 'active'
            });

            console.log(`[SUCCESS] Route created for ${dateKey}`);
        }

    } catch (err) {
        console.error('[CRON][ERROR]', err.response?.data || err.message);
    }
});
