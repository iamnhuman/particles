const WIDTH = 768, HEIGHT = 512;
const MIN_X = -2.25, MIN_Y = -1.55;
const SPAN_X = 4.5, SPAN_Y = 3.1;
const DEPTH = .36, ROUNDNESS = .105, JOIN = .060;

// These bands define a single fused emblem. They are never separate particle
// layers: the union is sampled once, with one surface and no oval identities.
const OVALS = [
  { rx: 2.055, ry: 1.345, cy: 0, width: .145 },
  { rx: .415, ry: 1.105, cy: 0, width: .175 },
  { rx: 1.49, ry: .525, cy: .60, width: .165 }
];

function ellipseDistance(x, y, oval) {
  y -= oval.cy;
  const k0 = Math.hypot(x / oval.rx, y / oval.ry);
  const k1 = Math.hypot(x / (oval.rx * oval.rx), y / (oval.ry * oval.ry));
  return k1 > 1e-10 ? k0 * (k0 - 1) / k1 : -Math.min(oval.rx, oval.ry);
}

function smoothUnion(a, b) {
  const h = Math.max(JOIN - Math.abs(a - b), 0) / JOIN;
  return Math.min(a, b) - h * h * JOIN * .25;
}

function distanceToEmblem(x, y) {
  let distance = Infinity;
  for (const oval of OVALS) {
    distance = smoothUnion(distance, Math.abs(ellipseDistance(x, y, oval)) - oval.width);
  }
  return distance;
}

// Exact squared Euclidean distance transform on the final union mask. Taking
// the minimum of oval distances alone would leave hidden internal bevel seams.
function distancesTo(mask, target) {
  const horizontal = new Float64Array(WIDTH * HEIGHT);
  const result = new Float64Array(horizontal.length);
  const input = new Float64Array(Math.max(WIDTH, HEIGHT));
  const output = new Float64Array(input.length);
  const sites = new Int32Array(input.length);
  const cuts = new Float64Array(input.length + 1);
  function transform(length, weight) {
    let k = 0;
    sites[0] = 0; cuts[0] = -Infinity; cuts[1] = Infinity;
    for (let q = 1; q < length; q++) {
      let cut;
      do {
        const site = sites[k];
        cut = ((input[q] + weight * q * q) - (input[site] + weight * site * site)) / (2 * weight * (q - site));
        if (cut > cuts[k]) break;
        k--;
      } while (k >= 0);
      k++; sites[k] = q; cuts[k] = cut; cuts[k + 1] = Infinity;
    }
    k = 0;
    for (let q = 0; q < length; q++) {
      while (cuts[k + 1] < q) k++;
      output[q] = weight * (q - sites[k]) ** 2 + input[sites[k]];
    }
  }
  for (let row = 0; row < HEIGHT; row++) {
    for (let x = 0; x < WIDTH; x++) input[x] = mask[row * WIDTH + x] === target ? 0 : 1e6;
    transform(WIDTH, (SPAN_X / WIDTH) ** 2);
    horizontal.set(output.subarray(0, WIDTH), row * WIDTH);
  }
  for (let x = 0; x < WIDTH; x++) {
    for (let row = 0; row < HEIGHT; row++) input[row] = horizontal[row * WIDTH + x];
    transform(HEIGHT, (SPAN_Y / HEIGHT) ** 2);
    for (let row = 0; row < HEIGHT; row++) result[row * WIDTH + x] = output[row];
  }
  return result;
}

// Inflate the final connected silhouette, not the individual ovals. The
// screened Poisson cap rounds the whole width and blends junctions smoothly;
// a profile made directly from nearest-edge distance has medial-axis creases.
function inflateSurface(mask, distances, dx, dy) {
  const cap = new Float64Array(mask.length);
  const red = [], black = [];
  for (let row = 1; row < HEIGHT - 1; row++) for (let column = 1; column < WIDTH - 1; column++) {
    const index = row * WIDTH + column;
    if (mask[index]) ((row + column) % 2 ? red : black).push(index);
  }
  const wx = (ROUNDNESS / dx) ** 2, wy = (ROUNDNESS / dy) ** 2;
  const denominator = 1 + 2 * (wx + wy);
  for (let iteration = 0; iteration < 240; iteration++) {
    let change = 0;
    for (const cells of [red, black]) for (const index of cells) {
      const next = (1 + wx * (cap[index - 1] + cap[index + 1]) +
        wy * (cap[index - WIDTH] + cap[index + WIDTH])) / denominator;
      const step = (next - cap[index]) * 1.8;
      cap[index] += step;
      change = Math.max(change, Math.abs(step));
    }
    if (change < 5e-6) break;
  }
  const heights = new Float32Array(mask.length);
  for (const cells of [red, black]) for (const index of cells) {
    const boundary = Math.max(0, Math.min(1, -distances[index] / .012));
    heights[index] = DEPTH * Math.sqrt(Math.max(0, cap[index]) * boundary * (2 - boundary));
  }
  // Remove the tiny checkerboard-order bias of the iterative solver.
  for (let row = 0; row < HEIGHT; row++) for (let column = 0; column < WIDTH / 2; column++) {
    const left = row * WIDTH + column, right = row * WIDTH + WIDTH - 1 - column;
    const height = (heights[left] + heights[right]) * .5;
    heights[left] = heights[right] = height;
  }
  return heights;
}

function makeSurface() {
  const data = new Float32Array(WIDTH * HEIGHT * 4);
  const mask = new Uint8Array(WIDTH * HEIGHT);
  const dx = SPAN_X / WIDTH, dy = SPAN_Y / HEIGHT;
  for (let row = 0; row < HEIGHT; row++) for (let column = 0; column < WIDTH; column++) {
    const x = MIN_X + (column + .5) * dx;
    const y = MIN_Y + (row + .5) * dy;
    mask[row * WIDTH + column] = distanceToEmblem(x, y) < 0 ? 1 : 0;
  }
  const inside = distancesTo(mask, 1), outside = distancesTo(mask, 0);
  const distances = new Float32Array(mask.length);
  const halfPixel = Math.min(dx, dy) * .5;
  for (let i = 0; i < mask.length; i++) {
    distances[i] = (mask[i] ? -1 : 1) * Math.max(0, Math.sqrt(mask[i] ? outside[i] : inside[i]) - halfPixel);
  }
  const heights = inflateSurface(mask, distances, dx, dy);
  for (let row = 0; row < HEIGHT; row++) for (let column = 0; column < WIDTH; column++) {
    const index = row * WIDTH + column;
    const gx = (heights[row * WIDTH + Math.min(WIDTH - 1, column + 1)] - heights[row * WIDTH + Math.max(0, column - 1)]) / (2 * dx);
    const gy = (heights[Math.min(HEIGHT - 1, row + 1) * WIDTH + column] - heights[Math.max(0, row - 1) * WIDTH + column]) / (2 * dy);
    data.set([distances[index], gx, gy, heights[index]], index * 4);
  }
  return { data, width: WIDTH, height: HEIGHT, bounds: [MIN_X, MIN_Y, SPAN_X, SPAN_Y], depth: DEPTH, roundness: ROUNDNESS };
}

let cachedSurface;
const surface = () => cachedSurface ||= makeSurface();

/** RGBA: signed union distance, height gradient x/y, common inflated height. */
export function createToyotaSurfaceData() {
  const value = surface();
  return { ...value, data: value.data.slice(), bounds: [...value.bounds] };
}

/** The same clamped bilinear lookup used by the GPU, without float filtering. */
export function sampleToyotaSurface(field, x, y) {
  const [minX, minY, spanX, spanY] = field.bounds;
  const column = Math.max(0, Math.min(field.width - 1, (x - minX) / spanX * field.width - .5));
  const row = Math.max(0, Math.min(field.height - 1, (y - minY) / spanY * field.height - .5));
  const left = Math.floor(column), right = Math.min(field.width - 1, left + 1);
  const bottom = Math.floor(row), top = Math.min(field.height - 1, bottom + 1);
  const tx = column - left, ty = row - bottom;
  return Array.from({ length: 4 }, (_, channel) => {
    const a = field.data[(bottom * field.width + left) * 4 + channel];
    const b = field.data[(bottom * field.width + right) * 4 + channel];
    const c = field.data[(top * field.width + left) * 4 + channel];
    const d = field.data[(top * field.width + right) * 4 + channel];
    return (a + (b - a) * tx) * (1 - ty) + (c + (d - c) * tx) * ty;
  });
}

function createToyotaBuffer(count) {
  if (!Number.isSafeInteger(count) || count < 0) {
    throw new RangeError('Toyota particle count must be a non-negative safe integer.');
  }
  return new Float32Array(count * 4);
}

let cachedSamplingArea;
function samplingArea(field) {
  if (cachedSamplingArea) return cachedSamplingArea;
  const weights = new Float64Array(field.width * field.height);
  let total = 0;
  for (let i = 0; i < weights.length; i++) {
    const [distance, gx, gy] = field.data.subarray(i * 4, i * 4 + 3);
    // Sample the rounded material by its surface area, not its flat XY
    // footprint. Side walls then carry the same fine grain as the broad face.
    if (distance < -.002) total += Math.hypot(1, gx, gy);
    weights[i] = total;
  }
  cachedSamplingArea = { weights, total };
  return cachedSamplingArea;
}

function sampleToyotaGrains(count, visit) {
  let seed = 0x746f796f;
  const random = () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let value = Math.imul(seed ^ seed >>> 15, 1 | seed);
    value = value + Math.imul(value ^ value >>> 7, 61 | value) ^ value;
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
  const field = surface();
  const { weights, total } = samplingArea(field);
  for (let i = 0; i < count; i++) {
    let x, y;
    // A single distribution for the union: junctions never receive an extra
    // layer of grains from each oval, and there are no lane/branch identities.
    do {
      const area = random() * total;
      let lo = 0, hi = weights.length - 1;
      while (lo < hi) {
        const mid = (lo + hi) >>> 1;
        if (weights[mid] <= area) lo = mid + 1;
        else hi = mid;
      }
      x = MIN_X + (lo % WIDTH + random()) / WIDTH * SPAN_X;
      y = MIN_Y + (Math.floor(lo / WIDTH) + random()) / HEIGHT * SPAN_Y;
    } while (sampleToyotaSurface(field, x, y)[0] > -.002);
    const face = (random() < .68 ? 1 : -1) * (.96 + random() * .04);
    visit(i, x, y, face, random(), field);
  }
}

/** Stable RGBA grain seeds: x, y, signed face depth, appearance seed. */
export function createToyotaParameters(count) {
  const parameters = createToyotaBuffer(count);
  sampleToyotaGrains(count, (i, x, y, face, appearance) => {
    parameters.set([x, y, face, appearance], i * 4);
  });
  return parameters;
}

/** Resting targets on the one fused, inflated emblem. */
export function createToyotaTargets(count) {
  const targets = createToyotaBuffer(count);
  sampleToyotaGrains(count, (i, x, y, face, appearance, field) => {
    const height = sampleToyotaSurface(field, x, y)[3];
    targets.set([x, y, height * face, appearance], i * 4);
  });
  return targets;
}
