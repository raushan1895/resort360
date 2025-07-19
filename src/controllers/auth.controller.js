const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const { AppError } = require('../middleware/errorHandler');
const { logger } = require('../utils/logger');

// Generate JWT Token
const signToken = (id) => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
};

// Create and send token response
const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);

  // Remove password from output
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token: `Bearer ${token}`,
    data: {
      user
    }
  });
};

// Register new user
exports.register = async (req, res, next) => {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      role,
      phoneNumber,
      address
    } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(new AppError('Email already registered', 400));
    }

    // Create new user
    const newUser = await User.create({
      firstName,
      lastName,
      email,
      password,
      role,
      phoneNumber,
      address
    });

    logger.info(`New user registered: ${newUser.email}`);

    createSendToken(newUser, 201, res);
  } catch (error) {
    logger.error('Error in register:', error);
    next(new AppError('Error registering user', 500));
  }
};

// Login user
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Check if email and password exist
    if (!email || !password) {
      return next(new AppError('Please provide email and password', 400));
    }

    // Check if user exists && password is correct
    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.comparePassword(password))) {
      return next(new AppError('Incorrect email or password', 401));
    }

    logger.info(`User logged in: ${user.email}`);

    createSendToken(user, 200, res);
  } catch (error) {
    logger.error('Error in login:', error);
    next(new AppError('Error logging in', 500));
  }
};

// Protect routes middleware
exports.protect = async (req, res, next) => {
  try {
    // Get token from header
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(new AppError('Please log in to access this resource', 401));
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if user still exists
    const user = await User.findById(decoded.id);
    if (!user) {
      return next(new AppError('User no longer exists', 401));
    }

    // Grant access to protected route
    req.user = user;
    next();
  } catch (error) {
    logger.error('Error in protect middleware:', error);
    next(new AppError('Authentication failed', 401));
  }
};

// Restrict to certain roles
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action', 403));
    }
    next();
  };
};

// Forgot password
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return next(new AppError('No user found with that email address', 404));
    }

    // Generate reset token
    // Note: This would typically involve sending an email with a reset link
    // For this example, we'll just return a success message
    logger.info(`Password reset requested for user: ${email}`);

    res.status(200).json({
      status: 'success',
      message: 'Password reset instructions sent to email'
    });
  } catch (error) {
    logger.error('Error in forgotPassword:', error);
    next(new AppError('Error processing password reset', 500));
  }
};

// Reset password
exports.resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;

    // In a real application, you would:
    // 1. Verify the reset token
    // 2. Find the user with the valid token
    // 3. Update the password
    // 4. Log the user in

    res.status(200).json({
      status: 'success',
      message: 'Password successfully reset'
    });
  } catch (error) {
    logger.error('Error in resetPassword:', error);
    next(new AppError('Error resetting password', 500));
  }
}; 