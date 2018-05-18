var express = require('express');
var router = express.Router();

var configurationItem = require("../controllers/ConfigurationItemController.js");


// Create configurationItem
router.post('/save', configurationItem.checkServiceOwnerForSave, configurationItem.save);

// Update configurationItem
router.post('/update/:id', configurationItem.checkServiceOwner, configurationItem.update);

// Delete configurationItem
router.get('/delete/:id', configurationItem.checkServiceOwner, configurationItem.delete);

module.exports = router;
