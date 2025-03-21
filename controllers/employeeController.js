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
const wasteSaleRequest = require('../models/wasteSaleRequest');
const Family = require('../models/family');
const Member = require('../models/member');
const WasteBankAccount = require('../models/wasteBankAccount');
const path = require('path');
const bcrypt = require('bcryptjs');
const moment = require('moment');
const mongoose = require('mongoose');

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
const memberIndex = async (req, res) => {
    try {
        // ดึงข้อมูล village จากฐานข้อมูล
        const villages = await Village.find(); // ตรวจสอบให้แน่ใจว่าโมเดล Village ถูก import แล้ว
        
        res.render('employee/member', { 
            mytitle: 'Employeedashboard | Member',
            villages: villages // ส่ง village ไปยัง view
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
};

// สร้างเลขบัญชีแบบสุ่ม
// const generateAccountNumber = () => {
//     const prefix = 'WB';
//     const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
//     return `${prefix}${random}`;
// };

// ฟังก์ชันลงทะเบียนครัวเรือนและสมาชิกใหม่
const memberRegister = async (req, res) => {
    const session = await mongoose.startSession();  
    session.startTransaction();  

    try {
        // ตรวจสอบว่า village ที่ระบุมีอยู่จริงหรือไม่
        const village = await Village.findById(req.body.village).session(session);
        if (!village) {
            await session.abortTransaction();
            session.endSession();
            return res.redirect('/employee/member?error=ไม่พบหมู่บ้านที่ระบุ');
        }

        // ตรวจสอบ username
        const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
        if (!usernameRegex.test(req.body.username)) {
            await session.abortTransaction();
            session.endSession();
            return res.redirect('/employee/member?error=ชื่อผู้ใช้ต้องมี 3-20 ตัวอักษรและไม่มีอักขระพิเศษ');
        }

        // ตรวจสอบว่าชื่อผู้ใช้ซ้ำหรือไม่
        const existingUser = await Family.findOne({ username: req.body.username }).session(session);
        if (existingUser) {
            await session.abortTransaction();
            session.endSession();
            return res.redirect('/employee/member?error=ชื่อผู้ใช้นี้ถูกใช้ไปแล้ว');
        }

        // ตรวจสอบอีเมลหรือเบอร์โทรซ้ำ
        const existingMember = await Member.findOne({
            $or: [{ email: req.body.email }, { phone: req.body.phone }, { idCardNumber: req.body.idCardNumber }]
        }).session(session);
        if (existingMember) {
            await session.abortTransaction();
            session.endSession();
            return res.redirect('/employee/member?error=อีเมลหรือหมายเลขโทรศัพท์นี้ถูกใช้ไปแล้ว');
        }

        // นับจำนวนครอบครัวที่มีอยู่แล้ว
        const familyCount = await Family.countDocuments().session(session);
        
        // แปลง village._id หรือ village หมายเลขเป็นเลข 2 หลัก
        const villageNumber = String(village.villageNumber).padStart(2, '0');

        // สร้าง accountNumber ตามรูปแบบ 0001/01
        const accountNumber = `${String(familyCount + 1).padStart(4, '0')}/${villageNumber}`;

        // 1. สร้างข้อมูลครอบครัว
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        const family = new Family({
            familyName: req.body.familyName,
            username: req.body.username,
            password: hashedPassword,
            address: {
                houseNumber: req.body.houseNumber,
                moo: req.body.moo,
                road: req.body.road,
                subdistrict: req.body.subdistrict,
                district: req.body.district,
                province: req.body.province,
                postalCode: req.body.postalCode
            },
            NumFamilyMembers: req.body.NumFamilyMembers,
            village: village._id, 
            Type: req.body.Type || 'household'
        });

        const savedFamily = await family.save({ session });

        // 2. สร้างสมาชิกคนแรก (ตัวแทนครอบครัว)
        const member = new Member({
            familyID: savedFamily._id,
            name: req.body.name,
            email: req.body.email,
            phone: req.body.phone,
            idCardNumber: req.body.idCardNumber,
            birthDate: req.body.birthDate,
            occupation: req.body.occupation,
            age: req.body.age,
            nationality: req.body.nationality,
            ethnicity: req.body.ethnicity,
            religion: req.body.religion,
            beneficiaries: req.body.beneficiaries || [],
            Status: 'living'
        });

        await member.save({ session });

        // 3. สร้างบัญชีธนาคารขยะอัตโนมัติ
        const account = new WasteBankAccount({
            familyID: savedFamily._id,
            AccountName: savedFamily.familyName,
            AccountNumber: accountNumber,
            Balance: 0,
            OpenDate: new Date()
        });

        await account.save({ session });

        // ✅ Transaction สำเร็จ
        await session.commitTransaction();
        session.endSession();

        res.redirect('/employee/member?message=ลงทะเบียนครัวเรือนสำเร็จ');

    } catch (error) {
        await session.abortTransaction();  
        session.endSession();

        console.error('Error registering household:', error);
        res.redirect('/employee/member?error=เกิดข้อผิดพลาดในการลงทะเบียน: ' + error.message);
    }
};

//หน้าตรวจสอบความประสงค์ขายขยะ
const wasteSaleRequestIndex = async (req, res) => {
    try {
        const wasteSaleRequests = await wasteSaleRequest
            .find()
            .populate('waste') // ดึงข้อมูลขยะจาก ObjectId
            .sort({ date: -1 });

        console.log(wasteSaleRequests); // Debug เช็คข้อมูล

        res.render('employee/wasteSaleRequest', {
            mytitle: 'รายการความประสงค์ขายขยะ',
            wasteSaleRequests // ส่งข้อมูลไปยัง View
        });
    } catch (error) {
        console.error('Error fetching waste sale requests:', error);
        res.render('employee/wasteSaleRequest', {
            mytitle: 'รายการความประสงค์ขายขยะ',
            wasteSaleRequests: [],
            error: 'ไม่สามารถโหลดข้อมูลได้'
        });
    }
};

module.exports = {
    //หน้าแดชบอร์ด
    dashboardIndex,
    //หน้ารับซื้อขยะรีไซเคิล
    wastePurchaseIndex,wastePurchasePost,wastePurchaseDelete,
    //หน้าสรุปการรับซื้อขยะ
    wastePurchaseTotalIndex,wastePurchaseDelete,
    //หน้าสมาชิกกองทุนขยะรีไซเคิล
    memberIndex,memberRegister,
    //หน้าตรวจสอบความประสงค์ขายขยะ
    wasteSaleRequestIndex,
}