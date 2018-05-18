var express = require('express');
var router = express.Router();

var user = require("../controllers/UserController.js");

// Go to user edit page
router.get('/edit/:id', user.checkOwner, user.edit);

// Update user
router.post('/update/:id', user.checkOwner, user.update);

module.exports = router;
