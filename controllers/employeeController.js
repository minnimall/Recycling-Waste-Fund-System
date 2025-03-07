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
    const searchQuery = req.query.search || '';
    const selectedWasteType = req.query.wasteType || '';

    let filter = { isDeleted: false };

    if (searchQuery) {
        filter.wasteName = { $regex: searchQuery, $options: 'i' };
    }

    if (selectedWasteType) {
        filter.wasteType = selectedWasteType;
    }

    Promise.all([
        myWaste.find(filter).populate('wasteType', 'wasteTypeName'),
        myWasteType.find({ isDeleted: false })
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
        res.status(500).send('เกิดข้อผิดพลาดในระบบ');
    });
};
const wastePurchaseTotalIndex = async (req, res) => {
    try {
        const searchDate = req.query.searchDate;
        const accountId = req.query.accountId;
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;
        const search = req.query.search;
        let query = {};
        let monthlyQuery = {}; // เพิ่ม query สำหรับกรองตามเดือน

        if (searchDate) {
            const startDate = new Date(searchDate);
            startDate.setHours(0, 0, 0, 0);
            const endDate = new Date(searchDate);
            endDate.setHours(23, 59, 59, 999);
            query.purchaseDate = {
                $gte: startDate,
                $lte: endDate
            };

            // กรองตามเดือน
            const year = startDate.getFullYear();
            const month = startDate.getMonth();
            const firstDayOfMonth = new Date(year, month, 1);
            const lastDayOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);

            monthlyQuery.purchaseDate = {
                $gte: firstDayOfMonth,
                $lte: lastDayOfMonth
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

        // คำนวณ totalAmount จากข้อมูลที่กรองตามเดือน
        const monthlyWastePurchases = await WastePurchase.find(monthlyQuery);
        const totalAmount = monthlyWastePurchases.reduce((sum, purchase) => sum + purchase.totalAmount, 0);

        const startIndex = (page - 1) * limit;

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
            wastePurchases: wastePurchases,
            startIndex: startIndex,
            search: search
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
        if (parsedWasteItems && Array.isArray(parsedWasteItems)) {
            for (const item of parsedWasteItems) {
                if (item && item.name) {
                    const newWasteItem = new WasteItem({
                        name: item.name,
                        quantity: item.weight,
                        pricePerUnit: item.pricePerUnit,
                    });
                    await newWasteItem.save();
                    wasteItemIds.push(newWasteItem._id);
                    let price = parseFloat(item.totalPrice);
                    if (!isNaN(price)) {
                        totalAmount += price;
                    } else {
                        console.error("Invalid totalPrice:", item.totalPrice);
                    }
                } else {
                    console.error("Invalid waste item found:", item);
                    console.log("Entire parsedWasteItems array: ", parsedWasteItems);
                    continue;
                }
            }
        } else {
            console.error("Invalid wasteItems data:", parsedWasteItems);
            res.redirect('/employee/wastePurchase?error=Invalid waste items data');
            return;
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
};
// ลบรายการรับซื้อ (softDelete)

const wastePurchaseDelete = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedPurchase = await WastePurchase.findByIdAndDelete(id);

        if (!deletedPurchase) {
            return res.redirect('/employee/wastePurchaseTotal?error=ไม่พบข้อมูลที่ต้องการลบ');
        }

        res.redirect('/employee/wastePurchaseTotal?message=ลบรายการรับซื้อขยะสำเร็จ');
    } catch (error) {
        console.error(error);
        res.redirect('/employee/wastePurchaseTotal?error=เกิดข้อผิดพลาดในการลบข้อมูล');
    }
};
//หน้าสมาชิกกองทุนขยะรีไซเคิล
const memberIndex = (req, res)=> {
    res.render('employee/member', { mytitle: 'Employeedashboard | Member'})
}

module.exports = {
    //หน้าแดชบอร์ด
    dashboardIndex,
    //หน้ารับซื้อขยะรีไซเคิล
    wastePurchaseIndex,wastePurchasePost,wastePurchaseDelete,
    //หน้าสรุปการรับซื้อขยะ
    wastePurchaseTotalIndex,wastePurchaseDelete,
    //หน้าสมาชิกกองทุนขยะรีไซเคิล
    memberIndex,
}