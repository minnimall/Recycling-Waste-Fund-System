const express = require('express');
const router = express.Router();
const multer = require('multer');
const myMedia = require('../models/media');
const MyAdmin = require('../models/admin');
const myWasteType = require('../models/wastetype');
const path = require('path');


router.use(express.static(path.join(__dirname, '../public')));

const storage = multer.diskStorage({
    destination: './public/uploads/media/',
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage }).single('img'); // รับเฉพาะไฟล์เดียวจากฟิลด์ 'img'
const mediaIndex = (req, res)=> {
    myMedia.find().sort( {createdAt: -1} )
    .then((result)=> {
        res.render('admin/media', { mytitle: 'Admindashboard | Medie', media: result })
    })
    .catch((err) => {
        console.log(err)
    })
}
const mediaPost = (req, res) => {
    upload(req, res, (err) => {
        if (err) {
            console.error('Error uploading file:', err);
            return res.status(400).send({ error: 'File upload failed', details: err });
        }

        // ตรวจสอบว่ามีไฟล์อัปโหลดหรือไม่
        const imagePath = req.file
            ? `uploads/media/${req.file.filename}`
            : `img/no_image.jpg`;

        const media = new myMedia({
            title: req.body.title || 'Untitled',
            content: req.body.content || '',
            img: imagePath
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
    });
};

const newsIndex = (req, res)=> {
    res.render('admin/news', { mytitle: 'Admindashboard | News'})
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

// WASTETYPE
const wasteTypeIndex = (req, res)=> {
    myWasteType.find().sort({ createdAt: 1 })
    .then((result) => {
        res.render('admin/wasteType', { mytitle: 'Admindashboard | WasteType', wastetype: result})
    })
    .catch((err) => {
        console.log(err);
    });
}

// const wasteTypePost = (req, res) => {
//     const wasteType = new myWasteType({
//         wasteTypeId: req.body.wasteTypeId || 'Untitled',
//         wasteTypeName: req.body.wasteTypeName || ''
//     });

//     console.log('wasteType to save:', wasteType);

//     wasteType.save()
        // .then((result) => {
        //     console.log('wasteType saved successfully:', result);
        //     res.redirect('/admin/wasteType');
        // })
        // .catch((err) => {
        //     console.error('Error saving media:', err);
        //     res.status(500).send('Error saving media');
        // });
// };

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


const wastePriceIndex = (req, res)=> {
    res.render('admin/wastePrice', { mytitle: 'Admindashboard | WasteType'})
}

const RoundIndex = (req, res)=> {
    res.render('admin/round', { mytitle: 'Admindashboard | Round'})
}
module.exports = {
    mediaIndex,
    mediaPost,
    newsIndex,
    employeeIndex,
    wasteTypeIndex,
    wasteTypePost,
    wastePriceIndex,
    RoundIndex
}
