const express = require('express');
const router = express.Router();
const multer = require('multer');
const myMedia = require('../models/media');
const myActivity = require('../models/activity');
const myWaste = require('../models/waste');
const myWasteType = require('../models/wastetype');
const path = require('path');
const moment = require('moment');

// user_index
const user_index = (req, res) => {
    Promise.all([
        myActivity.find().sort({ createdAt: -1 }), // ดึงข้อมูลกิจกรรม
        myWaste.find().sort({ createdAt: 1 }) // ดึงข้อมูลขยะ
    ])
        .then(([activitiesResult, wasteResult]) => {
            // แปลงวันที่ในกิจกรรม
            const activities = activitiesResult.map(activity => ({
                ...activity._doc, // ดึงข้อมูลทั้งหมดในเอกสาร
                formattedDate: moment(activity.createdAt).format('YYYY-MM-DD') // เพิ่มฟิลด์ formattedDate
            }));

            res.render('user/main', { 
                mytitle: 'Admindashboard | Activity', 
                activity: activities, 
                waste: wasteResult // ส่งข้อมูล myWaste โดยตรงไปยัง view
            });
        })
        .catch((err) => {
            console.log(err);
        });
};

// user_typewaste
const user_wastetype = (req, res)=> {
    Promise.all([
        myWaste.find().populate('wasteType', 'wasteTypeName'), // Populate wasteType with wasteTypeName
        myWasteType.find()
    ])
    .then(([wasteData, wasteTypeData]) => {
        res.render('user/wastetype', {
            mytitle: 'Admindashboard | Waste',
            waste: wasteData,
            wasteTypes: wasteTypeData
        });
    })
    .catch((err) => {
        console.log(err);
    });
}

// user_knowledge
const user_knowledge = (req, res) => {
    myMedia.find().sort({ createdAt: -1 })
        .then((result) => {
            res.render('user/knowledge', { mytitle: 'Admindashboard | Media', media: result});
        })
        .catch((err) => {
            console.log(err);
        });
};


// user_saleHistory
const user_saleHistory = (req, res)=> {
    res.render('user/saleHistory')
}

// user_contact
const user_contact = (req, res)=> {
    res.render('user/contact')
}

// user_allActivity
const user_allActivity = (req, res) => {
    myActivity.find().sort({ createdAt: -1 })
        .then((result) => {
            // แปลงวันที่ในแต่ละกิจกรรม
            const activities = result.map(activity => ({
                ...activity._doc, // ดึงข้อมูลทั้งหมดในเอกสาร
                formattedDate: moment(activity.createdAt).format('YYYY-MM-DD') // เพิ่มฟิลด์ formattedDate
            }));

            res.render('user/allActivity', { 
                mytitle: 'Admindashboard | Activity', 
                activity: activities 
            });
        })
        .catch((err) => {
            console.log(err);
        });
};

const user_detailActivity = async (req, res) => {
    try {
        const activity = await myActivity.findById(req.params.id); // Fetch activity by ID
        if (!activity) {
            return res.status(404).send('Activity not found');
        }
        res.render('user/detailActivity', { activity }); // Render activityDetail.ejs
    } catch (err) {
        console.error(err);
        res.status(500).send('Error fetching activity details');
    }
};

// exports เพื่อให้ไฟล์อื่นสามารถเรียกใช้งานได้
module.exports = {
    user_index,
    user_wastetype,
    user_knowledge,
    user_saleHistory,
    user_contact,
    user_allActivity,
    user_detailActivity
}