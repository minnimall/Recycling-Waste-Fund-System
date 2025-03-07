const mongoose = require('mongoose');

const Schema = mongoose.Schema;
const newsSchema = new mongoose.Schema({
    newsTitle: {
        type: String,
        required: true
    },
    newsDescription: {
        type: String,
        required: true
    },
    newsFile: {
        type: String,
        required: true,
    }
}, { timestamps: true });

const myNews = mongoose.model('news', newsSchema);

module.exports = myNews;