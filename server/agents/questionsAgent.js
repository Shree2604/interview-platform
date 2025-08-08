function createQuestionsAgent({ generateInterviewQuestions, logger = console }) {
  return async function questionsAgent(state) {
    const nextState = { ...state };
    try {
      if (!nextState.validationOk) return nextState;
      nextState.questions = generateInterviewQuestions();
      return nextState;
    } catch (err) {
      logger.error('[questionsAgent] error:', err);
      nextState.error = err.message || 'Questions generation failed';
      return nextState;
    }
  };
}

module.exports = { createQuestionsAgent };

