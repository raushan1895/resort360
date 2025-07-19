const mongoose = require('mongoose');

const maintenanceRecordSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['deep-cleaning', 'repair', 'renovation', 'inspection', 'other']
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  description: String,
  status: {
    type: String,
    enum: ['scheduled', 'in-progress', 'completed', 'cancelled'],
    default: 'scheduled'
  },
  cost: {
    type: Number,
    default: 0
  },
  performedBy: String,
  notes: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

const roomSchema = new mongoose.Schema({
  roomNumber: {
    type: String,
    required: [true, 'Room number is required'],
    unique: true,
    trim: true
  },
  type: {
    type: String,
    required: [true, 'Room type is required'],
    enum: ['standard', 'deluxe', 'suite', 'presidential'],
    default: 'standard'
  },
  capacity: {
    adults: {
      type: Number,
      required: [true, 'Adult capacity is required'],
      min: 1
    },
    children: {
      type: Number,
      default: 0
    }
  },
  pricePerNight: {
    type: Number,
    required: [true, 'Price per night is required'],
    min: 0
  },
  basePrice: {
    type: Number,
    required: [true, 'Base price is required'],
    min: 0
  },
  seasonalPricing: [{
    startDate: Date,
    endDate: Date,
    price: Number,
    description: String
  }],
  discounts: [{
    type: {
      type: String,
      enum: ['early-bird', 'last-minute', 'long-stay', 'special']
    },
    percentage: Number,
    validFrom: Date,
    validUntil: Date,
    minimumStay: Number,
    description: String
  }],
  amenities: [{
    type: String,
    enum: [
      'wifi',
      'tv',
      'ac',
      'minibar',
      'safe',
      'balcony',
      'bathtub',
      'shower',
      'complimentary breakfast',
      'complimentary drinks'
    ]
  }],
  description: {
    type: String,
    required: [true, 'Room description is required']
  },
  images: [{
    url: String,
    caption: String,
    isPrimary: Boolean
  }],
  status: {
    type: String,
    enum: ['available', 'occupied', 'maintenance', 'reserved', 'out-of-order'],
    default: 'available'
  },
  floor: {
    type: Number,
    required: true
  },
  specialFeatures: [{
    type: String
  }],
  maintenanceHistory: [maintenanceRecordSchema],
  lastMaintenanceDate: Date,
  nextScheduledMaintenance: Date,
  occupancyStats: {
    lastUpdated: Date,
    totalDaysOccupied: {
      type: Number,
      default: 0
    },
    totalBookings: {
      type: Number,
      default: 0
    },
    averageOccupancyRate: {
      type: Number,
      default: 0
    },
    revenueGenerated: {
      type: Number,
      default: 0
    }
  },
  ratings: [{
    score: {
      type: Number,
      min: 1,
      max: 5
    },
    review: String,
    guest: {
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    },
    date: {
      type: Date,
      default: Date.now
    }
  }],
  averageRating: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
roomSchema.index({ type: 1 });
roomSchema.index({ status: 1 });
roomSchema.index({ 'seasonalPricing.startDate': 1, 'seasonalPricing.endDate': 1 });
roomSchema.index({ pricePerNight: 1 });
roomSchema.index({ floor: 1 });
roomSchema.index({ isActive: 1 });

// Virtual populate with bookings
roomSchema.virtual('bookings', {
  ref: 'Booking',
  foreignField: 'room',
  localField: '_id'
});

// Virtual for current price (considering seasonal pricing and discounts)
roomSchema.virtual('currentPrice').get(function() {
  const now = new Date();
  
  // Check seasonal pricing
  const currentSeasonalPrice = this.seasonalPricing.find(
    pricing => now >= pricing.startDate && now <= pricing.endDate
  );
  
  // Get base price (either seasonal or regular)
  let currentPrice = currentSeasonalPrice ? currentSeasonalPrice.price : this.pricePerNight;
  
  // Apply active discounts
  const activeDiscount = this.discounts.find(
    discount => now >= discount.validFrom && now <= discount.validUntil
  );
  
  if (activeDiscount) {
    currentPrice = currentPrice * (1 - activeDiscount.percentage / 100);
  }
  
  return currentPrice;
});

// Method to update occupancy statistics
roomSchema.methods.updateOccupancyStats = async function() {
  const now = new Date();
  const oneYearAgo = new Date(now.setFullYear(now.getFullYear() - 1));
  
  const bookings = await mongoose.model('Booking').find({
    room: this._id,
    checkOut: { $gte: oneYearAgo },
    status: { $nin: ['cancelled'] }
  });
  
  let totalDaysOccupied = 0;
  let revenueGenerated = 0;
  
  bookings.forEach(booking => {
    const days = Math.ceil((booking.checkOut - booking.checkIn) / (1000 * 60 * 60 * 24));
    totalDaysOccupied += days;
    revenueGenerated += booking.totalPrice;
  });
  
  const averageOccupancyRate = (totalDaysOccupied / 365) * 100;
  
  this.occupancyStats = {
    lastUpdated: now,
    totalDaysOccupied,
    totalBookings: bookings.length,
    averageOccupancyRate,
    revenueGenerated
  };
  
  await this.save();
};

// Update average rating when a new rating is added
roomSchema.methods.updateAverageRating = function() {
  if (this.ratings && this.ratings.length > 0) {
    const totalScore = this.ratings.reduce((sum, rating) => sum + rating.score, 0);
    this.averageRating = totalScore / this.ratings.length;
  } else {
    this.averageRating = 0;
  }
};

// Pre-save middleware to update average rating
roomSchema.pre('save', function(next) {
  if (this.isModified('ratings')) {
    this.updateAverageRating();
  }
  next();
});

const Room = mongoose.model('Room', roomSchema);

module.exports = Room; 