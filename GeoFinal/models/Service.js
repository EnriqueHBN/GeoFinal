const mongoose = require('mongoose');

const ServicioSchema = new mongoose.Schema({
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


// Método estático para obtener el próximo ID
ServicioSchema.statics.getNextId = async function() {
    const lastPlace = await this.findOne({}, {}, { sort: { 'id': -1 } });
    return lastPlace ? lastPlace.id + 1 : 1;
};
ServicioSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Servicio', ServicioSchema);


