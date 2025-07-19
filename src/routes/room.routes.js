const express = require('express');
const router = express.Router();
const {
  getRoomRatings,
  addRoomRating,
  getRoomOccupancyStats,
  getRoomRevenueStats,
  getScheduledMaintenance,
  manageRoomMaintenance,
  updateMaintenance,
  getMaintenanceHistory,
  getSeasonalPricing,
  addSeasonalPricing,
  updateSeasonalPricing,
  deleteSeasonalPricing,
  getDiscounts,
  addDiscount,
  updateDiscount,
  deleteDiscount,
  scheduleBulkMaintenance,
  updateBulkPricing,
  updateBulkStatus,
  getAllRooms,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom,
  checkRoomAvailability,
  getRoomStatistics,
  bulkUpdateRooms,
} = require('../controllers/room.controller');
const { protect, restrictTo } = require('../controllers/auth.controller');

// Public routes
router.get('/', getAllRooms);
router.get('/:id', getRoomById);
router.get('/:id/availability', checkRoomAvailability);

// Protected routes (require authentication)
router.use(protect);

// Guest accessible routes
router.get('/:id/ratings', getRoomRatings);
router.post('/:id/ratings', addRoomRating);

// Statistics routes (restricted to staff and above)
router.get('/statistics', restrictTo('staff', 'manager', 'admin'), getRoomStatistics);
router.get('/statistics/occupancy', restrictTo('staff', 'manager', 'admin'), getRoomOccupancyStats);
router.get('/statistics/revenue', restrictTo('manager', 'admin'), getRoomRevenueStats);

// Maintenance routes (restricted to staff and above)
router.get('/maintenance/scheduled', restrictTo('staff', 'manager', 'admin'), getScheduledMaintenance);
router.post('/:roomId/maintenance', restrictTo('staff', 'manager', 'admin'), manageRoomMaintenance);
router.patch('/:roomId/maintenance/:maintenanceId', restrictTo('staff', 'manager', 'admin'), updateMaintenance);
router.get('/:roomId/maintenance/history', restrictTo('staff', 'manager', 'admin'), getMaintenanceHistory);

// Pricing routes (restricted to manager and admin)
router.get('/pricing/seasonal', restrictTo('manager', 'admin'), getSeasonalPricing);
router.post('/pricing/seasonal', restrictTo('manager', 'admin'), addSeasonalPricing);
router.patch('/pricing/seasonal/:id', restrictTo('manager', 'admin'), updateSeasonalPricing);
router.delete('/pricing/seasonal/:id', restrictTo('manager', 'admin'), deleteSeasonalPricing);

router.get('/pricing/discounts', restrictTo('manager', 'admin'), getDiscounts);
router.post('/pricing/discounts', restrictTo('manager', 'admin'), addDiscount);
router.patch('/pricing/discounts/:id', restrictTo('manager', 'admin'), updateDiscount);
router.delete('/pricing/discounts/:id', restrictTo('manager', 'admin'), deleteDiscount);

// Admin only routes
router.use(restrictTo('admin'));
router.post('/create', createRoom);
router.patch('/update/:id', updateRoom);
router.delete('/delete/:id', deleteRoom);
router.post('/bulk-update', bulkUpdateRooms);

// Bulk operations
router.post('/bulk-maintenance', scheduleBulkMaintenance);
router.post('/bulk-pricing', updateBulkPricing);
router.post('/bulk-status', updateBulkStatus);

module.exports = router; 