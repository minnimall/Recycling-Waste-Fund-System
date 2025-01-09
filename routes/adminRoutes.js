//แบบใช้คู่กับ controller
const express = require('express')
const adminController = require('../controllers/adminController')
const router = express.Router()

router.get('/', adminController.mediaIndex)

router.post('/mediaPost', adminController.mediaPost)

router.get('/news', adminController.newsIndex)
router.post('/newsPost', adminController.newsPost)


router.get('/activity', adminController.activityIndex)
router.post('/activityPost', adminController.activityPost)

router.get('/employee', adminController.employeeIndex)

router.get('/waste', adminController.wasteIndex)

// wasteType
router.get('/wasteType', adminController.wasteTypeIndex)

router.post('/wasteTypePost', adminController.wasteTypePost)

router.get('/wastePrice', adminController.wastePriceIndex)

router.get('/round', adminController.RoundIndex)

module.exports = router
