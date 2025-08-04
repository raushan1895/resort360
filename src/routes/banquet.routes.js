const express = require('express');
const router = express.Router();

const {
    getBanquets,
    createBanquet,
    getBanquet,
    updateBanquet,
    deleteBanquet
} = require('../controllers/banquet.controller');

// Middleware to protect routes
const { protect, restrictTo } = require('../middleware/auth');
const { USER_ROLES } = require('../utils/constants');
            
// Basic CRUD routes
router
  .route('/')
  .get(protect, getBanquets)
  .post(protect, restrictTo(USER_ROLES.ADMIN), createBanquet);

router
  .route('/:id')
  .get(protect, getBanquet)
  .patch(protect, restrictTo(USER_ROLES.ADMIN), updateBanquet)
  .delete(protect, restrictTo(USER_ROLES.ADMIN), deleteBanquet);

module.exports = router;
