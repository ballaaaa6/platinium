import {
  ClampToEdgeWrapping,
  LoadingManager,
  NearestFilter,
  SRGBColorSpace,
  TextureLoader,
} from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

function prepareRenderable(root) {
  root.traverse((node) => {
    if (!node.isMesh) {
      return;
    }

    node.castShadow = true;
    node.receiveShadow = true;

    const materials = Array.isArray(node.material) ? node.material : [node.material];
    materials.forEach((material) => {
      if (!material) {
        return;
      }

      if (material.map) {
        material.map.colorSpace = SRGBColorSpace;
      }

      if (material.emissiveMap) {
        material.emissiveMap.colorSpace = SRGBColorSpace;
      }
    });
  });

  return root;
}

export function createAssetLoader() {
  const manager = new LoadingManager();
  const gltfLoader = new GLTFLoader(manager);
  const textureLoader = new TextureLoader(manager);
  const gltfCache = new Map();
  const textureCache = new Map();

  return {
    async loadGltf(path) {
      if (!gltfCache.has(path)) {
        gltfCache.set(path, gltfLoader.loadAsync(path).then((gltf) => prepareRenderable(gltf.scene)));
      }

      const source = await gltfCache.get(path);
      return source.clone(true);
    },

    async loadTexture(path) {
      if (!textureCache.has(path)) {
        textureCache.set(path, textureLoader.loadAsync(path).then((texture) => {
          texture.colorSpace = SRGBColorSpace;
          texture.magFilter = NearestFilter;
          texture.minFilter = NearestFilter;
          texture.generateMipmaps = false;
          texture.wrapS = ClampToEdgeWrapping;
          texture.wrapT = ClampToEdgeWrapping;
          texture.needsUpdate = true;
          return texture;
        }));
      }

      return textureCache.get(path);
    },

    get cacheSizes() {
      return { gltf: gltfCache.size, textures: textureCache.size };
    },
  };
}

export function parseCellsCsv(csv) {
  const lines = csv.trim().split(/\r?\n/);

  if (lines.length < 2) {
    return [];
  }

  const headers = lines[0].split(',');

  return lines.slice(1).map((line) => {
    const values = line.split(',');
    return Object.fromEntries(headers.map((header, index) => [header, values[index]]));
  });
}
