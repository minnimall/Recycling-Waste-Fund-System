//แบบใช้คู่กับ controller
const express = require('express')
const userController = require('../controllers/userController')
const router = express.Router()

router.get('/', userController.user_index)

router.get('/wastetype', userController.user_wastetype)

router.get('/knowledge', userController.user_knowledge)

router.get('/saleHistory', userController.user_saleHistory)

module.exports = router