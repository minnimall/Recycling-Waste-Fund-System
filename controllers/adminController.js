const express = require('express');
const router = express.Router();
const multer = require('multer');
const myMedia = require('../models/media');
const MyAdmin = require('../models/admin');
const myWaste= require('../models/waste');
const myWasteType = require('../models/wastetype');
const myNews = require('../models/news');
const myActivity = require('../models/activity');
const path = require('path');

router.use(express.static(path.join(__dirname, '../public')));

//แดชบอร์ด
const dashboardIndex = (req, res)=> {
    res.render('admin/dashboard', { mytitle: 'Admindashboard | Dashboard'})
}

// สื่อ
const mediaIndex = (req, res) => {
    myMedia.find().sort({ createdAt: -1 })
        .then((result) => {
            res.render('admin/media', { mytitle: 'Admindashboard | Media', media: result});
        })
        .catch((err) => {
            console.log(err);
        });
};
//เพิ่มสื่อ
const mediaPost = (req, res) => {
    const { title, youtubeUrl } = req.body;

    // ตรวจสอบว่า youtubeUrl มีค่าและมี URL ของ YouTube
    const validYoutubeUrl = youtubeUrl && youtubeUrl.includes('youtube.com/watch?v=');

    // สร้าง media ใหม่ โดยเก็บ youtubeUrl แบบเต็มๆ
    const media = new myMedia({
        title: title || 'Untitled',
        youtubeUrl: validYoutubeUrl ? youtubeUrl : '', // บันทึก URL เต็มๆ ถ้า valid
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
//ลบสื่อ
const mediaDelete = (req, res) => {
    const id = req.params.id; // รับ ID จาก URL

    myMedia.findByIdAndDelete(id)
        .then((result) => {
            console.log(`Media with ID ${id} deleted successfully.`);
            res.redirect('/admin'); // เปลี่ยนเส้นทางกลับไปยังหน้าแสดงสื่อ
        })
        .catch((err) => {
            console.error('Error deleting media:', err);
            res.status(500).send('Error deleting media');
        });
};
//แก้ไข
const mediaEdit = (req, res) => {
    const { title, youtubeUrl } = req.body;
    const mediaId = req.params.id;

    myMedia.findByIdAndUpdate(mediaId, { title, youtubeUrl })
        .then(result => {
            res.redirect('/admin'); // เปลี่ยนเส้นทางกลับไปยังหน้าแสดงสื่อ
        })
        .catch(err => {
            console.log(err);
            res.status(500).send('Error updating media');
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
//เพิ่มกิจกรรม
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
//ลบกิจกรรม
const deleteActivity = (req, res) => {
    const id = req.params.id;

    myActivity.findByIdAndDelete(id)
        .then(() => {
            console.log(`Activity with ID ${id} has been deleted.`);
            res.redirect('/admin/activity');
        })
        .catch(err => {
            console.error(err);
            res.status(500).send('เกิดข้อผิดพลาดในการลบข้อมูลกิจกรรม');
        });
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
                res.redirect('/admin/activity');
            })
            .catch((err) => {
                console.error('Error updating activity:', err);
                res.status(500).send('Error updating activity');
            });
    });
};




// สำหรับเก็บรูปภาพที่อัปโหลดจาก waste
const storage2 = multer.diskStorage({
    destination: './public/upload_imgwaste',
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});
const upload2 = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 }
}).single('img');

// ขยะ
const wasteIndex = (req, res) => {
    // Fetch both waste and waste types
    Promise.all([
        myWaste.find().sort({ createdAt: -1 }),  // Waste data
        myWasteType.find()  // WasteType data
    ])
    .then(([wasteData, wasteTypeData]) => {
        res.render('admin/waste', {
            mytitle: 'Admindashboard | Waste',
            waste: wasteData,
            wasteTypes: wasteTypeData  // Passing the waste types to the view
        });
    })
    .catch((err) => {
        console.log(err);
    });
};
const wastePost = async (req, res) => {
    try {
        upload.single('img')(req, res, async (err) => {
            if (err) {
                return res.status(400).send('Error in file upload');
            }

            // Extract form data
            const { wasteName, pricePerUnit, wasteType } = req.body;
            const img = req.file ? req.file.path : null; // Save the path of the uploaded image

            if (!wasteName || !pricePerUnit || !wasteType) {
                return res.status(400).send('กรุณากรอกข้อมูลให้ครบถ้วน');
            }

            // Check if the wasteType exists in the WasteType collection
            const wasteTypeDoc = await myWasteType.findById(wasteType);
            if (!wasteTypeDoc) {
                return res.status(400).send('ประเภทขยะไม่ถูกต้อง');
            }

            // Create new Waste record
            const newWaste = new myWaste({
                wasteName,
                pricePerUnit,
                wasteType: wasteTypeDoc._id,
                img
            });

            // Save the record to the database
            const savedWaste = await newWaste.save();
            console.log('Waste saved successfully:', savedWaste);

            res.redirect('/admin/waste'); // Redirect to the waste list page after saving
        });
    } catch (err) {
        console.error('Error saving waste:', err);
        res.redirect('/admin/waste?error=เกิดข้อผิดพลาดในระบบ');
    }
};

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
//เพิ่มประเภทขยะ
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
//ลบประเภทขยะ
const deletewasteType = (req, res) => {
    const id = req.params.id;

    myWasteType.findByIdAndDelete(id)
        .then(() => {
            console.log(`wasteType with ID ${id} has been deleted.`);
            res.redirect('/admin/wasteType');
        })
        .catch(err => {
            console.error(err);
            res.status(500).send('เกิดข้อผิดพลาดในการลบข้อมูลประเภทขยะ');
        });
};


//หน้า employee(พนักงาน)
const employeeIndex = (req, res)=> {
    MyAdmin.find().sort({ createdAt: 1 })
    .then((result) => {
        res.render('admin/employee', { mytitle: 'Admindashboard | Employee', emp: result });
    })
    .catch((err) => {
        console.log(err);
    });
}
//ลบพนักงาน
const employeeDelete = (req, res) => {
    const id = req.params.id;

    MyAdmin.findByIdAndDelete(id)
        .then(() => {
            console.log(`Employee with ID ${id} has been deleted.`);
            res.redirect('/admin/employee'); // เปลี่ยนเส้นทางกลับไปยังหน้ารายการพนักงาน
        })
        .catch(err => {
            console.error(err);
            res.status(500).send('เกิดข้อผิดพลาดในการลบข้อมูลพนักงาน');
        });
};


const RoundIndex = (req, res)=> {
    res.render('admin/round', { mytitle: 'Admindashboard | Round'})
}

module.exports = {
    //แดชบอร์ด
    dashboardIndex,
    //สื่อ
    mediaIndex,mediaPost,mediaEdit,mediaDelete,
    //ข่าวสาร
    newsIndex,newsPost,
    //กิจกรรม
    activityIndex,activityPost,activityEdit,deleteActivity,
    //ขยะ
    wasteIndex,wastePost,
    //ประเภทขยะ
    wasteTypeIndex,wasteTypePost,deletewasteType,
    //พนักงาน
    employeeIndex,employeeDelete,
    //รอบการรับซื้อขยะ
    RoundIndex,
}
