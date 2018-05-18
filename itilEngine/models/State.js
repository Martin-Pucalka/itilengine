var mongoose = require("mongoose");
var Schema = mongoose.Schema;

var StateSchema = new Schema({
    stateid: String,
    type: String,
    subject: {type: String, default: ""},
    description: {type: String, default: ""},
    priority: { type: String, default: "1"},
    status: String,
    service: { type: Schema.Types.ObjectId, ref: 'Service' },
    commands: [String],
    isBlocking: { type: Boolean, default: false},
    bringDown: { type: Boolean, default: false},
});

module.exports = mongoose.model('State', StateSchema);