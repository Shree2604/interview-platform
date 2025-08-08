function createRegistrationAgent({ InterviewRegistration, logger = console }) {
  return async function registrationAgent(state) {
    const nextState = { ...state };
    try {
      if (!nextState.name || !nextState.email || !nextState.registrationId) {
        nextState.error = 'Missing required fields';
        return nextState;
      }

      const existingRegistration = await InterviewRegistration.findOne({ registrationId: nextState.registrationId });
      if (existingRegistration) {
        nextState.error = 'Registration ID already exists';
        return nextState;
      }

      const existingEmail = await InterviewRegistration.findOne({ email: nextState.email });
      if (existingEmail) {
        nextState.error = 'Email already registered';
        return nextState;
      }

      const crypto = require('node:crypto');
      nextState.sessionToken = `session_${crypto.randomBytes(16).toString('hex')}`;
      nextState.validationOk = true;
      return nextState;
    } catch (err) {
      logger.error('[registrationAgent] error:', err);
      nextState.error = err.message || 'Registration validation failed';
      return nextState;
    }
  };
}

module.exports = { createRegistrationAgent };

