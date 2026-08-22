import * as THREE from 'three';

const OFFICE_CAMERA_CONFIG = Object.freeze({
  yawDegrees: 0,
  pitchDegrees: 60,
  distance: 24,
  target: Object.freeze({ x: 0, y: 0.6, z: 0 }),
  mapWorldWidth: 24,
  horizontalPadding: 0.55,
  minimumViewHeight: 13.8,
  near: 0.1,
  far: 100,
});

// The office uses an axis-aligned orthographic field view. Do not introduce Y-axis isometric yaw.

export { OFFICE_CAMERA_CONFIG };

export function createOfficeCamera(width, height) {
  const camera = new THREE.OrthographicCamera(
    -1,
    1,
    1,
    -1,
    OFFICE_CAMERA_CONFIG.near,
    OFFICE_CAMERA_CONFIG.far,
  );
  const pitch = THREE.MathUtils.degToRad(OFFICE_CAMERA_CONFIG.pitchDegrees);
  const yaw = THREE.MathUtils.degToRad(OFFICE_CAMERA_CONFIG.yawDegrees);
  const horizontalDistance = OFFICE_CAMERA_CONFIG.distance * Math.cos(pitch);
  const verticalDistance = OFFICE_CAMERA_CONFIG.distance * Math.sin(pitch);

  camera.position.set(
    OFFICE_CAMERA_CONFIG.target.x + Math.sin(yaw) * horizontalDistance,
    OFFICE_CAMERA_CONFIG.target.y + verticalDistance,
    OFFICE_CAMERA_CONFIG.target.z + Math.cos(yaw) * horizontalDistance,
  );
  camera.lookAt(
    OFFICE_CAMERA_CONFIG.target.x,
    OFFICE_CAMERA_CONFIG.target.y,
    OFFICE_CAMERA_CONFIG.target.z,
  );
  camera.userData.officeCamera = {
    yawDegrees: OFFICE_CAMERA_CONFIG.yawDegrees,
    pitchDegrees: OFFICE_CAMERA_CONFIG.pitchDegrees,
  };
  resizeOfficeCamera(camera, width, height);
  return camera;
}

export function resizeOfficeCamera(camera, width, height) {
  const aspect = Math.max(width, 1) / Math.max(height, 1);
  const viewHeight = Math.max(
    OFFICE_CAMERA_CONFIG.minimumViewHeight,
    (OFFICE_CAMERA_CONFIG.mapWorldWidth + OFFICE_CAMERA_CONFIG.horizontalPadding * 2) / aspect,
  );
  const viewWidth = viewHeight * aspect;

  camera.left = -viewWidth / 2;
  camera.right = viewWidth / 2;
  camera.top = viewHeight / 2;
  camera.bottom = -viewHeight / 2;
  camera.updateProjectionMatrix();
}
