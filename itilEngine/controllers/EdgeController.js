var mongoose = require("mongoose");
var Edge = mongoose.model("Edge");
var Service = mongoose.model("Service");

var edgeController = {};

/**
 * Delete edge. 
 * @param {request} req
 * @param {response} res 
 */
edgeController.delete = function (req, res) {
    Edge.findByIdAndRemove(mongoose.Types.ObjectId(req.params.id), function (err) {
        if (err) {
            console.log(err);
        }
        else {
            console.log("deleted edge: " + req.params.id);
            res.send(req.params.id);
        }
    });
};

/**
 * Save new edge. 
 * @param {request} req
 * @param {response} res 
 */
edgeController.save = function (req, res) {
    var edge = new Edge(req.body);
    edge.service = mongoose.Types.ObjectId(req.body.serviceId);
    edge.save(function (err, e) {
        if (err) {
            console.log(err);
        } else {
            console.log("saved edge: " + e._id);
            res.send(e._id);
        }
    });
};

/**
 * Update edge. 
 * @param {request} req
 * @param {response} res 
 */
edgeController.update = function (req, res) {
    Edge.findByIdAndUpdate(req.params.id, {
        $set: {
            type: req.body.type,
            numberOfHours: req.body.numberOfHours,
            typeOfTiming: req.body.typeOfTiming,
            probability: req.body.probability,
            condition: req.body.condition,
            isIfEdge: req.body.isIfEdge
        }
    }, { new: true }, function (err, edge) {
        if (err) {
            console.log(err);
        } else {
            console.log("updated edge: " + req.params.id);
            res.send(req.params.id);
        }
    });
};

/**
 * Check if reqest is authenticated to update and delete edge.
 * @param {request} req
 * @param {response} res 
 * @param {next} next 
 */
edgeController.checkServiceOwner = function (req, res, next) {
    if (req.isAuthenticated()) {
        Edge.findById(req.params.id).populate('service').exec(function (err, edge) {
            if (edge.service.user == req.user._id) {
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
 * Check if reqest is authenticated to create edge.
 * @param {request} req
 * @param {response} res 
 * @param {next} next 
 */
edgeController.checkServiceOwnerForSave = function (req, res, next) {
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

module.exports = edgeController;
