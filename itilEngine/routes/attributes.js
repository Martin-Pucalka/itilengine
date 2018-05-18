var express = require('express');
var router = express.Router();

var attribute = require("../controllers/AttributeController.js");


// Create attribute
router.post('/save', attribute.checkServiceOwnerForSave, attribute.save);

// Update attribute
router.post('/update/:id', attribute.checkServiceOwner, attribute.update);

// Delete attribute
router.get('/delete/:id', attribute.checkServiceOwner, attribute.delete);

module.exports = router;
