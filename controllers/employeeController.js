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
const WastePriceHistory = require('../models/wastePriceHistory');
const WastePoint = require("../models/wastePoint");
const path = require('path');
const bcrypt = require('bcryptjs');
const moment = require('moment');
const mongoose = require('mongoose');
const myAdmin = require('../models/admin');

router.use(express.static(path.join(__dirname, '../public')));

router.use(bodyParser.json({ limit: '10mb' }));
router.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

const dashboardIndex = async (req, res) => {
    try {
        console.log('Starting dashboardIndex...');
        console.log('Query parameters:', req.query);
        
        // รับ query parameters สำหรับ filter
        const { 
            village, 
            startDate, 
            endDate, 
            dateRange = 'all',
            selectedDate // เพิ่ม selectedDate parameter
        } = req.query;

        // กำหนดช่วงวันที่ตามการเลือก
        const now = new Date();
        let filterStartDate, filterEndDate;
        
        // ตรวจสอบการเลือกวันที่เฉพาะก่อน
        if (selectedDate) {
            console.log('Using selectedDate:', selectedDate);
            filterStartDate = new Date(selectedDate);
            filterEndDate = new Date(selectedDate);
            filterEndDate.setHours(23, 59, 59, 999);
        } else if (startDate && endDate) {
            // ใช้ช่วงวันที่ที่ผู้ใช้เลือก
            console.log('Using date range:', startDate, 'to', endDate);
            filterStartDate = new Date(startDate);
            filterEndDate = new Date(endDate);
            filterEndDate.setHours(23, 59, 59, 999);
        } else {
            // ใช้ช่วงวันที่ตาม dateRange
            console.log('Using dateRange:', dateRange);
            switch (dateRange) {
                case 'today':
                    filterStartDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    filterEndDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
                    break;
                case 'yesterday':
                    filterStartDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
                    filterEndDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
                    break;
                case 'thisMonth':
                    filterStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
                    filterEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
                    break;
                case 'lastMonth':
                    filterStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                    filterEndDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
                    break;
                default:
                    // จัดการกรณี month-x (เดือนย้อนหลัง)
                    if (dateRange && dateRange.startsWith('month-')) {
                        const monthsBack = parseInt(dateRange.replace('month-', ''));
                        filterStartDate = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1);
                        filterEndDate = new Date(now.getFullYear(), now.getMonth() - monthsBack + 1, 0, 23, 59, 59, 999);
                    } else {
                        // 'all' หรือไม่ระบุ
                        filterStartDate = null;
                        filterEndDate = null;
                    }
                    break;
            }
        }

        console.log('Filter dates:', {
            filterStartDate,
            filterEndDate,
            selectedDate,
            dateRange
        });

        // วันที่สำหรับเปรียบเทียบ (คงเดิม)
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        const yesterdayStart = new Date(todayStart);
        yesterdayStart.setDate(yesterdayStart.getDate() - 1);
        const yesterdayEnd = new Date(todayEnd);
        yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);

        // Pipeline สำหรับข้อมูลทั้งหมด
        const basePipeline = [
            { $match: { isDeleted: false } },
            {
                $lookup: {
                    from: 'wastebankaccounts',
                    localField: 'accountId',
                    foreignField: '_id',
                    as: 'accountInfo'
                }
            },
            {
                $match: { 'accountInfo': { $ne: [] } }
            },
            { $unwind: '$accountInfo' },
            {
                $lookup: {
                    from: 'families',
                    localField: 'accountInfo.familyID',
                    foreignField: '_id',
                    as: 'familyInfo'
                }
            },
            {
                $match: { 'familyInfo': { $ne: [] } }
            },
            { $unwind: '$familyInfo' },
            {
                $lookup: {
                    from: 'wasteitems',
                    localField: 'wasteItems',
                    foreignField: '_id',
                    as: 'wasteItemDetails'
                }
            },
            {
                $match: { 'wasteItemDetails': { $ne: [] } }
            },
            { $unwind: '$wasteItemDetails' }
        ];

        // สร้าง filter pipeline พื้นฐาน
        let filterPipeline = [...basePipeline];
        
        // เพิ่ม filter สำหรับหมู่บ้านถ้ามี
        if (village) {
            filterPipeline.push({
                $lookup: {
                    from: 'villages',
                    localField: 'familyInfo.village',
                    foreignField: '_id',
                    as: 'villageInfo'
                }
            });
            filterPipeline.push({ $unwind: '$villageInfo' });
            filterPipeline.push({
                $match: { 'villageInfo._id': new mongoose.Types.ObjectId(village) }
            });
        }

        // สร้าง match condition สำหรับวันที่
        const createDateMatch = (startDate, endDate) => {
            const match = {};
            if (startDate && endDate) {
                match.purchaseDate = { 
                    $gte: startDate, 
                    $lte: endDate 
                };
            } else if (startDate) {
                match.purchaseDate = { $gte: startDate };
            } else if (endDate) {
                match.purchaseDate = { $lte: endDate };
            }
            return match;
        };

        const dateMatch = createDateMatch(filterStartDate, filterEndDate);
        console.log('Date match condition:', dateMatch);

        // 1. ข้อมูลทั้งหมดตาม filter ที่เลือก
        console.log('Calculating filtered totals...');
        let totalDataPipeline = [...filterPipeline];
        if (Object.keys(dateMatch).length > 0) {
            totalDataPipeline.push({ $match: dateMatch });
        }

        const totalData = await WastePurchase.aggregate([
            ...totalDataPipeline,
            {
                $group: {
                    _id: null,
                    totalAmount: {
                        $sum: {
                            $multiply: ['$wasteItemDetails.quantity', '$wasteItemDetails.pricePerUnit']
                        }
                    },
                    totalQuantity: { $sum: '$wasteItemDetails.quantity' },
                    totalTransactions: { $sum: 1 }
                }
            }
        ]);

        console.log('Total data result:', totalData);

        // 2. ยอดรับซื้อวันนี้ (สำหรับเปรียบเทียบ)
        console.log('Calculating today\'s total...');
        const todayData = await WastePurchase.aggregate([
            ...basePipeline,
            {
                $match: {
                    purchaseDate: { $gte: todayStart, $lte: todayEnd }
                }
            },
            {
                $group: {
                    _id: null,
                    totalAmount: {
                        $sum: {
                            $multiply: ['$wasteItemDetails.quantity', '$wasteItemDetails.pricePerUnit']
                        }
                    },
                    totalTransactions: { $sum: 1 }
                }
            }
        ]);

        // 3. ยอดรับซื้อเมื่อวาน (สำหรับเปรียบเทียบ)
        console.log('Calculating yesterday\'s total...');
        const yesterdayData = await WastePurchase.aggregate([
            ...basePipeline,
            {
                $match: {
                    purchaseDate: { $gte: yesterdayStart, $lte: yesterdayEnd }
                }
            },
            {
                $group: {
                    _id: null,
                    totalAmount: {
                        $sum: {
                            $multiply: ['$wasteItemDetails.quantity', '$wasteItemDetails.pricePerUnit']
                        }
                    },
                    totalTransactions: { $sum: 1 }
                }
            }
        ]);

        // 4. ข้อมูลเดือนที่แล้วสำหรับเปรียบเทียบ
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        
        const lastMonthData = await WastePurchase.aggregate([
            ...basePipeline,
            {
                $match: {
                    purchaseDate: { $gte: lastMonthStart, $lte: lastMonthEnd }
                }
            },
            {
                $group: {
                    _id: null,
                    totalAmount: {
                        $sum: {
                            $multiply: ['$wasteItemDetails.quantity', '$wasteItemDetails.pricePerUnit']
                        }
                    },
                    totalQuantity: { $sum: '$wasteItemDetails.quantity' }
                }
            }
        ]);

        // 5. ขยะมูลค่าสูงสุด
        console.log('Finding highest value waste...');
        const highestWaste = await myWaste.findOne({ isDeleted: false })
            .populate('_id')
            .sort({ pricePerUnit: -1 });

        // 6. ข้อมูลแต่ละหมู่บ้าน (สำหรับ 3D Pie Chart) - ใช้ filter ที่เลือก
        console.log('Calculating village data...');
        let villageDataPipeline = [...filterPipeline];
        if (Object.keys(dateMatch).length > 0) {
            villageDataPipeline.push({ $match: dateMatch });
        }

        // เพิ่ม lookup village ถ้ายังไม่มี
        const hasVillageInfo = villageDataPipeline.some(stage => 
            stage.$lookup && stage.$lookup.from === 'villages'
        );
        
        if (!hasVillageInfo) {
            villageDataPipeline.push(
                {
                    $lookup: {
                        from: 'villages',
                        localField: 'familyInfo.village',
                        foreignField: '_id',
                        as: 'villageInfo'
                    }
                },
                { $unwind: '$villageInfo' }
            );
        }

        const villageData = await WastePurchase.aggregate([
            ...villageDataPipeline,
            {
                $group: {
                    _id: '$villageInfo._id',
                    villageName: { $first: '$villageInfo.villageName' },
                    villageNumber: { $first: '$villageInfo.villageNumber' },
                    totalQuantity: { $sum: '$wasteItemDetails.quantity' },
                    totalAmount: {
                        $sum: {
                            $multiply: ['$wasteItemDetails.quantity', '$wasteItemDetails.pricePerUnit']
                        }
                    },
                    transactionCount: { $sum: 1 }
                }
            },
            { $sort: { villageNumber: 1 } }
        ]);

        // 7. สรุปการรับซื้อตาม filter ที่เลือก (ตามประเภทขยะ)
        console.log('Calculating waste summary...');
        const wasteSummary = await WastePurchase.aggregate([
            ...totalDataPipeline,
            {
                $group: {
                    _id: '$wasteItemDetails.name',
                    totalQuantity: { $sum: '$wasteItemDetails.quantity' },
                    avgPrice: { $avg: '$wasteItemDetails.pricePerUnit' },
                    totalAmount: {
                        $sum: {
                            $multiply: ['$wasteItemDetails.quantity', '$wasteItemDetails.pricePerUnit']
                        }
                    }
                }
            },
            { $sort: { totalAmount: -1 } },
            { $limit: 10 } // แสดงแค่ 10 อันดับแรก
        ]);

        // 8. แนวโน้มราคาขยะ (3 เดือนย้อนหลัง)
        console.log('Calculating price trends...');
        const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        const priceTrends = await WastePurchase.aggregate([
            ...basePipeline,
            {
                $match: {
                    purchaseDate: { $gte: threeMonthsAgo, $lte: now }
                }
            },
            {
                $addFields: {
                    monthYear: {
                        $dateToString: {
                            format: "%Y-%m",
                            date: "$purchaseDate"
                        }
                    }
                }
            },
            {
                $group: {
                    _id: {
                        wasteName: '$wasteItemDetails.name',
                        month: '$monthYear'
                    },
                    avgPrice: { $avg: '$wasteItemDetails.pricePerUnit' },
                    totalQuantity: { $sum: '$wasteItemDetails.quantity' }
                }
            },
            {
                $group: {
                    _id: '$_id.wasteName',
                    monthlyData: {
                        $push: {
                            month: '$_id.month',
                            avgPrice: '$avgPrice',
                            quantity: '$totalQuantity'
                        }
                    }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // 9. ดึงรายการหมู่บ้านทั้งหมดสำหรับ filter dropdown
        const allVillages = await Village.find({ isDeleted: { $ne: true } })
            .select('villageName villageNumber')
            .sort({ villageNumber: 1 });

        // คำนวณเปอร์เซ็นต์การเปลี่ยนแปลง (ไม่ปัดเศษ)
        const totalAmount = totalData[0]?.totalAmount || 0;
        const totalQuantity = totalData[0]?.totalQuantity || 0;
        const totalTransactions = totalData[0]?.totalTransactions || 0;

        const todayTotal = todayData[0]?.totalAmount || 0;
        const yesterdayTotal = yesterdayData[0]?.totalAmount || 0;
        const todayPercentChange = yesterdayTotal > 0 
            ? ((todayTotal - yesterdayTotal) / yesterdayTotal) * 100
            : 0;

        const transactionToday = todayData[0]?.totalTransactions || 0;
        const transactionYesterday = yesterdayData[0]?.totalTransactions || 0;
        const transactionPercentChange = transactionYesterday > 0
            ? ((transactionToday - transactionYesterday) / transactionYesterday) * 100
            : 0;

        const lastMonthTotal = lastMonthData[0]?.totalAmount || 0;
        const lastMonthQuantity = lastMonthData[0]?.totalQuantity || 0;

        // สร้าง filter info สำหรับแสดงผล
        let filterInfo = {
            dateRange,
            startDate: filterStartDate ? filterStartDate.toISOString().split('T')[0] : '',
            endDate: filterEndDate ? filterEndDate.toISOString().split('T')[0] : '',
            selectedDate: selectedDate || '',
            village,
            villageName: ''
        };

        if (village && allVillages) {
            const selectedVillage = allVillages.find(v => v._id.toString() === village);
            if (selectedVillage) {
                filterInfo.villageName = selectedVillage.villageName || `หมู่บ้านที่ ${selectedVillage.villageNumber}`;
            }
        }

        console.log('Final filter info:', filterInfo);
        console.log('Rendering dashboard...');
        
        res.render('employee/dashboard', {
            mytitle: 'พนักงาน | แดชบอร์ด',
            
            // ข้อมูลสถิติหลัก (ไม่ปัดเศษ)
            totalQuantity: totalQuantity,
            totalAmount: totalAmount,
            totalTransactions: totalTransactions,
            
            // ข้อมูลเปรียบเทียบ (ไม่ปัดเศษ)
            todayTotal: todayTotal,
            todayPercentChange: todayPercentChange,
            transactionToday: transactionToday,
            transactionYesterday: transactionYesterday,
            transactionPercentChange: transactionPercentChange,
            lastMonthTotal: lastMonthTotal,
            lastMonthQuantity: lastMonthQuantity,
            
            highestWaste: highestWaste,
            
            // ข้อมูลสำหรับกราฟ
            villageData: villageData || [],
            wasteSummary: wasteSummary || [],
            priceTrends: priceTrends || [],
            
            // ข้อมูล filter
            allVillages: allVillages || [],
            filterInfo: filterInfo,
            
            // Query parameters สำหรับ form
            currentFilters: {
                village: village || '',
                startDate: startDate || '',
                endDate: endDate || '',
                selectedDate: selectedDate || '',
                dateRange: dateRange || 'all'
            },

            currentPage: 'dashboard',
        });

    } catch (err) {
        console.error('Error in dashboardIndex:', err);
        console.error('Stack trace:', err.stack);
        
        if (process.env.NODE_ENV === 'development') {
            return res.status(500).render('error', {
                message: 'เกิดข้อผิดพลาดในระบบ',
                error: {
                    message: err.message,
                    stack: err.stack
                }
            });
        }
        
        res.status(500).render('employee/dashboard', {
            mytitle: 'แดชบอร์ด - เกิดข้อผิดพลาด',
            totalQuantity: 0,
            totalAmount: 0,
            totalTransactions: 0,
            todayTotal: 0,
            todayPercentChange: 0,
            transactionToday: 0,
            transactionYesterday: 0,
            transactionPercentChange: 0,
            lastMonthTotal: 0,
            lastMonthQuantity: 0,
            highestWaste: null,
            villageData: [],
            wasteSummary: [],
            priceTrends: [],
            allVillages: [],
            filterInfo: {
                dateRange: 'all',
                startDate: '',
                endDate: '',
                selectedDate: '',
                village: '',
                villageName: ''
            },
            currentFilters: {
                village: '',
                startDate: '',
                endDate: '',
                selectedDate: '',
                dateRange: 'all'
            },
            errorMessage: 'เกิดข้อผิดพลาดในการโหลดข้อมูล กรุณาลองใหม่อีกครั้ง'
        });
    }
};


const wastePurchaseIndex = async (req, res) => {
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
            mytitle: 'พนักงาน | รับซื้อขยะ',
            waste: wasteData,
            wasteTypes: wasteTypeData,
            searchQuery: searchQuery,
            selectedWasteType: selectedWasteType,
            allWasteBankAccount: allWasteBankAccount,
            currentPage: 'wastePurchase',
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
        const searchMonth = req.query.searchMonth; // เพิ่ม filter เดือน
        const villageId = req.query.villageId; // เพิ่ม filter หมู่บ้าน
        const accountIdParam = req.query.accountId;
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;
        const search = req.query.search;
        
        let query = { isDeleted: false };
        let monthlyQuery = { isDeleted: false };

        // Filter ตามวันที่
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

        // Filter ตามเดือน (ใหม่)
        if (searchMonth && !searchDate) {
            const [year, month] = searchMonth.split('-');
            const firstDayOfMonth = new Date(year, month - 1, 1);
            const lastDayOfMonth = new Date(year, month, 0, 23, 59, 59, 999);
            
            query.purchaseDate = {
                $gte: firstDayOfMonth,
                $lte: lastDayOfMonth
            };
            monthlyQuery.purchaseDate = {
                $gte: firstDayOfMonth,
                $lte: lastDayOfMonth
            };
        }

        // Filter ตามหมู่บ้าน (ใหม่)
        let accountIdsFromVillage = [];
        if (villageId) {
            // หา Family ที่อยู่ในหมู่บ้านนั้น
            const families = await Family.find({ 
                village: villageId, 
                isDeleted: false 
            }).select('_id');
            
            // หา Account ที่เชื่อมกับ Family เหล่านั้น
            const accounts = await WasteBankAccount.find({
                familyID: { $in: families.map(f => f._id) },
                isDeleted: false
            }).select('_id');
            
            accountIdsFromVillage = accounts.map(acc => acc._id);
            
            if (accountIdsFromVillage.length > 0) {
                query.accountId = { $in: accountIdsFromVillage };
            } else {
                query.accountId = null;
            }
        }

        // Filter ตามเลขบัญชี
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

        // ค้นหาทั่วไป
        if (search) {
            const searchRegex = new RegExp(search, 'i');
            const accountSearchQuery = {
                $or: [
                    { AccountNumber: searchRegex },
                    { AccountName: searchRegex }
                ],
                isDeleted: false
            };
            const accountsMatching = await WasteBankAccount.find(accountSearchQuery).select('_id');
            if (accountsMatching.length > 0) {
                query.accountId = { $in: accountsMatching.map(acc => acc._id) };
            } else {
                query.accountId = null;
            }
        }

        // ดึงข้อมูล WastePurchase พร้อม populate
        const wastePurchases = await WastePurchase.find(query)
            .populate({
                path: 'wasteItems'
            })
            .populate({
                path: 'accountId',
                populate: {
                    path: 'familyID',
                    populate: {
                        path: 'village'
                    }
                }
            })
            .sort({ purchaseDate: -1 })
            .skip(skip)
            .limit(limit);

        // หา Member ของแต่ละ Family แยกต่างหาก
        for (let purchase of wastePurchases) {
            if (purchase.accountId && purchase.accountId.length > 0 && purchase.accountId[0].familyID) {
                const familyId = purchase.accountId[0].familyID._id;
                const members = await Member.find({ 
                    familyID: familyId, 
                    isDeleted: false,
                    Status: 'living'
                }).select('name');
                
                // เพิ่ม members เป็น property ชั่วคราว
                purchase.accountId[0].familyID.members = members;
            }
        }

        // Map ชื่อพนักงาน
        const adminUsernames = wastePurchases.map(p => p.addBy);
        const admins = await myAdmin.find({ username: { $in: adminUsernames } });
        const adminMap = {};
        admins.forEach(a => adminMap[a.username] = a.firstname + ' ' + a.lastname);
        wastePurchases.forEach(p => {
            p.addByName = adminMap[p.addBy] || p.addBy;
        });

        // นับจำนวน
        const totalCount = await WastePurchase.countDocuments(query);
        const totalPages = Math.ceil(totalCount / limit);
        const purchaseCount = await WastePurchase.countDocuments(query);
        const customerCount = new Set(
            wastePurchases
                .filter(purchase => purchase.accountId && purchase.accountId.length > 0)
                .map(purchase => purchase.accountId[0]._id.toString())
        ).size;

        // คำนวณยอดเงินรวม
        const monthlyWastePurchases = await WastePurchase.find(monthlyQuery);
        const totalAmount = monthlyWastePurchases.reduce((sum, purchase) => 
            sum + (purchase.totalAmount || 0), 0
        );

        // ดึงรายการหมู่บ้านทั้งหมดสำหรับ dropdown
        const villages = await Village.find({ isDeleted: false }).sort({ villageNumber: 1 });

        const startIndex = (page - 1) * limit;

        res.render('employee/wastePurchaseTotal', {
            wastePurchases,
            mytitle: 'พนักงาน | สรุปการรับซื้อขยะ',
            purchaseCount,
            customerCount,
            totalAmount,
            searchDate: searchDate || '',
            searchMonth: searchMonth || '',
            villageId: villageId || '',
            accountId: accountIdParam || '',
            currentPage: page,
            totalPages: totalPages,
            startIndex: startIndex,
            search: search || '',
            villages: villages,
            currentPage: 'wastePurchaseTotal',
            query: req.query
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

        // ดึงข้อมูล
        const villages = await Village.find(); 
        const allFamilies = await Family.find(searchQuery).populate('village').lean();
        const accounts = await WasteBankAccount.find({ isDeleted: false }).lean();

        // แผนที่ Type -> ภาษาไทย
        const typeMap = {
            household: 'บ้าน',
            school: 'โรงเรียน',
            municipality: 'องค์กรปกครองส่วนท้องถิ่น',
            community: 'ชุมชน',
            temple:'วัด'
        };

        // สร้าง Map เพื่อเชื่อมโยง familyID กับ AccountName
        const accountMap = {};
        accounts.forEach(acc => {
            accountMap[acc.familyID.toString()] = acc.AccountName;
        });

        // เพิ่ม field typeThai ให้ทุกครัวเรือน
        allFamilies.forEach(family => {
            family.typeThai = typeMap[family.Type] || family.Type;
            family.AccountName = accountMap[family._id.toString()] || 'ไม่มีข้อมูล';
        });

        // ถ้ามีการค้นหาด้วย AccountName ให้กรองเพิ่ม
        let filteredFamilies = allFamilies;
        if (AccountName) {
            filteredFamilies = allFamilies.filter(family => 
                family.AccountName.includes(AccountName)
            );
        }

        res.render('employee/member', { 
            mytitle: 'พนักงาน | สมาชิกกองทุนขยะรีไซเคิล',
            villages,
            allFamilies: filteredFamilies,
            currentPage: 'member',
            query: req.query  
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
};

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
        const usernameRegex = /^[a-zA-Z0-9_\u0E00-\u0E7F]{5,20}$/;
        if (!usernameRegex.test(req.body.username)) {
            await session.abortTransaction();
            session.endSession();
            return res.redirect('/employee/member?error=ชื่อผู้ใช้ต้องมี 5-20 ตัวอักษร และไม่มีอักขระพิเศษ');
        }

        // ตรวจสอบ password 
        const passwordRegex = /^\d{6,8}$/;
        if (!passwordRegex.test(req.body.password)) {
            await session.abortTransaction();
            session.endSession();
            return res.redirect('/employee/member?error=รหัสผ่านต้องเป็นตัวเลข 6-8 หลัก');
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

// ดึงข้อมูลครัวเรือนและสมาชิกเพื่อแก้ไข
const getMemberForEdit = async (req, res) => {
    try {
        const { familyId } = req.params;
        
        // ดึงข้อมูลครัวเรือน
        const family = await Family.findById(familyId).populate('village').lean();
        if (!family) {
            return res.status(404).json({ error: 'ไม่พบข้อมูลครัวเรือน' });
        }

        // ดึงข้อมูลสมาชิกตัวแทน (คนแรก)
        const member = await Member.findOne({ familyID: familyId, Status: 'living' }).lean();
        if (!member) {
            return res.status(404).json({ error: 'ไม่พบข้อมูลสมาชิก' });
        }

        // ดึงข้อมูลบัญชีธนาคารขยะ
        const account = await WasteBankAccount.findOne({ familyID: familyId }).lean();

        res.json({
            success: true,
            data: {
                family,
                member,
                account
            }
        });
    } catch (error) {
        console.error('Error fetching member data:', error);
        res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูล' });
    }
};

// อัปเดตข้อมูลครัวเรือนและสมาชิก
const memberUpdate = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { familyId } = req.params;

        // ตรวจสอบว่าครัวเรือนมีอยู่จริง
        const existingFamily = await Family.findById(familyId).session(session);
        if (!existingFamily) {
            await session.abortTransaction();
            session.endSession();
            return res.redirect('/employee/member?error=ไม่พบข้อมูลครัวเรือน');
        }

        // ตรวจสอบ village
        if (req.body.village) {
            const village = await Village.findById(req.body.village).session(session);
            if (!village) {
                await session.abortTransaction();
                session.endSession();
                return res.redirect('/employee/member?error=ไม่พบหมู่บ้านที่ระบุ');
            }
        }

        // ตรวจสอบ username (ถ้ามีการเปลี่ยน)
        if (req.body.username && req.body.username !== existingFamily.username) {
            const usernameRegex = /^[a-zA-Z0-9_\u0E00-\u0E7F]{5,20}$/;
            if (!usernameRegex.test(req.body.username)) {
                await session.abortTransaction();
                session.endSession();
                return res.redirect('/employee/member?error=ชื่อผู้ใช้ต้องมี 5-20 ตัวอักษร และไม่มีอักขระพิเศษ');
            }

            // ตรวจสอบว่าชื่อผู้ใช้ซ้ำหรือไม่
            const duplicateUsername = await Family.findOne({ 
                username: req.body.username,
                _id: { $ne: familyId }
            }).session(session);
            
            if (duplicateUsername) {
                await session.abortTransaction();
                session.endSession();
                return res.redirect('/employee/member?error=ชื่อผู้ใช้นี้ถูกใช้ไปแล้ว');
            }
        }

        // ตรวจสอบ password (ถ้ามีการเปลี่ยน)
        let hashedPassword = existingFamily.password;
        if (req.body.password && req.body.password.trim() !== '') {
            const passwordRegex = /^\d{6,8}$/;
            if (!passwordRegex.test(req.body.password)) {
                await session.abortTransaction();
                session.endSession();
                return res.redirect('/employee/member?error=รหัสผ่านต้องเป็นตัวเลข 6-8 หลัก');
            }
            hashedPassword = await bcrypt.hash(req.body.password, 10);
        }

        // หาข้อมูลสมาชิกเดิม
        const existingMember = await Member.findOne({ 
            familyID: familyId,
            Status: 'living'
        }).session(session);

        if (!existingMember) {
            await session.abortTransaction();
            session.endSession();
            return res.redirect('/employee/member?error=ไม่พบข้อมูลสมาชิก');
        }

        // ตรวจสอบอีเมล เบอร์โทร และเลขบัตรประชาชนซ้ำ (ถ้ามีการเปลี่ยน)
        if (req.body.email !== existingMember.email || 
            req.body.phone !== existingMember.phone || 
            req.body.idCardNumber !== existingMember.idCardNumber) {
            
            const duplicateMember = await Member.findOne({
                _id: { $ne: existingMember._id },
                $or: [
                    { email: req.body.email },
                    { phone: req.body.phone },
                    { idCardNumber: req.body.idCardNumber }
                ]
            }).session(session);

            if (duplicateMember) {
                await session.abortTransaction();
                session.endSession();
                return res.redirect('/employee/member?error=อีเมล หมายเลขโทรศัพท์ หรือเลขบัตรประชาชนนี้ถูกใช้ไปแล้ว');
            }
        }

        // อัปเดตข้อมูลครัวเรือน
        await Family.findByIdAndUpdate(
            familyId,
            {
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
                village: req.body.village,
                Type: req.body.Type
            },
            { session }
        );

        // อัปเดตข้อมูลสมาชิก
        await Member.findByIdAndUpdate(
            existingMember._id,
            {
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
                beneficiaries: req.body.beneficiaries || []
            },
            { session }
        );

        // อัปเดตชื่อบัญชีธนาคารขยะ (ถ้าชื่อครัวเรือนเปลี่ยน)
        await WasteBankAccount.findOneAndUpdate(
            { familyID: familyId },
            { AccountName: req.body.familyName },
            { session }
        );

        // Transaction สำเร็จ
        await session.commitTransaction();
        session.endSession();

        res.redirect('/employee/member?message=แก้ไขข้อมูลสำเร็จ');

    } catch (error) {
        await session.abortTransaction();
        session.endSession();

        console.error('Error updating member:', error);
        res.redirect('/employee/member?error=เกิดข้อผิดพลาดในการแก้ไขข้อมูล: ' + error.message);
    }
};

//หน้าคำร้องหรือหรือข้อร้องเรียน
const complaintIndex = async (req, res) => {
    try {
        const complaint = await Complaint
            .find()
            .populate('family')
            .sort({ createdAt: -1 });

        res.render('employee/complaint', {
            mytitle: 'พนักงาน | รายการคำร้องหรือหรือข้อร้องเรียน',
            complaint,
            currentPage: 'complaint',
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

// เปลี่ยนสถานะของคำร้อง
const updateComplaintStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const complaint = await Complaint.findByIdAndUpdate(
            id,
            { status },
            { new: true }
        );

        if (!complaint) {
            return res.status(404).json({ error: 'ไม่พบคำร้อง' });
        }

        res.json({ success: true, complaint, message: 'อัปเดตสถานะเรียบร้อยแล้ว'});
    } catch (error) {
        console.error('Error updating complaint status:', error);
        res.status(500).json({ error: 'เกิดข้อผิดพลาดในการอัปเดตสถานะ' });
    }
};

//หน้าตรวจสอบความประสงค์ขายขยะ
const wasteSaleRequestIndex = async (req, res) => {
    try {
        const wasteSaleRequests = await wasteSaleRequest
            .find({ isDeleted: false }) // เพิ่มเงื่อนไขไม่แสดงรายการที่ถูกลบ
            .populate('waste') // ดึงข้อมูลขยะจาก ObjectId
            .populate('family') // ดึงข้อมูลครอบครัว
            .sort({ createdAt: -1 }); // เรียงตามวันที่สร้างล่าสุด

        console.log('Fetched requests:', wasteSaleRequests.length); // Debug log
        
        // Debug log เพื่อดูข้อมูลที่ดึงมา
        if (wasteSaleRequests.length > 0) {
            console.log('Sample request coordinates:', {
                latitude: wasteSaleRequests[0].latitude,
                longitude: wasteSaleRequests[0].longitude
            });
        }

        res.render('employee/wasteSaleRequest', {
            mytitle: 'พนักงาน | ความประสงค์ขายขยะ',
            wasteSaleRequests,
            currentPage: 'wasteSaleRequest',
        });
    } catch (error) {
        console.error('Error fetching waste sale requests:', error);
        res.render('employee/wasteSaleRequest', {
            mytitle: 'รายการความประสงค์ขายขยะ',
            wasteSaleRequests: [],
            currentPage: 'wasteSaleRequest',
            error: 'ไม่สามารถโหลดข้อมูลได้'
        });
    }
};

// Controller สำหรับอัปเดตสถานะ
const updateWasteSaleRequestStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        // ตรวจสอบ status ที่อนุญาต
        const allowedStatuses = ['pending', 'in-progress', 'resolved'];
        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({ 
                error: 'สถานะไม่ถูกต้อง', 
                allowedStatuses 
            });
        }

        const wastesalerequest = await wasteSaleRequest
            .findByIdAndUpdate(
                id,
                { status },
                { new: true }
            )
            .populate('waste')
            .populate('family');

        if (!wastesalerequest) {
            return res.status(404).json({ error: 'ไม่พบรายการความประสงค์ขายขยะ' });
        }

        // ส่งข้อมูลกลับเป็น JSON สำหรับ AJAX
        res.json({ 
            success: true, 
            wastesalerequest,
            message: 'อัปเดตสถานะเรียบร้อยแล้ว'
        });
    } catch (error) {
        console.error('Error updating waste sale request status:', error);
        res.status(500).json({ 
            error: 'เกิดข้อผิดพลาดในการอัปเดตสถานะ',
            details: error.message 
        });
    }
};

//หน้าสต๊อกขยะ (เพิ่ม filter เดือน/ปี) - Fixed Version
const wasteStockIndex = async (req, res) => {
    const villageId = req.query.villageId || null;
    const wasteName = req.query.name || null;
    const selectedMonth = req.query.month || null; // YYYY-MM format
    const selectedYear = req.query.year || null;

    try {
        console.log('Starting wasteStockIndex with params:', { villageId, wasteName, selectedMonth, selectedYear });

        const matchCondition = { isDeleted: false };

        // เพิ่ม date filter
        if (selectedMonth) {
            const [year, month] = selectedMonth.split('-');
            const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
            const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
            matchCondition.purchaseDate = { $gte: startDate, $lte: endDate };
            console.log('Date filter (month):', { startDate, endDate });
        } else if (selectedYear) {
            const startDate = new Date(parseInt(selectedYear), 0, 1);
            const endDate = new Date(parseInt(selectedYear), 11, 31, 23, 59, 59);
            matchCondition.purchaseDate = { $gte: startDate, $lte: endDate };
            console.log('Date filter (year):', { startDate, endDate });
        }

        console.log('Match condition:', matchCondition);

        // Pipeline แบบ step by step เพื่อ debug ง่าย
        const pipeline = [
            { $match: matchCondition }
        ];

        // ตรวจสอบว่ามีข้อมูล purchase ไหม
        const purchaseCount = await WastePurchase.countDocuments(matchCondition);
        console.log('Purchase count after date filter:', purchaseCount);

        if (purchaseCount === 0) {
            console.log('No purchases found, returning empty data');
            return res.render('employee/wasteStock', {
                mytitle: 'สต๊อกขยะ',
                stockData: [],
                selectedVillageId: villageId,
                villages: await Village.find({ isDeleted: false }).sort({ villageNumber: 1 }) || [],
                searchName: wasteName,
                selectedMonth: selectedMonth,
                selectedYear: selectedYear,
                monthlyOptions: []
            });
        }

        // Join WasteBankAccount
        pipeline.push(
            {
                $lookup: {
                    from: 'wastebankaccounts',
                    localField: 'accountId',
                    foreignField: '_id',
                    as: 'accountInfo'
                }
            },
            {
                $match: {
                    'accountInfo': { $ne: [] } // มี account info
                }
            },
            { $unwind: '$accountInfo' }
        );

        // Join Family
        pipeline.push(
            {
                $lookup: {
                    from: 'families',
                    localField: 'accountInfo.familyID',
                    foreignField: '_id',
                    as: 'familyInfo'
                }
            },
            {
                $match: {
                    'familyInfo': { $ne: [] } // มี family info
                }
            },
            { $unwind: '$familyInfo' }
        );

        // ถ้าเลือกหมู่บ้าน
        if (villageId) {
            try {
                const villageObjectId = new mongoose.Types.ObjectId(villageId);
                pipeline.push({
                    $match: { 'familyInfo.village': villageObjectId }
                });
                console.log('Added village filter:', villageId);
            } catch (villageError) {
                console.error('Invalid village ID:', villageId);
                // ถ้า villageId ผิด format ให้ skip filter นี้
            }
        }

        // Join WasteItem - ปรับปรุงให้ handle array properly
        pipeline.push(
            {
                $lookup: {
                    from: 'wasteitems',
                    localField: 'wasteItems',
                    foreignField: '_id',
                    as: 'wasteItemDetails'
                }
            },
            {
                $match: {
                    'wasteItemDetails': { $ne: [] } // มี waste items
                }
            },
            { $unwind: '$wasteItemDetails' }
        );

        // ถ้าใส่ชื่อขยะ
        if (wasteName && wasteName.trim() !== '') {
            pipeline.push({
                $match: { 
                    'wasteItemDetails.name': { 
                        $regex: wasteName.trim(), 
                        $options: 'i' 
                    } 
                }
            });
            console.log('Added waste name filter:', wasteName);
        }

        // Join กับ Waste model
        pipeline.push(
            {
                $lookup: {
                    from: 'wastes',
                    localField: 'wasteItemDetails.name',
                    foreignField: 'wasteName',
                    as: 'currentWasteInfo'
                }
            },
            
            // เพิ่ม field เดือน/ปี สำหรับ grouping
            {
                $addFields: {
                    purchaseMonth: { 
                        $dateToString: { 
                            format: "%Y-%m", 
                            date: "$purchaseDate",
                            timezone: "Asia/Bangkok"
                        } 
                    },
                    purchaseYear: { $year: "$purchaseDate" },
                    // ป้องกัน null/undefined values
                    wasteQuantity: { 
                        $ifNull: ['$wasteItemDetails.quantity', 0] 
                    },
                    wastePricePerUnit: { 
                        $ifNull: ['$wasteItemDetails.pricePerUnit', 0] 
                    },
                    currentPricePerUnit: {
                        $ifNull: [{ $arrayElemAt: ['$currentWasteInfo.pricePerUnit', 0] }, 0]
                    }
                }
            }
        );

        // Group แบบใหม่ - แยกตาม wasteName และ เดือน
        pipeline.push(
            {
                $group: {
                    _id: {
                        wasteName: '$wasteItemDetails.name',
                        month: '$purchaseMonth'
                    },
                    totalQuantityKg: { $sum: '$wasteQuantity' },
                    avgPriceInMonth: { $avg: '$wastePricePerUnit' },
                    monthlyAmount: { 
                        $sum: { 
                            $multiply: ['$wasteQuantity', '$wastePricePerUnit'] 
                        } 
                    },
                    currentPrice: { $first: '$currentPricePerUnit' },
                    currentMonthlyValue: { 
                        $sum: { 
                            $multiply: ['$wasteQuantity', '$currentPricePerUnit'] 
                        } 
                    },
                    purchaseCount: { $sum: 1 },
                    purchaseDates: { $push: '$purchaseDate' }
                }
            },
            
            // Group อีกครั้งเพื่อรวมทุกเดือนของแต่ละประเภทขยะ
            {
                $group: {
                    _id: '$_id.wasteName',
                    totalQuantityKg: { $sum: '$totalQuantityKg' },
                    
                    // รวมยอดเงินจากทุกเดือน (แม่นยำ)
                    historicalTotalAmount: { $sum: '$monthlyAmount' },
                    currentTotalAmount: { $sum: '$currentMonthlyValue' },
                    
                    // เก็บข้อมูลสำหรับคำนวณราคาเฉลี่ย
                    totalMonthlyAmount: { $sum: '$monthlyAmount' },
                    totalMonthlyQuantity: { $sum: '$totalQuantityKg' },
                    
                    currentPrice: { $first: '$currentPrice' },
                    purchaseCount: { $sum: '$purchaseCount' },
                    lastUpdated: { $max: { $max: '$purchaseDates' } },
                    
                    // เก็บรายละเอียดรายเดือน
                    monthlyBreakdown: {
                        $push: {
                            month: '$_id.month',
                            quantity: '$totalQuantityKg',
                            avgPrice: '$avgPriceInMonth',
                            amount: '$monthlyAmount',
                            currentValue: '$currentMonthlyValue',
                            purchases: '$purchaseCount'
                        }
                    }
                }
            },
            
            {
                $addFields: {
                    // คำนวณราคาเฉลี่ยแบบ weighted average
                    avgHistoricalPrice: {
                        $cond: {
                            if: { $gt: ['$totalQuantityKg', 0] },
                            then: {
                                $divide: ['$totalMonthlyAmount', '$totalQuantityKg']
                            },
                            else: 0
                        }
                    },
                    pricePerKg: { $ifNull: ['$currentPrice', 0] },
                    totalAmount: { $ifNull: ['$historicalTotalAmount', 0] },
                    currentValueIfSoldToday: { $ifNull: ['$currentTotalAmount', 0] },
                    lastUpdatedFormatted: {
                        $cond: {
                            if: { $ne: ['$lastUpdated', null] },
                            then: {
                                $dateToString: {
                                    format: "%d/%m/%Y",
                                    date: '$lastUpdated',
                                    timezone: "Asia/Bangkok"
                                }
                            },
                            else: "ไม่ระบุ"
                        }
                    }
                }
            },
            
            {
                $addFields: {
                    // คำนวณส่วนต่างราคา (ต้องทำแยกเพราะต้องใช้ avgHistoricalPrice ที่คำนวณแล้ว)
                    priceDifference: { 
                        $subtract: [
                            { $ifNull: ['$currentPrice', 0] }, 
                            { $ifNull: ['$avgHistoricalPrice', 0] }
                        ] 
                    },
                    avgPricePerUnit: { $ifNull: ['$avgHistoricalPrice', 0] }
                }
            },
            
            { $sort: { _id: 1 } }
        );

        console.log('Executing main aggregation pipeline...');
        const stockData = await WastePurchase.aggregate(pipeline);
        console.log('Stock data count:', stockData.length);

        // สร้าง dropdown options สำหรับเดือน/ปี
        let monthlyOptions = [];
        try {
            monthlyOptions = await WastePurchase.aggregate([
                { $match: { isDeleted: false } },
                {
                    $group: {
                        _id: {
                            year: { $year: '$purchaseDate' },
                            month: { $month: '$purchaseDate' }
                        },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { '_id.year': -1, '_id.month': -1 } }
            ]);
            console.log('Monthly options count:', monthlyOptions.length);
        } catch (monthlyError) {
            console.error('Error getting monthly options:', monthlyError);
            monthlyOptions = [];
        }

        // ดึงข้อมูลหมู่บ้าน
        let allVillages = [];
        try {
            allVillages = await Village.find({ isDeleted: false }).sort({ villageNumber: 1 });
            console.log('Villages count:', allVillages.length);
        } catch (villageError) {
            console.error('Error getting villages:', villageError);
            allVillages = [];
        }

        console.log('Rendering page with data...');
        res.render('employee/wasteStock', {
            mytitle: 'พนักงาน | สต๊อกขยะ',
            stockData: stockData || [],
            selectedVillageId: villageId,
            villages: allVillages,
            searchName: wasteName,
            selectedMonth: selectedMonth,
            selectedYear: selectedYear,
            monthlyOptions: monthlyOptions,
            currentPage: 'wasteStock',
        });

    } catch (err) {
        console.error('Error in wasteStockIndex:', err);
        console.error('Stack trace:', err.stack);
        
        // ส่ง error details ไปยัง view สำหรับ debugging (ในโหมด development)
        if (process.env.NODE_ENV === 'development') {
            return res.status(500).render('error', {
                message: 'เกิดข้อผิดพลาดในระบบ',
                error: {
                    message: err.message,
                    stack: err.stack
                }
            });
        }
        
        // สำหรับ production ให้ส่งหน้า error ธรรมดา
        res.status(500).render('employee/wasteStock', {
            mytitle: 'สต๊อกขยะ - เกิดข้อผิดพลาด',
            stockData: [],
            selectedVillageId: null,
            villages: [],
            searchName: null,
            selectedMonth: null,
            selectedYear: null,
            monthlyOptions: [],
            currentPage: 'wasteStock',
            errorMessage: 'เกิดข้อผิดพลาดในการโหลดข้อมูล กรุณาลองใหม่อีกครั้ง'
        });
    }
};


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
            mytitle: 'พนักงาน | เบิกถอนเงิน',
            transactions,
            message: req.query.message || null,
            error: req.query.error || null,
            currentPage: 'withDraw',
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
    res.render('employee/funeralAid',{mytitle: 'พนักงาน | ฌาปนกิจสงเคราะห์',currentPage: 'funeralAid',})
}

const mapIndex = (req, res)=> {
    res.render('employee/map',{mytitle: 'พนักงาน | แผนที่จุดเข้ารับซื้อ',currentPage: 'map',})
}
const wastePointIndex = (req, res)=> {
    res.render('employee/wastePoint',{mytitle: 'พนักงาน | แผนที่จุดเข้ารับซื้อ',currentPage: 'wastePoint',})
}

const wastePointPost = async (req, res) => {
    try {
        const {
            addBy,
            wastePointName,
            location,
            latitude,
            longitude,
            tel,
            date,
            startTime,
            endTime,
            status
        } = req.body;

        const newPoint = new WastePoint({
            wastePointName,
            location,
            latitude: latitude.toString(),   // แปลงให้ตรง Schema
            longitude: longitude.toString(), // แปลงให้ตรง Schema
            tel: Number(tel),                // แปลงจาก string → number
            date: new Date(date),            // แปลงจาก string → Date
            startTime,
            endTime,
            status,
            addBy
        });

    await newPoint.save();

    // redirect กลับหน้า list พร้อม success message
    res.redirect('/employee/wastePoint?message=เพิ่มจุดรับซื้อสำเร็จ');

  } catch (err) {
    console.error("❌ Error saving waste point:", err);
    res.redirect('/employee/wastePoint?error=เกิดข้อผิดพลาดในการบันทึก');
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
    memberIndex,memberRegister,getMemberForEdit,memberUpdate,
    //หน้าคำร้องหรือหรือข้อร้องเรียน
    complaintIndex,updateComplaintStatus,
    //หน้าตรวจสอบความประสงค์ขายขยะ
    wasteSaleRequestIndex,updateWasteSaleRequestStatus,
    //หน้าสต๊อกขยะ
    wasteStockIndex,
    //หน้าเบิกถอน
    withDrawIndex,getAccountByNumber,showWithdrawPage,
    //หน้าฌาปนกิจสงเคราะห์
    funeralAidIndex,
    //หน้าแผนที่เข้ารับซื้อ
    mapIndex,
    //หน้าจัดการจุดรับซื้อ
    wastePointIndex,wastePointPost
}