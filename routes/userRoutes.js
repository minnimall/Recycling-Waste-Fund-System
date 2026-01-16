//แบบใช้คู่กับ controller
const express = require('express')
const userController = require('../controllers/userController')
const router = express.Router()

const isAuthenticated = (req, res, next) => {
  if (req.user) {
    return next();
  }
  return res.status(401).json({ success: false, message: 'Unauthorized' });
};

// หน้าหลัก
router.get('/', userController.user_index)

// หน้าประเภทขยะ
router.get('/wastetype', userController.user_wastetype)

// หน้าสื่อความรู้
router.get('/knowledge', userController.user_knowledge)

// หน้าประวัติการขายขยะชองครัวเรือน
router.get('/saleHistory', userController.user_saleHistory)

// หน้าแจ้งความประสงค์ขายขยะเบื้องต้น
router.get('/wasteSaleRequest', userController.user_wasteSaleRequest)
router.post('/wasteSaleRequestPost', userController.wasteSaleRequestPost)
router.get('/wasteSaleRequestUserSubmit/:id', userController.wasteSaleRequestUserSubmit)
router.post('/wasteSaleRequestUserReject/:stage/:id', userController.wasteSaleRequestUserReject)

// หน้าข้อมูลติดต่อของอบต.
router.get('/contact', userController.user_contact)

// หน้ากิจกรรม
router.get('/allActivity', userController.user_allActivity)
router.get('/detailActivity/:id', userController.user_detailActivity)

// หน้าคำร้อง
router.get('/complaint', userController.user_complaint)
router.post('/complaintPost', userController.complaintPost)

// หน้ารายละเอียดข่าวประชาสัมพันธ์
router.get('/detailNews/:id', userController.detailNews)

// หน้าโปรไฟล์
router.get('/profile', userController.user_profile)

// หน้าฟอร์ม
router.get('/funeral/my-eligibility', userController.checkMyEligibility);
router.post('/funeral/request/submit', userController.submitFuneralRequest);
router.get('/funeral', userController.funeralRequest);
// หน้าประวัติ
router.get('/funeral/my-requests', userController.myFuneralRequestsPage);
router.get('/api/funeral/my-requests', userController.getMyFuneralRequests);
router.get('/api/funeral/my-requests/:id', userController.getMyFuneralRequestDetail);
router.post('/api/funeral/my-requests/:id/cancel', userController.cancelMyFuneralRequest);

router.get('/wastePrices', userController.user_wastePrices)

router.get('/ideas', userController.user_ideas)
router.post('/ideas/create', userController.create_idea);
router.post('/ideas/:id/like',  isAuthenticated, userController.like_idea);
router.post('/ideas/:id/comment', userController.comment_idea);
router.delete('/ideas/delete/:id', userController.delete_ideas);
router.post('/ideas/edit/:id', userController.edit_idea);

router.get('/notification', userController.notification)
router.post('/notificationPost', userController.notificationPost);
router.post('/notification/:id/read', userController.markNotificationAsRead);

module.exports = router