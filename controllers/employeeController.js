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
const wastePurchaseIndex = (req, res)=> {
    res.render('employee/wastePurchase', { mytitle: 'Employeedashboard | WastePurchase'})
}

module.exports = {
    //แดชบอร์ด
    dashboardIndex,

    //รับซื้อขยะรีไซเคิล
    wastePurchaseIndex,
}