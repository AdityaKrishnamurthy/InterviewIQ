import React from 'react';
import { Link } from 'react-router-dom';

const Logo = ({ size = 28, showText = true, to = '/dashboard' }) => {
  const icon = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0, verticalAlign: 'middle' }}
    >
      <defs>
        <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6C63FF" />
          <stop offset="100%" stopColor="#00D4AA" />
        </linearGradient>
        <linearGradient id="logoBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1A1A2E" />
          <stop offset="100%" stopColor="#0F0F1A" />
        </linearGradient>
      </defs>

      <rect width="64" height="64" rx="16" fill="url(#logoBg)" stroke="var(--border-color)" strokeWidth="2" />
      <rect x="3" y="3" width="58" height="58" rx="14" stroke="url(#logoGrad)" strokeWidth="1.5" strokeOpacity="0.7" />
      <path
        d="M20 32C20 25.3726 25.3726 20 32 20C38.6274 20 44 25.3726 44 32C44 38.6274 38.6274 44 32 44"
        stroke="url(#logoGrad)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="32" cy="32" r="4" fill="#00D4AA" />
      <circle cx="24" cy="32" r="2.5" fill="#6C63FF" />
      <circle cx="40" cy="32" r="2.5" fill="#6C63FF" />
      <path d="M30 14L34 22H29L33 30" stroke="#00D4AA" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M31 34L35 42H30L34 50" stroke="#6C63FF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  if (!showText) {
    return to ? <Link to={to} style={{ display: 'inline-flex', alignItems: 'center' }}>{icon}</Link> : icon;
  }

  const content = (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.65rem', textDecoration: 'none' }}>
      {icon}
      <span style={{
        fontSize: size > 24 ? '1.35rem' : '1.15rem',
        fontWeight: 800,
        letterSpacing: '-0.02em',
        color: 'var(--text-primary)',
        lineHeight: 1,
      }}>
        Interview<span style={{ color: 'var(--primary)' }}>IQ</span>
      </span>
    </div>
  );

  return to ? (
    <Link to={to} style={{ textDecoration: 'none', color: 'inherit' }}>
      {content}
    </Link>
  ) : (
    content
  );
};

export default Logo;
