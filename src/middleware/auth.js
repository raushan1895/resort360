const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const logger = require('../utils/logger');
const { USER_ROLES } = require('../utils/constants');

// Protect routes - Authentication middleware
exports.protect = async (req, res, next) => {
  try {
    // 1) Check if token exists
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        status: 'error',
        message: 'You are not logged in. Please log in to get access.'
      });
    }

    // 2) Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3) Check if user still exists
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'The user belonging to this token no longer exists.'
      });
    }

    // 4) Check if user changed password after token was issued
    if (user.passwordChangedAfter(decoded.iat)) {
      return res.status(401).json({
        status: 'error',
        message: 'User recently changed password! Please log in again.'
      });
    }

    // Grant access to protected route
    req.user = user;
    next();
  } catch (error) {
    logger.error(`Authentication error: ${error.message}`);
    return res.status(401).json({
      status: 'error',
      message: 'Invalid token or authentication failed'
    });
  }
};

// Restrict to certain roles - Authorization middleware
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: 'You do not have permission to perform this action'
      });
    }
    next();
  };
};

// Optional: Check if user owns the resource
exports.checkOwnership = (Model) => async (req, res, next) => {
  try {
    const doc = await Model.findById(req.params.id);
    
    if (!doc) {
      return res.status(404).json({
        status: 'error',
        message: 'Document not found'
      });
    }

    // Check if the logged-in user is the owner of the document
    if (doc.guest.toString() !== req.user.id && req.user.role !== USER_ROLES.ADMIN) {
      return res.status(403).json({
        status: 'error',
        message: 'You do not have permission to perform this action on this booking'
      });
    }

    next();
  } catch (error) {
    logger.error(`Ownership check error: ${error.message}`);
    return res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
}; 