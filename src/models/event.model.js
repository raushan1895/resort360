const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Event title is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Event description is required']
  },
  type: {
    type: String,
    required: [true, 'Event type is required'],
    enum: ['entertainment', 'sports', 'dining', 'workshop', 'cultural', 'kids', 'other']
  },
  startDate: {
    type: Date,
    required: [true, 'Event start date is required']
  },
  endDate: {
    type: Date,
    required: [true, 'Event end date is required']
  },
  location: {
    name: {
      type: String,
      required: [true, 'Event location name is required']
    },
    coordinates: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: [Number]
    }
  },
  capacity: {
    type: Number,
    required: [true, 'Event capacity is required'],
    min: 1
  },
  price: {
    type: Number,
    default: 0
  },
  isComplimentary: {
    type: Boolean,
    default: false
  },
  participants: [{
    guest: {
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    },
    registeredAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['registered', 'attended', 'cancelled'],
      default: 'registered'
    }
  }],
  organizer: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'Event must have an organizer']
  },
  images: [{
    url: String,
    caption: String
  }],
  requirements: [{
    type: String
  }],
  status: {
    type: String,
    enum: ['scheduled', 'in-progress', 'completed', 'cancelled'],
    default: 'scheduled'
  },
  tags: [{
    type: String
  }],
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurringPattern: {
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
    },
    endDate: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for faster queries
eventSchema.index({ startDate: 1 });
eventSchema.index({ type: 1 });
eventSchema.index({ status: 1 });

// Virtual for number of participants
eventSchema.virtual('numberOfParticipants').get(function() {
  return this.participants.length;
});

// Virtual for available spots
eventSchema.virtual('availableSpots').get(function() {
  return this.capacity - this.participants.length;
});

// Middleware to populate organizer details
eventSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'organizer',
    select: 'firstName lastName email'
  });
  next();
});

const Event = mongoose.model('Event', eventSchema);

module.exports = Event; 