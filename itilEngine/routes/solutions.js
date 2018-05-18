var express = require('express');
var router = express.Router();

var solution = require("../controllers/SolutionController.js");


// Create solution
router.post('/save', solution.checkServiceOwnerForSave, solution.save);

// Update solution
router.post('/update/:id', solution.checkServiceOwner, solution.update);

// Delete solution
router.get('/delete/:id', solution.checkServiceOwner, solution.delete);

// Get commands of solution
router.get('/getCommands/:id', solution.checkServiceOwner, solution.getCommands);

module.exports = router;
