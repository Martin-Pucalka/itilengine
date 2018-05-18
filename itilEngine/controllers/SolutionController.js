var mongoose = require("mongoose");
var Solution = mongoose.model("Solution");
var State = mongoose.model("State");
var Service = mongoose.model("Service");

var solutionController = {};

/**
 * Delete solution.
 * @param {request} req
 * @param {response} res 
 */
solutionController.delete = function (req, res) {
    Solution.findByIdAndRemove(mongoose.Types.ObjectId(req.params.id), function (err) {
        if (err) {
            console.log(err);
        }
        else {
            console.log("deleted solution: " + req.params.id);
            res.send(req.params.id);
        }
    });
};

/**
 * Save new solution.
 * @param {request} req
 * @param {response} res 
 */
solutionController.save = function (req, res) {
    var solution = new Solution(req.body);
    solution.state = mongoose.Types.ObjectId(req.body.stateId);
    solution.save(function (err, s) {
        if (err) {
            console.log(err);
        } else {
            console.log("saved solution: " + s._id);
            res.send(s._id);
        }
    });
};

/**
 * Update solution.
 * @param {request} req
 * @param {response} res 
 */
solutionController.update = function (req, res) {
    Solution.findById(req.params.id).exec(function (err, solution) {
        if (err) {
            console.log(err);
        } else {
            if (req.body.updateCommands == true) {
                // update only commands
                solution.commands = req.body.commands;
            } else {
                // update only description
                solution.description = req.body.description;
            }
            solution.save(function (err) {
                if (err) {
                    console.log(err);
                } else {
                    console.log("updated solution " + req.params.id);
                    res.send(req.params.id);
                }
            });
        }
    })
};

/**
 * Get all commands of solution.
 * @param {request} req
 * @param {response} res 
 */
solutionController.getCommands = function (req, res) {
    Solution.findOne({ _id: req.params.id }).exec(function (err, s) {
        res.send(s.commands);
    })
}

/**
 * Check if reqest is authenticated to create solution.
 * @param {request} req
 * @param {response} res 
 * @param {next} next 
 */
solutionController.checkServiceOwnerForSave = function (req, res, next) {
    if (req.isAuthenticated()) {
        State.findById(req.body.stateId).populate('service').exec(function (err, state) {
            if (state.service.user == req.user._id) {
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
 * Check if reqest is authenticated to update and delete solution.
 * @param {request} req
 * @param {response} res 
 * @param {next} next 
 */
solutionController.checkServiceOwner = function (req, res, next) {
    if (req.isAuthenticated()) {
        next();
    } else {
        res.redirect('/');
    }
}

module.exports = solutionController;
