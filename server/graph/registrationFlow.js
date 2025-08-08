const { StateGraph, START, END } = require('@langchain/langgraph');

function buildRegistrationGraph({ registrationAgent, resumeAgent, questionsAgent, persistAgent }) {
  const builder = new StateGraph({ channels: {} });

  builder.addNode('registrationAgent', registrationAgent);
  builder.addNode('resumeAgent', resumeAgent);
  builder.addNode('questionsAgent', questionsAgent);
  builder.addNode('persistAgent', persistAgent);

  builder.addEdge(START, 'registrationAgent');
  builder.addEdge('registrationAgent', 'resumeAgent');
  builder.addEdge('resumeAgent', 'questionsAgent');
  builder.addEdge('questionsAgent', 'persistAgent');
  builder.addEdge('persistAgent', END);

  return builder.compile();
}

module.exports = { buildRegistrationGraph };


