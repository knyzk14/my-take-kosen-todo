export const Logo = ({ className = "w-8 h-8" }: { className?: string }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M6 4v16" className="text-slate-800" />
      <path d="M14 4 6 12" className="text-slate-800" />
      <path d="M6 12l5 5 9-9" className="text-slate-800" />
    </svg>
  );
};