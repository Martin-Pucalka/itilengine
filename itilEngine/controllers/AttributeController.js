var mongoose = require("mongoose");
var Attribute = mongoose.model("Attribute");
var State = mongoose.model("State");
var Solution = mongoose.model("Solution");
var Edge = mongoose.model("Edge");
var Service = mongoose.model("Service");
var ConfigurationItem = mongoose.model("ConfigurationItem");

var attributeController = {};

/**
 * Determines whterer attribute can be deleted. Returns false attribute used in command false of state, solution or in condition of edge,
 * otherwise true.
 * @param {string} serviceId - Id of service of attribute.
 * @param {string} attributeId - Id of attribute.
 * @param {function} callback
 */
attributeController.canDeleteAttribute = function (serviceId, attributeId, callback) {
    State.find({ service: serviceId }).exec(function (err, states) {
        Solution.find({ state: { $in: states } }).exec(function (err, solutions) {
            Edge.find({ service: { $in: serviceId } }).exec(function (err, edges) {
                var canBeDeleted = true;
                //check if is in any command
                for (var i = 0; i < states.length; i++) {
                    for (var j = 0; j < states[i].commands.length; j++) {
                        if (states[i].commands[j].includes(attributeId) == true) {
                            canBeDeleted = false;
                        }
                    }
                }
                //check if is in any solution
                for (var i = 0; i < solutions.length; i++) {
                    for (var j = 0; j < solutions[i].commands.length; j++) {
                        if (solutions[i].commands[j].includes(attributeId) == true) {
                            canBeDeleted = false;
                        }
                    }
                }
                //check if is in any condition
                for (var i = 0; i < edges.length; i++) {
                    if (edges[i].condition.includes(attributeId) == true && edges[i].type == "Condition") {
                        canBeDeleted = false;
                    }
                }
                callback(null, canBeDeleted);
            });
        });
    });
}

/**
 * Delete attribute.
 * @param {request} req
 * @param {response} res 
 */
attributeController.delete = function (req, res) {
    // Check if can be deleted
    attributeController.canDeleteAttribute(req.query.serviceId, req.params.id, function (err, canBeDeleted) {
        if (canBeDeleted == true) {
            Attribute.findByIdAndRemove(mongoose.Types.ObjectId(req.params.id), function (err) {
                if (err) {
                    console.log(err);
                }
                else {
                    console.log("deleted attribute: " + req.params.id);
                    res.send(true);
                }
            });
        } else {
            res.send(false);
        }
    });
};

/**
 * Save new attribute. 
 * @param {request} req
 * @param {response} res 
 */
attributeController.save = function (req, res) {
    var attribute = new Attribute(req.body);
    if (req.body.serviceId) { // determine if attribute belongs to service
        attribute.service = mongoose.Types.ObjectId(req.body.serviceId);
    } else if (req.body.ci_id) { // or belongs to configuration item
        attribute.configurationItem = mongoose.Types.ObjectId(req.body.ci_id);
    } else {
        console.log("id of service or ci not found!");
    }
    attribute.save(function (err, savedAttribute) {
        if (err) {
            console.log(err);
        } else {
            console.log("saved attribute: " + savedAttribute._id);
            res.send(savedAttribute._id);
        }
    });
};

/**
 * Update attribute attribute. 
 * @param {request} req
 * @param {response} res 
 */
attributeController.update = function (req, res) {
    Attribute.findByIdAndUpdate(req.params.id, {
        $set: {
            name: req.body.name,
            initValue: req.body.initValue,
            unit: req.body.unit,
        }
    }, { new: true }, function (err, savedAttribute) {
        if (err) {
            console.log(err);
        } else {
            console.log("updated attribute: " + req.params.id);
            res.send(req.params.id);
        }
    });
};

/**
 * Check if reqest is authenticated to update and delete attribute.
 * @param {request} req
 * @param {response} res 
 * @param {next} next 
 */
attributeController.checkServiceOwner = function (req, res, next) {
    if (req.isAuthenticated()) {
        // check if user owns service of updating attribute
        Attribute.findById(req.params.id).populate('service').exec(function (err, att) {
            if (att.service != null) {
                if (att.service.user == req.user._id) {
                    next();
                } else {
                    res.status(401).send();
                }
            } else {
                // or if configuration item belongs to service which is owned by user
                ConfigurationItem.findById(att.configurationItem).populate('service').exec(function (err, ci) {
                    if (ci != null && ci.service.user == req.user._id) {
                        next();
                    } else {
                        res.status(401).send();
                    }
                });
            }
        });
    } else {
        res.redirect('/');
    }
}

/**
 * Check if reqest is authenticated to create attribute.
 * @param {request} req
 * @param {response} res 
 * @param {next} next 
 */
attributeController.checkServiceOwnerForSave = function (req, res, next) {
    if (req.isAuthenticated()) {
        // check if user owns service of adding attribute
        Service.findById(req.body.serviceId).exec(function (err, s) {
            if (s != null) {
                if (s.user == req.user._id) {
                    next();
                } else {
                    res.status(401).send();
                }
            } else {
                // or if configuration item belongs to service which is owned by user
                ConfigurationItem.findById(req.body.ci_id).populate('service').exec(function (err, ci) {
                    if (ci.service.user == req.user._id) {
                        next();
                    } else {
                        res.status(401).send();
                    }
                });
            }
        });
    } else {
        res.redirect('/');
    }
}

module.exports = attributeController;
