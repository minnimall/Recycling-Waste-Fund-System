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
// บันทึกเส้นทาง
router.post('/routes/save', employeeController.saveRoute);
// ดูรายการเส้นทางทั้งหมด
router.get('/routeList', employeeController.getAllRoutes);
// ดูรายละเอียดเส้นทาง
router.get('/routeList/:routeId', employeeController.getRouteDetail);
// แก้ไขเส้นทาง
router.put('/routeList/:routeId', employeeController.updateRoute);
// ลบเส้นทาง
router.delete('/routeList/:routeId', employeeController.deleteRoute);


// จัดการจุดรับซื้อ
router.get('/wastePoint', employeeController.wastePointIndex);
router.get('/wastePoint/create', employeeController.wastePointCreate);
router.get('/wastePoint/edit/:id', employeeController.wastePointEdit);
router.post('/wastePointUpdate/:id', employeeController.wastePointUpdate);
router.get('/wastePoint/toggle/:id', employeeController.wastePointToggle);
router.post('/wastePointPost', employeeController.wastePointPost);
router.get('/wastePoint/delete/:id', employeeController.wastePointDelete);

module.exports = router