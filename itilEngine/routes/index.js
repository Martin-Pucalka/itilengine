var express = require('express');
var router = express.Router();
var auth = require("../controllers/AuthController.js");
var game = require("../controllers/GameController.js");
var service = require("../controllers/ServiceController.js");
var passport = require('passport')

// Restrict index for logged in user only
router.get('/', auth.register);

// Route for register action
router.post('/register', auth.doRegister);

// Route for login action
router.post('/login', auth.doLogin);

// Route for logout action
router.get('/logout', auth.logout);

module.exports = router;
