type IconProps = { className?: string };

const base = "h-6 w-6";

export function CalendarIcon({ className = base }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <rect x="3" y="4.5" width="18" height="16" rx="2.5" />
      <path d="M3 9h18M8 3v3M16 3v3" strokeLinecap="round" />
    </svg>
  );
}

export function TicketIcon({ className = base }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v2a2 2 0 0 0 0 5v2A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5v-2a2 2 0 0 0 0-5v-2Z" />
      <path d="M14 5v14" strokeDasharray="1.5 2.5" strokeLinecap="round" />
    </svg>
  );
}

export function ChatIcon({ className = base }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-4 3.5V17H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" strokeLinejoin="round" />
    </svg>
  );
}

export function UserIcon({ className = base }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <circle cx="12" cy="8.5" r="3.75" />
      <path d="M4.5 20c1.4-3.7 4.2-5.5 7.5-5.5s6.1 1.8 7.5 5.5" strokeLinecap="round" />
    </svg>
  );
}

export function SparkleIcon({ className = base }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden>
      <path d="M12 4v16M4 12h16" strokeLinecap="round" />
    </svg>
  );
}

export function ToolIcon({ className = base }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M12 3v4M12 17v4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M3 12h4M17 12h4M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" strokeLinecap="round" />
      <circle cx="12" cy="12" r="3.2" />
    </svg>
  );
}

export function UsersIcon({ className = base }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <circle cx="9" cy="8" r="3.25" />
      <path d="M3.5 19c1.1-3 3.3-4.5 5.5-4.5S13.4 16 14.5 19" strokeLinecap="round" />
      <path d="M16 5.5a3 3 0 0 1 0 5.8M17.5 18.5c-.5-2-1.7-3.3-3-4" strokeLinecap="round" />
    </svg>
  );
}

export function ChartIcon({ className = base }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M4 20V4M4 20h16" strokeLinecap="round" />
      <rect x="7" y="12" width="3.2" height="5" rx="0.6" />
      <rect x="12.4" y="8" width="3.2" height="9" rx="0.6" />
      <rect x="17.8" y="14" width="3.2" height="3" rx="0.6" />
    </svg>
  );
}

export function GiftIcon({ className = base }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M4 11h16v9H4zM3 7h18v4H3zM12 7v13" strokeLinejoin="round" />
      <path d="M12 7S10.5 3.5 8.5 4.2 8 7 8 7h4Zm0 0s1.5-3.5 3.5-2.8S16 7 16 7h-4Z" strokeLinejoin="round" />
    </svg>
  );
}
