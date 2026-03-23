const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser')
const cloudinary = require('../config/cloudinary');
const multer = require('multer');
const streamifier = require('streamifier');
const myMedia = require('../models/media');
const MyAdmin = require('../models/admin');
const myWaste= require('../models/waste');
const myWasteType = require('../models/wastetype');
const WasteItem = require('../models/wasteItem');
const myNews = require('../models/news');
const myActivity = require('../models/activity');
const Village = require('../models/village')
const Round = require('../models/round');
const WastePriceHistory = require('../models/wastePriceHistory');
const Family = require('../models/family');
const WasteBankAccount = require('../models/wasteBankAccount');
const Member = require('../models/member');
const WastePurchase = require('../models/wastePurchase');
const Notification = require('../models/notification');
const WastePoint = require("../models/wastePoint");
const FuneralAssistance = require('../models/funeral');
const Board = require('../models/board');
const mongoose = require('mongoose');
const path = require('path');
const bcrypt = require('bcryptjs');
const moment = require('moment');
const fs = require('fs');

router.use(express.static(path.join(__dirname, '../public')));

router.use(bodyParser.json({ limit: '10mb' }));  // เพิ่มขนาด payload สูงสุด 10MB
router.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

router.post('/upload-image', (req, res) => {
    // โค้ดสำหรับจัดการการอัพโหลด
    res.send('ไฟล์ถูกอัพโหลด');
});

// const dashboardIndex = async (req, res) => {
//     try {
//         const { village, searchDate, searchMonth, searchYear } = req.query;

//         // ==================== Helper Functions ====================
        
//         // คำนวณช่วงวันที่ (ปรับใหม่)
//         const getDateRange = (searchDate, searchMonth, searchYear) => {
//             const now = new Date();
            
//             // 1. ถ้าเลือกวันที่เฉพาะ
//             if (searchDate) {
//                 const start = new Date(searchDate);
//                 start.setHours(0, 0, 0, 0);
//                 const end = new Date(searchDate);
//                 end.setHours(23, 59, 59, 999);
//                 return { start, end };
//             }
            
//             // 2. ถ้าเลือกเดือนและ/หรือปี
//             if (searchMonth || searchYear) {
//                 const year = searchYear ? parseInt(searchYear) : now.getFullYear();
                
//                 if (searchMonth) {
//                     // เลือกทั้งเดือนและปี
//                     const month = parseInt(searchMonth) - 1;
//                     const start = new Date(year, month, 1);
//                     const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
//                     return { start, end };
//                 } else {
//                     // เลือกเฉพาะปี
//                     const start = new Date(year, 0, 1);
//                     const end = new Date(year, 11, 31, 23, 59, 59, 999);
//                     return { start, end };
//                 }
//             }
            
//             // 3. ไม่เลือกอะไร = แสดงทั้งหมด
//             return { start: null, end: null };
//         };

//         // สร้าง Base Pipeline
//         const getBasePipeline = () => [
//             { $match: { isDeleted: false } },
//             {
//                 $lookup: {
//                     from: 'wastebankaccounts',
//                     localField: 'accountId',
//                     foreignField: '_id',
//                     as: 'accountInfo'
//                 }
//             },
//             {
//                 $addFields: {
//                     accountInfo: {
//                         $ifNull: [
//                             { $arrayElemAt: ['$accountInfo', 0] },
//                             {
//                                 _id: '$accountId',
//                                 accountNumber: 'DELETED',
//                                 familyID: null,
//                                 isDeleted: true
//                             }
//                         ]
//                     }
//                 }
//             },
//             {
//                 $lookup: {
//                     from: 'families',
//                     localField: 'accountInfo.familyID',
//                     foreignField: '_id',
//                     as: 'familyInfo'
//                 }
//             },
//             {
//                 $addFields: {
//                     familyInfo: {
//                         $ifNull: [
//                             { $arrayElemAt: ['$familyInfo', 0] },
//                             {
//                                 _id: '$accountInfo.familyID',
//                                 familyNumber: 'DELETED',
//                                 village: null,
//                                 isDeleted: true
//                             }
//                         ]
//                     }
//                 }
//             },
//             {
//                 $lookup: {
//                     from: 'wasteitems',
//                     localField: 'wasteItems',
//                     foreignField: '_id',
//                     as: 'wasteItemDetails'
//                 }
//             },
//             { $match: { 'wasteItemDetails.0': { $exists: true } } },
//             { $unwind: '$wasteItemDetails' }
//         ];

//         // เพิ่ม Village Filter
//         const addVillageFilter = (pipeline, villageId) => {
//             if (!villageId) return pipeline;
//             return [
//                 ...pipeline,
//                 {
//                     $lookup: {
//                         from: 'villages',
//                         localField: 'familyInfo.village',
//                         foreignField: '_id',
//                         as: 'villageInfo'
//                     }
//                 },
//                 { $unwind: '$villageInfo' },
//                 { $match: { 'villageInfo._id': new mongoose.Types.ObjectId(villageId) } }
//             ];
//         };

//         // เพิ่ม Date Filter
//         const addDateFilter = (pipeline, start, end) => {
//             if (!start && !end) return pipeline;
//             const dateMatch = {};
//             if (start && end) {
//                 dateMatch.purchaseDate = { $gte: start, $lte: end };
//             } else if (start) {
//                 dateMatch.purchaseDate = { $gte: start };
//             } else if (end) {
//                 dateMatch.purchaseDate = { $lte: end };
//             }
//             return [...pipeline, { $match: dateMatch }];
//         };

//         // สร้าง Complete Pipeline
//         const buildPipeline = (start, end, villageId) => {
//             let pipeline = getBasePipeline();
//             pipeline = addVillageFilter(pipeline, villageId);
//             pipeline = addDateFilter(pipeline, start, end);
//             return pipeline;
//         };

//         // ใหม่ - นับถูก
//         const getSummaryGroupStage = () => [
//             {
//                 $group: {
//                     _id: '$_id',
//                     totalAmount: {
//                         $sum: { $multiply: ['$wasteItemDetails.quantity', '$wasteItemDetails.pricePerUnit'] }
//                     },
//                     totalQuantity: { $sum: '$wasteItemDetails.quantity' }
//                 }
//             },
//             {
//                 $group: {
//                     _id: null,
//                     totalAmount: { $sum: '$totalAmount' },
//                     totalQuantity: { $sum: '$totalQuantity' },
//                     totalTransactions: { $sum: 1 }
//                 }
//             }
//         ];

//         // ==================== คำนวณช่วงวันที่ ====================
        
//         const { start: filterStartDate, end: filterEndDate } = getDateRange(
//             searchDate, searchMonth, searchYear
//         );

//         const now = new Date();
//         const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
//         const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        
//         const yesterdayStart = new Date(todayStart);
//         yesterdayStart.setDate(yesterdayStart.getDate() - 1);
//         const yesterdayEnd = new Date(todayEnd);
//         yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);

//         const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
//         const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

//         const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);

//         // ==================== ดึงข้อมูลทั้งหมดแบบ Parallel ====================
        
//         const [
//             totalDataResult,
//             todayDataResult,
//             yesterdayDataResult,
//             lastMonthDataResult,
//             selectedDateDataResult,
//             highestWaste,
//             villageDataResult,
//             wasteSummaryResult,
//             priceTrendsResult,
//             allVillages,
//             topFamiliesResult
//         ] = await Promise.all([
//             // 1. Total Data ตาม filter
//             WastePurchase.aggregate([
//                 ...buildPipeline(filterStartDate, filterEndDate, village),
//                 ...getSummaryGroupStage()
//             ]),
            
//             // 2. Today Data
//             WastePurchase.aggregate([
//                 ...buildPipeline(todayStart, todayEnd, null),
//                 ...getSummaryGroupStage()
//             ]),
            
//             // 3. Yesterday Data
//             WastePurchase.aggregate([
//                 ...buildPipeline(yesterdayStart, yesterdayEnd, null),
//                 ...getSummaryGroupStage()
//             ]),
            
//             // 4. Last Month Data
//             WastePurchase.aggregate([
//                 ...buildPipeline(lastMonthStart, lastMonthEnd, null),
//                 ...getSummaryGroupStage()
//             ]),

//             //  5. Selected Date Data — ถ้าเลือกวันที่/เดือน/ปี ก็ query ตามนั้น
//             WastePurchase.aggregate([
//                 ...buildPipeline(
//                     filterStartDate || todayStart,
//                     filterEndDate   || todayEnd,
//                     village || null
//                 ),
//                 ...getSummaryGroupStage()
//             ]),
            
//             // 5. Highest Value Waste
//             myWaste.findOne({ isDeleted: false }).sort({ pricePerUnit: -1 }),
            
//             // 6. Village Data
//             (async () => {
//                 let pipeline = buildPipeline(filterStartDate, filterEndDate, village);
                
//                 const hasVillageInfo = pipeline.some(stage => 
//                     stage.$lookup && stage.$lookup.from === 'villages'
//                 );
                
//                 if (!hasVillageInfo) {
//                     pipeline.push(
//                         {
//                             $lookup: {
//                                 from: 'villages',
//                                 localField: 'familyInfo.village',
//                                 foreignField: '_id',
//                                 as: 'villageInfo'
//                             }
//                         },
//                         { $unwind: '$villageInfo' }
//                     );
//                 }
                
//                 return await WastePurchase.aggregate([
//                     ...pipeline,
//                     {
//                         $group: {
//                             _id: '$villageInfo._id',
//                             villageName: { $first: '$villageInfo.villageName' },
//                             villageNumber: { $first: '$villageInfo.villageNumber' },
//                             totalQuantity: { $sum: '$wasteItemDetails.quantity' },
//                             totalAmount: {
//                                 $sum: { $multiply: ['$wasteItemDetails.quantity', '$wasteItemDetails.pricePerUnit'] }
//                             },
//                             transactionCount: { $sum: 1 }
//                         }
//                     },
//                     { $sort: { villageNumber: 1 } }
//                 ]);
//             })(),
            
//             // 7. Waste Summary (Top 10)
//             WastePurchase.aggregate([
//                 ...buildPipeline(filterStartDate, filterEndDate, village),
//                 {
//                     $group: {
//                         _id: '$wasteItemDetails.name',
//                         totalQuantity: { $sum: '$wasteItemDetails.quantity' },
//                         avgPrice: { $avg: '$wasteItemDetails.pricePerUnit' },
//                         totalAmount: {
//                             $sum: { $multiply: ['$wasteItemDetails.quantity', '$wasteItemDetails.pricePerUnit'] }
//                         }
//                     }
//                 },
//                 { $sort: { totalAmount: -1 } },
//                 { $limit: 10 }
//             ]),
            
//             // 8. Price Trends (3 months)
//             WastePurchase.aggregate([
//                 ...buildPipeline(threeMonthsAgo, now, null),
//                 {
//                     $addFields: {
//                         monthYear: {
//                             $dateToString: {
//                                 format: "%Y-%m",
//                                 date: "$purchaseDate"
//                             }
//                         }
//                     }
//                 },
//                 {
//                     $group: {
//                         _id: {
//                             wasteName: '$wasteItemDetails.name',
//                             month: '$monthYear'
//                         },
//                         avgPrice: { $avg: '$wasteItemDetails.pricePerUnit' },
//                         totalQuantity: { $sum: '$wasteItemDetails.quantity' }
//                     }
//                 },
//                 {
//                     $group: {
//                         _id: '$_id.wasteName',
//                         monthlyData: {
//                             $push: {
//                                 month: '$_id.month',
//                                 avgPrice: '$avgPrice',
//                                 quantity: '$totalQuantity'
//                             }
//                         }
//                     }
//                 },
//                 { $sort: { _id: 1 } }
//             ]),
            
//             // 9. All Villages
//             Village.find({ isDeleted: { $ne: true } })
//                 .select('villageName villageNumber')
//                 .sort({ villageNumber: 1 }),

//             // 10. Top 5 Families by Total Sales Amount
//             (async () => {
//                 let pipeline = buildPipeline(filterStartDate, filterEndDate, village);
                
//                 return await WastePurchase.aggregate([
//                     ...pipeline,
//                     {
//                         $group: {
//                             _id: '$accountId',
//                             totalAmount: {
//                                 $sum: { $multiply: ['$wasteItemDetails.quantity', '$wasteItemDetails.pricePerUnit'] }
//                             },
//                             totalQuantity: { $sum: '$wasteItemDetails.quantity' },
//                             transactionCount: { $sum: 1 }
//                         }
//                     },
//                     {
//                         $lookup: {
//                             from: 'wastebankaccounts',
//                             localField: '_id',
//                             foreignField: '_id',
//                             as: 'accountInfo'
//                         }
//                     },
//                     { $unwind: '$accountInfo' },
//                     {
//                         $lookup: {
//                             from: 'families',
//                             localField: 'accountInfo.familyID',
//                             foreignField: '_id',
//                             as: 'familyInfo'
//                         }
//                     },
//                     { $unwind: '$familyInfo' },
//                     {
//                         $project: {
//                             _id: 1,
//                             familyName: '$familyInfo.familyName',
//                             accountNumber: '$accountInfo.AccountNumber',
//                             totalAmount: 1,
//                             totalQuantity: 1,
//                             transactionCount: 1,
//                             familyType: '$familyInfo.Type',
//                             village: '$familyInfo.village'
//                         }
//                     },
//                     { $sort: { totalAmount: -1 } },
//                     { $limit: 10 }
//                 ]);
//             })()
//         ]);

//         // ==================== ประมวลผลข้อมูล ====================
        
//         const totalData = totalDataResult[0] || { totalAmount: 0, totalQuantity: 0, totalTransactions: 0 };
//         const todayData = todayDataResult[0] || { totalAmount: 0, totalTransactions: 0 };
//         const yesterdayData = yesterdayDataResult[0] || { totalAmount: 0, totalTransactions: 0 };
//         const lastMonthData = lastMonthDataResult[0] || { totalAmount: 0, totalQuantity: 0 };
//         const selectedDateData = selectedDateDataResult[0] || { totalAmount: 0 };

//         // คำนวณเปอร์เซ็นต์การเปลี่ยนแปลง
//         const calculatePercentChange = (current, previous) => {
//             return previous > 0 ? ((current - previous) / previous) * 100 : 0;
//         };

//         const todayPercentChange = calculatePercentChange(
//             todayData.totalAmount, 
//             yesterdayData.totalAmount
//         );
        
//         const transactionPercentChange = calculatePercentChange(
//             todayData.totalTransactions, 
//             yesterdayData.totalTransactions
//         );

//         // สร้าง Filter Info (ปรับใหม่)
//         const filterInfo = {
//             searchDate: searchDate || '',
//             searchMonth: searchMonth || '',
//             searchYear: searchYear || '',
//             village: village || '',
//             villageName: ''
//         };

//         if (village && allVillages) {
//             const selectedVillage = allVillages.find(v => v._id.toString() === village);
//             if (selectedVillage) {
//                 filterInfo.villageName = selectedVillage.villageName || 
//                                         `หมู่บ้านที่ ${selectedVillage.villageNumber}`;
//             }
//         }

//         // ==================== Render ====================
        
//         res.render('admin/dashboard', {
//             mytitle: 'ผู้ดูแลระบบ | แดชบอร์ด',
            
//             // สถิติหลัก
//             totalQuantity: totalData.totalQuantity,
//             totalAmount: totalData.totalAmount,
//             totalTransactions: totalData.totalTransactions,
//             todayTotal: todayData.totalAmount, 
//             selectedDateTotal: selectedDateData.totalAmount,
            
//             // เปรียบเทียบ
//             todayTotal: todayData.totalAmount,
//             todayPercentChange,
//             transactionToday: todayData.totalTransactions,
//             transactionYesterday: yesterdayData.totalTransactions,
//             transactionPercentChange,
//             lastMonthTotal: lastMonthData.totalAmount,
//             lastMonthQuantity: lastMonthData.totalQuantity,
            
//             // ข้อมูลอื่นๆ
//             highestWaste,
//             villageData: villageDataResult || [],
//             wasteSummary: wasteSummaryResult || [],
//             priceTrends: priceTrendsResult || [],
//             allVillages: allVillages || [],
//             topFamilies: topFamiliesResult || [],
//             filterInfo,
            
//             // Filter values
//             searchDate: searchDate || '',
//             searchMonth: searchMonth || '',
//             searchYear: searchYear || '',
//             villageId: village || '',
            
//             currentPage: 'dashboard'
//         });

//     } catch (err) {
//         console.error('Error in dashboardIndex:', err);
//         console.error('Stack trace:', err.stack);
        
//         // Default data สำหรับกรณี error
//         const defaultData = {
//             mytitle: 'แดชบอร์ด - เกิดข้อผิดพลาด',
//             totalQuantity: 0,
//             totalAmount: 0,
//             totalTransactions: 0,
//             todayTotal: 0,
//             todayPercentChange: 0,
//             transactionToday: 0,
//             transactionYesterday: 0,
//             transactionPercentChange: 0,
//             lastMonthTotal: 0,
//             lastMonthQuantity: 0,
//             highestWaste: null,
//             villageData: [],
//             wasteSummary: [],
//             priceTrends: [],
//             allVillages: [],
//             filterInfo: {
//                 searchDate: '',
//                 searchMonth: '',
//                 searchYear: '',
//                 village: '',
//                 villageName: ''
//             },
//             searchDate: '',
//             searchMonth: '',
//             searchYear: '',
//             villageId: '',
//             currentPage: 'dashboard',
//             errorMessage: 'เกิดข้อผิดพลาดในการโหลดข้อมูล กรุณาลองใหม่อีกครั้ง'
//         };
        
//         if (process.env.NODE_ENV === 'development') {
//             defaultData.error = {
//                 message: err.message,
//                 stack: err.stack
//             };
//         }
        
//         res.status(500).render('admin/dashboard', defaultData);
//     }
// };

// สื่อ

const dashboardIndex = async (req, res) => {
    try {
        const { village, searchDate, searchMonth, searchYear } = req.query;

        // ---- 1. กำหนดช่วงวันที่ ----
        let dateFilter = {};
        const now = new Date();

        if (searchDate) {
            const start = new Date(searchDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(searchDate);
            end.setHours(23, 59, 59, 999);
            dateFilter = { purchaseDate: { $gte: start, $lte: end } };
        } else if (searchMonth && searchYear) {
            const m = parseInt(searchMonth) - 1;
            const y = parseInt(searchYear);
            dateFilter = {
                purchaseDate: {
                    $gte: new Date(y, m, 1),
                    $lte: new Date(y, m + 1, 0, 23, 59, 59, 999)
                }
            };
        } else if (searchMonth) {
            const m = parseInt(searchMonth) - 1;
            const y = now.getFullYear();
            dateFilter = {
                purchaseDate: {
                    $gte: new Date(y, m, 1),
                    $lte: new Date(y, m + 1, 0, 23, 59, 59, 999)
                }
            };
        } else if (searchYear) {
            const y = parseInt(searchYear);
            dateFilter = {
                purchaseDate: {
                    $gte: new Date(y, 0, 1),
                    $lte: new Date(y, 11, 31, 23, 59, 59, 999)
                }
            };
        }

        // ---- 2. หา villages dropdown + filter village ----
        const allVillages = await Village.find({ isDeleted: false }).sort({ villageNumber: 1 });

        // ---- 3. filter accountId ตาม village (ถ้ามี) ----
        let accountIdFilter = null;
        if (village) {
            const familiesInVillage = await Family.find({ village, isDeleted: false }).select('_id');
            const familyIds = familiesInVillage.map(f => f._id);
            const accounts = await WasteBankAccount.find({ familyID: { $in: familyIds }, isDeleted: false }).select('_id');
            accountIdFilter = accounts.map(a => a._id);
        }

        // ---- 4. หา WastePurchase ตาม filter ----
        const purchaseQuery = { isDeleted: false, ...dateFilter };
        if (accountIdFilter) purchaseQuery.accountId = { $in: accountIdFilter };

        const allPurchases = await WastePurchase.find(purchaseQuery);

        // ---- 5. รวบรวม wasteItemIds ทั้งหมด ----
        const allWasteItemIds = allPurchases.flatMap(p => p.wasteItems);
        const allWasteItems = await WasteItem.find({ _id: { $in: allWasteItemIds } });

        // map ให้หา item เร็วขึ้น
        const wasteItemMap = {};
        for (const item of allWasteItems) {
            wasteItemMap[item._id.toString()] = item;
        }

        // ---- 6. คำนวณสถิติหลัก ----
        let totalQuantity = 0;
        let totalAmount = 0;
        const totalTransactions = allPurchases.length;

        for (const purchase of allPurchases) {
            for (const itemId of purchase.wasteItems) {
                const item = wasteItemMap[itemId.toString()];
                if (item) {
                    totalQuantity += item.quantity;
                    totalAmount += item.quantity * item.pricePerUnit;
                }
            }
        }

        // ---- 7. ยอดวันนี้ ----
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        const todayPurchases = await WastePurchase.find({
            isDeleted: false,
            purchaseDate: { $gte: todayStart, $lte: todayEnd }
        });
        const todayItemIds = todayPurchases.flatMap(p => p.wasteItems);
        const todayItems = await WasteItem.find({ _id: { $in: todayItemIds } });

        let todayTotal = 0;
        const transactionToday = todayPurchases.length;
        for (const item of todayItems) {
            todayTotal += item.quantity * item.pricePerUnit;
        }

        // selectedDateTotal = ยอดตาม filter ที่เลือก (ถ้าไม่ได้เลือกใช้ยอดวันนี้)
        const selectedDateTotal = (searchDate || searchMonth || searchYear) ? totalAmount : todayTotal;

        // ---- 8. สรุปตามประเภทขยะ (wasteSummary) ----
        const wasteSummaryMap = {};
        for (const purchase of allPurchases) {
            for (const itemId of purchase.wasteItems) {
                const item = wasteItemMap[itemId.toString()];
                if (!item) continue;
                const key = item.name;
                if (!wasteSummaryMap[key]) {
                    wasteSummaryMap[key] = { _id: key, totalQuantity: 0, totalAmount: 0 };
                }
                wasteSummaryMap[key].totalQuantity += item.quantity;
                wasteSummaryMap[key].totalAmount += item.quantity * item.pricePerUnit;
            }
        }
        const wasteSummary = Object.values(wasteSummaryMap)
            .sort((a, b) => b.totalAmount - a.totalAmount)
            .slice(0, 10);

        // ---- 9. ข้อมูลแยกตามหมู่บ้าน (villageData) ----
        // ต้องรู้ว่า purchase นั้นมาจากหมู่บ้านไหน
        // purchase -> accountId -> WasteBankAccount -> familyID -> Family -> village
        const allAccountIds = [...new Set(allPurchases.flatMap(p => p.accountId.map(id => id.toString())))];
        const allAccounts = await WasteBankAccount.find({ _id: { $in: allAccountIds } }).select('_id familyID');

        const accountFamilyMap = {};
        for (const acc of allAccounts) {
            accountFamilyMap[acc._id.toString()] = acc.familyID?.toString();
        }

        const allFamilyIds = [...new Set(Object.values(accountFamilyMap).filter(Boolean))];
        const allFamilies = await Family.find({ _id: { $in: allFamilyIds } }).select('_id village');

        const familyVillageMap = {};
        for (const fam of allFamilies) {
            familyVillageMap[fam._id.toString()] = fam.village?.toString();
        }

        const villageStatsMap = {};
        for (const purchase of allPurchases) {
            // หา villageId จาก accountId ตัวแรก
            const accId = purchase.accountId?.[0]?.toString();
            const famId = accId ? accountFamilyMap[accId] : null;
            const villageId = famId ? familyVillageMap[famId] : null;
            if (!villageId) continue;

            if (!villageStatsMap[villageId]) {
                villageStatsMap[villageId] = { villageId, totalQuantity: 0, totalAmount: 0, transactionCount: 0 };
            }
            villageStatsMap[villageId].transactionCount += 1;

            for (const itemId of purchase.wasteItems) {
                const item = wasteItemMap[itemId.toString()];
                if (item) {
                    villageStatsMap[villageId].totalQuantity += item.quantity;
                    villageStatsMap[villageId].totalAmount += item.quantity * item.pricePerUnit;
                }
            }
        }

        // ใส่ชื่อหมู่บ้าน
        const villageData = Object.values(villageStatsMap).map(stat => {
            const v = allVillages.find(v => v._id.toString() === stat.villageId);
            return {
                ...stat,
                villageName: v?.villageName || '',
                villageNumber: v?.villageNumber || ''
            };
        }).sort((a, b) => a.villageNumber - b.villageNumber);

        // ---- 10. Top 10 families ----
        // รวมยอดแต่ละ account จาก purchases ที่มีอยู่แล้ว
        const accountStats = {};
        for (const purchase of allPurchases) {
            const accId = purchase.accountId?.[0]?.toString();
            if (!accId) continue;

            if (!accountStats[accId]) {
                accountStats[accId] = { totalAmount: 0, totalQuantity: 0, transactionCount: 0 };
            }

            accountStats[accId].transactionCount += 1;

            for (const itemId of purchase.wasteItems) {
                const item = wasteItemMap[itemId.toString()];
                if (!item) continue;
                accountStats[accId].totalAmount   += item.quantity * item.pricePerUnit;
                accountStats[accId].totalQuantity += item.quantity;
            }
        }

        // เรียงและเอาแค่ top 10
        const top10 = Object.entries(accountStats)
            .sort((a, b) => b[1].totalAmount - a[1].totalAmount)
            .slice(0, 20);
        // top10 = [ [accId, { totalAmount, totalQuantity, transactionCount }], ... ]

        // ดึงข้อมูล Account และ Family ของ top 10
        const top10AccountIds = top10.map(([accId]) => accId);

        const top10Accounts = await WasteBankAccount.find({ _id: { $in: top10AccountIds } })
            .select('_id AccountNumber familyID');

        const top10FamilyIds = top10Accounts.map(acc => acc.familyID);

        const top10Families = await Family.find({ _id: { $in: top10FamilyIds } })
            .select('_id familyName Type');

        // รวมข้อมูลทั้งหมดเข้าด้วยกัน
        const topFamilies = top10.map(([accId, stats]) => {
            const acc = top10Accounts.find(a => a._id.toString() === accId);
            const fam = top10Families.find(f => f._id.toString() === acc?.familyID?.toString());

            return {
                accountNumber: acc?.AccountNumber || '',
                familyName:    fam?.familyName    || '',
                familyType:    fam?.Type          || '',
                totalAmount:      stats.totalAmount,
                totalQuantity:    stats.totalQuantity,
                transactionCount: stats.transactionCount,
            };
        }).filter(f => f.familyName !== '' && f.accountNumber !== '')
            .slice(0, 5);

        // ---- 11. ขยะราคาสูงสุด ----
        const highestWaste = await myWaste.findOne({ isDeleted: false }).sort({ pricePerUnit: -1 });

        // ---- 12. filterInfo ----
        const selectedVillage = allVillages.find(v => v._id.toString() === village);
        const filterInfo = {
            searchDate: searchDate || '',
            searchMonth: searchMonth || '',
            searchYear: searchYear || '',
            village: village || '',
            villageName: selectedVillage?.villageName || ''
        };

        // ---- Render ----
        res.render('admin/dashboard', {
            mytitle: 'ผู้ดูแลระบบ | แดชบอร์ด',
            totalQuantity,
            totalAmount,
            totalTransactions,
            todayTotal,
            selectedDateTotal,
            transactionToday,
            lastMonthTotal: 0,      // ถ้าต้องการเพิ่มทีหลังได้
            lastMonthQuantity: 0,
            highestWaste,
            villageData,
            wasteSummary,
            priceTrends: [],        // ถ้าต้องการเพิ่มทีหลังได้
            allVillages,
            topFamilies,
            filterInfo,
            searchDate: searchDate || '',
            searchMonth: searchMonth || '',
            searchYear: searchYear || '',
            villageId: village || '',
            currentPage: 'dashboard'
        });

    } catch (err) {
        console.error('Error in dashboardIndex:', err);
        res.status(500).render('admin/dashboard', {
            mytitle: 'แดชบอร์ด - เกิดข้อผิดพลาด',
            totalQuantity: 0, totalAmount: 0, totalTransactions: 0,
            todayTotal: 0, selectedDateTotal: 0, transactionToday: 0,
            lastMonthTotal: 0, lastMonthQuantity: 0,
            highestWaste: null, villageData: [], wasteSummary: [],
            priceTrends: [], allVillages: [], topFamilies: [],
            filterInfo: { searchDate: '', searchMonth: '', searchYear: '', village: '', villageName: '' },
            searchDate: '', searchMonth: '', searchYear: '', villageId: '',
            currentPage: 'dashboard',
            errorMessage: 'เกิดข้อผิดพลาดในการโหลดข้อมูล'
        });
    }
};

const mediaIndex = (req, res) => {
    const filter = { isDeleted: false };
    myMedia.find(filter).sort({ createdAt: -1 })                
        .then((result) => {
                    result.forEach(item => {
                        item.formattedDate = moment(item.createdAt).format('YYYY-MM-DD');
                    });
                    res.render('admin/media', { 
                        mytitle: 'Admindashboard | Media', 
                        media: result,
                        currentPage: 'media',
                    });
                })
                .catch((err) => {
                    console.log(err);
                    res.status(500).send('Internal Server Error');
                });
};
// เพิ่มสื่อ (ป้องกันเพิ่มสื่อซ้ำ)
const mediaPost = async (req, res) => {
    try {
        const { title, youtubeUrl } = req.body;

        if (!youtubeUrl || !youtubeUrl.includes('youtube.com/watch?v=')) {
            return res.status(400).redirect('/admin/media?error=URL ไม่ถูกต้อง');
        }

        const existingMedia = await myMedia.findOne({ 
            isDeleted: false, 
            $or: [{ title }, { youtubeUrl }] 
        });

        if (existingMedia) {
            return res.status(400).redirect('/admin/media?error=มีสื่อนี้อยู่แล้ว');
        }

        const media = new myMedia({
            title: title || 'Untitled',
            youtubeUrl
        });

        await media.save();
        console.log('Media saved successfully:', media);
        res.redirect('/admin/media?message=เพิ่มสื่อความรู้สำเร็จ');
    } catch (err) {
        console.error('Error saving media:', err);
        res.status(500).redirect('/admin/media?error=เพิ่มสื่อความรู้ไม่สำเร็จ');
    }
};
// ลบสื่อ (softDelete)
const mediaDelete = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await myMedia.findByIdAndUpdate(id,{ isDeleted: true});

        if (!result) {
            return res.status(404).redirect('/admin/media?message=ไม่พบข้อมูลสื่อความรู้ที่ต้องการลบ');
        }
        res.redirect('/admin/media?message=ลบสื่อความรู้สำเร็จ');
    } catch (err) {
        console.error('Error deleting media:', err);
        res.status(500).redirect('/admin/media?message=เกิดข้อผิดพลาดในการลบข้อมูลสื่อความรู้');
    }
};
// แก้ไขสื่อ
const mediaEdit = (req, res) => {
    const { title, youtubeUrl } = req.body;
    const mediaId = req.params.id;

    myMedia.findByIdAndUpdate(mediaId, { title, youtubeUrl })
        .then(result => {
            res.redirect('/admin/media?message=แก้ไขสื่อความรู้สำเร็จ');
            
        })
        .catch(err => {
            console.log(err);
            res.status(500).redirect('/admin/media?error=แก้ไขสื่อความรู้ไม่สำเร็จ');
        });
};


// ข่าวสาร
const newsIndex = async (req, res) => {
    try {
        const filter = { isDeleted: false };

        // ดึงข่าวทั้งหมด
        const newsList = await myNews.find(filter).sort({ createdAt: -1 })  

        // ดึง username ของผู้เขียนทั้งหมด
        const adminUsernames = newsList.map(p => p.newsAuthor);

        // หา admin ที่ตรงกับ username
        const admins = await MyAdmin.find({ username: { $in: adminUsernames } });

        // ทำเป็น map: { username: "Firstname Lastname" }
        const adminMap = {};
        admins.forEach(a => {
            adminMap[a.username] = `${a.firstname} ${a.lastname}`;
        });

        // เขียนทับ newsAuthor เป็น fullname ไปเลย
        newsList.forEach(item => {
            item.newsAuthor = adminMap[item.newsAuthor] || item.newsAuthor;
            item.formattedDate = moment(item.createdAt).format('YYYY-MM-DD');
        });

        res.render('admin/news', { 
            mytitle: 'Admindashboard | News', 
            news: newsList,
            currentPage: 'news',
        });

    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
};


const uploadNews = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: function (req, file, cb) {
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only PDF and image files are allowed!'), false);
        }
    }
}).single('newsFile');


const uploadFileToCloudinary = (fileBuffer, mimeType, folderName = 'news_files') => {
    const isPDF = mimeType === 'application/pdf';

    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                folder: folderName,
                resource_type: isPDF ? 'raw' : 'image',
                // ✅ ลบ format: isPDF ? 'pdf' : undefined ออก
                type: 'upload',
                access_mode: 'public'
            },
            (error, result) => {
                if (result) resolve(result);
                else reject(error);
            }
        );
        streamifier.createReadStream(fileBuffer).pipe(stream);
    });
};

const newsPost = async (req, res) => {
    uploadNews(req, res, async (err) => {
        if (err) {
            console.error('Error uploading file:', err);
            if (err instanceof multer.MulterError) {
                return res.status(400).redirect('/admin/media?error=File upload failed');
            } else {
                return res.status(400).redirect('/admin/media?error=Invalid file type');
            }
        }

        try {
            const { newsTitle, newsDescription, newsAuthor } = req.body;

            let fileNews = '/img/no_PDF.pdf';

            if (req.file) {
                const result = await uploadFileToCloudinary(req.file.buffer, req.file.mimetype);
                fileNews = result.secure_url;
            }

            const newNews = new myNews({
                newsTitle,
                newsDescription,
                newsAuthor,
                newsFile: fileNews,
            });
            await newNews.save();

            res.redirect('/admin/news?message=เพิ่มข่าวสารสำเร็จ');
        } catch (error) {
            console.error('Error saving news:', error);
            res.status(500).send({ error: 'Failed to save news', details: error.message });
            res.status(500).redirect('/admin/news?error=เพิ่มข่าวสารไม่สำเร็จ');
        }
    });
};

const uploadNewsEdit = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: function (req, file, cb) {
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only PDF and image files are allowed!'), false);
        }
    }
}).single('newsEditFile');

const newsEdit = async (req, res) => {
    uploadNewsEdit(req, res, async (err) => {
        if (err) {
            console.error('Error uploading file:', err);
            if (err instanceof multer.MulterError) {
                return res.status(400).send({ error: 'File upload failed', details: err.message });
            } else {
                return res.status(400).send({ error: 'Invalid file type', details: err.message });
            }
        }

        try {
            const { newsEditTitle, newsEditDescription, newsEditAuthor } = req.body;
            const newsId = req.params.id;

            const news = await myNews.findById(newsId);
            if (!news) {
                return res.status(404).send({ error: 'News not found' });
            }

            let fileNews = news.newsFile; // ค่าเริ่มต้น = ไฟล์เดิม

            // ถ้ามีการอัปโหลดไฟล์ใหม่
            if (req.file) {
                const result = await uploadFileToCloudinary(req.file.buffer, req.file.mimetype);
                fileNews = result.secure_url;
            }

            // อัปเดตข้อมูล
            news.newsTitle = newsEditTitle || news.newsTitle;
            news.newsDescription = newsEditDescription || news.newsDescription;
            news.newsAuthor = newsEditAuthor || news.newsAuthor;
            news.newsFile = fileNews;

            await news.save();

            res.redirect('/admin/news?message=แก้ไขข่าวสารสำเร็จ');
        } catch (error) {
            console.error('Error updating news:', error);
            res.status(500).send({ error: 'Failed to update news', details: error.message });
        }
    });
};

const deleteNews = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await myNews.findByIdAndUpdate(id, { isDeleted: true });

        if (!result) {
            console.log(`News with ID ${id} not found.`);
            return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลที่ต้องการลบ' });
        }

        res.status(200).json({ success: true, message: 'ลบข่าวสำเร็จ (Soft Delete)' });
    } catch (err) {
        console.error('Error deleting news:', err);
        res.status(500).json({ success: false, message: 'ลบข่าวไม่สำเร็จ' });
    }
};


// สำหรับเก็บรูปภาพที่อัปโหลดจาก activity
// const storage = multer.diskStorage({
//     destination: './public/uploads/activity/',
//     filename: function (req, file, cb) {
//         cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
//     }
// });

// const upload = multer({
//     storage,
//     limits: { fileSize: 50 * 1024 * 1024 }
// }).single('img');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }
}).array('img', 10); // รับได้สูงสุด 10 รูป

// กิจกรรม
const activityIndex = (req, res) => {
    const filter = { isDeleted: false };
    myActivity.find(filter).sort({ createdAt: -1 }) 
        .then((result) => {
                    result.forEach(item => {
                        item.formattedDate = moment(item.createdAt).format('YYYY-MM-DD');
                    });
                    res.render('admin/activity', { 
                        mytitle: 'Admindashboard | Activity', 
                        activity: result,
                        currentPage: 'activity',
                    });
                })
                .catch((err) => {
                    console.log(err);
                    res.status(500).send('เกิดข้อผิดพลาดในการดึงข้อมูล');
                });
};

//เพิ่มกิจกรรม (ป้องกันเพิ่มกิจกรรมซ้ำ)
const activityPost = (req, res) => {
    upload(req, res, async (err) => {
        if (err) {
            console.error('Error uploading file:', err);
            return res.status(400).send({ error: 'File upload failed', details: err });
        }
        try {
            const { title, content } = req.body; // แก้ไข: เพิ่ม content ใน destructuring
            // ตรวจสอบว่ามีกิจกรรมที่มี title และ content ซ้ำกันหรือไม่ (กรณีต้องการให้เนื้อหาไม่ซ้ำด้วย)
            const existingActivity = await myActivity.findOne({ 
                title: title, 
                isDeleted: false 
            });
            if (existingActivity) {
                return res.status(400).redirect('/admin/activity?error=มีกิจกรรมนี้อยู่แล้ว');
            }

            let imageUrls = [];

            if (req.files && req.files.length > 0) {
                const uploadPromises = req.files.map(file => {
                    return new Promise((resolve, reject) => {
                        const stream = cloudinary.uploader.upload_stream(
                            { folder: 'activity_images', resource_type: 'image' },
                            (error, result) => {
                                if (result) resolve(result.secure_url);
                                else reject(error);
                            }
                        );
                        streamifier.createReadStream(file.buffer).pipe(stream);
                    });
                });

                imageUrls = await Promise.all(uploadPromises);
            }

            const activity = new myActivity({ title, content, img: imageUrls });

            await activity.save();
            console.log('Activity saved successfully:', activity);
            res.redirect('/admin/activity?message=เพิ่มกิจกรรมสำเร็จ');
        } catch (err) {
            console.error('Error saving activity:', err);
            res.status(500).redirect('/admin/activity?error=เพิ่มกิจกรรมไม่สำเร็จ');
        }
    });
};

// ลบกิจกรรม (softDelete)
const deleteActivity = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await myActivity.findByIdAndUpdate(id, { isDeleted: true });

        if (!result) {
            return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลที่ต้องการลบ' });
        }

        res.status(200).json({ success: true, message: 'ลบกิจกรรมสำเร็จ' });
    } catch (err) {
        console.error('Error deleting activity:', err);
        res.status(500).json({ success: false, message: 'ลบกิจกรรมไม่สำเร็จ' });
    }
};
// แก้ไขกิจกรรม
const activityEdit = async (req, res) => {
    upload(req, res, async (err) => {
        if (err) return res.status(400).send('เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ');

        try {
            const { title, content, existingImages } = req.body;
            const activityId = req.params.id;

            const activity = await myActivity.findById(activityId);
            if (!activity) return res.status(404).redirect('/admin/activity?error=ไม่พบกิจกรรม');

            let keptImages = [];
            if (existingImages) {
                try {
                    keptImages = JSON.parse(existingImages);
                } catch { keptImages = []; }
            }

            let newImageUrls = [];
            if (req.files && req.files.length > 0) {
                const uploadPromises = req.files.map(file => new Promise((resolve, reject) => {
                    const stream = cloudinary.uploader.upload_stream(
                        { folder: 'activity_images', resource_type: 'image' },
                        (error, result) => result ? resolve(result.secure_url) : reject(error)
                    );
                    streamifier.createReadStream(file.buffer).pipe(stream);
                }));
                newImageUrls = await Promise.all(uploadPromises);
            }

            activity.title = title || activity.title;
            activity.content = content || activity.content;
            activity.img = [...keptImages, ...newImageUrls];

            await activity.save();
            res.redirect('/admin/activity?message=แก้ไขกิจกรรมสำเร็จ');

        } catch (error) {
            console.error('Error updating activity:', error);
            res.status(500).redirect('/admin/activity?error=แก้ไขกิจกรรมไม่สำเร็จ');
        }
    });
};


// สำหรับเก็บรูปภาพที่อัปโหลดจาก waste
// const storage2 = multer.diskStorage({
//     destination: './public/upload_imgwaste',
//     filename: function (req, file, cb) {
//         cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
//     }
// });
// const storage2 = new CloudinaryStorage({
//     cloudinary: cloudinary,
//     params: {
//         folder: 'waste_images',   // ชื่อโฟลเดอร์ใน Cloudinary
//         allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
//         public_id: (req, file) => {
//         return 'waste-' + Date.now();
//         }
//     }
// });

const upload2 = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }
}).single('img');

// ขยะ
const wasteIndex = (req, res) => {
    const filter = { isDeleted: false };

    Promise.all([
        myWaste.find(filter).populate('wasteType', 'wasteTypeName'),
        myWasteType.find({ isDeleted: false })
    ])
    .then(([wasteData, wasteTypeData]) => {

        res.render('admin/waste', {
            mytitle: 'Admindashboard | Waste',
            waste: wasteData,
            wasteTypes: wasteTypeData,
            currentPage: 'waste',
        });
    })
    .catch((err) => {
        console.log(err);
        res.status(500).send('Internal Server Error');
    });
};
// เพิ่มขยะ (ป้องกันเพิ่มขยะซ้ำ)
const wastePost = async (req, res) => {
    upload2(req, res, async (err) => {
        if (err) {
        console.error(err);
        return res.status(400).send('เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ');
        }

        const { wasteName, pricePerUnit, wasteType } = req.body;

        if (!wasteName || !pricePerUnit || !wasteType) {
        return res.status(400).send('กรุณากรอกข้อมูลให้ครบถ้วน');
        }

        try {
        // ตรวจสอบขยะซ้ำ
        const existingWaste = await myWaste.findOne({ wasteName });
        if (existingWaste) {
            return res.redirect('/admin/waste?error=ขยะนี้มีอยู่แล้ว');
        }

        // ตรวจสอบประเภทขยะ
        const wasteTypeDoc = await myWasteType.findById(wasteType);
        if (!wasteTypeDoc) {
            return res.status(400).send('ประเภทขยะไม่ถูกต้อง');
        }

        let imageUrl = null;

        // ถ้ามีการอัปโหลดรูป
        if (req.file) {
            const uploadFromBuffer = () => {
            return new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                {
                    folder: 'waste_images',
                    resource_type: 'image'
                },
                (error, result) => {
                    if (result) resolve(result);
                    else reject(error);
                }
                );

                streamifier.createReadStream(req.file.buffer).pipe(stream);
            });
            };

            const result = await uploadFromBuffer();
            imageUrl = result.secure_url; // URL รูปจาก Cloudinary
        }

        const newWaste = new myWaste({
            wasteName,
            pricePerUnit: parseFloat(pricePerUnit),
            wasteType,
            img: imageUrl
        });

        await newWaste.save();

        res.redirect('/admin/waste?message=เพิ่มขยะสำเร็จ');

        } catch (error) {
        console.error(error);
        res.redirect('/admin/waste?error=เกิดข้อผิดพลาดในระบบ');
        }
    });
};
// ลบขยะ (softDelete)
const wasteDelete = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await myWaste.findByIdAndUpdate(id, { isDeleted: true });

        if (!result) {
            return res.status(404).redirect('/admin/waste?error=ไม่พบข้อมูลขยะที่ต้องการลบ');
        }
        res.redirect('/admin/waste?message=ลบขยะสำเร็จ');
    } catch (err) {
        console.error('Error deleting Waste:', err);
        res.status(500).redirect('/admin/waste?error=เกิดข้อผิดพลาดในการลบข้อมูลผู้ใช้');
    }
};
// แก้ไขขยะ
const wasteEdit = async (req, res) => {
    upload2(req, res, async (err) => {
        if (err) {
            console.error('Error in file upload:', err);
            return res.status(400).send('เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ');
        }

        const { _id, wasteName, pricePerUnit, wasteType } = req.body;

        if (!_id || !wasteName || !pricePerUnit || !wasteType) {
            return res.status(400).send('กรุณากรอกข้อมูลให้ครบถ้วน');
        }

        try {
            const waste = await myWaste.findById(_id);

            if (!waste) {
                return res.status(404).send('ไม่พบข้อมูลขยะที่ต้องการแก้ไข');
            }

            // อัปโหลดรูปใหม่ (ถ้ามี)
            let imageUrl = waste.img;

            if (req.file) {
                const uploadFromBuffer = () => {
                    return new Promise((resolve, reject) => {
                        const stream = cloudinary.uploader.upload_stream(
                            {
                                folder: 'waste_images',
                                resource_type: 'image'
                            },
                            (error, result) => {
                                if (result) resolve(result);
                                else reject(error);
                            }
                        );

                        streamifier
                            .createReadStream(req.file.buffer)
                            .pipe(stream);
                    });
                };

                const result = await uploadFromBuffer();
                imageUrl = result.secure_url;
            }

            const newPrice = parseFloat(pricePerUnit);
            const oldPrice = waste.pricePerUnit;

            // อัปเดตข้อมูลขยะ
            waste.wasteName = wasteName;
            waste.pricePerUnit = newPrice;
            waste.wasteType = wasteType;
            waste.img = imageUrl;

            await waste.save();

            // คำนวณการเปลี่ยนแปลงราคา
            let percentChange = null;
            let changeDirection = 'none';
            let changeText = 'ราคาไม่เปลี่ยนแปลง';

            if (oldPrice !== 0 && oldPrice !== newPrice) {
                percentChange = ((newPrice - oldPrice) / oldPrice) * 100;
                changeDirection = percentChange > 0 ? 'up' : 'down';
                const absPercent = Math.abs(percentChange).toFixed(2);

                changeText =
                    changeDirection === 'up'
                        ? `📈 <span class="text-green-600">ราคาเพิ่มขึ้น ${absPercent}%</span>`
                        : `📉 <span class="text-red-600">ราคาลดลง ${absPercent}%</span>`;
            }

            // บันทึกประวัติราคา
            const priceLog = new WastePriceHistory({
                wasteId: waste._id,
                pricePerUnit: newPrice,
                percentChange,
                changeDirection,
                location: 'ขอนแก่น'
            });

            await priceLog.save();

            // แจ้งเตือนสมาชิกทุกครอบครัว
            const allFamilies = await WasteBankAccount.find({}, 'familyID');

            const notifications = allFamilies.map(family => ({
                userId: family.familyID,
                type: 'price_update',
                title: `อัปเดตราคาขยะ: ${wasteName}`,
                content: `
                    <div>
                        <p><strong>ประเภทขยะ:</strong> ${wasteName}</p>
                        <p><strong>ราคาเดิม:</strong> 💰${oldPrice.toFixed(2)} บาท</p>
                        <p><strong>ราคาปัจจุบัน:</strong> 💰${newPrice.toFixed(2)} บาท</p>
                        <p>${changeText}</p>
                    </div>
                `,
            }));

            if (notifications.length > 0) {
                await Notification.insertMany(notifications);
                console.log(`✅ Created ${notifications.length} price update notifications`);
            }

            console.log('Waste updated successfully');
            res.redirect('/admin/waste?message=แก้ไขข้อมูลขยะสำเร็จ');

        } catch (error) {
            console.error('Error updating waste:', error);
            res.redirect('/admin/waste?error=เกิดข้อผิดพลาดในระบบ');
        }
    });
};
//แก้ไขราคาขยะแบบกลุ่ม (เพิ่ม/ตั้งราคาใหม่)
const wasteBulkPriceUpdate = async (req, res) => {
    try {
        const { items, adjustType, adjustValue } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({ success: false, message: 'ไม่มีรายการที่เลือก' });
        }

        const value = parseFloat(adjustValue);
        if (isNaN(value)) {
            return res.status(400).json({ success: false, message: 'ค่าที่กรอกไม่ถูกต้อง' });
        }

        const allFamilies = await WasteBankAccount.find({}, 'familyID');
        const notifications = [];
        const priceLogs = [];

        for (const item of items) {
            const waste = await myWaste.findById(item.id);
            if (!waste) continue;

            const oldPrice = waste.pricePerUnit;
            const newPrice = adjustType === 'add'
                ? Math.max(0, oldPrice + value)
                : Math.max(0, value);

            waste.pricePerUnit = newPrice;
            await waste.save();

            // บันทึก price history
            const percentChange = oldPrice !== 0 ? ((newPrice - oldPrice) / oldPrice) * 100 : null;
            const changeDirection = newPrice > oldPrice ? 'up' : newPrice < oldPrice ? 'down' : 'none';

            priceLogs.push({
                wasteId: waste._id,
                pricePerUnit: newPrice,
                percentChange,
                changeDirection,
                location: 'ขอนแก่น'
            });

            // เตรียม notification
            const changeText = changeDirection === 'up'
                ? `📈 <span style="color:green">ราคาเพิ่มขึ้น ${Math.abs(percentChange).toFixed(2)}%</span>`
                : changeDirection === 'down'
                ? `📉 <span style="color:red">ราคาลดลง ${Math.abs(percentChange).toFixed(2)}%</span>`
                : 'ราคาไม่เปลี่ยนแปลง';

            allFamilies.forEach(family => {
                notifications.push({
                    userId: family.familyID,
                    type: 'price_update',
                    title: `อัปเดตราคาขยะ: ${waste.wasteName}`,
                    content: `
                        <div>
                            <p><strong>ประเภทขยะ:</strong> ${waste.wasteName}</p>
                            <p><strong>ราคาเดิม:</strong> 💰${oldPrice.toFixed(2)} บาท</p>
                            <p><strong>ราคาปัจจุบัน:</strong> 💰${newPrice.toFixed(2)} บาท</p>
                            <p>${changeText}</p>
                        </div>
                    `
                });
            });
        }

        // bulk insert
        if (priceLogs.length > 0) await WastePriceHistory.insertMany(priceLogs);
        if (notifications.length > 0) await Notification.insertMany(notifications);

        res.json({ success: true, message: `อัปเดต ${items.length} รายการสำเร็จ` });

    } catch (err) {
        console.error('Bulk price update error:', err);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในระบบ' });
    }
};

// ประเภทขยะ
const wasteTypeIndex = async function (req, res, next) {
    try {
        const search = req.query.search || ''; // รับค่าการค้นหาจาก query string
        const page = parseInt(req.query.page) || 1; // รับค่าหน้าปัจจุบันจาก query string
        const limit = 10; // จำนวนข้อมูลที่จะแสดงต่อหน้า
        const startIndex = (page - 1) * limit;

        // กำหนดค่า filter เพื่อแสดงเฉพาะข้อมูลที่ isDeleted: false
        let filter = { isDeleted: false };

        // ถ้ามีค่าค้นหา ให้เพิ่มเงื่อนไขการค้นหาเข้าไป
        if (search) {
            filter = {
                ...filter, // คงค่า isDeleted: false ไว้
                $or: [
                    { wasteTypeName: { $regex: search, $options: 'i' } }, // ค้นหาชื่อประเภทขยะ
                ],
            };
        }

        const totalDocuments = await myWasteType.countDocuments(filter); // นับจำนวนเอกสารทั้งหมดที่ตรงกับเงื่อนไข
        const wasteTypeList = await myWasteType
            .find(filter)
            .sort({ createdAt: 1 }) // เรียงตามวันที่สร้าง
            .skip(startIndex)
            .limit(limit);

        res.render('admin/wasteType', {
            mytitle: 'Admindashboard | WasteType',
            wastetype: wasteTypeList,
            currentPage: page,
            totalPages: Math.ceil(totalDocuments / limit),
            search, // ส่งค่าการค้นหาปัจจุบันกลับไป
            currentPage: 'wasteType',
        });
    } catch (err) {
        console.error('Error fetching WasteType:', err);
        res.status(500).send('เกิดข้อผิดพลาดในระบบ');
    }
};
// เพิ่มประเภทขยะ (ป้องกันเพิ่มประเภทขยะซ้ำ)
const wasteTypePost = async (req, res) => {
    try {
        console.log('Request Body:', req.body);

        const { wasteTypeName,colorTheme } = req.body;

        if (!wasteTypeName || wasteTypeName.trim() === '') {
            console.log('Missing required fields');
            return res.status(400).send('กรุณากรอกข้อมูลชื่อประเภทขยะ');
        }

        const existingWasteType = await myWasteType.findOne({ wasteTypeName: wasteTypeName.trim() });
        if (existingWasteType) {
            console.log('Duplicate wasteTypeName:', wasteTypeName);
            return res.redirect('/admin/wasteType?error=ชื่อประเภทขยะนี้มีอยู่ในระบบแล้ว');
        }

        const wasteType = new myWasteType({ wasteTypeName: wasteTypeName.trim(), colorTheme: colorTheme });
        const result = await wasteType.save();
        console.log('WasteType saved successfully:', result);

        res.redirect('/admin/wasteType?message=เพิ่มประเภทขยะสำเร็จ');
    } catch (err) {
        console.error('Error saving WasteType:', err);
        res.redirect('/admin/wasteType?error=เกิดข้อผิดพลาดในระบบ')
    }
};
// แก้ไขประเภทขยะ
const wasteTypeEdit = async (req, res) => {
    try {
        const { _id, wasteTypeName, colorTheme } = req.body;
        if (!_id || !wasteTypeName) {
            return res.status(400).redirect('/admin/wasteType?error=ข้อมูลไม่ครบถ้วน');
        }
        const updatedWasteType = await myWasteType.findByIdAndUpdate(
            _id,
            {
                wasteTypeName: wasteTypeName.trim(),
                colorTheme: colorTheme
            },
            { new: true }
        );
        if (!updatedWasteType) {
            return res.status(404).redirect('/admin/wasteType?error=ไม่พบข้อมูลประเภทขยะที่ต้องการอัปเดต');
        }
        res.redirect('/admin/wasteType?message=แก้ไขประเภทขยะสำเร็จ');
    } catch (error) {
        console.error("Error editing waste type:", error);
        res.status(500).redirect('/admin/wasteType?error=เกิดข้อผิดพลาดในการแก้ไขประเภทขยะ');
    }
};
// ลบประเภทขยะ (softDelete)
const wasteTypeDelete = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await myWasteType.findByIdAndUpdate(id , { isDeleted : true});

        if (!result) {
            return res.status(404).redirect('/admin/wasteType?message=ไม่พบข้อมูลประเภทขยะที่ต้องการลบ');
        }
        res.redirect('/admin/wasteType?message=ลบประเภทขยะสำเร็จ');
    } catch (err) {
        console.error('Error deleting WasteType:', err);
        res.status(500).redirect('/admin/wasteType?message=เกิดข้อผิดพลาดในการลบข้อมูลประเภทขยะ');
    }
};


//หน้าสต๊อกขยะ (เพิ่ม filter เดือน/ปี) - Fixed Version
// const wasteStockIndex = async (req, res) => {
//     const villageId = req.query.villageId || null;
//     const wasteName = req.query.name || null;
//     const selectedMonth = req.query.month || null; // YYYY-MM format
//     const selectedYear = req.query.year || null;

//     try {
//         console.log('Starting wasteStockIndex with params:', { villageId, wasteName, selectedMonth, selectedYear });

//         const matchCondition = { isDeleted: false };

//         // เพิ่ม date filter
//         if (selectedMonth) {
//             const [year, month] = selectedMonth.split('-');
//             const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
//             const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
//             matchCondition.purchaseDate = { $gte: startDate, $lte: endDate };
//             console.log('Date filter (month):', { startDate, endDate });
//         } else if (selectedYear) {
//             const startDate = new Date(parseInt(selectedYear), 0, 1);
//             const endDate = new Date(parseInt(selectedYear), 11, 31, 23, 59, 59);
//             matchCondition.purchaseDate = { $gte: startDate, $lte: endDate };
//             console.log('Date filter (year):', { startDate, endDate });
//         }

//         console.log('Match condition:', matchCondition);

//         // Pipeline แบบ step by step เพื่อ debug ง่าย
//         const pipeline = [
//             { $match: matchCondition }
//         ];

//         // ตรวจสอบว่ามีข้อมูล purchase ไหม
//         const purchaseCount = await WastePurchase.countDocuments(matchCondition);
//         console.log('Purchase count after date filter:', purchaseCount);

//         if (purchaseCount === 0) {
//             console.log('No purchases found, returning empty data');
//             return res.render('admin/wasteStock', {
//                 mytitle: 'สต๊อกขยะ',
//                 stockData: [],
//                 selectedVillageId: villageId,
//                 villages: await Village.find({ isDeleted: false }).sort({ villageNumber: 1 }) || [],
//                 searchName: wasteName,
//                 selectedMonth: selectedMonth,
//                 selectedYear: selectedYear,
//                 monthlyOptions: []
//             });
//         }

//         // Join WasteBankAccount
//         pipeline.push(
//             {
//                 $lookup: {
//                     from: 'wastebankaccounts',
//                     localField: 'accountId',
//                     foreignField: '_id',
//                     as: 'accountInfo'
//                 }
//             },
//             {
//                 $addFields: {
//                     accountInfo: {
//                         $ifNull: [
//                             { $arrayElemAt: ['$accountInfo', 0] },
//                             {
//                                 _id: '$accountId',
//                                 accountNumber: 'DELETED',
//                                 familyID: null,
//                                 isDeleted: true
//                             }
//                         ]
//                     }
//                 }
//             }
//         );

//         // Join Family
//         pipeline.push(
//             {
//                 $lookup: {
//                     from: 'families',
//                     localField: 'accountInfo.familyID',
//                     foreignField: '_id',
//                     as: 'familyInfo'
//                 }
//             },
//             {
//                 $addFields: {
//                     familyInfo: {
//                         $ifNull: [
//                             { $arrayElemAt: ['$familyInfo', 0] },
//                             {
//                                 _id: '$accountInfo.familyID',
//                                 familyNumber: 'DELETED',
//                                 village: null,
//                                 isDeleted: true
//                             }
//                         ]
//                     }
//                 }
//             }
//         );

//         // ถ้าเลือกหมู่บ้าน
//         if (villageId) {
//             try {
//                 const villageObjectId = new mongoose.Types.ObjectId(villageId);
//                 pipeline.push({
//                     $match: { 'familyInfo.village': villageObjectId }
//                 });
//                 console.log('Added village filter:', villageId);
//             } catch (villageError) {
//                 console.error('Invalid village ID:', villageId);
//                 // ถ้า villageId ผิด format ให้ skip filter นี้
//             }
//         }

//         // Join WasteItem - ปรับปรุงให้ handle array properly
//         pipeline.push(
//             {
//                 $lookup: {
//                     from: 'wasteitems',
//                     localField: 'wasteItems',
//                     foreignField: '_id',
//                     as: 'wasteItemDetails'
//                 }
//             },
//             {
//                 $match: {
//                     'wasteItemDetails': { $ne: [] } // มี waste items
//                 }
//             },
//             { $unwind: '$wasteItemDetails' }
//         );

//         // Join กับ Waste model
//         pipeline.push(
//             {
//                 $lookup: {
//                     from: 'wastes',
//                     localField: 'wasteItemDetails.wasteId',
//                     foreignField: '_id',
//                     as: 'currentWasteInfoById'
//                 }
//             },
//             {
//                 $lookup: {
//                     from: 'wastes',
//                     localField: 'wasteItemDetails.name',
//                     foreignField: 'wasteName',
//                     as: 'currentWasteInfoByName'
//                 }
//             },
//             {
//                 $addFields: {
//                     // ใช้ผลจาก Id ก่อน ถ้าไม่เจอค่อยใช้ Name (fallback สำหรับข้อมูลเก่า)
//                     currentWasteInfo: {
//                         $cond: {
//                             if: { $gt: [{ $size: '$currentWasteInfoById' }, 0] },
//                             then: '$currentWasteInfoById',
//                             else: '$currentWasteInfoByName'
//                         }
//                     }
//                 }
//             },
//             {
//                 $addFields: {
//                     purchaseMonth: { 
//                         $dateToString: { 
//                             format: "%Y-%m", 
//                             date: "$purchaseDate",
//                             timezone: "Asia/Bangkok"
//                         } 
//                     },
//                     purchaseYear: { $year: "$purchaseDate" },
//                     wasteQuantity: { $ifNull: ['$wasteItemDetails.quantity', 0] },
//                     wastePricePerUnit: { $ifNull: ['$wasteItemDetails.pricePerUnit', 0] },
//                     currentPricePerUnit: {
//                         $ifNull: [{ $arrayElemAt: ['$currentWasteInfo.pricePerUnit', 0] }, 0]
//                     }
//                 }
//             }
//         );

//         // ถ้าใส่ชื่อขยะ
//         if (wasteName && wasteName.trim() !== '') {
//             pipeline.push({
//                 $match: {
//                     $or: [
//                         // ค้นจากชื่อตอนซื้อ (snapshot)
//                         { 
//                             'wasteItemDetails.name': { 
//                                 $regex: wasteName.trim(), 
//                                 $options: 'i' 
//                             }
//                         },
//                         // ค้นจากชื่อปัจจุบันใน Waste collection
//                         { 
//                             'currentWasteInfo.wasteName': { 
//                                 $regex: wasteName.trim(), 
//                                 $options: 'i' 
//                             }
//                         }
//                     ]
//                 }
//             });
//         }

//         // Group แบบใหม่ - แยกตาม wasteName และ เดือน
//         pipeline.push(
//             {
//                 $group: {
//                     _id: {
//                         // ถ้าไม่มี wasteId ให้ใช้ชื่อแทน (ข้อมูลเก่า)
//                         wasteId: {
//                             $ifNull: ['$wasteItemDetails.wasteId', '$wasteItemDetails.name']
//                         },
//                         month: '$purchaseMonth'
//                     },
//                     wasteName: { $first: '$wasteItemDetails.name' },
//                     currentWasteName: { $first: { $arrayElemAt: ['$currentWasteInfo.wasteName', 0] } },
//                     totalQuantityKg: { $sum: '$wasteQuantity' },
//                     avgPriceInMonth: { $avg: '$wastePricePerUnit' },
//                     monthlyAmount: { 
//                         $sum: { $multiply: ['$wasteQuantity', '$wastePricePerUnit'] } 
//                     },
//                     currentPrice: { $first: '$currentPricePerUnit' },
//                     currentMonthlyValue: { 
//                         $sum: { $multiply: ['$wasteQuantity', '$currentPricePerUnit'] } 
//                     },
//                     purchaseCount: { $sum: 1 },
//                     purchaseDates: { $push: '$purchaseDate' }
//                 }
//             },

//             // group สอง - ใช้ wasteId   Group อีกครั้งเพื่อรวมทุกเดือนของแต่ละประเภทขยะ
//             {
//                 $group: {
//                     _id: '$_id.wasteId',
//                     displayName: { $first: '$currentWasteName' },
//                     snapshotName: { $first: '$wasteName' },
//                     totalQuantityKg: { $sum: '$totalQuantityKg' },
//                     historicalTotalAmount: { $sum: '$monthlyAmount' },
//                     currentTotalAmount: { $sum: '$currentMonthlyValue' },
//                     totalMonthlyAmount: { $sum: '$monthlyAmount' },
//                     totalMonthlyQuantity: { $sum: '$totalQuantityKg' },
//                     currentPrice: { $first: '$currentPrice' },
//                     purchaseCount: { $sum: '$purchaseCount' },
//                     lastUpdated: { $max: { $max: '$purchaseDates' } },
//                     monthlyBreakdown: {
//                         $push: {
//                             month: '$_id.month',
//                             quantity: '$totalQuantityKg',
//                             avgPrice: '$avgPriceInMonth',
//                             amount: '$monthlyAmount',
//                             currentValue: '$currentMonthlyValue',
//                             purchases: '$purchaseCount'
//                         }
//                     }
//                 }
//             },
            
//             {
//                 $addFields: {
//                     // คำนวณราคาเฉลี่ยแบบ weighted average
//                     avgHistoricalPrice: {
//                         $cond: {
//                             if: { $gt: ['$totalQuantityKg', 0] },
//                             then: {
//                                 $divide: ['$totalMonthlyAmount', '$totalQuantityKg']
//                             },
//                             else: 0
//                         }
//                     },
//                     pricePerKg: { $ifNull: ['$currentPrice', 0] },
//                     totalAmount: { $ifNull: ['$historicalTotalAmount', 0] },
//                     currentValueIfSoldToday: { $ifNull: ['$currentTotalAmount', 0] },
//                     lastUpdatedFormatted: {
//                         $cond: {
//                             if: { $ne: ['$lastUpdated', null] },
//                             then: {
//                                 $dateToString: {
//                                     format: "%d/%m/%Y",
//                                     date: '$lastUpdated',
//                                     timezone: "Asia/Bangkok"
//                                 }
//                             },
//                             else: "ไม่ระบุ"
//                         }
//                     }
//                 }
//             },
            
//             {
//                 $addFields: {
//                     // คำนวณส่วนต่างราคา (ต้องทำแยกเพราะต้องใช้ avgHistoricalPrice ที่คำนวณแล้ว)
//                     priceDifference: { 
//                         $subtract: [
//                             { $ifNull: ['$currentPrice', 0] }, 
//                             { $ifNull: ['$avgHistoricalPrice', 0] }
//                         ] 
//                     },
//                     avgPricePerUnit: { $ifNull: ['$avgHistoricalPrice', 0] }
//                 }
//             },
            
//             { $sort: { displayName: 1 } }
//         );

//         console.log('Executing main aggregation pipeline...');
//         const stockData = await WastePurchase.aggregate(pipeline);
//         console.log('Stock data count:', stockData.length);

//         // สร้าง dropdown options สำหรับเดือน/ปี
//         let monthlyOptions = [];
//         try {
//             monthlyOptions = await WastePurchase.aggregate([
//                 { $match: { isDeleted: false } },
//                 {
//                     $group: {
//                         _id: {
//                             year: { $year: '$purchaseDate' },
//                             month: { $month: '$purchaseDate' }
//                         },
//                         count: { $sum: 1 }
//                     }
//                 },
//                 { $sort: { '_id.year': -1, '_id.month': -1 } }
//             ]);
//             console.log('Monthly options count:', monthlyOptions.length);
//         } catch (monthlyError) {
//             console.error('Error getting monthly options:', monthlyError);
//             monthlyOptions = [];
//         }

//         // ดึงข้อมูลหมู่บ้าน
//         let allVillages = [];
//         try {
//             allVillages = await Village.find({ isDeleted: false }).sort({ villageNumber: 1 });
//             console.log('Villages count:', allVillages.length);
//         } catch (villageError) {
//             console.error('Error getting villages:', villageError);
//             allVillages = [];
//         }

//         console.log('Rendering page with data...');
//         res.render('admin/wasteStock', {
//             mytitle: 'ผู้ดูแลระบบ | สต๊อกขยะ',
//             stockData: stockData || [],
//             selectedVillageId: villageId,
//             villages: allVillages,
//             searchName: wasteName,
//             selectedMonth: selectedMonth,
//             selectedYear: selectedYear,
//             monthlyOptions: monthlyOptions,
//             currentPage: 'wasteStock',
//         });

//     } catch (err) {
//         console.error('Error in wasteStockIndex:', err);
//         console.error('Stack trace:', err.stack);
        
//         // ส่ง error details ไปยัง view สำหรับ debugging (ในโหมด development)
//         if (process.env.NODE_ENV === 'development') {
//             return res.status(500).render('error', {
//                 message: 'เกิดข้อผิดพลาดในระบบ',
//                 error: {
//                     message: err.message,
//                     stack: err.stack
//                 }
//             });
//         }
        
//         // สำหรับ production ให้ส่งหน้า error ธรรมดา
//         res.status(500).render('admin/wasteStock', {
//             mytitle: 'สต๊อกขยะ - เกิดข้อผิดพลาด',
//             stockData: [],
//             selectedVillageId: null,
//             villages: [],
//             searchName: null,
//             selectedMonth: null,
//             selectedYear: null,
//             monthlyOptions: [],
//             currentPage: 'wasteStock',
//             errorMessage: 'เกิดข้อผิดพลาดในการโหลดข้อมูล กรุณาลองใหม่อีกครั้ง'
//         });
//     }
// };
// หน้าสต๊อกขยะ - เวอร์ชันเบสิค ไม่ใช้ aggregate pipeline
const wasteStockIndex = async (req, res) => {
    const villageId = req.query.villageId || null;
    const wasteName = req.query.wasteName || null;
    const selectedMonth = req.query.month || null;
    const selectedYear = req.query.year || null;

    try {
        // ---- 1. หา villages สำหรับ dropdown ----
        const allVillages = await Village.find({ isDeleted: false }).sort({ villageNumber: 1 });

        // ---- 2. กำหนดช่วง date filter ----
        let dateFilter = {};
        if (selectedMonth) {
            const [year, month] = selectedMonth.split('-');
            dateFilter = {
                purchaseDate: {
                    $gte: new Date(parseInt(year), parseInt(month) - 1, 1),
                    $lte: new Date(parseInt(year), parseInt(month), 0, 23, 59, 59)
                }
            };
        } else if (selectedYear) {
            dateFilter = {
                purchaseDate: {
                    $gte: new Date(parseInt(selectedYear), 0, 1),
                    $lte: new Date(parseInt(selectedYear), 11, 31, 23, 59, 59)
                }
            };
        }

        // ---- 3. หา WastePurchase ทั้งหมดที่ไม่ถูกลบ + date filter ----
        let allPurchases = await WastePurchase.find({
            isDeleted: false,
            ...dateFilter
        });

        // ---- 4. filter ตาม villageId (ถ้ามี) ----
        if (villageId) {
            // หา account ทั้งหมดในหมู่บ้านนั้น
            // WastePurchase -> accountId -> WasteBankAccount -> familyID -> Family -> village
            const familiesInVillage = await Family.find({
                village: villageId,
                isDeleted: false
            }).select('_id');

            const familyIds = familiesInVillage.map(f => f._id.toString());

            const accountsInVillage = await WasteBankAccount.find({
                familyID: { $in: familyIds },
                isDeleted: false
            }).select('_id');

            const accountIds = accountsInVillage.map(a => a._id.toString());

            // filter purchases ที่ accountId อยู่ในหมู่บ้านนั้น
            allPurchases = allPurchases.filter(purchase => {
                // accountId เป็น array ตาม schema
                return purchase.accountId.some(accId =>
                    accountIds.includes(accId.toString())
                );
            });
        }

        // ---- 5. รวบรวม wasteItemId ทั้งหมดจากทุก purchase ----
        const allWasteItemIds = [];
        for (const purchase of allPurchases) {
            for (const itemId of purchase.wasteItems) {
                allWasteItemIds.push(itemId);
            }
        }

        // ---- 6. หา WasteItem ทั้งหมดที่เกี่ยวข้อง ----
        let allWasteItems = await WasteItem.find({
            _id: { $in: allWasteItemIds }
        });

        // ---- 7. filter ตามชื่อขยะ (ถ้ามี) ----
        if (wasteName && wasteName.trim() !== '') {
            const keyword = wasteName.trim().toLowerCase();
            allWasteItems = allWasteItems.filter(item =>
                item.name.toLowerCase().includes(keyword)
            );
        }

        // ---- 8. รวมข้อมูลแยกตามชื่อขยะ ----
        // stockMap = { wasteName: { name, totalQuantity, totalAmount, pricePerUnit, count } }
        const stockMap = {};

        for (const item of allWasteItems) {
            const key = item.wasteId ? item.wasteId.toString() : item.name;

            if (!stockMap[key]) {
                stockMap[key] = {
                    name: item.name,
                    wasteId: item.wasteId,
                    totalQuantityKg: 0,
                    totalAmount: 0,
                    purchaseCount: 0,
                    pricePerUnit: item.pricePerUnit, // ราคาล่าสุด
                };
            }

            stockMap[key].totalQuantityKg += item.quantity;
            stockMap[key].totalAmount += item.quantity * item.pricePerUnit;
            stockMap[key].purchaseCount += 1;
        }

        // ---- 9. คำนวณราคาเฉลี่ย ----
        const stockData = Object.values(stockMap).map(stock => ({
            ...stock,
            avgPricePerUnit: stock.totalQuantityKg > 0
                ? stock.totalAmount / stock.totalQuantityKg
                : 0
        }));

        // เรียงตามชื่อ
        stockData.sort((a, b) => a.name.localeCompare(b.name, 'th'));

        // ---- 10. หา monthlyOptions สำหรับ dropdown ----
        const allPurchasesForDropdown = await WastePurchase.find({ isDeleted: false }).select('purchaseDate');
        const monthSet = new Set();
        for (const p of allPurchasesForDropdown) {
            if (p.purchaseDate) {
                const d = new Date(p.purchaseDate);
                const y = d.getFullYear();
                const m = String(d.getMonth() + 1).padStart(2, '0');
                monthSet.add(`${y}-${m}`);
            }
        }
        const monthlyOptions = Array.from(monthSet).sort().reverse(); // ล่าสุดก่อน

        res.render('admin/wasteStock', {
            mytitle: 'ผู้ดูแลระบบ | สต๊อกขยะ',
            stockData,
            selectedVillageId: villageId,
            villages: allVillages,
            searchName: wasteName,
            selectedMonth,
            selectedYear,
            monthlyOptions,
            currentPage: 'wasteStock',
        });

    } catch (err) {
        console.error('Error in wasteStockIndex:', err);
        res.status(500).render('admin/wasteStock', {
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


// หน้า employee(พนักงาน)
const employeeIndex = (req, res) => {
    const { role, search } = req.query;
    const page = parseInt(req.query.page) || 1; // รับค่า page จาก query parameter หรือใช้ 1 เป็นค่าเริ่มต้น
    const limit = 10; // จำนวน records ต่อหน้า
    const skip = (page - 1) * limit; // คำนวณจำนวน records ที่จะข้ามไป

    const filter = { isDeleted: false };
    if (role) {
        filter.role = role;
    }
    if (search) {
        filter.$or = [
            { username: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { tel: { $regex: search, $options: 'i' } }
        ];
    }

    MyAdmin.countDocuments(filter)
        .then(totalItems => {
            const totalPages = Math.ceil(totalItems / limit);

            MyAdmin.find(filter)
                .sort({ createdAt: 1 })
                .skip(skip)
                .limit(limit)
                .then((result) => {
                    res.render('admin/employee', { 
                        mytitle: 'Admindashboard | Employee', 
                        emp: result, 
                        role, 
                        search,
                        currentPage: page,
                        totalPages: totalPages,
                        totalItems: totalItems,
                        currentPage: 'employee',
                    });
                })
                .catch((err) => {
                    console.error('Error fetching employees:', err);
                    res.status(500).send('เกิดข้อผิดพลาดในการดึงข้อมูลพนักงาน');
                });
        })
        .catch(err => {
            console.error('Error counting employees:', err);
            res.status(500).send('เกิดข้อผิดพลาดในการนับจำนวนข้อมูลพนักงาน');
        });
};
// ลงทะเบียนพนักงานหรือแอดมิน (ป้องกันเพิ่มแอดมินหรือพนักงานซ้ำ)
const employeeRegister = async (req, res) => {
    const { username, password, confirmPassword, firstname, lastname, tel, email, role } = req.body;

    try {
        // ตรวจว่ารหัสผ่านกับยืนยันรหัสผ่านตรงกันหรือมั้ย
        if (password !== confirmPassword) {
            return res.redirect('/admin/employee?error=รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน');
        }

        const passwordRegex = /^\d{6,8}$/;
        if (!passwordRegex.test(password)) {
            return res.redirect('/admin/employee?error=รหัสผ่านต้องเป็นตัวเลข 6-8 หลัก');
        }

        // ตรวจว่ามี username, email หรือ tel ซ้ำกันมั้ย
        let existingUser = await MyAdmin.findOne({ $or: [{ username }, { email }, { tel }] });

        if (existingUser) {
            if (existingUser.username === username) {
                return res.redirect('/admin/employee?error=ชื่อผู้ใช้นี้มีอยู่แล้ว');
            }
            if (existingUser.email === email) {
                return res.redirect('/admin/employee?error=อีเมลนี้ถูกใช้งานแล้ว');
            }
            if (existingUser.tel === tel) {
                return res.redirect('/admin/employee?error=เบอร์โทรนี้ถูกใช้งานแล้ว');
            }
        }

        // แฮชรหัสผ่าน
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // ตรวจสอบค่า role (admin หรือ employee)
        if (role !== 'admin' && role !== 'employee') {
            return res.redirect('/admin/employee?error=บทบาทไม่ถูกต้อง');
        }

        const newUser = new MyAdmin({
            username,
            password: hashedPassword,
            firstname,
            lastname,
            tel,
            email,
            role,
        });

        await newUser.save();
        res.redirect('/admin/employee?message=เพิ่มสมาชิกสำเร็จ');

    } catch (err) {
        console.error('Registration error:', err);
        res.redirect('/admin/employee?error=เกิดข้อผิดพลาดในระบบ');
    }
};
// ลบพนักงาน (softDelete)
const employeeDelete = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await MyAdmin.findByIdAndUpdate(id, { isDeleted: true });

        if (!result) {
            return res.status(404).redirect('/admin/employee?error=ไม่พบข้อมูลผู้ใช้ที่ต้องการลบ');
        }
        res.redirect('/admin/employee?message=ลบผู้ใช้สำเร็จ');
    } catch (err) {
        console.error('Error deleting Employee:', err);
        res.status(500).redirect('/admin/employee?error=เกิดข้อผิดพลาดในการลบข้อมูลผู้ใช้');
    }
};
// แก้ไขข้อมูลพนักงาน
const editEmployee = async (req, res) => {
    const { _id, username, firstname, lastname, tel, email, role } = req.body;

    try {
        const updatedEmployee = await MyAdmin.findByIdAndUpdate(
            _id,
            { username, firstname, lastname, tel, email, role },
            { new: true }  // return document ที่ถูกอัปเดต
        );

        if (!updatedEmployee) {
            return res.status(404).send('ไม่พบข้อมูลพนักงาน');
        }

        res.redirect('/admin/employee?message=แก้ไขข้อมูลพนักงานสำเร็จ');
    } catch (err) {
        console.error(err);
        res.status(500).send('เกิดข้อผิดพลาดที่เซิร์ฟเวอร์');
    }
};

// หน้าสมาชิกกองทุนขยะรีไซเคิล
const memberIndex = async (req, res) => {
    try {
        const { familyName, AccountName, AccountNumber, village, Type, page } = req.query;
        let searchQuery = { isDeleted: false };

        if (familyName) searchQuery.familyName = { $regex: familyName, $options: 'i' };
        if (Type) searchQuery.Type = Type;
        if (village) searchQuery.village = village;

        const villages = await Village.find({ isDeleted: false }).lean(); 
        const allFamilies = await Family.find(searchQuery).populate('village').lean();

        const accounts = await WasteBankAccount.find({ isDeleted: false }).lean();
        const accountMap = {};
        accounts.forEach(acc => {
            if (acc.familyID) accountMap[acc.familyID.toString()] = acc;
        });

        const typeMap = {
            household: 'บ้าน',
            school: 'โรงเรียน',
            municipality: 'องค์กรปกครองส่วนท้องถิ่น',
            community: 'ชุมชน',
            temple: 'วัด'
        };

        let familiesWithAccount = allFamilies.map(family => {
            const account = accountMap[family._id.toString()];
            return {
                ...family,
                AccountNumber: account ? account.AccountNumber : '-',
                AccountName: account ? account.AccountName : '-',
                Balance: account ? account.Balance : 0,
                typeThai: typeMap[family.Type] || family.Type
            };
        });

        if (AccountName) {
            familiesWithAccount = familiesWithAccount.filter(family => 
                family.AccountName.toLowerCase().includes(AccountName.toLowerCase())
            );
        }

        if (AccountNumber) {
            familiesWithAccount = familiesWithAccount.filter(family =>
                family.AccountNumber.includes(AccountNumber)
            );
        }

        // ─── Pagination ───────────────────────────────────────────
        const itemsPerPage = 10;
        const totalItems = familiesWithAccount.length;
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        const currentPage = Math.max(1, Math.min(parseInt(page) || 1, totalPages || 1));

        const startIndex = (currentPage - 1) * itemsPerPage;
        const paginatedFamilies = familiesWithAccount.slice(startIndex, startIndex + itemsPerPage);

        const pagination = {
            currentPage,
            totalPages,
            totalItems,
            itemsPerPage,
            hasPrevPage: currentPage > 1,
            hasNextPage: currentPage < totalPages,
        };
        // ──────────────────────────────────────────────────────────

        res.render('admin/member', { 
            mytitle: 'ผู้ดูแลระบบ | สมาชิกกองทุนขยะรีไซเคิล',
            villages,
            allFamilies: paginatedFamilies,
            totalFamilies: totalItems,
            pagination,
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
        console.log('=== DEBUG: Request Body ===');
        console.log('req.body.beneficiaries:', JSON.stringify(req.body.beneficiaries, null, 2));
        
        // ตรวจสอบว่า village ที่ระบุมีอยู่จริงหรือไม่
        const village = await Village.findById(req.body.village).session(session);
        if (!village) {
            await session.abortTransaction();
            session.endSession();
            return res.redirect('/admin/member?error=ไม่พบหมู่บ้านที่ระบุ');
        }

        // ตรวจสอบ username
        const usernameRegex = /^[a-zA-Z0-9_\u0E00-\u0E7F]{5,20}$/;
        if (!usernameRegex.test(req.body.username)) {
            await session.abortTransaction();
            session.endSession();
            return res.redirect('/admin/member?error=ชื่อผู้ใช้ต้องมี 5-20 ตัวอักษร และไม่มีอักขระพิเศษ');
        }

        // ตรวจสอบ password 
        const passwordRegex = /^\d{6,8}$/;
        if (!passwordRegex.test(req.body.password)) {
            await session.abortTransaction();
            session.endSession();
            return res.redirect('/admin/member?error=รหัสผ่านต้องเป็นตัวเลข 6-8 หลัก');
        }

        // ตรวจสอบว่าชื่อผู้ใช้ซ้ำหรือไม่
        const existingUser = await Family.findOne({ username: req.body.username }).session(session);
        if (existingUser) {
            await session.abortTransaction();
            session.endSession();
            return res.redirect('/admin/member?error=ชื่อผู้ใช้นี้ถูกใช้ไปแล้ว');
        }

        // ตรวจสอบอีเมลหรือเบอร์โทรซ้ำ
        const phoneNumber = req.body.phone ? req.body.phone.replace(/\D/g, '') : '';
        const existingMember = await Member.findOne({
            $or: [
                phoneNumber ? { phone: phoneNumber } : null,
                { idCardNumber: req.body.idCardNumber.replace(/\D/g, '') }
            ].filter(Boolean)
        }).session(session);
        
        if (existingMember) {
            await session.abortTransaction();
            session.endSession();
            return res.redirect('/admin/member?error=เบอร์โทรหรือเลขบัตรประชาชนนี้ถูกใช้ไปแล้ว');
        }

        // สร้างเลขบัญชี
        const villageNumber = String(village.villageNumber).padStart(2, '0');
        const currentYear = new Date().getFullYear() + 542;
        const yearSuffix = String(currentYear).slice(-2);
        
        const latestAccount = await WasteBankAccount.find({
            AccountNumber: new RegExp(`^${yearSuffix}${villageNumber}`)
        })
        .sort({ AccountNumber: -1 })
        .limit(1)
        .session(session);
        
        let sequenceNumber = 1;
        if (latestAccount && latestAccount.length > 0) {
            const latestSequence = parseInt(latestAccount[0].AccountNumber.slice(-2));
            sequenceNumber = latestSequence + 1;
        }
        
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

        // 2. สร้าง householdMembers (แก้ไขให้รองรับทุกกรณี)
        const beneficiariesArray = Array.isArray(req.body.beneficiaries) 
            ? req.body.beneficiaries 
            : [];

        console.log('=== DEBUG: Processing Beneficiaries ===');
        console.log('Total beneficiaries:', beneficiariesArray.length);

        const householdMembers = beneficiariesArray
            .filter(b => {
                const hasName = b.name && b.name.trim() !== '';
                console.log('Beneficiary:', b.name, 'hasName:', hasName);
                return hasName;
            })
            .map((b, index) => {
                const cleanIdCard = b.idCardNumber ? b.idCardNumber.replace(/\D/g, '') : '';
                const cleanPhone = b.phone ? b.phone.replace(/\D/g, '') : '';
                
                console.log(`Processing member ${index}:`, {
                    name: b.name,
                    idCardNumber: cleanIdCard,
                    phone: cleanPhone
                });

                return {
                    _id: new mongoose.Types.ObjectId(),
                    name: b.name.trim(),
                    idCardNumber: cleanIdCard,
                    phone: cleanPhone,
                    birthDate: b.birthDate && b.birthDate !== '' ? new Date(b.birthDate) : null,
                    age: b.age || '',
                    occupation: b.occupation || '',
                    nationality: b.nationality || 'ไทย',
                    ethnicity: b.ethnicity || 'ไทย',
                    religion: b.religion || 'พุทธ',
                    relationToHead: b.relation || 'ญาติ',
                    funeralBenefitCondition: {
                        distributionType: b.distributionType || 'equal',
                        distributionDetail: b.distributionDetail || ''
                    },
                    status: 'living',
                    joinDate: new Date()
                };
            });

        console.log('=== Final householdMembers count:', householdMembers.length);

        // 3. สร้างสมาชิกตัวแทนครอบครัว
        const member = new Member({
            familyID: savedFamily._id,
            name: req.body.name,
            phone: phoneNumber,
            idCardNumber: req.body.idCardNumber.replace(/\D/g, ''),
            birthDate: req.body.birthDate && req.body.birthDate !== '' ? new Date(req.body.birthDate) : null,
            occupation: req.body.occupation || '',
            age: req.body.age || '',
            nationality: req.body.nationality || 'ไทย',
            ethnicity: req.body.ethnicity || 'ไทย',
            religion: req.body.religion || 'พุทธ',
            isRepresentative: true,
            Status: 'living',
            householdMembers: householdMembers
        });

        console.log('=== Saving member with householdMembers ===');
        await member.save({ session });

        // 4. สร้างบัญชีธนาคารขยะ
        const account = new WasteBankAccount({
            familyID: savedFamily._id,
            AccountName: savedFamily.familyName,
            AccountNumber: accountNumber,
            Balance: 0,
            OpenDate: new Date()
        });

        await account.save({ session });

        await session.commitTransaction();
        session.endSession();

        console.log('=== Registration Success ===');
        res.redirect('/admin/member?message=ลงทะเบียนครัวเรือนสำเร็จ');

    } catch (error) {
        await session.abortTransaction();  
        session.endSession();

        console.error('=== Error registering household ===');
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        
        if (error.errors) {
            console.error('Validation errors:', JSON.stringify(error.errors, null, 2));
        }

        res.redirect('/admin/member?error=เกิดข้อผิดพลาดในการลงทะเบียน: ' + error.message);
    }
};

// ดึงข้อมูลครัวเรือนและสมาชิกเพื่อแก้ไข
const getMemberForEdit = async (req, res) => {
    try {
        const { familyId } = req.params;
        
        const family = await Family.findById(familyId).populate('village').lean();
        if (!family) {
            return res.status(404).json({ error: 'ไม่พบข้อมูลครัวเรือน' });
        }

        // ดึงเฉพาะตัวแทนที่มีชีวิต
        const member = await Member.findOne({ 
            familyID: familyId, 
            isRepresentative: true,
            Status: 'living' 
        }).lean();
        
        if (!member) {
            return res.status(404).json({ error: 'ไม่พบข้อมูลสมาชิกตัวแทน' });
        }

        const account = await WasteBankAccount.findOne({ familyID: familyId }).lean();

        // แปลง householdMembers กลับเป็น beneficiaries สำหรับฟอร์ม
        const beneficiaries = (member.householdMembers || []).map(m => ({
            name: m.name,
            idCardNumber: m.idCardNumber || '',     
            phone: m.phone || '',                   
            birthDate: m.birthDate || null,             
            age: m.age || '',                             
            occupation: m.occupation || '',               
            nationality: m.nationality || 'ไทย',       
            ethnicity: m.ethnicity || 'ไทย',            
            religion: m.religion || 'พุทธ',
            relation: m.relationToHead,
            distributionType: m.funeralBenefitCondition?.distributionType || 'equal',
            distributionDetail: m.funeralBenefitCondition?.distributionDetail || '',
            status: m.status
        }));

        res.json({
            success: true,
            data: {
                family,
                member: {
                    ...member,
                    beneficiaries: beneficiaries
                },
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

        const existingFamily = await Family.findById(familyId).session(session);
        if (!existingFamily) {
            await session.abortTransaction();
            session.endSession();
            return res.redirect('/admin/member?error=ไม่พบข้อมูลครัวเรือน');
        }

        // ตรวจสอบ village
        if (req.body.village) {
            const village = await Village.findById(req.body.village).session(session);
            if (!village) {
                await session.abortTransaction();
                session.endSession();
                return res.redirect('/admin/member?error=ไม่พบหมู่บ้านที่ระบุ');
            }
        }

        // ตรวจสอบ username
        if (req.body.username && req.body.username !== existingFamily.username) {
            const usernameRegex = /^[a-zA-Z0-9_\u0E00-\u0E7F]{5,20}$/;
            if (!usernameRegex.test(req.body.username)) {
                await session.abortTransaction();
                session.endSession();
                return res.redirect('/admin/member?error=ชื่อผู้ใช้ต้องมี 5-20 ตัวอักษร และไม่มีอักขระพิเศษ');
            }

            const duplicateUsername = await Family.findOne({ 
                username: req.body.username,
                _id: { $ne: familyId }
            }).session(session);
            
            if (duplicateUsername) {
                await session.abortTransaction();
                session.endSession();
                return res.redirect('/admin/member?error=ชื่อผู้ใช้นี้ถูกใช้ไปแล้ว');
            }
        }

        // ตรวจสอบ password
        let hashedPassword = existingFamily.password;
        if (req.body.password && req.body.password.trim() !== '') {
            const passwordRegex = /^\d{6,8}$/;
            if (!passwordRegex.test(req.body.password)) {
                await session.abortTransaction();
                session.endSession();
                return res.redirect('/admin/member?error=รหัสผ่านต้องเป็นตัวเลข 6-8 หลัก');
            }
            hashedPassword = await bcrypt.hash(req.body.password, 10);
        }

        // หาสมาชิกตัวแทนเดิม
        const existingMember = await Member.findOne({ 
            familyID: familyId,
            isRepresentative: true,
            Status: 'living'
        }).session(session);

        if (!existingMember) {
            await session.abortTransaction();
            session.endSession();
            return res.redirect('/admin/member?error=ไม่พบข้อมูลสมาชิกตัวแทน');
        }

        // ตรวจสอบเบอร์โทรและเลขบัตรประชาชนซ้ำ
        const cleanPhone = req.body.phone ? req.body.phone.replace(/\D/g, '') : '';
        const cleanIdCard = req.body.idCardNumber ? req.body.idCardNumber.replace(/\D/g, '') : '';
        
        if (cleanPhone !== existingMember.phone || 
            cleanIdCard !== existingMember.idCardNumber) {
            
            const duplicateMember = await Member.findOne({
                _id: { $ne: existingMember._id },
                $or: [
                    cleanPhone ? { phone: cleanPhone } : null,
                    cleanIdCard ? { idCardNumber: cleanIdCard } : null
                ].filter(Boolean)
            }).session(session);

            if (duplicateMember) {
                await session.abortTransaction();
                session.endSession();
                return res.redirect('/admin/member?error=เบอร์โทรหรือเลขบัตรประชาชนนี้ถูกใช้ไปแล้ว');
            }
        }

        // สร้าง Map ของ householdMembers เดิม (เก็บ status ไว้)
        const existingMembersMap = new Map();
            if (existingMember.householdMembers && existingMember.householdMembers.length > 0) {
                existingMember.householdMembers.forEach((m) => {
                    // key หลัก — idCardNumber
                    if (m.idCardNumber) {
                        existingMembersMap.set(m.idCardNumber, {
                            status: m.status || 'living',
                            funeralBenefitCondition: m.funeralBenefitCondition
                        });
                    }
                    // key สำรอง — ชื่อ+ความสัมพันธ์ (กรณีไม่มี idCard)
                    const nameKey = `${m.name.trim()}_${m.relationToHead.trim()}`;
                    existingMembersMap.set(nameKey, {
                        status: m.status || 'living',
                        funeralBenefitCondition: m.funeralBenefitCondition
                    });
                });
            }

        // แปลง beneficiaries ใหม่เป็น householdMembers พร้อมรักษา status และบันทึกข้อมูลครบถ้วน
        const beneficiariesArray = Array.isArray(req.body.beneficiaries) 
            ? req.body.beneficiaries 
            : [];

        const updatedHouseholdMembers = beneficiariesArray
            .filter(b => b.name && b.name.trim() !== '')
            .map((newBen) => {
                const cleanBenIdCard = newBen.idCardNumber ? newBen.idCardNumber.replace(/\D/g, '') : '';
                const cleanBenPhone = newBen.phone ? newBen.phone.replace(/\D/g, '') : '';
                
                // ค้นหาด้วย idCard ก่อน ถ้าไม่เจอ fallback ด้วยชื่อ+ความสัมพันธ์
                const existingMem = cleanBenIdCard 
                    ? (existingMembersMap.get(cleanBenIdCard) ?? existingMembersMap.get(`${newBen.name.trim()}_${newBen.relation.trim()}`))
                    : existingMembersMap.get(`${newBen.name.trim()}_${newBen.relation.trim()}`);
                
                return {
                    _id: new mongoose.Types.ObjectId(),
                    name: newBen.name.trim(),
                    idCardNumber: cleanBenIdCard,
                    phone: cleanBenPhone,
                    birthDate: newBen.birthDate && newBen.birthDate !== '' ? new Date(newBen.birthDate) : null,
                    age: newBen.age || '',
                    occupation: newBen.occupation || '',
                    nationality: newBen.nationality || 'ไทย',
                    ethnicity: newBen.ethnicity || 'ไทย',
                    religion: newBen.religion || 'พุทธ',
                    relationToHead: newBen.relation,
                    funeralBenefitCondition: {
                        distributionType: newBen.distributionType || 'equal',
                        distributionDetail: newBen.distributionDetail || ''
                    },
                    status: existingMem ? existingMem.status : 'living', // รักษา status เดิมได้ถูกต้อง
                    joinDate: new Date()
                };
            });

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

        // อัปเดตข้อมูลสมาชิกตัวแทน (ลบ format ออกก่อนบันทึก)
        await Member.findByIdAndUpdate(
            existingMember._id,
            {
                name: req.body.name,
                phone: cleanPhone,
                idCardNumber: cleanIdCard,
                birthDate: req.body.birthDate && req.body.birthDate !== '' ? new Date(req.body.birthDate) : null,
                occupation: req.body.occupation || '',
                age: req.body.age || '',
                nationality: req.body.nationality || 'ไทย',
                ethnicity: req.body.ethnicity || 'ไทย',
                religion: req.body.religion || 'พุทธ',
                householdMembers: updatedHouseholdMembers
            },
            { session }
        );

        // อัปเดตชื่อบัญชีธนาคารขยะ
        await WasteBankAccount.findOneAndUpdate(
            { familyID: familyId },
            { AccountName: req.body.familyName },
            { session }
        );

        await session.commitTransaction();
        session.endSession();

        res.redirect('/admin/member?message=แก้ไขข้อมูลสำเร็จ');

    } catch (error) {
        await session.abortTransaction();
        session.endSession();

        console.error('Error updating member:', error);
        res.redirect('/admin/member?error=เกิดข้อผิดพลาดในการแก้ไขข้อมูล: ' + error.message);
    }
};

// ฟังก์ชัน Soft Delete
const memberDelete = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { familyId } = req.params;

        const family = await Family.findById(familyId).session(session);
        if (!family) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ 
                success: false, 
                message: 'ไม่พบข้อมูลครัวเรือน' 
            });
        }

        if (family.isDeleted) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ 
                success: false, 
                message: 'ข้อมูลครัวเรือนนี้ถูกลบไปแล้ว' 
            });
        }

        await Family.findByIdAndUpdate(
            familyId,
            { 
                isDeleted: true,
                deletedAt: new Date()
            },
            { session }
        );

        await Member.updateMany(
            { familyID: familyId },
            { 
                isDeleted: true,
                deletedAt: new Date()
            },
            { session }
        );

        await WasteBankAccount.findOneAndUpdate(
            { familyID: familyId },
            { 
                isDeleted: true,
                deletedAt: new Date()
            },
            { session }
        );

        await session.commitTransaction();
        session.endSession();

        res.json({ 
            success: true, 
            message: 'ลบข้อมูลสมาชิกสำเร็จ' 
        });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();

        console.error('Error soft deleting member:', error);
        res.status(500).json({ 
            success: false, 
            message: 'เกิดข้อผิดพลาดในการลบข้อมูล: ' + error.message 
        });
    }
};

// ดึงรายชื่อสมาชิกที่ยังมีชีวิตอยู่
const getRepresentatives = async (req, res) => {
    try {
        const { familyId } = req.params;
        
        const family = await Family.findById(familyId).lean();
        if (!family) {
            return res.status(404).json({ 
                success: false, 
                error: 'ไม่พบข้อมูลครัวเรือน' 
            });
        }

        // ดึงตัวแทนปัจจุบัน
        const currentRepresentative = await Member.findOne({ 
            familyID: familyId, 
            isRepresentative: true,
            Status: 'living' 
        }).lean();

        if (!currentRepresentative) {
            return res.status(404).json({ 
                success: false, 
                error: 'ไม่พบข้อมูลสมาชิกตัวแทน' 
            });
        }

        const livingMembers = (currentRepresentative.householdMembers || [])
            .filter(m => m.status === 'living')
            .map((m, index) => ({
                index: index,
                name: m.name,
                idCardNumber: m.idCardNumber || '',
                phone: m.phone || '',
                birthDate: m.birthDate || null,
                age: m.age || '',
                occupation: m.occupation || '',
                nationality: m.nationality || 'ไทย',
                ethnicity: m.ethnicity || 'ไทย',
                religion: m.religion || 'พุทธ',
                relation: m.relationToHead,
                status: m.status
            }));

        const deceasedFormerReps = await Member.find({
            familyID: familyId,
            isRepresentative: false,
            Status: 'deceased',
            isDeleted: false
        }).lean();

        const formerReps = deceasedFormerReps.map(m => ({
            memberId: m._id,
            name: m.name,
            idCardNumber: m.idCardNumber || '',
            phone: m.phone || '',
            birthDate: m.birthDate || null,
            age: m.age || '',
            occupation: m.occupation || '',
            nationality: m.nationality || 'ไทย',
            ethnicity: m.ethnicity || 'ไทย',
            religion: m.religion || 'พุทธ',
            status: 'deceased'
        }));

        res.json({
            success: true,
            data: {
                family,
                currentRepresentative: {
                    _id: currentRepresentative._id,
                    name: currentRepresentative.name,
                    idCardNumber: currentRepresentative.idCardNumber,
                    phone: currentRepresentative.phone,
                    Status: currentRepresentative.Status
                },
                householdMembers: livingMembers, 
                formerRepresentatives: formerReps
            }
        });
    } catch (error) {
        console.error('Error fetching representatives:', error);
        res.status(500).json({ 
            success: false, 
            error: 'เกิดข้อผิดพลาดในการดึงข้อมูล' 
        });
    }
};

const changeRepresentative = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { familyId } = req.params;
        const { memberIndex, newRepresentativeData, beneficiaryType } = req.body;

        if (!newRepresentativeData || !newRepresentativeData.name) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ 
                success: false, 
                message: 'กรุณากรอกข้อมูลตัวแทนใหม่ให้ครบถ้วน' 
            });
        }

        // 1. หาตัวแทนเดิม
        const oldRep = await Member.findOne({ 
            familyID: familyId, 
            isRepresentative: true,
            Status: 'living' 
        }).session(session);

        if (!oldRep) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ 
                success: false, 
                message: 'ไม่พบข้อมูลสมาชิกตัวแทนเดิม' 
            });
        }

        const cleanIdCard = newRepresentativeData.idCardNumber.replace(/\D/g, '');
        const cleanPhone = newRepresentativeData.phone ? newRepresentativeData.phone.replace(/\D/g, '') : '';

        // 2. หาว่าคนใหม่มี Member document อยู่แล้วไหม
        const existingNewRep = await Member.findOne({
            idCardNumber: cleanIdCard,
            familyID: familyId
        }).session(session);

        // 3. บล็อกถ้าเป็นคนที่ deceased
        if (existingNewRep && existingNewRep.Status === 'deceased') {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ 
                success: false, 
                message: 'ไม่สามารถเลือกผู้ที่เสียชีวิตแล้วมาเป็นตัวแทนได้' 
            });
        }

        // 4. สร้าง householdMembers ใหม่สำหรับตัวแทนคนใหม่
        const newHouseholdMembers = [];

        oldRep.householdMembers.forEach((m, idx) => {
            // ข้ามคนที่จะขึ้นเป็นตัวแทนใหม่
            if (beneficiaryType === 'household' && idx === parseInt(memberIndex)) return;
            if (m.idCardNumber && m.idCardNumber === cleanIdCard) return;

            newHouseholdMembers.push({
                _id: m._id,
                name: m.name,
                idCardNumber: m.idCardNumber || '',
                phone: m.phone || '',
                birthDate: m.birthDate,
                age: m.age || '',
                occupation: m.occupation || '',
                nationality: m.nationality || 'ไทย',
                ethnicity: m.ethnicity || 'ไทย',
                religion: m.religion || 'พุทธ',
                relationToHead: m.relationToHead,
                funeralBenefitCondition: m.funeralBenefitCondition,
                status: m.status,
                joinDate: m.joinDate
            });
        });

        // เพิ่ม oldRep เข้าไปใน householdMembers ของตัวแทนใหม่
        newHouseholdMembers.push({
            _id: oldRep._id,
            name: oldRep.name,
            idCardNumber: oldRep.idCardNumber,
            phone: oldRep.phone,
            birthDate: oldRep.birthDate,
            age: oldRep.age,
            occupation: oldRep.occupation,
            nationality: oldRep.nationality,
            ethnicity: oldRep.ethnicity,
            religion: oldRep.religion,
            relationToHead: 'หัวหน้าครัวเรือน',
            funeralBenefitCondition: {
                distributionType: 'equal',
                distributionDetail: ''
            },
            status: oldRep.Status,
            joinDate: oldRep.joinDate || new Date()
        });

        // 5. คนใหม่มี Member document อยู่แล้ว → สลับระหว่าง 2 documents
        if (existingNewRep) {
            // oldRep → ไม่เป็นตัวแทน
            oldRep.isRepresentative = false;
            oldRep.householdMembers = [];
            await oldRep.save({ session });

            // existingNewRep → เป็นตัวแทน + รับ householdMembers
            existingNewRep.isRepresentative = true;
            existingNewRep.Status = 'living';
            existingNewRep.name = newRepresentativeData.name;
            existingNewRep.phone = cleanPhone;
            existingNewRep.birthDate = newRepresentativeData.birthDate 
                ? new Date(newRepresentativeData.birthDate) 
                : existingNewRep.birthDate;
            existingNewRep.age = newRepresentativeData.age || existingNewRep.age;
            existingNewRep.occupation = newRepresentativeData.occupation || existingNewRep.occupation;
            existingNewRep.nationality = newRepresentativeData.nationality || existingNewRep.nationality;
            existingNewRep.ethnicity = newRepresentativeData.ethnicity || existingNewRep.ethnicity;
            existingNewRep.religion = newRepresentativeData.religion || existingNewRep.religion;
            existingNewRep.householdMembers = newHouseholdMembers;
            await existingNewRep.save({ session });

            await session.commitTransaction();
            session.endSession();

            return res.json({ 
                success: true, 
                message: 'เปลี่ยนตัวแทนครัวเรือนสำเร็จ (สลับตัวแทน)',
                newRepresentativeId: existingNewRep._id
            });
        }

        // 6. คนใหม่อยู่แค่ใน householdMembers (ไม่มี Member document)
        //    → update oldRep document เดิม เปลี่ยนข้อมูลเป็นคนใหม่
        if (beneficiaryType === 'household' && memberIndex !== null && memberIndex !== undefined) {
            oldRep.isRepresentative = true;
            oldRep.name = newRepresentativeData.name;
            oldRep.idCardNumber = cleanIdCard;
            oldRep.phone = cleanPhone;
            oldRep.birthDate = newRepresentativeData.birthDate 
                ? new Date(newRepresentativeData.birthDate) 
                : null;
            oldRep.age = newRepresentativeData.age || '';
            oldRep.occupation = newRepresentativeData.occupation || '';
            oldRep.nationality = newRepresentativeData.nationality || 'ไทย';
            oldRep.ethnicity = newRepresentativeData.ethnicity || 'ไทย';
            oldRep.religion = newRepresentativeData.religion || 'พุทธ';
            oldRep.Status = 'living';
            oldRep.householdMembers = newHouseholdMembers;
            await oldRep.save({ session });

            await session.commitTransaction();
            session.endSession();

            return res.json({ 
                success: true, 
                message: 'เปลี่ยนตัวแทนครัวเรือนสำเร็จ (สลับข้อมูล)',
                newRepresentativeId: oldRep._id
            });
        }

        // 7. กรณีกรอกข้อมูลคนใหม่ที่ไม่เคยมีในระบบเลย → สร้าง document ใหม่
        oldRep.isRepresentative = false;
        oldRep.householdMembers = [];
        await oldRep.save({ session });

        const newRep = new Member({
            familyID: familyId,
            name: newRepresentativeData.name,
            phone: cleanPhone,
            idCardNumber: cleanIdCard,
            birthDate: newRepresentativeData.birthDate && newRepresentativeData.birthDate !== '' 
                ? new Date(newRepresentativeData.birthDate) 
                : null,
            occupation: newRepresentativeData.occupation || '',
            age: newRepresentativeData.age || '',
            nationality: newRepresentativeData.nationality || 'ไทย',
            ethnicity: newRepresentativeData.ethnicity || 'ไทย',
            religion: newRepresentativeData.religion || 'พุทธ',
            isRepresentative: true,
            Status: 'living',
            householdMembers: newHouseholdMembers,
            joinDate: new Date()
        });

        await newRep.save({ session });

        await session.commitTransaction();
        session.endSession();

        res.json({ 
            success: true, 
            message: 'เปลี่ยนตัวแทนครัวเรือนสำเร็จ',
            newRepresentativeId: newRep._id
        });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error('Error changing representative:', error);
        res.status(500).json({ 
            success: false, 
            message: 'เกิดข้อผิดพลาด: ' + error.message 
        });
    }
};

// สำหรับเก็บรูปภาพที่อัปโหลดจาก board
// const storageBoard = multer.diskStorage({
//     destination: './public/upload_board',
//     filename: function (req, file, cb) {
//         cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
//     }
// });

const uploadBoard = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }
}).single('img');

// หน้าแสดงคณะกรรมการ
const boardIndex = async (req, res) => {
    try {
        const board = await Board.find({ isDeleted: false }).sort({ createdAt: -1 });
        res.render('admin/board', {
            mytitle: 'คณะกรรมการ',
            currentPage: 'board',
            board: board
        });
    } catch (error) {
        console.error(error);
        res.redirect('/admin/board?error=เกิดข้อผิดพลาดในการโหลดข้อมูล');
    }
};

// เพิ่มคณะกรรมการ
const boardPost = (req, res) => {
    uploadBoard(req, res, async (err) => {
        if (err) {
            console.error(err);
            return res.redirect('/admin/board?error=เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ');
        }

        try {
            const { name, role, department, email, tel } = req.body;

            if (!name || !role || !department || !email || !tel) {
                return res.redirect('/admin/board?error=กรุณากรอกข้อมูลให้ครบถ้วน');
            }

            // ตรวจสอบข้อมูลซ้ำ
            const existingBoard = await Board.findOne({
                isDeleted: false,
                $or: [
                    { email: email },
                    { tel: tel }
                ]
            });

            if (existingBoard) {
                // if (existingBoard.email === email) {
                //     return res.redirect('/admin/board?error=อีเมลนี้มีในระบบแล้ว');
                // }
                if (existingBoard.tel === tel) {
                    return res.redirect('/admin/board?error=เบอร์โทรศัพท์นี้มีในระบบแล้ว');
                }
            }

            let imageUrl = null;

            if (req.file) {
                const uploadFromBuffer = () =>
                    new Promise((resolve, reject) => {
                        const stream = cloudinary.uploader.upload_stream(
                            {
                                folder: 'board_images',
                                resource_type: 'image'
                            },
                            (error, result) => {
                                if (result) resolve(result);
                                else reject(error);
                            }
                        );

                        streamifier.createReadStream(req.file.buffer).pipe(stream);
                    });

                const result = await uploadFromBuffer();
                imageUrl = result.secure_url;
            }

            const newBoard = new Board({
                name,
                role,
                department,
                email,
                tel,
                img: imageUrl
            });

            await newBoard.save();
            res.redirect('/admin/board?message=เพิ่มคณะกรรมการสำเร็จ');
        } catch (error) {
            console.error(error);
            res.redirect('/admin/board?error=เกิดข้อผิดพลาดในการเพิ่มข้อมูล');
        }
    });
};

// แก้ไขคณะกรรมการ
const boardEdit = (req, res) => {
    uploadBoard(req, res, async (err) => {
        if (err) {
            console.error(err);
            return res.redirect('/admin/board?error=เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ');
        }

        try {
            const { _id, name, role, department, email, tel } = req.body;

            if (!_id || !name || !role || !department || !email || !tel) {
                return res.redirect('/admin/board?error=กรุณากรอกข้อมูลให้ครบถ้วน');
            }

            const board = await Board.findById(_id);
            if (!board) {
                return res.redirect('/admin/board?error=ไม่พบข้อมูลคณะกรรมการ');
            }

            // ตรวจสอบข้อมูลซ้ำ (ยกเว้นตัวเอง)
            const existingBoard = await Board.findOne({
                _id: { $ne: _id },
                isDeleted: false,
                $or: [
                    { email: email },
                    { tel: tel }
                ]
            });

            if (existingBoard) {
                if (existingBoard.email === email) {
                    return res.redirect('/admin/board?error=อีเมลนี้มีในระบบแล้ว');
                }
                if (existingBoard.tel === tel) {
                    return res.redirect('/admin/board?error=เบอร์โทรศัพท์นี้มีในระบบแล้ว');
                }
            }

            let imageUrl = board.img;

            if (req.file) {
                const uploadFromBuffer = () =>
                    new Promise((resolve, reject) => {
                        const stream = cloudinary.uploader.upload_stream(
                            {
                                folder: 'board_images',
                                resource_type: 'image'
                            },
                            (error, result) => {
                                if (result) resolve(result);
                                else reject(error);
                            }
                        );

                        streamifier.createReadStream(req.file.buffer).pipe(stream);
                    });

                const result = await uploadFromBuffer();
                imageUrl = result.secure_url;
            }

            board.name = name;
            board.role = role;
            board.department = department;
            board.email = email;
            board.tel = tel;
            board.img = imageUrl;

            await board.save();
            res.redirect('/admin/board?message=แก้ไขข้อมูลสำเร็จ');
        } catch (error) {
            console.error(error);
            res.redirect('/admin/board?error=เกิดข้อผิดพลาดในการแก้ไขข้อมูล');
        }
    });
};

// ลบคณะกรรมการ (Soft Delete)
const boardDelete = async (req, res) => {
    try {
        const { id } = req.params;

        const board = await Board.findById(id);
        if (!board) {
            return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลคณะกรรมการ' });
        }

        // Soft delete
        board.isDeleted = true;
        await board.save();

        res.json({ success: true, message: 'ลบข้อมูลสำเร็จ' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการลบข้อมูล' });
    }
};


//หมู่บ้าน
const villageIndex = async (req, res) => {
    const page = parseInt(req.query.page) || 1; // รับค่า page จาก query parameter หรือใช้ 1 เป็นค่าเริ่มต้น
    const limit = 10; // จำนวน records ต่อหน้า
    const skip = (page - 1) * limit; // คำนวณจำนวน records ที่จะข้ามไป
    const filter = { isDeleted: false };

    try {
        const [villages, totalItems] = await Promise.all([
            Village.find(filter).skip(skip).limit(limit),
            Village.countDocuments(filter)
        ]);

        const totalPages = Math.ceil(totalItems / limit);

        res.render('admin/village', { 
            mytitle: 'Admindashboard | Village',
            villages: villages,
            currentPage: page,
            totalPages: totalPages,
            totalItems: totalItems,
            currentPage: 'village',
        });
    } catch (err) {
        console.error('เกิดข้อผิดพลาดในการดึงข้อมูลหมู่บ้าน:', err);
        res.status(500).send('เกิดข้อผิดพลาดในระบบ');
    }
};
//เพิ่มหมู่บ้าน (ป้องกันเพิ่มหมู่บ้านซ้ำ)
const villagePost = async (req, res) => {
    try {
        const { villageNumber, villageName, location } = req.body;

        // ตรวจสอบว่ามีหมู่บ้านที่มีหมายเลขหรือชื่อเดียวกันอยู่แล้วหรือไม่
        const existingVillage = await Village.findOne({ $or: [{ villageNumber }, { villageName }] });
        if (existingVillage) {
            return res.redirect('/admin/village?error=หมู่บ้านนี้มีอยู่แล้ว');
        }

        const newVillage = new Village({
            villageNumber,
            villageName,
            location
        });

        await newVillage.save();
        res.redirect('/admin/village?message=เพิ่มข้อมูลหมู่บ้านสำเร็จ');
    } catch (err) {
        console.error('เกิดข้อผิดพลาดในการเพิ่มหมู่บ้าน:', err);
        res.status(500).send('เกิดข้อผิดพลาดในระบบ');
    }
};
//แก้ไขหมู่บ้าน
const villageEdit = async (req, res) => {
    try {
        const { _id, villageNumber, villageName, location } = req.body;

        const village = await Village.findById(_id);

        if (!village) {
            return res.redirect('/admin/village?error=ไม่พบหมู่บ้านที่ต้องการแก้ไข');
        }

        // อัปเดตข้อมูลหมู่บ้าน
        village.villageNumber = villageNumber;
        village.villageName = villageName;
        village.location = location;

        await village.save();
        res.redirect('/admin/village?message=แก้ไขข้อมูลหมู่บ้านสำเร็จ');
    } catch (err) {
        console.error('เกิดข้อผิดพลาดในการแก้ไขหมู่บ้าน:', err);
        res.status(500).send('เกิดข้อผิดพลาดในระบบ');
    }
};
//ลบหมู่บ้าน (softDelete)
const villageDelete = async (req, res) => {
    try {
        const { id } = req.params;

        // ค้นหาหมู่บ้านตาม ID และลบ
        const village = await Village.findByIdAndUpdate(id,{ isDeleted: true});

        if (!village) {
            return res.status(404).send('ไม่พบหมู่บ้านที่ต้องการลบ');
        }

        res.redirect('/admin/village');
    } catch (err) {
        console.error('เกิดข้อผิดพลาดในการลบหมู่บ้าน:', err);
        res.status(500).send('เกิดข้อผิดพลาดในระบบ');
    }
};

//หน้ารอบการรับซื้อขยะ 
const roundIndex = (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;
    const filter = { isDeleted: false };

    const formatDate = (date) => {
        if (!date) return '';
        const options = { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Bangkok' };
        return new Date(date).toLocaleDateString('th-TH', options); 
    };

    Promise.all([
        Village.find(filter).sort({ createdAt: 1 }),
        WastePoint.find(filter).populate('village'),
        Round.find(filter)
            .populate('village')
            .populate('wastePoint')
            .sort({ date: -1 })
            .skip(skip)
            .limit(limit),
        Round.countDocuments(filter)
    ])
    .then(([villageResult, wastePointResult, roundResult, totalItems]) => {
        const totalPages = Math.ceil(totalItems / limit);

        roundResult = roundResult.map(round => ({
            ...round.toObject(), 
            formattedDateYYMMDD: new Date(round.date).toISOString().split('T')[0],
            formattedDateThai: formatDate(round.date)
        }));

        res.render('admin/round', {
            mytitle: 'Admindashboard | Round',
            village: villageResult,
            wastePoints: wastePointResult,
            rounds: roundResult,
            currentPage: page,
            totalPages: totalPages,
            totalItems: totalItems,
            currentPage: 'round',
        });
    })
    .catch((err) => {
        console.log(err);
        res.status(500).send('Error retrieving village and round data');
    });
};
// เพิ่มรอบรับซื้อขยะ 
const roundPost = async (req, res) => {
    try {
        const { roundName, village, wastePoint, date, startTime, endTime } = req.body;

        const newRound = new Round({
            roundName,
            village,
            wastePoint: wastePoint || null,
            date,
            startTime,
            endTime
        });
        await newRound.save();

        const villageData = await Village.findById(village);
        const villageName = villageData ? villageData.villageName : "ทุกหมู่บ้าน";

        // ดึงข้อมูลจุดรับซื้อ (ถ้ามี)
        let wastePointInfo = "";
        if (wastePoint) {
            const wastePointData = await WastePoint.findById(wastePoint);
            if (wastePointData) {
                wastePointInfo = `<li><strong>จุดรับซื้อ:</strong> ${wastePointData.wastePointName}</li>`;
            }
        }

        const allFamilies = await Family.find({ isDeleted: false });
        if (allFamilies.length > 0) {
            const notifications = allFamilies.map(family => ({
                userId: family._id,
                type: 'round',
                title: `📢 แจ้งรอบรับซื้อขยะใหม่: ${roundName}`,
                content: `
                    <ul>
                        <li><strong>หมู่บ้าน:</strong> ${villageName}</li>
                        ${wastePointInfo}
                        <li><strong>วันที่:</strong> ${new Date(date).toLocaleDateString('th-TH', { year:'numeric', month:'long', day:'numeric' })}</li>
                        <li><strong>เวลา:</strong> ${startTime} - ${endTime}</li>
                    </ul>
                `
            }));

            await Notification.insertMany(notifications);
            console.log(`✅ ส่งแจ้งเตือนให้ทุกครอบครัวทั้งหมด ${allFamilies.length} ครอบครัว`);
        }

        res.redirect('/admin/round?message=เพิ่มรอบการรับซื้อสำเร็จ');
    } catch (error) {
        console.error('Error creating round:', error);
        res.status(500).send('เกิดข้อผิดพลาดในการบันทึกรอบรับซื้อขยะ');
    }
};

// แก้ไขรอบรับซื้อขยะ
const roundEdit = async (req, res) => {
    try {
        const { _id, roundName, village, wastePoint, date, startTime, endTime } = req.body;

        if (!_id || !roundName || !village || !date || !startTime || !endTime) {
            return res.redirect('/admin/round?error=กรอกข้อมูลให้ครบ');
        }

        await Round.findByIdAndUpdate(_id, {
            roundName,
            village,
            wastePoint: wastePoint || null,
            date,
            startTime,
            endTime
        });

        const villageData = await Village.findById(village);
        if (!villageData) throw new Error("ไม่พบข้อมูลหมู่บ้าน");

        let wastePointInfo = "";
        if (wastePoint) {
            const wastePointData = await WastePoint.findById(wastePoint);
            if (wastePointData) {
                wastePointInfo = `<li><strong>จุดรับซื้อ:</strong> ${wastePointData.wastePointName}</li>`;
            }
        }

        const families = await Family.find({ village }).populate('village');

        if (families.length > 0) {
            const notifications = families.map(family => ({
                userId: family._id,
                type: 'round',
                title: `🛠️ มีการแก้ไขรอบรับซื้อขยะ: ${roundName}`,
                content: `
                    <ul>
                        <li><strong>หมู่บ้าน:</strong> ${villageData.villageName}</li>
                        ${wastePointInfo}
                        <li><strong>วันที่:</strong> ${new Date(date).toLocaleDateString('th-TH', { year:'numeric', month:'long', day:'numeric' })}</li>
                        <li><strong>เวลาใหม่:</strong> ${startTime} - ${endTime}</li>
                    </ul>
                `
            }));

            await Notification.insertMany(notifications);
            console.log(`✅ แจ้งเตือนครอบครัวในหมู่บ้าน ${villageData.villageName} จำนวน ${families.length} ครอบครัว`);
        }

        res.redirect('/admin/round?message=แก้ไขรอบการรับซื้อสำเร็จ');
    } catch (error) {
        console.error('Error updating round:', error);
        res.redirect('/admin/round?error=เกิดข้อผิดพลาดในการแก้ไขรอบรับซื้อขยะ');
    }
};
// ลบรอบรับซื้อขยะ (softDelete)
const roundDelete = (req, res) => {
    const { id } = req.params;

    Round.findByIdAndUpdate(id , { isDeleted : true })
        .then(() => res.redirect('/admin/round?message=ลบรอบการรับซื้อสำเร็จ'))
        .catch((err) => {
            console.log(err);
            res.status(500).send('Error deleting round data');
        });
};

// จุดรับซื้อขยะ - แบบเรียบง่าย
const wastePointIndex = async (req, res) => {
    try {
        const wastePoints = await WastePoint.find({ isDeleted: false })
            .populate('village', 'villageName')
            .sort({ createdAt: -1 });

        res.render('admin/wastePoint', {
            mytitle: 'ผู้ดูแลระบบ | แผนที่จุดรับซื้อขยะ',
            currentPage: 'wastePoint',
            wastePoints
        });
    } catch (err) {
        console.error('Error loading waste points:', err);
        res.redirect('/admin?error=เกิดข้อผิดพลาดในการโหลดข้อมูล');
    }
};

const wastePointToggle = async (req, res) => {
    const { id } = req.params;
    const { isOpen } = req.query;
    try {
        await WastePoint.findByIdAndUpdate(id, { isOpen: isOpen === "true" });
        res.redirect("/admin/wastePoint?message=อัปเดตสถานะสำเร็จ");
    } catch (err) {
        console.error('Error toggling status:', err);
        res.redirect("/admin/wastePoint?error=ไม่สามารถอัปเดตสถานะได้");
    }
};

const wastePointCreate = async (req, res) => {
    try {
        const villages = await Village.find({ isDeleted: false }).sort({ villageName: 1 });
        
        res.render('admin/wastePointCreate', {
            mytitle: 'เพิ่มจุดรับซื้อขยะ',
            username: req.session.username || "Admin",
            currentPage: 'wastePoint',
            villages
        });
    } catch (err) {
        console.error('Error loading create page:', err);
        res.redirect('/admin/wastePoint?error=เกิดข้อผิดพลาดในการโหลดหน้า');
    }
};

const wastePointPost = async (req, res) => {
    try {
        const {
            addBy,
            wastePointName,
            village,
            location,
            type,
            note,
            latitude,
            longitude,
            isOpen
        } = req.body;

        // ตรวจสอบข้อมูลที่จำเป็น
        if (!wastePointName || !location || !type || !latitude || !longitude) {
            return res.redirect('/admin/wastePoint/create?error=กรุณากรอกข้อมูลให้ครบถ้วน');
        }

        const newPoint = new WastePoint({
            addBy,
            wastePointName,
            village: village || null,
            location,
            type,
            note: note || '',
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
            isOpen: isOpen === "true"
        });

        await newPoint.save();
        
        res.redirect('/admin/wastePoint?message=เพิ่มจุดรับซื้อสำเร็จ');
    } catch (err) {
        console.error("Error saving waste point:", err);
        res.redirect('/admin/wastePoint/create?error=เกิดข้อผิดพลาดในการบันทึก');
    }
};

const wastePointEdit = async (req, res) => {
    const { id } = req.params;
    try {
        const wastePoint = await WastePoint.findById(id).populate('village');
        
        if (!wastePoint) {
            return res.redirect("/admin/wastePoint?error=ไม่พบข้อมูลจุดรับซื้อขยะ");
        }

        const villages = await Village.find({ isDeleted: false }).sort({ villageName: 1 });

        res.render("admin/wastePointEdit", {
            mytitle: "แก้ไขจุดรับซื้อขยะ",
            username: req.session.username || "Admin",
            currentPage: 'wastePoint',
            wastePoint,
            villages
        });
    } catch (err) {
        console.error("Error fetching waste point:", err);
        res.redirect("/admin/wastePoint?error=เกิดข้อผิดพลาดในการโหลดข้อมูล");
    }
};

const wastePointUpdate = async (req, res) => {
    const { id } = req.params;
    try {
        const {
            wastePointName,
            village,
            location,
            type,
            note,
            latitude,
            longitude,
            isOpen,
            updateBy
        } = req.body;

        // ตรวจสอบข้อมูลที่จำเป็น
        if (!wastePointName || !location || !type || !latitude || !longitude) {
            return res.redirect(`/admin/wastePoint/edit/${id}?error=กรุณากรอกข้อมูลให้ครบถ้วน`);
        }

        const updatedWastePoint = await WastePoint.findByIdAndUpdate(
            id,
            {
                wastePointName,
                village: village || null,
                location,
                type,
                note: note || '',
                latitude: parseFloat(latitude),
                longitude: parseFloat(longitude),
                isOpen: isOpen === 'true',
                updateBy,
                updateAt: new Date()
            },
            { new: true, runValidators: true }
        );

        if (!updatedWastePoint) {
            return res.redirect("/admin/wastePoint?error=ไม่พบข้อมูลจุดรับซื้อขยะ");
        }

        res.redirect("/admin/wastePoint?message=อัปเดตข้อมูลสำเร็จ");
    } catch (err) {
        console.error("Error updating waste point:", err);
        res.redirect(`/admin/wastePoint/edit/${id}?error=ไม่สามารถอัปเดตข้อมูลได้`);
    }
};

const wastePointDelete = async (req, res) => {
    const { id } = req.params;
    try {
        const wastePoint = await WastePoint.findById(id);
        
        if (!wastePoint || wastePoint.isDeleted) {
            return res.redirect("/admin/wastePoint?error=ไม่พบข้อมูลจุดรับซื้อขยะ");
        }

        // Soft Delete
        wastePoint.isDeleted = true;
        await wastePoint.save();

        res.redirect("/admin/wastePoint?message=ลบข้อมูลสำเร็จ");
    } catch (err) {
        console.error("Error deleting waste point:", err);
        res.redirect("/admin/wastePoint?error=ไม่สามารถลบข้อมูลได้");
    }
};

// หน้าฌาปนกิจสงเคราะห์
const funeralAidIndex = (req, res) => {
    res.render('admin/funeralAid', {
        mytitle: 'พนักงาน | ฌาปนกิจสงเคราะห์',
        currentPage: 'funeralAid',
    });
};

// API: ค้นหาครัวเรือน
const searchHouseholds = async (req, res) => {
    try {
        const { query, limit } = req.query;
        const maxLimit = parseInt(limit) || 20;

        // ฟังก์ชันช่วยนับสมาชิกทั้งหมดของครอบครัว (รวม householdMembers ที่ยังมีชีวิต)
        const countTotalMembers = async (familyId) => {
            // ดึงข้อมูล Member ทั้งหมดของครอบครัว
            const members = await Member.find({
                familyID: familyId,
                isDeleted: false,
                Status: 'living' // นับเฉพาะคนที่ยังมีชีวิต
            }).lean();

            let totalCount = members.length;

            members.forEach(member => {
                if (member.householdMembers && member.householdMembers.length > 0) {
                    const livingHouseholdMembers = member.householdMembers.filter(
                        m => m.status === 'living'
                    );
                    totalCount += livingHouseholdMembers.length;
                }
            });

            return totalCount;
        };

        // ถ้าไม่มี query ให้แสดงรายการล่าสุด
        if (!query || query.trim().length === 0) {
            const recentFamilies = await Family.find({
                isDeleted: false
            })
            .populate('village', 'villageNumber villageName')
            .sort({ createdAt: -1 })
            .limit(maxLimit)
            .lean();

            const householdsData = await Promise.all(
                recentFamilies.map(async (family) => {
                    const account = await WasteBankAccount.findOne({
                        familyID: family._id,
                        isDeleted: false
                    }).lean();

                    const representative = await Member.findOne({
                        familyID: family._id,
                        isDeleted: false
                    }).lean();

                    const memberCount = await countTotalMembers(family._id);

                    return {
                        id: account ? account.AccountNumber : family.username,
                        familyID: family._id,
                        head: representative ? representative.name : family.familyName,
                        address: family.address ? 
                            `${family.address.houseNumber || ''} หมู่ ${family.address.moo || ''} ${family.address.subdistrict || ''} ${family.address.district || ''} ${family.address.province || ''}`.trim() 
                            : 'ไม่ระบุ',
                        memberCount: memberCount,
                        registrationDate: account ? account.OpenDate : family.createdAt,
                        totalSales: account ? account.Balance : 0,
                        accountID: account ? account._id : null,
                        addressDetails: {
                            houseNumber: family.address?.houseNumber || '',
                            moo: family.village?.villageNumber || family.address?.moo || '',
                            villageName: family.village?.villageName || '',
                            subdistrict: family.address?.subdistrict || '',
                            district: family.address?.district || '',
                            province: family.address?.province || '',
                            postalCode: family.address?.postalCode || ''
                        }
                    };
                })
            );

            return res.json({ 
                success: true, 
                data: householdsData 
            });
        }

        // ค้นหาจาก WasteBankAccount ก่อน
        const accountMatches = await WasteBankAccount.find({
            isDeleted: false,
            AccountNumber: { $regex: query, $options: 'i' }
        })
        .limit(maxLimit)
        .lean();

        const accountFamilyIds = accountMatches.map(acc => acc.familyID);

        // ค้นหาจาก Family
        const familyMatches = await Family.find({
            isDeleted: false,
            $or: [
                { familyName: { $regex: query, $options: 'i' } },
                { username: { $regex: query, $options: 'i' } }
            ]
        })
        .limit(maxLimit)
        .lean();

        const allFamilyIds = [
            ...accountFamilyIds,
            ...familyMatches.map(f => f._id)
        ];

        const uniqueFamilyIds = [...new Set(allFamilyIds.map(id => id.toString()))];

        const householdsData = await Promise.all(
            uniqueFamilyIds.map(async (familyIdStr) => {
                const familyId = new mongoose.Types.ObjectId(familyIdStr);

                const family = await Family.findById(familyId)
                    .populate('village', 'villageNumber villageName')
                    .lean();
                    
                if (!family || family.isDeleted) return null;

                const account = await WasteBankAccount.findOne({
                    familyID: familyId,
                    isDeleted: false
                }).lean();

                const representative = await Member.findOne({
                    familyID: familyId,
                    isDeleted: false
                }).lean();

                const memberCount = await countTotalMembers(familyId);

                return {
                    id: account ? account.AccountNumber : family.username,
                    familyID: family._id,
                    head: representative ? representative.name : family.familyName,
                    address: family.address ? 
                        `${family.address.houseNumber || ''} หมู่ ${family.address.moo || ''} ${family.address.subdistrict || ''} ${family.address.district || ''} ${family.address.province || ''}`.trim() 
                        : 'ไม่ระบุ',
                    memberCount: memberCount,
                    registrationDate: account ? account.OpenDate : family.createdAt,
                    totalSales: account ? account.Balance : 0,
                    accountID: account ? account._id : null,
                    addressDetails: {
                        houseNumber: family.address?.houseNumber || '',
                        moo: family.village?.villageNumber || family.address?.moo || '',
                        villageName: family.village?.villageName || '',
                        subdistrict: family.address?.subdistrict || '',
                        district: family.address?.district || '',
                        province: family.address?.province || '',
                        postalCode: family.address?.postalCode || ''
                    }
                };
            })
        );

        const validHouseholds = householdsData.filter(household => household !== null);

        res.json({ 
            success: true, 
            data: validHouseholds 
        });

    } catch (error) {
        console.error('Error searching households:', error);
        res.status(500).json({ 
            success: false, 
            message: 'เกิดข้อผิดพลาดในการค้นหาครัวเรือน',
            error: error.message 
        });
    }
};

// API: ดึงรายชื่อสมาชิกในครัวเรือน (สำหรับ Employee)
const getFamilyMembers = async (req, res) => {
    try {
        const { familyID } = req.params;

        const family = await Family.findById(familyID).where({ isDeleted: false });

        if (!family) {
            return res.status(404).json({
                success: false,
                message: 'ไม่พบข้อมูลครัวเรือน'
            });
        }

        const members = await Member.find({
            familyID: family._id,
            isDeleted: false
        }).select('name idCardNumber age phone birthDate Status householdMembers').lean();

        const memberList = [];

        members.forEach(member => {
            // ✅ ตัวแทนครัวเรือน (main) — มีข้อมูลครบ
            memberList.push({
                _id: member._id,
                name: member.name,
                idCardNumber: member.idCardNumber || '',
                age: member.age || '',
                phone: member.phone || '',
                status: member.Status || 'living',
                type: 'main',
                relation: 'ตัวแทนครัวเรือน'
            });

            // ✅ สมาชิกในครัวเรือน (householdMember) — ดึงข้อมูลครบจาก Schema
            if (member.householdMembers && member.householdMembers.length > 0) {
                member.householdMembers.forEach(hm => {
                    memberList.push({
                        _id: `householdMember_${hm._id}`,
                        name: hm.name,
                        idCardNumber: hm.idCardNumber || '', 
                        age: hm.age || '',                   
                        phone: hm.phone || '',               
                        relation: hm.relationToHead || '',
                        status: hm.status || 'living',
                        type: 'householdMember',
                        mainMemberId: member._id
                    });
                });
            }
        });

        return res.json({
            success: true,
            data: memberList,
            stats: {
                total: memberList.length,
                living: memberList.filter(m => m.status === 'living').length,
                deceased: memberList.filter(m => m.status === 'deceased').length
            }
        });

    } catch (error) {
        console.error('getFamilyMembers error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงข้อมูลสมาชิก'
        });
    }
};

// ตรวจสอบคุณสมบัติ (อัพเดท: ใช้ MembershipDate แทน IsMember)
const checkEligibility = async (req, res) => {
    try {
        const { familyID } = req.params;

        const account = await WasteBankAccount.findOne({
            familyID: familyID,
            isDeleted: false
        }).lean();

        if (!account) {
            return res.status(404).json({ 
                success: false, 
                message: 'ไม่พบบัญชีธนาคารขยะของครัวเรือนนี้' 
            });
        }

        // ตรวจสอบว่าเคยเป็นสมาชิกหรือไม่ (มี MembershipDate)
        const hasEverBeenMember = !!account.MembershipDate;
        const totalSalesAmount = account.TotalSalesAmount || 0;
        const currentBalance = account.Balance || 0;
        const isCurrentlyActive = account.IsMember; // สถานะปัจจุบัน

        // คำนวณอายุสมาชิก
        let membershipDays = 0;
        let membershipMonths = 0;
        let passedMembershipPeriod = false;
        
        if (account.MembershipDate) {
            const today = new Date();
            const membershipDate = new Date(account.MembershipDate);
            membershipDays = Math.floor((today - membershipDate) / (1000 * 60 * 60 * 24));
            membershipMonths = Math.floor(membershipDays / 30);
            passedMembershipPeriod = membershipDays >= 180;
        }

        // เงื่อนไขการขอรับฌาปนกิจ
        const passedSalesRequirement = totalSalesAmount >= 300;
        const hasActiveBalance = currentBalance >= 300;
        const isCurrentlyActiveMember = isCurrentlyActive; // ต้อง IsMember = true
        
        // สรุปผล: ต้องมี MembershipDate, ครบ 180 วัน, ยอดคงเหลือ >= 300, และ IsMember = true
        const isEligible = hasEverBeenMember && passedMembershipPeriod && hasActiveBalance && isCurrentlyActiveMember;

        // เหตุผลที่ไม่มีสิทธิ์ (แก้ไขตรงนี้)
        let ineligibleReasons = [];
        
        // กรณี 1: ยังไม่เคยเป็นสมาชิก
        if (!hasEverBeenMember) {
            ineligibleReasons.push('ยังไม่เคยเป็นสมาชิก (ต้องขายขยะสะสมครบ 300 บาท)');
        } 
        // กรณี 2: เคยเป็นสมาชิกแล้ว แต่มีปัญหาอื่น
        else {
            if (!passedMembershipPeriod) {
                ineligibleReasons.push(`ยังเป็นสมาชิกไม่ครบ 180 วัน (เป็นสมาชิกมา ${membershipDays} วัน)`);
            }
            
            if (!hasActiveBalance) {
                ineligibleReasons.push(`ยอดคงเหลือไม่ถึง 300 บาท (มี ${currentBalance.toFixed(2)} บาท)`);
            }
            
            // เฉพาะคนที่เคยเป็นสมาชิกแล้วเท่านั้นที่จะโดน "พัก"
            if (!isCurrentlyActiveMember) {
                ineligibleReasons.push('สถานะสมาชิกถูกพักชั่วคราว');
            }
        }

        console.log(`
========================================
🔍 ตรวจสอบคุณสมบัติฌาปนกิจ
========================================
FamilyID: ${familyID}
HasMembershipDate: ${hasEverBeenMember}
TotalSalesAmount: ${totalSalesAmount} บาท
CurrentBalance: ${currentBalance} บาท
IsCurrentlyActive: ${isCurrentlyActive}
MembershipDate: ${account.MembershipDate}
MembershipDays: ${membershipDays} วัน (${membershipMonths} เดือน)
PassedMembershipPeriod: ${passedMembershipPeriod} (>= 180 วัน)
PassedSalesRequirement: ${passedSalesRequirement} (>= 300 บาท)
HasActiveBalance: ${hasActiveBalance} (>= 300 บาท)
IsCurrentlyActiveMember: ${isCurrentlyActiveMember} (IsMember = true)
IsEligible: ${isEligible}
${ineligibleReasons.length > 0 ? `Reasons: ${ineligibleReasons.join(', ')}` : ''}
========================================
        `);

        res.json({
            success: true,
            data: {
                // ข้อมูลสมาชิก
                hasEverBeenMember: hasEverBeenMember,
                isCurrentlyActive: isCurrentlyActive,
                membershipDate: account.MembershipDate,
                membershipDays: membershipDays,
                membershipMonths: membershipMonths,
                
                // ข้อมูลการขาย
                totalSalesAmount: totalSalesAmount,
                passedSalesRequirement: passedSalesRequirement,
                
                // ข้อมูลยอดเงิน
                currentBalance: currentBalance,
                hasActiveBalance: hasActiveBalance,
                isCurrentlyActiveMember: isCurrentlyActiveMember,
                
                // ข้อมูลระยะเวลา
                passedMembershipPeriod: passedMembershipPeriod,
                
                // สรุปผล
                isEligible: isEligible,
                ineligibleReasons: ineligibleReasons,
                
                // ข้อมูลเพิ่มเติม
                pendingDeductions: account.PendingDeductions || 0,
                registrationDate: account.OpenDate,
                
                // สถานะพิเศษ
                needsBalanceTopUp: hasEverBeenMember && !hasActiveBalance,
                canRegainMembership: hasEverBeenMember && !isCurrentlyActive && currentBalance < 300
            }
        });

    } catch (error) {
        console.error('Error checking eligibility:', error);
        res.status(500).json({ 
            success: false, 
            message: 'เกิดข้อผิดพลาดในการตรวจสอบคุณสมบัติ',
            error: error.message 
        });
    }
};


// API: คำนวณเงินฌาปนกิจ
const calculateFuneralAmount = async (req, res) => {
    try {
        const { amount } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'กรุณาระบุจำนวนเงินที่ถูกต้อง' 
            });
        }

        // นับเฉพาะบัญชีที่เป็นสมาชิกแล้ว
        const totalAccounts = await WasteBankAccount.countDocuments({
            isDeleted: false,
            IsMember: true
        });

        if (totalAccounts === 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'ไม่มีบัญชีสมาชิกในระบบ' 
            });
        }

        const perAccountAmount = amount / totalAccounts;

        // ดึงข้อมูลบัญชีทั้งหมดพร้อม populate ครัวเรือน
        const accounts = await WasteBankAccount.find({
            isDeleted: false,
            IsMember: true
        })
        .populate('familyID', 'familyName username')
        .select('AccountNumber AccountName Balance familyID')
        .sort({ AccountNumber: 1 })
        .lean();

        const totalBalance = accounts.reduce((sum, acc) => sum + (acc.Balance || 0), 0);

        // แบ่งบัญชีออกเป็น 2 กลุ่ม
        const sufficientAccounts = [];
        const insufficientAccounts = [];

        accounts.forEach(acc => {
            const accountInfo = {
                accountNumber: acc.AccountNumber,
                accountName: acc.AccountName,
                familyName: acc.familyID?.familyName || 'ไม่ระบุ',
                currentBalance: acc.Balance,
                deductAmount: perAccountAmount,
                balanceAfter: acc.Balance - perAccountAmount
            };

            if (acc.Balance >= perAccountAmount) {
                sufficientAccounts.push(accountInfo);
            } else {
                insufficientAccounts.push({
                    ...accountInfo,
                    shortage: perAccountAmount - acc.Balance
                });
            }
        });

        res.json({
            success: true,
            data: {
                totalAmount: amount,
                totalAccounts: totalAccounts,
                perAccountAmount: perAccountAmount,
                totalBalance: totalBalance,
                afterBalance: totalBalance - amount,
                
                // ส่งรายละเอียดบัญชีกลับไปด้วย
                sufficientAccounts: sufficientAccounts,
                insufficientAccounts: insufficientAccounts,
                
                // สรุป
                accountsWithSufficientBalance: sufficientAccounts.length,
                accountsWithInsufficientBalance: insufficientAccounts.length
            }
        });

    } catch (error) {
        console.error('Error calculating funeral amount:', error);
        res.status(500).json({ 
            success: false, 
            message: 'เกิดข้อผิดพลาดในการคำนวณเงินฌาปนกิจ',
            error: error.message 
        });
    }
};

// API: บันทึกข้อมูลฌาปนกิจ (ขั้นตอนที่ 1 - ดึงรายการบัญชีที่จะหัก)
const getDeductionPreview = async (req, res) => {
    try {
        const { familyID, amount } = req.body;

        if (!familyID || !amount) {
            return res.status(400).json({ 
                success: false, 
                message: 'กรุณาระบุข้อมูลครัวเรือนและจำนวนเงิน' 
            });
        }

        // ตรวจสอบคุณสมบัติ
        const account = await WasteBankAccount.findOne({
            familyID: familyID,
            isDeleted: false
        }).lean();

        if (!account || !account.IsMember) {
            return res.status(400).json({ 
                success: false, 
                message: 'ครัวเรือนนี้ยังไม่เป็นสมาชิก' 
            });
        }

        // นับจำนวนบัญชีสมาชิก
        const totalAccounts = await WasteBankAccount.countDocuments({
            isDeleted: false,
            IsMember: true
        });

        const perAccountAmount = parseFloat(amount) / totalAccounts;

        // ดึงบัญชีสมาชิกทั้งหมด
        const allAccounts = await WasteBankAccount.find({
            isDeleted: false,
            IsMember: true
        })
        .populate('familyID', 'familyName username')
        .lean();

        // แยกบัญชีตามสถานะ
        const accountsToDeduct = [];
        const insufficientAccounts = [];

        for (const acc of allAccounts) {
            const deductionInfo = {
                accountID: acc._id,
                familyID: acc.familyID._id,
                accountNumber: acc.AccountNumber,
                accountName: acc.AccountName,
                familyName: acc.familyID.familyName,
                deductedAmount: perAccountAmount,
                balanceBefore: acc.Balance,
                balanceAfter: acc.Balance - perAccountAmount
            };

            if (acc.Balance >= perAccountAmount) {
                accountsToDeduct.push({
                    ...deductionInfo,
                    status: 'sufficient'
                });
            } else {
                accountsToDeduct.push({
                    ...deductionInfo,
                    status: 'insufficient',
                    pendingAmount: perAccountAmount - acc.Balance
                });
                insufficientAccounts.push(deductionInfo);
            }
        }

        res.json({
            success: true,
            data: {
                summary: {
                    totalAmount: parseFloat(amount),
                    totalAccounts: totalAccounts,
                    perAccountAmount: perAccountAmount,
                    accountsWithSufficientBalance: accountsToDeduct.filter(a => a.status === 'sufficient').length,
                    accountsWithInsufficientBalance: insufficientAccounts.length,
                    totalDeductedAmount: perAccountAmount * totalAccounts
                },
                accountsToDeduct: accountsToDeduct,
                insufficientAccounts: insufficientAccounts
            }
        });

    } catch (error) {
        console.error('Error getting deduction preview:', error);
        res.status(500).json({ 
            success: false, 
            message: 'เกิดข้อผิดพลาดในการดึงข้อมูลรายการหัก',
            error: error.message 
        });
    }
};

// กำหนด multer สำหรับฌาปนกิจ
const uploadfuneral = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB
}).fields([
    { name: 'deathCertificate', maxCount: 1 },
    { name: 'deceasedIdCard', maxCount: 1 },
    { name: 'deceasedHouseRegistration', maxCount: 1 },
    { name: 'applicantIdCard', maxCount: 1 },
    { name: 'applicantHouseRegistration', maxCount: 1 }
]);

// ฟังก์ชันอัปโหลดไฟล์ขึ้น Cloudinary
const uploadToCloudinary = (fileBuffer, fileName, folderName = 'funeral-documents-fromEmployeeUpload') => {
    const isPDF = fileName.toLowerCase().endsWith('.pdf');
    
    return new Promise((resolve, reject) => {
        const uploadOptions = {
            folder: folderName,
            resource_type: isPDF ? 'raw' : 'image',
            type: 'upload',
            access_mode: 'public'
        };

        // if (isPDF) {
        //     uploadOptions.format = 'pdf';
        // }

        const stream = cloudinary.uploader.upload_stream(
            uploadOptions,
            (error, result) => {
                if (result) {
                    resolve(result);
                } else {
                    reject(error);
                }
            }
        );
        
        streamifier.createReadStream(fileBuffer).pipe(stream);
    });
};

// submitFuneralAssistance เดิมให้รองรับไฟล์
const submitFuneralAssistance = (req, res) => {
    uploadfuneral(req, res, async (err) => {
        if (err) {
            console.error("❌ Multer upload error:", err);
            return res.status(400).json({
                success: false,
                message: 'อัปโหลดไฟล์ไม่สำเร็จ: ' + err.message
            });
        }

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            console.log('📥 Request body:', req.body);
            console.log('📎 Files:', req.files ? Object.keys(req.files) : 'No files');
            
            const { 
                familyID,
                responsiblePersonName,
                responsiblePersonId,
                relationship,
                deceasedName,
                deceasedId,
                deceasedAge,
                idCard,
                deceasedAddress,
                deceasedVillage,
                subDistrict,
                district,
                province,
                postalCode,
                phone,
                causeOfDeath,
                dateOfDeath,
                notes,
                amount
            } = req.body;

            // ========== 1. Validate ข้อมูล ==========
            const requiredFields = {
                familyID: 'ครัวเรือน',
                responsiblePersonName: 'ชื่อผู้รับผิดชอบในการจัดทำศพ',
                relationship: 'ความเกี่ยวข้องกับผู้ตาย',
                deceasedName: 'ชื่อผู้เสียชีวิต',
                deceasedAge: 'อายุผู้เสียชีวิต',
                idCard: 'หมายเลขบัตรประชาชน',
                deceasedAddress: 'บ้านเลขที่',
                deceasedVillage: 'หมู่ที่',
                subDistrict: 'ตำบล',
                district: 'อำเภอ',
                province: 'จังหวัด',
                postalCode: 'รหัสไปรษณีย์',
                phone: 'โทรศัพท์',
                causeOfDeath: 'สาเหตุการเสียชีวิต',
                dateOfDeath: 'วันที่เสียชีวิต',
                amount: 'จำนวนเงินช่วยเหลือ'
            };

            const missingFields = [];
            for (const [field, label] of Object.entries(requiredFields)) {
                if (!req.body[field] || req.body[field].toString().trim() === '') {
                    missingFields.push(label);
                }
            }

            if (missingFields.length > 0) {
                await session.abortTransaction();
                return res.status(400).json({ 
                    success: false, 
                    message: `กรุณากรอกข้อมูลให้ครบถ้วน: ${missingFields.join(', ')}`
                });
            }

            // ตรวจสอบว่าเลือกคนซ้ำกันหรือไม่
            if (responsiblePersonId && deceasedId && responsiblePersonId === deceasedId) {
                await session.abortTransaction();
                return res.status(400).json({
                    success: false,
                    message: 'ผู้รับผิดชอบและผู้เสียชีวิตต้องไม่เป็นคนเดียวกัน'
                });
            }

            // ========== 2. ตรวจสอบไฟล์ ==========
            let documents = {};
            
            if (req.files && Object.keys(req.files).length > 0) {
                console.log('📤 Uploading files to Cloudinary...');
                const requiredFiles = [
                    'deathCertificate',
                    'deceasedIdCard',
                    'deceasedHouseRegistration',
                    'applicantIdCard',
                    'applicantHouseRegistration'
                ];

                const uploadPromises = requiredFiles
                    .filter(fieldName => req.files[fieldName] && req.files[fieldName][0])
                    .map(async (fieldName) => {
                        const file = req.files[fieldName][0];
                        try {
                            console.log(`⏳ Uploading ${fieldName}...`);
                            const result = await uploadToCloudinary(file.buffer, file.originalname);
                            console.log(`✅ Uploaded ${fieldName}: ${result.secure_url}`);
                            return {
                                fieldName,
                                url: result.secure_url
                            };
                        } catch (error) {
                            console.error(`❌ Error uploading ${fieldName}:`, error);
                            throw new Error(`ไม่สามารถอัปโหลด ${fieldName} ได้`);
                        }
                    });

                const uploadedFiles = await Promise.all(uploadPromises);

                uploadedFiles.forEach(file => {
                    documents[file.fieldName] = file.url;
                });
                
                console.log('✅ All files uploaded successfully');
            }

            // ========== 3. ตรวจสอบบัญชีและคุณสมบัติ ==========
            const account = await WasteBankAccount.findOne({
                familyID: familyID,
                isDeleted: false
            }).session(session);

            if (!account) {
                await session.abortTransaction();
                return res.status(404).json({ 
                    success: false, 
                    message: 'ไม่พบบัญชีธนาคารขยะของครัวเรือนนี้' 
                });
            }

            if (!account.MembershipDate) {
                await session.abortTransaction();
                return res.status(400).json({ 
                    success: false, 
                    message: 'ยังไม่เคยเป็นสมาชิก (ต้องขายขยะสะสมครบ 300 บาทก่อน)' 
                });
            }

            const today = new Date();
            const membershipDate = new Date(account.MembershipDate);
            const daysDiff = Math.floor((today - membershipDate) / (1000 * 60 * 60 * 24));
            const passedMembershipPeriod = daysDiff >= 180;

            if (!passedMembershipPeriod) {
                await session.abortTransaction();
                return res.status(400).json({ 
                    success: false, 
                    message: `ยังไม่ครบ 180 วัน (เป็นสมาชิกมา ${daysDiff} วัน)` 
                });
            }

            // ========== 4. นับจำนวนบัญชีสมาชิก ==========
            const totalMemberAccounts = await WasteBankAccount.countDocuments({
                isDeleted: false,
                MembershipDate: { $ne: null }
            }).session(session);

            if (totalMemberAccounts === 0) {
                await session.abortTransaction();
                return res.status(400).json({ 
                    success: false, 
                    message: 'ไม่มีบัญชีสมาชิกในระบบ' 
                });
            }

            const perAccountAmount = parseFloat(amount) / totalMemberAccounts;

            // ========== 5. ดึงบัญชีสมาชิกทั้งหมด ==========
            const memberAccounts = await WasteBankAccount.find({
                isDeleted: false,
                MembershipDate: { $ne: null }
            })
            .populate({
                path: 'familyID',
                select: 'familyName username',
                match: { isDeleted: false }
            })
            .session(session);

            const validMemberAccounts = memberAccounts.filter(acc => acc.familyID !== null);

            if (validMemberAccounts.length === 0) {
                await session.abortTransaction();
                return res.status(400).json({ 
                    success: false, 
                    message: 'ไม่มีบัญชีสมาชิกที่ใช้งานได้ในระบบ' 
                });
            }

            const accountsToDeduct = [];
            let totalDeductedAmount = 0;
            let accountsWithSufficientBalance = 0;
            let accountsWithInsufficientBalance = 0;
            let membershipStatusChanges = [];

            // ========== 6. หักเงินจากบัญชีสมาชิกทุกบัญชี ==========
            for (const acc of validMemberAccounts) {
                const balanceBefore = acc.Balance;
                const wasActiveMember = acc.IsMember;
                let status = 'sufficient';
                let pendingAmount = 0;
                
                if (balanceBefore >= perAccountAmount) {
                    acc.Balance -= perAccountAmount;
                    accountsWithSufficientBalance++;
                } else {
                    const insufficientAmount = perAccountAmount - balanceBefore;
                    acc.Balance = 0;
                    acc.PendingDeductions = (acc.PendingDeductions || 0) + insufficientAmount;
                    pendingAmount = insufficientAmount;
                    status = 'insufficient_but_deducted';
                    accountsWithInsufficientBalance++;
                }
                
                if (acc.Balance < 300) {
                    if (acc.IsMember) {
                        acc.IsMember = false;
                        membershipStatusChanges.push({
                            accountNumber: acc.AccountNumber,
                            familyName: acc.familyID?.familyName || 'ไม่ระบุ',
                            status: 'lost',
                            balanceAfter: acc.Balance
                        });
                    }
                }
                
                await acc.save({ session });

                accountsToDeduct.push({
                    accountID: acc._id,
                    familyID: acc.familyID?._id,
                    accountNumber: acc.AccountNumber,
                    accountName: acc.AccountName,
                    deductedAmount: perAccountAmount,
                    balanceBefore: balanceBefore,
                    balanceAfter: acc.Balance,
                    pendingAmount: pendingAmount,
                    status: status,
                    wasActiveMember: wasActiveMember,
                    isActiveMemberNow: acc.IsMember,
                    deductedAt: new Date()
                });

                totalDeductedAmount += perAccountAmount;
            }

            // ========== 7. สร้างบันทึกฌาปนกิจ ==========
            let validDeceasedId = null;
                if (deceasedId) {
                    if (deceasedId.startsWith('householdMember_')) {
                        const hmId = deceasedId.split('_')[1];
                        if (mongoose.Types.ObjectId.isValid(hmId)) {
                            validDeceasedId = new mongoose.Types.ObjectId(hmId);
                        }
                    } else if (mongoose.Types.ObjectId.isValid(deceasedId)) {
                        validDeceasedId = new mongoose.Types.ObjectId(deceasedId);
                    }
                }

                let validResponsibleId = null;
                if (responsiblePersonId) {
                    if (responsiblePersonId.startsWith('householdMember_')) {
                        const hmId = responsiblePersonId.split('_')[1];
                        if (mongoose.Types.ObjectId.isValid(hmId)) {
                            validResponsibleId = new mongoose.Types.ObjectId(hmId);
                        }
                    } else if (mongoose.Types.ObjectId.isValid(responsiblePersonId)) {
                        validResponsibleId = new mongoose.Types.ObjectId(responsiblePersonId);
                    }
                }

            const funeralRecord = new FuneralAssistance({
                familyID: familyID,
                responsiblePerson: {
                    name: responsiblePersonName,
                    relationshipToDeceased: relationship
                },
                deceasedInfo: {
                    name: deceasedName,
                    age: parseInt(deceasedAge),
                    idCardNumber: idCard,
                    address: {
                        houseNumber: deceasedAddress,
                        moo: deceasedVillage,
                        subdistrict: subDistrict,
                        district: district,
                        province: province,
                        postalCode: postalCode
                    },
                    phone: phone,
                    causeOfDeath: causeOfDeath,
                    dateOfDeath: new Date(dateOfDeath),
                    memberID: validDeceasedId
                },
                financialInfo: {
                    totalAmount: parseFloat(amount),
                    totalMemberAccounts: totalMemberAccounts,
                    perAccountAmount: perAccountAmount,
                    totalDeductedAccounts: accountsToDeduct.length,
                    totalDeductedAmount: totalDeductedAmount,
                    accountsWithSufficientBalance: accountsWithSufficientBalance,
                    accountsWithInsufficientBalance: accountsWithInsufficientBalance
                },
                deductedAccounts: accountsToDeduct,
                documents: documents,
                notes: notes || '',
                status: 'completed',
                
                // ✅ แก้ไข: ตั้งค่า submittedBy และ createdBy อย่างถูกต้อง
                submittedBy: {
                    userType: 'employee',
                    userId: req.user ? req.user._id : null,
                    userModel: 'Admin',
                    submittedAt: new Date()
                },
                createdBy: req.user ? req.user._id : null, // ✅ ป้องกัน null error
                
                eligibilityCheck: {
                    isMember: true,
                    membershipDate: account.MembershipDate,
                    membershipDays: daysDiff,
                    totalSalesAmount: account.TotalSalesAmount,
                    passedMembershipPeriod: passedMembershipPeriod,
                    isEligible: true,
                    currentBalance: account.Balance,
                    pendingDeductions: account.PendingDeductions || 0,
                    checkedAt: new Date()
                }
            });

            await funeralRecord.save({ session });
            console.log('✅ Funeral record saved:', funeralRecord._id);

            // ========== 7.5 อัพเดทสถานะผู้เสียชีวิต ========== 
            if (deceasedId && deceasedName) {
                console.log(`🔄 Updating deceased status for: ${deceasedName} (ID: ${deceasedId})`);

                if (deceasedId.startsWith('householdMember_')) {
                    const householdMemberObjectId = deceasedId.split('_')[1];

                    const member = await Member.findOne({
                        'householdMembers._id': householdMemberObjectId,
                        isDeleted: false
                    }).session(session);

                    if (member) {
                        const memberIndex = member.householdMembers.findIndex(
                            m => m._id.toString() === householdMemberObjectId
                        );

                        if (memberIndex !== -1) {
                            member.householdMembers[memberIndex].status = 'deceased';
                            await member.save({ session });
                            console.log(`✅ Updated householdMember status to deceased: ${deceasedName}`);
                        } else {
                            console.warn(`⚠️ HouseholdMember not found: ${householdMemberObjectId}`);
                        }
                    } else {
                        console.warn(`⚠️ Member containing householdMember not found: ${householdMemberObjectId}`);
                    }
                } else if (mongoose.Types.ObjectId.isValid(deceasedId)) {
                    const updateResult = await Member.findByIdAndUpdate(
                        deceasedId,
                        { Status: 'deceased' },
                        { session, new: true }
                    );

                    if (updateResult) {
                        console.log(`✅ Updated member status to deceased: ${deceasedName}`);
                    } else {
                        console.warn(`⚠️ Member not found for update: ${deceasedId}`);
                    }
                } else {
                    console.warn(`⚠️ Invalid deceasedId format: ${deceasedId}`);
                }
            }

            // ========== 8. สร้าง Notification ==========
            const notifications = [];
            for (const deduction of accountsToDeduct) {
                // ✅ ตรวจสอบว่ามี familyID ก่อนสร้าง notification
                if (!deduction.familyID) {
                    console.warn(`⚠️ Skipping notification for account ${deduction.accountNumber}: no familyID`);
                    continue;
                }
                
                let notificationContent = `
                    <div>
                        <p><strong>การหักเงินฌาปนกิจสงเคราะห์</strong></p>
                        <p>ผู้เสียชีวิต: ${deceasedName}</p>
                        <p>จำนวนเงินที่หัก: ${perAccountAmount.toLocaleString('th-TH', {minimumFractionDigits: 2})} บาท</p>
                        <p>ยอดคงเหลือ: ${deduction.balanceAfter.toLocaleString('th-TH', {minimumFractionDigits: 2})} บาท</p>
                `;

                if (deduction.wasActiveMember && !deduction.isActiveMemberNow) {
                    notificationContent += `
                        <div style="background-color: #FEE2E2; padding: 10px; border-radius: 5px; margin-top: 10px;">
                            <p><strong>⚠️ แจ้งเตือน: สูญเสียสิทธิ์สมาชิกชั่วคราว</strong></p>
                            <p>เนื่องจากยอดคงเหลือต่ำกว่า 300 บาท</p>
                            <p>💡 <strong>วิธีแก้ไข:</strong> นำขยะมาขายให้ยอดคงเหลือกลับมาเกิน 300 บาท สิทธิ์จะกลับมาอัตโนมัติ</p>
                        </div>
                    `;
                }

                if (deduction.status === 'insufficient_but_deducted') {
                    notificationContent += `
                        <div style="background-color: #FEF3C7; padding: 10px; border-radius: 5px; margin-top: 10px;">
                            <p><strong>⚠️ เงินในบัญชีไม่พอหัก</strong></p>
                            <p>เงินค้าง: ${deduction.pendingAmount.toLocaleString('th-TH', {minimumFractionDigits: 2})} บาท</p>
                        </div>
                    `;
                }

                notificationContent += `</div>`;

                notifications.push({
                    userId: deduction.familyID,
                    type: 'funeral_deduction',
                    title: `หักเงินฌาปนกิจสงเคราะห์ ${perAccountAmount.toFixed(2)} บาท`,
                    content: notificationContent
                });
            }

            if (notifications.length > 0) {
                await Notification.insertMany(notifications, { session });
                console.log(`✅ Created ${notifications.length} notifications`);
            }

            // ========== 9. Commit Transaction ==========
            await session.commitTransaction();
            console.log('✅ Transaction committed successfully');

            res.json({
                success: true,
                message: 'บันทึกข้อมูลฌาปนกิจสงเคราะห์เรียบร้อยแล้ว',
                data: {
                    funeralID: funeralRecord._id,
                    totalDeducted: totalDeductedAmount,
                    accountsDeducted: accountsToDeduct.length,
                    accountsWithSufficientBalance: accountsWithSufficientBalance,
                    accountsWithInsufficientBalance: accountsWithInsufficientBalance,
                    membershipStatusChanges: membershipStatusChanges
                }
            });

        } catch (error) {
            await session.abortTransaction();
            console.error('❌ Error submitting funeral assistance:', error);
            console.error('❌ Error stack:', error.stack);
            console.error('❌ Request body:', req.body);
            console.error('❌ Request files:', req.files ? Object.keys(req.files) : 'No files');
            
            res.status(500).json({ 
                success: false, 
                message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล',
                error: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        } finally {
            session.endSession();
        }
    });
};

// หน้าประวัติฌาปนกิจ
const getFuneralHistoryPage = (req, res) => {
    res.render('admin/funeralAidHistory', {
        mytitle: 'ผู้ดูแลระบบ | ประวัติฌาปนกิจสงเคราะห์',
        currentPage: 'funeralAidHistory',
    });
};

// API: ดึงประวัติฌาปนกิจทั้งหมด
const getFuneralHistory = async (req, res) => {
    try {
        const { page = 1, limit = 25, status, year, search } = req.query;

        const query = { isDeleted: false };

        if (status && status !== '') {
            query.status = status;
        }

        if (year && year !== '') {
            let searchYear = parseInt(year);
            if (searchYear > 2500) {
                searchYear = searchYear - 543;
            }
            const startDate = new Date(`${searchYear}-01-01T00:00:00.000Z`);
            const endDate = new Date(`${searchYear}-12-31T23:59:59.999Z`);
            query['deceasedInfo.dateOfDeath'] = {
                $gte: startDate,
                $lte: endDate
            };
        }

        if (search && search.trim() !== '') {
            query.$or = [
                { 'deceasedInfo.name': { $regex: search, $options: 'i' } },
                { 'beneficiaryInfo.name': { $regex: search, $options: 'i' } },
                { 'deceasedInfo.idCardNumber': { $regex: search } },
                { 'deductedAccounts.accountNumber': { $regex: search, $options: 'i' } }
            ];
        }

        // คำนวณ summary จากข้อมูลทั้งหมดก่อน
        const allRecordsForSummary = await FuneralAssistance.find(query)
            .select('financialInfo familyID')
            .lean();

        const summary = {
            totalRecords: allRecordsForSummary.length,
            totalAmount: allRecordsForSummary.reduce((sum, r) => sum + (r.financialInfo?.totalAmount || 0), 0),
            uniqueFamilies: new Set(allRecordsForSummary.map(r => r.familyID?.toString()).filter(id => id)).size,
            avgAmount: allRecordsForSummary.length > 0 
                ? allRecordsForSummary.reduce((sum, r) => sum + (r.financialInfo?.totalAmount || 0), 0) / allRecordsForSummary.length 
                : 0
        };

        // นับจำนวนทั้งหมด
        const total = await FuneralAssistance.countDocuments(query);

        // ดึงข้อมูลแบบ pagination
        const records = await FuneralAssistance.find(query)
            .populate('familyID', 'familyName username address')
            .populate('createdBy', 'name email firstname lastname')
            .populate('deceasedInfo.memberID', 'name')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .lean();

        res.json({
            success: true,
            data: {
                records: records,
                summary: summary,
                pagination: {
                    total: total,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    pages: Math.ceil(total / limit)
                }
            }
        });

    } catch (error) {
        console.error('Error getting funeral history:', error);
        res.status(500).json({ 
            success: false, 
            message: 'เกิดข้อผิดพลาดในการดึงประวัติฌาปนกิจ',
            error: error.message 
        });
    }
};

// API: ดึงรายละเอียดฌาปนกิจ
const getFuneralDetail = async (req, res) => {
    try {
        const { id } = req.params;

        const record = await FuneralAssistance.findById(id)
            .populate('familyID', 'familyName username address')
            .populate('createdBy', 'name email firstname lastname')
            .populate('approvedBy', 'name email firstname lastname')
            .populate('deductedAccounts.familyID', 'familyName username') // ✅ เพิ่มบรรทัดนี้
            .populate('deceasedInfo.memberID', 'name') // ✅ เพิ่มบรรทัดนี้
            .lean();

        if (!record) {
            return res.status(404).json({ 
                success: false, 
                message: 'ไม่พบข้อมูลฌาปนกิจ' 
            });
        }

        console.log('📦 Funeral Record Detail:', JSON.stringify(record, null, 2)); // Debug log

        res.json({
            success: true,
            data: record
        });

    } catch (error) {
        console.error('Error getting funeral detail:', error);
        res.status(500).json({ 
            success: false, 
            message: 'เกิดข้อผิดพลาดในการดึงรายละเอียดฌาปนกิจ',
            error: error.message 
        });
    }
};

// API: แก้ไขข้อมูลฌาปนกิจ
const updateFuneralAssistance = (req, res) => {
    uploadfuneral(req, res, async (err) => {
        if (err) {
            console.error("❌ Multer upload error:", err);
            return res.status(400).json({
                success: false,
                message: 'อัปโหลดไฟล์ไม่สำเร็จ: ' + err.message
            });
        }

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const { id } = req.params;
            
            const updateData = {
                deceasedInfo: req.body.deceasedInfo ? JSON.parse(req.body.deceasedInfo) : null,
                responsiblePerson: req.body.responsiblePerson ? JSON.parse(req.body.responsiblePerson) : null,
                notes: req.body.notes
            };

            console.log('🔄 Updating funeral assistance:', id);
            console.log('📝 Update data:', updateData);
            console.log('📎 Files:', req.files ? Object.keys(req.files) : 'No files');

            const existingRecord = await FuneralAssistance.findById(id).session(session);
            if (!existingRecord) {
                await session.abortTransaction();
                return res.status(404).json({ 
                    success: false, 
                    message: 'ไม่พบข้อมูลฌาปนกิจ' 
                });
            }

            if (['cancelled'].includes(existingRecord.status)) {
                await session.abortTransaction();
                return res.status(400).json({
                    success: false,
                    message: 'ไม่สามารถแก้ไขข้อมูลที่ถูกยกเลิกได้'
                });
            }

            // ========== ✅ ✅ ✅ ตรวจสอบว่าข้อมูลนี้มาจากใคร ==========
            const isFromEmployee = existingRecord.submittedBy?.userType === 'employee';
            const targetFolder = isFromEmployee 
                ? 'funeral-documents-fromEmployeeUpload'  // 📁 Employee → Employee folder
                : 'funeral-documents';                     // 📁 User → User folder
            
            console.log(`
╔═══════════════════════════════════════════════════════════╗
║  📁 Folder Detection                                      ║
╠═══════════════════════════════════════════════════════════╣
║  Record ID: ${id}
║  Submitted By: ${existingRecord.submittedBy?.userType || 'unknown'}
║  User Type: ${isFromEmployee ? 'Employee' : 'User'}
║  Target Folder: ${targetFolder}
╚═══════════════════════════════════════════════════════════╝
            `);

            const updateFields = {};

            // อัพเดทข้อมูลผู้เสียชีวิต
            if (updateData.deceasedInfo) {
                updateFields['deceasedInfo.name'] = updateData.deceasedInfo.name;
                updateFields['deceasedInfo.age'] = updateData.deceasedInfo.age;
                updateFields['deceasedInfo.idCardNumber'] = updateData.deceasedInfo.idCardNumber;
                updateFields['deceasedInfo.phone'] = updateData.deceasedInfo.phone;
                updateFields['deceasedInfo.causeOfDeath'] = updateData.deceasedInfo.causeOfDeath;
                updateFields['deceasedInfo.dateOfDeath'] = updateData.deceasedInfo.dateOfDeath;
                
                if (updateData.deceasedInfo.address) {
                    updateFields['deceasedInfo.address.houseNumber'] = updateData.deceasedInfo.address.houseNumber;
                    updateFields['deceasedInfo.address.moo'] = updateData.deceasedInfo.address.moo;
                    updateFields['deceasedInfo.address.subdistrict'] = updateData.deceasedInfo.address.subdistrict;
                    updateFields['deceasedInfo.address.district'] = updateData.deceasedInfo.address.district;
                    updateFields['deceasedInfo.address.province'] = updateData.deceasedInfo.address.province;
                    updateFields['deceasedInfo.address.postalCode'] = updateData.deceasedInfo.address.postalCode;
                }
            }

            if (updateData.responsiblePerson) {
                updateFields['responsiblePerson.name'] = updateData.responsiblePerson.name;
                updateFields['responsiblePerson.relationshipToDeceased'] = updateData.responsiblePerson.relationshipToDeceased;
            }

            if (updateData.notes !== undefined) {
                updateFields['notes'] = updateData.notes;
            }

            // ========== ✅ ✅ ✅ อัปโหลดไฟล์ไปที่ folder เดิม ==========
            if (req.files && Object.keys(req.files).length > 0) {
                console.log(`📤 Uploading new files to Cloudinary (${targetFolder})...`);
                const fileInputs = [
                    'deathCertificate',
                    'deceasedIdCard',
                    'deceasedHouseRegistration',
                    'applicantIdCard',
                    'applicantHouseRegistration'
                ];

                const uploadPromises = fileInputs
                    .filter(fieldName => req.files[fieldName] && req.files[fieldName][0])
                    .map(async (fieldName) => {
                        const file = req.files[fieldName][0];
                        try {
                            console.log(`⏳ Uploading ${fieldName} to ${targetFolder}...`);
                            
                            // ✅ ✅ ✅ ใช้ targetFolder ที่ตรวจสอบได้
                            const result = await uploadToCloudinary(
                                file.buffer, 
                                file.originalname,
                                targetFolder // 📁 ใช้ folder เดิม (Employee หรือ User)
                            );
                            
                            console.log(`✅ Uploaded ${fieldName}: ${result.secure_url}`);
                            console.log(`   📁 Folder: ${targetFolder}`);
                            
                            return {
                                fieldName,
                                url: result.secure_url
                            };
                        } catch (error) {
                            console.error(`❌ Error uploading ${fieldName}:`, error);
                            throw new Error(`ไม่สามารถอัปโหลด ${fieldName} ได้`);
                        }
                    });

                const uploadedFiles = await Promise.all(uploadPromises);

                uploadedFiles.forEach(file => {
                    updateFields[`documents.${file.fieldName}`] = file.url;
                });
                
                console.log(`✅ All new files uploaded successfully to ${targetFolder}`);
            }

            const updatedRecord = await FuneralAssistance.findByIdAndUpdate(
                id,
                { $set: updateFields },
                { new: true, runValidators: true, session }
            )
            .populate('familyID', 'familyName username address')
            .populate('createdBy', 'name email firstname lastname')
            .populate('approvedBy', 'name email firstname lastname')
            .populate('deductedAccounts.familyID', 'familyName username')
            .populate('deceasedInfo.memberID', 'name');

            await session.commitTransaction();
            console.log('✅ Updated successfully');

            res.json({
                success: true,
                message: 'แก้ไขข้อมูลฌาปนกิจสำเร็จ',
                data: updatedRecord
            });

        } catch (error) {
            await session.abortTransaction();
            console.error('❌ Error updating funeral assistance:', error);
            res.status(500).json({ 
                success: false,
                message: 'เกิดข้อผิดพลาดในการแก้ไขข้อมูล',
                error: error.message 
            });
        } finally {
            session.endSession();
        }
    });
};

// หน้ารายการคำขอที่รอการอนุมัติ
const pendingFuneralRequestsPage = (req, res) => {
    res.render('admin/funeralRequest', {
        mytitle: 'ผู้ดูแลระบบ | รายการคำขอฌาปนกิจที่รอการอนุมัติ',
        currentPage: 'funeralPendingRequests',
    });
};

// API: ดึงรายการคำขอที่รอการอนุมัติ
const getPendingFuneralRequests = async (req, res) => {
    try {
        const { page = 1, limit = 10, search } = req.query;

        const query = { 
            isDeleted: false,
            status: 'pending',
            'submittedBy.userType': 'user' // เฉพาะที่ user ยื่นคำขอ
        };

        // ค้นหา
        if (search && search.trim() !== '') {
            query.$or = [
                { 'deceasedInfo.name': { $regex: search, $options: 'i' } },
                { 'deceasedInfo.idCardNumber': { $regex: search } },
                { 'responsiblePerson.name': { $regex: search, $options: 'i' } }
            ];
        }

        const total = await FuneralAssistance.countDocuments(query);

        const requests = await FuneralAssistance.find(query)
            .populate('familyID', 'familyName username address')
            .populate('submittedBy.userId', 'familyName username')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .lean();

        res.json({
            success: true,
            data: {
                requests,
                pagination: {
                    total,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    pages: Math.ceil(total / limit)
                }
            }
        });

    } catch (error) {
        console.error('Error getting pending requests:', error);
        res.status(500).json({ 
            success: false, 
            message: 'เกิดข้อผิดพลาดในการดึงรายการคำขอ',
            error: error.message 
        });
    }
};

// API: ดูรายละเอียดคำขอ + คำนวณเงินที่จะหัก
const getRequestDetail = async (req, res) => {
    try {
        const { id } = req.params;

        const request = await FuneralAssistance.findById(id)
            .populate('familyID', 'familyName username address')
            .populate('submittedBy.userId', 'familyName username')
            .lean();

        if (!request) {
            return res.status(404).json({ 
                success: false, 
                message: 'ไม่พบคำขอนี้' 
            });
        }

        // เพิ่มส่วนนี้: ค้นหาข้อมูลบัญชีธนาคารขยะของครัวเรือนนี้
        const familyAccount = await WasteBankAccount.findOne({
            familyID: request.familyID._id,
            isDeleted: false
        }).select('AccountNumber').lean();

        // นำเลขบัญชีไปใส่ไว้ใน object request เพื่อส่งไปหน้าบ้านง่ายๆ
        request.accountNumber = familyAccount ? familyAccount.AccountNumber : 'ไม่พบเลขบัญชี';

        // ใช้ยอดจาก request.financialInfo.totalAmount (default = 2000)
        const amount = request.financialInfo?.totalAmount || 2000;

        // คำนวณเงินที่จะหัก
        const totalMemberAccounts = await WasteBankAccount.countDocuments({
            isDeleted: false,
            MembershipDate: { $ne: null }
        });

        const perAccountAmount = totalMemberAccounts > 0 ? amount / totalMemberAccounts : 0;

        // ดึงบัญชีที่จะถูกหัก
        const memberAccounts = await WasteBankAccount.find({
            isDeleted: false,
            MembershipDate: { $ne: null }
        })
        .populate('familyID', 'familyName username')
        .lean();

        const accountsPreview = memberAccounts.map(acc => ({
            accountID: acc._id,
            accountNumber: acc.AccountNumber,
            accountName: acc.AccountName,
            familyName: acc.familyID.familyName,
            balanceBefore: acc.Balance,
            deductedAmount: perAccountAmount,
            balanceAfter: acc.Balance - perAccountAmount,
            status: acc.Balance >= perAccountAmount ? 'sufficient' : 'insufficient',
            pendingAmount: acc.Balance < perAccountAmount ? perAccountAmount - acc.Balance : 0
        }));

        const accountsWithSufficientBalance = accountsPreview.filter(a => a.status === 'sufficient').length;
        const accountsWithInsufficientBalance = accountsPreview.filter(a => a.status === 'insufficient').length;

        res.json({
            success: true,
            data: {
                request,
                calculation: {
                    totalAmount: amount,
                    totalMemberAccounts,
                    perAccountAmount,
                    accountsWithSufficientBalance,
                    accountsWithInsufficientBalance
                },
                accountsPreview: accountsPreview.slice(0, 10)
            }
        });

    } catch (error) {
        console.error('Error getting request detail:', error);
        res.status(500).json({ 
            success: false, 
            message: 'เกิดข้อผิดพลาดในการดึงรายละเอียด',
            error: error.message 
        });
    }
};

// API: อนุมัติคำขอ + หักเงิน
const approveRequest = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { id } = req.params;
        const { approvedAmount } = req.body;

        const request = await FuneralAssistance.findById(id).session(session);

        if (!request) {
            await session.abortTransaction();
            return res.status(404).json({ 
                success: false, 
                message: 'ไม่พบคำขอนี้' 
            });
        }

        if (request.status !== 'pending') {
            await session.abortTransaction();
            return res.status(400).json({ 
                success: false, 
                message: 'คำขอนี้ได้รับการดำเนินการแล้ว' 
            });
        }

        const amount = approvedAmount && approvedAmount > 0 
            ? parseFloat(approvedAmount) 
            : (request.financialInfo?.totalAmount || 2000);

        console.log(`💰 ยอดเงินที่อนุมัติ: ${amount} บาท`);

        // นับจำนวนบัญชีสมาชิก
        const totalMemberAccounts = await WasteBankAccount.countDocuments({
            isDeleted: false,
            MembershipDate: { $ne: null }
        }).session(session);

        if (totalMemberAccounts === 0) {
            await session.abortTransaction();
            return res.status(400).json({ 
                success: false, 
                message: 'ไม่มีบัญชีสมาชิกในระบบ' 
            });
        }

        const perAccountAmount = amount / totalMemberAccounts;

        // ดึงบัญชีสมาชิกทั้งหมด
        const memberAccounts = await WasteBankAccount.find({
            isDeleted: false,
            MembershipDate: { $ne: null }
        })
        .populate('familyID', 'familyName username')
        .session(session);

        const accountsToDeduct = [];
        let totalDeductedAmount = 0;
        let accountsWithSufficientBalance = 0;
        let accountsWithInsufficientBalance = 0;
        let membershipStatusChanges = [];

        // หักเงินจากบัญชีทุกบัญชี
        for (const acc of memberAccounts) {
            const balanceBefore = acc.Balance;
            const wasActiveMember = acc.IsMember;
            let status = 'sufficient';
            let pendingAmount = 0;
            
            if (balanceBefore >= perAccountAmount) {
                acc.Balance -= perAccountAmount;
                accountsWithSufficientBalance++;
            } else {
                const insufficientAmount = perAccountAmount - balanceBefore;
                acc.Balance = 0;
                acc.PendingDeductions = (acc.PendingDeductions || 0) + insufficientAmount;
                pendingAmount = insufficientAmount;
                status = 'insufficient_but_deducted';
                accountsWithInsufficientBalance++;
            }
            
            // ตรวจสอบสถานะสมาชิกหลังหัก
            if (acc.Balance < 300 && acc.IsMember) {
                acc.IsMember = false;
                membershipStatusChanges.push({
                    accountNumber: acc.AccountNumber,
                    familyName: acc.familyID.familyName,
                    balanceAfter: acc.Balance
                });
            }
            
            await acc.save({ session });

            accountsToDeduct.push({
                accountID: acc._id,
                familyID: acc.familyID._id,
                accountNumber: acc.AccountNumber,
                accountName: acc.AccountName,
                deductedAmount: perAccountAmount,
                balanceBefore: balanceBefore,
                balanceAfter: acc.Balance,
                pendingAmount: pendingAmount,
                status: status,
                wasActiveMember: wasActiveMember,
                isActiveMemberNow: acc.IsMember,
                deductedAt: new Date()
            });

            totalDeductedAmount += perAccountAmount;
        }

        // ============================================
        // ✅ อัปเดตสถานะผู้เสียชีวิต (ใช้วิธีเดียวกับ submitFuneralAssistance)
        // ============================================
        if (request.deceasedInfo.memberID && request.deceasedInfo.name) {
            const memberIdObj = request.deceasedInfo.memberID;
            const deceasedName = request.deceasedInfo.name;
            
            console.log(`🔄 Updating deceased status for: ${deceasedName}`);
            console.log(`📌 MemberID (ObjectId):`, memberIdObj);
            
            // ✅ ตรวจสอบว่าเป็น householdMember ของ Member ไหน
            const memberWithHouseholdMember = await Member.findOne({
                'householdMembers._id': memberIdObj,
                isDeleted: false
            }).session(session);

            if (memberWithHouseholdMember) {
                // ✅ เป็น householdMember
                console.log(`✅ Found as householdMember in member: ${memberWithHouseholdMember.name}`);
                
                const householdIndex = memberWithHouseholdMember.householdMembers.findIndex(
                    b => b._id.toString() === memberIdObj.toString()
                );
                
                if (householdIndex !== -1) {
                    memberWithHouseholdMember.householdMembers[householdIndex].status = 'deceased';
                    await memberWithHouseholdMember.save({ session });
                    console.log(`✅ Updated householdMember status to deceased: ${deceasedName}`);
                }
            } else {
                // ✅ เป็น Member หลัก
                console.log(`✅ Not a householdMember, updating as main member`);
                
                const updateResult = await Member.findByIdAndUpdate(
                    memberIdObj,
                    { Status: 'deceased' },
                    { session, new: true }
                );
                
                if (updateResult) {
                    console.log(`✅ Updated member status to deceased: ${deceasedName}`);
                } else {
                    console.warn(`⚠️ Member not found for update: ${memberIdObj}`);
                }
            }
        }
        // ============================================
        // จบส่วนอัปเดตสถานะ
        // ============================================

        // อัปเดตคำขอ
        request.status = 'completed';
        request.approvedBy = req.user._id;
        request.approvedAt = new Date();
        request.financialInfo.totalAmount = amount;
        request.financialInfo.totalMemberAccounts = totalMemberAccounts;
        request.financialInfo.perAccountAmount = perAccountAmount;
        request.financialInfo.totalDeductedAccounts = accountsToDeduct.length;
        request.financialInfo.totalDeductedAmount = totalDeductedAmount;
        request.financialInfo.accountsWithSufficientBalance = accountsWithSufficientBalance;
        request.financialInfo.accountsWithInsufficientBalance = accountsWithInsufficientBalance;
        request.deductedAccounts = accountsToDeduct;

        await request.save({ session });

        // สร้าง Notification แจ้ง User ผู้ยื่นคำขอ
        await Notification.create([{
            userId: request.familyID,
            type: 'funeral_approved',
            title: 'คำขอฌาปนกิจได้รับการอนุมัติแล้ว',
            content: `
                <div>
                    <p><strong>คำขอฌาปนกิจของท่านได้รับการอนุมัติแล้ว</strong></p>
                    <p>ผู้เสียชีวิต: ${request.deceasedInfo.name}</p>
                    <p>จำนวนเงินช่วยเหลือ: ${amount.toLocaleString('th-TH', {minimumFractionDigits: 2})} บาท</p>
                    <p>หักจากบัญชีสมาชิก ${totalMemberAccounts} บัญชี บัญชีละ ${perAccountAmount.toFixed(2)} บาท</p>
                    <p class="mt-2 text-sm text-gray-600">เจ้าหน้าที่ได้ดำเนินการหักเงินจากทุกบัญชีเรียบร้อยแล้ว</p>
                </div>
            `
        }], { session });

        // สร้าง Notification แจ้งทุกบัญชีที่ถูกหัก
        const notifications = accountsToDeduct.map(deduction => {
            let content = `
                <div>
                    <p><strong>การหักเงินฌาปนกิจสงเคราะห์</strong></p>
                    <p>ผู้เสียชีวิต: ${request.deceasedInfo.name}</p>
                    <p>จำนวนเงินที่หัก: ${perAccountAmount.toLocaleString('th-TH', {minimumFractionDigits: 2})} บาท</p>
                    <p>ยอดคงเหลือ: ${deduction.balanceAfter.toLocaleString('th-TH', {minimumFractionDigits: 2})} บาท</p>
            `;

            if (deduction.wasActiveMember && !deduction.isActiveMemberNow) {
                content += `
                    <div style="background-color: #FEE2E2; padding: 10px; border-radius: 5px; margin-top: 10px;">
                        <p><strong>⚠️ แจ้งเตือน: สูญเสียสิทธิ์สมาชิกชั่วคราว</strong></p>
                        <p>เนื่องจากยอดคงเหลือต่ำกว่า 300 บาท</p>
                        <p>💡 นำขยะมาขายให้ยอดคงเหลือกลับมาเกิน 300 บาท สิทธิ์จะกลับมาอัตโนมัติ</p>
                    </div>
                `;
            }

            if (deduction.status === 'insufficient_but_deducted') {
                content += `
                    <div style="background-color: #FEF3C7; padding: 10px; border-radius: 5px; margin-top: 10px;">
                        <p><strong>⚠️ เงินในบัญชีไม่พอหัก</strong></p>
                        <p>เงินค้าง: ${deduction.pendingAmount.toLocaleString('th-TH', {minimumFractionDigits: 2})} บาท</p>
                        <p>กรุณานำขยะมาขายเพื่อชำระเงินค้าง</p>
                    </div>
                `;
            }

            content += `</div>`;

            return {
                userId: deduction.familyID,
                type: 'funeral_deduction',
                title: `หักเงินฌาปนกิจสงเคราะห์ ${perAccountAmount.toFixed(2)} บาท`,
                content
            };
        });

        await Notification.insertMany(notifications, { session });

        await session.commitTransaction();

        console.log(`✅ อนุมัติคำขอฌาปนกิจ ID: ${request._id} จำนวน ${amount} บาท สำเร็จ`);

        res.json({
            success: true,
            message: 'อนุมัติคำขอฌาปนกิจและหักเงินเรียบร้อยแล้ว',
            data: {
                funeralID: request._id,
                approvedAmount: amount,
                totalDeducted: totalDeductedAmount,
                accountsDeducted: accountsToDeduct.length,
                accountsWithSufficientBalance,
                accountsWithInsufficientBalance,
                membershipStatusChanges
            }
        });

    } catch (error) {
        await session.abortTransaction();
        console.error('Error approving request:', error);
        res.status(500).json({ 
            success: false, 
            message: 'เกิดข้อผิดพลาดในการอนุมัติคำขอ',
            error: error.message 
        });
    } finally {
        session.endSession();
    }
};

// API: ปฏิเสธคำขอ
const rejectRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        if (!reason || reason.trim() === '') {
            return res.status(400).json({ 
                success: false, 
                message: 'กรุณาระบุเหตุผลในการปฏิเสธ' 
            });
        }

        const request = await FuneralAssistance.findById(id);

        if (!request) {
            return res.status(404).json({ 
                success: false, 
                message: 'ไม่พบคำขอนี้' 
            });
        }

        if (request.status !== 'pending') {
            return res.status(400).json({ 
                success: false, 
                message: 'คำขอนี้ได้รับการดำเนินการแล้ว' 
            });
        }

        request.status = 'rejected';
        request.rejectedBy = req.user._id;
        request.rejectedAt = new Date();
        request.rejectionReason = reason;

        await request.save();

        // สร้าง Notification แจ้ง User
        await Notification.create({
            userId: request.familyID,
            type: 'funeral_rejected',
            title: 'คำขอฌาปนกิจถูกปฏิเสธ',
            content: `
                <div>
                    <p><strong>คำขอฌาปนกิจของท่านถูกปฏิเสธ</strong></p>
                    <p>ผู้เสียชีวิต: ${request.deceasedInfo.name}</p>
                    <div style="background-color: #FEE2E2; padding: 10px; border-radius: 5px; margin-top: 10px;">
                        <p><strong>เหตุผล:</strong></p>
                        <p>${reason}</p>
                    </div>
                    <p class="mt-2 text-sm text-gray-600">หากต้องการยื่นเรื่องใหม่ กรุณาติดต่อเจ้าหน้าที่</p>
                </div>
            `
        });

        console.log(`❌ ปฏิเสธคำขอฌาปนกิจ ID: ${request._id}`);

        res.json({
            success: true,
            message: 'ปฏิเสธคำขอเรียบร้อยแล้ว',
            data: {
                funeralID: request._id
            }
        });

    } catch (error) {
        console.error('Error rejecting request:', error);
        res.status(500).json({ 
            success: false, 
            message: 'เกิดข้อผิดพลาดในการปฏิเสธคำขอ',
            error: error.message 
        });
    }
};

module.exports = {
    //แดชบอร์ด
    dashboardIndex,
    //สื่อ
    mediaIndex,mediaPost,mediaEdit,mediaDelete,
    //ข่าวสาร
    newsIndex,newsPost,newsEdit,deleteNews,
    //กิจกรรม
    activityIndex,activityPost,activityEdit,deleteActivity,
    //ขยะ
    wasteIndex,wastePost,wasteDelete,wasteEdit,wasteBulkPriceUpdate,
    //ประเภทขยะ
    wasteTypeIndex,wasteTypePost,wasteTypeEdit,wasteTypeDelete,
    //สต๊อกขยะ
    wasteStockIndex,
    //พนักงาน
    employeeIndex,employeeRegister,employeeDelete,editEmployee,
    //สมาชิกกองทุน
    memberIndex,memberRegister,getMemberForEdit,memberUpdate,memberDelete,changeRepresentative,getRepresentatives,
    //คณะกรรมการๆ
    boardIndex,boardPost,boardEdit,boardDelete,
    //หมู่บ้าน
    villageIndex,villagePost,villageEdit,villageDelete,
    //รอบการรับซื้อขยะ
    roundIndex,roundPost,roundEdit,roundDelete,
    //จุดรับซื้อขยะ
    wastePointIndex,wastePointPost,wastePointCreate,wastePointToggle,wastePointEdit,wastePointUpdate,wastePointDelete,
    //หน้าฌาปนกิจสงเคราะห์
    funeralAidIndex,getFamilyMembers,searchHouseholds,checkEligibility,calculateFuneralAmount,getDeductionPreview,submitFuneralAssistance,
    //หน้าประวัติฌาปนกิจ
    getFuneralHistory,getFuneralDetail,getFuneralHistoryPage,updateFuneralAssistance,
    //หน้าคำขอฌาปนกิจ
    pendingFuneralRequestsPage,getPendingFuneralRequests,getRequestDetail,approveRequest,rejectRequest,
}