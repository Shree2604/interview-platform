const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const mammoth = require('mammoth');
const fs = require('fs');
const http = require('http');
const https = require('https');
const { URL } = require('url');
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
const questionAnswerSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true
  },
  answer: {
    type: String,
    default: ''
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  isAnswered: {
    type: Boolean,
    default: false
  }
});

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
    summary: {
      type: String,
      required: [true, 'Resume summary is required']
    }
  },
  interviewData: {
    questions: [questionAnswerSchema],
    currentQuestionIndex: {
      type: Number,
      default: -1
    },
    isCompleted: {
      type: Boolean,
      default: false
    },
    startedAt: {
      type: Date
    },
    completedAt: {
      type: Date
    }
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'in_progress', 'completed', 'interviewed'],
    default: 'pending'
  },
  sessionToken: {
    type: String,
    unique: true,
    sparse: true
  }
});

const InterviewRegistration = mongoose.model('InterviewRegistration', interviewRegistrationSchema);

// Call LM Studio (OpenAI-compatible) chat completions API without extra deps
async function callLmStudioChat({ messages, temperature = 0.2, max_tokens, stop }) {
  const endpoint = process.env.LM_STUDIO_URL || 'http://127.0.0.1:1234/v1/chat/completions';
  const model = process.env.LM_MODEL || 'phi-3-mini-128k-instruct';

  console.log(`[LM] Sending request to ${endpoint} with model: ${model}`);
  console.log('Messages:', JSON.stringify(messages, null, 2));

  const payload = JSON.stringify({
    model,
    messages,
    temperature,
    max_tokens: max_tokens || 2000,
    stop: stop || [],
    stream: false
  });

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: payload,
      timeout: 300000
    });

    const data = await response.json();
    console.log('[LM] Response status:', response.status);
    console.log('[LM] Response data:', JSON.stringify(data, null, 2));

    if (!response.ok) {
      throw new Error(`LM Studio HTTP ${response.status}: ${JSON.stringify(data)}`);
    }

    // Handle different response formats
    if (data.choices && data.choices[0] && data.choices[0].message) {
      return data.choices[0].message.content;
    } else if (data.choices && data.choices[0] && data.choices[0].text) {
      return data.choices[0].text;
    } else if (data.choices && data.choices[0]) {
      return JSON.stringify(data.choices[0]);
    } else if (data.content) {
      return data.content;
    } else if (typeof data === 'string') {
      return data;
    } else if (typeof data === 'object') {
      return JSON.stringify(data);
    }

    throw new Error('LM Studio response format not recognized');
  } catch (error) {
    console.error('[LM] Error calling LM Studio:', error);
    throw new Error(`Failed to get response from LM Studio: ${error.message}`);
  }
  return content;
}

// Return constant interview questions (LLM not used for questions)
function generateInterviewQuestions() {
  return [
    'Hello, Thank you for joining us today. School Professionals staffs substitute teachers in Charter, Private, and Independent schools, as well as NYC’s Pre-K for All (UPK) program. We work with schools across all five boroughs, offering both short- and long-term assignments, and you choose which fit your schedule. The only requirement is working at least four days per month. This is a great way to gain classroom experience while working at different schools. Are you interested in moving forward?',
    'How did you hear about us?'
  ];
}

// Summarize resume text via LM Studio (returns plain summary string)
async function summarizeResumeWithLLM(text) {
  const system = 'You are an expert resume summarizer. Output a concise paragraph (60-120 words) summarizing the candidate profile. No markdown.';
  const user = `Summarize the following resume text. Focus on years of experience, key skills/technologies, notable roles/achievements, and education if present. Avoid bullet points and keep it objective.\n\nRESUME TEXT START\n${text}\nRESUME TEXT END`;

  const content = await callLmStudioChat({
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user }
    ],
    temperature: 0.2
  });

  return String(content).replace(/^```(?:\w+)?/g, '').replace(/```$/g, '').trim();
}

// Multi-agent orchestration using LangGraph (explicit nodes/edges)
async function runMultiAgentFlow({ name, email, registrationId, extractedText }) {
  const { buildRegistrationGraph } = require('./graph/registrationFlow.js');
  const { createRegistrationAgent } = require('./agents/registrationAgent.js');
  const { createResumeAgent } = require('./agents/resumeAgent.js');
  const { createQuestionsAgent } = require('./agents/questionsAgent.js');
  const { createPersistAgent } = require('./agents/persistAgent.js');

  const registrationAgent = createRegistrationAgent({ InterviewRegistration });
  const resumeAgent = createResumeAgent({ summarizeResumeWithLLM });
  const questionsAgent = createQuestionsAgent({ generateInterviewQuestions });
  const persistAgent = createPersistAgent({ InterviewRegistration });

  const app = buildRegistrationGraph({ registrationAgent, resumeAgent, questionsAgent, persistAgent });

  const state = {
    name,
    email,
    registrationId,
    extractedText,
    validationOk: false,
    summaryText: '',
    questions: [],
    sessionToken: '',
    registration: null,
    error: null
  };

  return await app.invoke(state);
}

// Test LM Studio connection and response format
app.get('/api/test/lmstudio', async (req, res) => {
  try {
    const testResponse = await callLmStudioChat({
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Just say "Hello, I\'m connected!"' }
      ],
      temperature: 0.1
    });
    
    res.json({
      success: true,
      message: 'Successfully connected to LM Studio',
      response: testResponse
    });
  } catch (error) {
    console.error('LM Studio test error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to connect to LM Studio',
      error: error.message
    });
  }
});

// LM Studio connectivity check
app.get('/api/lmstudio/ping', async (req, res) => {
  try {
    // Lightweight models listing to test connectivity
    const endpoint = (process.env.LM_STUDIO_URL || 'http://127.0.0.1:1234/v1/chat/completions').replace('/v1/chat/completions', '/v1/models');
    const url = new URL(endpoint);
    const isHttps = url.protocol === 'https:';
    const transport = isHttps ? https : http;
    const options = {
      method: 'GET',
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + (url.search || ''),
      headers: { 'Accept': 'application/json' },
      timeout: 8000
    };
    const payload = await new Promise((resolve, reject) => {
      const req2 = transport.request(options, (resp) => {
        let data = '';
        resp.on('data', (c) => { data += c; });
        resp.on('end', () => resolve(JSON.stringify({ statusCode: resp.statusCode, body: data })));
      });
      req2.on('error', reject);
      req2.on('timeout', () => req2.destroy(new Error('LM Studio /models timeout')));
      req2.end();
    });
    const env = JSON.parse(payload);
    const models = JSON.parse(env.body || '{}');
    res.json({ ok: true, statusCode: env.statusCode, models });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Routes

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running', timestamp: new Date() });
});

// Simple Yes/No classifier endpoint using LM Studio with heuristic fallback
app.post('/api/nlu/yesno', async (req, res) => {
  try {
    const text = String(req.body?.text || '').trim();
    if (!text) {
      return res.status(400).json({ success: false, message: 'text is required' });
    }

    // Prepare LM prompt
    const system = 'You are a precise intent classifier. Given a short user reply, classify it as yes, no, or unclear. Output STRICT JSON with fields: label ("yes"|"no"|"unclear"), confidence (0-1).';
    const user = `Classify the intent of the following reply strictly into yes/no/unclear. Return JSON only.\nReply: "${text}"`;

    let classification = null;
    try {
      const content = await callLmStudioChat({
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user }
        ],
        temperature: 0.0,
        max_tokens: 200
      });
      const cleaned = String(content).replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
      const parsed = JSON.parse(cleaned);
      if (parsed && typeof parsed === 'object' && parsed.label) {
        classification = {
          label: String(parsed.label).toLowerCase() === 'yes' ? 'yes' : (String(parsed.label).toLowerCase() === 'no' ? 'no' : 'unclear'),
          confidence: Math.max(0, Math.min(1, Number(parsed.confidence) || 0))
        };
      }
    } catch (e) {
      // Fall through to heuristic
    }

    // Heuristic fallback
    if (!classification) {
      const textLower = text.toLowerCase();
      const affirm = [
        'yes','y','yep','yeah','yah','ya','yup','sure','definitely','of course','absolutely','certainly','correct','right','ok','okay','k','mmhmm','mhm','uh-huh','affirmative','interested','count me in','sounds good','proceed','go ahead','let\'s do it','indeed','aye','si','alright','all right','roger','10-4','positive','keen'
      ];
      const neg = [
        'no','n','nope','nah','nay','not really','don\'t','do not','no thanks','not interested','negative','pass','skip','rather not','not now','maybe later','i\'m fine','i am fine','not today','decline','hard pass','no way'
      ];
      const containsAny = (arr) => arr.some(p => textLower.includes(p));
      const label = containsAny(affirm) && !containsAny(neg) ? 'yes' : (containsAny(neg) && !containsAny(affirm) ? 'no' : 'unclear');
      classification = { label, confidence: label === 'unclear' ? 0.5 : 0.9 };
    }

    res.json({ success: true, ...classification });
  } catch (error) {
    console.error('Error in yes/no classification:', error);
    res.status(500).json({ success: false, message: 'Internal server error', label: 'unclear', confidence: 0 });
  }
});

// Mark interview as started (capture start time)
app.post('/api/interview/start', async (req, res) => {
  try {
    const { registrationId, sessionToken } = req.body || {};

    let registration = null;
    if (sessionToken) {
      registration = await InterviewRegistration.findOne({ sessionToken });
    }
    if (!registration && registrationId) {
      registration = await InterviewRegistration.findOne({ registrationId });
    }
    if (!registration) {
      return res.status(404).json({ success: false, message: 'Registration not found' });
    }

    if (!registration.interviewData.startedAt) {
      registration.interviewData.startedAt = new Date();
      if (registration.status === 'processing') {
        registration.status = 'in_progress';
      }
      await registration.save();
    }

    return res.json({
      success: true,
      message: 'Interview start recorded',
      data: {
        registrationId: registration.registrationId,
        startedAt: registration.interviewData.startedAt,
        status: registration.status
      }
    });
  } catch (error) {
    console.error('Error marking interview start:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Get interview session by token
app.get('/api/interview/session/:token', async (req, res) => {
  try {
    const registration = await InterviewRegistration.findOne({ 
      $or: [
        { sessionToken: req.params.token },
        { registrationId: req.params.token }
      ],
      status: { $in: ['processing', 'in_progress', 'completed'] }
    }).select('-resumeData.extractedText');
    
    if (!registration) {
      return res.status(404).json({ error: 'Session not found or expired' });
    }
    
    // If we found by registrationId and sessionToken is not set, update it
    if (!registration.sessionToken) {
      registration.sessionToken = req.params.token;
      await registration.save();
    }
    
    res.json({
      ...registration.toObject(),
      currentQuestion: registration.interviewData.questions[registration.interviewData.currentQuestionIndex] || null
    });
  } catch (error) {
    console.error('Error fetching interview session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Submit answer for current question
app.post('/api/interview/answer', async (req, res) => {
  try {
    const { registrationId, sessionToken, answer, questionIndex, questionText } = req.body;

    // Find registration by sessionToken first, then by registrationId
    let registration = null;
    if (sessionToken) {
      registration = await InterviewRegistration.findOne({ sessionToken });
    }
    if (!registration && registrationId) {
      registration = await InterviewRegistration.findOne({ registrationId });
    }
    if (!registration) {
      return res.status(404).json({ error: 'Registration not found' });
    }

    // Determine index to update
    const idx = (typeof questionIndex === 'number' && !isNaN(questionIndex))
      ? questionIndex
      : registration.interviewData.currentQuestionIndex;

    if (idx < 0) {
      return res.status(400).json({ error: 'Invalid question index' });
    }

    // Ensure questions array has an entry at idx; create if missing
    if (registration.interviewData.questions.length <= idx) {
      // Create new question entry using provided questionText or a placeholder
      registration.interviewData.questions[idx] = {
        question: questionText || `Question ${idx + 1}`,
        answer: '',
        isAnswered: false,
        timestamp: new Date()
      };
    }

    // Update currentQuestionIndex if needed
    if (registration.interviewData.currentQuestionIndex < idx) {
      registration.interviewData.currentQuestionIndex = idx;
    }

    // Mark status as in_progress on first answer
    if (registration.status === 'processing') {
      registration.status = 'in_progress';
      if (!registration.interviewData.startedAt) {
        registration.interviewData.startedAt = new Date();
      }
    }

    // Save answer
    registration.interviewData.questions[idx].answer = answer || '';
    registration.interviewData.questions[idx].isAnswered = true;
    registration.interviewData.questions[idx].timestamp = new Date();

    await registration.save();

    res.json({ success: true, nextQuestionIndex: idx + 1 });
  } catch (error) {
    console.error('Error submitting answer:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get next question
app.get('/api/interview/next-question/:registrationId', async (req, res) => {
  try {
    const registration = await InterviewRegistration.findOne({ 
      registrationId: req.params.registrationId 
    });
    
    if (!registration) {
      return res.status(404).json({ error: 'Registration not found' });
    }
    
    // If interview is completed, return completion status
    if (registration.interviewData.isCompleted) {
      return res.json({ 
        interviewCompleted: true,
        message: 'Interview completed successfully' 
      });
    }
    
    // If this is the first question, update status to in_progress
    if (registration.status === 'processing') {
      registration.status = 'in_progress';
      registration.interviewData.startedAt = new Date();
      await registration.save();
    }
    
    const nextQuestionIndex = registration.interviewData.questions.length;
    
    // Generate or retrieve next question based on interview progress
    // Fixed set of 3 questions
    const questions = generateInterviewQuestions();
    
    if (nextQuestionIndex < questions.length) {
      const newQuestion = {
        question: questions[nextQuestionIndex],
        isAnswered: false
      };
      
      registration.interviewData.questions.push(newQuestion);
      registration.interviewData.currentQuestionIndex = nextQuestionIndex;
      await registration.save();
      
      return res.json({
        questionId: nextQuestionIndex,
        question: newQuestion.question,
        isLastQuestion: nextQuestionIndex === questions.length - 1
      });
    } else {
      // No more questions, mark interview as completed
      registration.interviewData.isCompleted = true;
      registration.interviewData.completedAt = new Date();
      registration.status = 'completed';
      await registration.save();
      
      res.json({ 
        interviewCompleted: true,
        message: 'Interview completed successfully' 
      });
    }
  } catch (error) {
    console.error('Error getting next question:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark interview as completed (capture end time)
app.post('/api/interview/complete', async (req, res) => {
  try {
    const { registrationId, sessionToken } = req.body || {};

    // Find registration by sessionToken first, then by registrationId
    let registration = null;
    if (sessionToken) {
      registration = await InterviewRegistration.findOne({ sessionToken });
    }
    if (!registration && registrationId) {
      registration = await InterviewRegistration.findOne({ registrationId });
    }
    if (!registration) {
      return res.status(404).json({ success: false, message: 'Registration not found' });
    }

    // If already completed, return existing completion time
    if (registration.interviewData?.isCompleted) {
      return res.json({
        success: true,
        message: 'Interview already completed',
        data: {
          registrationId: registration.registrationId,
          completedAt: registration.interviewData.completedAt,
          startedAt: registration.interviewData.startedAt,
          status: registration.status
        }
      });
    }

    // Ensure startedAt is set if interview was in progress without prior start time
    if (!registration.interviewData.startedAt) {
      registration.interviewData.startedAt = new Date();
      if (registration.status === 'processing') {
        registration.status = 'in_progress';
      }
    }

    // Mark completion and set timestamps
    registration.interviewData.isCompleted = true;
    registration.interviewData.completedAt = new Date();
    registration.status = 'completed';

    await registration.save();

    res.json({
      success: true,
      message: 'Interview marked as completed',
      data: {
        registrationId: registration.registrationId,
        completedAt: registration.interviewData.completedAt,
        startedAt: registration.interviewData.startedAt,
        status: registration.status
      }
    });
  } catch (error) {
    console.error('Error completing interview:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
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

    // Uniqueness will be rechecked in multi-agent flow as well

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

    // Orchestrate via multi-agent flow (registration, resume summary, questions, persistence)
    let flowResult = null;
    try {
      flowResult = await runMultiAgentFlow({ name, email, registrationId, extractedText });
    } catch (e) {
      console.error('Multi-agent flow error:', e);
      flowResult = { error: e.message };
    }

    // Delete the uploaded file after extraction
    try {
      fs.unlinkSync(req.file.path);
      console.log(`Deleted uploaded file: ${req.file.path}`);
    } catch (deleteError) {
      console.error('Error deleting uploaded file:', deleteError);
      // Continue even if file deletion fails
    }

    if (flowResult?.error) {
      const message = String(flowResult.error);
      const isConflict = /already/i.test(message);
      return res.status(isConflict ? 409 : 400).json({ success: false, message });
    }

    let registration = flowResult?.registration;
    let sessionToken = flowResult?.sessionToken;
    let summaryText = flowResult?.summaryText || '';
    if (!registration || !sessionToken) {
      console.warn('Flow did not return registration/sessionToken. Falling back to direct persistence. Flow state:', {
        hasRegistration: Boolean(registration),
        hasSessionToken: Boolean(sessionToken),
        hasSummary: Boolean(summaryText)
      });

      // Fallback: ensure summaryText exists
      if (!summaryText) {
        try {
          summaryText = await summarizeResumeWithLLM(extractedText);
        } catch (_) {
          const compact = String(extractedText || '').replace(/\s+/g, ' ').trim();
          summaryText = compact ? compact.slice(0, 400) + (compact.length > 400 ? '…' : '') : 'Resume submitted. Summary unavailable.';
        }
      }

      // Fallback: generate session token
      if (!sessionToken) {
        const crypto = require('node:crypto');
        sessionToken = `session_${crypto.randomBytes(16).toString('hex')}`;
      }

      // Persist directly
      try {
        registration = new InterviewRegistration({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          registrationId: registrationId.trim(),
          sessionToken,
          status: 'processing',
          resumeData: {
            extractedText,
            summary: summaryText
          },
          interviewData: {
            questions: generateInterviewQuestions().map((q) => ({
              question: q,
              answer: '',
              isAnswered: false,
              timestamp: null
            })),
            currentQuestionIndex: -1,
            isCompleted: false,
            startedAt: null,
            completedAt: null
          }
        });
        await registration.save();
      } catch (persistError) {
        console.error('Direct persistence fallback failed:', persistError);
        return res.status(500).json({ success: false, message: 'Registration failed to persist' });
      }
    }

    console.log('New registration created with session token:', sessionToken);

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
        sessionToken: sessionToken, // Use the generated variable directly
        // Return summary for client visibility
        summary: summaryText
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
    
    if (!status || !['pending', 'processing', 'in_progress', 'completed', 'interviewed'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Valid status is required: pending, processing, in_progress, completed, or interviewed'
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
