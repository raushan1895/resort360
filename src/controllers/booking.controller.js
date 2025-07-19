const Booking = require('../models/booking.model');
const Room = require('../models/room.model');
const logger = require('../utils/logger');

// Create a new booking
exports.createBooking = async (req, res) => {
  try {
    // Check room availability
    const room = await Room.findById(req.body.room);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Calculate total price
    const checkIn = new Date(req.body.checkIn);
    const checkOut = new Date(req.body.checkOut);
    const numberOfNights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
    const totalPrice = numberOfNights * room.pricePerNight;

    // Create booking with calculated total price
    const booking = await Booking.create({
      ...req.body,
      guest: req.user._id, // Assuming user is authenticated
      totalPrice
    });

    logger.info(`New booking created with ID: ${booking._id}`);
    res.status(201).json({
      status: 'success',
      data: booking
    });
  } catch (error) {
    logger.error(`Error creating booking: ${error.message}`);
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// Get all bookings (with filters)
exports.getAllBookings = async (req, res) => {
  try {
    let query = Booking.find();

    // Filter by status
    if (req.query.status) {
      query = query.find({ status: req.query.status });
    }

    // Filter by date range
    if (req.query.startDate && req.query.endDate) {
      query = query.find({
        checkIn: { $gte: new Date(req.query.startDate) },
        checkOut: { $lte: new Date(req.query.endDate) }
      });
    }

    // Filter by guest
    if (req.query.guest) {
      query = query.find({ guest: req.query.guest });
    }

    // Filter by room
    if (req.query.room) {
      query = query.find({ room: req.query.room });
    }

    const bookings = await query;
    res.status(200).json({
      status: 'success',
      results: bookings.length,
      data: bookings
    });
  } catch (error) {
    logger.error(`Error fetching bookings: ${error.message}`);
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// Get single booking
exports.getBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({
        status: 'error',
        message: 'Booking not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: booking
    });
  } catch (error) {
    logger.error(`Error fetching booking: ${error.message}`);
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// Update booking
exports.updateBooking = async (req, res) => {
  try {
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    if (!booking) {
      return res.status(404).json({
        status: 'error',
        message: 'Booking not found'
      });
    }

    logger.info(`Booking updated with ID: ${booking._id}`);
    res.status(200).json({
      status: 'success',
      data: booking
    });
  } catch (error) {
    logger.error(`Error updating booking: ${error.message}`);
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// Delete booking
exports.deleteBooking = async (req, res) => {
  try {
    const booking = await Booking.findByIdAndDelete(req.params.id);
    
    if (!booking) {
      return res.status(404).json({
        status: 'error',
        message: 'Booking not found'
      });
    }

    logger.info(`Booking deleted with ID: ${booking._id}`);
    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    logger.error(`Error deleting booking: ${error.message}`);
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// Update booking status
exports.updateBookingStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { status },
      {
        new: true,
        runValidators: true
      }
    );

    if (!booking) {
      return res.status(404).json({
        status: 'error',
        message: 'Booking not found'
      });
    }

    logger.info(`Booking status updated to ${status} for ID: ${booking._id}`);
    res.status(200).json({
      status: 'success',
      data: booking
    });
  } catch (error) {
    logger.error(`Error updating booking status: ${error.message}`);
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// Cancel booking
exports.cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      {
        status: 'cancelled',
        cancellation: {
          date: new Date(),
          reason: req.body.reason,
          refundAmount: req.body.refundAmount
        }
      },
      {
        new: true,
        runValidators: true
      }
    );

    if (!booking) {
      return res.status(404).json({
        status: 'error',
        message: 'Booking not found'
      });
    }

    logger.info(`Booking cancelled with ID: ${booking._id}`);
    res.status(200).json({
      status: 'success',
      data: booking
    });
  } catch (error) {
    logger.error(`Error cancelling booking: ${error.message}`);
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// Update payment status and details
exports.updatePayment = async (req, res) => {
  try {
    const { paymentStatus, paymentDetails } = req.body;
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      {
        paymentStatus,
        paymentDetails: {
          ...paymentDetails,
          paidAt: new Date()
        }
      },
      {
        new: true,
        runValidators: true
      }
    );

    if (!booking) {
      return res.status(404).json({
        status: 'error',
        message: 'Booking not found'
      });
    }

    logger.info(`Payment updated for booking ID: ${booking._id}`);
    res.status(200).json({
      status: 'success',
      data: booking
    });
  } catch (error) {
    logger.error(`Error updating payment: ${error.message}`);
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// Add special requests
exports.addSpecialRequests = async (req, res) => {
  try {
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      {
        $push: { specialRequests: { $each: req.body.specialRequests } }
      },
      {
        new: true,
        runValidators: true
      }
    );

    if (!booking) {
      return res.status(404).json({
        status: 'error',
        message: 'Booking not found'
      });
    }

    logger.info(`Special requests added to booking ID: ${booking._id}`);
    res.status(200).json({
      status: 'success',
      data: booking
    });
  } catch (error) {
    logger.error(`Error adding special requests: ${error.message}`);
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// Add add-ons to booking
exports.addAddOns = async (req, res) => {
  try {
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      {
        $push: { addOns: { $each: req.body.addOns } },
        $inc: { totalPrice: req.body.addOns.reduce((acc, addon) => acc + (addon.price * addon.quantity), 0) }
      },
      {
        new: true,
        runValidators: true
      }
    );

    if (!booking) {
      return res.status(404).json({
        status: 'error',
        message: 'Booking not found'
      });
    }

    logger.info(`Add-ons added to booking ID: ${booking._id}`);
    res.status(200).json({
      status: 'success',
      data: booking
    });
  } catch (error) {
    logger.error(`Error adding add-ons: ${error.message}`);
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
}; 