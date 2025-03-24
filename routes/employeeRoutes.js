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

// ตรวจสอบความประสงค์ขายขยะ
router.get('/wasteSaleRequest', employeeController.wasteSaleRequestIndex);

// สต๊อกขยะ
router.get('/wasteStock', employeeController.wasteStockIndex);

module.exports = router