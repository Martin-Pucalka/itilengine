var express = require('express');
var router = express.Router();

var service = require("../controllers/ServiceController.js");
var auth = require("../controllers/AuthController.js");


// Get services created by user
router.get('/created', auth.checkLoggedIn, service.createdServices);

// Get services published by user
router.get('/published', auth.checkLoggedIn, service.publishedServices);

// Get service available for playing
router.get('/available', auth.checkLoggedIn, service.availableServices);

// Save service
router.post('/save', auth.checkLoggedIn, service.save);

// Get edit service detail
router.get('/edit/:id', service.checkOwner, service.edit);

// Update service
router.post('/update/:id', service.checkOwner, service.update);

// Update service permitions
router.get('/updatePermissions/:id', service.checkOwner, service.updatePermissions);

// Publish service
router.post('/publish/:id', service.checkOwner, service.publish);

// Delete service
router.get('/delete/:id', service.checkOwner, service.delete);

// Games of service
router.get('/stats/:id', service.checkOwner, service.stats);

// Edges of service
router.get('/edgesOfService/:id', service.checkOwner, service.edgesOfService);


module.exports = router;
