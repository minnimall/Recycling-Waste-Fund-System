const express = require('express');
const router = express.Router();
const multer = require('multer');
const myMedia = require('../models/media');
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

const employeeIndex = (req, res)=> {
    res.render('admin/employee', { mytitle: 'Admindashboard | Employee'})
}

const wasteTypeIndex = (req, res)=> {
    res.render('admin/wasteType', { mytitle: 'Admindashboard | WasteType'})
}

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
    wastePriceIndex,
    RoundIndex
}
