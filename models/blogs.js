const mongoose = require('mongoose')

//ประกาศโครงสร้างของ Schema
//สำหรับ documents ต่างๆที่ต้องการจะสร้างขึ้น
const Schema = mongoose.Schema
const blogSchema = new Schema( {
    title: {
        type: String,
        required: true
    },
    snippet: {
        type: String,
        required: true
    },
    body: {
        type: String,
        required: true
    }
},{ timestamps: true })

//สร้าง model ที่ห่อหุ้ม blogSchema อยู่ภายใน
const myBlog = mongoose.model('Blog', blogSchema)

//ทำการ export model เพื่อให้สามารถเรียกใช้ใน program
//อื่นๆได้ ที่อยู่ใน project นี้
module.exports = myBlog