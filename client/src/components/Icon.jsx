import React from 'react';

/* Hand-authored icon set — one consistent stroke (1.75, round caps),
   24x24 viewBox. No emoji, no icon-font, no third-party icon library. */

const base = (size, className, children, extra = {}) => (
  <svg
    className={`icon ${className || ''}`}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
    {...extra}
  >
    {children}
  </svg>
);

export const Mic = ({ size = 20, className }) => base(size, className, (
  <>
    <rect x="9" y="2.5" width="6" height="11" rx="3" />
    <path d="M5 11a7 7 0 0 0 14 0" />
    <path d="M12 18v3.5M8.5 21.5h7" />
  </>
));

export const MicOff = ({ size = 20, className }) => base(size, className, (
  <>
    <path d="M9 4.5a3 3 0 0 1 6 0V11a3 3 0 0 1-.34 1.4" />
    <path d="M5 11a7 7 0 0 0 10.6 6" />
    <path d="M19 11a6.98 6.98 0 0 1-1 3.6" />
    <path d="M12 18v3.5M8.5 21.5h7" />
    <path d="M3 3l18 18" />
  </>
));

export const Speaker = ({ size = 18, className }) => base(size, className, (
  <>
    <path d="M4 9.5h3.2L12 5.8v12.4L7.2 14.5H4z" />
    <path d="M16 8.2a5 5 0 0 1 0 7.6M18.6 5.8a9 9 0 0 1 0 12.4" />
  </>
));

export const Sun = ({ size = 18, className }) => base(size, className, (
  <>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2.5v2.2M12 19.3v2.2M4.9 4.9l1.55 1.55M17.55 17.55l1.55 1.55M2.5 12h2.2M19.3 12h2.2M4.9 19.1l1.55-1.55M17.55 6.45l1.55-1.55" />
  </>
));

export const Moon = ({ size = 18, className }) => base(size, className, (
  <path d="M20 14.2A8.5 8.5 0 1 1 9.8 4a6.8 6.8 0 0 0 10.2 10.2z" />
));

export const Check = ({ size = 16, className }) => base(size, className, (
  <path d="M4.5 12.5l4.5 4.5L19.5 6.5" />
));

export const AlertFlag = ({ size = 16, className }) => base(size, className, (
  <>
    <path d="M12 3v13" />
    <circle cx="12" cy="19.5" r="1.1" fill="currentColor" stroke="none" />
  </>
));

export const Clock = ({ size = 16, className }) => base(size, className, (
  <>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </>
));

export const Cloud = ({ size = 14, className }) => base(size, className, (
  <path d="M7.5 17.5a4 4 0 0 1-.4-8 5 5 0 0 1 9.6-1.6A4.2 4.2 0 0 1 16.5 17.5h-9z" />
));

export const Upload = ({ size = 18, className }) => base(size, className, (
  <>
    <path d="M12 15.5V4M7.5 8.5L12 4l4.5 4.5" />
    <path d="M4.5 16v2.5A2.5 2.5 0 0 0 7 21h10a2.5 2.5 0 0 0 2.5-2.5V16" />
  </>
));

export const FileText = ({ size = 18, className }) => base(size, className, (
  <>
    <path d="M6.5 2.5h8L19 7v13.5a1 1 0 0 1-1 1H6.5a1 1 0 0 1-1-1v-17a1 1 0 0 1 1-1z" />
    <path d="M14.5 2.5V7H19" />
    <path d="M8.5 12h7M8.5 15.5h7M8.5 8.5h3" />
  </>
));

export const Printer = ({ size = 16, className }) => base(size, className, (
  <>
    <path d="M7 8.5V3.5h10v5" />
    <rect x="3.5" y="8.5" width="17" height="8" rx="1.2" />
    <path d="M7 15h10v6H7z" />
  </>
));

export const X = ({ size = 16, className }) => base(size, className, (
  <path d="M5 5l14 14M19 5L5 19" />
));

export const Link = ({ size = 14, className }) => base(size, className, (
  <>
    <path d="M9.5 13.5l5-5" />
    <path d="M11.5 6.5l1.2-1.2a3.2 3.2 0 0 1 4.6 4.6l-2 2" />
    <path d="M12.5 17.5l-1.2 1.2a3.2 3.2 0 0 1-4.6-4.6l2-2" />
  </>
));

export const TrendUp = ({ size = 16, className }) => base(size, className, (
  <>
    <path d="M4 16l5.5-6 4 3.5L20 6" />
    <path d="M15 6h5v5" />
  </>
));

export const Stamp = ({ size = 16, className }) => base(size, className, (
  <>
    <rect x="4.5" y="4.5" width="15" height="15" rx="1.5" />
    <path d="M9 12.5l2 2.2 4-4.7" />
  </>
));

export const Spinner = ({ size = 18, className }) => base(size, className, (
  <path d="M12 3.5a8.5 8.5 0 1 0 8.5 8.5" />
), { className: `icon spin ${className || ''}` });

export const Dot = ({ size = 8, className }) => (
  <svg className={`icon ${className || ''}`} width={size} height={size} viewBox="0 0 8 8" aria-hidden="true" focusable="false">
    <circle cx="4" cy="4" r="4" fill="currentColor" />
  </svg>
);

export const Trash = ({ size = 15, className }) => base(size, className, (
  <>
    <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14zM10 11v6M14 11v6" />
  </>
));

export const Briefcase = ({ size = 18, className }) => base(size, className, (
  <>
    <rect x="3.5" y="6.5" width="17" height="14" rx="1.5" />
    <path d="M8.5 6.5V4a1.5 1.5 0 0 1 1.5-1.5h4a1.5 1.5 0 0 1 1.5 1.5v2.5M3.5 11.5h17" />
  </>
));
