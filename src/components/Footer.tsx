import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: '#1e1e1e',
      borderTop: '1px solid #404040',
      padding: '12px 20px',
      textAlign: 'center',
      fontSize: '0.85rem',
      zIndex: 100,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      gap: '20px'
    }}>
      <a 
        href="https://docs.google.com/forms/d/e/1FAIpQLSf9Lk7QaakJrmar7HUeQwh_DZ4CE7v6lxItxBkvj6tvqImnsw/viewform"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          color: '#2196F3',
          textDecoration: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: '5px'
        }}
      >
        Submit Feedback
      </a>
    </footer>
  );
};

export default Footer;