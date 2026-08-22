import { createSeededRandom, shuffle } from '../utils/seededRandom.js';

export const ASSET_ROOT = '/game-assets';

export const ASSET_PATHS = Object.freeze({
  map: `${ASSET_ROOT}/map/default_office.glb`,
  cells: `${ASSET_ROOT}/map/cells.csv`,
  mapLayout: `${ASSET_ROOT}/map/layout.json`,
  characters: `${ASSET_ROOT}/catalog/characters.json`,
  furniture: `${ASSET_ROOT}/catalog/furniture.json`,
  mapCatalog: `${ASSET_ROOT}/catalog/map.json`,
  assets: `${ASSET_ROOT}/catalog/assets.json`,
});

export const DIRECTION_SEQUENCES = Object.freeze({
  NORTH: [0, 8, 9, 10],
  SOUTH: [11, 12, 13, 14],
  WEST: [15, 1, 2, 3],
  EAST: [4, 5, 6, 7],
});

const EXCLUDED_ORDINARY_SYMBOL_TOKENS = Object.freeze([
  'UNUSED',
  'BIKE',
  'SURF',
  'SPRAYDUCK',
  'CONTEST',
  'FISHING',
  'POKETCH',
  'SAVE',
  'HEARTHOME_GYM',
  'DIST_WORLD',
  'FRONTIER',
  'WIFI_PLAZA',
  'VS_SEEKER',
]);

async function loadJson(path) {
  const response = await fetch(path);

  if (!response.ok) {
    throw new Error(`Unable to load ${path} (${response.status}).`);
  }

  return response.json();
}

export async function loadCatalogs() {
  const [assets, characters, furniture, map] = await Promise.all([
    loadJson(ASSET_PATHS.assets),
    loadJson(ASSET_PATHS.characters),
    loadJson(ASSET_PATHS.furniture),
    loadJson(ASSET_PATHS.mapCatalog),
  ]);

  return { assets, characters, furniture, map };
}

export function getFramePath(character, frameIndex) {
  const relativePath = character.frames[frameIndex];

  if (!relativePath) {
    throw new Error(`Character ${character.id} is missing frame ${frameIndex}.`);
  }

  return `${ASSET_ROOT}/${relativePath}`;
}

export function getFurniturePath(furniture) {
  return `${ASSET_ROOT}/${furniture.glb}`;
}

export function isBillboardReadyCharacter(character) {
  return character.status === 'READY_BILLBOARD'
    && Array.isArray(character.frames)
    && character.frames.length > 0;
}

export function getBillboardReadyCharacters(characters) {
  return characters
    .filter(isBillboardReadyCharacter)
    .sort((left, right) => left.id - right.id);
}

export function isOrdinaryBillboardCharacter(character) {
  return isBillboardReadyCharacter(character)
    && character.asset_class === 'human_actor'
    && Object.values(DIRECTION_SEQUENCES).every((sequence) => sequence.every((frame) => Boolean(character.frames[frame])))
    && !EXCLUDED_ORDINARY_SYMBOL_TOKENS.some((token) => character.symbol.includes(token));
}

export function getOrdinaryBillboardCharacters(characters) {
  return characters
    .filter(isOrdinaryBillboardCharacter)
    .sort((left, right) => left.id - right.id);
}

export function selectBillboardActors(characters, { seed = 555, count = 20 } = {}) {
  const eligible = getOrdinaryBillboardCharacters(characters);

  if (eligible.length < count) {
    throw new Error(`Only ${eligible.length} billboard-ready ordinary actors are available; ${count} are required.`);
  }

  return shuffle(eligible, createSeededRandom(seed)).slice(0, count);
}

export function formatFurnitureDimensions(item) {
  const dimensions = item.glb_dimensions_tiles ?? [];
  return dimensions.length === 3 ? dimensions.map((value) => Number(value).toFixed(2)).join(' × ') : '—';
}

export function formatFurnitureFootprint(item) {
  const footprint = item.footprint_tiles;
  return footprint ? `${footprint.x} × ${footprint.z}` : '—';
}
