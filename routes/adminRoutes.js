//แบบใช้คู่กับ controller
const express = require('express')
const adminController = require('../controllers/adminController')
const router = express.Router()

router.get('/', adminController.mediaIndex)

router.get('/news', adminController.newsIndex)

router.get('/employee', adminController.employeeIndex)

router.get('/wasteType', adminController.wasteTypeIndex)

router.get('/wastePrice', adminController.wastePriceIndex)

router.get('/round', adminController.RoundIndex)

module.exports = router
