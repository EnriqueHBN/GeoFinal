const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    calificacion: {
        type: Number,
        required: true,
        min: 1,
        max: 5,
        validate: {
            validator: Number.isInteger,
            message: 'La calificación debe ser un número entero'
        }
    },
    opinion: {
        type: String,
        required: true,
        trim: true,
        maxlength: 1000
    },
    servicioTuristico: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ServicioTuristico',
        required: true
    }
});

module.exports = mongoose.model('Review', ReviewSchema);