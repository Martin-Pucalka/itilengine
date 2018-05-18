var mongoose = require("mongoose");
var parseString = require('xml2js').parseString;
var xml2js = require('xml2js');
var Service = mongoose.model("Service");
var ConfigurationItem = mongoose.model("ConfigurationItem");
var ServiceInfrastructure = mongoose.model("ServiceInfrastructure");
var State = mongoose.model("State");
var Edge = mongoose.model("Edge");
var Attribute = mongoose.model("Attribute");
var Solution = mongoose.model("Solution");
var Game = mongoose.model("Game");
var async = require("async");
var moment = require("moment");
var momentDurationFormatSetup = require("moment-duration-format");

var serviceController = {};

/**
 * Go to list of services created by user.
 * @param req
 * @param res
 */
serviceController.createdServices = function (req, res) {
    Service.find({ user: req.user }).exec(function (err, services) {
        if (err) {
            console.log("Error:", err);
        }
        else {
            res.render("../views/service/listCreated", { user: req.user, services: services });
        }
    });
};

/**
 * Go to list of services published by user.
 * @param req
 * @param res
 */
serviceController.publishedServices = function (req, res) {
    Service.find({ user: req.user }).exec(function (err, services) {
        if (err) {
            console.log("Error:", err);
        }
        else {
            res.render("../views/service/listPublished", { user: req.user, services: services });
        }
    });
};

/**
 * Go to list of services available for user to play (games).
 * @param req
 * @param res
 */
serviceController.availableServices = function (req, res) {
    Service.find({ isPublished: true, isDisabled: false }).populate('user').exec(function (err, services) {
        if (err) {
            console.log("Error:", err);
        }
        else {
            res.render("../views/service/listAvailable", { user: req.user, services: services });
        }
    });
};

/**
 * Save new service and redirect to it's detail.
 * @param req
 * @param res
 */
serviceController.save = function (req, res) {
    var service = new Service();
    service.label = req.body.label;
    service.user = req.user;
    service.save(function (err, s) {
        if (err) {
            console.log(err);
        } else {
            console.log("created service: " + s._id);
            res.redirect("../services/edit/" + s._id);
        }
    });
}

/**
 * Delete workflow (mxGraph) of service.
 * @param req
 * @param next
 */
serviceController.deleteServiceWf = function (req, next) {
    Service.findOne({ _id: req.params.id }).exec(function (err, service) {
        if (err) {
            next(err, null);
        } else {
            ServiceInfrastructure.remove({ _id: service.serviceWf }, function (err) {
                if (err) {
                    next(err, null);
                }
                else {
                    next(null, null);
                }
            });
        }
    })
}

/**
 * Delete infrastructure (mxGraph) of service.
 * @param req
 * @param next
 */
serviceController.deleteServiceInfrastructure = function (req, next) {
    Service.findOne({ _id: req.params.id }).exec(function (err, service) {
        if (err) {
            next(err, null);
        } else {
            ServiceInfrastructure.remove({ _id: service.serviceInfrastructure }, function (err) {
                if (err) {
                    next(err, null);
                }
                else {
                    next(null, null);
                }
            });
        }
    })
}

/**
 * Save new mxGraph.
 * @param mxGraph - JSON object of mxgraph.
 * @param next
 */
serviceController.createMxGraph = function (mxGraph, next) {
    var graph = new ServiceInfrastructure();
    graph.mxGraph = mxGraph;
    graph.save(function (err, savedMxGraph) {
        if (err) {
            console.log(err);
        } else {
            return next(null, savedMxGraph);
        }
    });
}

/**
 * Load all info about service and go to it's edit page.
 * @param req
 * @param res
 */
serviceController.edit = function (req, res) {
    Service.findOne({ _id: req.params.id }).populate("serviceInfrastructure").populate("serviceWf").exec(function (err, service) {
        ConfigurationItem.find({ service: req.params.id }).exec(function (err, cis) {
            State.find({ service: req.params.id }).exec(function (err, states) {
                Solution.find({ state: { $in: states } }).exec(function (err, sols) {
                    Edge.find({ service: req.params.id }).exec(function (err, edges) {
                        Attribute.find({ service: req.params.id }).exec(function (err, attsOfService) { // find attributes of service
                            Attribute.find({ configurationItem: { $in: cis } }).exec(function (err, attsOfCis) { // find attributes of CIs
                                //iterate throught CIs and fill it's "atts" property with their attributes
                                for (var i = 0; i < cis.length; i++) { //for all CIs of service
                                    cis[i]["atts"] = [];
                                    for (var j = 0; j < attsOfCis.length; j++) { //for all attributes of service
                                        if (attsOfCis[j].configurationItem == cis[i].id) {
                                            cis[i]["atts"].push(attsOfCis[j]);// attribute belongs to CI  
                                        }
                                    }
                                }
                                //iterate throught states and fill it's "sols" property with their solutions
                                for (var i = 0; i < states.length; i++) { //for all states of service
                                    states[i]["sols"] = [];
                                    for (var j = 0; j < sols.length; j++) { //for all solutions of service
                                        if (sols[j].state == states[i].id) {
                                            states[i]["sols"].push(sols[j]); // solution belongs to state 
                                        }
                                    }
                                }
                                // Convert mxGraphs XML format to JSON, to save it in DB in nicer way
                                var builder = new xml2js.Builder();
                                var serviceInfrastructure;
                                var serviceWf;
                                // convert infrastructure mxGraph
                                if (service != null && service.serviceInfrastructure != null && service.serviceInfrastructure.mxGraph != null) {
                                    serviceInfrastructure = builder.buildObject(service.serviceInfrastructure.mxGraph);
                                }
                                // convert service workflow mxGraph
                                if (service != null && service.serviceWf != null && service.serviceWf.mxGraph != null) {
                                    serviceWf = builder.buildObject(service.serviceWf.mxGraph);
                                }
                                res.render("../views/service/edit", {
                                    user: req.user, service: service, configurationItemsOfService: cis,
                                    statesOfService: states, edgesOfService: edges, attributesOfService: attsOfService,
                                    serviceInfrastructure: serviceInfrastructure, serviceWf: serviceWf
                                });
                            })
                        })
                    });
                });
            });
        });
    });
}

/**
 * Enable or disable created service (game) for players.
 * @param req
 * @param res
 */
serviceController.updatePermissions = function (req, res) {
    Service.findByIdAndUpdate(req.params.id, {
        $set: {
            isDisabled: req.query.isDisabled
        }
    }, { new: true }, function (err, ser) {
        if (err) {
            res.send();
        } else {
            res.redirect("/creator/services/published");
        }
    });
}

/**
 * Update service's properties.
 * @param req
 * @param res
 * @param si - service infrastrucute
 * @param swf - service workflow
 */
serviceController.updateService = function (req, res, si, swf) {
    Service.findByIdAndUpdate(req.params.id, {
        $set: {
            estimatedDuration: Number(req.body.estimatedDuration).toFixed(2),
            maxSpeedUp: Number(req.body.maxSpeedUp),
            label: req.body.label,
            description: req.body.description,
            serviceInfrastructure: mongoose.Types.ObjectId(si),
            serviceWf: mongoose.Types.ObjectId(swf),
            lastModified: Date.now(),
            additionalInfo: req.body.additionalInfo
        }
    }, { new: true }, function (err, ser) {
        if (err) {
            res.send();
        } else {
            res.send(req.params.id);
        }
    });
}

/**
 * Update service, including properties and workflows.
 * @param req
 * @param res
 */
serviceController.update = function (req, res) {
    async.parallel([
        function (callback) {
            parseString(req.body.serviceInfrastructure, callback);
        },
        function (callback) {
            parseString(req.body.serviceWf, callback);
        }
    ], function (err, results) {
        async.parallel([
            function (callback) {
                serviceController.createMxGraph(results[0], callback);
            },
            function (callback) {
                serviceController.createMxGraph(results[1], callback);
            },
            function (callback) {
                serviceController.deleteServiceWf(req, callback);
            },
            function (callback) {
                serviceController.deleteServiceInfrastructure(req, callback);
            }
        ], function (err1, results1) {
            serviceController.updateService(req, res, results1[0]._id, results1[1]._id);
        });
    });
};

/**
 * Make copy of service infrastructure (mxGraph) and assign it to service.
 * @param service - service to assign to
 * @param callback
 */
serviceController.copyServiceInfrastructure = function (service, callback) {
    var serviceInf = new ServiceInfrastructure();
    if (typeof service.serviceInfrastructure.mxGraph !== "undefined") {
        serviceInf.mxGraph = JSON.parse(JSON.stringify(service.serviceInfrastructure.mxGraph));
    }
    serviceInf.save(function (errSavingserviceInf, sinf) {
        service.serviceInfrastructure = sinf;
        service.save(function (err, savedService) {
            callback(null, null);
        });
    })
}

/**
 * Make copy of service workflow (mxGraph) and assign it to service.
 * @param service - service to assign to
 * @param callback
 */
serviceController.copyServiceWorkflow = function (service, callback) {
    var serviceWf = new ServiceInfrastructure();
    if (typeof service.serviceWf.mxGraph !== "undefined") {
        serviceWf.mxGraph = JSON.parse(JSON.stringify(service.serviceWf.mxGraph));
    }
    serviceWf.save(function (errSavingServiceWf, swf) {
        service.serviceWf = swf;
        service.save(function (err, savedService) {
            callback(null, null);
        });
    })
}

/**
 * Make copy of configuration items including it's attributes and assign in new service.
 * @param service - service to assign to, it will contain copied CIs and Atts
 * @param configurationItems - configuration items to copy
 * @param copiedAttributes - new attributes of copied configuration item. Array of tupples: <oldAtt._id, newAtt._id>
 * @param callback
 */
serviceController.copyConfigrationItems = function (service, configurationItems, copiedAttributes, callback) {
    // iterate through configuration items and make their copy
    async.each(configurationItems, function (CI, callback1) {
        var oldCiId = CI._id;
        CI._id = mongoose.Types.ObjectId();
        CI.isNew = true;
        CI.service = service._id;
        CI.save(function (err, copiedCI) {
            Attribute.find({ configurationItem: oldCiId }).exec(function (err, oldAtts) {
                // iterate through attributes of original configuration item and make copy
                async.each(oldAtts, function (att, callback2) {
                    var oldAttId = att._id;
                    att._id = mongoose.Types.ObjectId();
                    att.isNew = true;
                    // set reference to copied (new) configuration item
                    att.configurationItem = copiedCI;
                    att.save(function (err, copiedAttribute) {
                        copiedAttributes.push({ old: oldAttId, new: copiedAttribute._id });
                        callback2(null, null);
                    })
                }, function (err) {
                    callback1(null, null);
                })
            });
        });
    }, function (err) {
        callback(null, null);
    });
}

/**
 * Make a copy of attributes and assign them to service.
 * @param service - service to assign to
 * @param attributesToCopy 
 * @param copiedAttributes -  Array of tupples: <oldAtt._id, newAtt._id>
 * @param callback
 */
serviceController.copyAttributesOfService = function (service, attributesToCopy, copiedAttributes, callback) {
    async.each(attributesToCopy, function (att, callback1) {
        var oldAttId = att._id;
        att._id = mongoose.Types.ObjectId();
        att.isNew = true;
        att.service = service._id;
        att.save(function (err, savedAtt) {
            copiedAttributes.push({ old: oldAttId, new: savedAtt._id });
            callback1(null, null);
        });
    }, function (err) {
        callback(null, null);
    });
}

/**
 * Make copy of edges and assign them to service. Original attribute IDs in conditional edges are replaced for copied attributes IDs.
 * @param service - service to assign to
 * @param edgesToCopy
 * @param copiedAttributes - Array of tupples: <oldAtt._id, newAtt._id>
 * @param callback
 */
serviceController.copyEdges = function (service, edgesToCopy, copiedAttributes, callback) {
    async.each(edgesToCopy, function (edge, callback1) {
        edge._id = mongoose.Types.ObjectId();
        edge.isNew = true;
        edge.service = service._id;
        for (var i = 0; i < copiedAttributes.length; i++) {
            // replace IDs
            edge.condition = edge.condition.replace(new RegExp(copiedAttributes[i].old, 'g'), copiedAttributes[i].new);
        }
        edge.save(function (err, savedEdge) {
            callback1(null, null);
        });
    }, function (err) {
        callback(null, null);
    });
}

/**
 * Replace old attrubtes IDs for new Attributes IDs in commands.
 * @param commands - commands in which are ID's replaced
 * @param copiedAttributes - Array of tupples: <oldAtt._id, newAtt._id>
 */
serviceController.replaceIDsInCommands = function (commands, copiedAttributes) {
    if (commands != null) {
        for (var i = 0; i < commands.length; i++) {
            for (var j = 0; j < copiedAttributes.length; j++) {
                // replace IDs
                commands[i] = commands[i].replace(new RegExp(copiedAttributes[j].old, 'g'), copiedAttributes[j].new);
            }
        }
    }
}

/**
 * Copy states and their commands. Includes copying of their solutions and their commands.
 * @param service
 * @param oldStates - original states
 * @param copiedAttributes - Array of tupples: <oldAtt._id, newAtt._id>
 * @param callback
 */
serviceController.copyStates = function (service, oldStates, copiedAttributes, callback) {
    // copy states
    async.each(oldStates, function (state, callback1) {
        var oldStateId = state._id;
        state._id = mongoose.Types.ObjectId();
        state.isNew = true;
        state.service = service._id;
        // replace IDs in commands of state
        serviceController.replaceIDsInCommands(state.commands, copiedAttributes);
        state.save(function (err, savedState) {
            Solution.find({ state: oldStateId }).exec(function (err, oldSolutions) {
                // copy their solutions
                async.each(oldSolutions, function (solution, callback2) {
                    var oldSolutionId = solution._id;
                    solution._id = mongoose.Types.ObjectId();
                    solution.isNew = true;
                    solution.state = savedState;
                    // replace IDs in commands of solution
                    serviceController.replaceIDsInCommands(solution.commands, copiedAttributes);
                    solution.save(function (err, savedSolution) {
                        callback2(null, null);
                    })
                }, function (err) {
                    callback1(null, null);
                })
            });
        });
    }, function (err) {
        callback(null, null);
    });
}

/**
 * Copy service and it's service infrastructure and service workflow.
 * @param seviceId - service to copy
 * @param version 
 * @param callback
 */
serviceController.copyService = function (seviceId, version, callback) {
    Service.findOne({ _id: seviceId }).populate('serviceInfrastructure').populate('serviceWf').exec(function (err, oldService) {
        oldService._id = mongoose.Types.ObjectId();
        oldService.isNew = true;
        oldService.isPublished = true;
        oldService.version = version;
        oldService.published = Date.now();
        oldService.save(function (err, savedService) {
            callback(null, savedService);
        });
    });
}

/**
 * Publish service / create game. Makes copy od service. This copy is used for games.
 * Includes copiing of all states, CIs, edges, infrastructure and workflow.
 * @param req 
 * @param res
 */
serviceController.publish = function (req, res) {
    var attrRepl = [];
    async.series([
        function (callback) {
            serviceController.copyService(req.params.id, req.body.version, callback);
        },
        function (callback) {
            ConfigurationItem.find({ service: req.params.id }).exec(callback);
        },
        function (callback) {
            State.find({ service: req.params.id }).exec(callback);
        },
        function (callback) {
            Edge.find({ service: req.params.id }).exec(callback);
        },
        function (callback) {
            Attribute.find({ service: req.params.id }).exec(callback);
        },
    ], function (err, results) {
        async.series([
            function (callback) {
                serviceController.copyServiceInfrastructure(results[0], callback);
            },
            function (callback) {
                serviceController.copyServiceWorkflow(results[0], callback);
            },
            function (callback) {
                serviceController.copyConfigrationItems(results[0], results[1], attrRepl, callback);
            },
            function (callback) {
                serviceController.copyAttributesOfService(results[0], results[4], attrRepl, callback);
            },
            function (callback) {
                serviceController.copyEdges(results[0], results[3], attrRepl, callback);
            },
            function (callback) {
                serviceController.copyStates(results[0], results[2], attrRepl, callback);
            },
        ], function (err, results1) {
            console.log("service cloned");
            res.redirect("/creator/services/published");
        })
    });
}

/**
 * Delete service. 
 * Includes deleting of all states, CIs, edges, infrastructure and workflow.
 * @param req 
 * @param res
 */
serviceController.delete = function (req, res) {
    async.parallel([
        function (callback) {
            Service.findById(req.params.id).exec(function (err, service) {
                callback(null, service);
            })
        },
        function (callback) {
            ConfigurationItem.find({ service: req.params.id }).exec(function (err, cisOfService) {
                callback(null, cisOfService);
            })
        },
        function (callback) {
            State.find({ service: req.params.id }).exec(function (err, statesOfService) {
                callback(null, statesOfService);
            })
        },
    ], function (err, results) {
        async.series([
            function (callback) {
                Attribute.remove({ configurationItem: { $in: results[1] } }, function (err, removingAttsOfCIsResult) {
                    callback(null, null);
                })
            },
            function (callback) {
                Attribute.remove({ service: results[0] }, function (err, removingAttsOfServiceResult) {
                    callback(null, null);
                })
            },
            function (callback) {
                ServiceInfrastructure.remove({ _id: results[0].serviceInfrastructure }, function (err) {
                    callback(null, null);
                })
            },
            function (callback) {
                ServiceInfrastructure.remove({ _id: results[0].serviceWf }, function (err) {
                    callback(null, null);
                })
            },
            function (callback) {
                ConfigurationItem.remove({ service: results[0] }, function (err, removingCisResult) {
                    callback(null, null);
                })
            },
            function (callback) {
                Edge.remove({ service: results[0] }, function (err, removingEdgesResult) {
                    callback(null, null);
                })
            },
            function (callback) {
                State.remove({ service: results[0] }, function (err) {
                    callback(null, null);
                })
            },
            function (callback) {
                Solution.remove({ state: { $in: results[2] } }, function (err) {
                    callback(null, null);
                })
            },
            function (callback) {
                Service.findByIdAndRemove(req.params.id, function (err) {
                    callback(null, null);
                })
            },
        ], function (err, results1) {
            console.log("Service deleted!");
            res.redirect("/creator/services/created");
        })
    });
};


/**
 * Computes stats of games based on user's service and go to stats page.
 * @param req 
 * @param res
 */
serviceController.stats = function (req, res) {
    Service.findById(req.params.id).exec(function (err, service) {
        Game.find({ service: req.params.id }).populate('user').exec(function (err, games) {
            // iterate through all games of service
            for (var i = 0; i < games.length; i++) {
                var duration = 0;
                var uptime = 0;
                // compute duration. Duration = end - start or now - start, if game is strill running
                if (games[i].isTimeBased == true) {
                    var duration = 0;
                    if (games[i].isFinished == true) {
                        duration = (new moment(moment(games[i].finished))).diff((new moment(moment(games[i].started))), 'seconds')
                    } else {
                        duration = (new moment()).diff((new moment(moment(games[i].started))), 'seconds')
                    }
                } else {
                    duration = games[i].duration;
                }
                // compute downtime
                var downtime = games[i].downtime;
                // if service is still running, add time from last service broke till now
                if (games[i].isTimeBased == true && games[i].isDown == true && games[i].isFinished == false) {
                    downtime += (new moment()).diff((new moment(moment(games[i].serviceBroke))), 'seconds');
                }
                var uptime = duration - downtime;
                games[i].downtime = downtime;
                // compute average ticket reation time and convert to datetime format
                if (serviceController.isNumber(games[i].ticketReactionAvg) && games[i].ticketReactionAvg > 0) {
                    games[i].ticketReactionAvgFormated = moment.duration(games[i].ticketReactionAvg, 'seconds').format("M [mon] d [days] h [hrs] m [min] s [sec]");
                } else {
                    games[i].ticketReactionAvgFormated = "-";
                }
                // Compute availability, convert to datetime format and check if is nubmer
                var availability = Math.round((uptime / duration) * 10000) / 100;
                if (serviceController.isNumber(availability) && availability > 0) {
                    games[i].avalabilityFormated = availability;
                } else {
                    games[i].avalabilityFormated = "-";
                }
                // Compute mtbf, convert to datetime format and check if is nubmer
                var mtbf = uptime / games[i].numberOfServiceBreaks;
                if (serviceController.isNumber(mtbf) && mtbf > 0) {
                    games[i].mtbfFormated = moment.duration(uptime / games[i].numberOfServiceBreaks, 'seconds').format("M [mon] d [days] h [hrs] m [min] s [sec]");
                } else {
                    games[i].mtbfFormated = "-";
                }
                // Compute mtrs, convert to datetime format and check if is nubmer
                var mtrs = downtime / games[i].numberOfServiceBreaks;
                if (serviceController.isNumber(mtrs) && mtrs > 0) {
                    games[i].mtrsFormated = moment.duration(mtrs, 'seconds').format("M [mon] d [days] h [hrs] m [min] s [sec]");
                } else {
                    games[i].mtrsFormated = "-";
                }
            }
            res.render("../views/game/stats", { user: req.user, games: games, service: service });
        });
    });
}

/**
 * Determines, whether n is finite number.
 * @param n 
 * @return True if is finite number, false otherwise.
 */
serviceController.isNumber = function (n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
}

/**
 * Get all edges of service. 
 * @param {request} req
 * @param {response} res 
 */
serviceController.edgesOfService = function (req, res) {
    Edge.find({ service: req.params.id }).exec(function (err, edges) {
        res.send(edges);
    });
};

/**
 * Check if reqest is authenticated for crud service.
 * @param {request} req
 * @param {response} res 
 * @param {next} next 
 */
serviceController.checkOwner = function (req, res, next) {
    if (req.isAuthenticated()) {
        Service.findById(req.params.id).populate('user').exec(function (err, s) {
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

module.exports = serviceController;
