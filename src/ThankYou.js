import React from 'react';
import './ThankYou.css';

function ThankYou({ onReturnHome }) {
  return (
    <div className="thankyou-container">
      <div className="thankyou-card">
        <div className="thankyou-header">🎉</div>
        <h1 className="thankyou-title">Great job — you’ve completed the interview!</h1>
        <p className="thankyou-subtitle">
          Your responses have been recorded. We appreciate your interest and look forward to getting back to you.
        </p>
        <div className="thankyou-actions">
          <button className="thankyou-btn" onClick={() => {
            try {
              localStorage.removeItem('interviewSessionToken');
            } catch {}
            if (typeof onReturnHome === 'function') {
              onReturnHome();
            } else {
              window.location.href = '/';
            }
          }}>Return to Home</button>
        </div>
      </div>
    </div>
  );
}

export default ThankYou;


