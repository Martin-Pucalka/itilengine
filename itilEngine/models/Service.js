var mongoose = require("mongoose");
var Schema = mongoose.Schema;

var ServiceSchema = new Schema({
    label: String,
    description: {type: String, default: ""},
    additionalInfo: String,
    serviceInfrastructure: { type: Schema.Types.ObjectId, ref: 'ServiceInfrastructure' },    
    serviceWf: { type: Schema.Types.ObjectId, ref: 'ServiceInfrastructure' },    
    user: { type: Schema.Types.ObjectId, ref: 'User' },    
    isPublished: { type: Boolean, default: false},
    isDisabled: { type: Boolean, default: false},
    maxSpeedUp: {type: Number, default: 100},
    estimatedDuration: {type: Number, default: 10},
    created: { type : Date, default: Date.now },
    lastModified: { type : Date, default: Date.now },
    published: { type : Date },
    version: {type: String, default: "1"},
});

module.exports = mongoose.model('Service', ServiceSchema);
