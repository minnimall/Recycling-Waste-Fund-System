//แบบใช้คู่กับ controller
const express = require('express')
const adminController = require('../controllers/adminController')
const router = express.Router()

// แดชบอร์ด
router.get('/dashboard', adminController.dashboardIndex)

// สื่อ
router.get('/', adminController.mediaIndex);
router.post('/mediaPost', adminController.mediaPost);
router.post('/mediaEdit/:id', adminController.mediaEdit);
router.delete('/mediaDelete/:id', adminController.mediaDelete);

// ข่าวสาร
router.get('/news', adminController.newsIndex);
router.post('/newsPost', adminController.newsPost);

// กิจกรรม
router.get('/activity', adminController.activityIndex);
router.post('/activityPost', adminController.activityPost);
router.post('/activityEdit/:id', adminController.activityEdit);
router.delete('/deleteActivity/:id', adminController.deleteActivity);


// ขยะ
router.get('/waste', adminController.wasteIndex);
router.post('/wastePost', adminController.wastePost);
router.delete('/wasteDelete/:id', adminController.wasteDelete);
router.post('/wasteEdit', adminController.wasteEdit);

// ประเภทขยะ
router.get('/wasteType', adminController.wasteTypeIndex);
router.post('/wasteTypePost', adminController.wasteTypePost);
router.post('/wasteTypeEdit', adminController.wasteTypeEdit);
router.delete('/deletewasteType/:id', adminController.wasteTypeDelete);

// พนักงาน
router.get('/employee', adminController.employeeIndex)
router.delete('/employeeDelete/:id', adminController.employeeDelete);

router.get('/round', adminController.RoundIndex)

module.exports = router
