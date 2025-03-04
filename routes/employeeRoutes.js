const express = require('express')
const employeeController = require('../controllers/employeeController')
const router = express.Router()

// แดชบอร์ด
router.get('/', employeeController.dashboardIndex);

// รับซื้อขยะรีไซเคิล
router.get('/wastePurchase', employeeController.wastePurchaseIndex);

// สมาชิกกองทุนขยะรีไซเคิล
router.get('/member', employeeController.memberIndex);

module.exports = router