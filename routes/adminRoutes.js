//แบบใช้คู่กับ controller
const express = require('express')
const adminController = require('../controllers/adminController')
const router = express.Router()

// แดชบอร์ด
router.get('/', adminController.dashboardIndex);

// สื่อ
router.get('/media', adminController.mediaIndex);
router.post('/mediaPost', adminController.mediaPost);
router.post('/mediaEdit/:id', adminController.mediaEdit);
router.delete('/mediaDelete/:id', adminController.mediaDelete);

// ข่าวสาร
router.get('/news', adminController.newsIndex);
router.post('/newsPost', adminController.newsPost);
router.post('/newsPostEdit/:id', adminController.newsEdit);
router.delete('/deleteNews/:id', adminController.deleteNews);

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
router.post('/wasteBulkPriceUpdate', adminController.wasteBulkPriceUpdate);

// ประเภทขยะ
router.get('/wasteType', adminController.wasteTypeIndex);
router.post('/wasteTypePost', adminController.wasteTypePost);
router.post('/wasteTypeEdit', adminController.wasteTypeEdit);
router.delete('/deletewasteType/:id', adminController.wasteTypeDelete);

// สต๊อกขยะ
router.get('/wasteStock', adminController.wasteStockIndex);

// พนักงาน
router.get('/employee', adminController.employeeIndex);
router.post('/employeeRegister', adminController.employeeRegister);
router.delete('/employeeDelete/:id', adminController.employeeDelete);
router.post('/employeeEdit', adminController.editEmployee);

// สมาชิกกองทุนขยะรีไซเคิล
router.get('/member', adminController.memberIndex);
router.post('/memberRegister', adminController.memberRegister);
router.get('/member/:familyId/edit', adminController.getMemberForEdit);
router.post('/memberUpdate/:familyId', adminController.memberUpdate);
router.delete('/memberDelete/:familyId', adminController.memberDelete);
router.get('/member/:familyId/representatives', adminController.getRepresentatives); 
router.post('/member/:familyId/change-representative', adminController.changeRepresentative); 

//คณะกรรมการ
router.get('/board', adminController.boardIndex);
router.post('/boardPost', adminController.boardPost);
router.post('/boardEdit', adminController.boardEdit);
router.delete('/boardDelete/:id', adminController.boardDelete);

// หมู่บ้าน
router.get('/village', adminController.villageIndex);
router.post('/villagePost', adminController.villagePost);
router.post('/villageEdit', adminController.villageEdit);
router.delete('/villageDelete/:id', adminController.villageDelete);

// รอบการรับซื้อ
router.get('/round', adminController.roundIndex);
router.post('/roundPost', adminController.roundPost);
router.post('/roundEdit', adminController.roundEdit);
router.delete('/roundDelete/:id', adminController.roundDelete);

// จัดการจุดรับซื้อ
router.get('/wastePoint', adminController.wastePointIndex);
router.get('/wastePoint/create', adminController.wastePointCreate);
router.get('/wastePoint/edit/:id', adminController.wastePointEdit);
router.post('/wastePointUpdate/:id', adminController.wastePointUpdate);
router.get('/wastePoint/toggle/:id', adminController.wastePointToggle);
router.post('/wastePointPost', adminController.wastePointPost);
router.get('/wastePoint/delete/:id', adminController.wastePointDelete);

// ฌาปนกิจสงเคราะห์
router.get('/funeralAid', adminController.funeralAidIndex);
router.get('/funeral-assistance/search', adminController.searchHouseholds);
router.get('/funeral-assistance/members/:familyID', adminController.getFamilyMembers);
router.get('/funeral-assistance/eligibility/:familyID', adminController.checkEligibility);
router.post('/funeral-assistance/calculate', adminController.calculateFuneralAmount);
router.post('/funeral-assistance/preview', adminController.getDeductionPreview);
router.post('/funeral-assistance/submit', adminController.submitFuneralAssistance);

// ประวัติฌาปนกิจสงเคราะห์
router.get('/funeralAidHistory', adminController.getFuneralHistoryPage);
router.get('/funeral-assistance/history', adminController.getFuneralHistory);
router.get('/funeral-assistance/detail/:id', adminController.getFuneralDetail);
router.put('/funeral-assistance/update/:id', adminController.updateFuneralAssistance);

// การจัดการคำขอฌาปนกิจจาก User
router.get('/funeralRequest', adminController.pendingFuneralRequestsPage);
router.get('/funeral-requests/pending/data', adminController.getPendingFuneralRequests);
router.get('/funeral-requests/:id/detail', adminController.getRequestDetail);
router.post('/funeral-requests/:id/approve', adminController.approveRequest);
router.post('/funeral-requests/:id/reject', adminController.rejectRequest);

module.exports = router
