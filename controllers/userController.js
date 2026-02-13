const express = require('express');
const router = express.Router();
const cloudinary = require('../config/cloudinary');
const multer = require('multer');
const streamifier = require('streamifier');
const myMedia = require('../models/media');
const myActivity = require('../models/activity');
const myNews = require('../models/news');
const myWaste = require('../models/waste');
const myWasteType = require('../models/wastetype');
const Village = require('../models/village');
const Round = require('../models/round');
const wasteSaleRequest = require('../models/wasteSaleRequest');
const wasteSaleRequestLog = require('../models/wasteSaleRequestLog');
const WastePurchase = require('../models/wastePurchase');
const Family = require('../models/family');
const Member = require('../models/member');
const Complaint = require('../models/complaint');
const WasteBankAccount = require('../models/wasteBankAccount');
const WastePriceHistory = require('../models/wastePriceHistory');
const transactionMoney = require('../models/transactionMoney');
const Idea = require('../models/ideas');
const Notification = require('../models/notification');
const Board = require('../models/board');
const path = require('path');
const moment = require('moment');
const WastePoint = require('../models/wastePoint');
const FuneralAssistance = require('../models/funeral');

// หน้าหลัก
const formatDate = (date) => moment(date).locale('th').format('ddddที่ D MMMM YYYY');

const user_index = async (req, res) => {
    const filter = { isDeleted: false };

    try {
        const [
            activitiesResult,
            wasteResult,
            villageResult,
            roundResult,
            newsResult,
            wastePointsResult
        ] = await Promise.all([
            myActivity.find(filter).sort({ createdAt: -1 }),
            myWaste.find(filter).populate('wasteType').sort({ createdAt: 1 }),
            Village.find(filter).sort({ villageNumber: 1 }),
            Round.find(filter).populate('village').populate('wastePoint').sort({ date: 1 }),
            myNews.find(filter).sort({ createdAt: -1 }),
            WastePoint.find(filter)
                .populate('village')
                .sort({ createdAt: 1 })
        ]);

        // ดึงประวัติราคาล่าสุดของขยะแต่ละตัว
        const wasteWithChangeRaw = await Promise.all(
            wasteResult.map(async (waste) => {
                const lastHistory = await WastePriceHistory.findOne({ wasteId: waste._id })
                    .sort({ createdAt: -1 });

                const latestPrice = lastHistory ? lastHistory.pricePerUnit : waste.pricePerUnit;
                const latestPriceDate = lastHistory ? lastHistory.createdAt : null;

                const priceChange = lastHistory
                    ? (waste.pricePerUnit - lastHistory.pricePerUnit)
                    : null;

                return {
                    ...waste._doc,
                    latestPrice,
                    latestPriceDate,
                    priceChange,
                    percentChange: lastHistory ? lastHistory.percentChange : null,
                    changeDirection: lastHistory ? lastHistory.changeDirection : null
                };
            })
        );

        const wasteWithChange = wasteWithChangeRaw.sort((a, b) => {
            const dateA = new Date(a.latestPriceDate || 0);
            const dateB = new Date(b.latestPriceDate || 0);
            return dateB - dateA;
        });

        const latestPriceUpdateDate = wasteWithChange.reduce((latest, item) => {
            if (item.latestPriceDate && (!latest || new Date(item.latestPriceDate) > new Date(latest))) {
                return item.latestPriceDate;
            }
            return latest;
        }, null);

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
                formattedDateYYMMDD: new Date(round.date).toISOString().split('T')[0],
                formattedDateThai: formatDate(round.date),
                startTime,
                endTime,
                isActive,
                wastePoint: round.wastePoint || null
            };
            return acc;
        }, {});

        res.render('user/main', {
            mytitle: 'Admindashboard | Activity',
            activity: activitiesResult,
            waste: wasteWithChange,
            village: villageResult,
            roundsByVillage,
            moment: moment,
            news: newsResult,
            latestPriceUpdateDate,
            wastePoints: wastePointsResult
        });

    } catch (err) {
        console.error(err);
        res.status(500).send("เกิดข้อผิดพลาดในการโหลดข้อมูล");
    }
};

// หน้าประเภทขยะ
const user_wastetype = (req, res) => {
    const wasteTypeFilter = req.query.wasteType;
    const page = parseInt(req.query.page) || 1;
    const limit = 12;
    const skip = (page - 1) * limit;

    Promise.all([
        myWaste.find({
            ...(wasteTypeFilter ? { wasteType: wasteTypeFilter } : {}), 
            isDeleted: false
        })
        .skip(skip)
        .limit(limit)
        .populate('wasteType', 'wasteTypeName'),

        myWasteType.find({ isDeleted: false }),

        myWaste.countDocuments({
            ...(wasteTypeFilter ? { wasteType: wasteTypeFilter } : {}),
            isDeleted: false
        })
    ])
    .then(([wasteData, wasteTypeData, totalWasteCount]) => {
        const totalPages = Math.ceil(totalWasteCount / limit);
        res.render('user/wastetype', {
            mytitle: 'Admindashboard | Waste',
            waste: wasteData,
            wasteTypes: wasteTypeData,
            selectedWasteType: wasteTypeFilter,
            currentPage: page,
            totalPages: totalPages
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

// const storage = multer.diskStorage({
//     destination: './public/upload_imgWasteSaleRequest',
//     filename: function (req, file, cb) {
//         cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
//     }
// });

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 }
}).single('image');

// หน้าแจ้งความประสงค์ขายขยะ
const user_wasteSaleRequest = async (req, res) => {
    try {
        const filter = { isDeleted: false };

        const wasteItems = await myWaste
            .find(filter)
            .sort({ createdAt: -1 });

        let hasPendingRequest = false;
        let haswaitingUserRequest = false;
        let hasComfirmed = false;
        let hasInprogress = false;
        let latestRequest = null;

        if (req.session?.user) {
            latestRequest = await wasteSaleRequest
                .findOne({
                    family: req.session.user._id,
                    isDeleted: false
                })
                .populate('waste')
                .populate('family')
                .sort({ createdAt: -1 });

            if (latestRequest) {
                if (latestRequest.status === 'pending') {
                    hasPendingRequest = true;
                } else if (latestRequest.status === 'waitingUser') {
                    haswaitingUserRequest = true;
                } else if (latestRequest.status === 'confirmed') {
                    hasComfirmed = true;
                } else if (latestRequest.status === 'in-progress') {
                    hasInprogress = true;
                }
            }
        }
        
        const pickupDate = latestRequest?.approvePickupDate || null;


        res.render('user/wasteSaleRequest', {
            wasteItems,
            session: req.session,
            hasPendingRequest,
            haswaitingUserRequest,
            hasComfirmed,
            hasInprogress,
            latestRequest,
            pickupDate
        });

    } catch (err) {
        console.error(err);
        res.status(500).send('เกิดข้อผิดพลาดในระบบ');
    }
};

//บันทึกข้อมูลแบบฟอร์มแจ้งความประสงค์ขายขยะ
const wasteSaleRequestPost = (req, res) => {

    if (!req.session || !req.session.username) {
        return res.redirect('/user/wasteSaleRequest?error=กรุณาเข้าสู่ระบบก่อนทำรายการ');
    }

    const { username } = req.session;

    Family.findOne({ username })
        .then((family) => {
            if (!family) {
                return res.redirect('/user/wasteSaleRequest?error=ไม่พบข้อมูลครัวเรือน');
            }

            upload(req, res, async (err) => {
                if (err) {
                    console.error(err);
                    return res.redirect('/user/wasteSaleRequest?error=อัปโหลดรูปภาพล้มเหลว');
                }

                try {
                    const {waste,weight,date,location,latitude,longitude,locationMoreDetail} = req.body;

                    if (!waste || waste.length === 0) {
                        return res.redirect('/user/wasteSaleRequest?error=กรุณาเลือกขยะที่ต้องการขาย');
                    }

                    if (!latitude || !longitude) {
                        return res.redirect('/user/wasteSaleRequest?error=กรุณาเลือกตำแหน่งบนแผนที่');
                    }

                    let imageUrl = null;

                    // อัปโหลดรูปขึ้น Cloudinary
                    if (req.file) {
                        const uploadFromBuffer = () => {
                            return new Promise((resolve, reject) => {
                                const stream = cloudinary.uploader.upload_stream(
                                    {
                                        folder: 'waste_sale_requests',
                                        resource_type: 'image'
                                    },
                                    (error, result) => {
                                        if (result) resolve(result);
                                        else reject(error);
                                    }
                                );

                                streamifier
                                    .createReadStream(req.file.buffer)
                                    .pipe(stream);
                            });
                        };

                        const result = await uploadFromBuffer();
                        imageUrl = result.secure_url;
                    }

                    const newSaleRequest = new wasteSaleRequest({
                        waste: Array.isArray(waste) ? waste : [waste],
                        weight: weight ? parseFloat(weight) : undefined,
                        date: new Date(date),
                        location,
                        locationMoreDetail: locationMoreDetail || '',
                        latitude: parseFloat(latitude),
                        longitude: parseFloat(longitude),
                        img: imageUrl,
                        family: family._id
                    });

                    await newSaleRequest.save();

                    return res.redirect('/user/wasteSaleRequest?message=ส่งแบบฟอร์มสำเร็จ');

                } catch (error) {
                    console.error(error);
                    return res.redirect('/user/wasteSaleRequest?error=เกิดข้อผิดพลาดในระบบ');
                }
            });
        })
        .catch((err) => {
            console.error(err);
            res.status(500).send('เกิดข้อผิดพลาดในการค้นหาผู้ใช้');
        });
};

const wasteSaleRequestUserSubmit = async (req, res) => {
    if (!req.session?.user) {
        return res.redirect(
            '/user/wasteSaleRequest?error=' +
            encodeURIComponent('กรุณาเข้าสู่ระบบก่อนทำรายการ')
        );
    }

    const { id } = req.params;

    if (!id) {
        return res.redirect(
            '/user/wasteSaleRequest?error=' +
            encodeURIComponent('ID ไม่ถูกต้อง')
        );
    }

    try {
        const request = await wasteSaleRequest.findOne({
            _id: id,
            family: req.session.user._id,
            isDeleted: false
        });

        if (!request) {
            return res.redirect(
                '/user/wasteSaleRequest?error=' +
                encodeURIComponent('ไม่พบคำขอ')
            );
        }

        // ต้องเป็น WAITING_USER เท่านั้น
        if (request.status !== 'waitingUser') {
            return res.redirect(
                '/user/wasteSaleRequest?error=' +
                encodeURIComponent('ไม่สามารถยืนยันคำขอนี้ได้')
            );
        }

        // ใช้ confirmExpireAt
        if (!request.userConfirmDeadline || new Date() > request.userConfirmDeadline) {

            request.status = 'rejected';
            request.rejectedReason = 'USER_NOT_CONFIRMED_IN_TIME';
            await request.save();

            await wasteSaleRequestLog.create({
                wasteSaleRequest: request._id,
                status: 'REJECTED',
                stage: 'WAITING_USER',
                reason: 'USER_NOT_CONFIRMED_IN_TIME',
                actionBy: 'SYSTEM',
                note: 'ผู้ใช้กดยืนยันหลังหมดเวลา 2 ชั่วโมง'
            });

            return res.redirect(
                '/user/wasteSaleRequest?error=' +
                encodeURIComponent('หมดเวลาการยืนยันแล้ว')
            );
        }

        request.status = 'confirmed';
        request.confirmedAt = new Date();
        await request.save();

        await wasteSaleRequestLog.create({
            wasteSaleRequest: request._id,
            status: 'CONFIRMED',
            actionBy: 'USER'
        });

        return res.redirect(
            '/user/wasteSaleRequest?success=' +
            encodeURIComponent('ยืนยันคำขอเรียบร้อยแล้ว')
        );

    } catch (err) {
        console.error(err);
        return res.redirect(
            '/user/wasteSaleRequest?error=' +
            encodeURIComponent('เกิดข้อผิดพลาดในระบบ')
        );
    }
};

const wasteSaleRequestUserReject = async (req, res) => {
    try {
        const { stage, id } = req.params;
        const { reason } = req.body;

        if (!id || !stage || !reason) {
            return res.status(400).json({
                success: false,
                message: 'ข้อมูลไม่ครบถ้วน'
            });
        }

        // update main request
        await wasteSaleRequest.findByIdAndUpdate(id, {
            status: 'CANCELLED_BY_USER'
        });

        // log
        await wasteSaleRequestLog.create({
            wasteSaleRequest: id,
            status: 'CANCELLED_BY_USER',
            stage,
            reason,
            actionBy: 'USER'
        });

        return res.json({
            success: true,
            message: 'ยกเลิกคำขอเรียบร้อยแล้ว'
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาด'
        });
    }
};

// หน้าข้อมูลติดต่อ
const user_contact = async(req, res) => {
    try {
        // ดึงข้อมูลคณะกรรมการทั้งหมดที่ยังไม่ถูกลบ
        const allBoards = await Board.find({ isDeleted: false }).sort({ createdAt: 1 });
        
        // แยกข้อมูลตามฝ่าย
        const boardsByDepartment = {
            executive: allBoards.filter(b => b.department === 'ฝ่ายอำนวยการ'),
            pr: allBoards.filter(b => b.department === 'ฝ่ายประชาสัมพันธ์/วางแผนดำเนินและติดตามผล'),
            recruitment: allBoards.filter(b => b.department === 'ฝ่ายรับสมัคร'),
            purchase: allBoards.filter(b => b.department === 'ฝ่ายรับซื้อขยะ'),
            finance: allBoards.filter(b => b.department === 'ฝ่ายการเงินและบัญชี'),
            withdrawal: allBoards.filter(b => b.department === 'ฝ่ายเบิกถอนเงินฝากธนาคาร'),
            registry: allBoards.filter(b => b.department === 'ฝ่ายงานทะเบียนและธุรการ'),
            fund: allBoards.filter(b => b.department === 'ฝ่ายจัดการทุนและฌาปนกิจ'),
            photo: allBoards.filter(b => b.department === 'ฝ่ายภาพกิจกรรม')
        };
        
        res.render('user/contact', {
            mytitle: 'ติดต่อ-สอบถาม',
            currentPage: 'contact',
            boards: boardsByDepartment
        });
    } catch (error) {
        console.error('Error in user_contact:', error);
        res.redirect('/user/contact?error=เกิดข้อผิดพลาดในการโหลดข้อมูล');
    }
}

const user_wastePrices = async (req, res) => {
    try {
        const wasteItems = await myWaste.find({ isDeleted: false })
            .populate({
                path: 'wasteType',
                match: { isDeleted: false },
                select: 'wasteTypeName colorTheme'
            })
            .select('wasteName pricePerUnit img wasteType')
            .lean();

        const filtered = wasteItems.filter(item => item.wasteType);

        res.render('user/wastePrices', { waste: filtered });
    } catch (err) {
        console.error("เกิดข้อผิดพลาดในการดึงข้อมูลขยะ:", err);
        res.status(500).send("เกิดข้อผิดพลาดในการดึงข้อมูลขยะ");
    }
};

// หน้ากิจกรรมทั้งหมด
const user_allActivity = async (req, res) => {
    try {
        const searchQuery = req.query.search?.trim() || "";
        const page = parseInt(req.query.page) || 1;
        const limit = 12; // จำนวนรายการต่อหน้า
        const skip = (page - 1) * limit;
        
        let query = { isDeleted: false };

        if (searchQuery) {
            query = {
                ...query,
                title: { $regex: new RegExp(searchQuery, "i") }
            };
        }

        // นับจำนวนรายการทั้งหมด
        const totalActivities = await myActivity.countDocuments(query);
        
        // คำนวณจำนวนหน้าทั้งหมด
        const totalPages = Math.ceil(totalActivities / limit);

        // ดึงข้อมูลกิจกรรมตาม pagination
        const result = await myActivity.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        // แปลงวันที่ในแต่ละกิจกรรม
        const activities = result.map(activity => ({
            ...activity._doc,
            formattedDate: moment(activity.createdAt).format('YYYY-MM-DD')
        }));

        res.render('user/allActivity', { 
            activity: activities,
            search: searchQuery,
            pagination: {
                currentPage: page,
                totalPages: totalPages,
                totalItems: totalActivities,
                itemsPerPage: limit,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            }
        });
    } catch (err) {
        console.log(err);
        res.status(500).send('เกิดข้อผิดพลาดในระบบ');
    }
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

// เก็บรูปภาพที่อัปโหลดจาก complaint
// const Storage = multer.diskStorage({
//     destination: './public/upload/complaint/',
//     filename: function (req, file, cb) {
//         cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
//     }
// });

// const Upload3 = multer({
//     storage: Storage,   // ใช้ Storage ตัวใหญ่
//     limits: { fileSize: 10 * 1024 * 1024 } // จำกัด 10MB
// }).single('image');     // ต้องตรงกับ name="image" ใน form

const upload3 = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 }
}).single('image');

// หน้าคำร้องเรียน
const user_complaint = (req, res)=> {
    res.render('user/complaint', { session: req.session });
}

// เพิ่มคำร้องเรียน
const complaintPost = (req, res) => {
    upload3(req, res, async (err) => {
        if (err) {
            console.error("Multer upload error:", err);
            return res.redirect('/user/complaint?error=อัปโหลดไฟล์ไม่สำเร็จ');
        }

        try {
            if (!req.session || !req.session.username) {
                return res.redirect('/user/complaint?error=กรุณาเข้าสู่ระบบก่อนทำรายการ');
            }

            const family = await Family.findOne({ username: req.session.username });
            if (!family) {
                return res.redirect('/user/complaint?error=ไม่พบข้อมูลครัวเรือน');
            }

            const { complaintMessage, category } = req.body;

            if (!complaintMessage || !category) {
                return res.redirect('/user/complaint?error=กรุณากรอกข้อมูลให้ครบถ้วน');
            }

            let imageUrl = null;

            // อัปโหลดรูปขึ้น Cloudinary
            if (req.file) {
                const uploadFromBuffer = () => {
                    return new Promise((resolve, reject) => {
                        const stream = cloudinary.uploader.upload_stream(
                            {
                                folder: 'complaints',
                                resource_type: 'image'
                            },
                            (error, result) => {
                                if (result) resolve(result);
                                else reject(error);
                            }
                        );

                        streamifier
                            .createReadStream(req.file.buffer)
                            .pipe(stream);
                    });
                };

                const result = await uploadFromBuffer();
                imageUrl = result.secure_url;
            }

            const newComplaint = new Complaint({
                family: family._id,
                complaintMessage: complaintMessage.trim(),
                category,
                image: imageUrl || null
            });

            await newComplaint.save();

            res.redirect('/user/complaint?message=ส่งแบบฟอร์มสำเร็จ');

        } catch (err) {
            console.error('Complaint submission error:', err);
            res.redirect('/user/complaint?error=เกิดข้อผิดพลาดในระบบ');
        }
    });
};

// หน้ารายละเอียดข่าวประชามสัมพันธ์
const detailNews = (req, res) => {
    const filter = { isDeleted: false };
    myNews.findById(req.params.id)
        .then(news => {
        if (!news) {
            return res.status(404).send('News not found');
        }
        const formattedNews = {
            ...news._doc,
            formattedDate: moment(news.createdAt).format('YYYY-MM-DD')
        };
        res.render('user/detailNews', { news: formattedNews });
    })
    .catch(err => {
        console.error(err);
        res.status(500).send('Error fetching News details');
    });
};


// หน้าขอรับฌาปนกิจ
const funeralRequest = async (req, res) => {
    try {
        if (!req.session || !req.session.username) {
            return res.redirect('/login?error=' + encodeURIComponent('กรุณาเข้าสู่ระบบก่อนทำรายการ'));
        }

        const family = await Family.findOne({ 
            username: req.session.username,
            isDeleted: false 
        }).populate('village');

        if (!family) {
            return res.redirect('/?error=' + encodeURIComponent('ไม่พบข้อมูลครัวเรือน'));
        }

        // ส่งข้อมูล family ไปยังหน้า view
        res.render('user/funeral', {
            mytitle: 'ยื่นเรื่องขอรับฌาปนกิจสงเคราะห์',
            media: [],
            family: family // เพิ่มส่วนนี้
        });
    } catch (error) {
        console.error('funeralRequest error:', error);
        res.status(500).send('Server Error');
    }
};

// API: ดึงรายชื่อสมาชิกในครัวเรือน
const getFamilyMembers = async (req, res) => {
    try {
        if (!req.session || !req.session.username) {
            return res.status(401).json({
                success: false,
                message: 'กรุณาเข้าสู่ระบบก่อนทำรายการ'
            });
        }

        const family = await Family.findOne({ 
            username: req.session.username,
            isDeleted: false 
        });

        if (!family) {
            return res.status(404).json({
                success: false,
                message: 'ไม่พบข้อมูลครัวเรือน'
            });
        }

        // ดึงข้อมูลสมาชิกทั้งหมด
        const members = await Member.find({
            familyID: family._id,
            isDeleted: false
        }).select('name idCardNumber age phone birthDate Status beneficiaries').lean();

        const memberList = [];

        members.forEach(member => {
            // เพิ่มสมาชิกหลัก (ตัวแทน)
            memberList.push({
                _id: member._id,
                name: member.name,
                idCardNumber: member.idCardNumber || '',
                age: member.age || '',
                phone: member.phone || '',
                status: member.Status || 'living',
                type: 'main'
            });

            // เพิ่มผู้รับผลประโยชน์
            if (member.beneficiaries && member.beneficiaries.length > 0) {
                member.beneficiaries.forEach(beneficiary => {
                    memberList.push({
                        _id: `beneficiary_${beneficiary._id}`,
                        name: beneficiary.name,
                        relation: beneficiary.relation,
                        status: beneficiary.status || 'living',
                        type: 'beneficiary',
                        mainMemberId: member._id,
                        // ⬇️ เพิ่ม 3 บรรทัดนี้
                        idCardNumber: '', // beneficiary ไม่มีเลขบัตร
                        age: '',          // beneficiary ไม่มีอายุ
                        phone: ''         // beneficiary ไม่มีเบอร์โทร
                    });
                });
            }
        });

        // กรองเฉพาะคนที่ยังมีชีวิต
        const livingMembers = memberList.filter(m => m.status === 'living');

        return res.json({
            success: true,
            data: livingMembers
        });

    } catch (error) {
        console.error('getFamilyMembers error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงข้อมูลสมาชิก'
        });
    }
};

// ตรวจสอบสิทธิ์การขอรับฌาปนกิจ
const checkMyEligibility = async (req, res) => {
    try {
        if (!req.session || !req.session.username) {
            return res.status(401).json({
                success: false,
                message: 'กรุณาเข้าสู่ระบบก่อนทำรายการ'
            });
        }

        const family = await Family.findOne({ 
            username: req.session.username,
            isDeleted: false 
        });

        if (!family) {
            return res.status(404).json({
                success: false,
                message: 'ไม่พบข้อมูลครัวเรือน'
            });
        }

        const familyID = family._id;

        const account = await WasteBankAccount.findOne({
            familyID,
            isDeleted: false
        }).lean();

        if (!account) {
            return res.status(404).json({
                success: false,
                message: 'ไม่พบบัญชีธนาคารขยะของท่าน'
            });
        }

        // คำนวณคุณสมบัติ
        const hasEverBeenMember = !!account.MembershipDate;
        const totalSalesAmount = account.TotalSalesAmount || 0;
        const currentBalance = account.Balance || 0;
        const isCurrentlyActiveMember = account.IsMember === true;

        let membershipDays = 0;
        let membershipMonths = 0;
        let passedMembershipPeriod = false;

        if (account.MembershipDate) {
            const today = new Date();
            const membershipDate = new Date(account.MembershipDate);
            membershipDays = Math.floor((today - membershipDate) / (1000 * 60 * 60 * 24));
            membershipMonths = Math.floor(membershipDays / 30);
            passedMembershipPeriod = membershipDays >= 180;
        }

        const hasActiveBalance = currentBalance >= 300;
        const passedSalesRequirement = totalSalesAmount >= 300;

        // เงื่อนไขการมีสิทธิ์
        const isEligible =
            hasEverBeenMember &&
            passedMembershipPeriod &&
            hasActiveBalance &&
            isCurrentlyActiveMember;

        const ineligibleReasons = [];

        if (!hasEverBeenMember) {
            ineligibleReasons.push('ยังไม่เคยเป็นสมาชิก');
        }
        if (hasEverBeenMember && !passedMembershipPeriod) {
            ineligibleReasons.push(`ยังไม่ครบ 180 วัน (เป็นสมาชิกมา ${membershipDays} วัน)`);
        }
        if (!hasActiveBalance) {
            ineligibleReasons.push(`ยอดคงเหลือไม่ถึง 300 บาท (มี ${currentBalance.toFixed(2)} บาท)`);
        }
        if (!isCurrentlyActiveMember) {
            ineligibleReasons.push('สถานะสมาชิกถูกพักชั่วคราว');
        }

        return res.json({
            success: true,
            data: {
                hasEverBeenMember,
                isCurrentlyActiveMember,
                membershipDate: account.MembershipDate,
                membershipDays,
                membershipMonths,
                totalSalesAmount,
                passedSalesRequirement,
                currentBalance,
                hasActiveBalance,
                passedMembershipPeriod,
                isEligible,
                ineligibleReasons,
                pendingDeductions: account.PendingDeductions || 0,
                registrationDate: account.OpenDate
            }
        });

    } catch (error) {
        console.error('checkMyEligibility error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการตรวจสอบคุณสมบัติ'
        });
    }
};

const uploadfuneral = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB
}).fields([
    { name: 'deathCertificate', maxCount: 1 },           // ใบมรณะบัตร
    { name: 'deceasedIdCard', maxCount: 1 },             // บัตรประชาชนผู้ตาย
    { name: 'deceasedHouseRegistration', maxCount: 1 },  // ทะเบียนบ้านผู้ตาย
    { name: 'applicantIdCard', maxCount: 1 },            // บัตรประชาชนผู้ยื่นคำขอ
    { name: 'applicantHouseRegistration', maxCount: 1 }  // ทะเบียนบ้านผู้ยื่นคำขอ
]);

// ฟังก์ชันอัปโหลดไฟล์ขึ้น Cloudinary (รองรับทั้งภาพและ PDF)
const uploadToCloudinary = (fileBuffer, fileName, folderName = 'funeral-documents') => {
    const isPDF = fileName.toLowerCase().endsWith('.pdf');
    
    return new Promise((resolve, reject) => {
        const uploadOptions = {
            folder: folderName,
            resource_type: isPDF ? 'raw' : 'image',
            type: 'upload',
            access_mode: 'public'
        };

        // เพิ่ม format สำหรับ PDF
        // if (isPDF) {
        //     uploadOptions.format = 'pdf';
        // }

        const stream = cloudinary.uploader.upload_stream(
            uploadOptions,
            (error, result) => {
                if (result) {
                    resolve(result);
                } else {
                    reject(error);
                }
            }
        );
        
        streamifier.createReadStream(fileBuffer).pipe(stream);
    });
};

// ยื่นคำขอรับฌาปนกิจ
const submitFuneralRequest = (req, res) => {
    uploadfuneral(req, res, async (err) => {
        if (err) {
            console.error("Multer upload error:", err);
            return res.status(400).json({
                success: false,
                message: 'อัปโหลดไฟล์ไม่สำเร็จ: ' + err.message
            });
        }

        try {
            if (!req.session || !req.session.username) {
                return res.status(401).json({
                    success: false,
                    message: 'กรุณาเข้าสู่ระบบก่อนทำรายการ'
                });
            }

            const family = await Family.findOne({ 
                username: req.session.username,
                isDeleted: false 
            });

            if (!family) {
                return res.status(404).json({
                    success: false,
                    message: 'ไม่พบข้อมูลครัวเรือน'
                });
            }

            const familyID = family._id;

            // ดึงข้อมูลจาก req.body
            const {
                responsiblePersonName,
                relationship,
                deceasedName,
                deceasedAge,
                idCard,
                deceasedAddress,
                deceasedVillage,
                subDistrict,
                district,
                province,
                postalCode,
                phone,
                causeOfDeath,
                dateOfDeath,
                notes,
                memberID
            } = req.body;

            // ตรวจสอบ required fields
            const requiredFields = {
                responsiblePersonName,
                relationship,
                deceasedName,
                deceasedAge,
                idCard,
                deceasedAddress,
                deceasedVillage,
                subDistrict,
                district,
                province,
                postalCode,
                phone,
                causeOfDeath,
                dateOfDeath
            };

            const missingFields = Object.entries(requiredFields)
                .filter(([_, value]) => !value || value.toString().trim() === '')
                .map(([key]) => key);

            if (missingFields.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: `กรุณากรอกข้อมูลให้ครบถ้วน`
                });
            }

            // ตรวจสอบว่ามีไฟล์ครบ 5 ไฟล์
            const requiredFiles = [
                'deathCertificate',
                'deceasedIdCard',
                'deceasedHouseRegistration',
                'applicantIdCard',
                'applicantHouseRegistration'
            ];

            const missingFiles = requiredFiles.filter(fieldName => {
                return !req.files || !req.files[fieldName] || !req.files[fieldName][0];
            });

            if (missingFiles.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'กรุณาอัปโหลดเอกสารให้ครบทั้ง 5 ไฟล์'
                });
            }

            // ตรวจสอบรูปแบบบัตรประชาชน
            const idCardRegex = /^[0-9]{13}$/;
            if (!idCardRegex.test(idCard.replace(/-/g, ''))) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'เลขบัตรประชาชนไม่ถูกต้อง' 
                });
            }

            // ตรวจสอบคุณสมบัติ
            const account = await WasteBankAccount.findOne({
                familyID,
                isDeleted: false
            });

            if (!account || !account.MembershipDate) {
                return res.status(400).json({
                    success: false,
                    message: 'ยังไม่มีสิทธิ์รับฌาปนกิจ'
                });
            }

            const membershipDays = Math.floor(
                (new Date() - new Date(account.MembershipDate)) / (1000 * 60 * 60 * 24)
            );

            if (membershipDays < 180) {
                return res.status(400).json({
                    success: false,
                    message: `ยังไม่ครบ 180 วัน (เป็นสมาชิกมา ${membershipDays} วัน)`
                });
            }

            if (account.Balance < 300) {
                return res.status(400).json({
                    success: false,
                    message: `ยอดคงเหลือไม่พอ (มี ${account.Balance.toFixed(2)} บาท)`
                });
            }

            if (!account.IsMember) {
                return res.status(400).json({
                    success: false,
                    message: 'สถานะสมาชิกถูกพักชั่วคราว'
                });
            }

            // อัปโหลดไฟล์ทั้งหมดไป Cloudinary
            const uploadPromises = requiredFiles.map(async (fieldName) => {
                const file = req.files[fieldName][0];
                try {
                    const result = await uploadToCloudinary(file.buffer, file.originalname);
                    return {
                        fieldName,
                        url: result.secure_url
                    };
                } catch (error) {
                    console.error(`Error uploading ${fieldName}:`, error);
                    throw new Error(`ไม่สามารถอัปโหลด ${fieldName} ได้`);
                }
            });

            const uploadedFiles = await Promise.all(uploadPromises);

            // แปลง array เป็น object
            const documents = {};
            uploadedFiles.forEach(file => {
                documents[file.fieldName] = file.url;
            });

            const defaultFuneralAmount = 2000;

            // สร้างคำขอใหม่
            const request = new FuneralAssistance({
                familyID,
                responsiblePerson: {
                    name: responsiblePersonName,
                    relationshipToDeceased: relationship
                },
                deceasedInfo: {
                    name: deceasedName,
                    age: Number(deceasedAge),
                    idCardNumber: idCard.replace(/-/g, ''),
                    address: {
                        houseNumber: deceasedAddress,
                        moo: deceasedVillage,
                        subdistrict: subDistrict,
                        district,
                        province,
                        postalCode
                    },
                    phone,
                    causeOfDeath,
                    dateOfDeath: new Date(dateOfDeath),
                    memberID: memberID || null
                },
                financialInfo: {
                    totalAmount: defaultFuneralAmount,
                    totalMemberAccounts: 0,
                    perAccountAmount: 0,
                    totalDeductedAccounts: 0,
                    totalDeductedAmount: 0,
                    accountsWithSufficientBalance: 0,
                    accountsWithInsufficientBalance: 0
                },
                documents, // ← เก็บ URL จาก Cloudinary
                notes: notes || '',
                status: 'pending',
                submittedBy: {
                    userType: 'user',
                    userId: familyID,
                    userModel: 'Family',
                    submittedAt: new Date()
                },
                eligibilityCheck: {
                    isMember: true,
                    membershipDate: account.MembershipDate,
                    membershipDays,
                    totalSalesAmount: account.TotalSalesAmount,
                    currentBalance: account.Balance,
                    pendingDeductions: account.PendingDeductions || 0,
                    passedMembershipPeriod: true,
                    isEligible: true,
                    checkedAt: new Date()
                }
            });

            await request.save();

            return res.json({
                success: true,
                message: 'ยื่นคำขอเรียบร้อย รอเจ้าหน้าที่ตรวจสอบและกำหนดยอดเงิน',
                data: {
                    requestID: request._id,
                    status: request.status,
                    defaultAmount: defaultFuneralAmount
                }
            });

        } catch (error) {
            console.error('submitFuneralRequest error:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาด: ' + error.message
            });
        }
    });
};

// หน้าประวัติคำขอของตนเอง
const myFuneralRequestsPage = async (req, res) => {
    try {
        if (!req.session || !req.session.username) {
            return res.redirect('/login?error=' + encodeURIComponent('กรุณาเข้าสู่ระบบก่อนทำรายการ'));
        }

        const family = await Family.findOne({ 
            username: req.session.username,
            isDeleted: false 
        });

        if (!family) {
            return res.redirect('/?error=' + encodeURIComponent('ไม่พบข้อมูลครัวเรือน'));
        }

        res.render('user/funeralRequest', {
            mytitle: 'ประวัติคำขอฌาปนกิจของฉัน',
            media: []
        });
    } catch (error) {
        console.error('myFuneralRequestsPage error:', error);
        res.status(500).send('Server Error');
    }
};

// API: ดึงรายการคำขอของตนเอง
const getMyFuneralRequests = async (req, res) => {
    try {
        if (!req.session || !req.session.username) {
            return res.status(401).json({
                success: false,
                message: 'กรุณาเข้าสู่ระบบก่อนทำรายการ'
            });
        }

        const family = await Family.findOne({ 
            username: req.session.username,
            isDeleted: false 
        });

        if (!family) {
            return res.status(404).json({
                success: false,
                message: 'ไม่พบข้อมูลครัวเรือน'
            });
        }

        const requests = await FuneralAssistance.find({
            familyID: family._id,
            isDeleted: false
        })
        .populate('approvedBy', 'name email firstname lastname')
        .populate('rejectedBy', 'name email firstname lastname')
        .sort({ createdAt: -1 })
        .lean();

        res.json({ success: true, data: requests });

    } catch (error) {
        console.error('getMyFuneralRequests error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'เกิดข้อผิดพลาดในการดึงข้อมูล' 
        });
    }
};

//API: ดูรายละเอียดคำขอ
const getMyFuneralRequestDetail = async (req, res) => {
    try {
        const { id } = req.params;
        
        if (!req.session || !req.session.username) {
            return res.status(401).json({
                success: false,
                message: 'กรุณาเข้าสู่ระบบก่อนทำรายการ'
            });
        }

        const family = await Family.findOne({ 
            username: req.session.username,
            isDeleted: false 
        });

        if (!family) {
            return res.status(404).json({
                success: false,
                message: 'ไม่พบข้อมูลครัวเรือน'
            });
        }

        const request = await FuneralAssistance.findOne({
            _id: id,
            familyID: family._id,
            isDeleted: false
        })
        .populate('approvedBy', 'name email firstname lastname')
        .populate('rejectedBy', 'name email firstname lastname')
        .populate('createdBy', 'name email firstname lastname')
        .lean();

        if (!request) {
            return res.status(404).json({ 
                success: false, 
                message: 'ไม่พบคำขอนี้หรือคุณไม่มีสิทธิ์เข้าถึง' 
            });
        }

        res.json({ success: true, data: request });

    } catch (error) {
        console.error('getMyFuneralRequestDetail error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'เกิดข้อผิดพลาดในการดึงข้อมูล' 
        });
    }
};

//ยกเลิกคำขอ (เฉพาะ pending)
const cancelMyFuneralRequest = async (req, res) => {
    try {
        const { id } = req.params;
        
        if (!req.session || !req.session.username) {
            return res.status(401).json({
                success: false,
                message: 'กรุณาเข้าสู่ระบบก่อนทำรายการ'
            });
        }

        const family = await Family.findOne({ 
            username: req.session.username,
            isDeleted: false 
        });

        if (!family) {
            return res.status(404).json({
                success: false,
                message: 'ไม่พบข้อมูลครัวเรือน'
            });
        }

        const request = await FuneralAssistance.findOne({
            _id: id,
            familyID: family._id,
            status: 'pending',
            isDeleted: false
        });

        if (!request) {
            return res.status(404).json({
                success: false,
                message: 'ไม่พบคำขอนี้หรือไม่สามารถยกเลิกได้ (เฉพาะสถานะ "รอตรวจสอบ" เท่านั้น)'
            });
        }

        request.status = 'cancelled';
        request.notes = `${request.notes || ''}\n[ยกเลิกโดยผู้ใช้เมื่อ ${new Date().toLocaleString('th-TH')}]`;
        await request.save();

        res.json({ 
            success: true, 
            message: 'ยกเลิกคำขอเรียบร้อยแล้ว' 
        });

    } catch (error) {
        console.error('cancelMyFuneralRequest error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'เกิดข้อผิดพลาดในการยกเลิกคำขอ' 
        });
    }
};



// หน้าโปรไฟล์
const user_profile = async (req, res) => {
    try {
        // ตรวจสอบ session
        if (!req.session || !req.session.username) {
            console.log('No session username');
            return res.redirect('/user?error=กรุณาเข้าสู่ระบบก่อนทำรายการ');
        }

        // ค้นหาครอบครัวจาก session
        const family = await Family.findOne({ username: req.session.username });

        if (!family) {
            console.log('Family not found');
            return res.redirect('/user?error=ไม่พบข้อมูลครัวเรือน');
        }

        // รับค่า filter เดือน/ปี จาก query parameter
        const selectedMonth = req.query.month;
        const selectedYear = req.query.year || new Date().getFullYear();
        
        // สร้าง date range สำหรับ filter
        let dateFilter = {};
        if (selectedMonth) {
            const startDate = new Date(selectedYear, selectedMonth - 1, 1);
            const endDate = new Date(selectedYear, selectedMonth, 0, 23, 59, 59);
            dateFilter = {
                $gte: startDate,
                $lte: endDate
            };
        }

        // ดึงสมาชิกในครอบครัว
        const members = await Member.find({ familyID: family._id });

        // ดึงบัญชี WasteBankAccount
        const wasteBankAccount = await WasteBankAccount.findOne({ familyID: family._id });

        // ดึงหมู่บ้าน
        const village = await Village.findById(family.village);

        if (!wasteBankAccount) {
            console.log('No waste bank account');
            return res.redirect('/user?error=ไม่พบบัญชีธนาคารขยะ');
        }

        // สร้าง query สำหรับการขายขยะ
        let wastePurchaseQuery = {
            accountId: wasteBankAccount._id,
            isDeleted: false
        };

        // เพิ่ม date filter ถ้ามีการเลือกเดือน
        if (selectedMonth) {
            wastePurchaseQuery.purchaseDate = dateFilter;
        }

        // ดึงข้อมูลการขายขยะแบบมี filter หรือไม่มี filter
        const wastePurchases = await WastePurchase.find(wastePurchaseQuery)
            .populate('wasteItems')
            .sort({ purchaseDate: -1 });

        // สร้าง query สำหรับการถอนเงิน
        let transactionQuery = {
            account: wasteBankAccount._id,
            isDeleted: false
        };

        // เพิ่ม date filter ถ้ามีการเลือกเดือน
        if (selectedMonth) {
            transactionQuery.transactionDate = dateFilter;
        }

        // ดึงข้อมูลการถอนเงิน
        const transactions = await transactionMoney.find(transactionQuery)
            .sort({ transactionDate: -1 });

        // ⭐ ดึงข้อมูลฌาปนกิจ - เฉพาะรายการที่บัญชีนี้ถูกหัก (ต้องเป็นสมาชิกก่อน)
        let funeralAssistances = [];
        
        // ตรวจสอบว่าบัญชีนี้เป็นสมาชิกหรือไม่
        if (wasteBankAccount.IsMember) {
            let funeralQuery = {
                'deductedAccounts.accountID': wasteBankAccount._id,
                isDeleted: false,
                status: { $ne: 'cancelled' }
            };

            // เพิ่ม date filter ถ้ามีการเลือกเดือน
            if (selectedMonth) {
                funeralQuery.createdAt = dateFilter;
            }

            funeralAssistances = await FuneralAssistance.find(funeralQuery)
                .sort({ createdAt: -1 });

            console.log('=== DEBUG FUNERAL ===');
            console.log('Waste Bank Account ID:', wasteBankAccount._id);
            console.log('Is Member:', wasteBankAccount.IsMember);
            console.log('Found funeral assistances:', funeralAssistances.length);
        } else {
            console.log('=== DEBUG FUNERAL ===');
            console.log('Account is not a member yet - no funeral deductions');
        }

        // รวมรายการเป็น statement
        const statement = [];

        const user = await Family.findOne({ username: req.session.username });

        if (!user) {
            return res.status(404).json({ success: false, message: 'ไม่พบผู้ใช้' });
        }

        const ideas = await Idea.find({ authorId: user._id, isDeleted: false })
            .populate('authorId', 'familyName')
            .populate('comments.author', 'familyName')
            .sort({ createdAt: -1 });

        // รายการขายขยะ (ฝากเงิน)
        wastePurchases.forEach(purchase => {
            statement.push({
                type: 'deposit',
                amount: purchase.totalAmount,
                date: purchase.purchaseDate,
                source: 'ขายขยะ',
                details: `รายการ: ${purchase.wasteItems.length} รายการ`,
            });
        });

        // รายการถอนเงิน
        transactions.forEach(tx => {
            statement.push({
                type: tx.transactionType,
                amount: tx.amount,
                date: tx.transactionDate,
                source: tx.transactionType === 'withdraw' ? 'ถอนเงิน' : 'ฝากเงิน',
                details: tx.note,
                status: tx.status
            });
        });

        // ⭐ รายการหักเงินฌาปนกิจ - เฉพาะบัญชีสมาชิก
        if (wasteBankAccount.IsMember && funeralAssistances.length > 0) {
            funeralAssistances.forEach(funeral => {
                // หาข้อมูลการหักของบัญชีนี้
                const myDeduction = funeral.deductedAccounts.find(acc => {
                    const accIdStr = acc.accountID.toString();
                    const wasteAccIdStr = wasteBankAccount._id.toString();
                    return accIdStr === wasteAccIdStr;
                });

                if (myDeduction) {
                    console.log('Found deduction for funeral:', funeral._id);
                    console.log('Deceased:', funeral.deceasedInfo.name);
                    console.log('Deduction amount:', myDeduction.deductedAmount);
                    console.log('Status:', myDeduction.status);
                    
                    statement.push({
                        type: 'funeral_deduction',
                        amount: myDeduction.deductedAmount,
                        date: myDeduction.deductedAt || funeral.createdAt,
                        source: 'หักเงินฌาปนกิจ',
                        details: `ผู้เสียชีวิต: ${funeral.deceasedInfo.name}${myDeduction.status === 'insufficient_but_deducted' ? ' (เงินไม่พอ)' : ''}`,
                        funeralId: funeral._id,
                        deceasedName: funeral.deceasedInfo.name,
                        status: myDeduction.status,
                        balanceBefore: myDeduction.balanceBefore,
                        balanceAfter: myDeduction.balanceAfter,
                        pendingAmount: myDeduction.pendingAmount || 0
                    });
                } else {
                    console.log('⚠️ Warning: Funeral record found but no matching deduction');
                    console.log('Funeral ID:', funeral._id);
                    console.log('Expected Account ID:', wasteBankAccount._id.toString());
                }
            });
        }

        console.log('Total statement items:', statement.length);
        console.log('Funeral items in statement:', statement.filter(s => s.type === 'funeral_deduction').length);

        // เรียงตามวันที่ใหม่ -> เก่า
        statement.sort((a, b) => new Date(b.date) - new Date(a.date));

        // ดึงข้อมูลคำร้องขายขยะ (ไม่ต้อง filter เพราะเป็นข้อมูลทั่วไป)
        const wasteSaleRequests = await wasteSaleRequest.find({ family: family._id })
            .populate('waste')
            .sort({ createdAt: -1 });

        // ดึงข้อมูลข้อร้องเรียน (ไม่ต้อง filter เพราะเป็นข้อมูลทั่วไป)
        const complaints = await Complaint.find({ family: family._id })
            .sort({ createdAt: -1 })
            .populate('reply.employee');

        // คำนวณรายได้รวม / จำนวนรายการขยะ (จากข้อมูลที่ filter แล้ว)
        const totalEarnings = wastePurchases.reduce((sum, purchase) => sum + purchase.totalAmount, 0);
        const totalWasteItems = wastePurchases.reduce((sum, purchase) => sum + (purchase.wasteItems ? purchase.wasteItems.length : 0), 0);

        // สร้างรายการเดือนสำหรับ dropdown
        const monthOptions = [];
        const currentDate = new Date();
        
        // สร้างรายการเดือนย้อนหลัง 12 เดือน
        for (let i = 0; i < 12; i++) {
            const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
            const monthValue = date.getMonth() + 1;
            const yearValue = date.getFullYear();
            const monthName = date.toLocaleDateString('th-TH', { 
                month: 'long', 
                year: 'numeric' 
            });
            
            monthOptions.push({
                value: monthValue,
                year: yearValue,
                name: monthName,
                selected: selectedMonth == monthValue && selectedYear == yearValue
            });
        }

        // ส่งข้อมูลไปยัง view
        res.render('user/profile', {
            familyName: family.familyName,
            username: family.username,
            address: family.address,
            numFamilyMembers: family.NumFamilyMembers,
            members: members,
            village: village,
            wasteBankAccount: wasteBankAccount,
            wastePurchases: wastePurchases,
            complaints: complaints,
            wasteSaleRequests: wasteSaleRequests,
            totalEarnings: totalEarnings,
            totalWasteItems: totalWasteItems,
            role: req.session.role,
            createdAt: family.createdAt,
            statement: statement,
            posts: ideas,
            monthOptions: monthOptions,
            selectedMonth: selectedMonth,
            selectedYear: selectedYear
        });

    } catch (err) {
        console.error('Error fetching data:', err);
        res.status(500).send('เกิดข้อผิดพลาดในการดึงข้อมูล');
    }
};

// ตั้งค่าการอัปโหลดรูปภาพ
// const storage2 = multer.diskStorage({
//     destination: './public/ideasImg',
//     filename: function (req, file, cb) {
//         cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
//     }
// });

const upload2 = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 }
}).single('image');

const user_ideas = async (req, res) => {
    try {
        const user = await Family.findOne({ username: req.session.username });

        const ideas = await Idea.find({ isDeleted: false })
            .populate('authorId', 'familyName')
            .populate('comments.author', 'familyName')
            .sort({ createdAt: -1});

        res.render('user/ideas', {
            posts: ideas,
            user
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

// เพิ่มไอเดีย
const create_idea = [
    upload2,
    async (req, res) => {
        try {
            const username = req.session.username;
            if (!username) {
                return res.status(401).send('Unauthorized');
            }

            const user = await Family.findOne({ username });
            if (!user) {
                return res.status(404).render('404', { mytitle: 'User not found' });
            }

            const { title, category, content } = req.body;

            let imageUrl = null;

            // อัปโหลดรูปขึ้น Cloudinary
            if (req.file) {
                const uploadFromBuffer = () => {
                    return new Promise((resolve, reject) => {
                        const stream = cloudinary.uploader.upload_stream(
                            {
                                folder: 'ideas',
                                resource_type: 'image'
                            },
                            (error, result) => {
                                if (result) resolve(result);
                                else reject(error);
                            }
                        );

                        streamifier
                            .createReadStream(req.file.buffer)
                            .pipe(stream);
                    });
                };

                const result = await uploadFromBuffer();
                imageUrl = result.secure_url;
            }

            await Idea.create({
                authorId: user._id,
                title,
                category,
                content,
                imageUrl: imageUrl || null
            });

            return res.redirect('/user/ideas');

        } catch (error) {
            console.error(error);
            res.status(500).send('Server error');
        }
    }
];
// กดไลค์
const like_idea = async (req, res) => {
    try {
        const idea = await Idea.findById(req.params.id);
        if (!idea) return res.status(404).json({ success: false, message: 'Idea not found' });

        const userId = req.user ? req.user._id.toString() : null;
        if (!userId) return res.status(401).json({ success: false, message: 'Please login to like' });

        const index = idea.likes.findIndex(id => id.toString() === userId);
        if (index === -1) {
        idea.likes.push(userId);
        } else {
        idea.likes.splice(index, 1);
        }
        await idea.save();

        res.json({ success: true, likeCount: idea.likes.length });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false });
    }
};


// คอมเมนต์
const comment_idea = async (req, res) => {
    try {
        const username = req.session.username;
        if (!username) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const user = await Family.findOne({ username });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const { comment } = req.body;
        if (!comment || comment.trim() === '') {
            return res.status(400).json({ success: false, message: 'Comment is required' });
        }

        const idea = await Idea.findById(req.params.id);
        if (!idea) {
            return res.status(404).json({ success: false, message: 'Idea not found' });
        }

        const newComment = {
            author: user._id,
            content: comment.trim(),
            createdAt: new Date()
        };

        idea.comments.push(newComment);
        await idea.save();

        // ดึง comment ล่าสุดพร้อม populate
        await idea.populate('comments.author', 'familyName');
        const lastComment = idea.comments.at(-1);

        res.status(200).json({ success: true, comment: lastComment });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Error posting comment' });
    }
};

const delete_ideas = async (req, res) => {
    try {
        const { id } = req.params;
        const post = await Idea.findById(id);

        if (!post) {
            return res.status(404).json({ success: false, message: 'ไม่พบโพสต์ที่ต้องการลบ' });
        }

        const result = await Idea.findByIdAndUpdate(id, { isDeleted: true });

        if (!result) {
            return res.status(404).json({ success: false, message: 'ไม่สามารถอัปเดตสถานะลบได้' });
        }

        return res.status(200).json({ success: true, message: 'ลบโพสต์สำเร็จ' });
    } catch (err) {
        console.error(err);
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดระหว่างลบ' });
    }
};

// const storage4 = multer.diskStorage({
//     destination: './public/ideasImg',
//         filename: (req, file, cb) => {
//         cb(null, Date.now() + '-' + file.originalname);
//     }
// });

const upload4 = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 }
}).single('image');

// แก้ไขไอเดีย
const edit_idea = (req, res) => {
    upload4(req, res, async (err) => {
        if (err) {
            console.error(err);
            return res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการอัปโหลดไฟล์'
            });
        }

        try {
            const id = req.params.id;
            const { title, content, category } = req.body;

            if (!title || !content || !category) {
                return res.status(400).json({
                    success: false,
                    message: 'กรุณากรอกข้อมูลให้ครบ'
                });
            }

            const post = await Idea.findById(id);
            if (!post) {
                return res.status(404).json({
                    success: false,
                    message: 'ไม่พบโพสต์'
                });
            }

            // อัปเดตข้อมูลข้อความ
            post.title = title;
            post.content = content;
            post.category = category;

            // ถ้ามีการอัปโหลดรูปใหม่ → upload ไป Cloudinary
            if (req.file) {
                const uploadFromBuffer = () => {
                    return new Promise((resolve, reject) => {
                        const stream = cloudinary.uploader.upload_stream(
                            {
                                folder: 'ideas',
                                resource_type: 'image'
                            },
                            (error, result) => {
                                if (result) resolve(result);
                                else reject(error);
                            }
                        );

                        streamifier
                            .createReadStream(req.file.buffer)
                            .pipe(stream);
                    });
                };

                const result = await uploadFromBuffer();
                post.imageUrl = result.secure_url;
            }

            await post.save();

            res.json({
                success: true,
                message: 'แก้ไขโพสต์เรียบร้อยแล้ว'
            });

        } catch (err) {
            console.error(err);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์'
            });
        }
    });
};

const notification = async (req, res) => {
    try {
        // หา ObjectId ของผู้ใช้จาก session
        const user = await Family.findOne({ username: req.session.username });
        if (!user) return res.status(404).redirect('/login');

        const userId = user._id;

        // ดึงการแจ้งเตือนทั้งหมดของ user
        const notifications = await Notification.find({ userId }).sort({ createdAt: -1 });
        const notificationUnRead = await Notification.find({ userId, read: false }).sort({ createdAt: -1});
        const notificationUnReadCount = notificationUnRead.length;
        // render หน้า พร้อมส่งข้อมูลไปยัง view
        res.render('user/notification', { notifications, notificationUnReadCount });
    } catch (err) {
        console.error(err);
        res.status(500).send('เกิดข้อผิดพลาดในการโหลดการแจ้งเตือน');
    }
};
const notificationPost = async (req, res) => {
    try {
        const { type, title, content, link, targetType, userIds } = req.body;

        if (!title || !content) {
        return res.status(400).json({ message: 'กรุณากรอก title และ content' });
        }

        let targetUsers = [];

        if (targetType === 'all') {
        const users = await Family.find({}, '_id');
        targetUsers = users.map(u => u._id.toString());
        } else if (userIds) {
        const users = await Family.find({ username: { $in: userIds.split(',').map(u => u.trim()) } }, '_id');
        targetUsers = users.map(u => u._id.toString());
        }

        if (targetUsers.length === 0) {
        return res.status(400).json({ message: 'ไม่พบผู้ใช้เป้าหมาย' });
        }

        const notifications = targetUsers.map(userId => ({
        userId,
        type: type,
        title,
        content,
        link: link || null,
        read: false,
        createdAt: new Date()
        }));

        await Notification.insertMany(notifications);

        // res.json({ message: ` ส่งแจ้งเตือนสำเร็จ ${notifications.length} คน` });
        res.redirect(`/user/notification`)
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "❌ เกิดข้อผิดพลาดในการส่งแจ้งเตือน", error: err.message });
    }
};

// ดึงข้อมูลแจ้งเตือนตาม id
const markNotificationAsRead = async (req, res) => {
    try {
        const notification = await Notification.findById(req.params.id);
        if (!notification) return res.status(404).json({ success: false, message: 'Notification not found' });

        // ดึง userId จาก session แทน req.user
        const username = req.session.username;
        if (!username) return res.status(401).json({ success: false, message: 'Please login first' });

        const user = await Family.findOne({ username });
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        const userId = user._id.toString();

        if (notification.userId.toString() !== userId) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        notification.read = true;
        await notification.save();

        res.json({ success: true, read: notification.read });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
// exports เพื่อให้ไฟล์อื่นสามารถเรียกใช้งานได้
module.exports = {
    user_index,
    user_wastetype,
    user_knowledge,
    user_saleHistory,
    user_wasteSaleRequest, wasteSaleRequestPost, wasteSaleRequestUserSubmit,wasteSaleRequestUserReject,
    user_contact,
    user_allActivity,user_detailActivity,
    user_complaint,complaintPost,
    detailNews,
    user_profile,
    user_wastePrices,
    user_ideas,
    create_idea,
    like_idea,    
    comment_idea,
    delete_ideas,
    edit_idea,
    notification,
    notificationPost,
    markNotificationAsRead,
    funeralRequest,checkMyEligibility,submitFuneralRequest,getFamilyMembers,myFuneralRequestsPage,getMyFuneralRequests,getMyFuneralRequestDetail,cancelMyFuneralRequest
}