const express = require('express');
const router = express.Router();
const multer = require('multer');
const myMedia = require('../models/media');
const myActivity = require('../models/activity');
const myWaste = require('../models/waste');
const myWasteType = require('../models/wastetype');
const Village = require('../models/village');
const Round = require('../models/round');
const wasteSaleRequest = require('../models/wasteSaleRequest');
const Family = require('../models/family');
const path = require('path');
const moment = require('moment');

// หน้าหลัก
const formatDate = (date) => moment(date).locale('th').format('ddddที่ D MMMM YYYY');

const user_index = async (req, res) => {
    const filter = { isDeleted: false };
    try {
        const [activitiesResult, wasteResult, villageResult, roundResult] = await Promise.all([
            myActivity.find(filter).sort({ createdAt: -1 }),
            myWaste.find(filter).sort({ createdAt: 1 }),
            Village.find(filter).sort({ villageNumber: 1 }),
            Round.find(filter).populate('village').sort({ date: 1 })
        ]);

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
                formattedDateYYMMDD: new Date(round.date).toISOString().split('T')[0], // รูปแบบ YY-MM-DD
                formattedDateThai: formatDate(round.date), // วันที่ภาษาไทย
                startTime,
                endTime,
                isActive
            };
            return acc;
        }, {});

        res.render('user/main', { 
            mytitle: 'Admindashboard | Activity', 
            activity: activitiesResult, 
            waste: wasteResult,
            village: villageResult,
            roundsByVillage,
            moment: moment
        });
    } catch (err) {
        console.log(err);
        res.status(500).send("เกิดข้อผิดพลาดในการโหลดข้อมูล");
    }
};

// หน้าประเภทขยะ
const user_wastetype = (req, res) => {
    const wasteTypeFilter = req.query.wasteType;

    Promise.all([
        myWaste.find({
            ...(wasteTypeFilter ? { wasteType: wasteTypeFilter } : {}), 
            isDeleted: false // กรองเฉพาะขยะที่ isDeleted: false
        }).populate('wasteType', 'wasteTypeName'),

        myWasteType.find({ isDeleted: false })
    ])
    .then(([wasteData, wasteTypeData]) => {
        res.render('user/wastetype', {
            mytitle: 'Admindashboard | Waste',
            waste: wasteData,
            wasteTypes: wasteTypeData,
            selectedWasteType: wasteTypeFilter // ส่งค่าประเภทขยะที่ถูกเลือกกลับไปเพื่อแสดงใน select
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
        return res.status(401).send('กรุณาเข้าสู่ระบบก่อนทำรายการ');
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

// หน้าโปรไฟล์
const user_profile = (req, res)=> {
    res.render('user/profile')
}

// exports เพื่อให้ไฟล์อื่นสามารถเรียกใช้งานได้
module.exports = {
    user_index,
    user_wastetype,
    user_knowledge,
    user_saleHistory,
    user_wasteSaleRequest, wasteSaleRequestPost,
    user_contact,
    user_allActivity,user_detailActivity,
    user_profile
}