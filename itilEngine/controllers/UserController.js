var mongoose = require("mongoose");
var User = mongoose.model("User");

var userController = {};

/**
 * Go to users profile.
 * @param {request} req
 * @param {response} res 
 */
userController.edit = function (req, res) {
    User.findOne({ _id: req.params.id }).exec(function (err, u) {
        res.render("index/profile", { user: u });
    });
}

/**
 * Update user.
 * @param {request} req
 * @param {response} res 
 */
userController.update = function (req, res) {
    User.findByIdAndUpdate(req.params.id, {
        $set: {
            email: req.body.email,
            sendEmailNotifications: req.body.sendEmailNotifications ? true : false,
        }
    }, { new: true }, function (err, u) {
        if (err) {
            console.log(err);
        } else {
            console.log("updated user: " + req.params.id);
            res.render("index/profile", { user: u, saved: true });
        }
    });
};

/**
 * Check if reqest is authenticated for read & update user.
 * @param {request} req
 * @param {response} res 
 * @param {next} next 
 */
userController.checkOwner = function (req, res, next) {
    if (req.isAuthenticated() && req.params.id == req.user._id) {
        next();
    } else {
        res.redirect('/');
    }
}

/**
 * Create user - user is created in AuthController
 */


module.exports = userController;