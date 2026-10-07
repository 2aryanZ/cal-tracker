// Sharp is an authoring tool only; it is not bundled into the mobile app.
// Set CAL_TRACKER_SHARP_MODULE if Sharp is installed outside this repository.
const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require(process.env.CAL_TRACKER_SHARP_MODULE || 'sharp');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'assets/images');
const ink = '#152B30';
const lime = '#D1FA7A';

async function main() {
  const mark = await fs.readFile(path.join(root, 'assets/brand/mark.svg'), 'utf8');
  const render = (filename, size, viewBox, color = lime, background) => {
    let svg = mark.replace('viewBox="0 0 1024 1024"', `viewBox="${viewBox}"`).replaceAll(lime, color);
    if (background) {
      const [x, y, width, height] = viewBox.split(' ');
      svg = svg.replace('</defs>', `</defs><rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${background}" />`);
    }
    return sharp(Buffer.from(svg)).resize(size, size).png({ compressionLevel: 9 }).toFile(path.join(output, filename));
  };
  await Promise.all([
    render('icon.png', 1024, '112 112 800 800', lime, ink),
    render('android-icon-foreground.png', 1024, '0 0 1024 1024'),
    render('android-icon-monochrome.png', 1024, '0 0 1024 1024', '#FFFFFF'),
    render('splash-icon.png', 1024, '176 176 672 672'),
    render('notification-icon.png', 96, '176 176 672 672', '#FFFFFF'),
    render('favicon.png', 64, '112 112 800 800', lime, ink),
    sharp({ create: { width: 1024, height: 1024, channels: 3, background: ink } })
      .png({ compressionLevel: 9 }).toFile(path.join(output, 'android-icon-background.png')),
  ]);
  console.log('Generated seven Cal Tracker brand assets from assets/brand/mark.svg.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
