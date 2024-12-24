//แบบใช้คู่กับ controller
const express = require('express')
const adminController = require('../controllers/adminController')
const router = express.Router()

router.get('/', adminController.mediaIndex)

router.get('/news', adminController.newsIndex)

module.exports = router
