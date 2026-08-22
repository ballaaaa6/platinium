import * as THREE from 'three';
import { getFurniturePath, formatFurnitureDimensions } from '../assets/assetCatalog.js';

export const V1_FURNITURE_PLACEMENTS = Object.freeze([
  { id: 112, cell: { column: 4, row: 4 }, rotation: 0 },
  { id: 119, cell: { column: 5, row: 4 }, rotation: 0 },
  { id: 559, cell: { column: 10, row: 5 }, rotation: 0 },
  { id: 566, cell: { column: 16, row: 3 }, rotation: Math.PI / 2 },
  { id: 568, cell: { column: 20, row: 4 }, rotation: 0 },
  { id: 569, cell: { column: 17, row: 7 }, rotation: Math.PI },
]);

export class FurnitureManager {
  constructor({ assetLoader, grid, group }) {
    this.assetLoader = assetLoader;
    this.grid = grid;
    this.group = group;
    this.loaded = [];
  }

  async load(catalog) {
    for (const placement of V1_FURNITURE_PLACEMENTS) {
      const item = catalog.find((candidate) => candidate.id === placement.id);

      if (!item) {
        throw new Error(`Furniture catalog item ${placement.id} was not found.`);
      }

      this.grid.addFurnitureFootprint(placement.cell, item.footprint_tiles, item.id);
      const object = await this.assetLoader.loadGltf(getFurniturePath(item));
      object.name = `Furniture ${String(item.id).padStart(4, '0')} ${item.name}`;
      object.rotation.y = placement.rotation;

      const world = this.grid.cellToWorld(placement.cell);
      object.position.set(world.x, 0, world.z);
      object.updateMatrixWorld(true);

      const bounds = new THREE.Box3().setFromObject(object);
      if (Number.isFinite(bounds.min.y)) {
        object.position.y += Math.max(0, -bounds.min.y) + 0.02;
      }

      object.userData.furniture = {
        id: item.id,
        name: item.name,
        cell: placement.cell,
        dimensions: formatFurnitureDimensions(item),
      };
      this.group.add(object);
      this.loaded.push({ item, placement, object });
    }

    return this.loaded;
  }

  getSummary() {
    return this.loaded.map(({ item }) => ({ id: item.id, name: item.name, glb: item.glb }));
  }
}
