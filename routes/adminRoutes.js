//แบบใช้คู่กับ controller
const express = require('express')
const adminController = require('../controllers/adminController')
const router = express.Router()

// สื่อ
router.get('/', adminController.mediaIndex)
router.post('/mediaPost', adminController.mediaPost)
router.post('/mediaDelete/:id', adminController.mediaDelete);

// ข่าวสาร
router.get('/news', adminController.newsIndex)
router.post('/newsPost', adminController.newsPost)

// กิจกรรม
router.get('/activity', adminController.activityIndex)
router.post('/activityPost', adminController.activityPost)
router.post('/deleteActivity/:id', adminController.deleteActivity);

// ขยะ
router.get('/waste', adminController.wasteIndex)
router.post('/wastePost', adminController.wastePost)

// ประเภทขยะ
router.get('/wasteType', adminController.wasteTypeIndex)
router.post('/wasteTypePost', adminController.wasteTypePost)

// ราคาขยะ
router.get('/wastePrice', adminController.wastePriceIndex)

// พนักงาน
router.get('/employee', adminController.employeeIndex)
router.post('/employeeDelete/:id', adminController.employeeDelete);

router.get('/round', adminController.RoundIndex)

module.exports = router
