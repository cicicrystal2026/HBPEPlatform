import { rankLevels } from "./v3-data.js";
export function honorMedal(level = 1) {
  level = Math.min(9, Math.max(1, Number(level) || 1));
  const colors = [
    "#a8b8ae",
    "#a8c6bc",
    "#78b9aa",
    "#d9be7a",
    "#e7c368",
    "#edd28b",
    "#81cbd3",
    "#a2afe8",
    "#f5da8d",
  ];
  const color = colors[level - 1];
  return `<svg class="honor-medal-art" viewBox="0 0 180 190" role="img" aria-label="Lv.${level} ${rankLevels[level - 1]}荣誉勋章"><path d="M55 113 42 183 76 165 90 185 100 120M125 113 138 183 104 165 90 185 80 120" fill="#234c43" stroke="${color}" stroke-width="2"/><circle cx="90" cy="77" r="64" fill="#142e2a" stroke="${color}" stroke-width="4"/><circle cx="90" cy="77" r="54" fill="#244c43" stroke="${color}"/><path d="M52 112Q24 73 55 40M128 112Q156 73 125 40" fill="none" stroke="${color}" stroke-width="3"/>${[0, 1, 2, 3, 4].map((i) => `<ellipse cx="${43 - (i % 2) * 3}" cy="${51 + i * 12}" rx="4" ry="8" transform="rotate(-35 ${43 - (i % 2) * 3} ${51 + i * 12})" fill="${color}"/><ellipse cx="${137 + (i % 2) * 3}" cy="${51 + i * 12}" rx="4" ry="8" transform="rotate(35 ${137 + (i % 2) * 3} ${51 + i * 12})" fill="${color}"/>`).join("")}<path d="m90 31 4 9 10 1-7 7 2 10-9-5-9 5 2-10-7-7 10-1Z" fill="${color}"/><text x="90" y="96" text-anchor="middle" fill="${color}" font-family="Georgia,serif" font-size="44" font-weight="bold">${level}</text><text x="90" y="118" text-anchor="middle" fill="${color}" font-family="Arial,sans-serif" font-size="10" letter-spacing="3">HEBEI SPORTS</text></svg>`;
}
