interface PasminLogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
}

export function PasminLogo({ size = 36, className = "", showText = false }: PasminLogoProps) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Outer diamond */}
        <polygon points="50,2 98,50 50,98 2,50" fill="currentColor" />
        {/* Inner cuts - upper facets */}
        <polygon points="50,2 70,30 50,28 30,30" fill="white" fillOpacity="0.18" />
        {/* Left facets */}
        <polygon points="2,50 30,30 28,50 30,70" fill="white" fillOpacity="0.10" />
        {/* Right facets */}
        <polygon points="98,50 70,30 72,50 70,70" fill="white" fillOpacity="0.22" />
        {/* Bottom facets */}
        <polygon points="50,98 70,70 50,72 30,70" fill="white" fillOpacity="0.14" />
        {/* Center diamond */}
        <polygon points="50,28 72,50 50,72 28,50" fill="white" fillOpacity="0.12" />
        {/* Center top highlight */}
        <polygon points="50,28 62,44 50,42 38,44" fill="white" fillOpacity="0.28" />
        {/* Small center gem */}
        <polygon points="50,42 62,50 50,58 38,50" fill="currentColor" />
        {/* Heart/bottom notch */}
        <polygon points="42,62 50,72 58,62 50,68" fill="white" fillOpacity="0.20" />
        {/* Wing lines left */}
        <line x1="28" y1="50" x2="10" y2="38" stroke="white" strokeWidth="1.5" strokeOpacity="0.3" />
        <line x1="28" y1="50" x2="10" y2="62" stroke="white" strokeWidth="1.5" strokeOpacity="0.3" />
        {/* Wing lines right */}
        <line x1="72" y1="50" x2="90" y2="38" stroke="white" strokeWidth="1.5" strokeOpacity="0.3" />
        <line x1="72" y1="50" x2="90" y2="62" stroke="white" strokeWidth="1.5" strokeOpacity="0.3" />
      </svg>
      {showText && (
        <span
          style={{ fontFamily: "serif", letterSpacing: "0.12em" }}
          className="font-bold text-current uppercase"
        >
          PASMIN
        </span>
      )}
    </div>
  );
}
