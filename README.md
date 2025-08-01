# Interview Registration App

A modern, responsive interview registration application with MongoDB backend storage and file upload capabilities.

## Features

- **Multi-step Registration Process**: Invitation → Form → Processing → Complete → Interview
- **Resume Text Extraction**: Automatically extracts and analyzes .docx resume content
- **Smart Data Processing**: Extracts skills, experience, education, and contact information
- **File Security**: Uploads are processed and immediately deleted for privacy
- **MongoDB Storage**: Structured data storage with extracted resume information
- **Admin Dashboard**: Complete management interface for viewing and updating registrations
- **Real-time Statistics**: Live dashboard with registration counts and status tracking
- **Search & Filter**: Advanced filtering by name, email, registration ID, and status
- **Export Functionality**: CSV export for data analysis and reporting
- **Responsive Design**: Works perfectly on all screen sizes without scrolling
- **Modern UI**: Beautiful gradients, animations, and professional design
- **Real-time Processing**: Simulated processing steps with visual feedback

## Tech Stack

### Frontend
- React.js
- Lucide React Icons
- CSS3 with modern features (Grid, Flexbox, Animations)

### Backend
- Node.js
- Express.js
- MongoDB with Mongoose
- Multer for file uploads
- Mammoth.js for .docx text extraction
- CORS for cross-origin requests

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local installation or MongoDB Atlas)
- npm or yarn

### 1. Clone and Setup Frontend

```bash
# Navigate to the project directory
cd interview-app

# Install frontend dependencies
npm install

# Check port availability
npm run check-ports

# Start the React development server
npm start
```

The frontend will run on `http://localhost:3000`

### 2. Setup Backend

```bash
# Navigate to server directory
cd server

# Install backend dependencies
npm install

# Create .env file (see environment variables below)
# Start the server
npm start
```

For development with auto-restart:
```bash
npm run dev
```

The backend will run on `http://localhost:5000`

### 3. Environment Variables

Create a `.env` file in the `server` directory:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/interview-app
NODE_ENV=development
```

For MongoDB Atlas, use your connection string:
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/interview-app
```

### 4. MongoDB Setup

#### Local MongoDB
1. Install MongoDB Community Edition
2. Start MongoDB service
3. Create database: `interview-app`

#### MongoDB Atlas (Cloud)
1. Create a free account at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a new cluster
3. Get your connection string
4. Update the `.env` file with your connection string

## API Endpoints

### Health Check
- `GET /api/health` - Server status

### Registration
- `POST /api/submit-interview-form` - Submit registration form
- `GET /api/registrations` - Get all registrations (admin)
- `GET /api/registrations/:id` - Get specific registration
- `PATCH /api/registrations/:id/status` - Update registration status

## File Structure

```
interview-app/
├── public/                 # Static files
├── src/                   # React source code
│   ├── App.js            # Main application component
│   ├── App.css           # Styles
│   └── index.js          # Entry point
├── server/               # Backend server
│   ├── server.js         # Express server
│   ├── package.json      # Server dependencies
│   └── uploads/          # File upload directory (auto-created)
└── package.json          # Frontend dependencies
```

## Database Schema

### InterviewRegistration
```javascript
{
  name: String (required),
  email: String (required, unique),
  registrationId: String (required, unique),
  resumeData: {
    extractedText: String (required),
    skills: [String],
    experience: String,
    education: String,
    contactInfo: String,
    originalFileName: String,
    fileSize: Number
  },
  submittedAt: Date,
  status: String (enum: pending, processing, completed, interviewed)
}
```

## Features in Detail

### 1. Invitation Step
- Professional company branding
- Interview details display
- Requirements checklist
- Animated background elements

### 2. Registration Form
- Form validation with real-time feedback
- Resume upload with drag-and-drop support
- .docx file validation and text extraction
- Automatic skill and information extraction
- Responsive design

### 3. Processing Step
- Animated loading indicators
- Step-by-step progress display
- Simulated processing time

### 4. Complete Step
- Registration summary
- Success confirmation
- Next step instructions

### 5. Interview Step
- Video call interface
- Candidate information sidebar
- Interview controls
- Real-time status indicators

### 6. Admin Dashboard
- **Secure Authentication**: Username and password protection
- Complete registration management
- Real-time statistics and analytics
- Search and filter functionality
- Status management and updates
- Detailed registration information
- CSV export capabilities

## Responsive Design

The application is designed to fit entirely within the viewport without scrolling:
- Uses `100vh` height for all containers
- Responsive grid layouts
- Flexible card sizing
- Mobile-first approach
- Touch-friendly interface

## Security Features

- File type validation (.docx only)
- File size limits (10MB)
- Automatic file deletion after processing
- Input sanitization
- CORS configuration
- Secure data storage
- Database validation

## Development

### Running Both Frontend and Backend

1. **Terminal 1** (Frontend):
```bash
cd interview-app
npm start
```

2. **Terminal 2** (Backend):
```bash
cd server
npm run dev
```

### Testing the Application

1. Check ports: `npm run check-ports`
2. Open `http://localhost:3000`
3. Click "Begin Registration"
4. Fill out the form with test data
5. Upload a .docx file
6. Submit and watch the processing flow

### Testing Admin Dashboard

1. Start the backend server: `cd server && npm start`
2. Add sample data: `node test-admin.js`
3. Open `http://localhost:3000`
4. Click "Admin Dashboard" button
5. **Login Credentials:**
   - Username: `admin`
   - Password: `admin`
6. View registrations, update statuses, and test features

## Troubleshooting

### Common Issues

1. **MongoDB Connection Error**
   - Ensure MongoDB is running
   - Check connection string in `.env`
   - Verify network connectivity

2. **File Upload Issues**
   - Check file size (max 10MB)
   - Ensure file is .docx format
   - Verify uploads directory permissions

3. **CORS Errors**
   - Backend CORS is configured for development
   - Check if frontend is running on correct port

4. **Port Conflicts**
   - Frontend: 3000
   - Backend: 5000
   - Change ports in respective configuration files if needed

## Production Deployment

### Frontend (React)
- Build: `npm run build`
- Deploy to Netlify, Vercel, or similar

### Backend (Node.js)
- Deploy to Heroku, Railway, or similar
- Set production environment variables
- Configure MongoDB Atlas for production

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the ISC License.
