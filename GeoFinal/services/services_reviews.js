
const Review = require('../models/Review')
class ReviewService {
    
    async getAll() {
        try {
            const data = await Review.find({}).lean();
            return data;
        } catch (e) { // Middleware
            throw new Error("Reviews not found");
        }
    }

    async getByID(id) {
        try {
            const data = await Review.findById({_id : id});
            return data;
        } catch (e) { // Middleware
            throw new Error("Review not found");
        }
    }

    async create(data) {
        try {
            const newReview = new Review({ ...data});
            await newReview.save({new: true, lean: true})
            return newReview;
        } catch (e) { // Middleware
            throw new Error("Reviews creation failed" + e.message);
        }
    }

    async update(id,changes) {
        try {
            return await Review.findByIdAndUpdate(id, { $set: changes}, { new: true, lean: true });
        } catch (e) { // Middleware
            throw new Error("Reviews not found");
        }
    }

    async delete(id) {
        try {
            return await Review.deleteOne({_id : id});
        } catch (e) { // Middleware
            throw new Error("Reviews not found")
        }
    }
}

// Export
module.exports = ReviewService;
