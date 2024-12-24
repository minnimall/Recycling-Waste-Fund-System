const myMedia = require('../models/media')
const multer = require('multer');
const storage = multer.diskStorage({
    destination: './public/uploads/media/',
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage }).single('image'); // รับเฉพาะไฟล์เดียวจากฟิลด์ 'image'
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
            res.status(400).send({ err });
        } else {
            let imagePath = req.file ? `uploads/news/${req.file.filename}` : `img/no_image.jpg`;

            const media = new myMedia({
                title: req.body.title,
                content: req.body.content,
                img: imagePath
            });
            // เพิ่มการแสดงค่า postNews ก่อนบันทึก
            console.log('Media to save:', media);

            media.save()
                .then((result)=> {
                    res.redirect('/admin')
                })
                .catch((err)=> {
                    console.log(err)
                })
        }
    });
}

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
