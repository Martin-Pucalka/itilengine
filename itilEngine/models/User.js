var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var passportLocalMongoose = require('passport-local-mongoose');

var UserSchema = new Schema({
	username: String,
	password: String,
	email: String,
    google: {
		id: String,
		token: String,
	},
	sendEmailNotifications: { type: Boolean, default: false},
});

UserSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model('User', UserSchema);
