var mongoose = require("mongoose");
var State = mongoose.model("State");
var Solution = mongoose.model("Solution");
var Service = mongoose.model("Service");

var stateController = {};

/**
 * Delete state.
 * @param {request} req
 * @param {response} res 
 */
stateController.delete = function (req, res) {
    // Delete all solutions of the state
    Solution.remove({ state: { $in: mongoose.Types.ObjectId(req.params.id) } }, function (err, solutionsDeletingResult) {
        // Delete the state
        State.findByIdAndRemove(mongoose.Types.ObjectId(req.params.id), function (err) {
            console.log("deleted state: " + req.params.id);
            res.send();
        });
    });
};

/**
 * Save new state.
 * @param {request} req
 * @param {response} res 
 */
stateController.save = function (req, res) {
    var state = new State(req.body);
    state.service = mongoose.Types.ObjectId(req.body.serviceId);
    state.stateid = req.body.stateid;
    state.save(function (err, s) {
        if (err) {
            console.log(err);
        } else {
            // Create default (ignore) solution for new state
            var ignoreSolution = new Solution();
            ignoreSolution.state = state;
            ignoreSolution.description = "Ignore";
            ignoreSolution.isIgnore = true;
            ignoreSolution.save(function (err, savedIgnoreSolution) {
                console.log("saved state: " + s._id);
                res.send(s._id);
            });
        }
    });
};

/**
 * Update state.
 * @param {request} req
 * @param {response} res 
 */
stateController.update = function (req, res) {
    State.findById(req.params.id).exec(function (err, state) {
        state.subject = req.body.subject;
        state.description = req.body.description;
        state.priority = req.body.priority;
        state.bringDown = req.body.bringDown;
        state.isBlocking = req.body.isBlocking;
        if (req.body.updateCommands == true) {
            state.commands = req.body.commands;
        }
        state.save(function (err, s) {
            res.send(req.params.id);
        })
    });
};

/**
 * Get all commands of state.
 * @param {request} req
 * @param {response} res 
 */
stateController.getCommands = function (req, res) {
    State.findOne({ _id: req.params.id }).exec(function (err, s) {
        res.send(s.commands);
    })
}

/**
 * Check if reqest is authenticated to update and delete state.
 * @param {request} req
 * @param {response} res 
 * @param {next} next 
 */
stateController.checkServiceOwner = function (req, res, next) {
    if (req.isAuthenticated()) {
        State.findById(req.params.id).populate('service').exec(function (err, state) {
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
 * Check if reqest is authenticated to create state.
 * @param {request} req
 * @param {response} res 
 * @param {next} next 
 */
stateController.checkServiceOwnerForSave = function (req, res, next) {
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

module.exports = stateController;
