
// Model
const User = require('../models/User')
class UserService {
    
    async getAll() {
        try {
            const data = await User.find({}).lean();
            return data;
        } catch (e) { // Middleware
            throw new Error("Usuarios not found");
        }
    }

    async getByID(id) {
        try {
            const data = await User.findById({_id : id});
            return data;
        } catch (e) { // Middleware
            throw new Error("Usuario not found");
        }
    }

    async create(data) {
        try {
            const newUser = new User({ ...data});
            await newUser.save() // Necesita estar vacio idk.
            return newUser;
        } catch (e) { // Middleware
            throw new Error("Usuarios creation failed" + e.message);
        }
    }

    async login(username,password) {
        try {
            const user = await User.findOne({ username });
            if (!user) throw new Error("Usuario no encontrado");
            
            const isMatch = await user.comparePassword(password);
            if (!isMatch) throw new Error("Contraseña incorrecta");
            return user;
        } catch (e) { // Middleware
            throw new Error("Login failed" + e.message);
        }
    }

    async update(id,changes) {
        try {
            return await User.findByIdAndUpdate(id, { $set: changes}, { new: true, lean: true });
        } catch (e) { // Middleware
            throw new Error("Usuarios not found");
        }
    }

    async delete(id) {
        try {
            return await User.deleteOne({_id : id});
        } catch (e) { // Middleware
            throw new Error("Usuarios not found")
        }
    }
}

// Export
module.exports = UserService;
