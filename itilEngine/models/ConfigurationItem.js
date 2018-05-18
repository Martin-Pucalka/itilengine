var mongoose = require("mongoose");
var Schema = mongoose.Schema;

var ConfigurationItemSchema = new Schema({
    label: {type: String, default: ""},
    description: {type: String, default: ""},
    img: String,
    ciid: String,
    service: { type: Schema.Types.ObjectId, ref: 'Service' },
});

ConfigurationItemSchema.methods.attributes = function (next) {
    var Attribute = this.model('Attribute');

    return Attribute.find({ configurationItem: this }, next);
};


module.exports = mongoose.model('ConfigurationItem', ConfigurationItemSchema);
