var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var mongoose = require('mongoose');
mongoose.connect(process.env.DB);

var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;

var Game = require('./models/Game.js');
var Service = require('./models/Service.js');
var ConfigurationItem = require('./models/ConfigurationItem.js');
var ServiceInfrastructure = require('./models/ServiceInfrastructure.js');
var State = require('./models/State.js');
var Edge = require('./models/Edge.js');
var Attribute = require('./models/Attribute.js');
var Solution = require('./models/Solution.js');
var User = require('./models/User');

var index = require('./routes/index');
var users = require('./routes/users');
var games = require('./routes/games');
var states = require('./routes/states');
var configurationItems = require('./routes/configurationItems');
var services = require('./routes/services');
var edges = require('./routes/edges');
var attributes = require('./routes/attributes');
var solutions = require('./routes/solutions');

var app = express();
app.locals.moment = require('moment');

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
// app.use(favicon(path.join(__dirname, 'public', 'img', 'itil.png')));
app.use(logger('dev'));
app.use(bodyParser.json({ limit: '1mb' }));
app.use(bodyParser.urlencoded({ limit: '1mb', extended: true }));

app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

const session = require('express-session');
const MongoStore = require('connect-mongo')(session);

app.use(session({
    secret: 'keyboard cat',
    store: new MongoStore({ mongooseConnection: mongoose.connection }),
    resave: true,
    saveUninitialized: true
}));

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser(function (user, done) {
    done(null, user);
});

passport.deserializeUser(function (user, done) {
    done(null, user);
});

passport.use(new LocalStrategy(User.authenticate()));

var GoogleStrategy = require('passport-google-oauth20').Strategy;
var AuthController = require('./controllers/AuthController');

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENTID,
    clientSecret: process.env.CLIENTSECRET,
    callbackURL: process.env.HOSTNAME + ":" + process.env.PORT + "/auth/google/callback"
}, AuthController.processGoogleSign));

app.get('/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/login' }),
    function (req, res) {
        res.redirect('/creator/services/created'); // Successful authentication, redirect home.
    });

app.use('/', index);
app.use('/users', users);
app.use('/player/games', games);
app.use('/creator/states', states);
app.use('/creator/services', services);
app.use('/player/services', services);
app.use('/creator/edges', edges);
app.use('/creator/configurationItems', configurationItems);
app.use('/creator/attributes', attributes);
app.use('/creator/solutions', solutions);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('index/error');
});

module.exports = app;