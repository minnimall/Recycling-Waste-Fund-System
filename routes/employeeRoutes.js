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

// คำร้องหรือหรือข้อร้องเรียน
router.get('/complaint', employeeController.complaintIndex);
router.patch('/complaint/:id/status', employeeController.updateComplaintStatus);

// ตรวจสอบความประสงค์ขายขยะ
router.get('/wasteSaleRequest', employeeController.wasteSaleRequestIndex);

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

module.exports = router