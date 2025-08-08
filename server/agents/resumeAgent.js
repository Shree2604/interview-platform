function createResumeAgent({ summarizeResumeWithLLM, logger = console }) {
  return async function resumeAgent(state) {
    const nextState = { ...state };
    try {
      if (!nextState.validationOk) return nextState;
      const raw = String(nextState.extractedText || '');
      let summary = '';
      try {
        summary = await summarizeResumeWithLLM(raw);
      } catch (e) {
        // Fallback if LM Studio is unavailable
        summary = '';
      }
      if (!summary || !summary.trim()) {
        const compact = raw.replace(/\s+/g, ' ').trim();
        summary = compact ? compact.slice(0, 400) + (compact.length > 400 ? '…' : '') : 'Resume submitted. Summary unavailable.';
      }
      nextState.summaryText = summary;
      return nextState;
    } catch (err) {
      logger.error('[resumeAgent] error:', err);
      // Do not fail the flow; provide a robust fallback
      const raw = String(nextState.extractedText || '');
      const compact = raw.replace(/\s+/g, ' ').trim();
      nextState.summaryText = compact ? compact.slice(0, 400) + (compact.length > 400 ? '…' : '') : 'Resume submitted. Summary unavailable.';
      return nextState;
    }
  };
}

module.exports = { createResumeAgent };

