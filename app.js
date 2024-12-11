//ทำการนำเข้า module "express" เก็บไว้ในตัวแปร express
const express = require('express')
const morgan = require('morgan')
const mongoose = require('mongoose')
const blogRoutes = require('./routes/blogRoutes')
const methodOverride = require('method-override'); //สำหรับแก้ไขข้อมูล

//ทำการเรียก module หรือ function "express" ขึ้นมาทำงานและสร้าง
const app = express()

//Connect to MongoDB Atlas
const dbURI = 'mongodb+srv://dullapaht:18072546@cluster0.xyho3qt.mongodb.net/NodeJSDB1?retryWrites=true&w=majority&appName=Cluster0'

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

//ทำการรอรับ get request จาก Browser 
app.get('/', (req,res)=>{
    res.redirect('/blogs')
})

app.get('/about', (req,res)=>{
    //res.send('<h1>This is about page</h1>')
    //res.sendFile('./blog/about.html', {root: __dirname})
    res.render('about', { mytitle: 'About'})
})

app.use('/blogs',blogRoutes)

app.get('/salad', (req, res)=>{
    res.render('salad', { menutitle: 'Food Menu',website: 'Healthy Food',menu1: 'Fruit Salad'})
})

app.use((req,res) => {
    //res.status(404).sendFile('./blog/404.html', {root: __dirname})
    res.status(404).render('404', { mytitle: '404'})
}) 