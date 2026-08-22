import * as THREE from 'three';

const VIEW_HEIGHT = 18.5;

export function createOfficeCamera(width, height) {
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
  camera.position.set(13, 18, 17);
  camera.lookAt(0, 0, 0);
  resizeOfficeCamera(camera, width, height);
  return camera;
}

export function resizeOfficeCamera(camera, width, height) {
  const aspect = Math.max(width, 1) / Math.max(height, 1);
  const viewWidth = VIEW_HEIGHT * aspect;

  camera.left = -viewWidth / 2;
  camera.right = viewWidth / 2;
  camera.top = VIEW_HEIGHT / 2;
  camera.bottom = -VIEW_HEIGHT / 2;
  camera.updateProjectionMatrix();
}
