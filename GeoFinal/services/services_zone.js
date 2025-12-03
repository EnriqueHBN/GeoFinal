const Zone = require('../models/Zone')
class ZonaService {
    
    async getAll() {
        try {
            const data = await Zone.find({}).lean();
            return data;
        } catch (e) { // Middleware
            throw new Error("Zonas not found");
        }
    }

    async getByID(id) {
        try {
            const data = await Zone.findById({_id : id});
            return data;
        } catch (e) { // Middleware
            throw new Error("Zona not found");
        }
    }

    async create(data) {
        try {
            const newZona = new Zone({ ...data});
            await newZona.save({new: true, lean: true})
            return newZona;
        } catch (e) { // Middleware
            throw new Error("Zonas creation failed" + e.message);
        }
    }

    async update(id,changes) {
        try {
            return await Zone.findByIdAndUpdate(id, { $set: changes}, { new: true, lean: true });
        } catch (e) { // Middleware
            throw new Error("Zonas not found");
        }
    }

    async delete(id) {
        try {
            return await Zone.deleteOne({_id : id});
        } catch (e) { // Middleware
            throw new Error("Zonas not found")
        }
    }
}

// Export
module.exports = ZonaService;
