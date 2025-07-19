const Room = require('../models/room.model');
const Booking = require('../models/booking.model');
const { AppError } = require('../middleware/errorHandler');
const { logger } = require('../utils/logger');

// Get all rooms with filtering, sorting, and pagination
exports.getAllRooms = async (req, res, next) => {
  try {
    // Build query
    const queryObj = { ...req.query };
    const excludeFields = ['page', 'sort', 'limit', 'fields', 'checkIn', 'checkOut'];
    excludeFields.forEach(field => delete queryObj[field]);

    // Advanced filtering
    let query = Room.find(queryObj);

    // Check availability if dates are provided
    if (req.query.checkIn && req.query.checkOut) {
      const checkIn = new Date(req.query.checkIn);
      const checkOut = new Date(req.query.checkOut);

      // Validate dates
      if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
        return next(new AppError('Invalid date format. Please use YYYY-MM-DD format', 400));
      }

      if (checkIn >= checkOut) {
        return next(new AppError('Check-in date must be before check-out date', 400));
      }

      // Find rooms that have overlapping bookings
      const unavailableRoomIds = await Booking.distinct('room', {
        $and: [
          { status: { $nin: ['cancelled'] } },
          {
            $or: [
              {
                checkIn: { $lte: checkOut },
                checkOut: { $gte: checkIn }
              }
            ]
          }
        ]
      });

      // Exclude unavailable rooms from the query
      query = query.where('_id').nin(unavailableRoomIds);
    }

    // Sorting
    if (req.query.sort) {
      const sortBy = req.query.sort.split(',').join(' ');
      query = query.sort(sortBy);
    } else {
      query = query.sort('-createdAt');
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;
    query = query.skip(skip).limit(limit);

    // Execute query
    const rooms = await query;
    const total = await Room.countDocuments(queryObj);

    res.status(200).json({
      status: 'success',
      results: rooms.length,
      total,
      data: rooms,
      filters: {
        checkIn: req.query.checkIn,
        checkOut: req.query.checkOut,
        ...queryObj
      }
    });
  } catch (error) {
    logger.error('Error in getAllRooms:', error);
    next(new AppError('Error fetching rooms', 500));
  }
};

// Get single room by ID
exports.getRoomById = async (req, res, next) => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room) {
      return next(new AppError('Room not found', 404));
    }

    res.status(200).json({
      status: 'success',
      data: room
    });
  } catch (error) {
    logger.error('Error in getRoomById:', error);
    next(new AppError('Error fetching room', 500));
  }
};

// Create new room
exports.createRoom = async (req, res, next) => {
  console.log(req.body);
  try {
    const newRoom = await Room.create(req.body);

    logger.info(`New room created with ID: ${newRoom._id}`);

    res.status(201).json({
      status: 'success',
      data: newRoom
    });
  } catch (error) {
    logger.error('Error in createRoom:', error);
    next(new AppError('Error creating room', 500));
  }
};

// Update room
exports.updateRoom = async (req, res, next) => {
  try {
    const room = await Room.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    if (!room) {
      return next(new AppError('Room not found', 404));
    }

    logger.info(`Room updated: ${room._id}`);

    res.status(200).json({
      status: 'success',
      data: room
    });
  } catch (error) {
    logger.error('Error in updateRoom:', error);
    next(new AppError('Error updating room', 500));
  }
};

// Delete room
exports.deleteRoom = async (req, res, next) => {
  try {
    const room = await Room.findByIdAndDelete(req.params.id);

    if (!room) {
      return next(new AppError('Room not found', 404));
    }

    logger.info(`Room deleted: ${room._id}`);

    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    logger.error('Error in deleteRoom:', error);
    next(new AppError('Error deleting room', 500));
  }
};

// Get room availability
exports.checkRoomAvailability = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return next(new AppError('Please provide start and end dates', 400));
    }

    const room = await Room.findById(req.params.id);

    if (!room) {
      return next(new AppError('Room not found', 404));
    }

    // Check if room is available for the given dates
    const bookings = await room.populate({
      path: 'bookings',
      match: {
        $or: [
          {
            checkIn: { $lte: new Date(endDate) },
            checkOut: { $gte: new Date(startDate) }
          }
        ]
      }
    });

    const isAvailable = bookings.bookings.length === 0;

    res.status(200).json({
      status: 'success',
      data: {
        isAvailable,
        existingBookings: bookings.bookings
      }
    });
  } catch (error) {
    logger.error('Error in checkRoomAvailability:', error);
    next(new AppError('Error checking room availability', 500));
  }
};

// Get room statistics and analytics
exports.getRoomStatistics = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return next(new AppError('Please provide start and end dates for statistics', 400));
    }

    // Convert dates
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return next(new AppError('Invalid date format. Please use YYYY-MM-DD format', 400));
    }

    // Get all bookings for the period
    const bookings = await Booking.find({
      checkIn: { $gte: start },
      checkOut: { $lte: end },
      status: { $ne: 'cancelled' }
    }).populate('room');

    // Calculate statistics
    const stats = {
      totalBookings: bookings.length,
      totalRevenue: 0,
      roomStats: {},
      occupancyRate: 0
    };

    // Calculate days between dates
    const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

    // Get total rooms
    const totalRooms = await Room.countDocuments();
    const totalAvailableRoomDays = totalRooms * totalDays;

    let totalOccupiedDays = 0;

    bookings.forEach(booking => {
      const roomId = booking.room._id.toString();
      const roomType = booking.room.type;
      const bookingDays = Math.ceil((booking.checkOut - booking.checkIn) / (1000 * 60 * 60 * 24));
      const revenue = booking.totalAmount;

      totalOccupiedDays += bookingDays;
      stats.totalRevenue += revenue;

      // Initialize room type stats if not exists
      if (!stats.roomStats[roomType]) {
        stats.roomStats[roomType] = {
          totalBookings: 0,
          revenue: 0,
          occupiedDays: 0
        };
      }

      // Update room type stats
      stats.roomStats[roomType].totalBookings++;
      stats.roomStats[roomType].revenue += revenue;
      stats.roomStats[roomType].occupiedDays += bookingDays;
    });

    // Calculate overall occupancy rate
    stats.occupancyRate = (totalOccupiedDays / totalAvailableRoomDays) * 100;

    // Calculate occupancy rate per room type
    for (const roomType in stats.roomStats) {
      const roomsOfType = await Room.countDocuments({ type: roomType });
      const availableRoomDays = roomsOfType * totalDays;
      stats.roomStats[roomType].occupancyRate = 
        (stats.roomStats[roomType].occupiedDays / availableRoomDays) * 100;
    }

    res.status(200).json({
      status: 'success',
      data: {
        timeframe: {
          start: startDate,
          end: endDate,
          totalDays
        },
        ...stats
      }
    });
  } catch (error) {
    logger.error('Error in getRoomStatistics:', error);
    next(new AppError('Error getting room statistics', 500));
  }
}; 

// Bulk update rooms
exports.bulkUpdateRooms = async (req, res, next) => {
  try {
    const { updates } = req.body;

    if (!Array.isArray(updates)) {
      return next(new AppError('Updates must be provided as an array', 400));
    }

    const results = {
      success: [],
      failed: []
    };

    // Process updates in parallel
    await Promise.all(updates.map(async (update) => {
      try {
        const { roomId, ...updateData } = update;
        
        if (!roomId) {
          throw new Error('Room ID is required');
        }

        const room = await Room.findByIdAndUpdate(
          roomId,
          updateData,
          {
            new: true,
            runValidators: true
          }
        );

        if (!room) {
          throw new Error(`Room not found: ${roomId}`);
        }

        results.success.push({
          roomId,
          room
        });

        logger.info(`Room updated in bulk operation: ${roomId}`);
      } catch (error) {
        results.failed.push({
          roomId: update.roomId,
          error: error.message
        });
        logger.error(`Error updating room ${update.roomId} in bulk operation:`, error);
      }
    }));

    res.status(200).json({
      status: 'success',
      data: results
    });
  } catch (error) {
    logger.error('Error in bulkUpdateRooms:', error);
    next(new AppError('Error performing bulk room updates', 500));
  }
}; 

// Get room ratings
exports.getRoomRatings = async (req, res, next) => {
  try {
    const room = await Room.findById(req.params.id)
      .populate({
        path: 'ratings.guest',
        select: 'firstName lastName email'
      });
    
    if (!room) {
      return next(new AppError('Room not found', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        ratings: room.ratings,
        averageRating: room.averageRating,
        totalRatings: room.ratings.length
      }
    });
  } catch (error) {
    logger.error('Error in getRoomRatings:', error);
    next(new AppError('Error fetching room ratings', 500));
  }
};

// Add room rating
exports.addRoomRating = async (req, res, next) => {
  try {
    const { score, review } = req.body;
    
    if (!score || score < 1 || score > 5) {
      return next(new AppError('Please provide a valid rating score between 1 and 5', 400));
    }

    const room = await Room.findById(req.params.id);
    
    if (!room) {
      return next(new AppError('Room not found', 404));
    }

    // Check if user has already rated
    const existingRating = room.ratings.find(
      rating => rating.guest.toString() === req.user._id.toString()
    );

    if (existingRating) {
      return next(new AppError('You have already rated this room', 400));
    }

    room.ratings.push({
      score,
      review,
      guest: req.user._id,
      date: new Date()
    });

    await room.save();

    res.status(201).json({
      status: 'success',
      data: {
        rating: room.ratings[room.ratings.length - 1],
        averageRating: room.averageRating
      }
    });
  } catch (error) {
    logger.error('Error in addRoomRating:', error);
    next(new AppError('Error adding room rating', 500));
  }
};

// Get room occupancy statistics
exports.getRoomOccupancyStats = async (req, res, next) => {
  try {
    const { startDate, endDate, roomType } = req.query;
    
    let query = {};
    
    if (roomType) {
      query.type = roomType;
    }

    const rooms = await Room.find(query);
    
    // Update stats for all rooms
    await Promise.all(rooms.map(room => room.updateOccupancyStats()));

    const occupancyStats = rooms.map(room => ({
      roomId: room._id,
      roomNumber: room.roomNumber,
      type: room.type,
      stats: room.occupancyStats
    }));

    res.status(200).json({
      status: 'success',
      data: occupancyStats
    });
  } catch (error) {
    logger.error('Error in getRoomOccupancyStats:', error);
    next(new AppError('Error fetching occupancy statistics', 500));
  }
};

// Get room revenue statistics
exports.getRoomRevenueStats = async (req, res, next) => {
  try {
    const { startDate, endDate, roomType } = req.query;
    
    let query = {};
    
    if (roomType) {
      query.type = roomType;
    }

    const rooms = await Room.find(query);
    
    const revenueStats = {
      totalRevenue: 0,
      revenueByType: {},
      revenueByRoom: []
    };

    rooms.forEach(room => {
      // Add to total revenue
      revenueStats.totalRevenue += room.occupancyStats.revenueGenerated;

      // Add to revenue by type
      if (!revenueStats.revenueByType[room.type]) {
        revenueStats.revenueByType[room.type] = 0;
      }
      revenueStats.revenueByType[room.type] += room.occupancyStats.revenueGenerated;

      // Add individual room stats
      revenueStats.revenueByRoom.push({
        roomId: room._id,
        roomNumber: room.roomNumber,
        type: room.type,
        revenue: room.occupancyStats.revenueGenerated,
        occupancyRate: room.occupancyStats.averageOccupancyRate
      });
    });

    res.status(200).json({
      status: 'success',
      data: revenueStats
    });
  } catch (error) {
    logger.error('Error in getRoomRevenueStats:', error);
    next(new AppError('Error fetching revenue statistics', 500));
  }
};

// Get scheduled maintenance
exports.getScheduledMaintenance = async (req, res, next) => {
  try {
    const { status, startDate, endDate } = req.query;
    
    let query = {
      'maintenanceHistory.status': status || 'scheduled'
    };

    if (startDate && endDate) {
      query['maintenanceHistory.startDate'] = { $gte: new Date(startDate) };
      query['maintenanceHistory.endDate'] = { $lte: new Date(endDate) };
    }

    const rooms = await Room.find(query);
    
    const scheduledMaintenance = rooms.map(room => ({
      roomId: room._id,
      roomNumber: room.roomNumber,
      maintenance: room.maintenanceHistory.filter(m => 
        m.status === (status || 'scheduled') &&
        (!startDate || m.startDate >= new Date(startDate)) &&
        (!endDate || m.endDate <= new Date(endDate))
      )
    })).filter(room => room.maintenance.length > 0);

    res.status(200).json({
      status: 'success',
      data: scheduledMaintenance
    });
  } catch (error) {
    logger.error('Error in getScheduledMaintenance:', error);
    next(new AppError('Error fetching scheduled maintenance', 500));
  }
};

// Manage room maintenance
exports.manageRoomMaintenance = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const { 
      maintenanceType,
      startDate,
      endDate,
      description,
      status = 'scheduled', // scheduled, in-progress, completed, cancelled
      cost,
      performedBy,
      notes
    } = req.body;

    if (!maintenanceType || !startDate || !endDate) {
      return next(new AppError('Please provide maintenance type, start date, and end date', 400));
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return next(new AppError('Invalid date format. Please use YYYY-MM-DD format', 400));
    }

    if (start >= end) {
      return next(new AppError('Start date must be before end date', 400));
    }

    // Check if room exists
    const room = await Room.findById(roomId);
    if (!room) {
      return next(new AppError('Room not found', 404));
    }

    // Check for conflicting bookings
    const conflictingBookings = await Booking.find({
      room: roomId,
      status: { $nin: ['cancelled'] },
      $or: [
        {
          checkIn: { $lte: end },
          checkOut: { $gte: start }
        }
      ]
    });

    if (conflictingBookings.length > 0) {
      return next(new AppError('Room has bookings during the maintenance period', 400));
    }

    // Update room status and add maintenance record
    const maintenance = {
      type: maintenanceType,
      startDate: start,
      endDate: end,
      description,
      status,
      cost,
      performedBy,
      notes,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Add maintenance record to room
    if (!room.maintenanceHistory) {
      room.maintenanceHistory = [];
    }
    room.maintenanceHistory.push(maintenance);

    // Update room status if maintenance is starting now
    if (status === 'in-progress') {
      room.status = 'maintenance';
    }

    await room.save();

    res.status(200).json({
      status: 'success',
      data: {
        room,
        maintenance
      }
    });
  } catch (error) {
    logger.error('Error in manageRoomMaintenance:', error);
    next(new AppError('Error managing room maintenance', 500));
  }
}; 

// Update maintenance record
exports.updateMaintenance = async (req, res, next) => {
  try {
    const { roomId, maintenanceId } = req.params;
    const updateData = req.body;

    const room = await Room.findById(roomId);
    
    if (!room) {
      return next(new AppError('Room not found', 404));
    }

    const maintenanceRecord = room.maintenanceHistory.id(maintenanceId);
    
    if (!maintenanceRecord) {
      return next(new AppError('Maintenance record not found', 404));
    }

    // Update allowed fields
    Object.keys(updateData).forEach(key => {
      if (key !== '_id' && key !== 'createdAt') {
        maintenanceRecord[key] = updateData[key];
      }
    });

    maintenanceRecord.updatedAt = new Date();

    // Update room status if maintenance is completed
    if (updateData.status === 'completed') {
      room.lastMaintenanceDate = new Date();
      room.status = 'available';
    } else if (updateData.status === 'in-progress') {
      room.status = 'maintenance';
    }

    await room.save();

    res.status(200).json({
      status: 'success',
      data: maintenanceRecord
    });
  } catch (error) {
    logger.error('Error in updateMaintenance:', error);
    next(new AppError('Error updating maintenance record', 500));
  }
};

// Get maintenance history
exports.getMaintenanceHistory = async (req, res, next) => {
  try {
    const room = await Room.findById(req.params.roomId);
    
    if (!room) {
      return next(new AppError('Room not found', 404));
    }

    const { startDate, endDate, type, status } = req.query;
    
    let filteredHistory = room.maintenanceHistory;

    if (startDate) {
      filteredHistory = filteredHistory.filter(m => m.startDate >= new Date(startDate));
    }
    
    if (endDate) {
      filteredHistory = filteredHistory.filter(m => m.endDate <= new Date(endDate));
    }
    
    if (type) {
      filteredHistory = filteredHistory.filter(m => m.type === type);
    }
    
    if (status) {
      filteredHistory = filteredHistory.filter(m => m.status === status);
    }

    res.status(200).json({
      status: 'success',
      data: {
        roomId: room._id,
        roomNumber: room.roomNumber,
        lastMaintenanceDate: room.lastMaintenanceDate,
        nextScheduledMaintenance: room.nextScheduledMaintenance,
        maintenanceHistory: filteredHistory
      }
    });
  } catch (error) {
    logger.error('Error in getMaintenanceHistory:', error);
    next(new AppError('Error fetching maintenance history', 500));
  }
};

// Schedule bulk maintenance
exports.scheduleBulkMaintenance = async (req, res, next) => {
  try {
    const { rooms, maintenanceData } = req.body;

    if (!Array.isArray(rooms) || !maintenanceData) {
      return next(new AppError('Please provide an array of room IDs and maintenance data', 400));
    }

    const results = {
      success: [],
      failed: []
    };

    await Promise.all(rooms.map(async (roomId) => {
      try {
        const room = await Room.findById(roomId);
        
        if (!room) {
          throw new Error(`Room not found: ${roomId}`);
        }

        // Check for booking conflicts
        const hasConflicts = await Booking.exists({
          room: roomId,
          status: { $nin: ['cancelled'] },
          $or: [
            {
              checkIn: { $lte: maintenanceData.endDate },
              checkOut: { $gte: maintenanceData.startDate }
            }
          ]
        });

        if (hasConflicts) {
          throw new Error(`Room ${room.roomNumber} has booking conflicts`);
        }

        room.maintenanceHistory.push({
          ...maintenanceData,
          createdAt: new Date(),
          updatedAt: new Date()
        });

        if (maintenanceData.status === 'in-progress') {
          room.status = 'maintenance';
        }

        await room.save();

        results.success.push({
          roomId,
          roomNumber: room.roomNumber,
          maintenance: room.maintenanceHistory[room.maintenanceHistory.length - 1]
        });
      } catch (error) {
        results.failed.push({
          roomId,
          error: error.message
        });
      }
    }));

    res.status(200).json({
      status: 'success',
      data: results
    });
  } catch (error) {
    logger.error('Error in scheduleBulkMaintenance:', error);
    next(new AppError('Error scheduling bulk maintenance', 500));
  }
};

// Update bulk pricing
exports.updateBulkPricing = async (req, res, next) => {
  try {
    const { rooms, pricingData } = req.body;

    if (!Array.isArray(rooms) || !pricingData) {
      return next(new AppError('Please provide an array of room IDs and pricing data', 400));
    }

    const results = {
      success: [],
      failed: []
    };

    await Promise.all(rooms.map(async (roomId) => {
      try {
        const room = await Room.findById(roomId);
        
        if (!room) {
          throw new Error(`Room not found: ${roomId}`);
        }

        if (pricingData.basePrice) {
          room.basePrice = pricingData.basePrice;
        }

        if (pricingData.pricePerNight) {
          room.pricePerNight = pricingData.pricePerNight;
        }

        if (pricingData.seasonalPricing) {
          room.seasonalPricing.push(pricingData.seasonalPricing);
        }

        if (pricingData.discounts) {
          room.discounts.push(pricingData.discounts);
        }

        await room.save();

        results.success.push({
          roomId,
          roomNumber: room.roomNumber,
          currentPrice: room.currentPrice
        });
      } catch (error) {
        results.failed.push({
          roomId,
          error: error.message
        });
      }
    }));

    res.status(200).json({
      status: 'success',
      data: results
    });
  } catch (error) {
    logger.error('Error in updateBulkPricing:', error);
    next(new AppError('Error updating bulk pricing', 500));
  }
};

// Update bulk status
exports.updateBulkStatus = async (req, res, next) => {
  try {
    const { rooms, status } = req.body;

    if (!Array.isArray(rooms) || !status) {
      return next(new AppError('Please provide an array of room IDs and status', 400));
    }

    const results = {
      success: [],
      failed: []
    };

    await Promise.all(rooms.map(async (roomId) => {
      try {
        const room = await Room.findById(roomId);
        
        if (!room) {
          throw new Error(`Room not found: ${roomId}`);
        }

        room.status = status;
        await room.save();

        results.success.push({
          roomId,
          roomNumber: room.roomNumber,
          status: room.status
        });
      } catch (error) {
        results.failed.push({
          roomId,
          error: error.message
        });
      }
    }));

    res.status(200).json({
      status: 'success',
      data: results
    });
  } catch (error) {
    logger.error('Error in updateBulkStatus:', error);
    next(new AppError('Error updating bulk status', 500));
  }
}; 

// Get seasonal pricing
exports.getSeasonalPricing = async (req, res, next) => {
  try {
    const { startDate, endDate, roomType } = req.query;
    
    let query = {};
    if (roomType) {
      query.type = roomType;
    }

    if (startDate && endDate) {
      query['seasonalPricing'] = {
        $elemMatch: {
          startDate: { $gte: new Date(startDate) },
          endDate: { $lte: new Date(endDate) }
        }
      };
    }

    const rooms = await Room.find(query).select('roomNumber type seasonalPricing basePrice pricePerNight');

    const seasonalPricing = rooms.map(room => ({
      roomId: room._id,
      roomNumber: room.roomNumber,
      type: room.type,
      basePrice: room.basePrice,
      pricePerNight: room.pricePerNight,
      seasonalPricing: room.seasonalPricing.filter(pricing => 
        (!startDate || pricing.startDate >= new Date(startDate)) &&
        (!endDate || pricing.endDate <= new Date(endDate))
      )
    }));

    res.status(200).json({
      status: 'success',
      data: seasonalPricing
    });
  } catch (error) {
    logger.error('Error in getSeasonalPricing:', error);
    next(new AppError('Error fetching seasonal pricing', 500));
  }
};

// Add seasonal pricing
exports.addSeasonalPricing = async (req, res, next) => {
  try {
    const { roomIds, pricingData } = req.body;

    if (!Array.isArray(roomIds) || !pricingData) {
      return next(new AppError('Please provide room IDs and pricing data', 400));
    }

    // Validate dates
    const startDate = new Date(pricingData.startDate);
    const endDate = new Date(pricingData.endDate);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return next(new AppError('Invalid date format. Please use YYYY-MM-DD format', 400));
    }

    if (startDate >= endDate) {
      return next(new AppError('Start date must be before end date', 400));
    }

    const results = {
      success: [],
      failed: []
    };

    await Promise.all(roomIds.map(async (roomId) => {
      try {
        const room = await Room.findById(roomId);
        
        if (!room) {
          throw new Error(`Room not found: ${roomId}`);
        }

        // Check for overlapping seasonal pricing
        const hasOverlap = room.seasonalPricing.some(pricing => 
          (startDate <= pricing.endDate && endDate >= pricing.startDate)
        );

        if (hasOverlap) {
          throw new Error(`Room ${room.roomNumber} has overlapping seasonal pricing`);
        }

        room.seasonalPricing.push(pricingData);
        await room.save();

        results.success.push({
          roomId,
          roomNumber: room.roomNumber,
          seasonalPricing: pricingData
        });
      } catch (error) {
        results.failed.push({
          roomId,
          error: error.message
        });
      }
    }));

    res.status(201).json({
      status: 'success',
      data: results
    });
  } catch (error) {
    logger.error('Error in addSeasonalPricing:', error);
    next(new AppError('Error adding seasonal pricing', 500));
  }
};

// Update seasonal pricing
exports.updateSeasonalPricing = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const roomId = req.body.roomId;

    const room = await Room.findById(roomId);
    
    if (!room) {
      return next(new AppError('Room not found', 404));
    }

    const pricingIndex = room.seasonalPricing.findIndex(
      pricing => pricing._id.toString() === id
    );

    if (pricingIndex === -1) {
      return next(new AppError('Seasonal pricing not found', 404));
    }

    // If dates are being updated, check for overlaps
    if (updateData.startDate || updateData.endDate) {
      const startDate = new Date(updateData.startDate || room.seasonalPricing[pricingIndex].startDate);
      const endDate = new Date(updateData.endDate || room.seasonalPricing[pricingIndex].endDate);

      const hasOverlap = room.seasonalPricing.some((pricing, index) => 
        index !== pricingIndex && 
        (startDate <= pricing.endDate && endDate >= pricing.startDate)
      );

      if (hasOverlap) {
        return next(new AppError('Updated dates overlap with existing seasonal pricing', 400));
      }
    }

    // Update the pricing
    Object.assign(room.seasonalPricing[pricingIndex], updateData);
    await room.save();

    res.status(200).json({
      status: 'success',
      data: room.seasonalPricing[pricingIndex]
    });
  } catch (error) {
    logger.error('Error in updateSeasonalPricing:', error);
    next(new AppError('Error updating seasonal pricing', 500));
  }
};

// Delete seasonal pricing
exports.deleteSeasonalPricing = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { roomId } = req.body;

    const room = await Room.findById(roomId);
    
    if (!room) {
      return next(new AppError('Room not found', 404));
    }

    const pricingIndex = room.seasonalPricing.findIndex(
      pricing => pricing._id.toString() === id
    );

    if (pricingIndex === -1) {
      return next(new AppError('Seasonal pricing not found', 404));
    }

    room.seasonalPricing.splice(pricingIndex, 1);
    await room.save();

    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    logger.error('Error in deleteSeasonalPricing:', error);
    next(new AppError('Error deleting seasonal pricing', 500));
  }
};

// Get discounts
exports.getDiscounts = async (req, res, next) => {
  try {
    const { type, validFrom, validUntil, roomType } = req.query;
    
    let query = {};
    if (roomType) {
      query.type = roomType;
    }

    if (type) {
      query['discounts.type'] = type;
    }

    if (validFrom || validUntil) {
      query['discounts'] = {
        $elemMatch: {
          ...(validFrom && { validFrom: { $gte: new Date(validFrom) } }),
          ...(validUntil && { validUntil: { $lte: new Date(validUntil) } })
        }
      };
    }

    const rooms = await Room.find(query).select('roomNumber type discounts');

    const discounts = rooms.map(room => ({
      roomId: room._id,
      roomNumber: room.roomNumber,
      type: room.type,
      discounts: room.discounts.filter(discount => 
        (!type || discount.type === type) &&
        (!validFrom || discount.validFrom >= new Date(validFrom)) &&
        (!validUntil || discount.validUntil <= new Date(validUntil))
      )
    }));

    res.status(200).json({
      status: 'success',
      data: discounts
    });
  } catch (error) {
    logger.error('Error in getDiscounts:', error);
    next(new AppError('Error fetching discounts', 500));
  }
};

// Add discount
exports.addDiscount = async (req, res, next) => {
  try {
    const { roomIds, discountData } = req.body;

    if (!Array.isArray(roomIds) || !discountData) {
      return next(new AppError('Please provide room IDs and discount data', 400));
    }
    // Validate dates
    const validFrom = new Date(discountData.validFrom);
    const validUntil = new Date(discountData.validUntil);

    if (isNaN(validFrom.getTime()) || isNaN(validUntil.getTime())) {
      return next(new AppError('Invalid date format. Please use YYYY-MM-DD format', 400));
    }

    if (validFrom >= validUntil) {
      return next(new AppError('Valid from date must be before valid until date', 400));
    }

    const results = {
      success: [],
      failed: []
    };

    await Promise.all(roomIds.map(async (roomId) => {
      try {
        const room = await Room.findById(roomId);
        
        if (!room) {
          throw new Error(`Room not found: ${roomId}`);
        }

        // Check for overlapping discounts of the same type
        const hasOverlap = room.discounts.some(discount => 
          discount.type === discountData.type &&
          (validFrom <= discount.validUntil && validUntil >= discount.validFrom)
        );

        if (hasOverlap) {
          throw new Error(`Room ${room.roomNumber} has overlapping discount of type ${discountData.type}`);
        }

        room.discounts.push(discountData);
        await room.save();

        results.success.push({
          roomId,
          roomNumber: room.roomNumber,
          discount: discountData
        });
      } catch (error) {
        results.failed.push({
          roomId,
          error: error.message
        });
      }
    }));

    res.status(201).json({
      status: 'success',
      data: results
    });
  } catch (error) {
    logger.error('Error in addDiscount:', error);
    next(new AppError('Error adding discount', 500));
  }
};

// Update discount
exports.updateDiscount = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const roomId = req.body.roomId;

    const room = await Room.findById(roomId);
    
    if (!room) {
      return next(new AppError('Room not found', 404));
    }

    const discountIndex = room.discounts.findIndex(
      discount => discount._id && discount._id.toString() === id
    );

    if (discountIndex === -1) {
      return next(new AppError('Discount not found', 404));
    }

    // If dates or type are being updated, check for overlaps
    if (updateData.validFrom || updateData.validUntil || updateData.type) {
      const validFrom = new Date(updateData.validFrom || room.discounts[discountIndex].validFrom);
      const validUntil = new Date(updateData.validUntil || room.discounts[discountIndex].validUntil);
      const type = updateData.type || room.discounts[discountIndex].type;

      const hasOverlap = room.discounts.some((discount, index) => 
        index !== discountIndex && 
        discount.type === type &&
        (validFrom <= discount.validUntil && validUntil >= discount.validFrom)
      );

      if (hasOverlap) {
        return next(new AppError('Updated dates overlap with existing discount of the same type', 400));
      }
    }

    // Update the discount
    Object.assign(room.discounts[discountIndex], updateData);
    await room.save();

    res.status(200).json({
      status: 'success',
      data: room.discounts[discountIndex]
    });
  } catch (error) {
    logger.error('Error in updateDiscount:', error);
    next(new AppError('Error updating discount', 500));
  }
};

// Delete discount
exports.deleteDiscount = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { roomId } = req.body;

    const room = await Room.findById(roomId);
    
    if (!room) {
      return next(new AppError('Room not found', 404));
    }

    const discountIndex = room.discounts.findIndex(
      discount => discount._id && discount._id.toString() === id
    );

    if (discountIndex === -1) {
      return next(new AppError('Discount not found', 404));
    }

    room.discounts.splice(discountIndex, 1);
    await room.save();

    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    logger.error('Error in deleteDiscount:', error);
    next(new AppError('Error deleting discount', 500));
  }
}; 