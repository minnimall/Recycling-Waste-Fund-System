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
    const searchQuery = req.query.search || '';
    const filter = { isDeleted: false };
    
    if (searchQuery) {
        filter.$or = [
            { title: { $regex: searchQuery, $options: 'i' } },
            { youtubeUrl: { $regex: searchQuery, $options: 'i' } }
        ];
    }
    myMedia.find(filter).sort({ createdAt: -1 })
        .then((result) => {
            result.forEach(item => {
                item.formattedDate = moment(item.createdAt).format('YYYY-MM-DD');
            });
            res.render('admin/media', { mytitle: 'Admindashboard | Media', media: result, searchQuery: searchQuery });
        })
        .catch((err) => {
            console.log(err);
            res.status(500).send('Internal Server Error');
        });
};
// เพิ่มสื่อ (ป้องกันเพิ่มสื่อซ้ำ)
const mediaPost = async (req, res) => {
    try {
        const { title, youtubeUrl } = req.body;

        if (!youtubeUrl || !youtubeUrl.includes('youtube.com/watch?v=')) {
            return res.status(400).redirect('/admin?error=URL ไม่ถูกต้อง');
        }

        const existingMedia = await myMedia.findOne({ 
            $or: [{ title }, { youtubeUrl }] 
        });

        if (existingMedia) {
            return res.status(400).redirect('/admin?error=มีสื่อนี้อยู่แล้ว');
        }

        const media = new myMedia({
            title: title || 'Untitled',
            youtubeUrl
        });

        await media.save();
        console.log('Media saved successfully:', media);
        res.redirect('/admin?message=เพิ่มสื่อความรู้สำเร็จ');
    } catch (err) {
        console.error('Error saving media:', err);
        res.status(500).redirect('/admin?error=เพิ่มสื่อความรู้ไม่สำเร็จ');
    }
};
// ลบสื่อ (softDelete)
const mediaDelete = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await myMedia.findByIdAndUpdate(id,{ isDeleted: true});

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

const storageNews = multer.diskStorage({
    destination: './public/uploads/news/PDF/',
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

const uploadNews = multer({
    storage: storageNews,
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: function (req, file, cb) {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed!'), false);
        }
    }
}).single('newsFile');

const newsPost = async (req, res) => {
    uploadNews(req, res, async (err) => {
        if (err) {
            console.error('Error uploading file:', err);
            if (err instanceof multer.MulterError) {
                return res.status(400).send({ error: 'File upload failed', details: err.message });
            } else {
                return res.status(400).send({ error: 'Invalid file type', details: err.message });
            }
        }
        try {
            const { newsTitle, newsDescription, newsAuthor } = req.body;
            let fileNews = '/img/no_image.jpg'; // Default path

            if (req.file) {
                fileNews = path.join('/uploads/news/PDF/', req.file.filename);
            }

            const newNews = new myNews({
                newsTitle,
                newsDescription,
                newsAuthor,
                newsFile: fileNews,
            });
            await newNews.save();

            res.redirect('/admin/news?message=เพิ่มข่าวสารสำเร็จ');
        } catch (error) {
            console.error('Error saving news:', error);
            res.status(500).send({ error: 'Failed to save news', details: error.message });
        }
    });
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
    const searchQuery = req.query.search || '';
    const filter = { isDeleted: false };
    const page = parseInt(req.query.page) || 1;
    const limit = 10;

    if (searchQuery) {
        filter.title = { $regex: searchQuery, $options: 'i' };
    }

    myActivity.countDocuments(filter)
        .then(totalItems => {
            const totalPages = Math.ceil(totalItems / limit);
            const skip = (page - 1) * limit;

            myActivity.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .then((result) => {
                    result.forEach(item => {
                        item.formattedDate = moment(item.createdAt).format('YYYY-MM-DD');
                    });
                    res.render('admin/activity', { 
                        mytitle: 'Admindashboard | Activity', 
                        activity: result, 
                        searchQuery: searchQuery,
                        currentPage: page,
                        totalPages: totalPages,
                        totalItems: totalItems, // ส่งจำนวนรายการทั้งหมดไปยัง template
                        search: searchQuery 
                    });
                })
                .catch((err) => {
                    console.log(err);
                    res.status(500).send('เกิดข้อผิดพลาดในการดึงข้อมูล');
                });
        })
        .catch(err => {
            console.log(err);
            res.status(500).send('เกิดข้อผิดพลาดในการนับจำนวนข้อมูล');
        });
};
//เพิ่มกิจกรรม (ป้องกันเพิ่มกิจกรรมซ้ำ)
const activityPost = (req, res) => {
    upload(req, res, async (err) => {
        if (err) {
            console.error('Error uploading file:', err);
            return res.status(400).send({ error: 'File upload failed', details: err });
        }
        try {
            const { title, content } = req.body; // แก้ไข: เพิ่ม content ใน destructuring
            // ตรวจสอบว่ามีกิจกรรมที่มี title และ content ซ้ำกันหรือไม่ (กรณีต้องการให้เนื้อหาไม่ซ้ำด้วย)
            const existingActivity = await myActivity.findOne({ title, isDeleted: false });
            if (existingActivity) {
                return res.status(400).redirect('/admin/activity?error=มีกิจกรรมนี้อยู่แล้ว');
            }
            // ถ้าไม่มีซ้ำ ให้บันทึก
            const imagePath = req.file
                ? `/uploads/activity/${req.file.filename}`
                : '/img/no_image.jpg';
            const activity = new myActivity({
                title,
                content,
                img: imagePath
            });
            await activity.save();
            console.log('Activity saved successfully:', activity);
            res.redirect('/admin/activity?message=เพิ่มกิจกรรมสำเร็จ');
        } catch (err) {
            console.error('Error saving activity:', err);
            res.status(500).redirect('/admin/activity?error=เพิ่มกิจกรรมไม่สำเร็จ');
        }
    });
};

// ลบกิจกรรม (softDelete)
const deleteActivity = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await myActivity.findByIdAndUpdate(id, { isDeleted: true });

        if (!result) {
            console.log(`Activity with ID ${id} not found.`);
            return res.status(404).redirect('/admin/activity?error=ไม่พบข้อมูลที่ต้องการลบ');
        }

        res.redirect('/admin/activity?message=ลบกิจกรรมสำเร็จ (Soft Delete)');
    } catch (err) {
        console.error('Error deleting activity:', err);
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
    const filter = { isDeleted: false };

    Promise.all([
        myWaste.find(filter).populate('wasteType', 'wasteTypeName'), // Populate wasteType with wasteTypeName
        myWasteType.find({ isDeleted: false })
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
// เพิ่มขยะ (ป้องกันเพิ่มขยะซ้ำ)
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
// ลบขยะ (softDelete)
const wasteDelete = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await myWaste.findByIdAndUpdate(id, { isDeleted: true });

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

        // กำหนดค่า filter เพื่อแสดงเฉพาะข้อมูลที่ isDeleted: false
        let filter = { isDeleted: false };

        // ถ้ามีค่าค้นหา ให้เพิ่มเงื่อนไขการค้นหาเข้าไป
        if (search) {
            filter = {
                ...filter, // คงค่า isDeleted: false ไว้
                $or: [
                    { wasteTypeName: { $regex: search, $options: 'i' } }, // ค้นหาชื่อประเภทขยะ
                ],
            };
        }

        const totalDocuments = await myWasteType.countDocuments(filter); // นับจำนวนเอกสารทั้งหมดที่ตรงกับเงื่อนไข
        const wasteTypeList = await myWasteType
            .find(filter)
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
// เพิ่มประเภทขยะ (ป้องกันเพิ่มประเภทขยะซ้ำ)
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
// ลบประเภทขยะ (softDelete)
const wasteTypeDelete = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await myWasteType.findByIdAndUpdate(id , { isDeleted : true});

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
    const filter = { isDeleted: false };
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
// ลงทะเบียนพนักงานหรือแอดมิน (ป้องกันเพิ่มแอดมินหรือพนักงานซ้ำ)
const employeeRegister = async (req, res) => {
    const { username, password, confirmPassword, firstname, lastname, tel, email, role } = req.body;

    try {
        // ตรวจว่ารหัสผ่านกับยืนยันรหัสผ่านตรงกันหรือมั้ย
        if (password !== confirmPassword) {
            return res.redirect('/admin/employee?error=รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน');
        }

        // ตรวจว่ามี username, email หรือ tel ซ้ำกันมั้ย
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
// ลบพนักงาน (softDelete)
const employeeDelete = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await MyAdmin.findByIdAndUpdate(id, { isDeleted: true });

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
    const filter = { isDeleted: false };
    try {
        const villages = await Village.find(filter);

        res.render('admin/village', { 
            mytitle: 'Admindashboard | Village',
            villages: villages
        });
    } catch (err) {
        console.error('เกิดข้อผิดพลาดในการดึงข้อมูลหมู่บ้าน:', err);
        res.status(500).send('เกิดข้อผิดพลาดในระบบ');
    }
};
//เพิ่มหมู่บ้าน (ป้องกันเพิ่มหมู่บ้านซ้ำ)
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
//ลบหมู่บ้าน (softDelete)
const villageDelete = async (req, res) => {
    try {
        const { id } = req.params;

        // ค้นหาหมู่บ้านตาม ID และลบ
        const village = await Village.findByIdAndUpdate(id,{ isDeleted: true});

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
    const filter = { isDeleted: false };

    Promise.all([
        Village.find(filter).sort({ createdAt: 1 }),
        Round.find(filter).populate('village').sort({ date: -1 })
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
// ลบรอบรับซื้อขยะ (softDelete)
const roundDelete = (req, res) => {
    const { id } = req.params;

    Round.findByIdAndUpdate(id , { isDeleted : true })
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
