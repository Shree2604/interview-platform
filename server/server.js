const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const mammoth = require('mammoth');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/interview-app', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    // Only allow .docx files
    if (path.extname(file.originalname).toLowerCase() === '.docx') {
      cb(null, true);
    } else {
      cb(new Error('Only .docx files are allowed'), false);
    }
  }
});

// Create uploads directory if it doesn't exist
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Interview Registration Schema
const interviewRegistrationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  registrationId: {
    type: String,
    required: [true, 'Registration ID is required'],
    trim: true,
    unique: true
  },
  resumeData: {
    extractedText: {
      type: String,
      required: [true, 'Resume text extraction is required']
    },
    skills: [{
      type: String,
      trim: true
    }],
    experience: {
      type: String,
      trim: true
    },
    education: {
      type: String,
      trim: true
    },
    contactInfo: {
      type: String,
      trim: true
    },
    originalFileName: {
      type: String,
      required: true
    },
    fileSize: {
      type: Number,
      required: true
    }
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'interviewed'],
    default: 'pending'
  }
});

const InterviewRegistration = mongoose.model('InterviewRegistration', interviewRegistrationSchema);

// Function to extract information from resume text
function extractResumeInfo(text) {
  const extractedData = {
    skills: [],
    experience: '',
    education: '',
    contactInfo: ''
  };

  // Extract skills (common programming languages, frameworks, tools)
  const skillPatterns = [
    /javascript|js|react|node\.js|python|java|c\+\+|c#|php|ruby|go|rust|swift|kotlin/gi,
    /html|css|sass|less|bootstrap|tailwind|material-ui/gi,
    /mongodb|mysql|postgresql|sqlite|redis|elasticsearch/gi,
    /docker|kubernetes|aws|azure|gcp|heroku|netlify/gi,
    /git|github|gitlab|bitbucket|jenkins|travis|circleci/gi,
    /agile|scrum|kanban|jira|trello|asana/gi,
    /machine learning|ml|ai|artificial intelligence|data science/gi,
    /typescript|angular|vue|svelte|next\.js|nuxt/gi
  ];

  skillPatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      extractedData.skills.push(...matches.map(skill => skill.toLowerCase()));
    }
  });

  // Remove duplicates and limit to top skills
  extractedData.skills = [...new Set(extractedData.skills)].slice(0, 15);

  // Extract experience section
  const experiencePatterns = [
    /experience|work history|employment|professional background/gi,
    /(?:worked|employed|position|role|job).*?(?:years?|months?)/gi
  ];

  experiencePatterns.forEach(pattern => {
    const match = text.match(pattern);
    if (match) {
      extractedData.experience = match[0];
    }
  });

  // Extract education section
  const educationPatterns = [
    /education|academic|degree|university|college|school/gi,
    /bachelor|master|phd|diploma|certificate/gi
  ];

  educationPatterns.forEach(pattern => {
    const match = text.match(pattern);
    if (match) {
      extractedData.education = match[0];
    }
  });

  // Extract contact information
  const contactPatterns = [
    /[\w\.-]+@[\w\.-]+\.\w+/g, // Email
    /(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, // Phone
    /linkedin\.com\/in\/[\w-]+/gi, // LinkedIn
    /github\.com\/[\w-]+/gi // GitHub
  ];

  contactPatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      extractedData.contactInfo += matches.join(', ') + ' ';
    }
  });

  return extractedData;
}

// Routes

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running', timestamp: new Date() });
});

// Submit interview registration form
app.post('/api/submit-interview-form', upload.single('resume'), async (req, res) => {
  try {
    // Validate required fields
    const { name, email, registrationId } = req.body;
    
    if (!name || !email || !registrationId) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required: name, email, registrationId'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Resume file (.docx) is required'
      });
    }

    // Check if registration ID already exists
    const existingRegistration = await InterviewRegistration.findOne({ registrationId });
    if (existingRegistration) {
      return res.status(409).json({
        success: false,
        message: 'Registration ID already exists'
      });
    }

    // Check if email already exists
    const existingEmail = await InterviewRegistration.findOne({ email });
    if (existingEmail) {
      return res.status(409).json({
        success: false,
        message: 'Email already registered'
      });
    }

    // Extract text from the uploaded .docx file
    let extractedText = '';
    try {
      const result = await mammoth.extractRawText({ path: req.file.path });
      extractedText = result.value;
    } catch (extractError) {
      console.error('Error extracting text from resume:', extractError);
      return res.status(400).json({
        success: false,
        message: 'Error extracting text from resume file'
      });
    }

    // Extract structured information from the text
    const extractedInfo = extractResumeInfo(extractedText);

    // Delete the uploaded file after extraction
    try {
      fs.unlinkSync(req.file.path);
      console.log(`Deleted uploaded file: ${req.file.path}`);
    } catch (deleteError) {
      console.error('Error deleting uploaded file:', deleteError);
      // Continue even if file deletion fails
    }

    // Create new registration with extracted data
    const registration = new InterviewRegistration({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      registrationId: registrationId.trim(),
      resumeData: {
        extractedText: extractedText,
        skills: extractedInfo.skills,
        experience: extractedInfo.experience,
        education: extractedInfo.education,
        contactInfo: extractedInfo.contactInfo,
        originalFileName: req.file.originalname,
        fileSize: req.file.size
      }
    });

    await registration.save();

    res.status(201).json({
      success: true,
      message: 'Registration submitted successfully',
      data: {
        id: registration._id,
        name: registration.name,
        email: registration.email,
        registrationId: registration.registrationId,
        submittedAt: registration.submittedAt,
        status: registration.status,
        extractedSkills: extractedInfo.skills,
        extractedExperience: extractedInfo.experience,
        extractedEducation: extractedInfo.education
      }
    });

  } catch (error) {
    console.error('Error submitting registration:', error);
    
    // Clean up uploaded file if it exists
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
        console.log(`Cleaned up uploaded file: ${req.file.path}`);
      } catch (deleteError) {
        console.error('Error deleting uploaded file during error cleanup:', deleteError);
      }
    }
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: validationErrors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
});

// Get all registrations (for admin purposes)
app.get('/api/registrations', async (req, res) => {
  try {
    const registrations = await InterviewRegistration.find({})
      .select('-resumeData.extractedText') // Don't send full text for security
      .sort({ submittedAt: -1 });
    
    res.json({
      success: true,
      data: registrations
    });
  } catch (error) {
    console.error('Error fetching registrations:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get registration by ID
app.get('/api/registrations/:id', async (req, res) => {
  try {
    const registration = await InterviewRegistration.findById(req.params.id)
      .select('-resumeData.extractedText'); // Don't send full text for security
    
    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found'
      });
    }
    
    res.json({
      success: true,
      data: registration
    });
  } catch (error) {
    console.error('Error fetching registration:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Update registration status
app.patch('/api/registrations/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!status || !['pending', 'processing', 'completed', 'interviewed'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Valid status is required: pending, processing, completed, or interviewed'
      });
    }
    
    const registration = await InterviewRegistration.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).select('-resumeData.extractedText'); // Don't send full text for security
    
    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Status updated successfully',
      data: registration
    });
  } catch (error) {
    console.error('Error updating registration status:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Error:', error);
  
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size too large. Maximum size is 10MB.'
      });
    }
  }
  
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});
