import { ASSET_PATHS } from '../assets/assetCatalog.js';

export async function loadOfficeMap({ assetLoader, mapGroup }) {
  const map = await assetLoader.loadGltf(ASSET_PATHS.map);
  map.name = 'Default Office GLB Map';
  mapGroup.add(map);
  return map;
}
