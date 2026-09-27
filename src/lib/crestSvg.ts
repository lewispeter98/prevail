/** The brass laurel crest as a standalone SVG string (for generated app icons). */
export function crestSvg(): string {
  let leaves = "";
  for (let t = 0; t < 8; t++) {
    const deg = 122 + t * 17;
    const a = (deg * Math.PI) / 180;
    const x = (50 + 36 * Math.cos(a)).toFixed(1);
    const y = (54 + 36 * Math.sin(a)).toFixed(1);
    leaves += `<ellipse cx="${x}" cy="${y}" rx="7.2" ry="3.1" transform="rotate(${(deg + 62).toFixed(1)} ${x} ${y})"/>`;
  }
  const branch = `<path d="M31 84.5 A36 36 0 0 1 32.5 22.5" fill="none" stroke="#C9A46A" stroke-width="1.6"/>${leaves}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><g fill="#C9A46A">${branch}<g transform="translate(100 0) scale(-1 1)">${branch}</g></g><path d="M50 10 l2.4 5 5.4.8-3.9 3.8.9 5.4-4.8-2.6-4.8 2.6.9-5.4-3.9-3.8 5.4-.8z" fill="#E6C98F"/></svg>`;
}
