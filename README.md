# AI-Powered Interview Platform

A comprehensive interview platform with AI capabilities, built with React and Node.js, featuring resume parsing, interview management, and an admin dashboard.

## Features

### User Experience
- **Multi-step Interview Flow**: Seamless progression from invitation to interview completion
- **Resume Upload & Parsing**: Automated extraction of skills, experience, and education from DOCX files
- **Responsive Design**: Fully responsive interface that works on all devices
- **Dark/Light Mode**: Toggle between themes for comfortable viewing

### AI Interview Features
- **Real-time Interview Simulation**: Interactive AI-powered interview interface
- **Audio/Video Controls**: Built-in media controls for interview sessions
- **Session Management**: Start, pause, and reset interview sessions
- **Feedback System**: Get instant feedback on interview performance

### Admin Dashboard
- **Secure Authentication**: Protected admin login system
- **Candidate Management**: View and manage all interview candidates
- **Analytics**: Track interview statistics and candidate performance
- **Export Data**: Export candidate information for further analysis

## Tech Stack

### Frontend
- **React.js** - UI Framework
- **Lucide React** - Icon library
- **CSS3** - Styling with modern features (Grid, Flexbox, Animations)
- **React Router** - Navigation

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - MongoDB object modeling
- **Multer** - File upload handling
- **Mammoth.js** - DOCX text extraction
- **CORS** - Cross-origin resource sharing

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- MongoDB (local or MongoDB Atlas)

## Getting Started

### 1. Clone the Repository

```bash
git clone <repository-url>
cd interview-app
```

### 2. Install Dependencies

#### Frontend
```bash
npm install
```

#### Backend
```bash
cd server
npm install
cd ..
```

### 3. Environment Setup

Create a `.env` file in the root directory with the following variables:

```env
PORT=3000
REACT_APP_API_URL=http://localhost:5000
MONGODB_URI=mongodb://localhost:27017/interview-app
JWT_SECRET=your_jwt_secret_here
```

### 4. Start the Application

#### Development Mode
```bash
# Start both frontend and backend
npm run dev
```

#### Production Mode
```bash
# Build the frontend
npm run build

# Start the backend
npm run server
```

The application will be available at `http://localhost:3000`

## Project Structure

```
interview-app/
├── public/                 # Static files
├── server/                 # Backend server
│   ├── models/             # MongoDB models
│   ├── routes/             # API routes
│   └── server.js           # Express server entry point
├── src/
│   ├── components/         # Reusable components
│   ├── pages/              # Page components
│   ├── styles/             # Global styles
│   ├── App.js              # Main application component
│   └── index.js            # Application entry point
├── .env                   # Environment variables
├── package.json           # Frontend dependencies
└── README.md              # Project documentation
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Admin login
- `POST /api/auth/register` - Admin registration

### Candidates
- `GET /api/candidates` - Get all candidates
- `GET /api/candidates/:id` - Get candidate by ID
- `POST /api/candidates` - Create new candidate
- `PUT /api/candidates/:id` - Update candidate
- `DELETE /api/candidates/:id` - Delete candidate

### Interviews
- `POST /api/interviews` - Create new interview
- `GET /api/interviews/:id` - Get interview details
- `PUT /api/interviews/:id` - Update interview
- `DELETE /api/interviews/:id` - Delete interview

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [React](https://reactjs.org/)
- [Express](https://expressjs.com/)
- [MongoDB](https://www.mongodb.com/)
- [Lucide Icons](https://lucide.dev/)

---

<div align="center">
  Made with ❤️ by [Your Name]
</div>
