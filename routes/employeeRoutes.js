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
router.delete('/memberDelete/:familyId', employeeController.memberDelete);

// คำร้องหรือหรือข้อร้องเรียน
router.get('/complaint', employeeController.complaintIndex);
router.patch('/complaint/:id/status', employeeController.updateComplaintStatus);
router.get('/complaint/reply/:id', employeeController.complaintReply);
router.post('/complaint/replyMessage/:id', employeeController.complaintReplyMessage);
router.post('/complaint/complaints/:complaintId/reply/:replyId/edit', employeeController.updateMessageReply);
router.delete('/complaint/replyMessage/:id', employeeController.deleteMessageReply);

// ตรวจสอบความประสงค์ขายขยะ
router.get('/wasteSaleRequest', employeeController.wasteSaleRequestIndex);
router.put('/wasteSaleRequest/:id/status',  employeeController.updateWasteSaleRequestStatus);
router.get('/wasteSaleRequest/:id', employeeController.wasteSaleRequestReplyIndex);
router.get('/wasteSaleRequestReject/:id', employeeController.wasteSaleRequestReject);
router.post('/wasteSaleRequestReject/:id', employeeController.wasteSaleRequestRejectPost);

// สต๊อกขยะ
router.get('/wasteStock', employeeController.wasteStockIndex);

// เบิกถอน
// หน้าเบิกถอน
router.get('/withDraw', employeeController.showWithdrawPage);
// POST ถอนเงิน
router.post('/withDraw', employeeController.withDrawIndex);
// AJAX ดึงข้อมูลบัญชี
router.get('/withDraw/account/:accountNumber', employeeController.getAccountByNumber);
// อัพเดทยอดเงินขั้นต่ำ (เพิ่มใหม่)
router.post('/withDraw/settings/minimum', employeeController.updateMinimumWithdraw);
// ดึงการตั้งค่าปัจจุบัน (เพิ่มใหม่)
router.get('/withDraw/settings', employeeController.getCurrentSettings);


// ฌาปนกิจสงเคราะห์
router.get('/funeralAid', employeeController.funeralAidIndex);
router.get('/funeral-assistance/search', employeeController.searchHouseholds);
router.get('/funeral-assistance/eligibility/:familyID', employeeController.checkEligibility);
router.post('/funeral-assistance/calculate', employeeController.calculateFuneralAmount);
router.post('/funeral-assistance/preview', employeeController.getDeductionPreview);
router.post('/funeral-assistance/submit', employeeController.submitFuneralAssistance);
router.get('/funeral-assistance/history', employeeController.getFuneralHistory);
router.get('/funeral-assistance/detail/:id', employeeController.getFuneralDetail);
router.get('/funeralAidHistory', employeeController.getFuneralHistoryPage);


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



router.get('/round', employeeController.roundIndex);
router.post('/roundPost', employeeController.roundPost);
router.post('/roundEdit', employeeController.roundEdit);
router.delete('/roundDelete/:id', employeeController.roundDelete);

// จัดการจุดรับซื้อ
router.get('/wastePoint', employeeController.wastePointIndex);
router.get('/wastePoint/create', employeeController.wastePointCreate);
router.get('/wastePoint/edit/:id', employeeController.wastePointEdit);
router.post('/wastePointUpdate/:id', employeeController.wastePointUpdate);
router.get('/wastePoint/toggle/:id', employeeController.wastePointToggle);
router.post('/wastePointPost', employeeController.wastePointPost);
router.get('/wastePoint/delete/:id', employeeController.wastePointDelete);



module.exports = router