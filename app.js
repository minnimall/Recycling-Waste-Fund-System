//ทำการนำเข้า module "express" เก็บไว้ในตัวแปร express
const express = require('express')
const morgan = require('morgan')
const mongoose = require('mongoose')
const blogRoutes = require('./routes/blogRoutes')
const userRouter = require('./routes/userRoutes')
const adminRoutes = require('./routes/adminRoutes')
const bcrypt = require('bcryptjs');
const session = require('express-session');
const bodyParser = require('body-parser'); // เพิ่มการนำเข้า body-parser
const Admin = require('./models/admin')

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

// Middleware ตรวจสอบการเข้าสู่ระบบ
const checkAuth = (req, res, next) => {
    if (req.session.username) {
        next();
    } else {
        res.redirect('/login'); // ถ้า session ไม่มี
    }
};

// ตรวจสอบว่าเป็น admin หรือไม่
const checkAdmin = (req, res, next) => {
    if (req.session.role === 'admin') { // ตรวจสอบ role ของผู้ใช้
        next(); // อนุญาตให้เข้าถึงหากเป็น admin
    } else {
        res.redirect('/user');
    }
}

//ทำการรอรับ get request จาก Browser 
app.get('/', (req, res) => {
    res.redirect('/user');
});

app.use('/user', userRouter);
app.use('/blogs',blogRoutes);

// เพิ่ม middleware checkAdmin สำหรับเส้นทาง /admin
app.use('/admin', checkAdmin, adminRoutes);

//เส้นทางไปหน้า login
app.get('/login', (req, res) => {
    res.render('login');
});

//เส้นทางไปหน้า register
app.get('/register', (req, res) => {
    res.render('register');
});

app.post('/register', async (req, res) => {
    const { username, password, confirmPassword, tel, email, role } = req.body;

    try {
        // ตรวจสอบว่ารหัสผ่านและยืนยันรหัสผ่านตรงกันหรือไม่
        if (password !== confirmPassword) {
            return res.redirect('/register?error=รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน');
        }

        // ตรวจสอบว่ามีผู้ใช้งานในระบบแล้วหรือไม่
        let user = await Admin.findOne({ username });
        if (user) {
            return res.redirect('/register?error=ผู้ใช้นี้มีอยู่แล้ว');
        }

        // แฮชรหัสผ่าน
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // กำหนดค่า role (admin หรือ employee) จากฟอร์มที่เลือก
        if (role !== 'admin' && role !== 'employee') {
            return res.redirect('/register?error=บทบาทไม่ถูกต้อง');
        }

        // สร้างผู้ใช้งานใหม่
        user = new Admin({
            username,
            password: hashedPassword,
            tel,
            email,
            role,
        });

        await user.save();
        res.redirect('/admin');
        
    } catch (err) {
        console.error('Registration error:', err);
        res.redirect('/register?error=เกิดข้อผิดพลาดในระบบ');
    }
});

//รับค่าจากการ login
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const user = await Admin.findOne({ username });
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

        // ทำการ redirect ไปยังหน้า admin หรือ employee ตาม role ของผู้ใช้
        if (user.role === 'admin') {
            res.redirect('/admin');
        } else if (user.role === 'employee') {
            res.redirect('/employee');
        }else{
            res.status(403).render('error', { errorMessage: 'กรุณาตรวจสอบสิทธิ์ของคุณ หรือกลับไปที่หน้า Login' });
        }
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).send('เกิดข้อผิดพลาด');
    }
});

// Route สำหรับ Logout
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).send('Error destroying session');
        }
        res.redirect('/user');
    });
});

app.use((req,res) => {
    //res.status(404).sendFile('./blog/404.html', {root: __dirname})
    res.status(404).render('404', { mytitle: '404'})
}) 