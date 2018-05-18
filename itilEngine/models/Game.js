var mongoose = require("mongoose");
var Schema = mongoose.Schema;

var GameSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    service: { type: Schema.Types.ObjectId, ref: 'Service' },
    isTimeBased: { type: Boolean, default: false },
    speed: Number,
    started: { type: Date, default: Date.now },
    finished: { type: Date, default: Date.now },
    isFinished: { type: Boolean, default: false },
    attributeValues: [{
        attribute: { type: Schema.Types.ObjectId, ref: 'Attribute' },
        value: Number
    }],
    tickets: [{
        state: { type: Schema.Types.ObjectId, ref: 'State' },
        status: String,
        created: { type: Date, default: null },
        solved: { type: Date },
        selectedSolution: { type: Schema.Types.ObjectId, ref: 'Solution' },
    }],
    currentState: { type: Schema.Types.ObjectId, ref: 'State' },
    downtime: { type: Number, default: 0 },
    duration: { type: Number, default: 0 },
    serviceBroke: { type: Date },
    numberOfServiceBreaks: { type: Number, default: 0 },
    isDown: { type: Boolean, default: false },
    ticketReactionAvg: { type: Number, default: 0 },
});

module.exports = mongoose.model('Game', GameSchema);

