const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
const multer = require('multer');
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
const mongoose = require('mongoose');
const path = require('path');
const bcrypt = require('bcryptjs');
const moment = require('moment');

router.use(express.static(path.join(__dirname, '../public')));

router.use(bodyParser.json({ limit: '10mb' }));  // เพิ่มขนาด payload สูงสุด 10MB
router.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

router.post('/upload-image', (req, res) => {
    // โค้ดสำหรับจัดการการอัพโหลด
    res.send('ไฟล์ถูกอัพโหลด');
});

//แดชบอร์ด
const dashboardIndex = async (req, res)=> {
  try {
    const now = new Date();

    // ====== กำหนดช่วงเวลาสำหรับวันนี้และเมื่อวาน ======
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);

    // ====== ยอดเงินรวมทั้งหมด ======
    const totalPurchase = await WastePurchase.aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } }
    ]);
    const totalAmount = totalPurchase.length > 0 ? totalPurchase[0].total : 0;

    // ====== จำนวนธุรกรรมทั้งหมด ======
    const transactionCount = await WastePurchase.countDocuments({ isDeleted: false });

    // ====== จำนวนธุรกรรม วันนี้ vs เมื่อวาน ======
    const transactionToday = await WastePurchase.countDocuments({
      isDeleted: false,
      purchaseDate: { $gte: todayStart, $lt: tomorrowStart }
    });

    const transactionYesterday = await WastePurchase.countDocuments({
      isDeleted: false,
      purchaseDate: { $gte: yesterdayStart, $lt: todayStart }
    });

    let transactionPercentChange = 0;
    if (transactionYesterday > 0) {
      transactionPercentChange = ((transactionToday - transactionYesterday) / transactionYesterday * 100).toFixed(2);
    }

    // ====== ยอดรับซื้อ วันนี้ vs เมื่อวาน ======
    const todayPurchase = await WastePurchase.aggregate([
      {
        $match: {
          isDeleted: false,
          purchaseDate: { $gte: todayStart, $lt: tomorrowStart },
        },
      },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]);

    const yesterdayPurchase = await WastePurchase.aggregate([
      {
        $match: {
          isDeleted: false,
          purchaseDate: { $gte: yesterdayStart, $lt: todayStart },
        },
      },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]);

    const todayTotal = todayPurchase.length > 0 ? todayPurchase[0].total : 0;
    const yesterdayTotal = yesterdayPurchase.length > 0 ? yesterdayPurchase[0].total : 0;

    let todayPercentChange = 0;
    if (yesterdayTotal > 0) {
      todayPercentChange = ((todayTotal - yesterdayTotal) / yesterdayTotal * 100).toFixed(2);
    }

    // ====== ขยะมูลค่าสูงสุด ======
    const highestWaste = await WastePriceHistory.findOne()
      .sort({ pricePerUnit: -1 })
      .populate('wasteId');

    // ====== ปริมาณขยะ เดือนที่แล้ว vs เดือนก่อนหน้า ======
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    let lastMonth = thisMonth - 1;
    let lastMonthYear = thisYear;
    if (lastMonth < 0) {
      lastMonth = 11;
      lastMonthYear = thisYear - 1;
    }

    let prevMonth = lastMonth - 1;
    let prevMonthYear = lastMonthYear;
    if (prevMonth < 0) {
      prevMonth = 11;
      prevMonthYear = lastMonthYear - 1;
    }

    const lastMonthWaste = await WastePurchase.aggregate([
      {
        $match: {
          isDeleted: false,
          purchaseDate: {
            $gte: new Date(lastMonthYear, lastMonth, 1),
            $lt: new Date(lastMonthYear, lastMonth + 1, 1),
          },
        },
      },
      { $unwind: "$wasteItems" },
      {
        $lookup: {
          from: "wasteitems",
          localField: "wasteItems",
          foreignField: "_id",
          as: "wasteItemData",
        },
      },
      { $unwind: "$wasteItemData" },
      {
        $group: { _id: null, totalQuantity: { $sum: "$wasteItemData.quantity" } },
      },
    ]);

    const prevMonthWaste = await WastePurchase.aggregate([
      {
        $match: {
          isDeleted: false,
          purchaseDate: {
            $gte: new Date(prevMonthYear, prevMonth, 1),
            $lt: new Date(prevMonthYear, prevMonth + 1, 1),
          },
        },
      },
      { $unwind: "$wasteItems" },
      {
        $lookup: {
          from: "wasteitems",
          localField: "wasteItems",
          foreignField: "_id",
          as: "wasteItemData",
        },
      },
      { $unwind: "$wasteItemData" },
      {
        $group: { _id: null, totalQuantity: { $sum: "$wasteItemData.quantity" } },
      },
    ]);

    const lastTotal = lastMonthWaste.length > 0 ? lastMonthWaste[0].totalQuantity : 0;
    const prevTotal = prevMonthWaste.length > 0 ? prevMonthWaste[0].totalQuantity : 0;

    let percentChange = 0;
    if (prevTotal > 0) {
      percentChange = ((lastTotal - prevTotal) / prevTotal * 100).toFixed(2);
    }

    // ====== Pipeline stockData ======
    const matchCondition = { isDeleted: false };
    const pipeline = [
      { $match: matchCondition },

      // Join WasteBankAccount
      {
        $lookup: {
          from: 'wastebankaccounts',
          localField: 'accountId',
          foreignField: '_id',
          as: 'accountInfo'
        }
      },
      { $unwind: '$accountInfo' },

      // Join Family
      {
        $lookup: {
          from: 'families',
          localField: 'accountInfo.familyID',
          foreignField: '_id',
          as: 'familyInfo'
        }
      },
      { $unwind: '$familyInfo' },

      // Join WasteItem
      {
        $lookup: {
          from: 'wasteitems',
          localField: 'wasteItems',
          foreignField: '_id',
          as: 'wasteItemDetails'
        }
      },
      { $unwind: '$wasteItemDetails' },

      // Join Waste model
      {
        $lookup: {
          from: 'wastes',
          localField: 'wasteItemDetails.name',
          foreignField: 'wasteName',
          as: 'currentWasteInfo'
        }
      },

      // Add fields
      {
        $addFields: {
          purchaseMonth: { $dateToString: { format: "%Y-%m", date: "$purchaseDate", timezone: "Asia/Bangkok" } },
          purchaseYear: { $year: "$purchaseDate" },
          wasteQuantity: { $ifNull: ['$wasteItemDetails.quantity', 0] },
          wastePricePerUnit: { $ifNull: ['$wasteItemDetails.pricePerUnit', 0] },
          currentPricePerUnit: { $ifNull: [{ $arrayElemAt: ['$currentWasteInfo.pricePerUnit', 0] }, 0] }
        }
      },

      // Group by wasteName + month
      {
        $group: {
          _id: { wasteName: '$wasteItemDetails.name', month: '$purchaseMonth' },
          totalQuantityKg: { $sum: '$wasteQuantity' },
          avgPriceInMonth: { $avg: '$wastePricePerUnit' },
          monthlyAmount: { $sum: { $multiply: ['$wasteQuantity', '$wastePricePerUnit'] } },
          currentPrice: { $first: '$currentPricePerUnit' },
          currentMonthlyValue: { $sum: { $multiply: ['$wasteQuantity', '$currentPricePerUnit'] } },
          purchaseCount: { $sum: 1 },
          purchaseDates: { $push: '$purchaseDate' }
        }
      },

      // Group again by wasteName
      {
        $group: {
          _id: '$_id.wasteName',
          totalQuantityKg: { $sum: '$totalQuantityKg' },
          historicalTotalAmount: { $sum: '$monthlyAmount' },
          currentTotalAmount: { $sum: '$currentMonthlyValue' },
          totalMonthlyAmount: { $sum: '$monthlyAmount' },
          totalMonthlyQuantity: { $sum: '$totalQuantityKg' },
          currentPrice: { $first: '$currentPrice' },
          purchaseCount: { $sum: '$purchaseCount' },
          lastUpdated: { $max: { $max: '$purchaseDates' } },
          monthlyBreakdown: { $push: {
            month: '$_id.month',
            quantity: '$totalQuantityKg',
            avgPrice: '$avgPriceInMonth',
            amount: '$monthlyAmount',
            currentValue: '$currentMonthlyValue',
            purchases: '$purchaseCount'
          }}
        }
      },

      // Add fields
      {
        $addFields: {
          avgHistoricalPrice: { $cond: { if: { $gt: ['$totalQuantityKg', 0] }, then: { $divide: ['$totalMonthlyAmount', '$totalQuantityKg'] }, else: 0 } },
          pricePerKg: { $ifNull: ['$currentPrice', 0] },
          totalAmount: { $ifNull: ['$historicalTotalAmount', 0] },
          currentValueIfSoldToday: { $ifNull: ['$currentTotalAmount', 0] },
          lastUpdatedFormatted: { $cond: { if: { $ne: ['$lastUpdated', null] }, then: { $dateToString: { format: "%d/%m/%Y", date: '$lastUpdated', timezone: "Asia/Bangkok" } }, else: "ไม่ระบุ" } },
          priceDifference: { $subtract: [{ $ifNull: ['$currentPrice', 0] }, { $ifNull: ['$avgHistoricalPrice', 0] }] },
          avgPricePerUnit: { $ifNull: ['$avgHistoricalPrice', 0] }
        }
      },

      { $sort: { _id: 1 } }
    ];

    // ดึง stockData
    let stockData = await WastePurchase.aggregate(pipeline);

    // ดึงข้อมูล wasteTypes
    const wasteTypes = await myWasteType.find({ isDeleted: false });
    const wasteTypesMap = {};
    wasteTypes.forEach(wt => {
      wasteTypesMap[wt.wasteTypeName] = wt.colorTheme;
    });

    // map colorTheme และเรียงจากปริมาณมาก → น้อย
    stockData.forEach(item => {
      item.colorTheme = wasteTypesMap[item._id] || 'gray';
    });
    stockData.sort((a, b) => b.totalQuantityKg - a.totalQuantityKg);

    // ====== ส่งไป render ======
    res.render('admin/dashboard', {
      mytitle: 'Administrator | Dashboard',
      totalAmount,
      transactionCount,
      transactionToday,
      transactionYesterday,
      transactionPercentChange,
      highestWaste,
      totalWaste: lastTotal,
      percentChange,
      todayTotal,
      todayPercentChange,
      stockData: stockData || [],
    });

  } catch (err) {
    console.error(err);
    res.status(500).send('เกิดข้อผิดพลาดที่เซิร์ฟเวอร์');
  }
}

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
                        media: result
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
const newsIndex = (req, res) => {
    const filter = { isDeleted: false };
    myNews.find(filter)
        .then((result) => {
                    result.forEach(item => {
                        item.formattedDate = moment(item.createdAt).format('YYYY-MM-DD');
                    });
                    res.render('admin/news', { 
                        mytitle: 'Admindashboard | News', 
                        news: result,
                    });
                })
                .catch((err) => {
                    console.log(err);
                    res.status(500).send('Internal Server Error');
                });
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


/// สำหรับเก็บรูปภาพที่อัปโหลดจาก waste
const storage2 = multer.diskStorage({
    destination: './public/upload_imgwaste',
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

const upload2 = multer({
    storage: storage2, // ใช้ storage2 แทน storage
    limits: { fileSize: 50 * 1024 * 1024 }
}).single('img');

// ขยะ
const wasteIndex = (req, res) => {
    const filter = { isDeleted: false };

    Promise.all([
        myWaste.find(filter).populate('wasteType', 'wasteTypeName'), // Populate wasteType with wasteTypeName and apply pagination
        myWasteType.find({ isDeleted: false })
    ])
    .then(([wasteData, wasteTypeData]) => {

        res.render('admin/waste', {
            mytitle: 'Admindashboard | Waste',
            waste: wasteData,
            wasteTypes: wasteTypeData
        });
    })
    .catch((err) => {
        console.log(err);
        res.status(500).send('Internal Server Error');
    });
};
// เพิ่มขยะ (ป้องกันเพิ่มขยะซ้ำ)
const wastePost = async (req, res) => {
    upload2(req, res, async (err) => { // ใช้ upload2 แทน upload
        if (err) {
            console.error('Error in file upload:', err);
            return res.status(400).send('เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ');
        }

        // ตรวจสอบรูปภาพที่อัปโหลด
        const imagePath = req.file
            ? `/upload_imgwaste/${req.file.filename}` // ใช้ backticks สำหรับการแทรกค่า
            : '/img/no_image.jpg';

        const { wasteName, pricePerUnit, wasteType } = req.body;

        // ตรวจสอบข้อมูลที่จำเป็น
        if (!wasteName || !pricePerUnit || !wasteType) {
            return res.status(400).send('กรุณากรอกข้อมูลให้ครบถ้วน');
        }

        try {
            // ตรวจสอบว่ามี wasteName นี้ในฐานข้อมูลแล้วหรือไม่
            const existingWaste = await myWaste.findOne({ wasteName });
            if (existingWaste) {
                return res.redirect('/admin/waste?error=ขยะนี้มีอยู่แล้ว');
            }
            // ตรวจสอบประเภทขยะ
            const wasteTypeDoc = await myWasteType.findById(wasteType);
            if (!wasteTypeDoc) {
                return res.status(400).send('ประเภทขยะไม่ถูกต้อง');
            }

            const newWaste = new myWaste({
                wasteName,
                pricePerUnit: parseFloat(pricePerUnit), // ตรวจสอบว่าเป็นตัวเลข
                wasteType,
                img: imagePath
            });

            await newWaste.save();
            console.log('Waste saved successfully');
            res.redirect('/admin/waste?message=เพิ่มขยะสำเร็จ');
        } catch (error) {
            console.error('Error saving waste:', error);
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

            const updatedImagePath = req.file
                ? `/upload_imgwaste/${req.file.filename}`
                : waste.img;

            const newPrice = parseFloat(pricePerUnit);
            const oldPrice = waste.pricePerUnit;

            // อัปเดตข้อมูลขยะ
            waste.wasteName = wasteName;
            waste.pricePerUnit = newPrice;
            waste.wasteType = wasteType;
            waste.img = updatedImagePath;

            await waste.save();

            // 🧠 คำนวณเปอร์เซ็นต์การเปลี่ยนแปลงของราคา
            let percentChange = null;
            let changeDirection = 'none';

            if (oldPrice !== 0 && oldPrice !== newPrice) {
                percentChange = ((newPrice - oldPrice) / oldPrice) * 100;
                changeDirection = percentChange > 0 ? 'up' : 'down';
            }

            // 📝 บันทึกประวัติราคาใหม่
            const priceLog = new WastePriceHistory({
                wasteId: waste._id,
                pricePerUnit: newPrice,
                percentChange,
                changeDirection,
                location: 'ขอนแก่น' // 🔧 แก้ไขเป็น dynamic location ได้
            });

            await priceLog.save();

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
        res.render('admin/wasteStock', {
            mytitle: 'สต๊อกขยะ',
            stockData: stockData || [],
            selectedVillageId: villageId,
            villages: allVillages,
            searchName: wasteName,
            selectedMonth: selectedMonth,
            selectedYear: selectedYear,
            monthlyOptions: monthlyOptions
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
                        totalItems: totalItems
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
        const { familyName, AccountName, village, Type } = req.query;
        let searchQuery = { isDeleted: false };

        if (familyName) searchQuery.familyName = { $regex: familyName, $options: 'i' };
        if (AccountName) searchQuery.AccountName = { $regex: AccountName, $options: 'i' };
        if (village) searchQuery.village = village; // ใช้ _id ของหมู่บ้านโดยตรง
        if (Type) searchQuery.Type = Type;

        // ดึงข้อมูล
        const villages = await Village.find(); 
        const allFamilies = await Family.find(searchQuery).populate('village').lean();
        const Account = await WasteBankAccount.find(searchQuery);

        // แผนที่ Type -> ภาษาไทย
        const typeMap = {
            household: 'บ้าน',
            school: 'โรงเรียน',
            municipality: 'องค์กรปกครองส่วนท้องถิ่น',
            community: 'ชุมชน',
            temple:'วัด'
        };

        // เพิ่ม field typeThai ให้ทุกครัวเรือน
        allFamilies.forEach(family => {
            family.typeThai = typeMap[family.Type] || family.Type;
        });

        res.render('admin/member', { 
            mytitle: 'สมาชิกกองทุนขยะรีไซเคิล',
            villages,
            allFamilies,
            Account,
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

        res.redirect('/admin/member?message=ลงทะเบียนครัวเรือนสำเร็จ');

    } catch (error) {
        await session.abortTransaction();  
        session.endSession();

        console.error('Error registering household:', error);
        res.redirect('/admin/member?error=เกิดข้อผิดพลาดในการลงทะเบียน: ' + error.message);
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
            totalItems: totalItems
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
        Round.find(filter).populate('village').sort({ date: -1 }).skip(skip).limit(limit), // Apply pagination
        Round.countDocuments(filter) // Count total documents
    ])
    .then(([villageResult, roundResult, totalItems]) => {
        const totalPages = Math.ceil(totalItems / limit);

        // แปลงวันที่ก่อนส่งไปยัง EJS
        roundResult = roundResult.map(round => ({
            ...round.toObject(), 
            formattedDateYYMMDD: new Date(round.date).toISOString().split('T')[0], // YY-MM-DD
            formattedDateThai: formatDate(round.date) // วันที่ภาษาไทย
        }));

        res.render('admin/round', {
            mytitle: 'Admindashboard | Round',
            village: villageResult,
            rounds: roundResult,
            currentPage: page,
            totalPages: totalPages,
            totalItems: totalItems
        });
    })
    .catch((err) => {
        console.log(err);
        res.status(500).send('Error retrieving village and round data');
    });
};
//เพิ่มรอบรับซื้อขยะ 
const roundPost = (req, res) => {
    const { roundName, village, date, startTime, endTime } = req.body;

    const newRound = new Round({
        roundName,
        village, // ใช้ ID ของหมู่บ้านจากฟอร์ม
        date,
        startTime,
        endTime
    });

    newRound.save()
        .then(() => {
            res.redirect('/admin/round?message=เพิ่มรอบการรับซื้อสำเร็จ');
        })
        .catch((err) => {
            console.log(err);
            res.status(500).send('Error saving round data');
        });
};
// แก้ไขรอบรับซื้อขยะ
const roundEdit = async (req, res) => {
    try {
        const { _id, roundName, village, date, startTime, endTime } = req.body;

        // ตรวจสอบว่าข้อมูลที่ส่งมาครบหรือไม่
        if (!_id || !roundName || !village || !date || !startTime || !endTime) {
            return res.redirect('/admin/round?error=กรอกข้อมูลให้ครบ');
        }

        // ค้นหาและอัปเดตรอบรับซื้อขยะในฐานข้อมูล
        await Round.findByIdAndUpdate(_id, {
            roundName,
            village,
            date,
            startTime,
            endTime
        });

        res.redirect('/admin/round?message=แก้ไขรอบการรับซื้อสำเร็จ'); // กลับไปหน้าจัดการรอบรับซื้อขยะ
    } catch (error) {
        console.error(error);
        req.flash('error_msg', 'เกิดข้อผิดพลาดในการแก้ไขรอบรับซื้อขยะ');
        res.redirect('/admin/manageRounds');
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

//หน้าฌาปนกิจสงเคราะห์
const funeralAidIndex = (req, res)=> {
    res.render('admin/funeralAid',{mytitle: 'ฌาปนกิจสงเคราะห์'})
}

module.exports = {
    //แดชบอร์ด
    dashboardIndex,
    //สื่อ
    mediaIndex,mediaPost,mediaEdit,mediaDelete,
    //ข่าวสาร
    newsIndex,newsPost,deleteNews,
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
    memberIndex,memberRegister,
    //หมู่บ้าน
    villageIndex,villagePost,villageEdit,villageDelete,
    //รอบการรับซื้อขยะ
    roundIndex,roundPost,roundEdit,roundDelete,
    //ฌาปนกิจสงเคราะห์
    funeralAidIndex,
}