var mongoose = require("mongoose");
var passport = require("passport");
var User = require("../models/User");

var authController = {};

/**
 * Go to registration page.
 * @param {request} req
 * @param {response} res 
 */
authController.register = function (req, res) {
    res.render('index/register');
};

/**
 * Post registration.
 * @param {request} req
 * @param {response} res 
 */
authController.doRegister = function (req, res) {
    // create new user
    User.register(new User({ username: req.body.username, email: req.body.email }), req.body.password, function (err, user) {
        if (err) {
            return res.render('index/register', { errRegister: true });
        }
        passport.authenticate('local', function (err, user, info) {
            if (err) {
                return next(err);
            }
            // login and redirect
            req.logIn(user, function (err) {
                if (err) {
                    return next(err);
                }
                return res.redirect('/creator/services/created');
            });
        })(req, res);
    });
};

/**
 * Go to login page.
 * @param {request} req
 * @param {response} res 
 */
authController.login = function (req, res) {
    res.render('login');
};

/**
 * Post login.
 * @param {request} req
 * @param {response} res 
 */
authController.doLogin = function (req, res) {
    passport.authenticate('local', function (err, user, info) {
        if (err) {
            return next(err);
        }
        if (!user) {
            return res.render('index/register', { errLogin: true });
        }
        req.logIn(user, function (err) {
            if (err) {
                return next(err);
            }
            return res.redirect('/creator/services/created');
        });
    })(req, res);
};

/**
 * Logout.
 * @param {request} req
 * @param {response} res 
 */
authController.logout = function (req, res) {
    req.logout();
    res.redirect('/');
};

/**
 * Sing in using google. Creates new user, if it is his first sign in.
 * @param {accessToken} accessToken
 * @param {refreshToken} refreshToken 
 * @param {profile} req
 * @param {next} next
 */
authController.processGoogleSign = function (accessToken, refreshToken, profile, next) {
    User.findOne({ 'google.id': profile.id }, function (err, user) {
        if (err)
            return next(err);
        if (user)
            return next(null, user);
        else {
            var newUser = new User();
            newUser.google.id = profile.id;
            newUser.google.token = accessToken;
            newUser.username = profile.name.givenName + ' ' + profile.name.familyName; // create username
            newUser.email = profile.emails[0].value;

            newUser.save(function (err) {
                if (err) {
                    throw err;
                }
                return next(null, newUser);
            })
        }
    });
}

/**
 * Check if user is logged in.
 * @param {request} req
 * @param {response} res 
 * @param {next} next 
 */
authController.checkLoggedIn = function (req, res, next) {
    if (req.isAuthenticated()) {
        next();
    } else {
        res.redirect('/');
    }
}

module.exports = authController;