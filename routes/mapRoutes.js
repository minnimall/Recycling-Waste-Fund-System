// routes/routeOptimization.js
const express = require('express');
const router = express.Router();
const { WasteRequest, Route } = require('../models');
const routeService = require('../services/routeService');

// API สำหรับดึงรายการ requests ที่รอการรับซื้อ
router.get('/pending-requests', async (req, res) => {
    try {
        const pendingRequests = await WasteRequest.find({
            status: 'pending',
            coordinates: { $exists: true, $ne: null }
        }).populate('userId');
        
        res.json({
            success: true,
            data: pendingRequests
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// API สำหรับคำนวณเส้นทางที่เหมาะสม
router.post('/optimize', async (req, res) => {
    try {
        const { requestIds, startPoint } = req.body;
        
        // ตรวจสอบว่ามี requests ที่เลือก
        if (!requestIds || requestIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'กรุณาเลือกจุดรับซื้อขยะอย่างน้อย 1 จุด'
            });
        }

        // ดึงข้อมูล requests ที่เลือก
        const requests = await WasteRequest.find({
            '_id': { $in: requestIds }
        });

        // คำนวณเส้นทางที่เหมาะสม
        const optimizedRoute = await routeService.calculateOptimalRoute(requests, startPoint);
        
        res.json({
            success: true,
            data: optimizedRoute
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// API สำหรับบันทึกเส้นทางที่คำนวณได้
router.post('/save-route', async (req, res) => {
    try {
        const { requestIds, optimizedRoute, staffId } = req.body;
        
        // สร้าง route ใหม่
        const newRoute = new Route({
            routeId: `ROUTE_${Date.now()}`,
            staffId: staffId,
            requests: requestIds,
            optimizedRoute: optimizedRoute.waypoints,
            totalDistance: optimizedRoute.totalDistance,
            estimatedDuration: optimizedRoute.totalDuration,
            startPoint: optimizedRoute.startPoint,
            status: 'draft'
        });

        await newRoute.save();

        // อัพเดทสถานะของ requests
        await WasteRequest.updateMany(
            { '_id': { $in: requestIds } },
            { $set: { status: 'assigned' } }
        );

        res.json({
            success: true,
            message: 'บันทึกเส้นทางสำเร็จ',
            data: newRoute
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;