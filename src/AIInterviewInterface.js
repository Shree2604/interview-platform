import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, RotateCcw, Mic, Square, RefreshCw, Send, ArrowRight } from 'lucide-react';
import './AIInterviewInterface.css';

const AIInterviewInterface = ({ onComplete, onExit }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [userTranscript, setUserTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [currentQuestion, setCurrentQuestion] = useState(1);
  const [isReadingTranscript, setIsReadingTranscript] = useState(false);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const [recordingError, setRecordingError] = useState('');
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [debugInfo, setDebugInfo] = useState('');
  
  // Speech Recognition refs
  const recognitionRef = useRef(null);
  const recordingTimerRef = useRef(null);
  const retryCountRef = useRef(0);
  const maxRetries = 3;
  
  // Questions data
  const questions = [
    {
      id: 1,
      audio: "Hello, Thank you for joining us today. School Professionals staffs substitute teachers in Charter, Private, and Independent schools, as well as NYC’s Pre-K for All (UPK) program. We work with schools across all five boroughs, offering both short- and long-term assignments, and you choose which fit your schedule. The only requirement is working at least four days per month. This is a great way to gain classroom experience while working at different schools. Are you interested in moving forward?",
      text: "Hello, Thank you for joining us today. School Professionals staffs substitute teachers in Charter, Private, and Independent schools, as well as NYC’s Pre-K for All (UPK) program. We work with schools across all five boroughs, offering both short- and long-term assignments, and you choose which fit your schedule. The only requirement is working at least four days per month. This is a great way to gain classroom experience while working at different schools. Are you interested in moving forward?"
    },
    {
      id: 2,
      audio: "How did you hear about us?",
      text: "How did you hear about us?"
    }
  ];

  // Capture interview start on mount
  useEffect(() => {
    const token = localStorage.getItem('interviewSessionToken');
    if (!token) return;
    fetch('http://localhost:5000/api/interview/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionToken: token })
    }).catch(() => {});
  }, []);

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Initialize Speech Recognition with robust error handling
  useEffect(() => {
    const initializeSpeechRecognition = () => {
      try {
        setDebugInfo('Initializing speech recognition...');
        
        // Check browser support
        if (!window.SpeechRecognition && !window.webkitSpeechRecognition) {
          setRecordingError('Speech recognition not supported in this browser. Please use Chrome, Edge, or Safari.');
          setDebugInfo('Speech recognition not supported');
          return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognitionRef.current = new SpeechRecognition();
        
        // Configure recognition settings
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'en-US';
        recognitionRef.current.maxAlternatives = 1;
        
        setDebugInfo('Speech recognition configured');
        
        // Event handlers
        recognitionRef.current.onstart = () => {
          console.log('Speech recognition started successfully');
          setDebugInfo('Recognition started');
          setIsRecording(true);
          setRecordingError('');
          retryCountRef.current = 0;
          startRecordingTimer();
        };
        
        recognitionRef.current.onresult = (event) => {
          console.log('Speech recognition result received:', event);
          setDebugInfo('Result received');
          
          let interimTranscript = '';
          let finalTranscript = '';
          
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript;
            } else {
              interimTranscript += transcript;
            }
          }
          
          // Update interim transcript for live feedback
          setInterimTranscript(interimTranscript);
          
          // Append final transcript to main transcript
          if (finalTranscript) {
            setUserTranscript(prev => {
              const newTranscript = prev + (prev ? ' ' : '') + finalTranscript;
              console.log('Final transcript added:', finalTranscript);
              setDebugInfo(`Transcript: ${newTranscript}`);
              return newTranscript;
            });
          }
        };
        
        recognitionRef.current.onerror = (event) => {
          console.error('Speech recognition error:', event.error);
          setDebugInfo(`Error: ${event.error}`);
          handleRecognitionError(event.error);
        };
        
        recognitionRef.current.onend = () => {
          console.log('Speech recognition ended');
          setDebugInfo('Recognition ended');
          stopRecordingTimer();
          setIsRecording(false);
          setIsProcessingAudio(false);
          
          // Auto-restart if recording was intended to continue
          if (isRecording && retryCountRef.current < maxRetries) {
            console.log('Auto-restarting recognition...');
            setDebugInfo('Auto-restarting...');
            setTimeout(() => {
              startRecording();
            }, 1000);
          }
        };
        
        console.log('Speech recognition initialized successfully');
        setDebugInfo('Speech recognition ready');
        
      } catch (error) {
        console.error('Failed to initialize speech recognition:', error);
        setRecordingError('Failed to initialize speech recognition. Please refresh the page and try again.');
        setDebugInfo(`Init error: ${error.message}`);
      }
    };

    initializeSpeechRecognition();
  }, []);

  // Handle different types of recognition errors
  const handleRecognitionError = (errorType) => {
    let errorMessage = '';
    
    switch (errorType) {
      case 'network':
        errorMessage = 'Network error. Please check your internet connection and try again.';
        break;
      case 'not-allowed':
        errorMessage = 'Microphone access denied. Please allow microphone permissions and try again.';
        break;
      case 'no-speech':
        errorMessage = 'No speech detected. Please speak more clearly.';
        break;
      case 'audio-capture':
        errorMessage = 'Audio capture error. Please check your microphone and try again.';
        break;
      case 'service-not-allowed':
        errorMessage = 'Speech recognition service not allowed. Please try again.';
        break;
      case 'bad-grammar':
        errorMessage = 'Speech recognition grammar error. Please try again.';
        break;
      case 'language-not-supported':
        errorMessage = 'Language not supported. Please try again.';
        break;
      default:
        errorMessage = `Recording error: ${errorType}. Please try again.`;
    }
    
    setRecordingError(errorMessage);
    setIsRecording(false);
    setIsProcessingAudio(false);
    stopRecordingTimer();
  };

  // Recording timer functions
  const startRecordingTimer = () => {
    setRecordingDuration(0);
    recordingTimerRef.current = setInterval(() => {
      setRecordingDuration(prev => prev + 1);
    }, 1000);
  };

  const stopRecordingTimer = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setRecordingDuration(0);
  };

  // Format recording duration
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Audio playback simulation
  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
    if (!isPlaying) {
      const utterance = new SpeechSynthesisUtterance(questions[currentQuestion - 1].text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 1;
      
      utterance.onend = () => {
        setIsPlaying(false);
      };
      
      window.speechSynthesis.speak(utterance);
    } else {
      window.speechSynthesis.cancel();
    }
  };

  const handleRelisten = () => {
    setIsPlaying(true);
    const utterance = new SpeechSynthesisUtterance(questions[currentQuestion - 1].text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;
    
    utterance.onend = () => {
      setIsPlaying(false);
    };
    
    window.speechSynthesis.speak(utterance);
  };

  const handleViewQuestion = () => {
    setIsFlipped(!isFlipped);
  };

  // Simplified start recording function
  const startRecording = async () => {
    try {
      setDebugInfo('Starting recording...');
      
      // Check network status
      if (!isOnline) {
        setRecordingError('No internet connection. Speech recognition requires an internet connection.');
        setDebugInfo('Offline - cannot record');
        return;
      }

      // Check if already recording or processing
      if (isRecording || isProcessingAudio) {
        console.log('Already recording or processing, ignoring start request');
        setDebugInfo(isRecording ? 'Already recording' : 'Processing in progress');
        return;
      }

      // Reset states
      setUserTranscript('');
      setInterimTranscript('');
      setRecordingError('');
      
      // Set processing state before starting the recording
      setIsProcessingAudio(true);
      retryCountRef.current = 0;

      setDebugInfo('Checking microphone permissions...');

      // Check microphone permissions first
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            sampleRate: 16000,
            channelCount: 1,
            volume: 1.0,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          } 
        });
        
        // Stop the stream immediately as we only needed permission
        stream.getTracks().forEach(track => track.stop());
        console.log('Microphone permission granted');
        setDebugInfo('Microphone permission granted');
        
      } catch (permissionError) {
        console.error('Microphone permission denied:', permissionError);
        setRecordingError('Microphone access denied. Please allow microphone permissions and try again.');
        setDebugInfo('Microphone permission denied');
        setIsProcessingAudio(false);
        return;
      }

      // Start speech recognition
      if (recognitionRef.current) {
        try {
          setDebugInfo('Starting speech recognition...');
          recognitionRef.current.start();
          console.log('Speech recognition start requested');
          // Note: isRecording will be set to true in the onstart handler
        } catch (startError) {
          console.error('Failed to start speech recognition:', startError);
          setRecordingError('Failed to start recording. Please try again.');
          setDebugInfo(`Start error: ${startError.message}`);
          setIsProcessingAudio(false);
        }
      } else {
        setRecordingError('Speech recognition not available. Please refresh the page.');
        setDebugInfo('Recognition not available');
        setIsProcessingAudio(false);
      }
      
    } catch (error) {
      console.error('Error in startRecording:', error);
      setRecordingError(`Recording error: ${error.message}. Please try again.`);
      setDebugInfo(`Recording error: ${error.message}`);
      setIsProcessingAudio(false);
    }
  };

  // Enhanced stop recording
  const stopRecording = () => {
    console.log('Stopping recording...');
    setDebugInfo('Stopping recording...');
    
    // Only proceed if we're actually recording
    if (!isRecording) {
      console.log('Not currently recording, ignoring stop request');
      setDebugInfo('Not currently recording');
      return;
    }
    
    // Set processing state before stopping
    setIsProcessingAudio(true);
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.error('Error stopping speech recognition:', error);
        setDebugInfo(`Stop error: ${error.message}`);
        // Even if there's an error, we should clean up
        setIsRecording(false);
        setIsProcessingAudio(false);
      }
    } else {
      // If for some reason recognitionRef is null, still clean up
      setIsRecording(false);
      setIsProcessingAudio(false);
      stopRecordingTimer();
      setInterimTranscript('');
    }
  };

  const retakeRecording = () => {
    console.log('Retaking recording...');
    setDebugInfo('Retaking recording...');
    setUserTranscript('');
    setInterimTranscript('');
    setRecordingError('');
    retryCountRef.current = 0;
    setIsProcessingAudio(false);
    
    // Stop any ongoing speech synthesis
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsReadingTranscript(false);
    }
    
    // Stop any ongoing recording
    if (isRecording) {
      stopRecording();
    }
  };

  const handleSubmitAndProceed = async () => {
    if (!userTranscript) return;
    // Retrieve session token from localStorage
    const sessionToken = localStorage.getItem('interviewSessionToken');
    const questionIndex = currentQuestion - 1;
    const questionText = questions[questionIndex]?.text;

    if (!sessionToken) {
      alert('Session not found. Please refresh the page and start the interview again.');
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/interview/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionToken,
          answer: userTranscript,
          questionIndex,
          questionText
        })
      });
      let result = {};
      try {
        result = await response.json();
      } catch (e) {
        // Non-JSON response
      }
      if (!response.ok || !result.success) {
        const message = result?.error || `Failed to save answer (HTTP ${response.status}). Please try again.`;
        alert(message);
        return;
      }
      // Branching after first question based on affirmative intent
      if (currentQuestion === 1) {
        // Ask server to classify yes/no intent with LLM + heuristics fallback
        try {
          const resp = await fetch('http://localhost:5000/api/nlu/yesno', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: userTranscript })
          });
          const cls = await resp.json().catch(() => ({ label: 'unclear', confidence: 0 }));
          const label = (cls && cls.label) ? String(cls.label) : 'unclear';
          if (label !== 'yes') {
            if (typeof onExit === 'function') onExit();
            return;
          }
        } catch (_) {
          // If classification API fails, use heuristic
          const t = (userTranscript || '').toLowerCase();
          const isAffirmative = /(\byes\b|\byeah\b|\byep\b|\bok\b|\bokay\b|\bsure\b|\binterested\b|\bof course\b|\byup\b|\bye\b|\bcorrect\b|\bmhm\b|uh-huh)/i.test(t);
          if (!isAffirmative) {
            if (typeof onExit === 'function') onExit();
            return;
          }
        }
      }

      // Only proceed if save was successful and not exiting
      if (currentQuestion < questions.length) {
        setCurrentQuestion(currentQuestion + 1);
        setIsFlipped(false);
        setUserTranscript('');
        setInterimTranscript('');
        setRecordingError('');
        retryCountRef.current = 0;
        setIsReadingTranscript(false);
        setIsProcessingAudio(false);
        if (window.speechSynthesis) {
          window.speechSynthesis.cancel();
        }
        if (isRecording) {
          stopRecording();
        }
      } else {
        // Mark interview as completed (capture end time)
        try {
          await fetch('http://localhost:5000/api/interview/complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionToken })
          });
        } catch (e) {
          // Non-blocking
        }
        if (typeof onComplete === 'function') onComplete();
        else alert('Interview completed! Thank you for your responses.');
      }
    } catch (error) {
      alert('Network error: Could not save answer. Please try again.');
    }
  };

  // Text-to-Speech for reading transcript
  const readTranscript = () => {
    if (!userTranscript) return;
    
    if (isReadingTranscript) {
      window.speechSynthesis.cancel();
      setIsReadingTranscript(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(userTranscript);
    utterance.rate = 0.8;
    utterance.pitch = 1;
    utterance.volume = 1;
    
    utterance.onstart = () => {
      setIsReadingTranscript(true);
    };
    
    utterance.onend = () => {
      setIsReadingTranscript(false);
    };
    
    utterance.onerror = () => {
      setIsReadingTranscript(false);
    };

    window.speechSynthesis.speak(utterance);
  };

  

  return (
    <div className={`ai-interview-container dark`}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="app-header">
          <div className="header-content">
            <h1 className="app-title">AI Based Interview Screening Process</h1>
            
          </div>
        </div>

        <div className="panels-container">
          {/* Left Panel - AI Agent */}
          <div className={`panel ai-panel dark`}>
            
            {/* Card Container */}
            <div className="card-container">
              <div className={`card-3d ${isFlipped ? 'flipped' : ''}`}>
                {/* Front of Card - AI Agent */}
                <div className="card-face card-front">
                  <div className="agent-avatar">
                    <div className="agent-icon">🤖</div>
                  </div>
                  <p className="agent-title">AI Interview Agent</p>
                </div>
                
                {/* Back of Card - Question Text */}
                <div className={`card-face card-back dark`}>
                  <div className="question-content">
                    <div className="question-number">Question {currentQuestion}</div>
                    <h3 className="question-title">{questions[currentQuestion - 1]?.text}</h3>
                    <div className="question-decoration"></div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* AI Agent Controls */}
            <div className="controls-container">
              <div className="primary-controls">
                <button
                  onClick={handlePlayPause}
                  className={`control-btn primary ${isPlaying ? 'playing' : ''}`}
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                  <span>{isPlaying ? 'Pause' : 'Play Question'}</span>
                </button>
                
                <button
                  onClick={handleRelisten}
                  className="control-btn secondary"
                  title="Relisten"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
              </div>
              
              <button
                onClick={handleViewQuestion}
                className="control-btn accent"
              >
                <span>{isFlipped ? 'Show Agent' : 'View Question'}</span>
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {/* Right Panel - User Response */}
          <div className={`panel user-panel dark`}>
            <h2 className="panel-title"></h2>
            
            {/* User Avatar */}
            <div className="user-avatar">
              <div className="user-icon">👤</div>
            </div>
            
            {/* Voice Input Controls */}
            <div className="voice-input-section">
              <div className="voice-input-header"></div>
              
              <div className="recording-controls">
                <div className="controls-row">
                  <button
                    onClick={startRecording}
                    disabled={isRecording || isProcessingAudio || !isOnline}
                    className={`control-btn record ${isRecording || isProcessingAudio ? 'disabled' : ''}`}
                  >
                    <Mic className="w-5 h-5" />
                    <span>Start Recording</span>
                  </button>
                  
                  <button
                    onClick={stopRecording}
                    disabled={!isRecording}
                    className={`control-btn stop ${!isRecording ? 'disabled' : ''}`}
                  >
                    <Square className="w-5 h-5" />
                    <span>Stop Recording</span>
                  </button>
                  
                  <button
                    onClick={retakeRecording}
                    disabled={isProcessingAudio}
                    className={`control-btn retake ${isProcessingAudio ? 'disabled' : ''}`}
                  >
                    <RefreshCw className="w-5 h-5" />
                    <span>Retake</span>
                  </button>

                  {(isRecording || isProcessingAudio) && (
                    <div className="status-indicator inline-status">
                      <div className="status-dot"></div>
                      <span className="status-text">
                        {isRecording 
                          ? `Recording... ${formatDuration(recordingDuration)}` 
                          : 'Processing audio...'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              
              {recordingError && (
                <div className="error-indicator">
                  <span className="error-text">{recordingError}</span>
                </div>
              )}
            </div>
            
            {/* Transcript Section - Always Visible */}
            <div className="transcript-section">
              
              <div className={`transcript-container dark`}>
                <div className="transcript-header">
                  <h4 className="transcript-title">Your Response Transcript:</h4>
                  {isReadingTranscript && (
                    <div className="reading-indicator">
                      <div className="reading-dot"></div>
                      <span>Reading...</span>
                    </div>
                  )}
                </div>
                <div className="transcript-text">
                  {userTranscript + (interimTranscript ? ' ' + interimTranscript : '') || 'No transcript available. Please start recording your response first.'}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Submit Button - At Bottom of Page */}
        <div className="submit-section-bottom">
          <button
            onClick={handleSubmitAndProceed}
            disabled={!userTranscript}
            className={`submit-btn-bottom ${userTranscript ? 'enabled' : 'disabled'}`}
          >
            <Send className="w-6 h-6" />
            <span>Submit & Proceed </span>
            <ArrowRight className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIInterviewInterface;