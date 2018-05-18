var express = require('express');
var router = express.Router();

var edge = require("../controllers/EdgeController.js");


// Create edge
router.post('/save', edge.checkServiceOwnerForSave, edge.save);

// Update edge
router.post('/update/:id', edge.checkServiceOwner, edge.update);

// Delete edge
router.get('/delete/:id', edge.checkServiceOwner, edge.delete);

module.exports = router;
