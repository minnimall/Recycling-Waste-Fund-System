// user_index
const user_index = (req, res)=> {
    res.render('user/main')
}

// exports เพื่อให้ไฟล์อื่นสามารถเรียกใช้งานได้
module.exports = {
    user_index,
}