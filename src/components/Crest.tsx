const GRADIENT_ID = "prevail-brass";

function leaves() {
  const out = [];
  for (let t = 0; t < 8; t++) {
    const deg = 122 + t * 17;
    const a = (deg * Math.PI) / 180;
    const x = (50 + 36 * Math.cos(a)).toFixed(1);
    const y = (54 + 36 * Math.sin(a)).toFixed(1);
    out.push(
      <ellipse key={t} cx={x} cy={y} rx="7.2" ry="3.1" transform={`rotate(${(deg + 62).toFixed(1)} ${x} ${y})`} />,
    );
  }
  return out;
}

function Branch() {
  return (
    <>
      <path d="M31 84.5 A36 36 0 0 1 32.5 22.5" fill="none" stroke={`url(#${GRADIENT_ID})`} strokeWidth="1.6" />
      {leaves()}
    </>
  );
}

/** Brass laurel crest used for the super streak. */
export function Crest({ size = 40, value }: { size?: number; value?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" className="shrink-0">
      <defs>
        <linearGradient id={GRADIENT_ID} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F1DFB2" />
          <stop offset=".45" stopColor="#C9A46A" />
          <stop offset=".7" stopColor="#8C6A3F" />
          <stop offset="1" stopColor="#D8B98A" />
        </linearGradient>
      </defs>
      <g fill={`url(#${GRADIENT_ID})`}>
        <Branch />
        <g transform="translate(100 0) scale(-1 1)">
          <Branch />
        </g>
      </g>
      <path
        d="M50 10 l2.4 5 5.4.8-3.9 3.8.9 5.4-4.8-2.6-4.8 2.6.9-5.4-3.9-3.8 5.4-.8z"
        fill={`url(#${GRADIENT_ID})`}
      />
      {value != null && (
        <text
          x="50"
          y="66"
          textAnchor="middle"
          fontFamily="var(--font-cormorant), Georgia, serif"
          fontWeight="600"
          fontSize="32"
          fill={`url(#${GRADIENT_ID})`}
        >
          {value}
        </text>
      )}
    </svg>
  );
}
