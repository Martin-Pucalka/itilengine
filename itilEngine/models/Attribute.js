var mongoose = require("mongoose");
var Schema = mongoose.Schema;

var AttributeSchema = new Schema({
    name: {type: String, default: ""},
    initValue: {type: Number, default: 0},
    unit: {type: String, default: ""},
    configurationItem: { type: Schema.Types.ObjectId, ref: 'ConfigurationItem' },
    service: { type: Schema.Types.ObjectId, ref: 'Service' },
});

module.exports = mongoose.model('Attribute', AttributeSchema);

