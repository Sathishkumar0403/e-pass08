# Online Bus Pass Management System

A modern web application for managing student bus pass applications with admin approval workflow.

## Features

- **Student Portal**: Apply for bus pass with document uploads
- **Admin Dashboard**: Review and approve/reject applications
- **File Management**: Support for photo, Aadhar, and college ID uploads
- **QR Code Generation**: Automatic QR code generation for approved passes
- **Responsive Design**: Modern UI with Tailwind CSS
- **export Students**: databse into excel or filter and search data 

## Tech Stack

### Frontend
- React 19.1.0
- React Router DOM 7.7.1
- Tailwind CSS 4.1.11
- React Icons 5.5.0
- Framer Motion 12.23.11

### Backend
- Node.js with Express 5.1.0
- SQLite3 database
- Multer for file uploads
- CORS enabled

## Prerequisites

- Node.js 18+ 
- npm or yarn package manager

## Installation

### 1. Clone the repository
```bash
git clone <repository-url>
cd online-bus-pass
```

### 2. Install frontend dependencies
```bash
npm install
```

### 3. Install backend dependencies
```bash
cd backend
npm install
cd ..
```

### 4. Initialize the database
```bash
cd backend
node init-db.js
cd ..
```

### 5. Create admin user (optional)
```bash
cd backend
node createAdmin.js
cd ..
```

## Running the Application

### Start the backend server
```bash
cd backend
npm start
# or for development with auto-reload
npm run dev
```

The backend will run on `http://localhost:5000`

### Start the frontend application
```bash
npm start
```

The frontend will run on `http://localhost:3000`

## Usage

### Admin Access
- **Username**: `admin`
- **Password**: `Admin@demo`
- Navigate to `/admin` to login
- After login, you'll be redirected to `/admin/dashboard`

### Student Access
- Navigate to `/student` to access the student dashboard
- Students can apply for bus passes with required documents

## API Endpoints

### Student Routes
- `POST /api/student/apply` - Submit bus pass application
- `POST /api/student/login` - Student login

### Admin Routes
- `POST /api/admin/login` - Admin login
- `GET /api/admin/applications` - Get all applications
- `POST /api/admin/approve/:id` - Approve application
- `POST /api/admin/reject/:id` - Reject application

## File Structure

```
online-bus-pass/
├── src/                    # Frontend source code
│   ├── components/         # Reusable components
│   ├── pages/             # Page components
│   ├── utils/             # Utility functions
│   └── App.js             # Main application component
├── backend/                # Backend server
│   ├── routes/            # API route handlers
│   ├── models/            # Database models
│   ├── uploads/           # File upload directory
│   └── app.js             # Express server
├── public/                 # Static assets
└── package.json            # Frontend dependencies
```

## Database Schema

The application uses SQLite with the following main table:

```sql
CREATE TABLE student_applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  dob TEXT,
  regNo TEXT,
  branchYear TEXT,
  mobile TEXT,
  parentMobile TEXT,
  address TEXT,
  route TEXT,
  validity TEXT,
  photo TEXT,
  aadharNumber TEXT,
  aadharPhoto TEXT,
  collegeIdPhoto TEXT,
  status TEXT,
  qrData TEXT
);
```

## Configuration

### Environment Variables
Create a `.env` file in the backend directory:

```env
PORT=5000
NODE_ENV=development
```

### File Upload Limits
- Maximum file size: 10MB
- Supported formats: Images (JPG, PNG, GIF)
- Upload directory: `backend/uploads/`

## Development

### Code Style
- Use consistent formatting with Prettier
- Follow React best practices
- Use meaningful variable and function names
- Add proper error handling

### Testing
```bash
# Frontend tests
npm test

# Backend tests (if implemented)
cd backend
npm test
```

## Deployment

### Frontend
```bash
npm run build
```
The build folder can be deployed to any static hosting service.

### Backend
```bash
cd backend
npm start
```
Use PM2 or similar process manager for production deployment.

## Security Considerations

- Admin credentials are hardcoded (change in production)
- Implement proper authentication middleware
- Add input validation and sanitization
- Use HTTPS in production
- Implement rate limiting

## Troubleshooting

### Common Issues

1. **Database connection error**
   - Ensure SQLite is properly installed
   - Check file permissions for database file

2. **File upload errors**
   - Verify uploads directory exists
   - Check file size limits

3. **CORS errors**
   - Verify backend CORS configuration
   - Check frontend API base URL

### Logs
- Backend logs are displayed in the console
- Check browser console for frontend errors

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the ISC License.

## Support

For support and questions, please open an issue in the repository.
