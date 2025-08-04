const mongoose = require('mongoose');
const { EVENT_LOCATION, EVENT_TYPE, EVENT_STATUS, EVENT_PAYMENT_STATUS, EVENT_PARTICIPANT_STATUS } = require('../utils/constants');

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
    enum: Object.values(EVENT_TYPE)
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
      enum: Object.values(EVENT_LOCATION),
      default: EVENT_LOCATION.BANQUET_HALL
    },
    location_id: {
      type: mongoose.Schema.ObjectId,
      required: [true, 'Event location is required']
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
      enum: Object.values(EVENT_PARTICIPANT_STATUS),
      default: EVENT_PARTICIPANT_STATUS.REGISTERED
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
    enum: Object.values(EVENT_STATUS),
    default: EVENT_STATUS.PENDING
  },
  paymentStatus: {
    type: String,
    enum: Object.values(EVENT_PAYMENT_STATUS),
    default: EVENT_PAYMENT_STATUS.PENDING
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