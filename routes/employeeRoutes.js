const express = require('express')
const employeeController = require('../controllers/employeeController')
const router = express.Router()

// แดชบอร์ด
router.get('/', employeeController.dashboardIndex);

// รับซื้อขยะรีไซเคิล
router.get('/wastePurchase', employeeController.wastePurchaseIndex);
router.post('/wastePurchasePost', employeeController.wastePurchasePost);

// สรุปรายการรับซื้อขยะ
router.get('/wastePurchaseTotal', employeeController.wastePurchaseTotalIndex);
router.delete('/wastePurchaseDelete/:id', employeeController.wastePurchaseDelete);

// สมาชิกกองทุนขยะรีไซเคิล
router.get('/member', employeeController.memberIndex);
router.post('/memberRegister', employeeController.memberRegister);
router.get('/member/:familyId/edit', employeeController.getMemberForEdit);
router.post('/memberUpdate/:familyId', employeeController.memberUpdate);

// คำร้องหรือหรือข้อร้องเรียน
router.get('/complaint', employeeController.complaintIndex);
router.patch('/complaint/:id/status', employeeController.updateComplaintStatus);

// ตรวจสอบความประสงค์ขายขยะ
router.get('/wasteSaleRequest', employeeController.wasteSaleRequestIndex);
router.put('/wasteSaleRequest/:id/status',  employeeController.updateWasteSaleRequestStatus);

// สต๊อกขยะ
router.get('/wasteStock', employeeController.wasteStockIndex);

// เบิกถอน
// หน้าเบิกถอน
router.get('/withdraw', employeeController.showWithdrawPage);

// POST ถอนเงิน
router.post('/withdraw', employeeController.withDrawIndex);

// AJAX ดึงข้อมูลบัญชี
router.get('/withdraw/account/:accountNumber', employeeController.getAccountByNumber);

// ฌาปนกิจสงเคราะห์
router.get('/funeralAid', employeeController.funeralAidIndex);

// แผนที่
router.get('/map', employeeController.mapIndex);
// API Routes
router.post('/api/routes', employeeController.saveRouteAnalysis);
router.get('/api/routes', employeeController.getEmployeeRoutes);
router.get('/api/routes/:id', employeeController.getRouteById);
router.put('/api/routes/:id', employeeController.updateRoute);
router.delete('/api/routes/:id', employeeController.deleteRoute);
router.post('/api/routes/snapshot', employeeController.captureMapSnapshot);
router.get('/api/routes/:id/export', employeeController.exportRoute);


// จัดการจุดรับซื้อ
router.get('/wastePoint', employeeController.wastePointIndex);
router.post('/wastePointPost', employeeController.wastePointPost);

module.exports = router