import * as THREE from 'three';
import { getFramePath } from '../assets/assetCatalog.js';
import { configurePlatinumBillboardMaterial } from '../rendering/platinumBillboardDepth.js';
import { AGENT_STATES, getDirectionFrames } from './animation.js';

const BILLBOARD_WORLD_SCALE = 1.75;
const BILLBOARD_FEET_OFFSET = 0.05;

export class OfficeAgent {
  constructor({ definition, index, grid, textures, group }) {
    this.definition = definition;
    this.index = index;
    this.id = `agent-${String(index + 1).padStart(2, '0')}`;
    this.displayName = `Agent ${String(index + 1).padStart(2, '0')}`;
    this.graphicsId = definition.id;
    this.symbol = definition.symbol;
    this.grid = grid;
    this.textures = textures;
    this.cell = null;
    this.sourceCell = null;
    this.targetCell = null;
    this.state = AGENT_STATES.IDLE;
    this.facing = 'SOUTH';
    this.movementProgress = 0;
    this.movementDuration = 650;
    this.frameCursor = 0;
    this.frameClock = 0;

    this.root = new THREE.Group();
    this.root.name = this.displayName;
    this.root.userData.agent = this;

    const billboardMaterial = new THREE.SpriteMaterial({
      map: null,
      transparent: true,
      alphaTest: 0.04,
      depthTest: true,
      depthWrite: false,
    });
    configurePlatinumBillboardMaterial(billboardMaterial);
    this.sprite = new THREE.Sprite(billboardMaterial);
    this.sprite.scale.set(BILLBOARD_WORLD_SCALE, BILLBOARD_WORLD_SCALE, 1);
    this.sprite.center.set(0.5, 0);
    this.sprite.position.y = BILLBOARD_FEET_OFFSET;
    this.sprite.userData.agent = this;
    this.sprite.userData.kind = 'agent-billboard';

    this.highlight = new THREE.Mesh(
      new THREE.RingGeometry(0.34, 0.43, 32),
      new THREE.MeshBasicMaterial({
        color: '#f6bd60',
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide,
        depthTest: false,
      }),
    );
    this.highlight.rotation.x = -Math.PI / 2;
    this.highlight.position.y = 0.06;
    this.highlight.visible = false;
    this.highlight.renderOrder = 25;

    this.root.add(this.sprite, this.highlight);
    group.add(this.root);
    this.setCell({ column: 1, row: 1 });
    this.setFrame(0);
  }

  setCell(cell) {
    this.cell = { ...cell };
    this.sourceCell = { ...cell };
    this.targetCell = null;
    this.movementProgress = 0;
    this.updateVisual();
  }

  beginWalk(targetCell, duration) {
    this.sourceCell = { ...this.cell };
    this.targetCell = { ...targetCell };
    this.state = AGENT_STATES.WALKING;
    this.movementProgress = 0;
    this.movementDuration = duration;
    this.frameCursor = 0;
    this.frameClock = 0;
    this.setFrame(0);
  }

  finishWalk() {
    this.cell = { ...this.targetCell };
    this.sourceCell = { ...this.cell };
    this.targetCell = null;
    this.state = AGENT_STATES.IDLE;
    this.movementProgress = 0;
    this.frameCursor = 0;
    this.frameClock = 0;
    this.setFrame(0);
    this.updateVisual();
  }

  updateVisual() {
    const start = this.grid.cellToWorld(this.sourceCell ?? this.cell);
    const end = this.targetCell ? this.grid.cellToWorld(this.targetCell) : start;
    const progress = this.targetCell ? this.movementProgress : 0;
    const x = THREE.MathUtils.lerp(start.x, end.x, progress);
    const z = THREE.MathUtils.lerp(start.z, end.z, progress);
    this.root.position.set(x, 0, z);
  }

  updateAnimation(deltaMs) {
    if (this.state !== AGENT_STATES.WALKING) {
      return;
    }

    this.frameClock += deltaMs;
    if (this.frameClock < 145) {
      return;
    }

    this.frameClock = 0;
    this.frameCursor = (this.frameCursor + 1) % getDirectionFrames(this.facing).length;
    this.setFrame(this.frameCursor);
  }

  setFrame(sequenceIndex) {
    const sequence = getDirectionFrames(this.facing);
    const frameIndex = sequence[sequenceIndex] ?? sequence[0];
    const path = getFramePath(this.definition, frameIndex);
    const texture = this.textures.get(path);

    if (!texture) {
      throw new Error(`Texture cache is missing ${path} for ${this.symbol}.`);
    }

    this.sprite.material.map = texture;
    this.sprite.material.needsUpdate = true;
    this.currentFramePath = path;
  }

  setFacing(direction) {
    this.facing = direction;
    this.frameCursor = 0;
    this.setFrame(0);
  }

  setSelected(selected) {
    this.highlight.visible = selected;
  }

  snapshot() {
    return {
      id: this.id,
      displayName: this.displayName,
      graphicsId: this.graphicsId,
      symbol: this.symbol,
      cell: this.cell,
      facing: this.facing,
      state: this.state,
      targetCell: this.targetCell,
      currentFramePath: this.currentFramePath,
    };
  }

  dispose() {
    this.root.removeFromParent();
    this.sprite.material.dispose();
    this.highlight.geometry.dispose();
    this.highlight.material.dispose();
  }
}
