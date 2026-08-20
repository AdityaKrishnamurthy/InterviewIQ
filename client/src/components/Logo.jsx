import React from 'react';
import { Link } from 'react-router-dom';

/* An official seal, not a tech gradient orb — the mark for "the record". */
const Logo = ({ size = 28, showText = true, to = '/dashboard' }) => {
  const icon = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0, verticalAlign: 'middle' }}
      aria-hidden="true"
    >
      <circle cx="24" cy="24" r="21.5" stroke="var(--seal)" strokeWidth="2" />
      <circle cx="24" cy="24" r="17.5" stroke="var(--seal)" strokeWidth="1" strokeDasharray="1.5 3" opacity="0.7" />
      <path
        d="M15 28.5V19.5C15 18.4 15.9 17.5 17 17.5H31C32.1 17.5 33 18.4 33 19.5V28.5"
        stroke="var(--ink)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M12.5 28.5H35.5" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" />
      <path d="M19.5 22.5L22.5 25.5L28.5 19" stroke="var(--seal)" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  if (!showText) {
    return to ? <Link to={to} style={{ display: 'inline-flex', alignItems: 'center' }}>{icon}</Link> : icon;
  }

  const content = (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.6rem', textDecoration: 'none' }}>
      {icon}
      <span style={{
        fontFamily: 'var(--font-display)',
        fontSize: size > 24 ? '1.3rem' : '1.1rem',
        fontWeight: 700,
        letterSpacing: '-0.01em',
        color: 'var(--ink)',
        lineHeight: 1,
      }}>
        Interview<span style={{ color: 'var(--seal)' }}>IQ</span>
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
