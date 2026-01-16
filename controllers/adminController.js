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

const dashboardIndex = async (req, res) => {
    try {
        const { village, searchDate, searchMonth, searchYear } = req.query;

        // ==================== Helper Functions ====================
        
        // คำนวณช่วงวันที่ (ปรับใหม่)
        const getDateRange = (searchDate, searchMonth, searchYear) => {
            const now = new Date();
            
            // 1. ถ้าเลือกวันที่เฉพาะ
            if (searchDate) {
                const start = new Date(searchDate);
                start.setHours(0, 0, 0, 0);
                const end = new Date(searchDate);
                end.setHours(23, 59, 59, 999);
                return { start, end };
            }
            
            // 2. ถ้าเลือกเดือนและ/หรือปี
            if (searchMonth || searchYear) {
                const year = searchYear ? parseInt(searchYear) : now.getFullYear();
                
                if (searchMonth) {
                    // เลือกทั้งเดือนและปี
                    const month = parseInt(searchMonth) - 1;
                    const start = new Date(year, month, 1);
                    const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
                    return { start, end };
                } else {
                    // เลือกเฉพาะปี
                    const start = new Date(year, 0, 1);
                    const end = new Date(year, 11, 31, 23, 59, 59, 999);
                    return { start, end };
                }
            }
            
            // 3. ไม่เลือกอะไร = แสดงทั้งหมด
            return { start: null, end: null };
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
            {
                $addFields: {
                    accountInfo: {
                        $ifNull: [
                            { $arrayElemAt: ['$accountInfo', 0] },
                            {
                                _id: '$accountId',
                                accountNumber: 'DELETED',
                                familyID: null,
                                isDeleted: true
                            }
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
                            {
                                _id: '$accountInfo.familyID',
                                familyNumber: 'DELETED',
                                village: null,
                                isDeleted: true
                            }
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

        // ใหม่ - นับถูก
        const getSummaryGroupStage = () => [
            {
                $group: {
                    _id: '$_id',
                    totalAmount: {
                        $sum: { $multiply: ['$wasteItemDetails.quantity', '$wasteItemDetails.pricePerUnit'] }
                    },
                    totalQuantity: { $sum: '$wasteItemDetails.quantity' }
                }
            },
            {
                $group: {
                    _id: null,
                    totalAmount: { $sum: '$totalAmount' },
                    totalQuantity: { $sum: '$totalQuantity' },
                    totalTransactions: { $sum: 1 }
                }
            }
        ];

        // ==================== คำนวณช่วงวันที่ ====================
        
        const { start: filterStartDate, end: filterEndDate } = getDateRange(
            searchDate, searchMonth, searchYear
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
                ...getSummaryGroupStage()
            ]),
            
            // 2. Today Data
            WastePurchase.aggregate([
                ...buildPipeline(todayStart, todayEnd, null),
                ...getSummaryGroupStage()
            ]),
            
            // 3. Yesterday Data
            WastePurchase.aggregate([
                ...buildPipeline(yesterdayStart, yesterdayEnd, null),
                ...getSummaryGroupStage()
            ]),
            
            // 4. Last Month Data
            WastePurchase.aggregate([
                ...buildPipeline(lastMonthStart, lastMonthEnd, null),
                ...getSummaryGroupStage()
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

        // สร้าง Filter Info (ปรับใหม่)
        const filterInfo = {
            searchDate: searchDate || '',
            searchMonth: searchMonth || '',
            searchYear: searchYear || '',
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
        
        res.render('admin/dashboard', {
            mytitle: 'ผู้ดูแลระบบ | แดชบอร์ด',
            
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
            
            // Filter values
            searchDate: searchDate || '',
            searchMonth: searchMonth || '',
            searchYear: searchYear || '',
            villageId: village || '',
            
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
                searchDate: '',
                searchMonth: '',
                searchYear: '',
                village: '',
                villageName: ''
            },
            searchDate: '',
            searchMonth: '',
            searchYear: '',
            villageId: '',
            currentPage: 'dashboard',
            errorMessage: 'เกิดข้อผิดพลาดในการโหลดข้อมูล กรุณาลองใหม่อีกครั้ง'
        };
        
        if (process.env.NODE_ENV === 'development') {
            defaultData.error = {
                message: err.message,
                stack: err.stack
            };
        }
        
        res.status(500).render('admin/dashboard', defaultData);
    }
};

// สื่อ
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
            return res.status(400).redirect('/admin?error=URL ไม่ถูกต้อง');
        }

        const existingMedia = await myMedia.findOne({ 
            $or: [{ title }, { youtubeUrl }] 
        });

        if (existingMedia) {
            return res.status(400).redirect('/admin?error=มีสื่อนี้อยู่แล้ว');
        }

        const media = new myMedia({
            title: title || 'Untitled',
            youtubeUrl
        });

        await media.save();
        console.log('Media saved successfully:', media);
        res.redirect('/admin?message=เพิ่มสื่อความรู้สำเร็จ');
    } catch (err) {
        console.error('Error saving media:', err);
        res.status(500).redirect('/admin?error=เพิ่มสื่อความรู้ไม่สำเร็จ');
    }
};
// ลบสื่อ (softDelete)
const mediaDelete = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await myMedia.findByIdAndUpdate(id,{ isDeleted: true});

        if (!result) {
            return res.status(404).redirect('/admin?message=ไม่พบข้อมูลสื่อความรู้ที่ต้องการลบ');
        }
        res.redirect('/admin?message=ลบสื่อความรู้สำเร็จ');
    } catch (err) {
        console.error('Error deleting media:', err);
        res.status(500).redirect('/admin?message=เกิดข้อผิดพลาดในการลบข้อมูลสื่อความรู้');
    }
};
// แก้ไขสื่อ
const mediaEdit = (req, res) => {
    const { title, youtubeUrl } = req.body;
    const mediaId = req.params.id;

    myMedia.findByIdAndUpdate(mediaId, { title, youtubeUrl })
        .then(result => {
            res.redirect('/admin?message=แก้ไขสื่อความรู้สำเร็จ'); // เปลี่ยนเส้นทางกลับไปยังหน้าแสดงสื่อ
            
        })
        .catch(err => {
            console.log(err);
            res.status(500).redirect('/admin?error=ลบสื่อความรู้ไม่สำเร็จ');
        });
};


// ข่าวสาร
const newsIndex = async (req, res) => {
    try {
        const filter = { isDeleted: false };

        // ดึงข่าวทั้งหมด
        const newsList = await myNews.find(filter);

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


const storageNews = multer.diskStorage({
    destination: './public/uploads/news/PDF/',
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

const uploadNews = multer({
    storage: storageNews,
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: function (req, file, cb) {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed!'), false);
        }
    }
}).single('newsFile');

const newsPost = async (req, res) => {
    uploadNews(req, res, async (err) => {
        if (err) {
            console.error('Error uploading file:', err);
            if (err instanceof multer.MulterError) {
                return res.status(400).send({ error: 'File upload failed', details: err.message });
            } else {
                return res.status(400).send({ error: 'Invalid file type', details: err.message });
            }
        }
        try {
            const { newsTitle, newsDescription, newsAuthor } = req.body;
            const fileNews = req.file
                ? `/uploads/news/PDF/${req.file.filename}`
                : '/img/no_PDF.pdf';

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
        }
    });
};
const uploadNewsEdit = multer({
    storage: storageNews,
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: function (req, file, cb) {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed!'), false);
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

            // หาไฟล์ใหม่ ถ้ามีอัปโหลดมา
            const fileNews = req.file
                ? `/uploads/news/PDF/${req.file.filename}`
                : undefined; // ถ้าไม่ได้อัปโหลดใหม่ จะไม่แก้ไฟล์

            // เตรียม object สำหรับอัปเดต
            const updateData = {
                newsTitle: newsEditTitle,
                newsDescription: newsEditDescription,
                newsAuthor: newsEditAuthor,
            };

            if (fileNews) updateData.newsFile = fileNews;

            // อัปเดตข่าวสาร
            const updatedNews = await myNews.findByIdAndUpdate(newsId, updateData, { new: true });

            if (!updatedNews) {
                return res.status(404).send({ error: 'News not found' });
            }

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

        // Perform the "soft delete"
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
const storage = multer.diskStorage({
    destination: './public/uploads/activity/',
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 }
}).single('img');

// กิจกรรม
const activityIndex = (req, res) => {
    const filter = { isDeleted: false };
    myActivity.find(filter)
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
            const existingActivity = await myActivity.findOne({ title, isDeleted: false });
            if (existingActivity) {
                return res.status(400).redirect('/admin/activity?error=มีกิจกรรมนี้อยู่แล้ว');
            }
            // ถ้าไม่มีซ้ำ ให้บันทึก
            const imagePath = req.file
                ? `/uploads/activity/${req.file.filename}`
                : '/img/no_image.jpg';
            const activity = new myActivity({
                title,
                content,
                img: imagePath
            });
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
            console.log(`Activity with ID ${id} not found.`);
            return res.status(404).redirect('/admin/activity?error=ไม่พบข้อมูลที่ต้องการลบ');
        }

        res.redirect('/admin/activity?message=ลบกิจกรรมสำเร็จ (Soft Delete)');
    } catch (err) {
        console.error('Error deleting activity:', err);
        res.status(500).redirect('/admin/activity?error=ลบกิจกรรมไม่สำเร็จ');
    }
};
// แก้ไขกิจกรรม
const activityEdit = (req, res) => {
    upload(req, res, (err) => {
        if (err) {
            console.error('Error uploading file:', err);
            return res.status(400).send({ error: 'File upload failed', details: err });
        }

        const imagePath = req.file
            ? `/uploads/activity/${req.file.filename}` // ใช้ไฟล์ใหม่หากอัปโหลด
            : req.body.img; // ใช้รูปเดิมหากไม่ได้อัปโหลดใหม่

        const updatedActivity = {
            title: req.body.title || 'Untitled',
            content: req.body.content || '',
            img: imagePath
        };

        myActivity.findByIdAndUpdate(req.params.id, updatedActivity, { new: true })
            .then((result) => {
                console.log('Activity updated successfully:', result);
                res.redirect('/admin/activity?message=แก้ไขกิจกรรมสำเร็จ');
            })
            .catch((err) => {
                console.error('Error updating activity:', err);
                res.status(500).redirect('/admin/activity?error=แก้ไขกิจกรรมไม่สำเร็จ');
            });
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
    limits: { fileSize: 50 * 1024 * 1024 }
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
            return res.render('admin/wasteStock', {
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
                $addFields: {
                    accountInfo: {
                        $ifNull: [
                            { $arrayElemAt: ['$accountInfo', 0] },
                            {
                                _id: '$accountId',
                                accountNumber: 'DELETED',
                                familyID: null,
                                isDeleted: true
                            }
                        ]
                    }
                }
            }
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
                $addFields: {
                    familyInfo: {
                        $ifNull: [
                            { $arrayElemAt: ['$familyInfo', 0] },
                            {
                                _id: '$accountInfo.familyID',
                                familyNumber: 'DELETED',
                                village: null,
                                isDeleted: true
                            }
                        ]
                    }
                }
            }
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
        res.render('admin/wasteStock', {
            mytitle: 'ผู้ดูและระบบ | สต๊อกขยะ',
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
        const { familyName, AccountName, AccountNumber, village, Type } = req.query;
        let searchQuery = { isDeleted: false };

        if (familyName) searchQuery.familyName = { $regex: familyName, $options: 'i' };
        if (Type) searchQuery.Type = Type;
        if (village) searchQuery.village = village;

        const villages = await Village.find(); 
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
                AccountName: family.username || '-',
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

        res.render('admin/member', { 
            mytitle: 'พนักงาน | สมาชิกกองทุนขยะรีไซเคิล',
            villages,
            allFamilies: familiesWithAccount,
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
        const existingMember = await Member.findOne({
            $or: [{ email: req.body.email }, { phone: req.body.phone }, { idCardNumber: req.body.idCardNumber }]
        }).session(session);
        if (existingMember) {
            await session.abortTransaction();
            session.endSession();
            return res.redirect('/admin/member?error=อีเมลหรือหมายเลขโทรศัพท์นี้ถูกใช้ไปแล้ว');
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
            idCardNumber: req.body.idCardNumber.replace(/\D/g, ''),
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

        res.redirect('/admin/member?message=ลงทะเบียนครัวเรือนสำเร็จ');

    } catch (error) {
        await session.abortTransaction();  
        session.endSession();

        console.error('Error registering household:', error);
        res.redirect('/admin/member?error=เกิดข้อผิดพลาดในการลงทะเบียน: ' + error.message);
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

        // ตรวจสอบ username (ถ้ามีการเปลี่ยน)
        if (req.body.username && req.body.username !== existingFamily.username) {
            const usernameRegex = /^[a-zA-Z0-9_\u0E00-\u0E7F]{5,20}$/;
            if (!usernameRegex.test(req.body.username)) {
                await session.abortTransaction();
                session.endSession();
                return res.redirect('/admin/member?error=ชื่อผู้ใช้ต้องมี 5-20 ตัวอักษร และไม่มีอักขระพิเศษ');
            }

            // ตรวจสอบว่าชื่อผู้ใช้ซ้ำหรือไม่
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

        // ตรวจสอบ password (ถ้ามีการเปลี่ยน)
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

        // หาข้อมูลสมาชิกเดิม
        const existingMember = await Member.findOne({ 
            familyID: familyId,
            Status: 'living'
        }).session(session);

        if (!existingMember) {
            await session.abortTransaction();
            session.endSession();
            return res.redirect('/admin/member?error=ไม่พบข้อมูลสมาชิก');
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
                return res.redirect('/admin/member?error=อีเมล หมายเลขโทรศัพท์ หรือเลขบัตรประชาชนนี้ถูกใช้ไปแล้ว');
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

        res.redirect('/admin/member?message=แก้ไขข้อมูลสำเร็จ');

    } catch (error) {
        await session.abortTransaction();
        session.endSession();

        console.error('Error updating member:', error);
        res.redirect('/admin/member?error=เกิดข้อผิดพลาดในการแก้ไขข้อมูล: ' + error.message);
    }
};

// สำหรับเก็บรูปภาพที่อัปโหลดจาก board
const storageBoard = multer.diskStorage({
    destination: './public/upload_board',
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

const uploadBoard = multer({
    storage: storageBoard,
    limits: { fileSize: 50 * 1024 * 1024 }
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
const boardPost = async (req, res) => {
    uploadBoard(req, res, async (err) => {
        if (err) {
            console.error(err);
            return res.redirect('/admin/board?error=เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ');
        }

        try {
            const { name, role, department, email, tel } = req.body;

            // ตรวจสอบข้อมูลที่จำเป็น
            if (!name || !role || !department || !email || !tel) {
                return res.redirect('/admin/board?error=กรุณากรอกข้อมูลให้ครบถ้วน');
            }

            const newBoard = new Board({
                name,
                role,
                department,
                email,
                tel,
                img: req.file ? `/upload_board/${req.file.filename}` : null
            });

            await newBoard.save();
            res.redirect('/admin/board?message=เพิ่มคณะกรรมการสำเร็จ');
        } catch (error) {
            console.error(error);
            // ลบไฟล์ที่อัปโหลดถ้าเกิดข้อผิดพลาด
            if (req.file) {
                fs.unlinkSync(req.file.path);
            }
            res.redirect('/admin/board?error=เกิดข้อผิดพลาดในการเพิ่มข้อมูล');
        }
    });
};

// แก้ไขคณะกรรมการ
const boardEdit = async (req, res) => {
    uploadBoard(req, res, async (err) => {
        if (err) {
            console.error(err);
            return res.redirect('/admin/board?error=เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ');
        }

        try {
            const { _id, name, role, department, email, tel } = req.body;

            // ตรวจสอบข้อมูลที่จำเป็น
            if (!_id || !name || !role || !department || !email || !tel) {
                return res.redirect('/admin/board?error=กรุณากรอกข้อมูลให้ครบถ้วน');
            }

            const board = await Board.findById(_id);
            if (!board) {
                return res.redirect('/admin/board?error=ไม่พบข้อมูลคณะกรรมการ');
            }

            // อัปเดตข้อมูล
            board.name = name;
            board.role = role;
            board.department = department;
            board.email = email;
            board.tel = tel;

            // ถ้ามีการอัปโหลดรูปใหม่
            if (req.file) {
                // ลบรูปเก่า
                if (board.img) {
                    const oldImgPath = path.join(__dirname, '../public', board.img);
                    if (fs.existsSync(oldImgPath)) {
                        fs.unlinkSync(oldImgPath);
                    }
                }
                board.img = `/upload_board/${req.file.filename}`;
            }

            await board.save();
            res.redirect('/admin/board?message=แก้ไขข้อมูลสำเร็จ');
        } catch (error) {
            console.error(error);
            // ลบไฟล์ที่อัปโหลดถ้าเกิดข้อผิดพลาด
            if (req.file) {
                fs.unlinkSync(req.file.path);
            }
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

//หน้าฌาปนกิจสงเคราะห์
const funeralAidIndex = (req, res)=> {
    res.render('admin/funeralAid',{mytitle: 'ฌาปนกิจสงเคราะห์',currentPage: 'funeralAid',})
}

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
    wasteIndex,wastePost,wasteDelete,wasteEdit,
    //ประเภทขยะ
    wasteTypeIndex,wasteTypePost,wasteTypeEdit,wasteTypeDelete,
    //สต๊อกขยะ
    wasteStockIndex,
    //พนักงาน
    employeeIndex,employeeRegister,employeeDelete,editEmployee,
    //สมาชิกกองทุน
    memberIndex,memberRegister,getMemberForEdit,memberUpdate,
    //คณะกรรมการๆ
    boardIndex,boardPost,boardEdit,boardDelete,
    //หมู่บ้าน
    villageIndex,villagePost,villageEdit,villageDelete,
    //รอบการรับซื้อขยะ
    roundIndex,roundPost,roundEdit,roundDelete,
    //จุดรับซื้อขยะ
    wastePointIndex,wastePointPost,wastePointCreate,wastePointToggle,wastePointEdit,wastePointUpdate,wastePointDelete,
    //ฌาปนกิจสงเคราะห์
    funeralAidIndex,
}