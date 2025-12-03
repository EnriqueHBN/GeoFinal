//Puntos de interes
const mongoose = require('mongoose');
const PinteresSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: true
    },
    descripcion: {
        type: String,
        required: true
    },
    location: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
        },
        coordinates: {
            type: [Number],
            required: true
        }
    }
});

PinteresSchema.index({ location: '2dsphere' });
module.exports = mongoose.model('PInteres', PinteresSchema);