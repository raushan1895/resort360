const mongoose = require('mongoose');
const moment = require('moment');
const { BOOKING_STATUS, PAYMENT_STATUS } = require('../utils/constants');


const bookingSchema = new mongoose.Schema({
  guest: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'Booking must belong to a guest']
  },
  room: {
    type: mongoose.Schema.ObjectId,
    ref: 'Room',
    required: [true, 'Booking must be for a room']
  },
  checkIn: {
    type: Date,
    required: [true, 'Check-in date is required']
  },
  checkOut: {
    type: Date,
    required: [true, 'Check-out date is required']
  },
  numberOfGuests: {
    adults: {
      type: Number,
      required: [true, 'Number of adult guests is required'],
      min: 1
    },
    children: {
      type: Number,
      default: 0
    }
  },
  totalPrice: {
    type: Number,
    required: [true, 'Total price is required']
  },
  status: {
    type: String,
    enum: Object.values(BOOKING_STATUS),
    default: BOOKING_STATUS.PENDING
  },
  paymentStatus: {
    type: String,
    enum: Object.values(PAYMENT_STATUS),
    default: PAYMENT_STATUS.PENDING
  },
  paymentDetails: {
    method: String,
    transactionId: String,
    paidAmount: Number,
    paidAt: Date
  },
  specialRequests: [{
    type: String
  }],
  addOns: [{
    service: {
      type: String,
      required: true
    },
    price: {
      type: Number,
      required: true
    },
    quantity: {
      type: Number,
      default: 1
    }
  }],
  cancellation: {
    date: Date,
    reason: String,
    refundAmount: Number
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for faster queries
bookingSchema.index({ guest: 1, checkIn: 1 });
bookingSchema.index({ room: 1, checkIn: 1 });
bookingSchema.index({ status: 1 });

// Virtual property for number of nights
bookingSchema.virtual('numberOfNights').get(function() {
  return moment(this.checkOut).diff(moment(this.checkIn), 'days');
});

// Middleware to populate guest and room details
bookingSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'guest',
    select: 'firstName lastName email phoneNumber'
  }).populate({
    path: 'room',
    select: 'roomNumber type pricePerNight'
  });
  next();
});

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking; 