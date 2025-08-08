import React from 'react';
import './Exit.css';

const Exit = ({ applicantName = 'Applicant' }) => {
  return (
    <div className="exit-container">
      <div className="exit-card">
        <h1 className="exit-title">Thanks again for your time, {applicantName}!</h1>
        <p className="exit-text">
          At this moment, we won’t be moving forward in the process. We truly appreciate your interest in working with
          School Professionals.
        </p>
        <p className="exit-text">
          Please feel free to check back with us in the future if your availability or experience changes. Wishing you all
          the best in your journey ahead!
        </p>
      </div>
    </div>
  );
};

export default Exit;


