const express = require('express');
const router = express.Router();
const multer = require('multer');
const myMedia = require('../models/media');
const myActivity = require('../models/activity');
const myWaste = require('../models/waste');
const myWasteType = require('../models/wastetype');
const Village = require('../models/village');
const Round = require('../models/round');
const path = require('path');
const moment = require('moment');

// หน้าหลัก
const formatDate = (date) => moment(date).locale('th').format('ddddที่ D MMMM YYYY');

const user_index = async (req, res) => {
    try {
        const [activitiesResult, wasteResult, villageResult, roundResult] = await Promise.all([
            myActivity.find().sort({ createdAt: -1 }),
            myWaste.find().sort({ createdAt: 1 }),
            Village.find().sort({ villageNumber: 1 }),
            Round.find().populate('village').sort({ date: 1 })
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
            roundsByVillage
        });
    } catch (err) {
        console.log(err);
        res.status(500).send("เกิดข้อผิดพลาดในการโหลดข้อมูล");
    }
};

// หน้าประเภทขยะ
const user_wastetype = (req, res) => {
    const wasteTypeFilter = req.query.wasteType;

    // ถ้าไม่มีการเลือกประเภทขยะ (wasteTypeFilter) จะดึงข้อมูลทั้งหมด
    Promise.all([
        myWaste.find(wasteTypeFilter ? { wasteType: wasteTypeFilter } : {}).populate('wasteType', 'wasteTypeName'),
        myWasteType.find()
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
    });
};


// หน้าสื่อความรู้
const user_knowledge = (req, res) => {
    myMedia.find().sort({ createdAt: -1 })
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

// หน้าข้อมูลติดต่อ
const user_wasteSaleRequest = (req, res)=> {
    res.render('user/wasteSaleRequest')
}

// หน้าข้อมูลติดต่อ
const user_contact = (req, res)=> {
    res.render('user/contact')
}

// หน้ากิจกรรมทั้งหมด
const user_allActivity = (req, res) => {
    // รับค่าคำค้นหาจาก query parameter
    const searchQuery = req.query.search?.trim() || "";  // ถ้าไม่มีคำค้นหาก็จะเป็นค่าว่าง
    // สร้าง query สำหรับการค้นหากิจกรรม
    let query = {};
    // ถ้ามีคำค้นหา ก็กรองตามชื่อกิจกรรม (title)
    if (searchQuery) {
        query.title = { $regex: new RegExp(searchQuery, "i") }; // ใช้ RegExp สำหรับการค้นหาแบบไม่สนใจตัวพิมพ์ใหญ่/เล็ก
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
                mytitle: 'Admindashboard | Activity', 
                activity: activities,
                search: searchQuery // ส่งคำค้นหากลับไปยังฟอร์มค้นหาด้วย
            });
        })
        .catch((err) => {
            console.log(err);
        });
};

// หน้ารายละเอียดกิจกรรม
const user_detailActivity = (req, res) => {
    // ค้นหากิจกรรมที่เลือกโดยใช้ ID
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

            myActivity.find().sort({ createdAt: -1 })
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

// exports เพื่อให้ไฟล์อื่นสามารถเรียกใช้งานได้
module.exports = {
    user_index,
    user_wastetype,
    user_knowledge,
    user_saleHistory,
    user_wasteSaleRequest,
    user_contact,
    user_allActivity,user_detailActivity
}