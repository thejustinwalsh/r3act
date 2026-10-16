const bundleSize = JSON.parse(
  await Deno.readTextFile("results/runtime-size-v1.json"),
);
if (
  bundleSize.schemaVersion !== "runtime-bundle-size-v1" ||
  bundleSize.status !== "PASS"
) throw new Error("Missing or invalid runtime bundle-size records");

const bundleBars = [
  { name: "React + React DOM", bytes: bundleSize.arms.react.totalGzipBytes },
  {
    name: "JSX runtime prototype",
    bytes: bundleSize.arms.runtime.totalGzipBytes,
  },
];
const bundleWidth = 900;
const bundleHeight = 290;
const bundleLeft = 240;
const bundleRight = 82;
const bundleBarWidth = bundleWidth - bundleLeft - bundleRight;
const bundleMax = 80_000;
const bundleSvg = [
  '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="290" viewBox="0 0 900 290" role="img" aria-labelledby="bundle-title bundle-desc" style="max-width:100%;height:auto;display:block;font-family:system-ui,sans-serif">',
  '<title id="bundle-title">Minimal counter production bundle size</title>',
  '<desc id="bundle-desc">Gzip size of equivalent one-button counter fixtures. The prototype is much smaller, but it implements far fewer features than React.</desc>',
  '<text x="240" y="28" fill="#374151" font-size="14">Production JavaScript bundle, gzip level 9</text>',
];
for (const tick of [0, 20_000, 40_000, 60_000, 80_000]) {
  const x = bundleLeft + tick / bundleMax * bundleBarWidth;
  bundleSvg.push(
    '<line x1="' + x + '" y1="50" x2="' + x +
      '" y2="218" stroke="#e5e7eb"/><text x="' + x +
      '" y="240" text-anchor="middle" fill="#6b7280" font-size="12">' +
      (tick / 1000) + " kB</text>",
  );
}
bundleBars.forEach((bar, index) => {
  const y = 76 + index * 72;
  const width = Math.max(2, bar.bytes / bundleMax * bundleBarWidth);
  const color = index === 0 ? "#6b7280" : "#2563eb";
  bundleSvg.push(
    '<text x="226" y="' + (y + 23) +
      '" text-anchor="end" fill="#111827" font-size="15">' + bar.name +
      '</text><rect x="240" y="' + y + '" width="' + width +
      '" height="34" rx="5" fill="' + color + '"/><text x="' +
      (240 + width + 10) + '" y="' + (y + 23) +
      '" fill="#111827" font-size="14">' + (bar.bytes / 1000).toFixed(1) +
      " kB</text>",
  );
});
bundleSvg.push(
  '<text x="240" y="275" fill="#6b7280" font-size="12">Prototype is 88.2% smaller for this fixture; this is not an equal-feature comparison.</text>',
  "</svg>",
);
Deno.jupyter.svg`${bundleSvg.join("")}`;
