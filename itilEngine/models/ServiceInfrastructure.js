var mongoose = require("mongoose");
var Schema = mongoose.Schema;

var ServiceInfrastructureSchema = new Schema({
    mxGraph: Object,
});

module.exports = mongoose.model('ServiceInfrastructure', ServiceInfrastructureSchema);
