//แบบใช้คู่กับ controller
const express = require('express')
const userController = require('../controllers/userController')
const router = express.Router()

router.get('/', userController.user_index)

router.get('/wastetype', userController.user_wastetype)

router.get('/knowledge', userController.user_knowledge)

router.get('/saleHistory', userController.user_saleHistory)

router.get('/contact', userController.user_contact)

module.exports = router