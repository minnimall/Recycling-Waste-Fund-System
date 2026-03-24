const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const streamifier = require('streamifier');
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
const wasteSaleRequestLog = require('../models/wasteSaleRequestLog');
const Family = require('../models/family');
const Member = require('../models/member');
const WasteBankAccount = require('../models/wasteBankAccount');
const Complaint = require('../models/complaint');
const Transaction = require('../models/transactionMoney');
const WastePriceHistory = require('../models/wastePriceHistory');
const WastePoint = require("../models/wastePoint");
const Notification = require("../models/notification");
const path = require('path');
const bcrypt = require('bcryptjs');
const moment = require('moment');
const mongoose = require('mongoose');
const myAdmin = require('../models/admin');
const Route = require('../models/route');
const SystemSettings = require('../models/withDrawSetting');
const FuneralAssistance = require('../models/funeral');
const { Console } = require('console');

router.use(express.static(path.join(__dirname, '../public')));

router.use(bodyParser.json({ limit: '10mb' }));
router.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

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
        
//         res.render('employee/dashboard', {
//             mytitle: 'พนักงาน | แดชบอร์ด',
            
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
        
//         res.status(500).render('employee/dashboard', defaultData);
//     }
// };

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
        res.render('employee/dashboard', {
            mytitle: 'พนักงาน | แดชบอร์ด',
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
        res.status(500).render('employee/dashboard', {
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
            WasteBankAccount.find({ isDeleted: false })
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

// ฟังก์ชันบันทึกรับซื้อขยะ (อัพเดท: คืนสิทธิ์สมาชิกอัตโนมัติ)
const wastePurchasePost = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { accountId, wasteItems } = req.body;
        const parsedWasteItems = JSON.parse(wasteItems);
        let totalAmount = 0;
        const wasteItemIds = [];

        // ========== 1. ตรวจสอบและสร้างรายการขยะ ==========
        if (parsedWasteItems && Array.isArray(parsedWasteItems)) {
            for (const item of parsedWasteItems) {
                if (item && item.name) {
                    const newWasteItem = new WasteItem({
                        wasteId: item.wasteId,
                        name: item.name,
                        quantity: item.weight,
                        pricePerUnit: item.pricePerUnit,
                    });
                    await newWasteItem.save({ session });
                    wasteItemIds.push(newWasteItem._id);
                    
                    let price = parseFloat(item.totalPrice);
                    if (!isNaN(price)) {
                        totalAmount += price;
                    }
                }
            }
        } else {
            await session.abortTransaction();
            return res.redirect('/employee/wastePurchase?error=Invalid waste items data');
        }

        // ========== 2. ดึงข้อมูลบัญชี ==========
        const wasteBankAccount = await WasteBankAccount.findById(accountId).session(session);
        
        if (!wasteBankAccount) {
            await session.abortTransaction();
            return res.redirect('/employee/wastePurchase?error=Bank account not found');
        }

        // เก็บสถานะเดิมไว้
        const hadMembershipDate = !!wasteBankAccount.MembershipDate;
        const wasActiveMember = wasteBankAccount.IsMember;
        const oldTotalSales = wasteBankAccount.TotalSalesAmount || 0;
        const oldBalance = wasteBankAccount.Balance;
        const oldPendingDeductions = wasteBankAccount.PendingDeductions || 0;

        // ========== 3. อัพเดทยอดขายสะสม ==========
        wasteBankAccount.TotalSalesAmount = (wasteBankAccount.TotalSalesAmount || 0) + totalAmount;

        // ========== 4. ตรวจสอบและตั้งค่าสมาชิกครั้งแรก ==========
        let becameNewMember = false;
        if (!hadMembershipDate && wasteBankAccount.TotalSalesAmount >= 300) {
            wasteBankAccount.MembershipDate = new Date();
            wasteBankAccount.IsMember = true;
            becameNewMember = true;
            console.log(`🎉 บัญชี ${wasteBankAccount.AccountNumber} เป็นสมาชิกใหม่! (ขายสะสม ${wasteBankAccount.TotalSalesAmount} บาท)`);
        }

        // ========== 5. จัดการเงินค้างหัก ==========
        let amountToBalance = totalAmount;
        let deductedPending = 0;

        if (wasteBankAccount.PendingDeductions > 0) {
            const pendingAmount = wasteBankAccount.PendingDeductions;
            const deductionAmount = Math.min(pendingAmount, totalAmount);
            
            wasteBankAccount.PendingDeductions -= deductionAmount;
            amountToBalance -= deductionAmount;
            deductedPending = deductionAmount;
            
            console.log(`💳 หักเงินค้างฌาปนกิจ ${deductionAmount.toFixed(2)} บาท (เหลือค้าง ${wasteBankAccount.PendingDeductions.toFixed(2)} บาท)`);
        }

        // ========== 6. อัพเดทยอดคงเหลือ ==========
        wasteBankAccount.Balance += amountToBalance;

        // ========== 7. ตรวจสอบและคืนสิทธิ์สมาชิก ==========
        let membershipRestored = false;
        if (hadMembershipDate && !wasActiveMember && wasteBankAccount.Balance >= 300) {
            wasteBankAccount.IsMember = true;
            membershipRestored = true;
            console.log(`✅ คืนสิทธิ์สมาชิก! บัญชี ${wasteBankAccount.AccountNumber} (คงเหลือ ${wasteBankAccount.Balance.toFixed(2)} บาท)`);
        }

        await wasteBankAccount.save({ session });

        // ========== 8. บันทึกประวัติการรับซื้อ ==========
        const newWastePurchase = new WastePurchase({
            accountId,
            totalAmount,
            wasteItems: wasteItemIds,
            addBy: req.body.addBy
        });
        await newWastePurchase.save({ session });

        // ========== 9. ดึงข้อมูล WasteItem ==========
        const items = await WasteItem.find({ _id: { $in: wasteItemIds } }).session(session);
        const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
        const itemCount = items.length;
        const formattedAmount = totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 });

        // ========== 10. สร้างเนื้อหา Notification ==========
        let notificationTitle = `คุณได้ขายขยะจำนวนรวม ${totalQuantity} กิโลกรัม`;
        let contentList = `
            <div>
                <p><strong>ยอดขายรวม:</strong> 💰${formattedAmount} บาท</p>
        `;

        // แสดงรายละเอียดการหักเงินค้าง
        if (deductedPending > 0) {
            const formattedDeducted = deductedPending.toLocaleString('th-TH', { minimumFractionDigits: 2 });
            const formattedToBalance = amountToBalance.toLocaleString('th-TH', { minimumFractionDigits: 2 });
            const formattedRemaining = wasteBankAccount.PendingDeductions.toLocaleString('th-TH', { minimumFractionDigits: 2 });
            
            contentList += `
                <div style="background-color: #FEF3C7; padding: 10px; border-radius: 5px; margin: 10px 0;">
                    <p><strong>⚠️ การหักเงินค้างฌาปนกิจ:</strong></p>
                    <ul style="margin-left: 20px; list-style-type: none;">
                        <li>• หักชำระหนี้: ${formattedDeducted} บาท</li>
                        <li>• เข้าบัญชี: ${formattedToBalance} บาท</li>
                        ${wasteBankAccount.PendingDeductions > 0 ? 
                            `<li>• เงินค้างคงเหลือ: ${formattedRemaining} บาท</li>` : 
                            `<li>• ✅ ชำระหนี้ครบแล้ว</li>`
                        }
                    </ul>
                </div>
            `;
        }

        // แจ้งเตือนถ้าคืนสิทธิ์สมาชิก
        if (membershipRestored) {
            notificationTitle = `🎊 ยินดีด้วย! สิทธิ์สมาชิกกลับมาแล้ว`;
            contentList += `
                <div style="background-color: #D1FAE5; padding: 10px; border-radius: 5px; margin: 10px 0;">
                    <p><strong>✅ สิทธิ์สมาชิกกองทุนฌาปนกิจกลับมาแล้ว!</strong></p>
                    <p style="font-size: 0.9em; color: #065F46;">
                        • ยอดคงเหลือปัจจุบัน: ${wasteBankAccount.Balance.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท (เกิน 300 บาท)<br>
                        • อายุสมาชิก: ${Math.floor((new Date() - new Date(wasteBankAccount.MembershipDate)) / (1000 * 60 * 60 * 24))} วัน<br>
                        • สามารถรับสิทธิ์ฌาปนกิจได้อีกครั้ง (ถ้าครบ 180 วัน)
                    </p>
                </div>
            `;
        }

        // แจ้งเตือนถ้าเพิ่งเป็นสมาชิกใหม่
        if (becameNewMember) {
            notificationTitle = `🎉 ยินดีด้วย! คุณเป็นสมาชิกแล้ว`;
            contentList += `
                <div style="background-color: #D1FAE5; padding: 10px; border-radius: 5px; margin: 10px 0;">
                    <p><strong>✅ ยินดีด้วย! คุณได้รับสิทธิ์เป็นสมาชิกกองทุนฌาปนกิจแล้ว</strong></p>
                    <p style="font-size: 0.9em; color: #065F46;">
                        • ขายขยะสะสม: ${wasteBankAccount.TotalSalesAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท (ครบ 300 บาท)<br>
                        • เริ่มนับอายุสมาชิกตั้งแต่: ${new Date().toLocaleDateString('th-TH')}<br>
                        • สิทธิ์รับฌาปนกิจ: หลังจากเป็นสมาชิกครบ 180 วัน<br>
                        • หมายเหตุ: ต้องมียอดคงเหลือมากกว่า 300 บาทเสมอ
                    </p>
                </div>
            `;
        }

        contentList += `
                <br>
                <h3><strong>รายการทั้งหมด</strong> ${itemCount} รายการ</h3>
                <ul class="list-decimal ml-5">
                    ${items.map(item => `<li>${item.name} : ${item.quantity} กิโลกรัม</li>`).join('')}
                </ul>
                
                <hr style="margin: 15px 0;">
                
                <div style="background-color: #F3F4F6; padding: 10px; border-radius: 5px;">
                    <p><strong>📊 สรุปบัญชี:</strong></p>
                    <ul style="margin-left: 20px; list-style-type: none;">
                        <li>• ยอดคงเหลือ: ${wasteBankAccount.Balance.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</li>
                        <li>• ยอดขายสะสม: ${wasteBankAccount.TotalSalesAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</li>
                        <li>• สถานะ: ${wasteBankAccount.IsMember ? '✅ เป็นสมาชิกที่มีสิทธิ์' : '⏳ รอยอดคงเหลือเกิน 300 บาท'}</li>
                        ${wasteBankAccount.PendingDeductions > 0 ? 
                            `<li>• เงินค้าง: ${wasteBankAccount.PendingDeductions.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</li>` : 
                            ''
                        }
                    </ul>
                </div>
            </div>
        `;

        // ========== 11. สร้าง Notification ==========
        const NotificationPurchase = new Notification({
            userId: wasteBankAccount.familyID,
            type: "purchase",
            title: notificationTitle,
            content: contentList
        });
        await NotificationPurchase.save({ session });

        // ========== 12. Commit Transaction ==========
        await session.commitTransaction();

        console.log(`
            ========================================
            ✅ บันทึกการรับซื้อสำเร็จ
            ========================================
            บัญชี: ${wasteBankAccount.AccountNumber}
            ยอดขาย: ${totalAmount.toFixed(2)} บาท
            ยอดขายสะสม: ${oldTotalSales.toFixed(2)} → ${wasteBankAccount.TotalSalesAmount.toFixed(2)} บาท
            ยอดคงเหลือ: ${oldBalance.toFixed(2)} → ${wasteBankAccount.Balance.toFixed(2)} บาท
            ${deductedPending > 0 ? `หักเงินค้าง: ${deductedPending.toFixed(2)} บาท\nเงินค้างคงเหลือ: ${oldPendingDeductions.toFixed(2)} → ${wasteBankAccount.PendingDeductions.toFixed(2)} บาท` : ''}
            สถานะสมาชิก: ${becameNewMember ? '🎉 เพิ่งเป็นสมาชิกใหม่!' : (membershipRestored ? '🎊 คืนสิทธิ์สมาชิก!' : (wasteBankAccount.IsMember ? '✅ เป็นสมาชิกอยู่' : '⏳ รอยอดเกิน 300'))}
            ========================================
        `);

        // สร้าง success message
        let successMessage = 'บันทึกการรับซื้อสำเร็จ';
        if (becameNewMember) {
            successMessage += ' 🎉 ยินดีด้วย! เป็นสมาชิกใหม่';
        } else if (membershipRestored) {
            successMessage += ' 🎊 สิทธิ์สมาชิกกลับมาแล้ว!';
        }
        if (deductedPending > 0) {
            successMessage += ` (หักเงินค้างฌาปนกิจ ${deductedPending.toFixed(2)} บาท)`;
        }

        res.redirect(`/employee/wastePurchase?message=${encodeURIComponent(successMessage)}`);

    } catch (error) {
        await session.abortTransaction();
        console.error("Error in wastePurchasePost:", error);
        res.redirect('/employee/wastePurchase?error=เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
        session.endSession();
    }
};


// หน้าสรุปการรับซื้อขยะ (ปรับปรุงใหม่)
const wastePurchaseTotalIndex = async (req, res) => {
    try {
        const searchDate = req.query.searchDate;
        const searchMonth = req.query.searchMonth;
        const searchYear = req.query.searchYear;
        const villageId = req.query.villageId;
        const accountIdParam = req.query.accountId;
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;
        const search = req.query.search;
        
        let query = { isDeleted: false };
        let monthlyQuery = { isDeleted: false };

        // Filter ตามวันที่เฉพาะ
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
        // Filter ตามเดือนและปี
        else if (searchMonth || searchYear) {
            const year = searchYear ? parseInt(searchYear) : new Date().getFullYear();
            
            if (searchMonth) {
                const month = parseInt(searchMonth) - 1;
                const firstDayOfMonth = new Date(year, month, 1);
                const lastDayOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);
                
                query.purchaseDate = {
                    $gte: firstDayOfMonth,
                    $lte: lastDayOfMonth
                };
                monthlyQuery.purchaseDate = {
                    $gte: firstDayOfMonth,
                    $lte: lastDayOfMonth
                };
            } else {
                const firstDayOfYear = new Date(year, 0, 1);
                const lastDayOfYear = new Date(year, 11, 31, 23, 59, 59, 999);
                
                query.purchaseDate = {
                    $gte: firstDayOfYear,
                    $lte: lastDayOfYear
                };
                monthlyQuery.purchaseDate = {
                    $gte: firstDayOfYear,
                    $lte: lastDayOfYear
                };
            }
        }

        // Filter ตามหมู่บ้าน
        let accountIdsFromVillage = [];
        if (villageId) {
            const families = await Family.find({ 
                village: villageId, 
                isDeleted: false 
            }).select('_id');
            
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

        const wasteSummaryPipeline = [
            { $match: query },
            {
                $lookup: {
                    from: 'wastebankaccounts',
                    localField: 'accountId',
                    foreignField: '_id',
                    as: 'accountInfo'
                }
            },
            {
                $addFields: {
                    accountInfo: {
                        $ifNull: [
                            { $arrayElemAt: ['$accountInfo', 0] },
                            { _id: '$accountId', familyID: null, isDeleted: true }
                        ]
                    }
                }
            },
            {
                $lookup: {
                    from: 'families',
                    localField: 'accountInfo.familyID',
                    foreignField: '_id',
                    as: 'familyInfo'
                }
            },
            {
                $addFields: {
                    familyInfo: {
                        $ifNull: [
                            { $arrayElemAt: ['$familyInfo', 0] },
                            { _id: '$accountInfo.familyID', village: null, isDeleted: true }
                        ]
                    }
                }
            },
            {
                $lookup: {
                    from: 'villages',
                    localField: 'familyInfo.village',
                    foreignField: '_id',
                    as: 'villageInfo'
                }
            },
            {
                $addFields: {
                    villageInfo: {
                        $ifNull: [
                            { $arrayElemAt: ['$villageInfo', 0] },
                            { _id: null, villageNumber: 'ไม่ระบุ', villageName: '' }
                        ]
                    }
                }
            },
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
                    'wasteItemDetails': { $ne: [] }
                }
            },
            { $unwind: '$wasteItemDetails' },
            
            // Group แยกตามหมู่บ้านและชื่อขยะ
            {
                $group: {
                    _id: {
                        villageNumber: '$villageInfo.villageNumber',
                        villageName: '$villageInfo.villageName',
                        wasteName: '$wasteItemDetails.name'
                    },
                    totalQuantity: { 
                        $sum: '$wasteItemDetails.quantity' 
                    },
                    totalAmount: { 
                        $sum: { 
                            $multiply: [
                                '$wasteItemDetails.quantity', 
                                '$wasteItemDetails.pricePerUnit'
                            ] 
                        } 
                    },
                    householdCount: { 
                        $addToSet: '$accountId' // นับครัวเรือนที่ไม่ซ้ำ
                    },
                    purchaseCount: { $sum: 1 }
                }
            },
            
            // เพิ่ม field จำนวนครัวเรือน
            {
                $addFields: {
                    householdCount: { $size: '$householdCount' }
                }
            },
            
            // จัดเรียง: หมู่บ้าน -> ชื่อขยะ
            {
                $sort: { 
                    '_id.villageNumber': 1,
                    '_id.wasteName': 1
                }
            },
            
            // Group อีกครั้งเพื่อรวมตามหมู่บ้าน
            {
                $group: {
                    _id: {
                        villageNumber: '$_id.villageNumber',
                        villageName: '$_id.villageName'
                    },
                    wasteItems: {
                        $push: {
                            wasteName: '$_id.wasteName',
                            totalQuantity: '$totalQuantity',
                            totalAmount: '$totalAmount',
                            householdCount: '$householdCount',
                            purchaseCount: '$purchaseCount'
                        }
                    },
                    villageTotalQuantity: { $sum: '$totalQuantity' },
                    villageTotalAmount: { $sum: '$totalAmount' },
                    villageTotalHouseholds: { $sum: '$householdCount' }
                }
            },
            
            {
                $sort: { '_id.villageNumber': 1 }
            }
        ];

        const wasteSummary = await WastePurchase.aggregate(wasteSummaryPipeline);

        // คำนวณยอดรวมทั้งหมด
        const grandTotal = wasteSummary.reduce((acc, village) => {
            return {
                totalQuantity: acc.totalQuantity + village.villageTotalQuantity,
                totalAmount: acc.totalAmount + village.villageTotalAmount,
                totalHouseholds: acc.totalHouseholds + village.villageTotalHouseholds,
                villageCount: acc.villageCount + 1
            };
        }, { totalQuantity: 0, totalAmount: 0, totalHouseholds: 0, villageCount: 0 });

        // ดึงข้อมูล WastePurchase พร้อม populate (เหมือนเดิม)
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
        const uniqueCustomers = await WastePurchase.distinct('accountId', query);
        const customerCount = uniqueCustomers.length;

        // คำนวณยอดเงินรวม
        const totalAmountAgg = await WastePurchase.aggregate([
            { $match: query },
            {
                $lookup: {
                    from: 'wasteitems',
                    localField: 'wasteItems',
                    foreignField: '_id',
                    as: 'wasteItemDetails'
                }
            },
            { $unwind: '$wasteItemDetails' },
            {
                $group: {
                    _id: null,
                    totalAmount: {
                        $sum: {
                            $multiply: [
                                '$wasteItemDetails.quantity',
                                '$wasteItemDetails.pricePerUnit'
                            ]
                        }
                    }
                }
            }
        ]);

        const totalAmount = totalAmountAgg.length > 0 ? totalAmountAgg[0].totalAmount : 0;

        // ดึงรายการหมู่บ้านทั้งหมดสำหรับ dropdown
        const villages = await Village.find({ isDeleted: false }).sort({ villageNumber: 1 });

        const startIndex = (page - 1) * limit;

        res.render('employee/wastePurchaseTotal', {
            wastePurchases,
            mytitle: 'พนักงาน | สรุปการรับซื้อขยะ',
            purchaseCount,
            customerCount,
            totalAmount,
            totalCount,
            limit,
            searchDate: searchDate || '',
            searchMonth: searchMonth || '',
            searchYear: searchYear || '',
            villageId: villageId || '',
            accountId: accountIdParam || '',
            pageNumber: page,
            totalPages: totalPages,
            startIndex: startIndex,
            search: search || '',
            villages: villages,
            currentPage: 'wastePurchaseTotal',
            query: req.query,
            wasteSummary: wasteSummary,
            grandTotal: grandTotal
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

        const itemsPerPage = 20;
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

        res.render('employee/member', { 
            mytitle: 'พนักงาน | สมาชิกกองทุนขยะรีไซเคิล',
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
            return res.redirect('/employee/member?error=ไม่พบหมู่บ้านที่ระบุ');
        }

        // ตรวจสอบ username
        const usernameRegex = /^[a-zA-Z0-9_\u0E00-\u0E7F]{5,20}$/;
        if (!usernameRegex.test(req.body.username)) {
            await session.abortTransaction();
            session.endSession();
            return res.redirect('/employee/member?error=ชื่อผู้ใช้ต้องมี 5-20 ตัวอักษร และไม่มีอักขระพิเศษ');
        }

        // ตรวจสอบ password โ
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
            return res.redirect('/employee/member?error=เบอร์โทรหรือเลขบัตรประชาชนนี้ถูกใช้ไปแล้ว');
        }

        // สร้างเลขบัญชี
        const villageNumber = String(village.villageNumber).padStart(2, '0');
        const currentYear = new Date().getFullYear() + 543;
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
        res.redirect('/employee/member?message=ลงทะเบียนครัวเรือนสำเร็จ');

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

        res.redirect('/employee/member?error=เกิดข้อผิดพลาดในการลงทะเบียน: ' + error.message);
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

        // ตรวจสอบ username
        if (req.body.username && req.body.username !== existingFamily.username) {
            const usernameRegex = /^[a-zA-Z0-9_\u0E00-\u0E7F]{5,20}$/;
            if (!usernameRegex.test(req.body.username)) {
                await session.abortTransaction();
                session.endSession();
                return res.redirect('/employee/member?error=ชื่อผู้ใช้ต้องมี 5-20 ตัวอักษร และไม่มีอักขระพิเศษ');
            }

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

        // ตรวจสอบ password
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

        // หาสมาชิกตัวแทนเดิม
        const existingMember = await Member.findOne({ 
            familyID: familyId,
            isRepresentative: true,
            Status: 'living'
        }).session(session);

        if (!existingMember) {
            await session.abortTransaction();
            session.endSession();
            return res.redirect('/employee/member?error=ไม่พบข้อมูลสมาชิกตัวแทน');
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
                return res.redirect('/employee/member?error=เบอร์โทรหรือเลขบัตรประชาชนนี้ถูกใช้ไปแล้ว');
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

        res.redirect('/employee/member?message=แก้ไขข้อมูลสำเร็จ');

    } catch (error) {
        await session.abortTransaction();
        session.endSession();

        console.error('Error updating member:', error);
        res.redirect('/employee/member?error=เกิดข้อผิดพลาดในการแก้ไขข้อมูล: ' + error.message);
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
const complaintReply = async (req, res) => {
    const { id } = req.params;
    try {
        const complaint = await Complaint
            .findById(id)
            .populate('family')
            .populate('reply.employee');

        res.render('employee/complaintReply', {
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

const complaintReplyMessage = async (req, res) => {
    const { id } = req.params;
    const { replyMessage } = req.body;

    try {
        const complaint = await Complaint.findById(id);
        if (!complaint) {
            return res.status(404).send('ไม่พบข้อมูลคำร้องเรียน');
        }
        const employee = await myAdmin.findOne({ username: req.session.username });
        if (!employee) {
            return res.status(404).send('ไม่พบข้อมูลพนักงาน');
        }
        // 🔹 เพิ่มข้อมูลการตอบกลับ
        complaint.reply.push({
            employee: employee._id,
            replyMessage: replyMessage,
        });

        if (complaint.status === 'pending') {
            complaint.status = 'in-progress';
        }


        await complaint.save();

        let complaintTH = '';
        if (complaint.category === 'waste') {
            complaintTH = 'การจัดการขยะ';
        } else if (complaint.category === 'service') {
            complaintTH = 'การบริการของเจ้าหน้าที่';
        } else if (complaint.category === 'noise') {
            complaintTH = 'เสียงรบกวน';
        } else if (complaint.category === 'sale') {
            complaintTH = 'การขายขยะ';
        } else if (complaint.category === 'other') {
            complaintTH = 'อื่นๆ';
        }


        const contentList = `
            <div>
                <p><strong>หมวดหมู่:</strong> ${complaintTH}</p>
                <p><strong>ข้อความร้องเรียน:</strong> ${complaint.complaintMessage}</p>
                <hr class="my-2">
                <p><strong>คำตอบจากพนักงาน ${employee.firstname} ${employee.lastname}:</strong></p>
                <p>${replyMessage}</p>
            </div>
        `;
        const notification = new Notification({
            userId: complaint.family._id, // เจ้าของคำร้อง
            type: 'complaint-reply',
            title: `ได้รับการตอบกลับจากพนักงานแล้ว`,
            content: contentList,
            isRead: false,
        });

        await notification.save();

        res.redirect(`/employee/complaint/reply/${id}`);
    } catch (error) {
        console.error('Error replying to complaint:', error);
        res.status(500).send('เกิดข้อผิดพลาดในการตอบกลับข้อร้องเรียน');
    }
};

const updateMessageReply = async (req, res) => { 
    try {
        const { complaintId, replyId } = req.params;
        const { replyMessage } = req.body;
        const employeeId = req.user._id;

        const complaint = await Complaint.findById(complaintId);
        if (!complaint) {
            return res.status(404).json({ error: 'ไม่พบคำร้องเรียน' });
        }

        const reply = complaint.reply.id(replyId);
        if (!reply) {
            return res.status(404).json({ error: 'ไม่พบข้อความตอบกลับ' });
        }

        // ตรวจสอบว่าเป็นคนตอบเองหรือไม่
        if (reply.employee.toString() !== employeeId.toString()) {
            return res.status(403).json({ error: 'คุณไม่มีสิทธิ์แก้ไขข้อความนี้' });
        }

        reply.replyMessage = replyMessage;
        await complaint.save();

        res.json({ success: true, message: 'แก้ไขข้อความสำเร็จ' });

    } catch (error) {
        console.error('Error updating reply:', error);
        res.status(500).json({ error: 'เกิดข้อผิดพลาดในการแก้ไข' });
    }
};

const deleteMessageReply = async (req, res) => {
    try {
        const { id } = req.params; // replyId
        const employeeId = req.user._id;

        // หา complaint ที่มี reply นี้
        const complaint = await Complaint.findOne({ 'reply._id': id });
        
        if (!complaint) {
            return res.status(404).json({ error: 'ไม่พบข้อความตอบกลับ' });
        }

        const reply = complaint.reply.id(id);
        
        // ตรวจสอบว่าเป็นคนตอบเองหรือไม่
        if (reply.employee.toString() !== employeeId.toString()) {
            return res.status(403).json({ error: 'คุณไม่มีสิทธิ์ลบข้อความนี้' });
        }

        // ลบ reply
        complaint.reply.pull(id);
        await complaint.save();

        res.json({ success: true, message: 'ลบข้อความสำเร็จ' });

    } catch (error) {
        console.error('Error deleting reply:', error);
        res.status(500).json({ error: 'เกิดข้อผิดพลาดในการลบ' });
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
            .find({ isDeleted: false, status: { $ne: 'archived' } })
            .populate('waste')
            .populate('family')
            .sort({ createdAt: -1 });

        const validRequests = wasteSaleRequests.filter(r => r.family !== null);

        console.log(`Total: ${wasteSaleRequests.length}, Valid: ${validRequests.length}`);

        res.render('employee/wasteSaleRequest', {
            mytitle: 'พนักงาน | ความประสงค์ขายขยะ',
            wasteSaleRequests: validRequests,
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

const wasteSaleRequestReplyIndex = async (req, res) => {
    const { id } = req.params;

    if (!id || id === 'undefined') {
        console.log('Something wrong')
        return res.redirect('/employee/wasteSaleRequest?error=' + encodeURIComponent('ID ไม่ถูกต้อง'));
    }

    try {
        let logs = [];

        const request = await wasteSaleRequest.findById(id, { isDeleted: false })
            .populate('waste') // ดึงข้อมูลขยะจาก ObjectId
            .populate('family') // ดึงข้อมูลครอบครัว
            .sort({ createdAt: -1 }); // เรียงตามวันที่สร้างล่าสุด


        logs = await wasteSaleRequestLog
            .find({
                wasteSaleRequest: id,
                isDeleted: false
            })
            .sort({ createdAt: 1 });
        if (!request) {
            return res.redirect('/employee/wasteSaleRequest?error=' + encodeURIComponent('ไม่พบคำขอ'));
        }
        if (!logs) {
            return res.redirect('/employee/wasteSaleRequest?error=' + encodeURIComponent('ไม่พบบันทึก'));
        }

        const route = await Route.findOne({
            "points.requestId": id
        });

        res.render('employee/wasteSaleRequestConfirm', {
            mytitle: 'พนักงาน | ความประสงค์ขายขยะ',
            request,
            currentPage: 'wasteSaleRequest',
            logs,
            route
        });

    } catch (err) {
        console.log(err);
        res.redirect('/employee/wasteSaleRequest?error=' + encodeURIComponent('เกิดข้อผิดพลาด'));
    }
};


const wasteSaleRequestReject = async (req, res) => {
    const { id } = req.params;

    if (!id || id === 'undefined') {
        console.log('Something wrong')
        return res.redirect('/employee/wasteSaleRequest?error=' + encodeURIComponent('ID ไม่ถูกต้อง'));
    }
    try {
        const wastesaleRequest = await wasteSaleRequest
            .findByIdAndUpdate(
                id,
                { status: 'rejected' },
                { new: true }
            )
            .populate('waste')
            .populate('family');
        if (!wastesaleRequest) {
            return res.redirect('/employee/wasteSaleRequest?error=' + encodeURIComponent('ไม่พบคำขอ'));
        }
        const logs = new wasteSaleRequestLog({
            wasteSaleRequest: wastesaleRequest._id,
            status: 'CANCELLED_BY_EMPLOYEE',
            stage: 'SUBMITTED',
            actionBy: 'EMPLOYEE'
        });
        await logs.save();
        
        if (wastesaleRequest && wastesaleRequest.family) {
            const contentList = `
                <div>
                    <p><strong>หมวดหมู่:</strong> แจ้งขายขยะ</p>
                    <p><strong>ข้อความ:</strong> คำขอขายขยะของคุณถูกยกเลิกโดยเจ้าหน้าที่</p>
                    <hr class="my-2">
                    <p><strong>ระบบ:</strong></p>
                    <p>เจ้าหน้าที่ได้ทำการยกเลิกคำขอของคุณ</p>
                </div>
            `;
            await Notification.create({
                userId: wastesaleRequest.family._id, // เจ้าของคำร้อง
                type: 'waste-request',
                title: `ได้รับการตอบกลับจากพนักงานแล้ว`,
                content: contentList,
                isRead: false,
            });
        }

        res.redirect('/employee/wasteSaleRequest?success=' + encodeURIComponent('ปธิเสธคำข้อเรียบร้อย'));
    } catch {
        console.log(err);
        res.redirect('/employee/wasteSaleRequest?error=' + encodeURIComponent('เกิดข้อผิดพลาด'));
    }
}

const timeToConfirm = 24;

const wasteSaleRequestApprovePost = async (req, res) => {
    const { id } = req.params;
    const { action, responseMessage, pickupDate } = req.body;

    if (!id || id === 'undefined') {
        return res.redirect('/employee/wasteSaleRequest?error=' + encodeURIComponent('ID ไม่ถูกต้อง'));
    }

    try {
        const now = new Date(); // UTC now

        // 🔥 แปลง pickupDate (TH) → UTC
        const pickupDateUTC = new Date(pickupDate); // รูปแบบ 'YYYY-MM-DD' จะเป็น UTC เที่ยงคืนโดยอัตโนมัติ

        // ================= ปฏิเสธ =================
        if (action === 'reject') {
            const request = await wasteSaleRequest.findByIdAndUpdate(id, {
                $set: {
                    status: 'rejected',
                    responseMessage: responseMessage || 'ปฏิเสธคำขอ',
                    rejectedAt: now
                }
            }).populate('family');

            await wasteSaleRequestLog.create({
                wasteSaleRequest: id,
                status: 'REJECTED',
                approveText: responseMessage,
                actionBy: 'EMPLOYEE'
            });
            
            if (request && request.family) {
                const contentList = `
                    <div>
                        <p><strong>หมวดหมู่:</strong> แจ้งขายขยะ</p>
                        <p><strong>ข้อความ:</strong> คำขอขายขยะของคุณถูกปฏิเสธ</p>
                        <hr class="my-2">
                        <p><strong>คำตอบจากพนักงาน:</strong></p>
                        <p>${responseMessage || 'ปฏิเสธคำขอ'}</p>
                    </div>
                `;
                await Notification.create({
                    userId: request.family._id, // เจ้าของคำร้อง
                    type: 'waste-request',
                    title: `ได้รับการตอบกลับจากพนักงานแล้ว`,
                    content: contentList,
                    isRead: false,
                });
            }

            return res.redirect(
                `/employee/wasteSaleRequest/${id}?success=` +
                encodeURIComponent('ปฏิเสธคำขอเรียบร้อยแล้ว')
            );
        }

        // ================= อนุมัติ =================
        if (action === 'approve') {
            const request = await wasteSaleRequest.findByIdAndUpdate(id, {
                $set: {
                    status: 'confirmed',
                    approvedAt: now,                // UTC
                    confirmedAt: now,               // Auto-confirm
                    responseMessage: responseMessage || 'ไม่ระบุ',
                    approvePickupDate: pickupDateUTC // ✅ UTC
                }
            }).populate('family');

            await wasteSaleRequestLog.create({
                wasteSaleRequest: id,
                status: 'CONFIRMED',
                approveText: responseMessage,
                actionBy: 'EMPLOYEE'
            });
            
            if (request && request.family) {
                const contentList = `
                    <div>
                        <p><strong>หมวดหมู่:</strong> แจ้งขายขยะ</p>
                        <p><strong>ข้อความ:</strong> คำขอขายขยะของคุณได้รับการอนุมัติ และยืนยันวันนัดรับแล้ว</p>
                        <hr class="my-2">
                        <p><strong>คำตอบจากพนักงาน:</strong></p>
                        <p>${responseMessage || 'ไม่ระบุ'}</p>
                        <p><strong>วันที่นัดรับ:</strong> ${pickupDateUTC.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                        <p><strong>หมายเหตุ:</strong> ${request.note || 'ไม่ระบุ'}</p>
                    </div>
                `;
                await Notification.create({
                    userId: request.family._id, // เจ้าของคำร้อง
                    type: 'waste-request',
                    title: `ได้รับการตอบกลับจากพนักงานแล้ว`,
                    content: contentList,
                    isRead: false,
                });
            }

            return res.redirect(
                `/employee/wasteSaleRequest/${id}?success=` +
                encodeURIComponent('อนุมัติคำขอเรียบร้อยแล้ว')
            );
        }

        return res.redirect(
            '/employee/wasteSaleRequest?error=' +
            encodeURIComponent('ไม่พบ action ที่ถูกต้อง')
        );

    } catch (err) {
        console.error(err);
        return res.redirect(
            '/employee/wasteSaleRequest?error=' +
            encodeURIComponent('เกิดข้อผิดพลาด')
        );
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

// API สำหรับดึงข้อมูลคำขอที่รออนุมัติ (Real-time)
const getPendingWasteSaleRequests = async (req, res) => {
    try {
        const pendingRequests = await wasteSaleRequest
            .find({ status: 'pending', isDeleted: false })
            .populate('waste')
            .populate('family')
            .sort({ createdAt: -1 });

        res.json({ success: true, pendingRequests });
    } catch (error) {
        console.error('Error fetching pending requests:', error);
        res.status(500).json({ success: false, error: 'เกิดข้อผิดพลาดในการดึงข้อมูล' });
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
//             return res.render('employee/wasteStock', {
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
//         res.render('employee/wasteStock', {
//             mytitle: 'พนักงาน | สต๊อกขยะ',
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
//         res.status(500).render('employee/wasteStock', {
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
        // ---- 8. รวมข้อมูลแยกตามชื่อขยะ ----
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
                    pricePerUnit: item.pricePerUnit,
                    monthlyBreakdown: {}, // เพิ่มตรงนี้
                };
            }

            stockMap[key].totalQuantityKg += item.quantity;
            stockMap[key].totalAmount += item.quantity * item.pricePerUnit;
            stockMap[key].purchaseCount += 1;

            // ---- หา purchaseDate จาก purchase ที่มี item นี้ ----
            const parentPurchase = allPurchases.find(p =>
                p.wasteItems.some(wId => wId.toString() === item._id.toString())
            );

            if (parentPurchase && parentPurchase.purchaseDate) {
                const d = new Date(parentPurchase.purchaseDate);
                const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

                if (!stockMap[key].monthlyBreakdown[monthKey]) {
                    stockMap[key].monthlyBreakdown[monthKey] = {
                        month: monthKey,
                        quantity: 0,
                        amount: 0,
                        purchases: 0,
                    };
                }

                stockMap[key].monthlyBreakdown[monthKey].quantity += item.quantity;
                stockMap[key].monthlyBreakdown[monthKey].amount += item.quantity * item.pricePerUnit;
                stockMap[key].monthlyBreakdown[monthKey].purchases += 1;
            }
        }

        // ---- 9. คำนวณราคาเฉลี่ย + แปลง monthlyBreakdown เป็น array ----
        const stockData = Object.values(stockMap).map(stock => {
            const monthlyArray = Object.values(stock.monthlyBreakdown).map(m => ({
                ...m,
                avgPrice: m.quantity > 0 ? m.amount / m.quantity : 0,
            }));

            return {
                ...stock,
                monthlyBreakdown: monthlyArray, // แปลงเป็น array
                avgPricePerUnit: stock.totalQuantityKg > 0
                    ? stock.totalAmount / stock.totalQuantityKg
                    : 0,
            };
        });

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

        res.render('employee/wasteStock', {
            mytitle: 'พนักงาน | สต๊อกขยะ',
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

// หน้าเบิกถอน - ปรับปรุงฟังก์ชันถอนเงิน
const withDrawIndex = async (req, res) => {
    try {
        const { accountId, withdrawAmount } = req.body;

        // ตรวจสอบข้อมูล input
        if (!accountId || !withdrawAmount) {
            console.error('ข้อมูลไม่ครบถ้วน:', { accountId, withdrawAmount });
            return res.redirect('/employee/withDraw?error=' + encodeURIComponent('กรุณากรอกข้อมูลให้ครบถ้วน'));
        }

        // ค้นหาบัญชี
        const account = await WasteBankAccount.findOne({ 
            AccountNumber: accountId, 
            isDeleted: false 
        });

        if (!account) {
            console.error('ไม่พบบัญชี:', accountId);
            return res.redirect('/employee/withDraw?error=' + encodeURIComponent('ไม่พบบัญชีที่ระบุ'));
        }

        // ตรวจสอบจำนวนเงิน
        const amount = parseFloat(withdrawAmount);
        if (amount <= 0 || isNaN(amount)) {
            console.error('จำนวนเงินไม่ถูกต้อง:', withdrawAmount);
            return res.redirect('/employee/withDraw?error=' + encodeURIComponent('จำนวนเงินไม่ถูกต้อง'));
        }

        // ดึงการตั้งค่ายอดเงินขั้นต่ำจาก database
        const settings = await SystemSettings.getSettings();
        const minimumAmount = settings.minimumWithdrawAmount;

        // ตรวจสอบว่ายอดเงินคงเหลือหลังถอนต้องไม่ต่ำกว่ายอดขั้นต่ำ
        const balanceAfterWithdraw = account.Balance - amount;
        if (balanceAfterWithdraw < minimumAmount) {
            console.error('ยอดเงินคงเหลือไม่เพียงพอ:', { 
                balance: account.Balance, 
                withdraw: amount, 
                afterWithdraw: balanceAfterWithdraw,
                minimum: minimumAmount 
            });
            return res.redirect('/employee/withDraw?error=' + 
                encodeURIComponent(`ไม่สามารถถอนได้ เนื่องจากยอดเงินคงเหลือหลังถอนจะต่ำกว่ายอดขั้นต่ำ ${minimumAmount} บาท`));
        }

        if (account.Balance < amount) {
            console.error('ยอดเงินไม่พอ:', { balance: account.Balance, withdraw: amount });
            return res.redirect('/employee/withDraw?error=' + encodeURIComponent('ยอดเงินในบัญชีไม่เพียงพอ'));
        }

        // ค้นหาครอบครัว
        const family = await Family.findById(account.familyID);
        if (!family) {
            console.error('ไม่พบข้อมูลครอบครัว:', account.familyID);
            return res.redirect('/employee/withDraw?error=' + encodeURIComponent('ไม่พบข้อมูลครอบครัว'));
        }

        // ใช้ session/transaction สำหรับความปลอดภัย
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // อัพเดทยอดเงิน
            account.Balance -= amount;
            await account.save({ session });

            // สร้างรายการถอนเงิน
            await Transaction.create([{
                account: account._id,
                family: family._id,
                transactionType: 'withdraw',
                amount: amount,
                status: 'สำเร็จ',
                note: 'ถอนเงินโดยเจ้าหน้าที่'
            }], { session });

            await session.commitTransaction();
            console.log('ถอนเงินสำเร็จ:', { accountId, amount });
            
            return res.redirect('/employee/withDraw?message=' + encodeURIComponent('ถอนเงินสำเร็จแล้ว'));
        } catch (txError) {
            await session.abortTransaction();
            throw txError;
        } finally {
            session.endSession();
        }

    } catch (error) {
        console.error('เกิดข้อผิดพลาดในการถอนเงิน:', error);
        return res.redirect('/employee/withDraw?error=' + encodeURIComponent('เกิดข้อผิดพลาดในการถอนเงิน: ' + error.message));
    }
};

// แสดงหน้าถอนเงิน
const showWithdrawPage = async (req, res) => {
    try {
        // รับค่า page จาก query string (ถ้าไม่มีให้เป็น 1)
        const page = parseInt(req.query.page) || 1;
        const limit = 10; // จำนวนรายการต่อหน้า
        const skip = (page - 1) * limit;

        // ดึงข้อมูลการตั้งค่า
        const settings = await SystemSettings.getSettings();
        
        // นับจำนวนรายการทั้งหมด
        const totalTransactions = await Transaction.countDocuments({ 
            transactionType: 'withdraw', 
            isDeleted: false 
        });

        // คำนวณจำนวนหน้าทั้งหมด
        const totalPages = Math.ceil(totalTransactions / limit);

        // ดึงข้อมูล transactions สำหรับหน้าปัจจุบัน
        const transactions = await Transaction.find({ 
            transactionType: 'withdraw', 
            isDeleted: false 
        })
        .sort({ transactionDate: -1 })
        .skip(skip)
        .limit(limit)
        .populate('account')
        .populate('family')
        .lean();

        res.render('employee/withDraw', {
            mytitle: 'พนักงาน | เบิกถอนเงิน',
            transactions: transactions || [],
            minimumWithdrawAmount: settings.minimumWithdrawAmount,
            message: req.query.message || null,
            error: req.query.error || null,
            currentPage: 'withDraw',
            // ข้อมูลสำหรับ pagination
            pagination: {
                currentPage: page,
                totalPages: totalPages,
                totalItems: totalTransactions,
                itemsPerPage: limit,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            }
        });
    } catch (err) {
        console.error('เกิดข้อผิดพลาดในการโหลดหน้าถอนเงิน:', err);
        res.render('employee/withDraw', {
            mytitle: 'เบิกถอนเงิน',
            transactions: [],
            minimumWithdrawAmount: 300,
            error: 'เกิดข้อผิดพลาดในการโหลดข้อมูล',
            message: null,
            currentPage: 'withDraw',
            pagination: {
                currentPage: 1,
                totalPages: 0,
                totalItems: 0,
                itemsPerPage: 20,
                hasNextPage: false,
                hasPrevPage: false
            }
        });
    }
};


// ดึงข้อมูลบัญชีผ่าน AJAX
const getAccountByNumber = async (req, res) => {
    try {
        const { accountNumber } = req.params;

        console.log('ค้นหาบัญชี:', accountNumber);

        if (!accountNumber) {
            return res.status(400).json({ 
                success: false,
                error: 'กรุณาระบุเลขบัญชี' 
            });
        }

        const account = await WasteBankAccount.findOne({ 
            AccountNumber: accountNumber, 
            isDeleted: false 
        }).populate('familyID');

        if (!account) {
            console.error('ไม่พบบัญชี:', accountNumber);
            return res.status(404).json({ 
                success: false,
                error: 'ไม่พบบัญชี' 
            });
        }

        // ดึงยอดเงินขั้นต่ำ
        const settings = await SystemSettings.getSettings();

        console.log('พบบัญชี:', account.AccountNumber);

        res.json({
            success: true,
            accountName: account.AccountName,
            accountNumber: account.AccountNumber,
            balance: account.Balance,
            minimumWithdrawAmount: settings.minimumWithdrawAmount, // ส่งค่านี้ไปด้วย
            familyName: account.familyID ? account.familyID.familyName : '-'
        });
    } catch (err) {
        console.error('เกิดข้อผิดพลาดใน getAccountByNumber:', err);
        res.status(500).json({ 
            success: false,
            error: 'เกิดข้อผิดพลาดในเซิร์ฟเวอร์: ' + err.message 
        });
    }
};

// ฟังก์ชันสำหรับอัพเดทยอดเงินขั้นต่ำ (เพิ่มใหม่)
const updateMinimumWithdraw = async (req, res) => {
    try {
        const { minimumAmount } = req.body;

        if (!minimumAmount || isNaN(minimumAmount) || minimumAmount < 0) {
            return res.status(400).json({
                success: false,
                error: 'กรุณาระบุจำนวนเงินที่ถูกต้อง'
            });
        }

        const settings = await SystemSettings.updateMinimumWithdraw(parseFloat(minimumAmount));

        res.json({
            success: true,
            message: 'อัพเดทยอดเงินขั้นต่ำสำเร็จ',
            minimumWithdrawAmount: settings.minimumWithdrawAmount
        });
    } catch (err) {
        console.error('เกิดข้อผิดพลาดในการอัพเดท:', err);
        res.status(500).json({
            success: false,
            error: 'เกิดข้อผิดพลาดในการอัพเดท: ' + err.message
        });
    }
};

// ฟังก์ชันดึงการตั้งค่าปัจจุบัน (เพิ่มใหม่)
const getCurrentSettings = async (req, res) => {
    try {
        const settings = await SystemSettings.getSettings();
        res.json({
            success: true,
            minimumWithdrawAmount: settings.minimumWithdrawAmount
        });
    } catch (err) {
        console.error('เกิดข้อผิดพลาดในการดึงการตั้งค่า:', err);
        res.status(500).json({
            success: false,
            error: 'เกิดข้อผิดพลาดในการดึงข้อมูล: ' + err.message
        });
    }
};

const searchAccounts = async (req, res) => {
    try {
        const { q } = req.query;
        const limit = parseInt(req.query.limit) || 10;

        // ✅ ถ้า q ว่าง ให้ดึง 5 รายการล่าสุด
        if (!q || q.trim() === '') {
            const accounts = await WasteBankAccount.find({ isDeleted: false })
                .select('AccountNumber AccountName Balance')
                .sort({ createdAt: -1 })
                .limit(limit)
                .lean();

            return res.json({ success: true, accounts });
        }

        if (q.trim().length < 2) {
            return res.json({ success: true, accounts: [] });
        }

        const accounts = await WasteBankAccount.find({
            isDeleted: false,
            $or: [
                { AccountNumber: { $regex: q.trim(), $options: 'i' } },
                { AccountName: { $regex: q.trim(), $options: 'i' } }
            ]
        })
        .select('AccountNumber AccountName Balance')
        .limit(limit)
        .lean();

        res.json({ success: true, accounts });

    } catch (err) {
        console.error('Search error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};


// หน้าฌาปนกิจสงเคราะห์
const funeralAidIndex = (req, res) => {
    res.render('employee/funeralAid', {
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
    res.render('employee/funeralAidHistory', {
        mytitle: 'พนักงาน | ประวัติฌาปนกิจสงเคราะห์',
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
            .populate('deductedAccounts.familyID', 'familyName username')
            .populate('deceasedInfo.memberID', 'name')
            .lean();

        if (!record) {
            return res.status(404).json({ 
                success: false, 
                message: 'ไม่พบข้อมูลฌาปนกิจ' 
            });
        }

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
            console.error("Multer upload error:", err);
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

            // ตรวจสอบว่าข้อมูลนี้มาจากใคร 
            const isFromEmployee = existingRecord.submittedBy?.userType === 'employee';
            const targetFolder = isFromEmployee 
                ? 'funeral-documents-fromEmployeeUpload'  // 📁 Employee → Employee folder
                : 'funeral-documents';                     // 📁 User → User folder

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

            //  อัปโหลดไฟล์ไปที่ folder เดิม 
            if (req.files && Object.keys(req.files).length > 0) {
                console.log(`Uploading new files to Cloudinary (${targetFolder})...`);
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
                            // ใช้ targetFolder ที่ตรวจสอบได้
                            const result = await uploadToCloudinary(
                                file.buffer, 
                                file.originalname,
                                targetFolder // 📁 ใช้ folder เดิม (Employee หรือ User)
                            );
                            
                            return {
                                fieldName,
                                url: result.secure_url
                            };
                        } catch (error) {
                            console.error(`Error uploading ${fieldName}:`, error);
                            throw new Error(`ไม่สามารถอัปโหลด ${fieldName} ได้`);
                        }
                    });

                const uploadedFiles = await Promise.all(uploadPromises);

                uploadedFiles.forEach(file => {
                    updateFields[`documents.${file.fieldName}`] = file.url;
                });
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

            res.json({
                success: true,
                message: 'แก้ไขข้อมูลฌาปนกิจสำเร็จ',
                data: updatedRecord
            });

        } catch (error) {
            await session.abortTransaction();
            console.error('Error updating funeral assistance:', error);
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
    res.render('employee/funeralRequest', {
        mytitle: 'พนักงาน | รายการคำขอฌาปนกิจที่รอการอนุมัติ',
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

        // อัปเดตสถานะผู้เสียชีวิต
        if (request.deceasedInfo.memberID && request.deceasedInfo.name) {
            const memberIdObj = request.deceasedInfo.memberID;
            const deceasedName = request.deceasedInfo.name;
            
            // ตรวจสอบว่าเป็น householdMember ของ Member ไหน
            const memberWithHouseholdMember = await Member.findOne({
                'householdMembers._id': memberIdObj,
                isDeleted: false
            }).session(session);

            if (memberWithHouseholdMember) {
                // เป็น householdMember
                const householdIndex = memberWithHouseholdMember.householdMembers.findIndex(
                    b => b._id.toString() === memberIdObj.toString()
                );
                
                if (householdIndex !== -1) {
                    memberWithHouseholdMember.householdMembers[householdIndex].status = 'deceased';
                    await memberWithHouseholdMember.save({ session });
                }
            } else {
                // เป็น Member หลัก
                const updateResult = await Member.findByIdAndUpdate(
                    memberIdObj,
                    { Status: 'deceased' },
                    { session, new: true }
                );
                
                if (updateResult) {
                    console.log(`Updated member status to deceased: ${deceasedName}`);
                } else {
                    console.warn(`Member not found for update: ${memberIdObj}`);
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
                        <p>นำขยะมาขายให้ยอดคงเหลือกลับมาเกิน 300 บาท สิทธิ์จะกลับมาอัตโนมัติ</p>
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

// หน้าแผนที่ - ดึงข้อมูล wasteSaleRequest ที่ status = 'pending'
const mapIndex = async (req, res) => {
    try {
        // 1. หา Route ทั้งหมดที่ active เพื่อดูว่า request ไหนถูกนำไปจัดเส้นทางแล้ว
        const activeRoutes = await Route.find({ status: { $ne: 'archived' } });
        const routedRequestIds = activeRoutes.reduce((acc, route) => {
            return acc.concat(route.wasteSaleRequests || []);
        }, []);

        // 2. ดึงข้อมูล wasteSaleRequest ที่เป็น 'confirmed' หรือ 'in-progress' (ที่ถูกปรับโดย Cron)
        // และยังไม่ได้ถูกจัดลงใน Route (ID ไม่ได้อยู่ใน routedRequestIds)
        const confirmedRequests = await wasteSaleRequest.find({ 
            status: { $in: ['confirmed', 'in-progress'] },
            _id: { $nin: routedRequestIds },
            isDeleted: false
        })
        .populate('waste') // ดึงข้อมูลขยะมาด้วย
        .populate('family') // ดึงข้อมูลครอบครัวมาด้วย
        .sort({ approvePickupDate: 1, createdAt: 1 }); // เรียงตามวันนัดรับจากวันนี้ไปในอนาคต

        res.render('employee/map', {
            mytitle: 'พนักงาน | แผนที่จุดเข้ารับซื้อ',
            currentPage: 'map',
            confirmedRequests: confirmedRequests // ส่งข้อมูลไปยัง view
        });
    } catch (error) {
        console.error('Error loading map:', error);
        res.render('employee/map', {
            mytitle: 'พนักงาน | แผนที่จุดเข้ารับซื้อ',
            currentPage: 'map',
            confirmedRequests: []
        });
    }
};

// บันทึกเส้นทาง
const saveRoute = async (req, res) => {
    try {
        const { routeName, actionDate, points, totalDistance, totalDuration, note, requestIds } = req.body;
        
        // ตรวจสอบข้อมูลพื้นฐาน
        if (!routeName || !actionDate || !points || points.length < 2) {
            return res.status(400).json({
                success: false,
                message: 'กรุณากรอกข้อมูลให้ครบถ้วน และต้องมีอย่างน้อย 2 จุด'
            });
        }
        
        const plannedDate = new Date(actionDate);
        
        // สร้างเส้นทางใหม่
        const newRoute = new Route({
            routeName: routeName,
            actionDate: plannedDate,
            points: points,
            totalDistance: totalDistance,
            totalDuration: totalDuration,
            numberOfPoints: points.length,
            createdBy: req.user._id,
            note: note || '',
            wasteSaleRequests: requestIds || [] // เก็บ ID ของ wasteSaleRequest ที่เกี่ยวข้อง
        });
        
        // บันทึกลงฐานข้อมูล
        await newRoute.save();
        
        res.status(201).json({
            success: true,
            message: 'บันทึกเส้นทางเรียบร้อยแล้ว',
            routeId: newRoute._id
        });
        
    } catch (error) {
        console.error('Error saving route:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการบันทึกเส้นทาง'
        });
    }
};


// ดูรายการเส้นทางที่บันทึกไว้ทั้งหมด
const getAllRoutes = async (req, res) => {
    try {
        const routes = await Route.find({ isDeleted: false })
        .sort({ actionDate: -1, createdAt: -1 })
        .populate('createdBy', 'firstname lastname')
        .populate('wasteSaleRequests'); // ดึงข้อมูล wasteSaleRequest มาด้วย
        
        res.render('employee/routeList', {
            mytitle: 'รายการเส้นทางที่บันทึก',
            currentPage: 'routes',
            routes: routes
        });
        
    } catch (error) {
        console.error('Error getting routes:', error);
        res.redirect('/employee/map?error=ไม่สามารถโหลดข้อมูลได้');
    }
};

// ปฏิทินตารางการดำเนินการ
const routeCalendarIndex = async (req, res) => {
    try {
        const routes = await Route.find( { isDeleted: false })
        .sort({ actionDate: 1, createdAt: -1 })
        .populate('createdBy', 'firstname lastname')
        .populate({
            path: 'points.requestId',
            select: 'family',
            populate: {
                path: 'family',
                select: 'familyName'
            }
        });
        
        res.render('employee/routeCalendar', {
            mytitle: 'ตารางการดำเนินการ',
            currentPage: 'routeCalendar',
            routes: routes
        });
    } catch (error) {
        console.error('Error getting routes for calendar:', error);
        res.redirect('/employee/routeList?error=ไม่สามารถโหลดปฏิทินได้');
    }
};

// ดูรายละเอียดเส้นทาง
const getRouteDetail = async (req, res) => {
    try {
        const { routeId } = req.params;
        
        const route = await Route.findById(routeId)
            .populate('createdBy', 'firstname lastname email')
            .populate({
                path: 'wasteSaleRequests',
                populate: [
                    { path: 'waste', select: 'wasteName type' },
                    { path: 'family', select: 'firstname lastname familyName' }
                ]
            })
            .populate({
                path: 'points.requestId',
                select: 'family',
                populate: {
                    path: 'family',
                    select: 'familyName'
                }
            });
        
        if (!route) {
            return res.redirect('/employee/routeList?error=ไม่พบเส้นทางที่ต้องการ');
        }
        
        res.render('employee/routeDetail', {
            mytitle: 'รายละเอียดเส้นทาง',
            currentPage: 'routes',
            route: route
        });
        
    } catch (error) {
        console.error('Error getting route detail:', error);
        res.redirect('/employee/routeList?error=เกิดข้อผิดพลาด');
    }
};

// ลบเส้นทาง
const deleteRoute = async (req, res) => {
    try {
        const { routeId } = req.params;
        
        const route = await Route.findOneAndUpdate(
            { _id: routeId },
            { isDeleted: true },
            { new: true }
        );
        
        if (!route) {
            return res.status(404).json({
                success: false,
                message: 'ไม่พบเส้นทางที่ต้องการลบ'
            });
        }
        
        res.json({
            success: true,
            message: 'ลบเส้นทางเรียบร้อยแล้ว'
        });
        
    } catch (error) {
        console.error('Error deleting route:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการลบเส้นทาง'
        });
    }
};

// อัปเดตเส้นทาง
const updateRoute = async (req, res) => {
    try {
        const { routeId } = req.params;
        const { routeName, note } = req.body;
        
        const route = await Route.findOneAndUpdate(
            { _id: routeId, createdBy: req.user._id },
            { 
                routeName: routeName,
                note: note
            },
            { new: true, runValidators: true }
        );
        
        if (!route) {
            return res.status(404).json({
                success: false,
                message: 'ไม่พบเส้นทางที่ต้องการแก้ไข'
            });
        }
        
        res.json({
            success: true,
            message: 'แก้ไขเส้นทางเรียบร้อยแล้ว',
            route: route
        });
        
    } catch (error) {
        console.error('Error updating route:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการแก้ไขเส้นทาง'
        });
    }
};

const updateRoutePoints = async (req, res) => {
    try {
        const { routeId } = req.params;
        const { points, totalDistance, totalDuration, numberOfPoints } = req.body;
        
        if (!points || points.length < 2) {
            return res.status(400).json({
                success: false,
                message: 'กรุณาระบุจุดอย่างน้อย 2 จุด'
            });
        }
        
        const route = await Route.findOneAndUpdate(
            { 
                _id: routeId
            },
            { 
                points: points,
                totalDistance: totalDistance,
                totalDuration: totalDuration,
                numberOfPoints: numberOfPoints,
                updatedAt: Date.now()
            },
            { 
                new: true, 
                runValidators: true 
            }
        );
        
        if (!route) {
            return res.status(404).json({
                success: false,
                message: 'ไม่พบเส้นทางที่ต้องการแก้ไข'
            });
        }
        
        const requestIds = points
            .filter(p => p.requestId)
            .map(p => p.requestId);
        
        if (requestIds.length > 0) {
            route.wasteSaleRequests = requestIds;
            await route.save();
        }
        
        res.json({
            success: true,
            message: 'อัปเดตเส้นทางเรียบร้อยแล้ว',
            route: route
        });
        
    } catch (error) {
        console.error('Error updating route points:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการอัปเดตเส้นทาง: ' + error.message
        });
    }
};

// อัปเดตสถานะจุดเดี่ยวในเส้นทาง (complete / failed / in-progress)
const RoutePointsComplete = async (req, res) => {
    try {
        const { routeId, pointId } = req.params;
        const { status, reason } = req.body;

        const allowedStatuses = ['complete', 'failed', 'in-progress'];
        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: 'สถานะไม่ถูกต้อง' });
        }

        const route = await Route.findById(routeId);
        if (!route) {
            return res.status(404).json({ success: false, message: 'ไม่พบเส้นทาง' });
        }

        const point = route.points.id(pointId);
        if (!point) {
            return res.status(404).json({ success: false, message: 'ไม่พบจุดในเส้นทาง' });
        }

        // อัปเดตสถานะจุด
        point.status = status;
        if (status === 'failed' && reason) {
            point.failReason = reason;
        }

        // ตรวจสอบว่าครบทุกจุดหรือยัง (ข้ามจุดเริ่มต้น)
        const allDone = route.points.slice(1).every(p => p.status === 'complete' || p.status === 'failed');
        route.isAllComplete = allDone;
        if (allDone) {
            route.status = 'archived';
        }

        await route.save();

        // อัปเดต wasteSaleRequest ที่เชื่อมกับจุดนี้
        if (point.requestId) {
            if (status === 'complete') {
                await wasteSaleRequest.findByIdAndUpdate(point.requestId, { status: 'resolved' });
                await wasteSaleRequestLog.create({
                    wasteSaleRequest: point.requestId,
                    status: 'COMPLETED',
                    approveText: `รับซื้อสำเร็จ (เส้นทาง: ${route.routeName})`,
                    actionBy: 'EMPLOYEE'
                });
                const request = await wasteSaleRequest.findById(point.requestId).populate('family');
                if (request && request.family) {
                    const contentList = `
                        <div>
                            <p><strong>หมวดหมู่:</strong> แจ้งขายขยะ</p>
                            <p><strong>ข้อความ:</strong> การรับซื้อขยะสำเร็จ</p>
                            <hr class="my-2">
                            <p><strong>ระบบ:</strong></p>
                            <p>เจ้าหน้าที่รับซื้อขยะตามคำขอของคุณเรียบร้อยแล้ว ขอบคุณที่ร่วมกิจกรรมคัดแยกขยะกับเรา</p>
                        </div>
                    `;
                    await Notification.create({
                        userId: request.family._id, // เจ้าของคำร้อง
                        type: 'waste-request',
                        title: `การรับซื้อขยะเสร็จสมบูรณ์`,
                        content: contentList,
                        isRead: false,
                        category: 'waste-request'
                    });
                }
            } else if (status === 'failed') {
                await wasteSaleRequest.findByIdAndUpdate(point.requestId, { status: 'failed' });
                await wasteSaleRequestLog.create({
                    wasteSaleRequest: point.requestId,
                    status: 'REJECTED',
                    reason: reason || 'OTHER',
                    approveText: `เข้ารับไม่ได้ (เส้นทาง: ${route.routeName})`,
                    actionBy: 'EMPLOYEE'
                });
                const request = await wasteSaleRequest.findById(point.requestId).populate('family');
                if (request && request.family) {
                    const contentList = `
                        <div>
                            <p><strong>หมวดหมู่:</strong> แจ้งขายขยะ</p>
                            <p><strong>ข้อความ:</strong> การรับซื้อขยะไม่สำเร็จ</p>
                            <hr class="my-2">
                            <p><strong>ระบบ:</strong></p>
                            <p>เจ้าหน้าที่เข้ารับซื้อขยะตามคำขอของคุณไม่สำเร็จเนื่องจาก ${reason || 'ไม่ระบุเหตุผล'} ขอบคุณที่ร่วมกิจกรรมคัดแยกขยะกับเรา</p>
                        </div>
                    `;
                    await Notification.create({
                        userId: request.family._id, // เจ้าของคำร้อง
                        type: 'waste-request',
                        title: `การรับซื้อขยะไม่สำเร็จ`,
                        content: contentList,
                        isRead: false,
                        category: 'waste-request'
                    });
                }
            } else if (status === 'in-progress') {
                await wasteSaleRequest.findByIdAndUpdate(point.requestId, { status: 'in-progress' });
            }
        }

        res.json({ 
            success: true, 
            message: 'อัปเดตสถานะเรียบร้อย',
            isAllComplete: route.isAllComplete
        });

    } catch (error) {
        console.error('Error updating point status:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
};

// จบงานทุกจุดในเส้นทาง (complete all)
const RoutePointsCompleteAll = async (req, res) => {
    try {
        const { routeId } = req.params;

        const route = await Route.findById(routeId);
        if (!route) {
            return res.status(404).json({ success: false, message: 'ไม่พบเส้นทาง' });
        }

        const requestIds = [];

        // ข้ามจุดแรก (จุดเริ่มต้น/depot) — เริ่มจาก index 1
        route.points.forEach((point, index) => {
            if (index === 0) return; // ข้ามจุดเริ่มต้น
            if (point.status === 'in-progress') {
                point.status = 'complete';
                if (point.requestId) {
                    requestIds.push(point.requestId);
                }
            }
        });

        // ตรวจสอบว่าจุดที่ไม่ใช่ depot เสร็จหมดแล้ว
        const allNonDepotDone = route.points.slice(1).every(p => p.status === 'complete' || p.status === 'failed');
        route.isAllComplete = allNonDepotDone;
        if (allNonDepotDone) route.status = 'archived';
        await route.save();

        if (requestIds.length > 0) {
            await wasteSaleRequest.updateMany(
                { _id: { $in: requestIds } },
                { $set: { status: 'resolved' } }
            );

            const logs = requestIds.map(id => ({
                wasteSaleRequest: id,
                status: 'COMPLETED',
                approveText: `รับซื้อสำเร็จ (เส้นทาง: ${route.routeName})`,
                actionBy: 'EMPLOYEE'
            }));
            await wasteSaleRequestLog.insertMany(logs);
            
            // Loop for notifications
            for (const id of requestIds) {
                const req = await wasteSaleRequest.findById(id).populate('family');
                if (req && req.family) {
                    const contentList = `
                        <div>
                            <p><strong>หมวดหมู่:</strong> แจ้งขายขยะ</p>
                            <p><strong>ข้อความ:</strong> การรับซื้อขยะสำเร็จ</p>
                            <hr class="my-2">
                            <p><strong>ระบบ:</strong></p>
                            <p>เจ้าหน้าที่รับซื้อขยะตามคำขอของคุณเรียบร้อยแล้วรวมกับจุดอื่นๆ ในเส้นทาง ขอบคุณที่ร่วมกิจกรรมคัดแยกขยะกับเรา</p>
                        </div>
                    `;
                    await Notification.create({
                        userId: req.family._id,
                        type: 'waste-request',
                        title: `การรับซื้อขยะเสร็จสมบูรณ์`,
                        content: contentList,
                        isRead: false,
                    });
                }
            }
        }

        res.json({ 
            success: true, 
            message: `อัปเดตสำเร็จทุกจุด (${requestIds.length} คำขอ)`
        });

    } catch (error) {
        console.error('Error completing all points:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};


// จุดรับซื้อขยะ
const wastePointIndex = async (req, res) => {
    const wastePoints = await WastePoint.find({ isDeleted: false });

    res.render('employee/wastePoint', {
        mytitle: 'พนักงาน | แผนที่จุดเข้ารับซื้อ',
        currentPage: 'wastePoint',
        wastePoints
    });
};

const wastePointToggle = async (req, res) => {
    const { id } = req.params;
    const { isOpen } = req.query;
    try {
        await WastePoint.findByIdAndUpdate(id, { isOpen: isOpen === "true" });
        res.redirect("/employee/wastePoint?message=อัปเดตสถานะสำเร็จ");
    } catch (err) {
        res.redirect("/employee/wastePoint?error=ไม่สามารถอัปเดตสถานะได้");
    }
};
const wastePointEdit = async (req, res) => {
    const { id } = req.params;
    try {
        // ดึงข้อมูลจุดรับซื้อขยะที่ต้องการแก้ไข
        const wastePoint = await WastePoint.findById(id);
        
        if (!wastePoint) {
            return res.redirect("/employee/wastePoint?error=ไม่พบข้อมูลจุดรับซื้อขยะ");
        }

        // ดึงข้อมูลประเภทขยะทั้งหมด
        const wasteTypes = await myWasteType.find({isDeleted: false })

        res.render("employee/wastePointEdit", {
            mytitle: "แก้ไขจุดรับซื้อขยะ",
            username: req.session.username || "Admin",
            currentPage: 'wastePoint',
            wastePoint: wastePoint,
            wasteTypes
        });
    } catch (err) {
        console.error("Error fetching waste point:", err);
        res.redirect("/employee/wastePoint?error=เกิดข้อผิดพลาดในการโหลดข้อมูล");
    }
};

const wastePointUpdate = async (req, res) => {
    const { id } = req.params;
    try {
        const {
            wastePointName,
            responsible,
            location,
            phone,
            type,
            wasteTypes,
            openTime,
            closeTime,
            isOpen,
            note,
            latitude,
            longitude,
            updateBy
        } = req.body;

        // ตรวจสอบข้อมูลที่จำเป็น
        if (!wastePointName || !responsible || !phone || !type || !latitude || !longitude || !location ) {
            return res.redirect(`/employee/wastePoint/edit/${id}?error=กรุณากรอกข้อมูลให้ครบถ้วน`);
        }

        // ตรวจสอบว่ามีการเลือกประเภทขยะหรือไม่
        if (!wasteTypes || (Array.isArray(wasteTypes) && wasteTypes.length === 0)) {
            return res.redirect(`/employee/wastePoint/edit/${id}?error=กรุณาเลือกประเภทขยะอย่างน้อย 1 ประเภท`);
        }

        // แปลงค่า wasteTypes เป็น array ถ้าเป็น string
        const wasteTypesArray = Array.isArray(wasteTypes) ? wasteTypes : [wasteTypes];

        // ค้นหาและอัปเดตข้อมูล
        const updatedWastePoint = await WastePoint.findByIdAndUpdate(
            id,
            {
                wastePointName,
                responsible,
                phone,
                type,
                location,
                wasteTypes: wasteTypesArray,
                openTime: openTime || null,
                closeTime: closeTime || null,
                isOpen: isOpen === 'true',
                note: note || '',
                latitude: parseFloat(latitude),
                longitude: parseFloat(longitude),
                updateBy,
                updateAt: new Date()
            },
            { new: true, runValidators: true }
        );

        if (!updatedWastePoint) {
            return res.redirect("/employee/wastePoint?error=ไม่พบข้อมูลจุดรับซื้อขยะ");
        }

        res.redirect("/employee/wastePoint?message=อัปเดตข้อมูลสำเร็จ");
    } catch (err) {
        console.error("Error updating waste point:", err);
        
        // ตรวจสอบ error จาก validation
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map(e => e.message).join(', ');
            return res.redirect(`/employee/wastePointEdit/${id}?error=${encodeURIComponent(messages)}`);
        }
        
        res.redirect(`/employee/wastePointEdit/${id}?error=ไม่สามารถอัปเดตข้อมูลได้`);
    }
};

const wastePointCreate = async (req, res) => {
    const wasteTypes = await myWasteType.find({isDeleted: false })
    res.render('employee/wastePointCreate', {
        mytitle: 'พนักงาน | แผนที่จุดเข้ารับซื้อ',
        currentPage: 'wastePoint',
        wasteTypes
    });
};

const wastePointPost = async (req, res) => {
    try {
        const {
            addBy,
            wastePointName,
            responsible,
            location,
            phone,
            type,
            wasteTypes,
            openTime,
            closeTime,
            note,
            latitude,
            longitude,
            isOpen
        } = req.body;

        const newPoint = new WastePoint({
            addBy,
            wastePointName,
            responsible,
            location,
            phone,
            type,
            wasteTypes: Array.isArray(wasteTypes) ? wasteTypes : [wasteTypes],
            openTime,
            closeTime,
            note,
            latitude: parseFloat(latitude) || null,
            longitude: parseFloat(longitude) || null,
            isOpen: isOpen === "true"
        });

        await newPoint.save();
        res.redirect('/employee/wastePoint?message=เพิ่มจุดรับซื้อสำเร็จ');
    } catch (err) {
        console.error("❌ Error saving waste point:", err);
        res.redirect('/employee/wastePoint?error=เกิดข้อผิดพลาดในการบันทึก');
    }
};

const wastePointDelete = async (req, res) => {
    const { id } = req.params;
    try {
        // ใช้ Soft Delete แทนการลบจริง
        const wastePoint = await WastePoint.findById(id);
        
        if (!wastePoint || wastePoint.isDeleted) {
            return res.redirect("/employee/wastePoint?error=ไม่พบข้อมูลจุดรับซื้อขยะ");
        }

        // ทำ Soft Delete
        wastePoint.isDeleted = true;
        await wastePoint.save();

        res.redirect("/employee/wastePoint?message=ลบข้อมูลสำเร็จ");
    } catch (err) {
        console.error("Error deleting waste point:", err);
        res.redirect("/employee/wastePoint?error=ไม่สามารถลบข้อมูลได้");
    }
};


//หน้ารอบการรับซื้อขยะ 
const roundIndex = (req, res) => {
    const page = parseInt(req.query.page) || 1; // รับค่า page จาก query parameter หรือใช้ 1 เป็นค่าเริ่มต้น
    const limit = 10; // จำนวน records ต่อหน้า
    const skip = (page - 1) * limit; // คำนวณจำนวน records ที่จะข้ามไป
    const filter = { isDeleted: false };

    const formatDate = (date) => {
        if (!date) return '';
        const options = { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Bangkok' };
        return new Date(date).toLocaleDateString('th-TH', options); 
    };

    Promise.all([
        Village.find(filter).sort({ createdAt: 1 }),
        Round.find(filter).populate('village').sort({ date: -1 }).skip(skip).limit(limit),
        Round.countDocuments(filter)
    ])
    .then(([villageResult, roundResult, totalItems]) => {
        const totalPages = Math.ceil(totalItems / limit);

        // แปลงวันที่ก่อนส่งไปยัง EJS
        roundResult = roundResult.map(round => ({
            ...round.toObject(), 
            formattedDateYYMMDD: new Date(round.date).toISOString().split('T')[0], // YY-MM-DD
            formattedDateThai: formatDate(round.date) // วันที่ภาษาไทย
        }));

        res.render('employee/round', {
            mytitle: 'พนักงาน | รอบการรับซื้อ',
            village: villageResult,
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
        const { roundName, village, date, startTime, endTime } = req.body;

        const newRound = new Round({
            roundName,
            village,
            date,
            startTime,
            endTime
        });
        await newRound.save();

        // ดึงข้อมูลหมู่บ้านจริง (เพื่อแสดงชื่อใน notification)
        const villageData = await Village.findById(village);
        const villageName = villageData ? villageData.villageName : "ทุกหมู่บ้าน";

        // ดึง "ทุกครอบครัว" จากฐานข้อมูล (ไม่กรองตามหมู่บ้าน)
        const allFamilies = await Family.find({ isDeleted: false });
        if (allFamilies.length > 0) {
            // สร้าง notifications สำหรับทุกครอบครัว
            const notifications = allFamilies.map(family => ({
                userId: family._id,
                type: 'round',
                title: `📢 แจ้งรอบรับซื้อขยะใหม่: ${roundName}`,
                content: `
                    <ul>
                        <li><strong>หมู่บ้าน:</strong> ${villageName}</li>
                        <li><strong>วันที่:</strong> ${new Date(date).toLocaleDateString('th-TH', { year:'numeric', month:'long', day:'numeric' })}</li>
                        <li><strong>เวลา:</strong> ${startTime} - ${endTime}</li>
                    </ul>
                `
            }));

            await Notification.insertMany(notifications);
            console.log(`✅ ส่งแจ้งเตือนให้ทุกครอบครัวทั้งหมด ${allFamilies.length} ครอบครัว`);
        }

        res.redirect('/employee/round?message=เพิ่มรอบการรับซื้อสำเร็จ');
    } catch (error) {
        console.error('Error creating round:', error);
        res.status(500).send('เกิดข้อผิดพลาดในการบันทึกรอบรับซื้อขยะ');
    }
};

// แก้ไขรอบรับซื้อขยะ
const roundEdit = async (req, res) => {
    try {
        const { _id, roundName, village, date, startTime, endTime } = req.body;

        if (!_id || !roundName || !village || !date || !startTime || !endTime) {
            return res.redirect('/admin/round?error=กรอกข้อมูลให้ครบ');
        }

        // อัปเดตรอบ
        await Round.findByIdAndUpdate(_id, {
            roundName,
            village,
            date,
            startTime,
            endTime
        });

        // ดึงข้อมูลหมู่บ้านจริง
        const villageData = await Village.findById(village);
        if (!villageData) throw new Error("ไม่พบข้อมูลหมู่บ้าน");

        // ดึงครอบครัวทั้งหมดในหมู่บ้านนั้น
        const families = await Family.find({ village }).populate('village');

        if (families.length > 0) {
            const notifications = families.map(family => ({
                userId: family._id,
                type: 'round',
                title: `🛠️ มีการแก้ไขรอบรับซื้อขยะ: ${roundName}`,
                content: `
                    <ul>
                        <li><strong>หมู่บ้าน:</strong> ${villageData.villageName}</li>
                        <li><strong>วันที่:</strong> ${new Date(date).toLocaleDateString('th-TH', { year:'numeric', month:'long', day:'numeric' })}</li>
                        <li><strong>เวลาใหม่:</strong> ${startTime} - ${endTime}</li>
                    </ul>
                `
            }));

            await Notification.insertMany(notifications);
            console.log(`✅ แจ้งเตือนครอบครัวในหมู่บ้าน ${villageData.villageName} จำนวน ${families.length} ครอบครัว`);
        }

        res.redirect('/employee/round?message=แก้ไขรอบการรับซื้อสำเร็จ');
    } catch (error) {
        console.error('Error updating round:', error);
        res.redirect('/employee/round?error=เกิดข้อผิดพลาดในการแก้ไขรอบรับซื้อขยะ');
    }
};
// ลบรอบรับซื้อขยะ (softDelete)
const roundDelete = (req, res) => {
    const { id } = req.params;

    Round.findByIdAndUpdate(id , { isDeleted : true })
        .then(() => res.redirect('/employee/round?message=ลบรอบการรับซื้อสำเร็จ'))
        .catch((err) => {
            console.log(err);
            res.status(500).send('Error deleting round data');
        });
};

// ==================== สำหรับหน้าทดสอบการตั้งสถานะ (Mobile) ====================
const testRequestsIndex = async (req, res) => {
    try {
        const requests = await wasteSaleRequest.find()
            .populate('family')
            .sort({ createdAt: -1 });

        res.render('employee/testRequests', {
            mytitle: 'ทดสอบสถานะคำขอ (Mobile)',
            currentPage: 'testRequests',
            requests
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error loading test page');
    }
};

const testRequestsUpdate = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, approvePickupDate, isDeleted } = req.body;
        
        const updateData = {};
        if (status) updateData.status = status;
        if (approvePickupDate !== undefined) {
            updateData.approvePickupDate = approvePickupDate ? new Date(`${approvePickupDate}T00:00:00.000Z`) : null;
        }
        if (isDeleted !== undefined) {
            updateData.isDeleted = isDeleted === 'true' || isDeleted === true;
        }

        await wasteSaleRequest.findByIdAndUpdate(id, updateData);
        res.json({ success: true, message: 'อัปเดตสถานะสำเร็จ' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
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
    memberIndex,memberRegister,getMemberForEdit,memberUpdate,memberDelete,changeRepresentative,getRepresentatives, //markMemberDeceased,
    //หน้าคำร้องหรือหรือข้อร้องเรียน
    complaintIndex,updateComplaintStatus,complaintReply,complaintReplyMessage,updateMessageReply,deleteMessageReply,
    //หน้าตรวจสอบความประสงค์ขายขยะ
    wasteSaleRequestIndex,updateWasteSaleRequestStatus,wasteSaleRequestReplyIndex,wasteSaleRequestReject,wasteSaleRequestApprovePost,getPendingWasteSaleRequests,
    //หน้าสต๊อกขยะ
    wasteStockIndex,
    //หน้าเบิกถอน
    withDrawIndex,getAccountByNumber,showWithdrawPage,updateMinimumWithdraw,getCurrentSettings,searchAccounts,
    //หน้าฌาปนกิจสงเคราะห์
    funeralAidIndex,getFamilyMembers,searchHouseholds,checkEligibility,calculateFuneralAmount,getDeductionPreview,submitFuneralAssistance,
    //หน้าประวัติฌาปนกิจ
    getFuneralHistory,getFuneralDetail,getFuneralHistoryPage,updateFuneralAssistance,
    //หน้าคำขอฌาปนกิจ
    pendingFuneralRequestsPage,getPendingFuneralRequests,getRequestDetail,approveRequest,rejectRequest,
    //หน้าแผนที่เข้ารับซื้อ
    mapIndex,saveRoute,getAllRoutes,getRouteDetail,deleteRoute,updateRoute,updateRoutePoints,RoutePointsComplete,RoutePointsCompleteAll,routeCalendarIndex,
    //หน้าจัดการจุดรับซื้อ
    wastePointIndex,wastePointPost,wastePointCreate,wastePointToggle,wastePointEdit,wastePointUpdate,wastePointDelete,
    //หน้าจัดการรอบการรับซื้อ
    roundIndex,roundPost,roundEdit,roundDelete,
    //หน้าจำลองเปลี่ยนสถานะ
    testRequestsIndex,testRequestsUpdate
}