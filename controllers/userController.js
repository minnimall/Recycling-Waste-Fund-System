const express = require('express');
const router = express.Router();
const multer = require('multer');
const myMedia = require('../models/media');
const myActivity = require('../models/activity');
const myNews = require('../models/news');
const myWaste = require('../models/waste');
const myWasteType = require('../models/wastetype');
const Village = require('../models/village');
const Round = require('../models/round');
const wasteSaleRequest = require('../models/wasteSaleRequest');
const WastePurchase = require('../models/wastePurchase');
const Family = require('../models/family');
const Member = require('../models/member');
const Complaint = require('../models/complaint');
const WasteBankAccount = require('../models/wasteBankAccount');
const WastePriceHistory = require('../models/wastePriceHistory');
const transactionMoney = require('../models/transactionMoney');
const Idea = require('../models/ideas');
const Notification = require('../models/notification');
const Board = require('../models/board');
const path = require('path');
const moment = require('moment');
const WastePoint = require('../models/wastePoint');

// หน้าหลัก
const formatDate = (date) => moment(date).locale('th').format('ddddที่ D MMMM YYYY');

const user_index = async (req, res) => {
    const filter = { isDeleted: false };

    try {
        const [
            activitiesResult,
            wasteResult,
            villageResult,
            roundResult,
            newsResult
        ] = await Promise.all([
            myActivity.find(filter).sort({ createdAt: -1 }),
            myWaste.find(filter).populate('wasteType').sort({ createdAt: 1 }),
            Village.find(filter).sort({ villageNumber: 1 }),
            Round.find(filter).populate('village').sort({ date: 1 }),
            myNews.find(filter).sort({ createdAt: -1 })
        ]);

        // ดึงประวัติราคาล่าสุดของขยะแต่ละตัว
        const wasteWithChangeRaw = await Promise.all(
            wasteResult.map(async (waste) => {
                const lastHistory = await WastePriceHistory.findOne({ wasteId: waste._id })
                    .sort({ createdAt: -1 });

                const latestPrice = lastHistory ? lastHistory.pricePerUnit : waste.pricePerUnit;
                const latestPriceDate = lastHistory ? lastHistory.createdAt : null;

                // เก็บ priceChange เป็น number ไม่ใช่ string
                const priceChange = lastHistory
                    ? (waste.pricePerUnit - lastHistory.pricePerUnit)
                    : null;

                return {
                    ...waste._doc,
                    latestPrice,
                    latestPriceDate,
                    priceChange,
                    percentChange: lastHistory ? lastHistory.percentChange : null,
                    changeDirection: lastHistory ? lastHistory.changeDirection : null
                };
            })
        );

        // เรียงจากวันล่าสุดมากไปหาน้อย
        const wasteWithChange = wasteWithChangeRaw.sort((a, b) => {
            const dateA = new Date(a.latestPriceDate || 0);
            const dateB = new Date(b.latestPriceDate || 0);
            return dateB - dateA;
        });

        // หาเวลาที่อัปเดตราคาล่าสุด
        const latestPriceUpdateDate = wasteWithChange.reduce((latest, item) => {
            if (item.latestPriceDate && (!latest || new Date(item.latestPriceDate) > new Date(latest))) {
                return item.latestPriceDate;
            }
            return latest;
        }, null);

        const currentDate = moment().format('YYYY-MM-DD');
        const currentTime = moment().format('HH:mm');

        const roundsByVillage = roundResult.reduce((acc, round) => {
            const roundDate = moment(round.date).format('YYYY-MM-DD');
            const startTime = round.startTime;
            const endTime = round.endTime;

            const isActive =
                roundDate === currentDate &&
                currentTime >= startTime &&
                currentTime <= endTime;

            acc[round.village._id] = {
                roundName: round.roundName,
                formattedDateYYMMDD: new Date(round.date).toISOString().split('T')[0],
                formattedDateThai: formatDate(round.date),
                startTime,
                endTime,
                isActive
            };
            return acc;
        }, {});

        
        const wastePoints = await WastePoint.find({ isDeleted: false });

        res.render('user/main', {
            mytitle: 'Admindashboard | Activity',
            activity: activitiesResult,
            waste: wasteWithChange,
            village: villageResult,
            roundsByVillage,
            moment: moment,
            news: newsResult,
            latestPriceUpdateDate,
            wastePoints
        });

    } catch (err) {
        console.error(err);
        res.status(500).send("เกิดข้อผิดพลาดในการโหลดข้อมูล");
    }
};





// หน้าประเภทขยะ
const user_wastetype = (req, res) => {
    const wasteTypeFilter = req.query.wasteType;
    const page = parseInt(req.query.page) || 1;
    const limit = 12;
    const skip = (page - 1) * limit;

    Promise.all([
        myWaste.find({
            ...(wasteTypeFilter ? { wasteType: wasteTypeFilter } : {}), 
            isDeleted: false
        })
        .skip(skip)
        .limit(limit)
        .populate('wasteType', 'wasteTypeName'),

        myWasteType.find({ isDeleted: false }),

        myWaste.countDocuments({
            ...(wasteTypeFilter ? { wasteType: wasteTypeFilter } : {}),
            isDeleted: false
        })
    ])
    .then(([wasteData, wasteTypeData, totalWasteCount]) => {
        const totalPages = Math.ceil(totalWasteCount / limit);
        res.render('user/wastetype', {
            mytitle: 'Admindashboard | Waste',
            waste: wasteData,
            wasteTypes: wasteTypeData,
            selectedWasteType: wasteTypeFilter,
            currentPage: page,
            totalPages: totalPages
        });
    })
    .catch((err) => {
        console.log(err);
        res.status(500).send('เกิดข้อผิดพลาดในระบบ');
    });
};


// หน้าสื่อความรู้
const user_knowledge = (req, res) => {
    const filter = { isDeleted: false };
    myMedia.find(filter).sort({ createdAt: -1 })
        .then((result) => {
            res.render('user/knowledge', { mytitle: 'Admindashboard | Media', media: result});
        })
        .catch((err) => {
            console.log(err);
        });
};


// หน้าประวัติการขายขยะของครัวเรือน
const user_saleHistory = (req, res)=> {
    res.render('user/saleHistory')
}

// หน้าแจ้งความประสงค์ขายขยะ
const user_wasteSaleRequest = (req, res) => {
    const filter = { isDeleted: false };

    myWaste.find(filter).sort({ createdAt: 1 })
        .then((result) => {
            res.render('user/wasteSaleRequest', { 
                wasteItems: result
            });
        })
        .catch((err) => {
            console.log(err);
            res.status(500).send('เกิดข้อผิดพลาดในระบบ');
        });
};

const storage = multer.diskStorage({
    destination: './public/upload_imgWasteSaleRequest',
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 }
}).single('image');

//บันทึกข้อมูลแบบฟอร์มแจ้งความประสงค์ขายขยะ
const wasteSaleRequestPost = (req, res) => {
    // ตรวจสอบว่า session มีค่า userId หรือไม่
    if (!req.session || !req.session.username) {
        res.redirect('/user/wasteSaleRequest?error=กรุณาเข้าสู่ระบบก่อนทำรายการ');
    }

    // ใช้ username จาก session ค้นหา Family ในฐานข้อมูล
    const { username } = req.session;

    // ค้นหาผู้ใช้จาก Family ตาม username
    Family.findOne({ username: username })
        .then((family) => {
            if (!family) {
                res.redirect('/user/wasteSaleRequest?error=ไม่พบข้อมูลครัวเรือน');
            }

            upload(req, res, (err) => {
                if (err) {
                    res.redirect('/user/wasteSaleRequest?error=อัปโหลดรูปภาพล้มเหลว');
                }

                const imagePath = req.file ? `/upload_imgWasteSaleRequest/${req.file.filename}` : '/img/no_image.jpg';
                // เพิ่ม latitude และ longitude ในการรับค่าจาก req.body
                const { waste, weight, date, location, latitude, longitude, locationMoreDetail } = req.body;

                if (!waste || waste.length === 0) {
                    res.redirect('/user/wasteSaleRequest?error=กรุณาเลือกขยะที่ต้องการขาย');
                }

                // ตรวจสอบว่ามีค่า latitude และ longitude หรือไม่
                if (!latitude || !longitude) {
                    res.redirect('/user/wasteSaleRequest?error=กรุณาเลือกตำแหน่งบนแผนที่');
                }

                // สร้างการแจ้งความประสงค์ขายขยะ
                const newSaleRequest = new wasteSaleRequest({
                    waste: Array.isArray(waste) ? waste : [waste], 
                    weight: weight ? parseFloat(weight) : undefined, 
                    date: new Date(date),
                    location,
                    locationMoreDetail: locationMoreDetail || '',
                    latitude: parseFloat(latitude),  // เพิ่มค่า latitude
                    longitude: parseFloat(longitude), // เพิ่มค่า longitude
                    img: imagePath,
                    family: family._id  // ใช้ _id ของ family ที่ค้นหามา
                });

                newSaleRequest.save()
                    .then((result) => {
                        res.redirect('/user/wasteSaleRequest?message=ส่งแบบฟอร์มสำเร็จ');
                    })
                    .catch((err) => {
                        console.log(err);
                        res.redirect('/user/wasteSaleRequest?error=เกิดข้อผิดพลาดในระบบ');
                    });
            });
        })
        .catch((err) => {
            console.log(err);
            res.status(500).send('เกิดข้อผิดพลาดในการค้นหาผู้ใช้');
        });
};

// หน้าข้อมูลติดต่อ
// หน้าข้อมูลติดต่อ
const user_contact = async(req, res) => {
    try {
        // ดึงข้อมูลคณะกรรมการทั้งหมดที่ยังไม่ถูกลบ
        const allBoards = await Board.find({ isDeleted: false }).sort({ createdAt: 1 });
        
        // แยกข้อมูลตามฝ่าย
        const boardsByDepartment = {
            executive: allBoards.filter(b => b.department === 'ฝ่ายอำนวยการ'),
            pr: allBoards.filter(b => b.department === 'ฝ่ายประชาสัมพันธ์/วางแผนดำเนินและติดตามผล'),
            recruitment: allBoards.filter(b => b.department === 'ฝ่ายรับสมัคร'),
            purchase: allBoards.filter(b => b.department === 'ฝ่ายรับซื้อขยะ'),
            finance: allBoards.filter(b => b.department === 'ฝ่ายการเงินและบัญชี'),
            withdrawal: allBoards.filter(b => b.department === 'ฝ่ายเบิกถอนเงินฝากธนาคาร'),
            registry: allBoards.filter(b => b.department === 'ฝ่ายงานทะเบียนและธุรการ'),
            fund: allBoards.filter(b => b.department === 'ฝ่ายจัดการทุนและฌาปนกิจ'),
            photo: allBoards.filter(b => b.department === 'ฝ่ายภาพกิจกรรม')
        };
        
        res.render('user/contact', {
            mytitle: 'ติดต่อ-สอบถาม',
            currentPage: 'contact',
            boards: boardsByDepartment
        });
    } catch (error) {
        console.error('Error in user_contact:', error);
        res.redirect('/user/contact?error=เกิดข้อผิดพลาดในการโหลดข้อมูล');
    }
}

const user_wastePrices = async (req, res) => {
    try {
        const wasteItems = await myWaste.find({ isDeleted: false })
            .populate({
                path: 'wasteType',
                match: { isDeleted: false },
                select: 'wasteTypeName colorTheme'
            })
            .lean();

        const filtered = wasteItems.filter(item => item.wasteType);

        res.render('user/wastePrices', { waste: filtered });
    } catch (err) {
        console.error("เกิดข้อผิดพลาดในการดึงข้อมูลขยะ:", err);
        res.status(500).send("เกิดข้อผิดพลาดในการดึงข้อมูลขยะ");
    }
};

// หน้ากิจกรรมทั้งหมด
const user_allActivity = (req, res) => {
    const searchQuery = req.query.search?.trim() || "";
    
    let query = { isDeleted: false };

    if (searchQuery) {
        query = {
            ...query, // คงค่า isDeleted: false ไว้
            title: { $regex: new RegExp(searchQuery, "i") }
        };
    }

    // ดึงข้อมูลกิจกรรมจากฐานข้อมูลตาม query ที่สร้าง
    myActivity.find(query).sort({ createdAt: -1 })
        .then((result) => {
            // แปลงวันที่ในแต่ละกิจกรรม
            const activities = result.map(activity => ({
                ...activity._doc, // ดึงข้อมูลทั้งหมดในเอกสาร
                formattedDate: moment(activity.createdAt).format('YYYY-MM-DD') // เพิ่มฟิลด์ formattedDate
            }));

            res.render('user/allActivity', { 
                activity: activities,
                search: searchQuery
            });
        })
        .catch((err) => {
            console.log(err);
            res.status(500).send('เกิดข้อผิดพลาดในระบบ');
        });
};


// หน้ารายละเอียดกิจกรรม
const user_detailActivity = (req, res) => {
    const filter = { isDeleted: false };
    myActivity.findById(req.params.id)
        .then(activity => {
            if (!activity) {
                return res.status(404).send('Activity not found');
            }

            // เพิ่มฟิลด์ formattedDate ให้กับกิจกรรมที่เลือก
            const formattedActivity = {
                ...activity._doc,
                formattedDate: moment(activity.createdAt).format('YYYY-MM-DD')
            };

            myActivity.find(filter).sort({ createdAt: -1 })
                .then(otherActivities => {
                    // เพิ่มฟิลด์ formattedDate ให้กับกิจกรรมอื่น ๆ
                    const formattedOtherActivities = otherActivities.map(activity => ({
                        ...activity._doc,
                        formattedDate: moment(activity.createdAt).format('YYYY-MM-DD')
                    }));

                    res.render('user/detailActivity', { 
                        activity: formattedActivity, 
                        otherActivities: formattedOtherActivities 
                    });
                })
                .catch(err => {
                    console.error(err);
                    res.status(500).send('Error fetching other activities');
                });
        })
        .catch(err => {
            console.error(err);
            res.status(500).send('Error fetching activity details');
        });
};

// เก็บรูปภาพที่อัปโหลดจาก complaint
const Storage = multer.diskStorage({
    destination: './public/upload/complaint/',
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

const Upload3 = multer({
    storage: Storage,   // ✅ ใช้ Storage ตัวใหญ่
    limits: { fileSize: 10 * 1024 * 1024 } // จำกัด 10MB
}).single('image');     // ✅ ต้องตรงกับ name="image" ใน form


// หน้าคำร้องเรียน
const user_complaint = (req, res)=> {
    res.render('user/complaint', { session: req.session });
}

const complaintPost = (req, res) => {
    Upload3(req, res, async (err) => {
        if (err) {
            console.error("Multer upload error:", err);
            return res.redirect('/user/complaint?error=อัปโหลดไฟล์ไม่สำเร็จ');
        }

        try {
            if (!req.session || !req.session.username) {
                return res.redirect('/user/complaint?error=กรุณาเข้าสู่ระบบก่อนทำรายการ');
            }

            const family = await Family.findOne({ username: req.session.username });
            if (!family) {
                return res.redirect('/user/complaint?error=ไม่พบข้อมูลครัวเรือน');
            }

            // ✅ ต้องใช้ filename ไม่ใช่ name
            const imagePath = req.file 
                ? `/upload/complaint/${req.file.filename}` 
                : '/img/no_image.jpg';

            const { complaintMessage, category } = req.body;

            if (!complaintMessage || !category) {
                return res.redirect('/user/complaint?error=กรุณากรอกข้อมูลให้ครบถ้วน');
            }

            const newComplaint = new Complaint({
                family: family._id,
                complaintMessage: complaintMessage.trim(),
                category,
                image: imagePath
            });

            await newComplaint.save();

            res.redirect('/user/complaint?message=ส่งแบบฟอร์มสำเร็จ');

        } catch (err) {
            console.error('Complaint submission error:', err);
            res.redirect('/user/complaint?error=เกิดข้อผิดพลาดในระบบ');
        }
    });
};

// หน้ารายละเอียดข่าวประชามสัมพันธ์
const detailNews = (req, res) => {
    const filter = { isDeleted: false };
    myNews.findById(req.params.id)
        .then(news => {
        if (!news) {
            return res.status(404).send('News not found');
        }
        const formattedNews = {
            ...news._doc,
            formattedDate: moment(news.createdAt).format('YYYY-MM-DD') // Correctly using moment
        };
        res.render('user/detailNews', { news: formattedNews });
    })
    .catch(err => {
        console.error(err);
        res.status(500).send('Error fetching News details');
    });
};


// หน้าโปรไฟล์
const user_profile = async (req, res) => {
    try {
        // ตรวจสอบ session
        if (!req.session || !req.session.username) {
            console.log('No session username');
            return res.redirect('/user/complaint?error=กรุณาเข้าสู่ระบบก่อนทำรายการ');
        }

        // ค้นหาครอบครัวจาก session
        const family = await Family.findOne({ username: req.session.username });

        if (!family) {
            console.log('Family not found');
            return res.redirect('/user/complaint?error=ไม่พบข้อมูลครัวเรือน');
        }

        // รับค่า filter เดือน/ปี จาก query parameter
        const selectedMonth = req.query.month;
        const selectedYear = req.query.year || new Date().getFullYear();
        
        // สร้าง date range สำหรับ filter
        let dateFilter = {};
        if (selectedMonth) {
            const startDate = new Date(selectedYear, selectedMonth - 1, 1);
            const endDate = new Date(selectedYear, selectedMonth, 0, 23, 59, 59);
            dateFilter = {
                $gte: startDate,
                $lte: endDate
            };
        }

        // ดึงสมาชิกในครอบครัว
        const members = await Member.find({ familyID: family._id });

        // ดึงบัญชี WasteBankAccount
        const wasteBankAccount = await WasteBankAccount.findOne({ familyID: family._id });

        // ดึงหมู่บ้าน
        const village = await Village.findById(family.village);

        if (!wasteBankAccount) {
            console.log('No waste bank account');
            return res.redirect('/user/complaint?error=ไม่พบบัญชีธนาคารขยะ');
        }

        // สร้าง query สำหรับการขายขยะ
        let wastePurchaseQuery = {
            accountId: wasteBankAccount._id,
            isDeleted: false
        };

        // เพิ่ม date filter ถ้ามีการเลือกเดือน
        if (selectedMonth) {
            wastePurchaseQuery.purchaseDate = dateFilter;
        }

        // ดึงข้อมูลการขายขยะแบบมี filter หรือไม่มี filter
        const wastePurchases = await WastePurchase.find(wastePurchaseQuery)
            .populate('wasteItems')
            .sort({ purchaseDate: -1 });

        // สร้าง query สำหรับการถอนเงิน
        let transactionQuery = {
            account: wasteBankAccount._id,
            isDeleted: false
        };

        // เพิ่ม date filter ถ้ามีการเลือกเดือน
        if (selectedMonth) {
            transactionQuery.transactionDate = dateFilter;
        }

        // ดึงข้อมูลการถอนเงิน
        const transactions = await transactionMoney.find(transactionQuery)
            .sort({ transactionDate: -1 });

        // รวมรายการเป็น statement
        const statement = [];

        const user = await Family.findOne({ username: req.session.username });

        if (!user) {
            return res.status(404).json({ success: false, message: 'ไม่พบผู้ใช้' });
        }

        const ideas = await Idea.find({ authorId: user._id, isDeleted: false })
            .populate('authorId', 'familyName')
            .populate('comments.author', 'familyName')
            .sort({ createdAt: -1 });

        // รายการขายขยะ (ฝากเงิน)
        wastePurchases.forEach(purchase => {
            statement.push({
                type: 'deposit',
                amount: purchase.totalAmount,
                date: purchase.purchaseDate,
                source: 'ขายขยะ',
                details: `รายการ: ${purchase.wasteItems.length} รายการ`,
            });
        });

        // รายการถอนเงิน
        transactions.forEach(tx => {
            statement.push({
                type: tx.transactionType,
                amount: tx.amount,
                date: tx.transactionDate,
                source: tx.transactionType === 'withdraw' ? 'ถอนเงิน' : 'ฝากเงิน',
                details: tx.note,
                status: tx.status
            });
        });

        // เรียงตามวันที่ใหม่ -> เก่า
        statement.sort((a, b) => new Date(b.date) - new Date(a.date));

        // ดึงข้อมูลคำร้องขายขยะ (ไม่ต้อง filter เพราะเป็นข้อมูลทั่วไป)
        const wasteSaleRequests = await wasteSaleRequest.find({ family: family._id }).populate('waste').sort({ createdAt: -1 });

        // ดึงข้อมูลข้อร้องเรียน (ไม่ต้อง filter เพราะเป็นข้อมูลทั่วไป)
        const complaints = await Complaint.find({ family: family._id }).sort({ createdAt: -1 });

        // คำนวณรายได้รวม / จำนวนรายการขยะ (จากข้อมูลที่ filter แล้ว)
        const totalEarnings = wastePurchases.reduce((sum, purchase) => sum + purchase.totalAmount, 0);
        const totalWasteItems = wastePurchases.reduce((sum, purchase) => sum + (purchase.wasteItems ? purchase.wasteItems.length : 0), 0);

        // สร้างรายการเดือนสำหรับ dropdown
        const monthOptions = [];
        const currentDate = new Date();
        
        // สร้างรายการเดือนย้อนหลัง 12 เดือน
        for (let i = 0; i < 12; i++) {
            const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
            const monthValue = date.getMonth() + 1;
            const yearValue = date.getFullYear();
            const monthName = date.toLocaleDateString('th-TH', { 
                month: 'long', 
                year: 'numeric' 
            });
            
            monthOptions.push({
                value: monthValue,
                year: yearValue,
                name: monthName,
                selected: selectedMonth == monthValue && selectedYear == yearValue
            });
        }

        // ส่งข้อมูลไปยัง view
        res.render('user/profile', {
            familyName: family.familyName,
            username: family.username,
            address: family.address,
            numFamilyMembers: family.NumFamilyMembers,
            members: members,
            village: village,
            wasteBankAccount: wasteBankAccount,
            wastePurchases: wastePurchases,
            complaints: complaints,
            wasteSaleRequests: wasteSaleRequests,
            totalEarnings: totalEarnings,
            totalWasteItems: totalWasteItems,
            role: req.session.role,
            createdAt: family.createdAt,
            statement: statement,
            posts: ideas,
            monthOptions: monthOptions, // ส่งรายการเดือนไปยัง view
            selectedMonth: selectedMonth,
            selectedYear: selectedYear
        });

    } catch (err) {
        console.error('Error fetching data:', err);
        res.status(500).send('เกิดข้อผิดพลาดในการดึงข้อมูล');
    }
};

// ตั้งค่าการอัปโหลดรูปภาพ
const storage2 = multer.diskStorage({
    destination: './public/ideasImg',
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});
const upload2 = multer({ 
    storage: storage2, // ใช้ storage2 แทน storage
    limits: { fileSize: 50 * 1024 * 1024 }
}).single('image');

const user_ideas = async (req, res) => {
    try {
        const user = await Family.findOne({ username: req.session.username });

        const ideas = await Idea.find({ isDeleted: false })
            .populate('authorId', 'familyName')
            .populate('comments.author', 'familyName')
            .sort({ createdAt: -1});

        res.render('user/ideas', {
            posts: ideas,
            user
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

const create_idea = [
    upload2, async (req, res) => {
        try {
            const username = req.session.username; // ดึง username จาก session
            if (!username) {
                return res.status(401).send('Unauthorized');
            }

            // ค้นหา user จาก username (สมมติ Family คือ collection user)
            const user = await Family.findOne({ username: username });
            if (!user) {
                return res.status(404).render('404', { mytitle: 'User not found' });
            }

            const { title, category, content } = req.body;
            // ตรวจสอบรูปภาพที่อัปโหลด
            const imagePath = req.file
                ? `/ideasImg/${req.file.filename}` // ใช้ backticks สำหรับการแทรกค่า
                : 'no_image';

            // สร้าง Idea โดยใช้ user._id เป็น authorId
            await Idea.create({
                authorId: user._id,
                title,
                category,
                content,
                imageUrl: imagePath
            });

            return res.redirect('/user/ideas');
        } catch (error) {
            console.error(error);
            res.status(500).send('Server error');
        }
    }
];
// กดไลค์
const like_idea = async (req, res) => {
    try {
        const idea = await Idea.findById(req.params.id);
        if (!idea) return res.status(404).json({ success: false, message: 'Idea not found' });

        const userId = req.user ? req.user._id.toString() : null;
        if (!userId) return res.status(401).json({ success: false, message: 'Please login to like' });

        const index = idea.likes.findIndex(id => id.toString() === userId);
        if (index === -1) {
        idea.likes.push(userId);
        } else {
        idea.likes.splice(index, 1);
        }
        await idea.save();

        res.json({ success: true, likeCount: idea.likes.length });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false });
    }
};


// คอมเมนต์
const comment_idea = async (req, res) => {
    try {
        const username = req.session.username;
        if (!username) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const user = await Family.findOne({ username });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const { comment } = req.body;
        if (!comment || comment.trim() === '') {
            return res.status(400).json({ success: false, message: 'Comment is required' });
        }

        const idea = await Idea.findById(req.params.id);
        if (!idea) {
            return res.status(404).json({ success: false, message: 'Idea not found' });
        }

        const newComment = {
            author: user._id,
            content: comment.trim(),
            createdAt: new Date()
        };

        idea.comments.push(newComment);
        await idea.save();

        // ดึง comment ล่าสุดพร้อม populate
        await idea.populate('comments.author', 'familyName');
        const lastComment = idea.comments.at(-1);

        res.status(200).json({ success: true, comment: lastComment });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Error posting comment' });
    }
};

const delete_ideas = async (req, res) => {
    try {
        const { id } = req.params;
        const post = await Idea.findById(id);

        if (!post) {
            return res.status(404).json({ success: false, message: 'ไม่พบโพสต์ที่ต้องการลบ' });
        }

        const result = await Idea.findByIdAndUpdate(id, { isDeleted: true });

        if (!result) {
            return res.status(404).json({ success: false, message: 'ไม่สามารถอัปเดตสถานะลบได้' });
        }

        return res.status(200).json({ success: true, message: 'ลบโพสต์สำเร็จ' });
    } catch (err) {
        console.error(err);
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดระหว่างลบ' });
    }
};
const storage4 = multer.diskStorage({
    destination: './public/ideasImg', // โฟลเดอร์เก็บรูป
        filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload4 = multer({ storage: storage4 }).single('image');  // แก้จาก storage2 -> storage4

const edit_idea = (req, res) => {
    upload4(req, res, async (err) => {
        if (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการอัปโหลดไฟล์' });
        }

        try {
            const id = req.params.id;
            const { title, content, category } = req.body;

            if (!title || !content || !category) {
                return res.status(400).json({ success: false, message: 'กรุณากรอกข้อมูลให้ครบ' });
            }

            const post = await Idea.findById(id);
            if (!post) {
                return res.status(404).json({ success: false, message: 'ไม่พบโพสต์' });
            }

            post.title = title;
            post.content = content;
            post.category = category;

            if (req.file) {
                post.imageUrl = `/ideasImg/${req.file.filename}`;
            }

            await post.save();
            res.json({ success: true, message: 'แก้ไขโพสต์เรียบร้อยแล้ว' });
        } catch (err) {
            console.error(err);
            res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' });
        }
    });
};

const notification = async (req, res) => {
  try {
    // หา ObjectId ของผู้ใช้จาก session
    const user = await Family.findOne({ username: req.session.username });
    if (!user) return res.status(404).redirect('/login');

    const userId = user._id;

    // ดึงการแจ้งเตือนทั้งหมดของ user
    const notifications = await Notification.find({ userId }).sort({ createdAt: -1 });
    const notificationUnRead = await Notification.find({ userId, read: false }).sort({ createdAt: -1});
    const notificationUnReadCount = notificationUnRead.length;
    // render หน้า พร้อมส่งข้อมูลไปยัง view
    res.render('user/notification', { notifications, notificationUnReadCount });
  } catch (err) {
    console.error(err);
    res.status(500).send('เกิดข้อผิดพลาดในการโหลดการแจ้งเตือน');
  }
};
const notificationPost = async (req, res) => {
  try {
    const { type, title, content, link, targetType, userIds } = req.body;

    if (!title || !content) {
      return res.status(400).json({ message: 'กรุณากรอก title และ content' });
    }

    let targetUsers = [];

    if (targetType === 'all') {
      const users = await Family.find({}, '_id');
      targetUsers = users.map(u => u._id.toString());
    } else if (userIds) {
      const users = await Family.find({ username: { $in: userIds.split(',').map(u => u.trim()) } }, '_id');
      targetUsers = users.map(u => u._id.toString());
    }

    if (targetUsers.length === 0) {
      return res.status(400).json({ message: 'ไม่พบผู้ใช้เป้าหมาย' });
    }

    const notifications = targetUsers.map(userId => ({
      userId,
      type: type,
      title,
      content,
      link: link || null,
      read: false,
      createdAt: new Date()
    }));

    await Notification.insertMany(notifications);

    // res.json({ message: `✅ ส่งแจ้งเตือนสำเร็จ ${notifications.length} คน` });
    res.redirect(`/user/notification`)
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "❌ เกิดข้อผิดพลาดในการส่งแจ้งเตือน", error: err.message });
  }
};

// ดึงข้อมูลแจ้งเตือนตาม id
const markNotificationAsRead = async (req, res) => {
    try {
        const notification = await Notification.findById(req.params.id);
        if (!notification) return res.status(404).json({ success: false, message: 'Notification not found' });

        // ดึง userId จาก session แทน req.user
        const username = req.session.username;
        if (!username) return res.status(401).json({ success: false, message: 'Please login first' });

        const user = await Family.findOne({ username });
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        const userId = user._id.toString();

        if (notification.userId.toString() !== userId) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        notification.read = true;
        await notification.save();

        res.json({ success: true, read: notification.read });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
// exports เพื่อให้ไฟล์อื่นสามารถเรียกใช้งานได้
module.exports = {
    user_index,
    user_wastetype,
    user_knowledge,
    user_saleHistory,
    user_wasteSaleRequest, wasteSaleRequestPost,
    user_contact,
    user_allActivity,user_detailActivity,
    user_complaint,complaintPost,
    detailNews,
    user_profile,
    user_wastePrices,
    user_ideas,
    create_idea,
    like_idea,    
    comment_idea,
    delete_ideas,
    edit_idea,
    notification,
    notificationPost,
    markNotificationAsRead
}