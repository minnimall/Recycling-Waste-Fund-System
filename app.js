//ทำการนำเข้า module "express" เก็บไว้ในตัวแปร express
const express = require('express')
const morgan = require('morgan')
const mongoose = require('mongoose')
const blogRoutes = require('./routes/blogRoutes')
const userRouter = require('./routes/userRoutes')
const adminRoutes = require('./routes/adminRoutes')
const employeeRoutes = require('./routes/employeeRoutes')
const bcrypt = require('bcryptjs');
const session = require('express-session');
const bodyParser = require('body-parser'); // เพิ่มการนำเข้า body-parser
const Admin = require('./models/admin')
const village = require('./models/village')
const Family = require('./models/family');
const methodOverride = require('method-override'); //สำหรับแก้ไขข้อมูล

//ทำการเรียก module หรือ function "express" ขึ้นมาทำงานและสร้าง
const app = express()

// ตั้งค่า middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

//Connect to MongoDB Atlas
const dbURI = 'mongodb+srv://dullapaht:18072546@cluster0.xyho3qt.mongodb.net/RecyclingWasteFundSystem?retryWrites=true&w=majority&appName=Cluster0'

mongoose.connect(dbURI)
    .then((result) => app.listen(3000))
    .catch((err) => console.log(err))

//Connect to local MongoDB Compass
//const dbURI = 'mongodb://127.0.0.1:27017/NodeJSDB1'

//กำหนดให้มีการใช้ 'ejs' ในการสร้าง view engine หรือ template engine
app.set('view engine', 'ejs')

//กรณีต้องการเปลี่ยนชื่อ folder "views" เป็นชื่ออื่นเช่น "myviews"
//เพื่อใช้เก็บไฟล์ .ejs สามารถทำได้ด้วยคำสั่งข้างล่างนี้
//app.set('views', 'myviews')

//ทำการรอรับ listen request จาก Browser
//app.listen(3000)

//เรียกใช้ middleware "static" ของ Express เอง
app.use(express.static('public'))
app.use(express.urlencoded( { extended: true})) //ไว้สำหรับช่วยรับข้อมูลที่ user ส่งมาจาก method POST
app.use(express.static(__dirname+'/node_modules/bootstrap/dist'))

app.use(methodOverride('_method'));

//เรียกใช้ middleware "morgan"
app.use(morgan('dev'))

app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: true
}));

app.use((req, res, next) => {
    res.locals.session = req.session; // ส่ง session ไปยังทุก template
    next();
});

// Middleware ตรวจสอบการเข้าสู่ระบบ
const checkAuth = (req, res, next) => {
    if (req.session.username) {
        next();
    } else {
        res.redirect('/login');
    }
};

// ตรวจสอบว่าเป็น admin หรือไม่
// const checkAdmin = (req, res, next) => {
//     if (req.session.role === 'admin') {
//         next();
//     } else {
//         res.redirect('/user');
//     }
// }

// // Middleware สำหรับเก็บชื่อ admin ใน session และส่งไปยังทุกหน้า
// const setName = (req, res, next) => {
//     if (req.session && req.session.username) {
//         res.locals.username = req.session.username; // ส่ง adminName ให้ทุกหน้า
//     } else {
//         res.locals.username = "Admin"; // กำหนดค่าเริ่มต้นถ้าไม่มีชื่อ admin
//     }
//     next(); // ส่งต่อไปยัง middleware ถัดไป
// };

//สำหรับ admin
const checkAdminAndSetName = (req, res, next) => {
    // ตั้งค่า username สำหรับ res.locals
    if (req.session && req.session.username) {
        res.locals.username = req.session.username;
    } else {
        res.locals.username = "Admin";
    }

    // ตรวจสอบสิทธิ์การเป็น admin
    if (req.session.role === 'admin') {
        next(); // หากเป็น admin ให้ไป middleware ถัดไป
    } else {
        res.redirect('/user'); // ถ้าไม่ใช่ admin ให้ redirect ไปยังหน้าอื่น
    }
};

//สำหรับ พนักงาน
const checkEmpAndSetName = (req, res, next) => {
    if (req.session && req.session.username) {
        res.locals.username = req.session.username;
    } else {
        res.locals.username = "Admin";
    }

    // ตรวจสอบสิทธิ์การเป็น employee
    if (req.session.role === 'employee') {
        next();
    } else {
        res.redirect('/user');
    }
};

//สำหรับ ผู้ใช้ทั่วไป
const checkUserAndSetName = (req, res, next) => {
    if (req.session && req.session.username) {
        res.locals.username = req.session.username;
    } else {
        res.locals.username = "Guest";
    }

    // ตรวจสอบสิทธิ์การเป็น user
    if (req.session.role === 'user') {
        next();
    } else {
        res.redirect('/login');
    }
};

app.get('/', (req, res) => {
    res.redirect('/user');
});

app.use('/blogs',blogRoutes);

//ผู้ใช้ทั่วไป(user)
app.use('/user', userRouter);
//พนักงานอบต.ขามป้อม(employee)
app.use('/employee', checkEmpAndSetName, employeeRoutes);
//ผู้ดูแลระบบ(admin)
app.use('/admin', checkAdminAndSetName, adminRoutes);


//เส้นทางไปหน้า register
app.get('/register', (req, res) => {
    res.render('register');
});

//เส้นทางไปหน้า login
app.get('/login', (req, res) => {
    res.render('login');
});

//รับค่าจากการ login
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        let user = await Admin.findOne({ username });

        if (!user) {
            user = await Family.findOne({ username });
        }

        if (!user) {
            return res.redirect('/login?error=ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
        }

        // เปรียบเทียบรหัสผ่านที่ผู้ใช้กรอกกับแฮชในฐานข้อมูล
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.redirect('/login?error=ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
        }

        // ตั้งค่า session
        req.session.username = user.username;
        req.session.role = user.role;

        if (user.role === 'admin') {
            res.redirect('/admin');
        } else if (user.role === 'employee') {
            res.redirect('/employee');
        } else if (user.role === 'user') { // เพิ่มการเปลี่ยนเส้นทางสำหรับ user
            res.redirect('/user');
        } else {
            res.status(403).render('error', { errorMessage: 'กรุณาตรวจสอบสิทธิ์ของคุณ หรือกลับไปที่หน้า Login' });
        }
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).send('เกิดข้อผิดพลาด');
    }
});

//logout
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).send('Error destroying session');
        }
        res.redirect('/user');
    });
});

// app.get('/add-village', (req,res) => {
//     const village = new Village({
//         villageNumber: 10,
//         villageName: 'บ้านหนองนก',
//         location: 'ยังไม่รู้'
//     })
//     village.save()
//     .then((result) => {
//         res.send(result)
//     })
//     .catch((err) => {
//         console.log(err)
//     })
// })

app.use((req,res) => {
    res.status(404).render('404', { mytitle: '404'})
}) 