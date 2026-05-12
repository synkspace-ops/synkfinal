import React from 'react';
import { useNavigate } from 'react-router-dom';

const SelectRole: React.FC = () => {
  const navigate = useNavigate();

  const roles = [
    {
      id: 'creator',
      title: 'I am a Creator',
      description: 'Join as an influencer or content creator to collaborate with brands and events.',
      icon: (
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      ),
      path: '/creator/step1',
      gradient: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
    },
    {
      id: 'brand',
      title: 'I am a Brand',
      description: 'Connect with creators to promote your products and reach new audiences.',
      icon: (
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
        </svg>
      ),
      path: '/brand/step1',
      gradient: 'linear-gradient(135deg, #3b82f6 0%, #2dd4bf 100%)',
    },
    {
      id: 'event',
      title: 'I am an Event Organiser',
      description: 'List your events and find the perfect creators for promotion and attendance.',
      icon: (
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      ),
      path: '/event/step1',
      gradient: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
    },
  ];

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <h1 style={styles.title}>Select Your Role</h1>
        <p style={styles.subtitle}>Choose how you want to join SynkSpace to get started.</p>
        <div style={styles.loginPrompt}>
          <span style={styles.loginText}>Already registered?</span>
          <button
            type="button"
            style={styles.loginButton}
            onClick={() => navigate('/login')}
          >
            Log in
          </button>
        </div>
        
        <div style={styles.grid}>
          {roles.map((role) => (
            <div 
              key={role.id} 
              style={styles.card} 
              onClick={() => navigate(role.path)}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-8px)';
                e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
              }}
            >
              <div style={{ ...styles.iconWrapper, background: role.gradient }}>
                {role.icon}
              </div>
              <h2 style={styles.cardTitle}>{role.title}</h2>
              <p style={styles.cardDescription}>{role.description}</p>
              <button style={styles.button}>Get Started</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
    padding: '40px 20px',
    fontFamily: "'Manrope', sans-serif",
  },
  content: {
    maxWidth: '1200px',
    width: '100%',
    textAlign: 'center',
  },
  title: {
    fontSize: '3rem',
    fontWeight: 800,
    color: '#0f172a',
    marginBottom: '1rem',
    letterSpacing: '-0.025em',
  },
  subtitle: {
    fontSize: '1.25rem',
    color: '#64748b',
    marginBottom: '1.5rem',
    maxWidth: '600px',
    margin: '0 auto 1.5rem',
  },
  loginPrompt: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    padding: '10px 14px',
    borderRadius: '14px',
    background: '#ffffff',
    border: '1px solid rgba(203, 213, 225, 0.9)',
    boxShadow: '0 8px 20px rgba(15, 23, 42, 0.06)',
    marginBottom: '3rem',
  },
  loginText: {
    color: '#64748b',
    fontSize: '0.95rem',
    fontWeight: 600,
  },
  loginButton: {
    border: 'none',
    background: '#0f172a',
    color: '#ffffff',
    borderRadius: '10px',
    padding: '8px 16px',
    fontSize: '0.95rem',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '30px',
    padding: '10px',
  },
  card: {
    background: '#ffffff',
    borderRadius: '24px',
    padding: '40px 30px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    border: '1px solid rgba(226, 232, 240, 0.8)',
  },
  iconWrapper: {
    width: '80px',
    height: '80px',
    borderRadius: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#ffffff',
    marginBottom: '24px',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
  },
  cardTitle: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#1e293b',
    marginBottom: '16px',
  },
  cardDescription: {
    fontSize: '1rem',
    color: '#64748b',
    lineHeight: 1.6,
    marginBottom: '32px',
    minHeight: '80px',
  },
  button: {
    padding: '12px 32px',
    borderRadius: '12px',
    background: '#0f172a',
    color: '#ffffff',
    fontWeight: 600,
    fontSize: '1rem',
    border: 'none',
    cursor: 'pointer',
    transition: 'background 0.2s',
    width: '100%',
  },
};

export default SelectRole;
