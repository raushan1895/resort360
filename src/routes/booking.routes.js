const express = require('express');
const router = express.Router();
const {
  createBooking,
  getAllBookings,
  getBooking,
  updateBooking,
  deleteBooking,
  updateBookingStatus,
  cancelBooking,
  updatePayment,
  addSpecialRequests,
  addAddOns
} = require('../controllers/booking.controller');

// Middleware to protect routes
const { protect, restrictTo, checkOwnership } = require('../middleware/auth');
const { USER_ROLES, STAFF_ROLES } = require('../utils/constants');
const Booking = require('../models/booking.model');

// Basic CRUD routes
router
  .route('/')
  .get(protect, getAllBookings)
  .post(protect, createBooking);

router
  .route('/:id')
  .get(protect, checkOwnership(Booking), getBooking)
  .patch(protect, checkOwnership(Booking), updateBooking)
  .delete(protect, restrictTo(USER_ROLES.ADMIN), deleteBooking);

// Additional booking management routes
router.patch(
  '/:id/status',
  protect,
  restrictTo(...STAFF_ROLES),
  updateBookingStatus
);
router.patch('/:id/cancel', protect, checkOwnership(Booking), cancelBooking);
router.patch(
  '/:id/payment',
  protect,
  restrictTo(...STAFF_ROLES),
  updatePayment
);
router.patch('/:id/special-requests', protect, checkOwnership(Booking), addSpecialRequests);
router.patch('/:id/add-ons', protect, checkOwnership(Booking), addAddOns);

module.exports = router; 