//แบบใช้คู่กับ controller
const express = require('express')
const userController = require('../controllers/userController')
const router = express.Router()

router.get('/', userController.user_index)

router.get('/wastetype', userController.user_wastetype)

module.exports = router