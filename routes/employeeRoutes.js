const express = require('express')
const employeeController = require('../controllers/employeeController')
const router = express.Router()

// หน้าแดชบอร์ด
router.get('/', employeeController.dashboardIndex);

// หน้ารับซื้อขยะรีไซเคิล
router.get('/wastePurchase', employeeController.wastePurchaseIndex);

module.exports = router