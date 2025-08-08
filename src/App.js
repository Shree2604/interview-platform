import React, { useState, useRef, useEffect } from 'react';
import { Calendar, Clock, Building, User, ArrowRight, Upload, FileText, CheckCircle, Award, Star, Sparkles, Mic, Video, MessageSquare, Brain, Target, Users, Settings, Play, Pause, RotateCcw, Square, RefreshCw, Send, Volume2, VolumeX, Sun, Moon } from 'lucide-react';
import './App.css';
import AdminDashboard from './AdminDashboard';
import AdminLogin from './AdminLogin';
import AIInterviewInterface from './AIInterviewInterface';
import ThankYou from './ThankYou';
import Exit from './Exit';

// Utility function to generate a unique session token
const generateSessionToken = () => {
  return 'session_' + Math.random().toString(36).substr(2, 9);
};

function App() {
  // Check for existing session on initial load
  const [currentStep, setCurrentStep] = useState('invitation');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    registrationId: '',
    resume: null
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(() => {
    return localStorage.getItem('isAdminAuthenticated') === 'true';
  });
  const [sessionToken, setSessionToken] = useState(localStorage.getItem('interviewSessionToken') || null);
  const [interviewData, setInterviewData] = useState(null);

  const handleStartInterview = () => {
    setCurrentStep('form');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
      
      if (fileExtension !== '.docx') {
        setErrors(prev => ({
          ...prev,
          resume: 'Please upload only .docx format files'
        }));
        return;
      }
      
      setFormData(prev => ({
        ...prev,
        resume: file
      }));
      
      if (errors.resume) {
        setErrors(prev => ({
          ...prev,
          resume: ''
        }));
      }
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (!formData.registrationId.trim()) {
      newErrors.registrationId = 'Registration ID is required';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (!formData.resume) {
      newErrors.resume = 'Resume (.docx format) is required';
    }
    
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formErrors = validateForm();
    
    if (Object.keys(formErrors).length === 0) {
      setIsSubmitting(true);
      
      try {
        const formDataToSend = new FormData();
        formDataToSend.append('name', formData.name);
        formDataToSend.append('email', formData.email);
        formDataToSend.append('registrationId', formData.registrationId);
        formDataToSend.append('resume', formData.resume);

        console.log('Submitting form with data:', {
          name: formData.name,
          email: formData.email,
          registrationId: formData.registrationId
        });

        const response = await fetch('http://localhost:5000/api/submit-interview-form', {
          method: 'POST',
          body: formDataToSend,
          headers: {
            'Accept': 'application/json'
          }
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }

        let result;
        try {
          // Log the raw response for debugging
          console.log('Raw response:', response);
          result = await response.json();
        } catch (jsonError) {
          console.error('Failed to parse JSON from server:', jsonError);
          alert('Registration failed: Server returned an invalid response. Please contact support.');
          setIsSubmitting(false);
          return;
        }
        console.log('Form submitted successfully:', result);
        console.log('Result data:', result.data);
        if (result.data) {
          console.log('Result data keys:', Object.keys(result.data));
        }
        // Extract the session token from the response (robust)
        let sessionToken = null;
        if (result.data && typeof result.data === 'object') {
          sessionToken = result.data.sessionToken || result.data.token || null;
        }
        if (!sessionToken && result.sessionToken) {
          sessionToken = result.sessionToken;
        }
        if (!sessionToken && result.token) {
          sessionToken = result.token;
        }
        
        if (sessionToken) {
          console.log('Session token received:', sessionToken);
          // Store the session token in localStorage
          localStorage.setItem('interviewSessionToken', sessionToken);
          setSessionToken(sessionToken);
          // Prepare interview data
          const interviewData = {
            ...(result.data || result),
            sessionToken: sessionToken,
            interviewData: {
              questions: [],
              currentQuestionIndex: -1,
              isCompleted: false,
              ...(result.data?.interviewData || result.interviewData || {})
            }
          };
          console.log('Setting interview data:', interviewData);
          setInterviewData(interviewData);
          // Move directly to interview step
          setCurrentStep('interview');
        } else {
          console.error('No session token found in response:', result);
          if (result.data) {
            alert('Registration failed: No session token in response. Data keys: ' + Object.keys(result.data).join(', '));
          } else {
            alert('Registration failed: No session token received from server. Please contact support or try again.');
          }
          throw new Error('No session token received from server. Please try again.');
        }
      } catch (error) {
        console.error('Error submitting form:', error);
        alert(`Error: ${error.message}. Please try again.`);
      } finally {
        setIsSubmitting(false);
      }
    } else {
      setErrors(formErrors);
    }
  };

  const handleStartActualInterview = () => {
    setCurrentStep('interview');
  };

  const handleGoToAdmin = () => {
    if (isAdminAuthenticated) {
      setCurrentStep('admin');
    } else {
      setCurrentStep('admin-login');
    }
  };

  // Check for existing session on mount
  useEffect(() => {
    const checkExistingSession = async () => {
      const token = localStorage.getItem('interviewSessionToken');
      if (token) {
        try {
          console.log('Checking existing session with token:', token);
          
          // First try the session token endpoint
          let response = await fetch(`http://localhost:5000/api/interview/session/${token}`);
          
          // If that fails, try with the registration ID as a fallback
          if (!response.ok) {
            console.log('Session token not found, trying with registration ID');
            response = await fetch(`http://localhost:5000/api/registrations/${token}`);
          }
          
          if (response.ok) {
            const data = await response.json();
            console.log('Session data:', data);
            
            // Normalize the response data structure
            const sessionData = data.data || data;
            
            // Ensure we have the session token
            const actualToken = sessionData.sessionToken || token;
            
            // Update session token in localStorage if it was missing
            if (!sessionData.sessionToken) {
              localStorage.setItem('interviewSessionToken', actualToken);
              
              // Update the registration with the session token
              try {
                await fetch(`http://localhost:5000/api/registrations/${sessionData.registrationId || token}/session`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ sessionToken: actualToken })
                });
              } catch (updateError) {
                console.error('Error updating session token:', updateError);
              }
            }
            
            // Set the interview data and token
            setInterviewData(sessionData);
            setSessionToken(actualToken);
            
            // Update form data if not already set
            if (!formData.name) {
              setFormData({
                name: sessionData.name || '',
                email: sessionData.email || '',
                registrationId: sessionData.registrationId || token,
                resume: { 
                  name: sessionData.resumeData?.originalFileName || 'resume.docx' 
                }
              });
            }
            
            // Determine the current step based on interview status
            if (sessionData.status === 'completed') {
              console.log('Restoring completed interview session');
              setCurrentStep('complete');
            } else if (sessionData.status === 'in_progress' || sessionData.status === 'processing') {
              console.log('Restoring in-progress interview session');
              setCurrentStep('interview');
            } else {
              console.log('No active interview found, clearing session');
              localStorage.removeItem('interviewSessionToken');
              setSessionToken(null);
            }
          } else {
            console.log('Invalid session, clearing token');
            // Clear invalid session
            localStorage.removeItem('interviewSessionToken');
            setSessionToken(null);
          }
        } catch (error) {
          console.error('Error checking session:', error);
          localStorage.removeItem('interviewSessionToken');
          setSessionToken(null);
        }
      } else {
        console.log('No session token found');
      }
    };

    if (isAdminAuthenticated) {
      setCurrentStep('admin');
    } else {
      checkExistingSession();
    }
  }, [isAdminAuthenticated, formData.name]);

  const handleAdminLogin = () => {
    setIsAdminAuthenticated(true);
    localStorage.setItem('isAdminAuthenticated', 'true');
    setCurrentStep('admin');
  };

  const handleAdminLogout = () => {
    setIsAdminAuthenticated(false);
    localStorage.removeItem('isAdminAuthenticated');
    setCurrentStep('invitation');
  };

  const handleLogout = () => {
    localStorage.removeItem('interviewSessionToken');
    setSessionToken(null);
    setInterviewData(null);
    setCurrentStep('invitation');
    window.location.reload(); // Force a full page refresh to reset all state
  };

  // Invitation Step
  if (currentStep === 'invitation') {
    return (
      <div className="invitation-container">
        <div className="background-elements">
          <div className="floating-element element-1"></div>
          <div className="floating-element element-2"></div>
          <div className="floating-element element-3"></div>
        </div>
        
        <div className="main-card invitation-card">
          <div className="header-section">
            <h1 className="main-title">Interview Invitation</h1>
          </div>

          <div className="content-section">
            <div className="invitation-banner">
              <h2 className="banner-title">🎉 Congratulations! You're Invited!</h2>
              <p className="banner-text">
                You have been selected to participate in an exclusive interview for the <br></br>
                <span className="position-highlight">Teacher / Assistant Teacher</span> 
                role in the <span className="school-type-highlight">UPK Program</span>.
              </p>
            </div>

            <div className="details-grid">
              <div className="detail-card purple">
                <div className="detail-header">
                  <Calendar className="detail-icon" />
                  <span className="detail-title">Date</span>
                </div>
                <p className="detail-value">{new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"})}</p>
              </div>
              <div className="detail-card blue">
                <div className="detail-header">
                  <Clock className="detail-icon" />
                  <span className="detail-title">Duration</span>
                </div>
                <p className="detail-value">20 - 30 minutes</p>
              </div>
              <div className="detail-card indigo">
                <div className="detail-header">
                  <User className="detail-icon" />
                  <span className="detail-title">Format</span>
                </div>
                <p className="detail-value">Virtual Interview</p>
              </div>
            </div>

            <div className="instructions-box">
              <h3 className="instructions-title">📋 Before You Start:</h3>
              <div className="instructions-grid">
                <div className="instruction-item">
                  Stable Internet Connection
                </div>
                <div className="instruction-item">
                  Quiet Environment
                </div>
                <div className="instruction-item">
                  Microphone Tested
                </div>
                
              </div>
            </div>
          </div>

          <div className="action-section">
            <button onClick={handleStartInterview} className="start-button">
              <Sparkles className="button-icon animate-pulse" />
              Begin Registration
              <ArrowRight className="button-icon" />
            </button>
            
            <div className="admin-link">
              <button onClick={handleGoToAdmin} className="admin-button">
                <Settings className="button-icon" />
                Admin Dashboard
              </button>
            </div>
          </div>

        </div>
      </div>
    );
  }

  // Form Step
  if (currentStep === 'form') {
    return (
      <div className="form-container">
        <div className="background-elements">
          <div className="floating-element form-element-1"></div>
          <div className="floating-element form-element-2"></div>
        </div>
        
        <div className="main-card form-card">
          <div className="form-header">
            <h2 className="form-title">Interview Registration</h2>
            <p className="form-subtitle">Please complete your registration to proceed</p>
          </div>

          <form onSubmit={handleSubmit} className="registration-form">
            <div className="form-group">
              <label htmlFor="name" className="form-label">Full Name *</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className={`form-input ${errors.name ? 'error' : ''}`}
                placeholder="Enter your full name"
              />
              {errors.name && <p className="error-message">{errors.name}</p>}
            </div>

            <div className="form-group">
              <label htmlFor="registrationId" className="form-label">Registration ID *</label>
              <input
                type="text"
                id="registrationId"
                name="registrationId"
                value={formData.registrationId}
                onChange={handleInputChange}
                className={`form-input ${errors.registrationId ? 'error' : ''}`}
                placeholder="Enter your registration ID"
              />
              {errors.registrationId && <p className="error-message">{errors.registrationId}</p>}
            </div>

            <div className="form-group">
              <label htmlFor="email" className="form-label">Email Address *</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className={`form-input ${errors.email ? 'error' : ''}`}
                placeholder="Enter your email address"
              />
              {errors.email && <p className="error-message">{errors.email}</p>}
            </div>

            <div className="form-group">
              <label htmlFor="resume" className="form-label">Resume (.docx format only) *</label>
              <div className={`upload-area ${errors.resume ? 'error' : formData.resume ? 'success' : ''}`}>
                <input
                  type="file"
                  id="resume"
                  onChange={handleFileChange}
                  accept=".docx"
                  className="upload-input"
                />
                <div className="upload-content">
                  <Upload className={`upload-icon ${formData.resume ? 'success' : ''}`} />
                  {formData.resume ? (
                    <div>
                      <p className="upload-success-text">✅ {formData.resume.name}</p>
                      <p className="upload-success-subtext">File uploaded successfully! Click to change</p>
                    </div>
                  ) : (
                    <div>
                      <p className="upload-text">Upload Your Resume</p>
                      <p className="upload-subtext">Only .docx format accepted • Max 10MB</p>
                      <p className="upload-hint">Click or drag and drop your file here</p>
                    </div>
                  )}
                </div>
              </div>
              {errors.resume && <p className="error-message">{errors.resume}</p>}
            </div>

            <div className="submit-section">
              <button
                type="submit"
                disabled={isSubmitting}
                className="submit-button"
              >
                {isSubmitting ? (
                  <>
                    <div className="loading-spinner"></div>
                    Processing Registration...
                  </>
                ) : (
                  <>
                    <CheckCircle className="button-icon" />
                    Complete Registration
                    <ArrowRight className="button-icon" />
                  </>
                )}
              </button>
            </div>
          </form>

        </div>
      </div>
    );
  }

  // Processing Step
  if (currentStep === 'processing') {
    return (
      <div className="processing-container">
        <div className="main-card processing-card">
          <div className="processing-logo">
            <FileText className="processing-logo-icon animate-pulse" />
          </div>
          <h2 className="processing-title">Processing Your Information</h2>
          <p className="processing-subtitle">
            We're analyzing your resume and setting up your interview environment. Please wait...
          </p>
          <div className="processing-steps">
            <div className="processing-step">
              <div className="step-spinner"></div>
              📄 Extracting content from .docx file...
            </div>
            <div className="processing-step">
              <div className="step-spinner purple"></div>
              💾 Storing information in MongoDB...
            </div>
            <div className="processing-step">
              <div className="step-spinner indigo"></div>
              🎯 Preparing interview environment...
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Complete Step
  if (currentStep === 'complete') {
    return (
      <div className="complete-container">
        <div className="background-elements">
          <div className="floating-element complete-element-1"></div>
          <div className="floating-element complete-element-2"></div>
        </div>
        
        <div className="main-card complete-card">
          <div className="complete-logo">
            <CheckCircle className="complete-logo-icon animate-bounce" />
          </div>
          <h2 className="complete-title">🎉 Registration Complete!</h2>
          <p className="complete-subtitle">
            Excellent! Your information has been successfully processed and stored.
          </p>
          
          <div className="summary-box">
            <h3 className="summary-title">Registration Summary</h3>
            <div className="summary-grid">
              <div className="summary-item">
                <p className="summary-label">Full Name</p>
                <p className="summary-value">{formData.name}</p>
              </div>
              <div className="summary-item">
                <p className="summary-label">Registration ID</p>
                <p className="summary-value">{formData.registrationId}</p>
              </div>
              <div className="summary-item">
                <p className="summary-label">Email Address</p>
                <p className="summary-value">{formData.email}</p>
              </div>
              <div className="summary-item">
                <p className="summary-label">Resume Status</p>
                <p className="summary-value success">Processed & Stored</p>
              </div>
            </div>
          </div>
          
          <button onClick={handleStartActualInterview} className="interview-button">

          Start Interview Now
          <Sparkles className="button-icon animate-pulse" />
          </button>
          
        </div>
      </div>
    );
  }

  // Admin Login Step
  if (currentStep === 'admin-login') {
    return <AdminLogin onLogin={handleAdminLogin} />;
  }

  // Admin Dashboard Step
  if (currentStep === 'admin') {
    return <AdminDashboard onBack={handleAdminLogout} />;
  }

  // Interview Step
  if (currentStep === 'interview') {
    return (
      <AIInterviewInterface 
        onComplete={() => {
          // Clear session token upon interview completion
          localStorage.removeItem('interviewSessionToken');
          setSessionToken(null);
          setInterviewData(null);
          setCurrentStep('thankyou');
        }}
        onExit={() => {
          localStorage.removeItem('interviewSessionToken');
          setSessionToken(null);
          setInterviewData(null);
          setCurrentStep('exit');
        }} 
      />
    );
  }

  // Thank You Step
  if (currentStep === 'thankyou') {
    return (
      <ThankYou 
        onReturnHome={() => {
          // Ensure session is cleared and go to invitation home
          localStorage.removeItem('interviewSessionToken');
          setSessionToken(null);
          setInterviewData(null);
          setCurrentStep('invitation');
        }}
      />
    );
  }

  // Exit Step
  if (currentStep === 'exit') {
    return (
      <Exit applicantName={formData.name || 'Applicant'} />
    );
  }

  return null;
}

export default App;