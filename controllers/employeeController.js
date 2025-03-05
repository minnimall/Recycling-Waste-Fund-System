const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
const multer = require('multer');
const myMedia = require('../models/media');
const MyAdmin = require('../models/admin');
const myWaste= require('../models/waste');
const myWasteType = require('../models/wastetype');
const WastePurchase = require('../models/wastePurchase');
const WasteItem = require('../models/wasteItem');
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
const wastePurchaseTotalIndex = async (req, res) => {
    try {
        const searchDate = req.query.searchDate;
        const accountId = req.query.accountId;
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;
        const search = req.query.search; // รับค่า search จาก query parameters
        let query = {};
        if (searchDate) {
            const startDate = new Date(searchDate);
            startDate.setHours(0, 0, 0, 0);
            const endDate = new Date(searchDate);
            endDate.setHours(23, 59, 59, 999);
            query.purchaseDate = {
                $gte: startDate,
                $lte: endDate
            };
        }
        if (accountId) {
            query.accountId = accountId;
        }
        const wastePurchases = await WastePurchase.find(query)
            .populate('wasteItems')
            .populate('accountId')
            .skip(skip)
            .limit(limit);
        const totalCount = await WastePurchase.countDocuments(query);
        const totalPages = Math.ceil(totalCount / limit);
        const purchaseCount = await WastePurchase.countDocuments(query);
        const customerCount = new Set(wastePurchases.map(purchase => purchase.accountId._id)).size;
        const totalAmount = wastePurchases.reduce((sum, purchase) => sum + purchase.totalAmount, 0);
        res.render('employee/wastePurchaseTotal', {
            wastePurchases,
            mytitle: 'Employeedashboard | wastePurchaseTotal',
            purchaseCount,
            customerCount,
            totalAmount,
            searchDate: searchDate,
            accountId: accountId,
            currentPage: page,
            totalPages: totalPages,
            search: search // ส่งค่า search ไปยัง view
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('เกิดข้อผิดพลาดในการดึงข้อมูล');
    }
};

const wastePurchasePost = async (req, res) => {
    try {
        const { accountId, wasteItems } = req.body;
        const parsedWasteItems = JSON.parse(wasteItems);
        let totalAmount = 0;
        const wasteItemIds = [];

        for (const item of parsedWasteItems) {
            const newWasteItem = new WasteItem({
                name: item.name,
                quantity: item.weight,
                pricePerUnit: item.pricePerUnit,
            });
            await newWasteItem.save();
            wasteItemIds.push(newWasteItem._id);
            let price = parseFloat(item.totalPrice);
            if (!isNaN(price)) { //ตรวจสอบว่าเป็นตัวเลขหรือไม่
                totalAmount += price;
            } else {
                console.error("Invalid totalPrice:", item.totalPrice);
            }
        }

        const newWastePurchase = new WastePurchase({
            accountId,
            totalAmount,
            wasteItems: wasteItemIds,
        });
        await newWastePurchase.save();

        res.redirect('/employee/wastePurchase?message=บันทึกการรับซื้อสำเร็จ');
    } catch (error) {
        console.error(error);
        res.redirect('/employee/wastePurchase?error=เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    }
}
//หน้าสมาชิกกองทุนขยะรีไซเคิล
const memberIndex = (req, res)=> {
    res.render('employee/member', { mytitle: 'Employeedashboard | Member'})
}

module.exports = {
    //แดชบอร์ด
    dashboardIndex,
    //รับซื้อขยะรีไซเคิล
    wastePurchaseIndex,    
    wastePurchaseIndex,
    wastePurchaseTotalIndex,
    wastePurchasePost,
    //หน้าสมาชิกกองทุนขยะรีไซเคิล
    memberIndex,
}