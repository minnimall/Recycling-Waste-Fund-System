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
const Notification = require("../models/notification");
const path = require('path');
const bcrypt = require('bcryptjs');
const moment = require('moment');
const mongoose = require('mongoose');
const myAdmin = require('../models/admin');
const RouteAnalysis = require('../models/map');

router.use(express.static(path.join(__dirname, '../public')));

router.use(bodyParser.json({ limit: '10mb' }));
router.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

const dashboardIndex = async (req, res) => {
    try {
        const { village, startDate, endDate, dateRange = 'all', selectedDate } = req.query;

        // ==================== Helper Functions ====================
        
        // คำนวณช่วงวันที่
        const getDateRange = (dateRange, startDate, endDate, selectedDate) => {
            const now = new Date();
            
            if (selectedDate) {
                const start = new Date(selectedDate);
                start.setHours(0, 0, 0, 0);
                const end = new Date(selectedDate);
                end.setHours(23, 59, 59, 999);
                return { start, end };
            }
            
            if (startDate && endDate) {
                const start = new Date(startDate);
                start.setHours(0, 0, 0, 0);
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                return { start, end };
            }
            
            const ranges = {
                today: () => {
                    const start = new Date(now);
                    start.setHours(0, 0, 0, 0);
                    const end = new Date(now);
                    end.setHours(23, 59, 59, 999);
                    return { start, end };
                },
                yesterday: () => {
                    const start = new Date(now);
                    start.setDate(start.getDate() - 1);
                    start.setHours(0, 0, 0, 0);
                    const end = new Date(now);
                    end.setDate(end.getDate() - 1);
                    end.setHours(23, 59, 59, 999);
                    return { start, end };
                },
                thisMonth: () => ({
                    start: new Date(now.getFullYear(), now.getMonth(), 1),
                    end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
                }),
                lastMonth: () => ({
                    start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
                    end: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
                })
            };
            
            if (dateRange?.startsWith('month-')) {
                const monthsBack = parseInt(dateRange.replace('month-', ''));
                return {
                    start: new Date(now.getFullYear(), now.getMonth() - monthsBack, 1),
                    end: new Date(now.getFullYear(), now.getMonth() - monthsBack + 1, 0, 23, 59, 59, 999)
                };
            }
            
            return ranges[dateRange]?.() || { start: null, end: null };
        };

        // สร้าง Base Pipeline
        const getBasePipeline = () => [
            { $match: { isDeleted: false } },
            {
                $lookup: {
                    from: 'wastebankaccounts',
                    localField: 'accountId',
                    foreignField: '_id',
                    as: 'accountInfo'
                }
            },
            { $match: { 'accountInfo.0': { $exists: true } } },
            { $unwind: '$accountInfo' },
            {
                $lookup: {
                    from: 'families',
                    localField: 'accountInfo.familyID',
                    foreignField: '_id',
                    as: 'familyInfo'
                }
            },
            { $match: { 'familyInfo.0': { $exists: true } } },
            { $unwind: '$familyInfo' },
            {
                $lookup: {
                    from: 'wasteitems',
                    localField: 'wasteItems',
                    foreignField: '_id',
                    as: 'wasteItemDetails'
                }
            },
            { $match: { 'wasteItemDetails.0': { $exists: true } } },
            { $unwind: '$wasteItemDetails' }
        ];

        // เพิ่ม Village Filter
        const addVillageFilter = (pipeline, villageId) => {
            if (!villageId) return pipeline;
            return [
                ...pipeline,
                {
                    $lookup: {
                        from: 'villages',
                        localField: 'familyInfo.village',
                        foreignField: '_id',
                        as: 'villageInfo'
                    }
                },
                { $unwind: '$villageInfo' },
                { $match: { 'villageInfo._id': new mongoose.Types.ObjectId(villageId) } }
            ];
        };

        // เพิ่ม Date Filter
        const addDateFilter = (pipeline, start, end) => {
            if (!start && !end) return pipeline;
            const dateMatch = {};
            if (start && end) {
                dateMatch.purchaseDate = { $gte: start, $lte: end };
            } else if (start) {
                dateMatch.purchaseDate = { $gte: start };
            } else if (end) {
                dateMatch.purchaseDate = { $lte: end };
            }
            return [...pipeline, { $match: dateMatch }];
        };

        // สร้าง Complete Pipeline
        const buildPipeline = (start, end, villageId) => {
            let pipeline = getBasePipeline();
            pipeline = addVillageFilter(pipeline, villageId);
            pipeline = addDateFilter(pipeline, start, end);
            return pipeline;
        };

        // Group Stage สำหรับสรุปข้อมูล
        const getSummaryGroupStage = () => ({
            $group: {
                _id: null,
                totalAmount: {
                    $sum: { $multiply: ['$wasteItemDetails.quantity', '$wasteItemDetails.pricePerUnit'] }
                },
                totalQuantity: { $sum: '$wasteItemDetails.quantity' },
                totalTransactions: { $sum: 1 }
            }
        });

        // ==================== คำนวณช่วงวันที่ ====================
        
        const { start: filterStartDate, end: filterEndDate } = getDateRange(
            dateRange, startDate, endDate, selectedDate
        );

        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        
        const yesterdayStart = new Date(todayStart);
        yesterdayStart.setDate(yesterdayStart.getDate() - 1);
        const yesterdayEnd = new Date(todayEnd);
        yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);

        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

        const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);

        // ==================== ดึงข้อมูลทั้งหมดแบบ Parallel ====================
        
        const [
            totalDataResult,
            todayDataResult,
            yesterdayDataResult,
            lastMonthDataResult,
            highestWaste,
            villageDataResult,
            wasteSummaryResult,
            priceTrendsResult,
            allVillages
        ] = await Promise.all([
            // 1. Total Data ตาม filter
            WastePurchase.aggregate([
                ...buildPipeline(filterStartDate, filterEndDate, village),
                getSummaryGroupStage()
            ]),
            
            // 2. Today Data
            WastePurchase.aggregate([
                ...buildPipeline(todayStart, todayEnd, null),
                getSummaryGroupStage()
            ]),
            
            // 3. Yesterday Data
            WastePurchase.aggregate([
                ...buildPipeline(yesterdayStart, yesterdayEnd, null),
                getSummaryGroupStage()
            ]),
            
            // 4. Last Month Data
            WastePurchase.aggregate([
                ...buildPipeline(lastMonthStart, lastMonthEnd, null),
                getSummaryGroupStage()
            ]),
            
            // 5. Highest Value Waste
            myWaste.findOne({ isDeleted: false }).sort({ pricePerUnit: -1 }),
            
            // 6. Village Data
            (async () => {
                let pipeline = buildPipeline(filterStartDate, filterEndDate, village);
                
                const hasVillageInfo = pipeline.some(stage => 
                    stage.$lookup && stage.$lookup.from === 'villages'
                );
                
                if (!hasVillageInfo) {
                    pipeline.push(
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
                
                return await WastePurchase.aggregate([
                    ...pipeline,
                    {
                        $group: {
                            _id: '$villageInfo._id',
                            villageName: { $first: '$villageInfo.villageName' },
                            villageNumber: { $first: '$villageInfo.villageNumber' },
                            totalQuantity: { $sum: '$wasteItemDetails.quantity' },
                            totalAmount: {
                                $sum: { $multiply: ['$wasteItemDetails.quantity', '$wasteItemDetails.pricePerUnit'] }
                            },
                            transactionCount: { $sum: 1 }
                        }
                    },
                    { $sort: { villageNumber: 1 } }
                ]);
            })(),
            
            // 7. Waste Summary (Top 10)
            WastePurchase.aggregate([
                ...buildPipeline(filterStartDate, filterEndDate, village),
                {
                    $group: {
                        _id: '$wasteItemDetails.name',
                        totalQuantity: { $sum: '$wasteItemDetails.quantity' },
                        avgPrice: { $avg: '$wasteItemDetails.pricePerUnit' },
                        totalAmount: {
                            $sum: { $multiply: ['$wasteItemDetails.quantity', '$wasteItemDetails.pricePerUnit'] }
                        }
                    }
                },
                { $sort: { totalAmount: -1 } },
                { $limit: 10 }
            ]),
            
            // 8. Price Trends (3 months)
            WastePurchase.aggregate([
                ...buildPipeline(threeMonthsAgo, now, null),
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
            ]),
            
            // 9. All Villages
            Village.find({ isDeleted: { $ne: true } })
                .select('villageName villageNumber')
                .sort({ villageNumber: 1 })
        ]);

        // ==================== ประมวลผลข้อมูล ====================
        
        const totalData = totalDataResult[0] || { totalAmount: 0, totalQuantity: 0, totalTransactions: 0 };
        const todayData = todayDataResult[0] || { totalAmount: 0, totalTransactions: 0 };
        const yesterdayData = yesterdayDataResult[0] || { totalAmount: 0, totalTransactions: 0 };
        const lastMonthData = lastMonthDataResult[0] || { totalAmount: 0, totalQuantity: 0 };

        // คำนวณเปอร์เซ็นต์การเปลี่ยนแปลง
        const calculatePercentChange = (current, previous) => {
            return previous > 0 ? ((current - previous) / previous) * 100 : 0;
        };

        const todayPercentChange = calculatePercentChange(
            todayData.totalAmount, 
            yesterdayData.totalAmount
        );
        
        const transactionPercentChange = calculatePercentChange(
            todayData.totalTransactions, 
            yesterdayData.totalTransactions
        );

        // สร้าง Filter Info
        const filterInfo = {
            dateRange,
            startDate: filterStartDate ? filterStartDate.toISOString().split('T')[0] : '',
            endDate: filterEndDate ? filterEndDate.toISOString().split('T')[0] : '',
            selectedDate: selectedDate || '',
            village: village || '',
            villageName: ''
        };

        if (village && allVillages) {
            const selectedVillage = allVillages.find(v => v._id.toString() === village);
            if (selectedVillage) {
                filterInfo.villageName = selectedVillage.villageName || 
                                          `หมู่บ้านที่ ${selectedVillage.villageNumber}`;
            }
        }

        // ==================== Render ====================
        
        res.render('employee/dashboard', {
            mytitle: 'พนักงาน | แดชบอร์ด',
            
            // สถิติหลัก
            totalQuantity: totalData.totalQuantity,
            totalAmount: totalData.totalAmount,
            totalTransactions: totalData.totalTransactions,
            
            // เปรียบเทียบ
            todayTotal: todayData.totalAmount,
            todayPercentChange,
            transactionToday: todayData.totalTransactions,
            transactionYesterday: yesterdayData.totalTransactions,
            transactionPercentChange,
            lastMonthTotal: lastMonthData.totalAmount,
            lastMonthQuantity: lastMonthData.totalQuantity,
            
            // ข้อมูลอื่นๆ
            highestWaste,
            villageData: villageDataResult || [],
            wasteSummary: wasteSummaryResult || [],
            priceTrends: priceTrendsResult || [],
            allVillages: allVillages || [],
            filterInfo,
            currentFilters: req.query,
            currentPage: 'dashboard'
        });

    } catch (err) {
        console.error('Error in dashboardIndex:', err);
        console.error('Stack trace:', err.stack);
        
        // Default data สำหรับกรณี error
        const defaultData = {
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
            currentPage: 'dashboard',
            errorMessage: 'เกิดข้อผิดพลาดในการโหลดข้อมูล กรุณาลองใหม่อีกครั้ง'
        };
        
        if (process.env.NODE_ENV === 'development') {
            defaultData.error = {
                message: err.message,
                stack: err.stack
            };
        }
        
        res.status(500).render('employee/dashboard', defaultData);
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

        // ดึง familyID จาก WasteBankAccount
        const wasteBankAccount = await WasteBankAccount.findById(accountId);
        if (!wasteBankAccount) {
            console.error(`Bank account with ID ${accountId} not found`);
            res.redirect('/employee/wastePurchase?error=Bank account not found');
            return;
        }

        // ดึงข้อมูล WasteItem ทั้งหมดสำหรับ Notification
        const items = await WasteItem.find({ _id: { $in: wasteItemIds } });

        // คำนวณจำนวนรวม
        const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
        const itemCount = items.length;
        const formattedAmount = totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 });

        // สร้าง content รายการขยะ
        const contentList = `
            <div>
                <p><strong>ยอดขายรวม:</strong> 💰${formattedAmount} บาท</p><br>
                <h3><strong>รายการทั้งหมด</strong> ${itemCount} รายการ</h3>
                <ul class="list-decimal ml-5">
                    ${items.map(item => `<li>${item.name} : ${item.quantity} กิโลกรัม</li>`).join('')}
                </ul>
            </div>
        `;
        // สร้าง Notification
        const NotificationPurchase = new Notification({
            userId: wasteBankAccount.familyID, // ใช้ familyID
            type: "purchase",
            title: `คุณได้ขายขยะจำนวนรวม ${totalQuantity} กิโลกรัม`,
            content: contentList
        });
        await NotificationPurchase.save();

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
        const searchMonth = req.query.searchMonth;
        const villageId = req.query.villageId;
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
        if (village) searchQuery.village = village;
        if (Type) searchQuery.Type = Type;

        // ดึงข้อมูล
        const villages = await Village.find(); 
        const allFamilies = await Family.find(searchQuery).populate('village').lean();

        // ดึงข้อมูลบัญชีทั้งหมด แล้วทำ mapping ตาม familyID
        const accounts = await WasteBankAccount.find({ isDeleted: false }).lean();


        // แผนที่ Type -> ภาษาไทย
        const typeMap = {
            household: 'บ้าน',
            school: 'โรงเรียน',
            municipality: 'องค์กรปกครองส่วนท้องถิ่น',
            community: 'ชุมชน',
            temple: 'วัด'
        };

        // สร้าง Map เพื่อเชื่อมโยง familyID กับ AccountName
        const accountMap = {};
        accounts.forEach(acc => {
            if (acc.familyID) accountMap[acc.familyID.toString()] = acc;
        });

        // เพิ่ม field ให้ทุกครัวเรือน
        allFamilies.forEach(family => {
            const account = accountMap[family._id.toString()];
            family.AccountNumber = account ? account.AccountNumber : '-';
            family.AccountName = family.username || '-';
            family.Balance = account ? account.Balance : 0;
            family.typeThai = typeMap[family.Type] || family.Type;
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


// หน้าเบิกถอน - ปรับปรุงฟังก์ชันถอนเงิน
const withDrawIndex = async (req, res) => {
    try {
        const { accountId, withdrawAmount } = req.body;

        // ตรวจสอบข้อมูล input
        if (!accountId || !withdrawAmount) {
            console.error('ข้อมูลไม่ครบถ้วน:', { accountId, withdrawAmount });
            return res.redirect('/employee/withdraw?error=' + encodeURIComponent('กรุณากรอกข้อมูลให้ครบถ้วน'));
        }

        // ค้นหาบัญชี
        const account = await WasteBankAccount.findOne({ 
            AccountNumber: accountId, 
            isDeleted: false 
        });

        if (!account) {
            console.error('ไม่พบบัญชี:', accountId);
            return res.redirect('/employee/withdraw?error=' + encodeURIComponent('ไม่พบบัญชีที่ระบุ'));
        }

        // ตรวจสอบจำนวนเงิน
        const amount = parseFloat(withdrawAmount);
        if (amount <= 0 || isNaN(amount)) {
            console.error('จำนวนเงินไม่ถูกต้อง:', withdrawAmount);
            return res.redirect('/employee/withdraw?error=' + encodeURIComponent('จำนวนเงินไม่ถูกต้อง'));
        }

        if (account.Balance < amount) {
            console.error('ยอดเงินไม่พอ:', { balance: account.Balance, withdraw: amount });
            return res.redirect('/employee/withdraw?error=' + encodeURIComponent('ยอดเงินในบัญชีไม่เพียงพอ'));
        }

        // ค้นหาครอบครัว
        const family = await Family.findById(account.familyID);
        if (!family) {
            console.error('ไม่พบข้อมูลครอบครัว:', account.familyID);
            return res.redirect('/employee/withdraw?error=' + encodeURIComponent('ไม่พบข้อมูลครอบครัว'));
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
            
            return res.redirect('/employee/withdraw?message=' + encodeURIComponent('ถอนเงินสำเร็จแล้ว'));
        } catch (txError) {
            await session.abortTransaction();
            throw txError;
        } finally {
            session.endSession();
        }

    } catch (error) {
        console.error('เกิดข้อผิดพลาดในการถอนเงิน:', error);
        return res.redirect('/employee/withdraw?error=' + encodeURIComponent('เกิดข้อผิดพลาดในการถอนเงิน: ' + error.message));
    }
};

// แสดงหน้าถอนเงิน พร้อมประวัติการถอน
const showWithdrawPage = async (req, res) => {
    try {
        const transactions = await Transaction.find({ 
            transactionType: 'withdraw', 
            isDeleted: false 
        })
        .sort({ transactionDate: -1 })
        .limit(10)
        .populate('account')
        .populate('family')
        .lean(); // เพิ่ม .lean() เพื่อประสิทธิภาพ

        res.render('employee/withdraw', {
            mytitle: 'พนักงาน | เบิกถอนเงิน',
            transactions: transactions || [],
            message: req.query.message || null,
            error: req.query.error || null,
            currentPage: 'withDraw',
        });
    } catch (err) {
        console.error('เกิดข้อผิดพลาดในการโหลดหน้าถอนเงิน:', err);
        res.render('employee/withdraw', {
            mytitle: 'เบิกถอนเงิน',
            transactions: [],
            error: 'เกิดข้อผิดพลาดในการโหลดข้อมูล',
            message: null,
            currentPage: 'withDraw'
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

        console.log('พบบัญชี:', account.AccountNumber);

        res.json({
            success: true,
            accountName: account.AccountName,
            accountNumber: account.AccountNumber,
            balance: account.Balance,
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


//หน้าฌาปนกิจสงเคราะห์
const funeralAidIndex = (req, res)=> {
    res.render('employee/funeralAid',{mytitle: 'พนักงาน | ฌาปนกิจสงเคราะห์',currentPage: 'funeralAid',})
}

//หน้าแผนที่
const mapIndex = (req, res)=> {
    res.render('employee/map',{mytitle: 'พนักงาน | แผนที่จุดเข้ารับซื้อ',currentPage: 'map',})
}
// บันทึกเส้นทางที่วิเคราะห์
const saveRouteAnalysis = async (req, res) => {
    try {
        const {
            routeName,
            description,
            points,
            analysis,
            routeGeometry,
            tags,
            notes
        } = req.body;

        // Validate ข้อมูล
        if (!routeName || !routeName.trim()) {
            return res.status(400).json({
                success: false,
                message: 'กรุณาระบุชื่อเส้นทาง'
            });
        }

        if (!points || !Array.isArray(points) || points.length < 2) {
            return res.status(400).json({
                success: false,
                message: 'กรุณาเลือกจุดอย่างน้อย 2 จุด'
            });
        }

        // ตรวจสอบ authentication
        if (!req.user || !req.user._id) {
            return res.status(401).json({
                success: false,
                message: 'กรุณาเข้าสู่ระบบก่อนบันทึกเส้นทาง'
            });
        }

        // Validate analysis data
        if (!analysis || !analysis.totalDistance || !analysis.totalDuration) {
            return res.status(400).json({
                success: false,
                message: 'ข้อมูลการวิเคราะห์ไม่ครบถ้วน'
            });
        }

        // สร้างข้อมูลเส้นทางใหม่
        const newRoute = new RouteAnalysis({
            routeName: routeName.trim(),
            description: description ? description.trim() : '',
            createdBy: req.user._id,
            points: points.map((point, index) => ({
                pointNumber: index + 1,
                latitude: parseFloat(point.lat),
                longitude: parseFloat(point.lng),
                address: point.address || `จุดที่ ${index + 1}`,
                distanceToNext: parseFloat(point.distanceToNext) || 0,
                durationToNext: parseFloat(point.durationToNext) || 0
            })),
            analysis: {
                totalDistance: parseFloat(analysis.totalDistance),
                totalDuration: parseFloat(analysis.totalDuration),
                numberOfPoints: points.length,
                isRoundTrip: analysis.isRoundTrip !== false,
                optimizationMethod: analysis.optimizationMethod || 'TSP-2OPT'
            },
            routeGeometry: routeGeometry && routeGeometry.coordinates && routeGeometry.coordinates.length > 0 
                ? {
                    type: 'LineString',
                    coordinates: routeGeometry.coordinates
                  }
                : null,
            tags: Array.isArray(tags) ? tags.filter(tag => tag && tag.trim()) : [],
            notes: notes ? notes.trim() : '',
            status: 'active'
        });

        await newRoute.save();

        res.status(201).json({
            success: true,
            message: 'บันทึกเส้นทางเรียบร้อยแล้ว',
            data: {
                _id: newRoute._id,
                routeName: newRoute.routeName,
                totalDistance: newRoute.analysis.totalDistance,
                totalDuration: newRoute.analysis.totalDuration,
                numberOfPoints: newRoute.analysis.numberOfPoints,
                createdAt: newRoute.createdAt
            }
        });

    } catch (error) {
        console.error('❌ Error saving route:', error);
        
        // Handle validation errors
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: 'ข้อมูลไม่ถูกต้อง',
                errors: messages
            });
        }

        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการบันทึกเส้นทาง',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

// ดึงเส้นทางทั้งหมดของพนักงาน
const getEmployeeRoutes = async (req, res) => {
    try {
        const { page = 1, limit = 10, status, search } = req.query;

        const query = { createdBy: req.user._id };

        if (status && ['draft', 'active', 'completed', 'archived'].includes(status)) {
            query.status = status;
        }

        if (search && search.trim()) {
            query.$or = [
                { routeName: { $regex: search.trim(), $options: 'i' } },
                { description: { $regex: search.trim(), $options: 'i' } },
                { tags: { $in: [new RegExp(search.trim(), 'i')] } }
            ];
        }

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);

        const routes = await RouteAnalysis.find(query)
            .sort({ createdAt: -1 })
            .limit(limitNum)
            .skip((pageNum - 1) * limitNum)
            .populate('createdBy', 'name email')
            .select('-routeGeometry') // ไม่ส่ง geometry เพื่อลดขนาดข้อมูล
            .lean()
            .exec();

        const count = await RouteAnalysis.countDocuments(query);

        res.json({
            success: true,
            data: routes,
            pagination: {
                total: count,
                totalPages: Math.ceil(count / limitNum),
                currentPage: pageNum,
                limit: limitNum
            }
        });

    } catch (error) {
        console.error('❌ Error fetching routes:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงข้อมูล',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

// ดึงเส้นทางเฉพาะ
const getRouteById = async (req, res) => {
    try {
        const { id } = req.params;

        // Validate ObjectId
        if (!id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({
                success: false,
                message: 'รูปแบบ ID ไม่ถูกต้อง'
            });
        }

        const route = await RouteAnalysis.findById(id)
            .populate('createdBy', 'name email');

        if (!route) {
            return res.status(404).json({
                success: false,
                message: 'ไม่พบเส้นทางที่ระบุ'
            });
        }

        // เพิ่มจำนวนการดู
        await route.incrementView();

        res.json({
            success: true,
            data: route
        });

    } catch (error) {
        console.error('❌ Error fetching route:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงข้อมูล',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

// อัพเดทเส้นทาง
const updateRoute = async (req, res) => {
    try {
        const { id } = req.params;

        // Validate ObjectId
        if (!id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({
                success: false,
                message: 'รูปแบบ ID ไม่ถูกต้อง'
            });
        }

        const route = await RouteAnalysis.findById(id);

        if (!route) {
            return res.status(404).json({
                success: false,
                message: 'ไม่พบเส้นทางที่ระบุ'
            });
        }

        // ตรวจสอบสิทธิ์
        if (route.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'คุณไม่มีสิทธิ์แก้ไขเส้นทางนี้'
            });
        }

        // อัพเดทข้อมูล
        const allowedUpdates = ['routeName', 'description', 'tags', 'notes', 'status'];
        let hasChanges = false;

        allowedUpdates.forEach(field => {
            if (req.body[field] !== undefined) {
                // Validate status
                if (field === 'status' && !['draft', 'active', 'completed', 'archived'].includes(req.body[field])) {
                    return;
                }
                
                route[field] = req.body[field];
                hasChanges = true;
            }
        });

        if (!hasChanges) {
            return res.status(400).json({
                success: false,
                message: 'ไม่มีข้อมูลที่ต้องอัพเดท'
            });
        }

        await route.incrementModified();
        await route.save();

        res.json({
            success: true,
            message: 'อัพเดทเส้นทางเรียบร้อยแล้ว',
            data: route
        });

    } catch (error) {
        console.error('❌ Error updating route:', error);
        
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: 'ข้อมูลไม่ถูกต้อง',
                errors: messages
            });
        }

        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการอัพเดท',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

// ลบเส้นทาง
const deleteRoute = async (req, res) => {
    try {
        const { id } = req.params;

        // Validate ObjectId
        if (!id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({
                success: false,
                message: 'รูปแบบ ID ไม่ถูกต้อง'
            });
        }

        const route = await RouteAnalysis.findById(id);

        if (!route) {
            return res.status(404).json({
                success: false,
                message: 'ไม่พบเส้นทางที่ระบุ'
            });
        }

        // ตรวจสอบสิทธิ์
        if (route.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'คุณไม่มีสิทธิ์ลบเส้นทางนี้'
            });
        }

        await RouteAnalysis.findByIdAndDelete(id);

        res.json({
            success: true,
            message: 'ลบเส้นทางเรียบร้อยแล้ว'
        });

    } catch (error) {
        console.error('❌ Error deleting route:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการลบ',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

// Export route (ฟีเจอร์เสริม)
const exportRoute = async (req, res) => {
    try {
        const { id } = req.params;
        const { format = 'json' } = req.query;

        const route = await RouteAnalysis.findById(id)
            .populate('createdBy', 'name email');

        if (!route) {
            return res.status(404).json({
                success: false,
                message: 'ไม่พบเส้นทางที่ระบุ'
            });
        }

        if (format === 'json') {
            res.json({
                success: true,
                data: route
            });
        } else {
            res.status(400).json({
                success: false,
                message: 'รองรับเฉพาะ format: json เท่านั้นในขณะนี้'
            });
        }

    } catch (error) {
        console.error('❌ Error exporting route:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการส่งออกข้อมูล',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

// Capture map snapshot (optional - ใช้เมื่อมี puppeteer)
const captureMapSnapshot = async (req, res) => {
    res.status(501).json({
        success: false,
        message: 'ฟีเจอร์นี้กำลังพัฒนา (ต้องการ Puppeteer)'
    });
};

// จุดรับซื้อขยะ
const wastePointIndex = (req, res) => {
    res.render('employee/wastePoint', {
        mytitle: 'พนักงาน | แผนที่จุดเข้ารับซื้อ',
        currentPage: 'wastePoint',
    });
};

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
            latitude: latitude.toString(),
            longitude: longitude.toString(),
            tel: Number(tel),
            date: new Date(date),
            startTime,
            endTime,
            status,
            addBy
        });

        await newPoint.save();
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
    mapIndex,saveRouteAnalysis,getEmployeeRoutes,getRouteById,updateRoute,deleteRoute,captureMapSnapshot,exportRoute,
    //หน้าจัดการจุดรับซื้อ
    wastePointIndex,wastePointPost
}