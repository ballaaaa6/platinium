import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const runtimeRoot = path.join(projectRoot, 'public', 'game-assets');
const characters = readJson('catalog/characters.json');
const furniture = readJson('catalog/furniture.json');
const map = readJson('catalog/map.json');
const layout = readJson('map/layout.json');
const cellRows = fs.readFileSync(path.join(runtimeRoot, 'map', 'cells.csv'), 'utf8').trim().split(/\r?\n/).slice(1);

const directions = {
  NORTH: [0, 8, 9, 10],
  SOUTH: [11, 12, 13, 14],
  WEST: [15, 1, 2, 3],
  EAST: [4, 5, 6, 7],
};

const excludedOrdinaryTokens = [
  'UNUSED', 'BIKE', 'SURF', 'SPRAYDUCK', 'CONTEST', 'FISHING', 'POKETCH',
  'SAVE', 'HEARTHOME_GYM', 'DIST_WORLD', 'FRONTIER', 'WIFI_PLAZA', 'VS_SEEKER',
];

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(runtimeRoot, relativePath), 'utf8'));
}

function requireCondition(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function isGlb(relativePath) {
  const bytes = fs.readFileSync(path.join(runtimeRoot, relativePath));
  return bytes.length >= 4 && bytes.subarray(0, 4).toString('ascii') === 'glTF';
}

function isPng(relativePath) {
  const bytes = fs.readFileSync(path.join(runtimeRoot, relativePath));
  return bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
}

function random(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function shuffle(items, next) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(next() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

try {
  const mapPath = 'map/default_office.glb';
  requireCondition(fs.existsSync(path.join(runtimeRoot, mapPath)), `${mapPath} is missing.`);
  requireCondition(isGlb(mapPath), `${mapPath} is not a valid GLB container.`);
  requireCondition(characters.length === 269, `Expected 269 characters; received ${characters.length}.`);
  requireCondition(furniture.length === 590, `Expected 590 furniture records; received ${furniture.length}.`);
  requireCondition(layout.grid.columns === 24 && layout.grid.rows === 10, 'map/layout.json is not 24×10.');
  requireCondition(map.grid.columns === 24 && map.grid.rows === 10, 'catalog/map.json is not 24×10.');
  requireCondition(map.doors.top === 'C08,R01' && map.doors.bottom === 'C21,R10', 'Door cells do not match the contract.');
  requireCondition(cellRows.length === 240, `Expected 240 logical cells; received ${cellRows.length}.`);

  const readyBillboards = characters.filter((character) => character.status === 'READY_BILLBOARD');
  const ordinaryBillboards = readyBillboards.filter((character) => character.asset_class === 'human_actor'
    && !excludedOrdinaryTokens.some((token) => character.symbol.includes(token))
    && Object.values(directions).every((sequence) => sequence.every((frame) => Boolean(character.frames?.[frame]))));
  requireCondition(readyBillboards.length === 221, `Expected 221 billboard-ready records; received ${readyBillboards.length}.`);
  requireCondition(ordinaryBillboards.length >= 20, `Only ${ordinaryBillboards.length} ordinary billboard actors are available.`);

  const totalPngFrames = characters.reduce((sum, character) => sum + (character.frames?.length ?? 0), 0);
  requireCondition(totalPngFrames === 3277, `Expected 3277 PNG frame references; received ${totalPngFrames}.`);

  const missingFurniture = furniture.filter((item) => !fs.existsSync(path.join(runtimeRoot, item.glb)) || !isGlb(item.glb));
  requireCondition(missingFurniture.length === 0, `Furniture GLB validation failed for ${missingFurniture.length} records.`);

  const selected = shuffle(ordinaryBillboards.sort((left, right) => left.id - right.id), random(555)).slice(0, 20);
  const selectedFiles = [];
  selected.forEach((character) => {
    Object.values(directions).forEach((sequence) => sequence.forEach((frame) => {
      const relativePath = character.frames[frame];
      requireCondition(isPng(relativePath), `Missing or invalid PNG frame: ${relativePath}`);
      selectedFiles.push(relativePath);
    }));
  });

  const exampleFurnitureIds = [112, 119, 559, 566, 568, 569];
  exampleFurnitureIds.forEach((id) => requireCondition(furniture.some((item) => item.id === id), `Furniture example ${id} is missing.`));

  console.log(JSON.stringify({
    pass: true,
    map: mapPath,
    grid: `${layout.grid.columns}x${layout.grid.rows}`,
    doors: [map.doors.top, map.doors.bottom],
    furnitureCount: furniture.length,
    characterCount: characters.length,
    readyBillboards: readyBillboards.length,
    totalPngFrames,
    selectedActors: selected.map((character) => ({ id: character.id, symbol: character.symbol })),
    selectedFrameReferences: selectedFiles.length,
    exampleFurnitureIds,
  }, null, 2));
} catch (error) {
  console.error(`ASSET_VALIDATION_FAIL: ${error.message}`);
  process.exitCode = 1;
}
