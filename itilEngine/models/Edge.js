var mongoose = require("mongoose");
var Schema = mongoose.Schema;

var EdgeSchema = new Schema({
    edgeid: String,
    type: String,
    numberOfHours: { type: Number, default: 1 },
    typeOfTiming: String,
    probability: { type: Number, default: 1 },
    isIfEdge: { type: Boolean, default: true },
    condition: String,
    service: { type: Schema.Types.ObjectId, ref: 'Service' },
});

module.exports = mongoose.model('Edge', EdgeSchema);

