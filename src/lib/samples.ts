/**
 * Built-in sketch gallery, generated in code as inline SVG so there are no
 * network requests and nothing to bundle. Each sample is line art rendered
 * with a dark stroke on a transparent background; the display URL is a plain
 * SVG blob, and the persisted form is a white-backed PNG so edge detection has
 * real contrast to work with.
 */
import { createObjectUrl, rasterizeSvg, type RasterResult } from '@/lib/imageUtils';

export interface Sample {
  id: string;
  name: string;
  svg: string;
}

const STROKE = '#0f172a';
const VB = 512;

function svgWrap(children: string, strokeWidth = 6): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VB} ${VB}" width="${VB}" height="${VB}" fill="none" stroke="${STROKE}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">${children}</svg>`;
}

function starPath(points: number, outer: number, inner: number, cx = 256, cy = 256): string {
  const step = Math.PI / points;
  let d = '';
  for (let i = 0; i < points * 2; i += 1) {
    const r = i % 2 === 0 ? outer : inner;
    const angle = i * step - Math.PI / 2;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    d += `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)} `;
  }
  return `${d}Z`;
}

function mandala(): string {
  const parts: string[] = [];
  parts.push('<circle cx="256" cy="256" r="200"/>');
  parts.push('<circle cx="256" cy="256" r="150"/>');
  parts.push('<circle cx="256" cy="256" r="70"/>');
  parts.push('<circle cx="256" cy="256" r="28"/>');

  const petals = 12;
  for (let i = 0; i < petals; i += 1) {
    const angle = (360 / petals) * i;
    parts.push(
      `<g transform="rotate(${angle} 256 256)"><path d="M256 106 C300 150 300 210 256 256 C212 210 212 150 256 106 Z"/></g>`,
    );
  }

  const rays = 24;
  for (let i = 0; i < rays; i += 1) {
    const angle = (360 / rays) * i;
    parts.push(`<line x1="256" y1="56" x2="256" y2="96" transform="rotate(${angle} 256 256)"/>`);
  }
  return parts.join('');
}

function flower(): string {
  const petals: string[] = [];
  const count = 6;
  for (let i = 0; i < count; i += 1) {
    const angle = (360 / count) * i;
    petals.push(
      `<ellipse cx="256" cy="150" rx="52" ry="96" transform="rotate(${angle} 256 256)"/>`,
    );
  }
  petals.push('<circle cx="256" cy="256" r="44"/>');
  petals.push('<path d="M256 300 L256 452"/>');
  petals.push('<path d="M256 372 C306 340 330 372 322 408 C282 420 258 400 256 372 Z"/>');
  return petals.join('');
}

function catFace(): string {
  return [
    '<circle cx="256" cy="272" r="150"/>',
    '<path d="M132 176 L112 62 L226 130"/>',
    '<path d="M380 176 L400 62 L286 130"/>',
    '<ellipse cx="200" cy="248" rx="26" ry="34"/>',
    '<ellipse cx="312" cy="248" rx="26" ry="34"/>',
    '<path d="M256 300 L236 324 L276 324 Z"/>',
    '<path d="M236 324 C246 344 266 344 276 324"/>',
    '<path d="M256 324 L256 356"/>',
    '<path d="M256 356 C236 386 206 380 196 366"/>',
    '<path d="M256 356 C276 386 306 380 316 366"/>',
    '<path d="M100 280 L40 264"/>',
    '<path d="M104 312 L44 316"/>',
    '<path d="M412 280 L472 264"/>',
    '<path d="M408 312 L468 316"/>',
  ].join('');
}

function house(): string {
  return [
    '<path d="M96 244 L256 106 L416 244"/>',
    '<path d="M136 226 L136 424 L376 424 L376 226"/>',
    '<rect x="206" y="330" width="100" height="94"/>',
    '<rect x="168" y="264" width="72" height="66"/>',
    '<path d="M204 264 L204 330 M168 297 L240 297"/>',
    '<path d="M330 96 L330 176 L366 176 L366 138"/>',
    '<path d="M256 106 L256 96"/>',
  ].join('');
}

function heart(): string {
  return [
    '<path d="M256 428 C120 344 64 272 64 200 C64 142 108 100 164 100 C206 100 238 124 256 158 C274 124 306 100 348 100 C404 100 448 142 448 200 C448 272 392 344 256 428 Z"/>',
  ].join('');
}

function butterfly(): string {
  return [
    '<path d="M256 148 L256 392"/>',
    '<path d="M256 190 C196 120 96 128 88 210 C82 272 168 296 256 260"/>',
    '<path d="M256 190 C316 120 416 128 424 210 C430 272 344 296 256 260"/>',
    '<path d="M256 268 C196 268 132 320 156 376 C176 420 232 404 256 356"/>',
    '<path d="M256 268 C316 268 380 320 356 376 C336 420 280 404 256 356"/>',
    '<path d="M256 148 C242 122 224 108 204 100"/>',
    '<path d="M256 148 C270 122 288 108 308 100"/>',
  ].join('');
}

export const SAMPLES: Sample[] = [
  { id: 'star', name: 'Star', svg: svgWrap(`<path d="${starPath(5, 196, 82)}"/>`) },
  { id: 'house', name: 'House', svg: svgWrap(house(), 7) },
  { id: 'cat', name: 'Cat', svg: svgWrap(catFace(), 5) },
  { id: 'flower', name: 'Flower', svg: svgWrap(flower(), 5) },
  { id: 'heart', name: 'Heart', svg: svgWrap(heart(), 7) },
  { id: 'mandala', name: 'Mandala', svg: svgWrap(mandala(), 3.5) },
  { id: 'butterfly', name: 'Butterfly', svg: svgWrap(butterfly(), 5) },
];

export function getSample(id: string): Sample | undefined {
  return SAMPLES.find((sample) => sample.id === id);
}

/** Object URL for on-screen display (transparent background, keeps camera visible). */
export function sampleDisplayUrl(sample: Sample): string {
  return createObjectUrl(new Blob([sample.svg], { type: 'image/svg+xml;charset=utf-8' }));
}

/** White-backed PNG used when persisting a sample or running edge detection. */
export function sampleToRaster(sample: Sample, size = 1024): Promise<RasterResult> {
  return rasterizeSvg(sample.svg, size, '#ffffff');
}
