const express = require('express');
const router = express.Router();
const multer = require('multer');
const myMedia = require('../models/media');
const MyAdmin = require('../models/admin');
const myWasteType = require('../models/wastetype');
const myNews = require('../models/news');
const myActivity = require('../models/activity');
const path = require('path');

router.use(express.static(path.join(__dirname, '../public')));

// สื่อ
const mediaIndex = (req, res) => {
    myMedia.find().sort({ createdAt: -1 })
        .then((result) => {
            res.render('admin/media', { mytitle: 'Admindashboard | Media', media: result })
        })
        .catch((err) => {
            console.log(err)
        })
}
const mediaPost = (req, res) => {
    const { title, youtubeUrl } = req.body;

    // ตรวจสอบว่า youtubeUrl มีค่าและมี URL ของ YouTube
    const validYoutubeUrl = youtubeUrl && youtubeUrl.includes('youtube.com/watch?v=');

    // ถ้ามี YouTube URL ที่ถูกต้อง ให้แยก video ID
    const videoId = validYoutubeUrl ? youtubeUrl.split('v=')[1].split('&')[0] : '';

    // สร้าง media ใหม่
    const media = new myMedia({
        title: title || 'Untitled',
        youtubeUrl: videoId, // บันทึกแค่ video ID
    });

    console.log('Media to save:', media);

    media.save()
        .then((result) => {
            console.log('Media saved successfully:', result);
            res.redirect('/admin');
        })
        .catch((err) => {
            console.error('Error saving media:', err);
            res.status(500).send('Error saving media');
        });
};


// ข่าวสาร
const newsIndex = (req, res) => {
    myNews.find().sort({ createdAt: -1 })
        .then((result) => {
            res.render('admin/news', { mytitle: 'Admindashboard | News', news: result });
        })
        .catch((err) => {
            console.log(err);
        });
};
const newsPost = async (req, res) => {
    try {
        const { activityTitle, activityDetails } = req.body;

        // ตรวจสอบข้อมูลที่ได้จากฟอร์ม
        if (!activityTitle || !activityDetails) {
            return res.status(400).send('กรุณากรอกข้อมูลให้ครบถ้วน');
        }

        // สร้างกิจกรรมใหม่
        const news = new myNews({
            activityTitle,
            activityDetails
        });

        // บันทึกข้อมูลในฐานข้อมูล
        const result = await news.save();
        console.log('News saved successfully:', result);

        // เปลี่ยนเส้นทางหลังบันทึกข้อมูลสำเร็จ
        res.redirect('/admin/news');
    } catch (error) {
        console.error('เกิดข้อผิดพลาดในการบันทึกกิจกรรม:', error);
        res.status(500).send('เกิดข้อผิดพลาด');
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
const activityIndex = (req, res)=> {
    myActivity.find().sort( {createdAt: -1} )
    .then((result)=> {
        res.render('admin/activity', { mytitle: 'Admindashboard | Activity', activity: result })
    })
    .catch((err) => {
        console.log(err)
    })
}
const activityPost = (req, res) => {
    upload(req, res, (err) => {
        if (err) {
            console.error('Error uploading file:', err);
            return res.status(400).send({ error: 'File upload failed', details: err });
        }

        // Check for uploaded file
        const imagePath = req.file
            ? `/uploads/activity/${req.file.filename}` // Use backticks for dynamic strings
            : '/img/no_image.jpg';

        const activity = new myActivity({
            title: req.body.title || 'Untitled',
            content: req.body.content || '',
            img: imagePath
        });

        activity.save()
            .then((result) => {
                console.log('Activity saved successfully:', result);
                res.redirect('/admin/activity');
            })
            .catch((err) => {
                console.error('Error saving activity:', err);
                res.status(500).send('Error saving activity');
            });
    });
};


// ขยะ
const wasteIndex = (req, res)=> {
    res.render('admin/waste', { mytitle: 'Admindashboard | Waste'})
}

// ประเภทขยะ
const wasteTypeIndex = (req, res)=> {
    myWasteType.find().sort({ createdAt: 1 })
    .then((result) => {
        res.render('admin/wasteType', { mytitle: 'Admindashboard | WasteType', wastetype: result})
    })
    .catch((err) => {
        console.log(err);
    });
}

const wasteTypePost = async (req, res) => {
    try {
        console.log('Request Body:', req.body);

        const wasteTypeId = req.body.wasteTypeId.trim();
        const wasteTypeName = req.body.wasteTypeName;

        if (!wasteTypeId || !wasteTypeName) {
            console.log('Missing required fields');
            return res.status(400).send('กรุณากรอกข้อมูลให้ครบถ้วน');
        }

        const wasteType = new myWasteType({ wasteTypeId, wasteTypeName });

        const result = await wasteType.save();
        console.log('WasteType saved successfully:', result);

        res.redirect('/admin/wasteType');
    } catch (err) {
        console.error('Error saving WasteType:', err);
        res.redirect('/admin/wasteType?error=เกิดข้อผิดพลาดในระบบ');
    }
};

// ราคาขยะ
const wastePriceIndex = (req, res)=> {
    res.render('admin/wastePrice', { mytitle: 'Admindashboard | WastePrice'})
}

//หน้า employee
const employeeIndex = (req, res)=> {
    MyAdmin.find().sort({ createdAt: 1 })
    .then((result) => {
        res.render('admin/employee', { mytitle: 'Admindashboard | Employee', emp: result });
    })
    .catch((err) => {
        console.log(err);
    });
}

const RoundIndex = (req, res)=> {
    res.render('admin/round', { mytitle: 'Admindashboard | Round'})
}

module.exports = {
    mediaIndex,
    mediaPost,
    newsIndex,
    newsPost,
    employeeIndex,
    wasteTypeIndex,
    wasteTypePost,
    wastePriceIndex,
    RoundIndex,
    wasteIndex,
    activityIndex,
    activityPost
}
