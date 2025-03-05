const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
const multer = require('multer');
const myMedia = require('../models/media');
const MyAdmin = require('../models/admin');
const myWaste= require('../models/waste');
const myWasteType = require('../models/wastetype');
const myNews = require('../models/news');
const myActivity = require('../models/activity');
const Village = require('../models/village')
const Round = require('../models/round');
const path = require('path');
const bcrypt = require('bcryptjs');
const moment = require('moment');

router.use(express.static(path.join(__dirname, '../public')));

router.use(bodyParser.json({ limit: '10mb' }));  // เพิ่มขนาด payload สูงสุด 10MB
router.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

//หน้าแดชบอร์ด
const dashboardIndex = (req, res)=> {
    res.render('employee/dashboard', { mytitle: 'Employeedashboard | Dashboard'})
}

//หน้ารับซื้อขยะรีไซเคิล
const wastePurchaseIndex = (req, res) => {
    const searchQuery = req.query.search || ''; // รับค่าค้นหา
    const selectedWasteType = req.query.wasteType || ''; // รับค่าประเภทขยะ

    let filter = {};

    // ถ้ามีค่าค้นหา ให้ใช้ regex ค้นหาขยะ
    if (searchQuery) {
        filter.wasteName = { $regex: searchQuery, $options: 'i' };
    }

    // ถ้ามีประเภทขยะที่เลือก ให้เพิ่ม filter ตาม wasteType
    if (selectedWasteType) {
        filter.wasteType = selectedWasteType;
    }

    Promise.all([
        myWaste.find(filter).populate('wasteType', 'wasteTypeName'),
        myWasteType.find()
    ])
    .then(([wasteData, wasteTypeData]) => {
        res.render('employee/wastePurchase', {
            mytitle: 'Employeedashboard | WastePurchase',
            waste: wasteData,
            wasteTypes: wasteTypeData,
            searchQuery: searchQuery,
            selectedWasteType: selectedWasteType
        });
    })
    .catch((err) => {
        console.log(err);
    });
};


//หน้าสมาชิกกองทุนขยะรีไซเคิล
const memberIndex = (req, res)=> {
    res.render('employee/member', { mytitle: 'Employeedashboard | Member'})
}

module.exports = {
    //แดชบอร์ด
    dashboardIndex,
    //รับซื้อขยะรีไซเคิล
    wastePurchaseIndex,
    //หน้าสมาชิกกองทุนขยะรีไซเคิล
    memberIndex,
}