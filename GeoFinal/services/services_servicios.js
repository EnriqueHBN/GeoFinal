
const Service = require('../models/Service')
class servicioService {
    async getAll() {
        try {
            const data = await Service.find({}).lean();
            return data;
        } catch (e) { // Middleware
            throw new Error("Servicios not found");
        }
    }

    async getByID(id) {
        try {
            const data = await Service.findById({_id : id});
            return data;
        } catch (e) { // Middleware
            throw new Error("Servicio not found");
        }
    }

    async create(data) {
        try {
            const newServicio = new Service({ ...data});
            await newServicio.save({new: true, lean: true})
            return newServicio;
        } catch (e) { // Middleware
            throw new Error("Servicios creation failed" + e.message);
        }
    }

    async update(id,changes) {
        try {
            return await Service.findByIdAndUpdate(id, { $set: changes}, { new: true, lean: true });
        } catch (e) { // Middleware
            throw new Error("Servicio not found");
        }
    }

    async delete(id) {
        try {
            return await Service.deleteOne({_id : id});
        } catch (e) { // Middleware
            throw new Error("Servicio not found")
        }
    }
}

// Export
module.exports = servicioService;
