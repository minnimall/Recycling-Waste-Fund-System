const mongoose = require('mongoose');

const Schema = mongoose.Schema
const NewsSchema = new Schema( {
    activityTitle: {
        type: String,
        required: true, // หัวข้อกิจกรรมต้องการ
        trim: true
    },
    activityDetails: {
        type: String, // เก็บเนื้อหากิจกรรมเป็น HTML
        required: true
    }
},{ timestamps: true })
// สร้าง Model จาก Schema
const myNews = mongoose.model('news', NewsSchema);

module.exports = myNews;
