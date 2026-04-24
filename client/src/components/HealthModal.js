import React from 'react';

const HealthModal = ({ status, advice, warning, onClose }) => {
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Health Report</h2>
        <h3 className={warning ? 'warning-text' : 'success-text'}>{status}</h3>
        <p>{advice}</p>
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
};
export default HealthModal;