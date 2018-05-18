var express = require('express');
var router = express.Router();

var state = require("../controllers/StateController.js");


// Create state
router.post('/save', state.checkServiceOwnerForSave, state.save);

// Update state
router.post('/update/:id', state.checkServiceOwner, state.update);

// Delete state
router.get('/delete/:id', state.checkServiceOwner, state.delete);

// Get commands of state
router.get('/getCommands/:id', state.checkServiceOwner, state.getCommands);

module.exports = router;
