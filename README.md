# Resort 360 - Resort Management System

A comprehensive resort management system built with Node.js, Express, and MongoDB. This system handles room bookings, event management, and other resort operations.

## Features

- User Management (Staff, Guests, Admins)
- Room Management
- Booking System
- Event Management
- Authentication & Authorization
- Email Notifications
- File Upload Support
- Logging System

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn package manager

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/resort_360.git
cd resort_360
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory and copy the contents from `.env.example`. Update the values according to your environment.

4. Start the development server:
```bash
npm run dev
```

## Project Structure

```
resort_360/
├── src/
│   ├── server.js           # Application entry point
│   ├── models/             # Database models
│   ├── routes/             # API routes
│   ├── controllers/        # Route controllers
│   ├── middleware/         # Custom middleware
│   ├── utils/             # Utility functions
│   └── config/            # Configuration files
├── logs/                  # Application logs
├── uploads/              # Uploaded files
├── tests/               # Test files
├── .env.example         # Example environment variables
├── .gitignore          # Git ignore file
├── package.json        # Project dependencies
└── README.md          # Project documentation
```

## API Endpoints

### Authentication
- POST /api/auth/register - Register a new user
- POST /api/auth/login - User login
- POST /api/auth/logout - User logout
- POST /api/auth/forgot-password - Password reset request
- POST /api/auth/reset-password - Reset password

### Users
- GET /api/users - Get all users (Admin only)
- GET /api/users/:id - Get user by ID
- PATCH /api/users/:id - Update user
- DELETE /api/users/:id - Delete user

### Rooms
- GET /api/rooms - Get all rooms
- POST /api/rooms - Create new room (Admin only)
- GET /api/rooms/:id - Get room by ID
- PATCH /api/rooms/:id - Update room (Admin only)
- DELETE /api/rooms/:id - Delete room (Admin only)

### Bookings
- GET /api/bookings - Get all bookings
- POST /api/bookings - Create new booking
- GET /api/bookings/:id - Get booking by ID
- PATCH /api/bookings/:id - Update booking
- DELETE /api/bookings/:id - Cancel booking

### Events
- GET /api/events - Get all events
- POST /api/events - Create new event
- GET /api/events/:id - Get event by ID
- PATCH /api/events/:id - Update event
- DELETE /api/events/:id - Delete event
- POST /api/events/:id/register - Register for event

## Environment Variables

```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/resort_360
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_specific_password
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 