import * as THREE from 'three';
import { DOOR_CELLS, GRID_COLUMNS, GRID_ROWS } from './grid.js';

export function createWorldScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#0b1119');

  const ambient = new THREE.HemisphereLight('#dfeaff', '#243246', 2.2);
  scene.add(ambient);

  const keyLight = new THREE.DirectionalLight('#fff6df', 3.2);
  keyLight.position.set(6, 16, 8);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024);
  scene.add(keyLight);

  const world = new THREE.Group();
  const mapGroup = new THREE.Group();
  const furnitureGroup = new THREE.Group();
  const actorGroup = new THREE.Group();
  const gridGroup = createGridOverlay();

  world.add(mapGroup, furnitureGroup, actorGroup, gridGroup);
  scene.add(world);

  return { scene, world, mapGroup, furnitureGroup, actorGroup, gridGroup };
}

function createGridOverlay() {
  const group = new THREE.Group();
  const lineVertices = [];

  for (let column = 0; column <= GRID_COLUMNS; column += 1) {
    const x = column - GRID_COLUMNS / 2;
    lineVertices.push(x, 0.035, -GRID_ROWS / 2, x, 0.035, GRID_ROWS / 2);
  }

  for (let row = 0; row <= GRID_ROWS; row += 1) {
    const z = row - GRID_ROWS / 2;
    lineVertices.push(-GRID_COLUMNS / 2, 0.035, z, GRID_COLUMNS / 2, 0.035, z);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(lineVertices, 3));
  const material = new THREE.LineBasicMaterial({
    color: '#b6c8dc',
    transparent: true,
    opacity: 0.24,
    depthTest: false,
  });
  const lines = new THREE.LineSegments(geometry, material);
  lines.renderOrder = 20;
  group.add(lines);

  DOOR_CELLS.forEach((door) => {
    const x = door.column - (GRID_COLUMNS / 2 + 0.5);
    const z = door.row - (GRID_ROWS / 2 + 0.5);
    const doorMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.82, 0.82),
      new THREE.MeshBasicMaterial({
        color: '#f6bd60',
        transparent: true,
        opacity: 0.28,
        depthTest: false,
      }),
    );
    doorMesh.rotation.x = -Math.PI / 2;
    doorMesh.position.set(x, 0.045, z);
    doorMesh.renderOrder = 21;
    doorMesh.userData.door = door.label;
    group.add(doorMesh);
  });

  return group;
}
