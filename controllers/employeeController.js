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
const Complaint = require('../models/complaint');
const Transaction = require('../models/transactionMoney');
const path = require('path');
const bcrypt = require('bcryptjs');
const moment = require('moment');
const mongoose = require('mongoose');
const myAdmin = require('../models/admin');

router.use(express.static(path.join(__dirname, '../public')));

router.use(bodyParser.json({ limit: '10mb' }));
router.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

// หน้าแดชบอร์ด
const dashboardIndex = (req, res)=> {
    res.render('employee/dashboard', { mytitle: 'Employeedashboard | Dashboard'})
}

// หน้ารับซื้อขยะรีไซเคิล
const wastePurchaseIndex = async (req, res) => { // Make the function async
    const searchQuery = req.query.search || '';
    const selectedWasteType = req.query.wasteType || '';
    let filter = { isDeleted: false };

    if (searchQuery) {
        filter.wasteName = { $regex: searchQuery, $options: 'i' };
    }

    if (selectedWasteType) {
        filter.wasteType = selectedWasteType;
    }

    try {
        const [wasteData, wasteTypeData, allWasteBankAccount] = await Promise.all([
            myWaste.find(filter).populate('wasteType', 'wasteTypeName'),
            myWasteType.find({ isDeleted: false }),
            WasteBankAccount.find({ isDeleted: false }) // Fetch WasteBankAccount data
        ]);

        res.render('employee/wastePurchase', {
            mytitle: 'Employeedashboard | WastePurchase',
            waste: wasteData,
            wasteTypes: wasteTypeData,
            searchQuery: searchQuery,
            selectedWasteType: selectedWasteType,
            allWasteBankAccount: allWasteBankAccount
        });

    } catch (err) {
        console.log(err);
        res.status(500).send('เกิดข้อผิดพลาดในระบบ');
    }
};

// ฟังก์ชันบันทึกรับซื้อขยะ
const wastePurchasePost = async (req, res) => {
    try {
        const { accountId, wasteItems } = req.body;
        const parsedWasteItems = JSON.parse(wasteItems);
        let totalAmount = 0;
        const wasteItemIds = [];

        // Check if wasteItems is valid
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

        // Create new waste purchase record
        const newWastePurchase = new WastePurchase({
            accountId,
            totalAmount,
            wasteItems: wasteItemIds,
            addBy: req.body.addBy
        });
        await newWastePurchase.save();

        // Update the WasteBankAccount balance
        if (accountId) {
            // Get the WasteBankAccount
            const wasteBankAccount = await WasteBankAccount.findById(accountId);
            
            if (wasteBankAccount) {
                // Update the balance
                wasteBankAccount.Balance += totalAmount;
                await wasteBankAccount.save();
                console.log(`Updated balance for account ${wasteBankAccount.AccountNumber} to ${wasteBankAccount.Balance}`);
            } else {
                console.error(`Bank account with ID ${accountId} not found`);
            }
        } else {
            console.error("No accountId provided for balance update");
        }

        res.redirect('/employee/wastePurchase?message=บันทึกการรับซื้อสำเร็จ');
    } catch (error) {
        console.error("Error in wastePurchasePost:", error);
        res.redirect('/employee/wastePurchase?error=เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    }
};


// หน้าสรุปการรับซื้อขยะ
const wastePurchaseTotalIndex = async (req, res) => {
    try {
        const searchDate = req.query.searchDate;
        const accountIdParam = req.query.accountId;
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;
        const search = req.query.search;
        let query = { isDeleted: false };
        let monthlyQuery = { isDeleted: false };
        if (searchDate) {
            const startDate = new Date(searchDate);
            startDate.setHours(0, 0, 0, 0);
            const endDate = new Date(searchDate);
            endDate.setHours(23, 59, 59, 999);
            query.purchaseDate = {
                $gte: startDate,
                $lte: endDate
            };
            const year = startDate.getFullYear();
            const month = startDate.getMonth();
            const firstDayOfMonth = new Date(year, month, 1);
            const lastDayOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);
            monthlyQuery.purchaseDate = {
                $gte: firstDayOfMonth,
                $lte: lastDayOfMonth
            };
        }
        if (accountIdParam) {
            const foundAccount = await WasteBankAccount.findOne({ 
                AccountNumber: accountIdParam, 
                isDeleted: false 
            }).select('_id');

            if (foundAccount) {
                query.accountId = foundAccount._id;
            } else {
                query.accountId = null;
            }
        }
        // คล้ายกับโค้ด memberIndex
        if (search) {
            const searchRegex = new RegExp(search, 'i');
            const accountSearchQuery = {
                $or: [
                    { AccountNumber: searchRegex },
                    { AccountName: searchRegex }
                ]
            };
            const accountsMatching = await WasteBankAccount.find(accountSearchQuery).select('_id');
            if (accountsMatching.length > 0) {
                query.accountId = { $in: accountsMatching.map(acc => acc._id) };
            } else {
                query.accountId = null;
            }
        }
        const wastePurchases = await WastePurchase.find(query)
            .populate('wasteItems')
            .populate('accountId')
            .populate('addBy') // This line is key
            .skip(skip)
            .limit(limit);
        const totalCount = await WastePurchase.countDocuments(query);
        const totalPages = Math.ceil(totalCount / limit);
        const purchaseCount = await WastePurchase.countDocuments(query);
        const customerCount = new Set(wastePurchases.map(purchase => purchase.accountId && purchase.accountId.length > 0 ? purchase.accountId[0]._id : null)).size;

        // คำนวณ totalAmount จากข้อมูลที่กรองตามเดือน
        const monthlyWastePurchases = await WastePurchase.find(monthlyQuery);
        const totalAmount = monthlyWastePurchases.reduce((sum, purchase) => sum + (purchase.totalAmount || 0), 0);
        const startIndex = (page - 1) * limit;
        res.render('employee/wastePurchaseTotal', {
            wastePurchases,
            mytitle: 'Employeedashboard | wastePurchaseTotal',
            purchaseCount,
            customerCount,
            totalAmount,
            searchDate: searchDate,
            accountId: accountIdParam,
            currentPage: page,
            totalPages: totalPages,
            wastePurchases: wastePurchases,
            startIndex: startIndex,
            search: search,
            query: req.query // ส่ง req.query ไปยัง view เพื่อเก็บค่า search
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('เกิดข้อผิดพลาดในการดึงข้อมูล');
    }
};

// ฟังก์ชันลบรายการรับซื้อหน้าสรุปการรับซื้อ (softDelete)
const wastePurchaseDelete = async (req, res) => {
    try {
        const { id } = req.params;

        // หา WastePurchase จาก id
        const purchase = await WastePurchase.findById(id);

        if (!purchase || purchase.isDeleted) {
            return res.redirect('/employee/wastePurchaseTotal?error=ไม่พบข้อมูลหรือรายการถูกลบไปแล้ว');
        }

        const { totalAmount, accountId, wasteItems } = purchase;

        // ดึง accountId แรก (กรณีเป็น array)
        const accId = Array.isArray(accountId) ? accountId[0] : accountId;

        // หักยอดเงินออกจากบัญชี
        await WasteBankAccount.findByIdAndUpdate(accId, {
            $inc: { Balance: -totalAmount }
        });

        // ตั้ง isDeleted = true
        purchase.isDeleted = true;
        await purchase.save();

        // (Optional) ลบ WasteItems ที่เกี่ยวข้องถ้าต้องการ
        // await WasteItem.deleteMany({ _id: { $in: wasteItems } });

        res.redirect('/employee/wastePurchaseTotal?message=ลบรายการรับซื้อขยะสำเร็จ');
    } catch (error) {
        console.error(error);
        res.redirect('/employee/wastePurchaseTotal?error=เกิดข้อผิดพลาดในการลบข้อมูล');
    }
};

// หน้าสมาชิกกองทุนขยะรีไซเคิล
const memberIndex = async (req, res) => {
    try {
        const { familyName, AccountName, village, Type } = req.query;
        let searchQuery = { isDeleted: false };

        if (familyName) searchQuery.familyName = { $regex: familyName, $options: 'i' };
        if (AccountName) searchQuery.AccountName = { $regex: AccountName, $options: 'i' };
        if (village) searchQuery.village = village; // ใช้ _id ของหมู่บ้านโดยตรง
        if (Type) searchQuery.Type = Type;

        const villages = await Village.find(); // ดึงรายชื่อหมู่บ้านทั้งหมด
        const allFamilies = await Family.find(searchQuery).populate('village');
        const Account = await WasteBankAccount.find(searchQuery);

        res.render('employee/member', { 
            mytitle: 'Employeedashboard | Member',
            villages, // ส่งรายชื่อหมู่บ้านไปยัง EJS
            allFamilies,
            Account,
            query: req.query  
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

        // แปลง village number เป็นเลข 2 หลัก
        const villageNumber = String(village.villageNumber).padStart(2, '0');
        
        // สร้างปีพ.ศ. 2 ตัวท้าย (เช่น 68 จาก 2568)
        const currentYear = new Date().getFullYear() + 543; // แปลงเป็นพ.ศ. (จาก ค.ศ.)
        const yearSuffix = String(currentYear).slice(-2); // เอาเฉพาะ 2 ตัวท้าย
        
        // หาลำดับล่าสุดของหมู่บ้านนั้นๆ
        const latestAccount = await WasteBankAccount.find({
            AccountNumber: new RegExp(`^${yearSuffix}${villageNumber}`)
        })
        .sort({ AccountNumber: -1 })
        .limit(1)
        .session(session);
        
        let sequenceNumber = 1; // เริ่มที่ 1 ถ้าไม่มีบัญชีก่อนหน้า
        
        if (latestAccount && latestAccount.length > 0) {
            // ถ้ามีบัญชีก่อนหน้า ดึงเลขลำดับล่าสุดและบวก 1
            const latestSequence = parseInt(latestAccount[0].AccountNumber.slice(-2));
            sequenceNumber = latestSequence + 1;
        }
        
        // สร้าง accountNumber ในรูปแบบ YYMMSS (ปี-หมู่-ลำดับ)
        const accountNumber = `${yearSuffix}${villageNumber}${String(sequenceNumber).padStart(2, '0')}`;

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

//หน้าคำร้องหรือหรือข้อร้องเรียน
const complaintIndex = async (req, res) => {
    try {
        const complaint = await Complaint
            .find()
            .populate('family')
            .sort({ date: -1 });

        res.render('employee/complaint', {
            mytitle: 'รายการคำร้องหรือหรือข้อร้องเรียน',
            complaint
        });
    } catch (error) {
        console.error('Error fetching complaint requests:', error);
        res.render('employee/complaint', {
            mytitle: 'รายการคำร้องหรือหรือข้อร้องเรียน',
            wasteSaleRequests: [],
            error: 'ไม่สามารถโหลดข้อมูลได้'
        });
    }
};

//หน้าตรวจสอบความประสงค์ขายขยะ
const wasteSaleRequestIndex = async (req, res) => {
    try {
        const wasteSaleRequests = await wasteSaleRequest
            .find()
            .populate('waste') // ดึงข้อมูลขยะจาก ObjectId
            .populate('family')
            .sort({ date: -1 });

        res.render('employee/wasteSaleRequest', {
            mytitle: 'รายการความประสงค์ขายขยะ',
            wasteSaleRequests
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

//หน้าสต๊อกขยะ
const wasteStockIndex = (req, res)=> {
    res.render('employee/wasteStock',{mytitle: 'สต๊อกขยะ'})
}

//หน้าเบิกถอน
// ฟังก์ชันถอนเงิน
const withDrawIndex = async (req, res) => {
    try {
        const { accountId, withdrawAmount } = req.body;

        if (!accountId || !withdrawAmount) {
            return res.redirect('/employee/withdraw?error=กรุณากรอกข้อมูลให้ครบถ้วน');
        }

        const account = await WasteBankAccount.findOne({ AccountNumber: accountId, isDeleted: false });

        if (!account) {
            return res.redirect('/employee/withdraw?error=ไม่พบบัญชีที่ระบุ');
        }

        const amount = parseFloat(withdrawAmount);
        if (amount <= 0 || isNaN(amount)) {
            return res.redirect('/employee/withdraw?error=จำนวนเงินไม่ถูกต้อง');
        }

        if (account.Balance < amount) {
            return res.redirect('/employee/withdraw?error=ยอดเงินในบัญชีไม่เพียงพอ');
        }

        const family = await Family.findById(account.familyID);
        if (!family) {
            return res.redirect('/employee/withdraw?error=ไม่พบข้อมูลครอบครัว');
        }

        account.Balance -= amount;
        await account.save();

        await Transaction.create({
            account: account._id,
            family: family._id,
            transactionType: 'withdraw',
            amount: amount,
            status: 'สำเร็จ',
            note: 'ถอนเงินโดยเจ้าหน้าที่'
        });

        return res.redirect('/employee/withdraw?message=ถอนเงินสำเร็จแล้ว');
    } catch (error) {
        console.error('เกิดข้อผิดพลาด:', error);
        return res.redirect('/employee/withdraw?error=เกิดข้อผิดพลาดในการถอนเงิน');
    }
};

// แสดงหน้าถอนเงิน พร้อมประวัติการถอน
const showWithdrawPage = async (req, res) => {
    try {
        const transactions = await Transaction.find({ transactionType: 'withdraw', isDeleted: false })
            .sort({ transactionDate: -1 })
            .limit(10)
            .populate('account')
            .populate('family');

        res.render('employee/withdraw', {
            mytitle: 'เบิกถอนเงิน',
            transactions,
            message: req.query.message || null,
            error: req.query.error || null
        });
    } catch (err) {
        console.error(err);
        res.render('employee/withdraw', {
            mytitle: 'เบิกถอนเงิน',
            transactions: [],
            error: 'เกิดข้อผิดพลาดในการโหลดข้อมูล',
            message: null
        });
    }
};

const getAccountByNumber = async (req, res) => {
    try {
        const { accountNumber } = req.params;

        const account = await WasteBankAccount.findOne({ AccountNumber: accountNumber, isDeleted: false })
            .populate('familyID');

        if (!account) {
            return res.status(404).json({ error: 'ไม่พบบัญชี' });
        }

        res.json({
            accountName: account.AccountName,
            accountNumber: account.AccountNumber,
            balance: account.Balance,
            familyName: account.familyID.familyName
        });
    } catch (err) {
        console.error('เกิดข้อผิดพลาดใน getAccountByNumber:', err);
        res.status(500).json({ error: 'เกิดข้อผิดพลาดในเซิร์ฟเวอร์' });
    }
};


//หน้าฌาปนกิจสงเคราะห์
const funeralAidIndex = (req, res)=> {
    res.render('employee/funeralAid',{mytitle: 'ฌาปนกิจสงเคราะห์'})
}

module.exports = {
    //หน้าแดชบอร์ด
    dashboardIndex,
    //หน้ารับซื้อขยะรีไซเคิล
    wastePurchaseIndex,wastePurchasePost,wastePurchaseDelete,
    //หน้าสรุปการรับซื้อขยะ
    wastePurchaseTotalIndex,wastePurchaseDelete,
    //หน้าสมาชิกกองทุนขยะรีไซเคิล
    memberIndex,memberRegister,
    //หน้าคำร้องหรือหรือข้อร้องเรียน
    complaintIndex,
    //หน้าตรวจสอบความประสงค์ขายขยะ
    wasteSaleRequestIndex,
    //หน้าสต๊อกขยะ
    wasteStockIndex,
    //หน้าเบิกถอน
    withDrawIndex,getAccountByNumber,showWithdrawPage,
    //หน้าฌาปนกิจสงเคราะห์
    funeralAidIndex,
}