var mongoose = require("mongoose");
var ConfigurationItem = mongoose.model("ConfigurationItem");
var Attribute = mongoose.model("Attribute");
var Service = mongoose.model("Service");
var AttributeController = require("./AttributeController.js");
var async = require("async");

var configurationItemController = {};


/**
 * Delete configuration item (ci). 
 * @param {request} req
 * @param {response} res 
 */
configurationItemController.delete = function (req, res) {
    ConfigurationItem.findById(req.params.id).exec(function (err, ci) {
        var canBeDeleted = true;
        // Configuration item contains attributes, so it can be deleted only if all of these attributes can be deleted
        Attribute.find({ configurationItem: req.params.id }).exec(function (err, attributes) {
            // check if each of attributes can be deleted
            async.each(attributes, function (att, callback) {
                AttributeController.canDeleteAttribute(ci.service, att._id, function (err, canBeDeletedParam) {
                    if (canBeDeletedParam == false) {
                        canBeDeleted = false;
                    }
                    callback();
                });
            }, function (err) {
                if (canBeDeleted == true) {
                    // Delete all attributes of ci
                    Attribute.remove({ configurationItem: { $in: mongoose.Types.ObjectId(req.params.id) } }, function (err, attributesDeletingResult) {
                        // Delete ci
                        console.log("deleted attributes: " + attributesDeletingResult);
                        ConfigurationItem.findByIdAndRemove(mongoose.Types.ObjectId(req.params.id), function (err) {
                            console.log("deleted ci: " + req.params.id);
                            res.send(true);
                        });
                    });
                } else {
                    res.send(false);
                }
            });
        })
    });
};

/**
 * Save new configuration item (ci). 
 * @param {request} req
 * @param {response} res 
 */
configurationItemController.save = function (req, res) {
    var configurationItem = new ConfigurationItem(req.body);
    // set blank image
    configurationItem.img = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABAQMAAAAl21bK"
        + "AAAAA1BMVEX/TQBcNTh/AAAAAXRSTlMAQObYZgAAAApJREFUeJxjYgAAAAYAAzY3fKgAAAAASUVORK5CYII=";
    configurationItem.service = mongoose.Types.ObjectId(req.body.serviceId);
    configurationItem.save(function (err, ci) {
        if (err) {
            console.log(err);
        } else {
            console.log("saved ci: " + ci._id);
            res.send(ci._id);
        }
    });
};

/**
 * Update configuration item (ci). 
 * @param {request} req
 * @param {response} res 
 */
configurationItemController.update = function (req, res) {
    ConfigurationItem.findByIdAndUpdate(req.params.id, {
        $set: {
            label: req.body.label,
            description: req.body.description,
            img: req.body.image,
        }
    }, { new: true }, function (err, ci) {
        if (err) {
            console.log(err);
        } else {
            console.log("updated ci: " + req.params.id);
            res.send(req.params.id);
        }
    });
};

/**
 * Check if reqest is authenticated to update and delete configuration item.
 * @param {request} req
 * @param {response} res 
 * @param {next} next 
 */
configurationItemController.checkServiceOwner = function (req, res, next) {
    if (req.isAuthenticated()) {
        ConfigurationItem.findById(req.params.id).populate('service').exec(function (err, ci) {
            if (ci.service.user == req.user._id) {
                next();
            } else {
                res.status(401).send();
            }
        });
    } else {
        res.redirect('/');
    }
}

/**
 * Check if reqest is authenticated to create configuration item.
 * @param {request} req
 * @param {response} res 
 * @param {next} next 
 */
configurationItemController.checkServiceOwnerForSave = function (req, res, next) {
    if (req.isAuthenticated()) {
        Service.findById(req.body.serviceId).exec(function (err, s) {
            if (s.user == req.user._id) {
                next();
            } else {
                res.status(401).send();
            }
        });
    } else {
        res.redirect('/');
    }
}

module.exports = configurationItemController;
