//แบบใช้คู่กับ controller
const express = require('express')
const blogController = require('../controllers/blogController')
const router = express.Router()

//ดึงข้อมูลมาโชว์
//.sort เรียงลำดับ createdAt -1 คือเรียงจากอันล่าสุดแสดงก่อนแล้วเรียงลำดับลงไป
router.get('/', blogController.blog_index)

//บันทึกข้อมูลจาก form
//ส่วน action ใน form สำหรับกรอกค่าบันทึกข้อมูลและบันทึกข้อมูลลงฐานข้อมูล
router.post('/', blogController.blog_creat_post)

//path ไปหน้า create.ejs ปกติ
router.get('/create', blogController.blog_create_get)

//ดึงข้อมูลตาม id ของแต่ละ blogs
router.get('/:id', blogController.blog_detail)

//ลบข้อมูล
router.delete('/:id', blogController.blog_delete)

// ดึงข้อมูลมาแสดงในหน้า edit ตาม id
router.get('/:id/edit', blogController.blog_edit_get);

//แก้ไขข้อมูล
router.put('/:id', blogController.blog_update_put)

//module.exports = router

// แบบใช้ผ่าน Routes เลย
// const express = require('express');
// const router = express.Router();
// const myBlog = require('../models/blogs');

// // แสดงรายการบทความทั้งหมด
// router.get('/', (req, res) => {
//     myBlog.find().sort({ createdAt: -1 })
//         .then((result) => {
//             res.render('blogs/index', { mytitle: 'Home', blogs: result });
//         })
//         .catch((err) => {
//             console.log(err);
//         });
// });

// // แสดงหน้าฟอร์มสำหรับสร้างบทความใหม่
// router.get('/create', (req, res) => {
//     res.render('blogs/create', { mytitle: 'Create new blog' });
// });

// // บันทึกข้อมูลบทความใหม่ที่ผู้ใช้กรอกในฟอร์ม
// router.post('/', (req, res) => {
//     const blog = new myBlog(req.body);
//     blog.save()
//         .then((result) => {
//             res.redirect('/blogs');
//         })
//         .catch((err) => {
//             console.log(err);
//         });
// });

// // แสดงรายละเอียดบทความเฉพาะโดยใช้ ID
// router.get('/:id', (req, res) => {
//     const bid = req.params.id;
//     myBlog.findById(bid)
//         .then((result) => {
//             res.render('blogs/details', { mytitle: 'Home', title: 'Blog Details', blog: result });
//         })
//         .catch((err) => {
//             res.status(404).render('404', { mytitle: 'Blog not found' });
//         });
// });

// // แสดงหน้าฟอร์มสำหรับแก้ไขบทความที่เลือก
// router.get('/:id/edit', (req, res) => {
//     const bid = req.params.id;
//     myBlog.findById(bid)
//         .then((result) => {
//             res.render('blogs/edit', { mytitle: 'Edit Blog', blog: result });
//         })
//         .catch((err) => {
//             res.status(404).render('404', { mytitle: 'Blog not found' });
//         });
// });

// // อัปเดตข้อมูลบทความเมื่อผู้ใช้บันทึกการแก้ไข
// router.put('/:id', (req, res) => {
//     const bid = req.params.id;
//     myBlog.findByIdAndUpdate(bid, req.body, { new: true })
//         .then((result) => {
//             res.redirect(`/blogs/${bid}`);
//         })
//         .catch((err) => {
//             console.log(err);
//             res.status(400).render('404', { mytitle: 'Blog not found' });
//         });
// });

// // ลบบทความออกจากระบบ
// router.delete('/:id', (req, res) => {
//     const bid = req.params.id;
//     myBlog.findByIdAndDelete(bid)
//         .then((result) => {
//             res.json({ redirect: '/blogs' });
//         })
//         .catch((err) => {
//             console.log(err);
//         });
// });

module.exports = router;

