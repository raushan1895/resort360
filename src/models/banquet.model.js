const mongoose = require('mongoose');

const banquetSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Banquet name is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Banquet description is required']
  },
  seatingCapacity: {
    type: Number,
    required: [true, 'Seating capacity is required']
  },
  images: [{
    url: String,
    caption: String
  }]
}, {
  timestamps: true
});

const Banquet = mongoose.model('Banquet', banquetSchema);

module.exports = Banquet;