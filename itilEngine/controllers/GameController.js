var mongoose = require("mongoose");
var Game = mongoose.model("Game");
var Service = mongoose.model("Service");
var Attribute = mongoose.model("Attribute");
var User = mongoose.model("User");
var ConfigurationItem = mongoose.model("ConfigurationItem");
var ServiceInfrastructure = mongoose.model("ServiceInfrastructure");
var Solution = mongoose.model("Solution");
var xml2js = require('xml2js');
var async = require("async");
var State = mongoose.model("State");
var Edge = mongoose.model("Edge");
var nodemailer = require('nodemailer');
var fs = require('fs');
var schedule = require('node-schedule');
var moment = require('moment');
const { VM } = require('vm2');

var gameController = {};

/**
 * Socket.io sockets of connected clients 
 */
gameController.clients = [];

/**
 * Array of email sent in last minute. Used as time sliding window to limit emails send per minute. 
 */
gameController.emailsInLastMinute = [];

/**
 * Go to list of games played by user. 
 * @param {request} req
 * @param {response} res 
 */
gameController.listPlayed = function (req, res) {
    Game.find({ user: req.user }).populate({
        path: 'service',
        populate: { path: 'user' }
    }).exec(function (err, games) {
        if (err) {
            console.log("Error:", err);
        }
        else {
            res.render("../views/game/listPlayed", { user: req.user, games: games });
        }
    });
};

/**
 * Create new game and redirect to it's detail.
 * @param {request} req
 * @param {response} res 
 */
gameController.create = function (req, res) {
    req.body.isTimeBased = Boolean(req.body.isTimeBased)
    var game = new Game(req.body);
    game.user = req.user;
    // Find all ci to find all attributes
    ConfigurationItem.find({ service: req.body.service }).exec(function (err, cis) {
        // Find all attributes, get their initial values to set them in new game
        Attribute.find({ service: req.body.service }).exec(function (err, allAttsOfService) {
            Attribute.find({ configurationItem: { $in: cis } }).exec(function (err, allAttsOfCis) {
                // Find start state of game
                State.findOne({ service: req.body.service, type: "Start" }).exec(function (err, startState) {
                    // set initial values
                    for (var i = 0; i < allAttsOfService.length; i++) {
                        game.attributeValues.push({ attribute: allAttsOfService[i]._id, value: allAttsOfService[i].initValue });
                    }
                    for (var i = 0; i < allAttsOfCis.length; i++) {
                        game.attributeValues.push({ attribute: allAttsOfCis[i]._id, value: allAttsOfCis[i].initValue });
                    }
                    // set start state
                    game.currentState = startState;
                    game.save(function (err, savedGame) {
                        if (err) {
                            console.log(err);
                        } else {
                            console.log("saved game: " + savedGame.id);
                            // reload and start game if is time based
                            Game.findById(savedGame._id).populate('service').populate('currentState').exec(function (err, loadedGame) {
                                if (loadedGame.isTimeBased == true) {
                                    setTimeout(function () {
                                        gameController.doTurn(loadedGame, null);
                                    }, 5000);
                                }
                            });
                            res.redirect("../games/detail/" + savedGame.id);
                        }
                    });
                })
            });
        });
    })
};

/**
 * Go to detail of game.
 * @param {request} req
 * @param {response} res 
 */
gameController.detail = function (req, res) {
    Game.findById(req.params.id).populate('tickets.state').populate('service').populate('attributeValues.attribute')
        .populate("currentState").populate('service.user').exec(function (err, game) {
            // load solutions of tickets
            async.each(game.tickets, function (ticket, callback) {
                Solution.find({ state: ticket.state.id }).exec(function (err, sols) {
                    ticket.state.solutions = sols;
                    callback();
                });
            }, function (err) {
                // load configuration items of service to show them in game
                ConfigurationItem.find({ service: game.service._id }).populate('service.user').exec(function (err, cis) {
                    // load service infrastructure
                    ServiceInfrastructure.findById(game.service.serviceInfrastructure).exec(function (err, si) {
                        var builder = new xml2js.Builder();
                        var serviceInfrastructure;
                        // convert service infrastructure from JSON to mxGraphs format (XML)
                        if (si != null && si.mxGraph != null) {
                            serviceInfrastructure = builder.buildObject(si.mxGraph);
                        }
                        res.render("../views/game/detail", {
                            user: req.user, game: game, cis: cis, si: si, serviceInfrastructure: serviceInfrastructure
                        });
                    });
                });
            });
        });
};

/**
 * Generate unique id.
 * @return unique id
 */
gameController.uuidv4 = function () {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * Evaluate commands. Computes right side of command and stores computed value to left side.
 * @param game
 * @param commands - commands to evaluate
 */
gameController.evaluateCommands = function (game, commands) {
    if (commands == null) { // nothing to do
        return;
    }
    for (var i = 0; i < commands.length; i++) {
        var rs = commands[i].split("=")[1]; // get right side (command to evaluate)
        var ls = commands[i].split("=")[0].replace(/['"]+/g, ''); // get left side (variable to assign in)
        // in command to evaluate replace ids for values of attributes
        for (var j = 0; j < game.attributeValues.length; j++) {
            rs = rs.replace(new RegExp(game.attributeValues[j].attribute, 'g'), game.attributeValues[j].value);
        }
        // set new values of attributes in game
        for (var j = 0; j < game.attributeValues.length; j++) {
            if (game.attributeValues[j].attribute == ls) {
                try {
                    const vm = new VM();
                    game.attributeValues[j].value = vm.run(rs.replace(/['"]+/g, ''));
                    //game.attributeValues[j].value = eval(rs.replace(/['"]+/g, ''));
                } catch (e) {
                    // dont do anything, original value of attribute remains
                }
            }
        }
    }
    // notify all connected clients with new attribute values
    for (var i = 0; i < gameController.clients.length; i++) {
        if (gameController.clients[i].user == game.user) {
            gameController.clients[i].socket.emit("attributeValues", game.attributeValues);
        }
    }
}

/**
 * Do one step in game.
 * @param game
 * @param targetState - mxGraph state where to move
 * @param res
 */
gameController.move = function (game, targetState, res) {
    Game.findById(game._id).populate('service').populate('currentState').exec(function (err, game) {
        User.findById(game.user).exec(function (err, user) {
            State.findOne({ stateid: targetState.$.id, service: game.service }).exec(function (err, targetStateLoaded) {
                // load solutions of new state
                Solution.find({ state: targetStateLoaded }).exec(function (err, sols) {
                    targetStateLoaded.solutions = sols;
                    // set new current state
                    game.currentState = targetStateLoaded;
                    console.log(game.currentState.type);
                    // evaluate commands of state after entering to new state
                    gameController.evaluateCommands(game, game.currentState.commands);
                    // create new ticket in service desk
                    if (game.currentState.type === "Incident" || game.currentState.type === "Change request" || game.currentState.type === "Event") {
                        var created = new moment().format("YYYY-MM-DD HH:mm:ss");
                        var status = "open";
                        // if new state should bring service down and game is not already down, bring it down
                        // (dont bring down service, which is already down...)
                        if (game.currentState.bringDown == true && game.isDown == false) {
                            game.serviceBroke = new moment().format("YYYY-MM-DD HH:mm:ss");
                            game.numberOfServiceBreaks++;
                            game.isDown = true;
                        }
                        game.tickets.push({ state: game.currentState, status: status, created: created });
                        // notify all connected clients about new ticket
                        for (var i = 0; i < gameController.clients.length; i++) {
                            if (gameController.clients[i].user == user.id) {
                                gameController.clients[i].socket.emit("newTicket", {
                                    ticketId: game.tickets[game.tickets.length - 1]._id,
                                    ticket: targetStateLoaded, status: status, created: created, solutions: sols, gameId: game._id,
                                    gameVersion: game.service.version,
                                    serviceLabel: game.service.label, numberOfServiceBreaks: game.numberOfServiceBreaks, isDown: game.isDown
                                });
                            }
                        }
                        // send notification about new state
                        if (user.sendEmailNotifications == true) {
                            gameController.sendMailNotification(game, user);
                        }
                    };
                    // save changes in game
                    gameController.saveAfterMove(game, res);
                })
            });
        })
    });
}

/**
 * Save game after move. If move is turn based, actual info about game is send in res.
 * @param game
 * @param res
 */
gameController.saveAfterMove = function (game, res) {
    game.save(function (err) {
        if (err) {
            console.log(err);
        } else {
            if (game.isTimeBased == true) {
                if (game.currentState.isBlocking == false) {
                    // if game is time based a current state is non blocking, do next move
                    // 3 seconds delay added, because of non timing and not waiting edges. 
                    // workflow can get to forever loop, so make some delay between iterations.
                    setTimeout(function () {
                        gameController.doTurn(game, null);
                    }, 3000);
                } else {
                    return;
                }
            } else {
                res.send({ duration: game.duration, downtime: game.downtime, numberOfServiceBreaks: game.numberOfServiceBreaks });
            }
        }
    });
}

/**
 * Apply random type edge. Finds all edges and chooses one of them according to probabilities.
 * Algorith of choosing random item from array according to probabilities: 
 * http://codetheory.in/weighted-biased-random-number-generation-with-javascript-based-on-probability/
 * @param edgesFromCurrentStateLoaded - loaded edges from current state
 * @param swf - workflow of service in game
 * @param game
 * @param res
 */
gameController.applyRandomEdge = function (edgesFromCurrentStateLoaded, swf, game, res) {
    var weights = []; // probabilities of edges
    var edges = []; // edges - in same order as their probabilities
    var sum = 0; // sum of all probabilities
    for (var i = 0; i < edgesFromCurrentStateLoaded.length; i++) {
        if (edgesFromCurrentStateLoaded[i].probability != null && edgesFromCurrentStateLoaded[i].probability > 0) {
            weights.push(edgesFromCurrentStateLoaded[i].probability);
            edges.push(edgesFromCurrentStateLoaded[i]);
            sum += edgesFromCurrentStateLoaded[i].probability;
        }
    }
    // get random number (max sum of weigths)
    var rand = Math.random() * Math.floor(sum);
    var currentSum = 0; // sum of iterating probabilities
    var selectedEdge;
    for (var i = 0; i < edgesFromCurrentStateLoaded.length; i++) {
        if (edgesFromCurrentStateLoaded[i].probability != null && edgesFromCurrentStateLoaded[i].probability > 0) {
            // ignore null and 0 probabilities
            if (i == edgesFromCurrentStateLoaded.length - 1) {
                // random number is in last interval - last edge will be selected
                selectedEdge = edgesFromCurrentStateLoaded[i];
                break;
            } else {
                // select edge if random number is higher than interval before (currentSum) 
                // and lower than interval after (currentEdge + weigth of this edge)
                if (rand > currentSum && rand <= currentSum + edgesFromCurrentStateLoaded[i].probability) {
                    selectedEdge = edgesFromCurrentStateLoaded[i];
                    break;
                }
            }
            // increase sum with current edges probability
            currentSum += edgesFromCurrentStateLoaded[i].probability;
        }
    }
    // load target state according to selected edge
    var selectedEdgeMx = swf.mxGraph.mxGraphModel.root[0].mxCell.find(c => c.$.id === selectedEdge.edgeid);
    var targetState = swf.mxGraph.mxGraphModel.root[0].mxCell.find(c => c.$.id === selectedEdgeMx.$.target);
    // move
    gameController.move(game, targetState, res);
}

/**
 * Apply edge according to evaluated condition.
 * @param edgesFromCurrentStateLoaded - edges from current state
 * @param swf - workflow of service in game
 * @param game
 * @param res
 */
gameController.applyConditionEdge = function (edgesFromCurrentStateLoaded, swf, game, res) {
    var ifEdge = edgesFromCurrentStateLoaded.find(e => e.isIfEdge === true);
    var elseEdge = edgesFromCurrentStateLoaded.find(e => e.isIfEdge === false);
    var conditionReplaced = ifEdge.condition;
    // in condition replace, all ids for real values of attributes in game
    for (var j = 0; j < game.attributeValues.length; j++) {
        conditionReplaced = conditionReplaced.replace(new RegExp(game.attributeValues[j].attribute, 'g'), game.attributeValues[j].value);
    }
    var appliedEdge;
    // evaluate condition and choose if or else branch
    var resultOfEval = false;
    try {
        const vm = new VM();
        resultOfEval = vm.run(conditionReplaced.replace(/['"]+/g, ''));
        //resultOfEval = eval(conditionReplaced.replace(/['"]+/g, ''));
    } catch (e) {
        resultOfEval = false;
    }
    if (resultOfEval == true) {
        appliedEdge = swf.mxGraph.mxGraphModel.root[0].mxCell.find(c => c.$.id === ifEdge.edgeid);
    } else {
        appliedEdge = swf.mxGraph.mxGraphModel.root[0].mxCell.find(c => c.$.id === elseEdge.edgeid);
    }
    // move
    var targetState = swf.mxGraph.mxGraphModel.root[0].mxCell.find(c => c.$.id === appliedEdge.$.target);
    gameController.move(game, targetState, res);
}

/**
 * Apply time edge.
 * @param edgesFromCurrentStateLoaded - edges from current state
 * @param swf - workflow of service in game
 * @param game
 * @param res
 */
gameController.applyTimeEdge = function (edgesFromCurrentStateLoaded, swf, game, res) {
    var appliedEdgeLoaded = edgesFromCurrentStateLoaded[0];
    var appliedEdge = swf.mxGraph.mxGraphModel.root[0].mxCell.find(c => c.$.id === appliedEdgeLoaded.edgeid);
    var targetState = swf.mxGraph.mxGraphModel.root[0].mxCell.find(c => c.$.id === appliedEdge.$.target);
    // delay
    gameController.delay(game, targetState, appliedEdgeLoaded, res);
}

/**
 * Loades output edges from current state. Edges are searched in mxGraph service workflow.
 * @param game
 * @param callback
 */
gameController.loadEdgesFromCurrentState = function (game, callback) {
    ServiceInfrastructure.findById(game.service.serviceWf).exec(function (err, swf) {
        // find source state
        var sourceState = swf.mxGraph.mxGraphModel.root[0].mxCell.find(c => c.$.id === game.currentState.stateid);
        // find output edges from the state
        var edgesFromCurrentState = swf.mxGraph.mxGraphModel.root[0].mxCell.filter(c => c.$.source === sourceState.$.id);
        var edgeIds = [];
        for (var i = 0; i < edgesFromCurrentState.length; i++) {
            edgeIds.push(edgesFromCurrentState[i].$.id);
        }
        Edge.find({ edgeid: { $in: edgeIds }, service: game.service }).exec(function (err, edgesFromCurrentStateLoaded) {
            callback(edgesFromCurrentStateLoaded, swf);
        })
    });
}

/**
 * Notify clients connected to game about solution of ticket
 * @param game 
 * @param ticket - solved ticket
 */
gameController.notifySolvedTicket = function (ticket, game) {
    var ticketReactionSum = 0;
    var solvedTicketSum = 0
    for (var i = 0; i < game.tickets.length; i++) {
        if (game.tickets[i].status == "solved") {
            // update reaction time
            var from = new moment(game.tickets[i].created);
            var to = new moment(game.tickets[i].solved);
            ticketReactionSum += to.diff(from, 'seconds');
            solvedTicketSum++;
        }
    }
    // notify clients with actual info about game
    game.ticketReactionAvg = ticketReactionSum / solvedTicketSum;
    for (var i = 0; i < gameController.clients.length; i++) {
        if (gameController.clients[i].user == game.user) {
            gameController.clients[i].socket.emit("solvedTticket", {
                ticket: ticket,
                numberOfServiceBreaks: game.numberOfServiceBreaks,
                isDown: game.isDown,
                ticketReactionAvg: game.ticketReactionAvg,
            });
        }
    }
}

/**
 * Applies ignore solution on all opened ticket in game.
 * @param game 
 * @param callback
 */
gameController.sovleUnsolvedTicketsUsingIgnore = function (game, callback) {
    Game.findById(game._id).populate('tickets.state').exec(function (err, loadedGame) {
        async.each(loadedGame.tickets, function (ticket, callback1) {
            Solution.findOne({ state: ticket.state.id, isIgnore: true }).exec(function (err, ignoreSol) {
                if (ticket.status != "solved") {
                    ticket.selectedSolution = ignoreSol._id;
                    ticket.status = "solved";
                    ticket.solved = new moment().format("YYYY-MM-DD HH:mm:ss");
                    gameController.notifySolvedTicket(ticket, loadedGame);
                }
                callback1();
            });
        }, function (err) {
            loadedGame.save(function (err) {
                callback(null, loadedGame);
            })
        });
    });
}

/**
 * End game. Solves opened tickets using ingore solution and updates game info.
 * @param game 
 * @param callback
 */
gameController.doEndGame = function (game, callback) {
    if (game.isFinished == true) {
        callback();
    }
    gameController.sovleUnsolvedTicketsUsingIgnore(game, function (err, gameSolvedTickets) {
        // cancel scheduled jobs of game
        try {
            var j = schedule.scheduledJobs[gameSolvedTickets.id];
            j.cancel();
        } catch (e) { // if game is not time based, there is no scheduled job
            console.log("No scheduled job.");
        }
        gameSolvedTickets.isFinished = true;
        gameSolvedTickets.finished = new moment();
        // update downtime
        if (gameSolvedTickets.isDown == true) {
            var now = new moment();
            var serviceBroke = new moment(gameSolvedTickets.serviceBroke);
            gameSolvedTickets.downtime += now.diff(serviceBroke, 'seconds');
        }
        gameSolvedTickets.save(function (err, updatedGame) {
            if (err) {
                console.log(err);
            } else {
                // notify connected clients about end of game
                for (var i = 0; i < gameController.clients.length; i++) {
                    if (gameController.clients[i].user == updatedGame.user) {
                        gameController.clients[i].socket.emit("end", game.id);
                    }
                }
            }
            callback();
        });
    });
}

/**
 * Do delay of time edge using node-schedule.
 * @param game 
 * @param targetState - mxGraph state where to move
 * @param appliedEdgeLoaded - time type edge which leads to target sate
 * @param res
 */
gameController.delay = function (game, targetState, appliedEdgeLoaded, res) {
    if (game.isTimeBased == true) {
        var delay;
        var milisecondsInHour = 60 * 60 * 1000;
        try {
            delay = appliedEdgeLoaded.numberOfHours * milisecondsInHour / game.speed;
        } catch (e) {
            delay = 1 * milisecondsInHour; // default is one hour
        };
        if (delay < 1000) { // dont use too small delays
            delay = 1000;
        }
        // schedule job with computed delay
        var j = schedule.scheduleJob(game.id, Date.now() + delay, function () {
            gameController.move(game, targetState, null);
        });
    } else {
        // turn based game doesnt have delay, update only game info (duration of game)
        // duration in time based game is not beeing updates, it's computed from datetimes: now - startOfGame
        if (game.isDown == true) {
            game.downtime += appliedEdgeLoaded.numberOfHours * 3600; // in seconds
        }
        game.duration += appliedEdgeLoaded.numberOfHours * 3600;
        game.save(function (err) {
            if (err) {
                console.log(err);
            } else {
                gameController.move(game, targetState, res);
            }
        })
    }
}

/**
 * Finishes all time based games on server and cancels all planed jobs.
 */
gameController.finishTimeGames = function () {
    Game.find({ isTimeBased: true, isFinished: false }).exec(function (err, games) {
        async.each(games, function (game, callback) {
            gameController.doEndGame(game, callback);
        });
    });
}

/**
 * Do one turn in game. Check, if there are any output edges and move ancording to their type.
 * @param game
 * @param res
 */
gameController.doTurn = function (game, res) {
    if (game.isFinished == true) { // ignore finished games
        if (res != null) {
            res.send();
        }
        return;
    }
    gameController.loadEdgesFromCurrentState(game, function (edgesFromCurrentStateLoaded, swf) {
        // finish game if there are no output edges from current state
        if (edgesFromCurrentStateLoaded.length == 0) {
            gameController.doEndGame(game, function () {
                if (game.isTimeBased == false) {
                    res.send();
                }
                return;
            })
        } else {
            // apply edge
            if (edgesFromCurrentStateLoaded[0].type === "Time") {
                gameController.applyTimeEdge(edgesFromCurrentStateLoaded, swf, game, res);
            } else if (edgesFromCurrentStateLoaded[0].type === "Random") {
                gameController.applyRandomEdge(edgesFromCurrentStateLoaded, swf, game, res);
            }
            else if (edgesFromCurrentStateLoaded[0].type === "Condition") {
                gameController.applyConditionEdge(edgesFromCurrentStateLoaded, swf, game, res);
            }
        }
    })
}

/**
 * Do one turn in game. Only in turn-based games. Invoked by player.
 * @param req
 * @param res
 */
gameController.turn = function (req, res) {
    Game.findById(req.params.id).populate('service').populate('currentState').exec(function (err, game) {
        if (game.currentState.isBlocking == true) {
            // dond do turn if current state is blocking. Turn can be done only solvning of blocking state
            res.send({ isBlocking: true });
        } else {
            gameController.doTurn(game, res);
        }
    });
}

/**
 * Finish game. Invoked by player.
 * @param req
 * @param res
 */
gameController.endGame = function (req, res) {
    Game.findById(req.params.id).exec(function (err, game) {
        gameController.doEndGame(game, function () {
            res.send();
        })
    });
}

/**
 * List all tickets of users games, to sho them in service desk.
 * @param req
 * @param res
 */
gameController.serviceDesk = function (req, res) {
    Game.find({ user: req.user }).populate('tickets.state').populate('service').exec(function (err, games) {
        async.each(games, function (game, callback) {
            // load solutions
            async.each(game.tickets, function (ticket, callback1) {
                Solution.find({ state: ticket.state.id }).exec(function (err, sols) {
                    ticket.state.solutions = sols;
                    callback1();
                });
            }, function (err) {
                callback();
            });
        }, function (err) {
            res.render("../views/game/serviceDesk", { user: req.user, games: games });
        });
    });
}

/**
 * Solve ticket.
 * @param game
 * @param res
 */
gameController.solveTicket = function (req, res) {
    Game.findById(req.body.gameId).populate('tickets.state').populate('service').populate('currentState').exec(function (err, game) {
        if (err || game == null) {
            res.status(404).send({ solved: false, description: "Game not found." });
            return;
        }
        var ticket = game.tickets.find(t => t.id == req.params.id);
        if (ticket == null) {
            res.status(404).send({ solved: false, description: "Ticket not found." });
            return;
        }
        if (ticket.status == "solved") { // check status of ticket
            res.send({ solved: false, description: "Ticket already solved." });
            return;
        }
        Solution.findById(req.body.solutionId).exec(function (err, sol) {
            if (err || sol == null) {
                res.status(404).send({ solved: false, description: "Solution not found." });
                return;
            }
            // evaluate commands of selected solution
            gameController.evaluateCommands(game, sol.commands);
            ticket.status = "solved";
            ticket.selectedSolution = req.body.solutionId;
            ticket.solved = new moment().format("YYYY-MM-DD HH:mm:ss");
            // Determine if current ticket caused service broke down. If so, check number of other unresolved tickets
            // which caused serice is down. If current ticket causes the service is down and there are no other unresolved tickets
            // causing service is down, then solving of current ticket causes service is up again.
            var unsolvedBringDownIncidentCount = 0;
            for (var i = 0; i < game.tickets.length; i++) {
                if (game.tickets[i].state.bringDown == true && game.tickets[i].status == "open") {
                    unsolvedBringDownIncidentCount++;
                }
            }
            if (unsolvedBringDownIncidentCount == 0 && game.isDown == true) {
                game.isDown = false;
                var now = new moment();
                var serviceBroke = new moment(game.serviceBroke);
                // update downtime when service is up again
                if (game.isTimeBased == true) {
                    game.downtime += now.diff(serviceBroke, 'seconds');
                }
            }
            // notify clients about solving of ticket
            gameController.notifySolvedTicket(ticket, game);
            game.save(function (err) {
                if (err) {
                    console.log(err);
                } else {
                    //  if currently solved ticket was blocking state, do move
                    if (ticket.state.isBlocking == true) {
                        gameController.doTurn(game, res);
                    } else {
                        res.send({ solved: true, description: "Ticket solved." });
                    }
                }
            });
        });
    });
}

/**
 * Get tickets of game.
 * @param {request} req
 * @param {response} res 
 */
gameController.getTickets = function (req, res) {
    Game.findById(req.params.id).populate('tickets.state').exec(function (err, game) {
        if (err || game == null) {
            res.status(404).send();
            return;
        }
        var gameCopy = game.toObject();
        gameCopy.gameId = req.params.id;
        async.each(gameCopy.tickets, function (ticket, callback) { // load solutions of tickets
            Solution.find({ state: ticket.state._id }).exec(function (err, sols) {
                ticket.state.solutions = sols;
                callback();
            });
        }, function (err) {
            if (err) {
                res.status(404).send();
            } else {
                res.send(gameCopy.tickets);
            }
        });
    });
};

/**
 * Send email about ticket.
 * @param game
 * @param user
 */
gameController.sendMailNotification = function (game, user) {
    // check limit of emails send to user per minute
    var secondsDiff = 0;
    if (gameController.emailsInLastMinute.length > 0) {
        secondsDiff = moment().diff(gameController.emailsInLastMinute[0].time, 'seconds'); // diff between now and first
    }
    if (secondsDiff >= 60) { // first is older than a minute
        gameController.emailsInLastMinute.shift(); // so remove it
    }
    var mailsToUserPerMinute = 0;
    for (var i = 0; i < gameController.emailsInLastMinute.length; i++) {
        if (gameController.emailsInLastMinute[i].user.email == user.email) {
            mailsToUserPerMinute++;
        }
    }
    if (mailsToUserPerMinute >= process.env.MAX_EMAILS_PER_MINUTE) {
        console.log("Limit of emails per minute reached for " + user.email + ", email wont be sent.");
        return;
    } else {
        gameController.emailsInLastMinute.push({ user: user, time: moment() }); // and push there new one
    }
    var transporter = nodemailer.createTransport({
        service: process.env.NODEMAILER_SERVICE,
        auth: {
            user: process.env.NODEMAILER_USER,
            pass: process.env.NODEMAILER_PASS
        }
    });

    // Set plain text content of email 
    var text = "Dear " + game.service.label + "\n";
    text += 'You have received new ' + game.currentState.type + ".\n"
    text += "Service: " + game.service.label + "\n\n";
    text += "Subject: " + game.currentState.subject + "\n";
    text += "Description: " + game.currentState.description + "\n";
    text += "Priority: " + game.currentState.priority + "\n";

    // HTML text content of email - load empty schema
    fs.readFile(__dirname + "/../views/index/email.html", { encoding: "utf8" }, function (err, emailData) {
        if (err) {
            throw err;
        }
        // fill schema using information about ticket
        emailData = emailData.replace("'user'", user.username);
        emailData = emailData.replace("'ticket'", game.currentState.type);
        emailData = emailData.replace("'service'", game.service.label);
        emailData = emailData.replace("'subject'", game.currentState.subject);
        emailData = emailData.replace("'description'", game.currentState.description);
        emailData = emailData.replace("'priority'", game.currentState.priority);
        emailData = emailData.replace("'serviceDeskUrl'", process.env.HOSTNAME + ":" + process.env.PORT + "/player/games/serviceDesk");
        emailData = emailData.replace("'userProfileUrl'", process.env.HOSTNAME + ":" + process.env.PORT + "/users/edit/" + user._id);

        var mailOptions = {
            from: process.env.NODEMAILER_USER,
            to: user.email,
            subject: "New ticket",
            text: text,
            html: emailData
        };
        // send mail
        transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
                console.log(error);
            } else {
                console.log('Email sent: ' + info.response);
            }
        });
    });
}

/**
 * Emited when client connected (loaded game detail page). Push him into array of active clients, to send him notifications using socket.io
 * @param socket - socket of new client
 * @param user - user which will be assigned to new socket
 */
gameController.clientConnected = function (socket, user) {
    console.info(`Client connected [id=${socket.id}], user: ${user}`);
    console.log(gameController.clients.length);
    gameController.clients.push({ user: user._id, socket: socket });
    console.log(gameController.clients.length);
}

/**
 * Emited when client disconnected (leaves game detail page). Remove him from array of active clients.
 * @param socket - socket of disconected user
 */
gameController.clientDisconnected = function (socket) {
    console.info(`Client disconected [id=${socket.id}]`);
    console.log(gameController.clients.length);
    gameController.clients.splice(gameController.clients.findIndex(c => c.socket === socket), 1);
    console.log(gameController.clients.length);
}

/**
 * Check if reqest is authenticated for update game (turn and end game).
 * @param {request} req
 * @param {response} res 
 * @param {next} next 
 */
gameController.checkOwner = function (req, res, next) {
    if (req.isAuthenticated()) {
        Game.findById(req.params.id).populate('user').exec(function (err, s) {
            if (req.user._id == s.user._id) {
                next();
            } else {
                res.status(401).send();
            }
        });
    } else {
        res.redirect('/');
    }
}

module.exports = gameController;
