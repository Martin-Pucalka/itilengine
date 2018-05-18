var mongoose = require("mongoose");
var Schema = mongoose.Schema;

var SolutionSchema = new Schema({
    description: {type: String, default: "Do something"},
    commands: [String],
    state: { type: Schema.Types.ObjectId, ref: 'State' },
    isIgnore: { type: Boolean, default: false},
});

module.exports = mongoose.model('Solution', SolutionSchema);

