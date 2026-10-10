"use client";

interface CurtainIllustrationProps {
  openPercent: number;
  className?: string;
}

export function CurtainIllustration({ openPercent, className = "" }: CurtainIllustrationProps) {
  // Clamp percentage between 0 and 100
  const percent = Math.max(0, Math.min(100, openPercent));
  
  // Calculate curtain position (0% = closed at center, 100% = fully open at sides)
  const curtainOffset = (percent / 100) * 45;
  
  return (
    <svg 
      viewBox="0 0 200 120" 
      className={`w-full ${className}`}
      role="img"
      aria-label={`Curtain ${percent}% open`}
    >
      {/* Window frame - thin vertical lines inspired by facade */}
      <g stroke="var(--curtain-frame)" strokeWidth="1" fill="none">
        {/* Outer frame */}
        <rect x="10" y="10" width="180" height="100" rx="1" />
        
        {/* Vertical frame dividers */}
        <line x1="50" y1="10" x2="50" y2="110" />
        <line x1="100" y1="10" x2="100" y2="110" />
        <line x1="150" y1="10" x2="150" y2="110" />
        
        {/* Horizontal dividers */}
        <line x1="10" y1="40" x2="190" y2="40" />
        <line x1="10" y1="75" x2="190" y2="75" />
      </g>
      
      {/* Curtain rod */}
      <line 
        x1="15" y1="15" x2="185" y2="15" 
        stroke="var(--brass)" 
        strokeWidth="2"
        strokeLinecap="round"
      />
      
      {/* Left curtain panel */}
      <g 
        style={{ 
          transform: `translateX(-${curtainOffset}px)`,
          transition: 'transform 300ms ease-in-out'
        }}
      >
        <path
          d={`M 15 15 
              Q 20 60, 15 105 
              L 100 105 
              Q 95 60, 100 15 
              Z`}
          fill="var(--curtain-panel)"
          stroke="var(--curtain-highlight)"
          strokeWidth="0.5"
          opacity="0.9"
        />
        {/* Curtain folds */}
        <path
          d="M 30 15 Q 35 60, 30 105"
          stroke="var(--border)"
          strokeWidth="0.5"
          fill="none"
        />
        <path
          d="M 55 15 Q 60 60, 55 105"
          stroke="var(--border)"
          strokeWidth="0.5"
          fill="none"
        />
        <path
          d="M 80 15 Q 85 60, 80 105"
          stroke="var(--border)"
          strokeWidth="0.5"
          fill="none"
        />
      </g>
      
      {/* Right curtain panel */}
      <g 
        style={{ 
          transform: `translateX(${curtainOffset}px)`,
          transition: 'transform 300ms ease-in-out'
        }}
      >
        <path
          d={`M 100 15 
              Q 105 60, 100 105 
              L 185 105 
              Q 180 60, 185 15 
              Z`}
          fill="var(--curtain-panel)"
          stroke="var(--curtain-highlight)"
          strokeWidth="0.5"
          opacity="0.9"
        />
        {/* Curtain folds */}
        <path
          d="M 120 15 Q 115 60, 120 105"
          stroke="var(--border)"
          strokeWidth="0.5"
          fill="none"
        />
        <path
          d="M 145 15 Q 140 60, 145 105"
          stroke="var(--border)"
          strokeWidth="0.5"
          fill="none"
        />
        <path
          d="M 170 15 Q 165 60, 170 105"
          stroke="var(--border)"
          strokeWidth="0.5"
          fill="none"
        />
      </g>
    </svg>
  );
}
