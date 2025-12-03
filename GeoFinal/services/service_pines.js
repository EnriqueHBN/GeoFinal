const Puntos = require('../models/Pines')
class PIntereservice {
    
    async getAll() {
        try {
            const data = await Puntos.find({}).lean();
            return data;
        } catch (e) { // Middleware
            throw new Error("Puntos not found");
        }
    }

    async getByID(id) {
        try {
            const data = await Puntos.findById({_id : id});
            return data;
        } catch (e) { // Middleware
            throw new Error("Puntos not found");
        }
    }

    async create(data) {
        try {
            const newPuntos= new Puntos({ ...data});
            await newPuntos.save({new: true, lean: true})
            return newPuntos;
        } catch (e) { // Middleware
            throw new Error("Puntos creation failed" + e.message);
        }
    }

    async update(id,changes) {
        try {
            return await Puntos.findByIdAndUpdate(id, { $set: changes}, { new: true, lean: true });
        } catch (e) { // Middleware
            throw new Error("Puntos not found");
        }
    }

    async delete(id) {
        try {
            return await Puntos.deleteOne({_id : id});
        } catch (e) { // Middleware
            throw new Error("Puntos not found")
        }
    }
}

module.exports = PIntereservice;
