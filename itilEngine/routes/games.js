var express = require('express');
var router = express.Router();

var game = require("../controllers/GameController.js");
var auth = require("../controllers/AuthController.js");


// Create game
router.post('/create', auth.checkLoggedIn, game.create);

// Go to games of user
router.get('/listPlayed', auth.checkLoggedIn, game.listPlayed);

// Go to game detail.
router.get('/detail/:id', game.checkOwner, game.detail);

// Do next turn
router.get('/turn/:id', game.checkOwner, game.turn);

// End game
router.get('/endGame/:id', game.checkOwner, game.endGame);

// Go to user's service desk - tickets of all games of user
router.get('/serviceDesk', auth.checkLoggedIn, game.serviceDesk);

// Get all tickets of the game. Don't check if user is authenticated to do this - represents API for getting tickets.
// These tickets can be used for example in another service desk.
router.get('/tickets/:id', game.getTickets);

// Solve ticket. Don't check if user is authenticated to do this - represents API call for solving tickets.
// These tickets can be used for example in another service desk.
router.put('/tickets/:id', game.solveTicket);

module.exports = router;
