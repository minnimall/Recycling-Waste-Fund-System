// user_index
const user_index = (req, res)=> {
    res.render('user/main')
}

// user_typewaste
const user_wastetype = (req, res)=> {
    res.render('user/wastetype')
}

// exports เพื่อให้ไฟล์อื่นสามารถเรียกใช้งานได้
module.exports = {
    user_index,
    user_wastetype
}