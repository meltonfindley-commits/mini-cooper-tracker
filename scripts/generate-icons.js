// Generates PWA icons, iOS splash screens, and the install-sheet screenshot
// for both apps from the Logyard brand mark. Run once with:
//   node scripts/generate-icons.js
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, 'assets/logyard-mark.png');
const BG = '#2C2926'; // sampled full-bleed background of the brand mark

const OUT_DIRS = [
  path.join(__dirname, '../apps/dashboard/public/icons'),
  path.join(__dirname, '../apps/fuel-tracker/public/icons'),
];

const STANDARD_SIZES = {
  'icon-512.png': 512,
  'icon-192.png': 192,
  'apple-touch-icon.png': 180,
  'favicon-32.png': 32,
  'favicon-16.png': 16,
};

// Android adaptive-icon safe zone: keep content within the center ~60%
// (20% inset per side), background extends full bleed.
const MASKABLE_SIZES = {
  'icon-512-maskable.png': 512,
  'icon-192-maskable.png': 192,
};

const SPLASH_SIZES = {
  'splash-1170x2532.png': [1170, 2532],
  'splash-1284x2778.png': [1284, 2778],
  'splash-750x1334.png': [750, 1334],
};

async function writeStandard(outDir, file, size) {
  await sharp(SRC).resize(size, size).png().toFile(path.join(outDir, file));
}

async function writeMaskable(outDir, file, size) {
  const inner = Math.round(size * 0.6);
  const logo = await sharp(SRC).resize(inner, inner).toBuffer();
  await sharp({ create: { width: size, height: size, channels: 3, background: BG } })
    .composite([{ input: logo, gravity: 'center' }])
    .png()
    .toFile(path.join(outDir, file));
}

async function writeWordmarkCanvas(outDir, file, w, h) {
  const logoWidth = Math.round(w * 0.62);
  const logo = await sharp(SRC).resize(logoWidth, logoWidth).toBuffer();
  await sharp({ create: { width: w, height: h, channels: 3, background: BG } })
    .composite([{ input: logo, gravity: 'center' }])
    .png()
    .toFile(path.join(outDir, file));
}

async function main() {
  for (const outDir of OUT_DIRS) {
    fs.mkdirSync(outDir, { recursive: true });

    for (const [file, size] of Object.entries(STANDARD_SIZES)) {
      await writeStandard(outDir, file, size);
    }
    for (const [file, size] of Object.entries(MASKABLE_SIZES)) {
      await writeMaskable(outDir, file, size);
    }
    for (const [file, [w, h]] of Object.entries(SPLASH_SIZES)) {
      await writeWordmarkCanvas(outDir, file, w, h);
    }
    await writeWordmarkCanvas(outDir, 'screenshot-mobile.png', 390, 844);

    console.log(`icons written to ${outDir}`);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
