// user_index
const user_index = (req, res)=> {
    res.render('user/main')
}

// user_typewaste
const user_wastetype = (req, res)=> {
    res.render('user/wastetype')
}

// user_knowledge
const user_knowledge = (req, res)=> {
    res.render('user/knowledge')
}

// user_saleHistory
const user_saleHistory = (req, res)=> {
    res.render('user/saleHistory')
}

// exports เพื่อให้ไฟล์อื่นสามารถเรียกใช้งานได้
module.exports = {
    user_index,
    user_wastetype,
    user_knowledge,
    user_saleHistory
}