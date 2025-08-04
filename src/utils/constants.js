// User Roles
exports.USER_ROLES = {
  GUEST: 'guest',
  STAFF: 'staff',
  MANAGER: 'manager',
  ADMIN: 'admin'
};

// Array of all roles
exports.ALL_ROLES = Object.values(exports.USER_ROLES);

// Array of staff roles (staff and above)
exports.STAFF_ROLES = [
  exports.USER_ROLES.STAFF,
  exports.USER_ROLES.MANAGER,
  exports.USER_ROLES.ADMIN
];

// Array of management roles (manager and above)
exports.MANAGEMENT_ROLES = [
  exports.USER_ROLES.MANAGER,
  exports.USER_ROLES.ADMIN
];

// Booking Status
exports.BOOKING_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  CHECKED_IN: 'checked-in',
  CHECKED_OUT: 'checked-out',
  CANCELLED: 'cancelled'
};

// Payment Status
exports.PAYMENT_STATUS = {
  PENDING: 'pending',
  PARTIAL: 'partial',
  PAID: 'paid',
  REFUNDED: 'refunded'
}; 

// Event Location
exports.EVENT_LOCATION = {
  BANQUET_HALL: 'banquet hall',
  OPEN_SPACE: 'open space',
  RESTAURANT: 'restaurant',
  OTHER: 'other'
};

// Event Type
exports.EVENT_TYPE = {
  ENTERTAINMENT: 'entertainment',
  SPORTS: 'sports',
  DINING: 'dining',
  WORKSHOP: 'workshop',
  CULTURAL: 'cultural',
  KIDS: 'kids',
  OTHER: 'other'
};

// Event Status
exports.EVENT_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
  POSTPONED: 'postponed',
  ONGOING: 'ongoing'
};

// Event Payment Status
exports.EVENT_PAYMENT_STATUS = {
  PENDING: 'pending',
  PARTIAL: 'partial',
  PAID: 'paid',
  REFUNDED: 'refunded'
};

// Event Participant Status
exports.EVENT_PARTICIPANT_STATUS = {
  REGISTERED: 'registered',
  ATTENDED: 'attended',
  CANCELLED: 'cancelled'
};