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
const path = require('path');
const moment = require('moment');

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

        res.render('user/main', {
            mytitle: 'Admindashboard | Activity',
            activity: activitiesResult,
            waste: wasteWithChange,
            village: villageResult,
            roundsByVillage,
            moment: moment,
            news: newsResult,
            latestPriceUpdateDate
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
                const { waste, weight, date, location } = req.body;

                if (!waste || waste.length === 0) {
                    res.redirect('/user/wasteSaleRequest?error=กรุณาเลือกขยะที่ต้องการขาย');
                }

                // สร้างการแจ้งความประสงค์ขายขยะ
                const newSaleRequest = new wasteSaleRequest({
                    waste: Array.isArray(waste) ? waste : [waste], 
                    weight: weight ? parseFloat(weight) : undefined, 
                    date: new Date(date),
                    location,
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
const user_contact = (req, res)=> {
    res.render('user/contact')
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

// หน้าคำร้องเรียน
const user_complaint = (req, res)=> {
    res.render('user/complaint')
}

const complaintPost = async (req, res) => {
    try {
        // ตรวจสอบ session
        if (!req.session || !req.session.username) {
            console.log('No session username');
            return res.redirect('/user/complaint?error=กรุณาเข้าสู่ระบบก่อนทำรายการ');
        }

        // ค้นหาครอบครัว
        const family = await Family.findOne({ username: req.session.username });
        
        if (!family) {
            console.log('Family not found');
            return res.redirect('/user/complaint?error=ไม่พบข้อมูลครัวเรือน');
        }

        // ตรวจสอบข้อความร้องเรียน
        const complaintMessage = req.body.complaintMessage 
            ? req.body.complaintMessage.trim() 
            : '';

        console.log('Processed Complaint Message:', complaintMessage);

        if (!complaintMessage) {
            console.log('Empty complaint message');
            return res.redirect('/user/complaint?error=กรุณากรอกข้อร้องเรียนหรือข้อเสนอแนะ');
        }

        const newComplaint = new Complaint({
            family: family._id,
            complaintMessage: complaintMessage
        });

        await newComplaint.save();

        res.redirect('/user/complaint?message=ส่งแบบฟอร์มสำเร็จ');

    } catch (err) {
        console.error('Complaint submission FULL ERROR:', err);
        res.redirect('/user/complaint?error=เกิดข้อผิดพลาดในระบบ');
    }
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

        // ค้นหาครอบครัว
        const family = await Family.findOne({ username: req.session.username });

        if (!family) {
            console.log('Family not found');
            return res.redirect('/user/complaint?error=ไม่พบข้อมูลครัวเรือน');
        }

        // ดึงข้อมูลสมาชิกของครอบครัว
        const members = await Member.find({ familyID: family._id });

        // ดึงข้อมูลบัญชีธนาคารขยะของครอบครัว
        const wasteBankAccount = await WasteBankAccount.findOne({ familyID: family._id });

        // ดึงข้อมูลการซื้อขยะพร้อม populate wasteItems
        const wastePurchases = await WastePurchase.find({ 
            accountId: wasteBankAccount._id,
            isDeleted: false
        }).populate('wasteItems').sort({ purchaseDate: -1 });

        // ดึงข้อมูลข้อร้องเรียนที่เกี่ยวข้องกับครอบครัว
        const complaints = await Complaint.find({ family: family._id });

        // ดึงข้อมูลคำร้องขอขายขยะ
        const wasteSaleRequests = await wasteSaleRequest.find({ family: family._id }).populate('waste');

        // คำนวณสถิติเพิ่มเติม
        const totalEarnings = wastePurchases.reduce((sum, purchase) => sum + purchase.totalAmount, 0);
        const totalWasteItems = wastePurchases.reduce((sum, purchase) => sum + (purchase.wasteItems ? purchase.wasteItems.length : 0), 0);

        res.render('user/profile', {
            familyName: family.familyName,
            username: family.username,
            address: family.address,
            numFamilyMembers: family.NumFamilyMembers,
            members: members,
            wasteBankAccount: wasteBankAccount,
            wastePurchases: wastePurchases, // ตอนนี้จะมี wasteItems แล้ว
            complaints: complaints,
            wasteSaleRequests: wasteSaleRequests,
            totalEarnings: totalEarnings, // รายได้รวม
            totalWasteItems: totalWasteItems, // จำนวนขยะรวม
            role: req.session.role,
            createdAt: family.createdAt,
        });
    } catch (err) {
        console.error('Error fetching data:', err);
        res.status(500).send('เกิดข้อผิดพลาดในการดึงข้อมูล');
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
    user_wastePrices
}