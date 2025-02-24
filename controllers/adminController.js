const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
const multer = require('multer');
const myMedia = require('../models/media');
const MyAdmin = require('../models/admin');
const myWaste= require('../models/waste');
const myWasteType = require('../models/wastetype');
const myNews = require('../models/news');
const myActivity = require('../models/activity');
const Village = require('../models/village')
const Round = require('../models/round');
const path = require('path');
const bcrypt = require('bcryptjs');
const moment = require('moment');

router.use(express.static(path.join(__dirname, '../public')));

router.use(bodyParser.json({ limit: '10mb' }));  // เพิ่มขนาด payload สูงสุด 10MB
router.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

router.post('/upload-image', (req, res) => {
    // โค้ดสำหรับจัดการการอัพโหลด
    res.send('ไฟล์ถูกอัพโหลด');
});

//แดชบอร์ด
const dashboardIndex = (req, res)=> {
    res.render('admin/dashboard', { mytitle: 'Admindashboard | Dashboard'})
}

// สื่อ
const mediaIndex = (req, res) => {
    const searchQuery = req.query.search || ''; // ดึงค่าคำค้นหาจาก query string
    const filter = searchQuery ? { title: { $regex: searchQuery, $options: 'i' } } : {}; // ใช้ regex เพื่อค้นหาตรงกับคำค้นหาหรือไม่

    myMedia.find(filter).sort({ createdAt: -1 })
        .then((result) => {
            result.forEach(item => {
                item.formattedDate = moment(item.createdAt).format('YYYY-MM-DD');
            });
            res.render('admin/media', { mytitle: 'Admindashboard | Media', media: result,searchQuery: searchQuery });
        })
        .catch((err) => {
            console.log(err);
        });
};
// เพิ่มสื่อ
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
            res.redirect('/admin?message=เพิ่มสื่อความรู้สำเร็จ');
        })
        .catch((err) => {
            console.error('Error saving media:', err);
            res.status(500).redirect('/admin?error=เพิ่มสื่อความรู้ไม่สำเร็จ');
        });
};
// ลบสื่อ
const mediaDelete = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await myMedia.findByIdAndDelete(id);

        if (!result) {
            return res.status(404).redirect('/admin?message=ไม่พบข้อมูลสื่อความรู้ที่ต้องการลบ');
        }
        res.redirect('/admin?message=ลบสื่อความรู้สำเร็จ');
    } catch (err) {
        console.error('Error deleting media:', err);
        res.status(500).redirect('/admin?message=เกิดข้อผิดพลาดในการลบข้อมูลสื่อความรู้');
    }
};
// แก้ไขสื่อ
const mediaEdit = (req, res) => {
    const { title, youtubeUrl } = req.body;
    const mediaId = req.params.id;

    myMedia.findByIdAndUpdate(mediaId, { title, youtubeUrl })
        .then(result => {
            res.redirect('/admin?message=แก้ไขสื่อความรู้สำเร็จ'); // เปลี่ยนเส้นทางกลับไปยังหน้าแสดงสื่อ
            
        })
        .catch(err => {
            console.log(err);
            res.status(500).redirect('/admin?error=ลบสื่อความรู้ไม่สำเร็จ');
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
        const { activityTitle, activityDetails ,activityDescription} = req.body;

        // ตรวจสอบข้อมูลที่ได้จากฟอร์ม
        if (!activityTitle || !activityDetails || !activityDescription) {
            return res.status(400).send('กรุณากรอกข้อมูลให้ครบถ้วน');
        }

        // สร้างกิจกรรมใหม่
        const news = new myNews({
            activityTitle,
            activityDescription,
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
const activityIndex = (req, res) => {
    const searchQuery = req.query.search || ''; // ดึงค่าคำค้นหาจาก query string
    const filter = searchQuery ? { title: { $regex: searchQuery, $options: 'i' } } : {}; // ใช้ regex เพื่อค้นหาตรงกับคำค้นหาหรือไม่

    myActivity.find(filter).sort({ createdAt: -1 })
        .then((result) => {
            result.forEach(item => {
                item.formattedDate = moment(item.createdAt).format('YYYY-MM-DD');
            });
            res.render('admin/activity', { mytitle: 'Admindashboard | Activity', activity: result, searchQuery: searchQuery });
        })
        .catch((err) => {
            console.log(err);
        });
};

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
                res.redirect('/admin/activity?message=เพิ่มกิจกรรมสำเร็จ');
            })
            .catch((err) => {
                console.error('Error saving activity:', err);
                res.status(500).redirect('/admin/activity?error=เพิ่มกิจกรรมไม่สำเร็จ');
            });
    });
};
// ลบกิจกรรม
const deleteActivity = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await myActivity.findByIdAndDelete(id);

        if (!result) {
            console.log(`Activity with ID ${id} has been deleted.`);
            return res.status(404).redirect('/admin/activity?error=ไม่พบข้อมูลที่ต้องการลบ');
        }
        res.redirect('/admin/activity?message=ลบกิจกรรมสำเร็จ');
    } catch (err) {
        console.error('Error deleting activity:',err);
        res.status(500).redirect('/admin/activity?error=ลบกิจกรรมไม่สำเร็จ');
    }
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
                res.redirect('/admin/activity?message=แก้ไขกิจกรรมสำเร็จ');
            })
            .catch((err) => {
                console.error('Error updating activity:', err);
                res.status(500).redirect('/admin/activity?error=แก้ไขกิจกรรมไม่สำเร็จ');
            });
    });
};


/// สำหรับเก็บรูปภาพที่อัปโหลดจาก waste
const storage2 = multer.diskStorage({
    destination: './public/upload_imgwaste',
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

const upload2 = multer({
    storage: storage2, // ใช้ storage2 แทน storage
    limits: { fileSize: 50 * 1024 * 1024 }
}).single('img');

// ขยะ
const wasteIndex = (req, res) => {
    Promise.all([
        myWaste.find().populate('wasteType', 'wasteTypeName'), // Populate wasteType with wasteTypeName
        myWasteType.find()
    ])
    .then(([wasteData, wasteTypeData]) => {
        res.render('admin/waste', {
            mytitle: 'Admindashboard | Waste',
            waste: wasteData,
            wasteTypes: wasteTypeData
        });
    })
    .catch((err) => {
        console.log(err);
    });
};
// เพิ่มขยะ
const wastePost = async (req, res) => {
    upload2(req, res, async (err) => { // ใช้ upload2 แทน upload
        if (err) {
            console.error('Error in file upload:', err);
            return res.status(400).send('เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ');
        }

        // ตรวจสอบรูปภาพที่อัปโหลด
        const imagePath = req.file
            ? `/upload_imgwaste/${req.file.filename}` // ใช้ backticks สำหรับการแทรกค่า
            : '/img/no_image.jpg';

        const { wasteName, pricePerUnit, wasteType } = req.body;

        // ตรวจสอบข้อมูลที่จำเป็น
        if (!wasteName || !pricePerUnit || !wasteType) {
            return res.status(400).send('กรุณากรอกข้อมูลให้ครบถ้วน');
        }

        try {
            // ตรวจสอบว่ามี wasteName นี้ในฐานข้อมูลแล้วหรือไม่
            const existingWaste = await myWaste.findOne({ wasteName });
            if (existingWaste) {
                return res.redirect('/admin/waste?error=ขยะนี้มีอยู่แล้ว');
            }
            // ตรวจสอบประเภทขยะ
            const wasteTypeDoc = await myWasteType.findById(wasteType);
            if (!wasteTypeDoc) {
                return res.status(400).send('ประเภทขยะไม่ถูกต้อง');
            }

            const newWaste = new myWaste({
                wasteName,
                pricePerUnit: parseFloat(pricePerUnit), // ตรวจสอบว่าเป็นตัวเลข
                wasteType,
                img: imagePath
            });

            await newWaste.save();
            console.log('Waste saved successfully');
            res.redirect('/admin/waste?message=เพิ่มขยะสำเร็จ');
        } catch (error) {
            console.error('Error saving waste:', error);
            res.redirect('/admin/waste?error=เกิดข้อผิดพลาดในระบบ');
        }
    });
};
// ลบขยะ
const wasteDelete = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await myWaste.findByIdAndDelete(id);

        if (!result) {
            return res.status(404).redirect('/admin/waste?error=ไม่พบข้อมูลขยะที่ต้องการลบ');
        }
        res.redirect('/admin/waste?message=ลบขยะสำเร็จ');
    } catch (err) {
        console.error('Error deleting Waste:', err);
        res.status(500).redirect('/admin/waste?error=เกิดข้อผิดพลาดในการลบข้อมูลผู้ใช้');
    }
};
// แก้ไขขยะ
const wasteEdit = async (req, res) => {
    upload2(req, res, async (err) => {
        if (err) {
            console.error('Error in file upload:', err);
            return res.status(400).send('เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ');
        }

        const { _id, wasteName, pricePerUnit, wasteType } = req.body;

        // ตรวจสอบข้อมูลที่จำเป็น
        if (!_id || !wasteName || !pricePerUnit || !wasteType) {
            return res.status(400).send('กรุณากรอกข้อมูลให้ครบถ้วน');
        }

        try {
            const waste = await myWaste.findById(_id);

            if (!waste) {
                return res.status(404).send('ไม่พบข้อมูลขยะที่ต้องการแก้ไข');
            }

            // ตรวจสอบว่ามีการอัปโหลดรูปภาพใหม่หรือไม่
            const updatedImagePath = req.file
                ? `/upload_imgwaste/${req.file.filename}`
                : waste.img; // ใช้รูปเดิมถ้าไม่มีการอัปโหลดใหม่

            // อัปเดตข้อมูลขยะ
            waste.wasteName = wasteName;
            waste.pricePerUnit = parseFloat(pricePerUnit);
            waste.wasteType = wasteType;
            waste.img = updatedImagePath;

            await waste.save();

            console.log('Waste updated successfully');
            res.redirect('/admin/waste?message=แก้ไขข้อมูลขยะสำเร็จ');
        } catch (error) {
            console.error('Error updating waste:', error);
            res.redirect('/admin/waste?error=เกิดข้อผิดพลาดในระบบ');
        }
    });
};



// ประเภทขยะ
const wasteTypeIndex = async function (req, res, next) {
    try {
        const search = req.query.search || ''; // รับค่าการค้นหาจาก query string
        const page = parseInt(req.query.page) || 1; // รับค่าหน้าปัจจุบันจาก query string
        const limit = 5; // จำนวนข้อมูลที่จะแสดงต่อหน้า
        const startIndex = (page - 1) * limit;

        // เงื่อนไขการค้นหา
        const searchOptions = search
            ? {
                $or: [
                      { wasteTypeName: { $regex: search, $options: 'i' } }, // ค้นหาจาก wasteTypeName แบบไม่สนใจตัวพิมพ์
                ],
            }
            : {};
        const totalDocuments = await myWasteType.countDocuments(searchOptions); // นับจำนวนเอกสารทั้งหมด
        const wasteTypeList = await myWasteType
            .find(searchOptions)
            .sort({ createdAt: 1 }) // เรียงตามวันที่สร้าง
            .skip(startIndex)
            .limit(limit);

        res.render('admin/wasteType', {
            mytitle: 'Admindashboard | WasteType',
            wastetype: wasteTypeList,
            currentPage: page,
            totalPages: Math.ceil(totalDocuments / limit),
            search, // ส่งค่าการค้นหาปัจจุบันกลับไป
        });
    } catch (err) {
        console.error('Error fetching WasteType:', err);
        res.status(500).send('เกิดข้อผิดพลาดในระบบ');
    }
};
// เพิ่มประเภทขยะ
const wasteTypePost = async (req, res) => {
    try {
        console.log('Request Body:', req.body);

        const { wasteTypeName } = req.body;

        if (!wasteTypeName || wasteTypeName.trim() === '') {
            console.log('Missing required fields');
            return res.status(400).send('กรุณากรอกข้อมูลชื่อประเภทขยะ');
        }

        const existingWasteType = await myWasteType.findOne({ wasteTypeName: wasteTypeName.trim() });
        if (existingWasteType) {
            console.log('Duplicate wasteTypeName:', wasteTypeName);
            return res.redirect('/admin/wasteType?error=ชื่อประเภทขยะนี้มีอยู่ในระบบแล้ว');
        }

        const wasteType = new myWasteType({ wasteTypeName: wasteTypeName.trim() });
        const result = await wasteType.save();
        console.log('WasteType saved successfully:', result);

        res.redirect('/admin/wasteType?message=เพิ่มประเภทขยะสำเร็จ');
    } catch (err) {
        console.error('Error saving WasteType:', err);
        res.redirect('/admin/wasteType?error=เกิดข้อผิดพลาดในระบบ')
    }
};
// แก้ไขประเภทขยะ
const wasteTypeEdit = async (req, res) => {
    try {
        const { _id, wasteTypeName } = req.body;
        if (!_id || !wasteTypeName) {
            return res.status(400).redirect('/admin/wasteType?error=ข้อมูลไม่ครบถ้วน');
        }
        const updatedWasteType = await myWasteType.findByIdAndUpdate(
            _id,
            { wasteTypeName: wasteTypeName.trim() },
            { new: true }
        );
        if (!updatedWasteType) {
            return res.status(404).redirect('/admin/wasteType?error=ไม่พบข้อมูลประเภทขยะที่ต้องการอัปเดต');
        }
        res.redirect('/admin/wasteType?message=แก้ไขประเภทขยะสำเร็จ');
    } catch (error) {
        console.error("Error editing waste type:", error);
        res.status(500).redirect('/admin/wasteType?error=เกิดข้อผิดพลาดในการแก้ไขประเภทขยะ');
    }
};
// ลบประเภทขยะ
const wasteTypeDelete = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await myWasteType.findByIdAndDelete(id);

        if (!result) {
            return res.status(404).redirect('/admin/wasteType?message=ไม่พบข้อมูลประเภทขยะที่ต้องการลบ');
        }
        res.redirect('/admin/wasteType?message=ลบประเภทขยะสำเร็จ');
    } catch (err) {
        console.error('Error deleting WasteType:', err);
        res.status(500).redirect('/admin/wasteType?message=เกิดข้อผิดพลาดในการลบข้อมูลประเภทขยะ');
    }
};


// หน้า employee(พนักงาน)
const employeeIndex = (req, res) => {
    const { role, search } = req.query;
    let filter = {};
    if (role) {
        filter.role = role;
    }
    if (search) {
        filter.$or = [
            { username: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { tel: { $regex: search, $options: 'i' } }
        ];
    }
    MyAdmin.find(filter).sort({ createdAt: 1 })
        .then((result) => {
            res.render('admin/employee', { mytitle: 'Admindashboard | Employee', emp: result, role, search  });
        })
        .catch((err) => {
            console.error('Error fetching employees:', err);
            res.status(500).send('เกิดข้อผิดพลาดในการดึงข้อมูลพนักงาน');
        });
};
// ลงทะเบียนพนักงานหรือแอดมิน
const employeeRegister = async (req, res) => {
    const { username, password, confirmPassword, firstname, lastname, tel, email, role } = req.body;

    try {
        // ตรวจสอบว่ารหัสผ่านและยืนยันรหัสผ่านตรงกันหรือไม่
        if (password !== confirmPassword) {
            return res.redirect('/admin/employee?error=รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน');
        }

        // ตรวจสอบว่ามีผู้ใช้งานที่ใช้ username, email หรือ tel ซ้ำกันหรือไม่
        let existingUser = await MyAdmin.findOne({ $or: [{ username }, { email }, { tel }] });

        if (existingUser) {
            if (existingUser.username === username) {
                return res.redirect('/admin/employee?error=ชื่อผู้ใช้นี้มีอยู่แล้ว');
            }
            if (existingUser.email === email) {
                return res.redirect('/admin/employee?error=อีเมลนี้ถูกใช้งานแล้ว');
            }
            if (existingUser.tel === tel) {
                return res.redirect('/admin/employee?error=เบอร์โทรนี้ถูกใช้งานแล้ว');
            }
        }

        // แฮชรหัสผ่าน
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // ตรวจสอบค่า role (admin หรือ employee)
        if (role !== 'admin' && role !== 'employee') {
            return res.redirect('/admin/employee?error=บทบาทไม่ถูกต้อง');
        }

        // สร้างผู้ใช้งานใหม่
        const newUser = new MyAdmin({
            username,
            password: hashedPassword,
            firstname,
            lastname,
            tel,
            email,
            role,
        });

        await newUser.save();
        res.redirect('/admin/employee?message=เพิ่มสมาชิกสำเร็จ');

    } catch (err) {
        console.error('Registration error:', err);
        res.redirect('/admin/employee?error=เกิดข้อผิดพลาดในระบบ');
    }
};
// ลบพนักงาน
const employeeDelete = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await MyAdmin.findByIdAndDelete(id);

        if (!result) {
            return res.status(404).redirect('/admin/employee?error=ไม่พบข้อมูลผู้ใช้ที่ต้องการลบ');
        }
        res.redirect('/admin/employee?message=ลบผู้ใช้สำเร็จ');
    } catch (err) {
        console.error('Error deleting Employee:', err);
        res.status(500).redirect('/admin/employee?error=เกิดข้อผิดพลาดในการลบข้อมูลผู้ใช้');
    }
};
// แก้ไขข้อมูลพนักงาน
const editEmployee = async (req, res) => {
    const { _id, username, firstname, lastname, tel, email, role } = req.body;

    try {
        const updatedEmployee = await MyAdmin.findByIdAndUpdate(
            _id,
            { username, firstname, lastname, tel, email, role },
            { new: true }  // return document ที่ถูกอัปเดต
        );

        if (!updatedEmployee) {
            return res.status(404).send('ไม่พบข้อมูลพนักงาน');
        }

        res.redirect('/admin/employee?message=แก้ไขข้อมูลพนักงานสำเร็จ');
    } catch (err) {
        console.error(err);
        res.status(500).send('เกิดข้อผิดพลาดที่เซิร์ฟเวอร์');
    }
};

//หมู่บ้าน
const villageIndex = async (req, res) => {
    try {
        const villages = await Village.find();

        res.render('admin/village', { 
            mytitle: 'Admindashboard | Village',
            villages: villages
        });
    } catch (err) {
        console.error('เกิดข้อผิดพลาดในการดึงข้อมูลหมู่บ้าน:', err);
        res.status(500).send('เกิดข้อผิดพลาดในระบบ');
    }
};
//เพิ่มหมู่บ้าน
const villagePost = async (req, res) => {
    try {
        const { villageNumber, villageName, location } = req.body;

        // ตรวจสอบว่ามีหมู่บ้านที่มีหมายเลขหรือชื่อเดียวกันอยู่แล้วหรือไม่
        const existingVillage = await Village.findOne({ $or: [{ villageNumber }, { villageName }] });
        if (existingVillage) {
            return res.redirect('/admin/village?error=หมู่บ้านนี้มีอยู่แล้ว');
        }

        const newVillage = new Village({
            villageNumber,
            villageName,
            location
        });

        await newVillage.save();
        res.redirect('/admin/village?message=เพิ่มข้อมูลหมู่บ้านสำเร็จ');
    } catch (err) {
        console.error('เกิดข้อผิดพลาดในการเพิ่มหมู่บ้าน:', err);
        res.status(500).send('เกิดข้อผิดพลาดในระบบ');
    }
};
//แก้ไขหมู่บ้าน
const villageEdit = async (req, res) => {
    try {
        const { _id, villageNumber, villageName, location } = req.body;

        const village = await Village.findById(_id);

        if (!village) {
            return res.redirect('/admin/village?error=ไม่พบหมู่บ้านที่ต้องการแก้ไข');
        }

        // อัปเดตข้อมูลหมู่บ้าน
        village.villageNumber = villageNumber;
        village.villageName = villageName;
        village.location = location;

        await village.save();
        res.redirect('/admin/village?message=แก้ไขข้อมูลหมู่บ้านสำเร็จ');
    } catch (err) {
        console.error('เกิดข้อผิดพลาดในการแก้ไขหมู่บ้าน:', err);
        res.status(500).send('เกิดข้อผิดพลาดในระบบ');
    }
};
//ลบหมู่บ้าน
const villageDelete = async (req, res) => {
    try {
        const { id } = req.params;

        // ค้นหาหมู่บ้านตาม ID และลบ
        const village = await Village.findByIdAndDelete(id);

        if (!village) {
            return res.status(404).send('ไม่พบหมู่บ้านที่ต้องการลบ');
        }

        res.redirect('/admin/village');
    } catch (err) {
        console.error('เกิดข้อผิดพลาดในการลบหมู่บ้าน:', err);
        res.status(500).send('เกิดข้อผิดพลาดในระบบ');
    }
};

//หน้ารอบการรับซื้อขยะ
const roundIndex = (req, res) => {
    const formatDate = (date) => {
        if (!date) return '';
        const options = { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Bangkok' };
        return new Date(date).toLocaleDateString('th-TH', options); 
    };

    Promise.all([
        Village.find().sort({ createdAt: 1 }),
        Round.find().populate('village').sort({ date: 1 })
    ])
    .then(([villageResult, roundResult]) => {
        // แปลงวันที่ก่อนส่งไปยัง EJS
        roundResult = roundResult.map(round => ({
            ...round.toObject(), 
            formattedDateYYMMDD: new Date(round.date).toISOString().split('T')[0], // YY-MM-DD
            formattedDateThai: formatDate(round.date) // วันที่ภาษาไทย
        }));

        res.render('admin/round', {
            mytitle: 'Admindashboard | Round',
            village: villageResult,
            rounds: roundResult  
        });
    })
    .catch((err) => {
        console.log(err);
        res.status(500).send('Error retrieving village and round data');
    });
};
//เพิ่มรอบรับซื้อขยะ
const roundPost = (req, res) => {
    const { roundName, village, date, startTime, endTime } = req.body;

    const newRound = new Round({
        roundName,
        village, // ใช้ ID ของหมู่บ้านจากฟอร์ม
        date,
        startTime,
        endTime
    });

    newRound.save()
        .then(() => {
            res.redirect('/admin/round?message=เพิ่มรอบการรับซื้อสำเร็จ');
        })
        .catch((err) => {
            console.log(err);
            res.status(500).send('Error saving round data');
        });
};
// แก้ไขรอบรับซื้อขยะ
const roundEdit = async (req, res) => {
    try {
        const { _id, roundName, village, date, startTime, endTime } = req.body;

        // ตรวจสอบว่าข้อมูลที่ส่งมาครบหรือไม่
        if (!_id || !roundName || !village || !date || !startTime || !endTime) {
            return res.redirect('/admin/round?error=กรอกข้อมูลให้ครบ');
        }

        // ค้นหาและอัปเดตรอบรับซื้อขยะในฐานข้อมูล
        await Round.findByIdAndUpdate(_id, {
            roundName,
            village,
            date,
            startTime,
            endTime
        });

        res.redirect('/admin/round?message=แก้ไขรอบการรับซื้อสำเร็จ'); // กลับไปหน้าจัดการรอบรับซื้อขยะ
    } catch (error) {
        console.error(error);
        req.flash('error_msg', 'เกิดข้อผิดพลาดในการแก้ไขรอบรับซื้อขยะ');
        res.redirect('/admin/manageRounds');
    }
};
// ลบรอบรับซื้อขยะ
const roundDelete = (req, res) => {
    const { id } = req.params;

    Round.findByIdAndDelete(id)
        .then(() => res.redirect('/admin/round?message=ลบรอบการรับซื้อสำเร็จ'))
        .catch((err) => {
            console.log(err);
            res.status(500).send('Error deleting round data');
        });
};

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
    wasteIndex,wastePost,wasteDelete,wasteEdit,
    //ประเภทขยะ
    wasteTypeIndex,wasteTypePost,wasteTypeEdit,wasteTypeDelete,
    //พนักงาน
    employeeIndex,employeeRegister,employeeDelete,editEmployee,
    //หมู่บ้าน
    villageIndex,villagePost,villageEdit,villageDelete,
    //รอบการรับซื้อขยะ
    roundIndex,roundPost,roundEdit,roundDelete,
}
