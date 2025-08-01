const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/interview-app', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Interview Registration Schema (same as server)
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

// Sample data
const sampleRegistrations = [
  {
    name: 'John Doe',
    email: 'john.doe@example.com',
    registrationId: 'EMP001',
    resumeData: {
      extractedText: 'Experienced software developer with 5 years in React and Node.js',
      skills: ['javascript', 'react', 'node.js', 'mongodb', 'express'],
      experience: '5 years of experience in full-stack development',
      education: 'Bachelor of Computer Science',
      contactInfo: 'john.doe@example.com, +1234567890',
      originalFileName: 'john_doe_resume.docx',
      fileSize: 245760
    },
    status: 'pending'
  },
  {
    name: 'Jane Smith',
    email: 'jane.smith@example.com',
    registrationId: 'EMP002',
    resumeData: {
      extractedText: 'Senior developer specializing in Python and machine learning',
      skills: ['python', 'machine learning', 'tensorflow', 'pandas', 'scikit-learn'],
      experience: '7 years of experience in data science',
      education: 'Master of Data Science',
      contactInfo: 'jane.smith@example.com, +1987654321',
      originalFileName: 'jane_smith_resume.docx',
      fileSize: 198432
    },
    status: 'processing'
  },
  {
    name: 'Mike Johnson',
    email: 'mike.johnson@example.com',
    registrationId: 'EMP003',
    resumeData: {
      extractedText: 'DevOps engineer with expertise in AWS and Docker',
      skills: ['aws', 'docker', 'kubernetes', 'jenkins', 'terraform'],
      experience: '4 years of experience in DevOps',
      education: 'Bachelor of Information Technology',
      contactInfo: 'mike.johnson@example.com, +1122334455',
      originalFileName: 'mike_johnson_resume.docx',
      fileSize: 156789
    },
    status: 'completed'
  },
  {
    name: 'Sarah Wilson',
    email: 'sarah.wilson@example.com',
    registrationId: 'EMP004',
    resumeData: {
      extractedText: 'Frontend developer with strong UI/UX skills',
      skills: ['html', 'css', 'javascript', 'vue.js', 'figma'],
      experience: '3 years of experience in frontend development',
      education: 'Bachelor of Design',
      contactInfo: 'sarah.wilson@example.com, +1555666777',
      originalFileName: 'sarah_wilson_resume.docx',
      fileSize: 187654
    },
    status: 'interviewed'
  },
  {
    name: 'David Brown',
    email: 'david.brown@example.com',
    registrationId: 'EMP005',
    resumeData: {
      extractedText: 'Backend developer with expertise in Java and Spring',
      skills: ['java', 'spring', 'mysql', 'redis', 'microservices'],
      experience: '6 years of experience in backend development',
      education: 'Master of Software Engineering',
      contactInfo: 'david.brown@example.com, +1444333222',
      originalFileName: 'david_brown_resume.docx',
      fileSize: 223456
    },
    status: 'pending'
  }
];

async function addSampleData() {
  try {
    console.log('Adding sample data to database...');
    
    // Clear existing data
    await InterviewRegistration.deleteMany({});
    console.log('Cleared existing data');
    
    // Add sample registrations
    for (const registration of sampleRegistrations) {
      const newRegistration = new InterviewRegistration(registration);
      await newRegistration.save();
      console.log(`Added: ${registration.name} (${registration.registrationId})`);
    }
    
    console.log('\n✅ Sample data added successfully!');
    console.log('You can now test the admin dashboard with this data.');
    
  } catch (error) {
    console.error('Error adding sample data:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Run the script
addSampleData(); 