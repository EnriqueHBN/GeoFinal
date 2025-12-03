const mongoose = require('mongoose');

const CoordenadaSchema = new mongoose.Schema({
  lat: {
    type: Number,
    required: true
  },
  lng: {
    type: Number,
    required: true
  }
}, { _id: false });

const ZonaSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: true,
    trim: true
  },
  descripcion: {
    type: String,
    required: true,
    trim: true
  },
  // Para polígonos y polilíneas
  coordenadas: [[CoordenadaSchema]],
  
  // Para círculos
  centro: CoordenadaSchema,
  radio: Number,
  
  // Para rectángulos
  bounds: {
    norte: Number,
    sur: Number,
    este: Number,
    oeste: Number
  },
  
  // Tipo de shape: 'polygon', 'polyline', 'circle', 'rectangle', 'marker'
  tipo: {
    type: String,
    required: true,
    enum: ['polygon', 'polyline', 'circle', 'rectangle', 'marker'],
    default: 'polygon'
  }
});

// Índices para búsquedas geoespaciales
ZonaSchema.index({ nombre: 'text', descripcion: 'text' });

// Método para obtener las coordenadas en formato Leaflet
ZonaSchema.methods.getLeafletCoords = function() {
  switch(this.tipo) {
    case 'polygon':
    case 'polyline':
      return this.coordenadas[0].map(coord => [coord.lat, coord.lng]);
    case 'circle':
      return [this.centro.lat, this.centro.lng];
    case 'rectangle':
      return [[this.bounds.norte, this.bounds.oeste], [this.bounds.sur, this.bounds.este]];
    case 'marker':
      return this.coordenadas[0].map(coord => [coord.lat, coord.lng]);
    default:
      return [];
  }
};

// Método estático para buscar zonas por proximidad
ZonaSchema.statics.buscarCercanas = function(lat, lng, maxDistance = 5000) {
  return this.find({
    centro: {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: [lng, lat]
        },
        $maxDistance: maxDistance
      }
    },
    activo: true
  });
};

module.exports = mongoose.model('Zona', ZonaSchema);