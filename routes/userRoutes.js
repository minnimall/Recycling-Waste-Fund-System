//แบบใช้คู่กับ controller
const express = require('express')
const userController = require('../controllers/userController')
const router = express.Router()

// หน้าหลัก
router.get('/', userController.user_index)

// หน้าประเภทขยะ
router.get('/wastetype', userController.user_wastetype)

// หน้าสื่อความรู้
router.get('/knowledge', userController.user_knowledge)

// หน้าประวัติการขายขยะชองครัวเรือน
router.get('/saleHistory', userController.user_saleHistory)

// หน้าข้อมูลติดต่อของอบต.
router.get('/contact', userController.user_contact)

// หน้ากิจกรรม
router.get('/allActivity', userController.user_allActivity)
router.get('/detailActivity/:id', userController.user_detailActivity);

module.exports = router