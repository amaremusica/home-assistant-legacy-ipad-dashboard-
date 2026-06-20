/** SVG pogody — jak legacy iPad */
export function weatherSvgInner(state) {
  const s = state || '';
  const defs = '<defs>'
    + '<radialGradient id="gSun" cx="50%" cy="42%" r="60%"><stop offset="0%" stop-color="#fff3b0"/><stop offset="55%" stop-color="#fbbf24"/><stop offset="100%" stop-color="#f59e0b"/></radialGradient>'
    + '<linearGradient id="gCloud" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ffffff"/><stop offset="100%" stop-color="#c3ccd9"/></linearGradient>'
    + '<linearGradient id="gCloudDark" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#9aa6b8"/><stop offset="100%" stop-color="#6b7689"/></linearGradient>'
    + '<linearGradient id="gMoon" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#e8eefc"/><stop offset="100%" stop-color="#aebbe0"/></linearGradient>'
    + '<linearGradient id="gRain" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#7fb6ff"/><stop offset="100%" stop-color="#4f86d6"/></linearGradient>'
    + '</defs>';
  const sun = '<circle cx="18" cy="17" r="7.5" fill="url(#gSun)"/><g stroke="#fbbf24" stroke-width="2.2" stroke-linecap="round"><line x1="18" y1="3" x2="18" y2="7"/><line x1="18" y1="27" x2="18" y2="31"/><line x1="4" y1="17" x2="8" y2="17"/><line x1="28" y1="17" x2="32" y2="17"/></g>';
  const cloud = '<path d="M11 26 a6 6 0 0 1 0-12 a7.5 7.5 0 0 1 14.4-2 a5.5 5.5 0 0 1 1.6 10.8 a3 3 0 0 1-.6.2 z" fill="url(#gCloud)"/>';
  let svg = cloud;
  if (s.includes('sunny') || s === 'clear') svg = sun;
  else if (s.includes('clear-night') || s.includes('night')) svg = '<path d="M24 22a10 10 0 1 1-9-13 8 8 0 0 0 9 13z" fill="url(#gMoon)"/>';
  else if (s.includes('partlycloudy') || s.includes('partly')) svg = `${sun.replace('cx="18"', 'cx="24"').replace('cy="17"', 'cy="11"').replace(/r="7.5"/, 'r="5.5"')}${cloud}`;
  else if (s.includes('rainy') || s.includes('pour')) svg = `${cloud}<g stroke="url(#gRain)" stroke-width="2.4" stroke-linecap="round"><line x1="12" y1="27" x2="10" y2="32"/><line x1="18" y1="27" x2="16" y2="32"/><line x1="24" y1="27" x2="22" y2="32"/></g>`;
  else if (s.includes('snow')) svg = `${cloud}<g stroke="#dbe6f5" stroke-width="2" stroke-linecap="round"><line x1="12" y1="27" x2="12" y2="32"/><line x1="18" y1="27" x2="18" y2="32"/><line x1="24" y1="27" x2="24" y2="32"/></g>`;
  else if (s.includes('thunder') || s.includes('lightning')) svg = '<path d="M11 24 a6 6 0 0 1 0-12 a7.5 7.5 0 0 1 14.4-2 a5.5 5.5 0 0 1 1.6 10.8 z" fill="url(#gCloudDark)"/><polygon points="19,21 14,21 17,27 13.5,27 20,36 18,28 22,28" fill="#fbbf24"/>';
  else if (s.includes('fog')) svg = `${cloud}<g stroke="#b0bec5" stroke-width="2.2" stroke-linecap="round" opacity=".85"><line x1="8" y1="29" x2="28" y2="29"/></g>`;
  else if (s.includes('wind')) svg = '<g stroke="#9aa6b8" stroke-width="2.4" stroke-linecap="round" fill="none"><path d="M4 13 Q14 8 22 13"/><path d="M4 20 Q12 16 20 20"/><path d="M6 27 Q15 23 23 27"/></g>';
  return defs + svg;
}

export function wSvgSmall(state) {
  return weatherSvgInner(state).replace(/id="g/g, 'id="gs');
}
