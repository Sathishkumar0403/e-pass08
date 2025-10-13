import React from 'react';
import { FaExclamationTriangle, FaHome } from 'react-icons/fa';

function NotFound() {
  return (
    <div style={{
      minHeight: '60vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #e0e7ff 0%, #f1f5f9 100%)',
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 18,
        boxShadow: '0 8px 32px rgba(30, 58, 138, 0.10), 0 1.5px 6px rgba(30,58,138,0.06)',
        border: '2px solid #dbeafe',
        padding: '36px 30px 30px 30px',
        maxWidth: 400,
        width: '100%',
        textAlign: 'center',
        animation: 'fadeIn 0.7s cubic-bezier(.39,.575,.565,1) both',
      }}>
        <h2 style={{ color: '#1e3a8a', fontWeight: 800, fontSize: '2rem', marginBottom: 8, position: 'relative' }}>
          404
          <span style={{
            display: 'block',
            margin: '10px auto 0 auto',
            width: 60,
            height: 4,
            borderRadius: 2,
            background: 'linear-gradient(90deg, #6366f1 0%, #38bdf8 100%)',
          }} />
        </h2>
        <p style={{ color: '#64748b', fontSize: '1.1rem', marginBottom: 24 }}>
          Oops! The page you are looking for does not exist.
        </p>
        <a href="/" style={{
          background: 'linear-gradient(90deg, #6366f1 0%, #38bdf8 100%)',
          color: '#fff',
          padding: '10px 32px',
          borderRadius: 8,
          fontWeight: 700,
          fontSize: '1rem',
          textDecoration: 'none',
          boxShadow: '0 2px 8px rgba(30, 58, 138, 0.08)',
          transition: 'background 0.2s, color 0.2s, transform 0.15s',
          display: 'inline-block',
        }}><span style={{display:'inline-flex',alignItems:'center'}}><FaHome style={{ marginRight: 8, verticalAlign: 'middle' }} />Go Home</span></a>
      </div>
      <style>{`
        @keyframes fadeIn {
          0% { opacity: 0; transform: translateY(30px); }
          100% { opacity: 1; transform: none; }
        }
      `}</style>
    </div>
  );
}

export default NotFound;