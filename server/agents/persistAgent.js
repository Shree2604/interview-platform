function createPersistAgent({ InterviewRegistration, logger = console }) {
  return async function persistAgent(state) {
    const nextState = { ...state };
    try {
      if (!nextState.validationOk) return nextState;
      if (!nextState.sessionToken) {
        const crypto = require('node:crypto');
        nextState.sessionToken = `session_${crypto.randomBytes(16).toString('hex')}`;
      }
      const registration = new InterviewRegistration({
        name: nextState.name.trim(),
        email: nextState.email.trim().toLowerCase(),
        registrationId: nextState.registrationId.trim(),
        sessionToken: nextState.sessionToken,
        status: 'processing',
        resumeData: {
          extractedText: nextState.extractedText,
          summary: nextState.summaryText
        },
        interviewData: {
          questions: (nextState.questions || []).map((q) => ({
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
      nextState.registration = registration;
      return nextState;
    } catch (err) {
      logger.error('[persistAgent] error:', err);
      nextState.error = err.message || 'Persistence failed';
      return nextState;
    }
  };
}

module.exports = { createPersistAgent };

