const SPRITE_VERTEX_DEPTH_ANCHOR = 'gl_Position = projectionMatrix * mvPosition;';

export const PLATINUM_BILLBOARD_DEPTH_BIAS_NDC = 0.024;

export function configurePlatinumBillboardMaterial(material) {
  if (!material?.isSpriteMaterial) {
    throw new TypeError('Platinum billboard depth requires a THREE.SpriteMaterial.');
  }

  const cacheKey = `platinum-billboard-depth-v1-${PLATINUM_BILLBOARD_DEPTH_BIAS_NDC.toFixed(6)}`;
  material.onBeforeCompile = (shader) => {
    const anchorCount = shader.vertexShader.split(SPRITE_VERTEX_DEPTH_ANCHOR).length - 1;

    if (anchorCount !== 1) {
      throw new Error(
        `Platinum billboard depth patch expected one Sprite vertex anchor; found ${anchorCount}.`,
      );
    }

    shader.vertexShader = shader.vertexShader.replace(
      SPRITE_VERTEX_DEPTH_ANCHOR,
      `${SPRITE_VERTEX_DEPTH_ANCHOR}\n\tgl_Position.z -= ${PLATINUM_BILLBOARD_DEPTH_BIAS_NDC.toFixed(6)} * gl_Position.w;`,
    );
    material.userData.platinumBillboardDepthPatchApplied = true;
  };
  material.customProgramCacheKey = () => cacheKey;
  material.userData.platinumBillboardDepthBiasNdc = PLATINUM_BILLBOARD_DEPTH_BIAS_NDC;
  material.userData.platinumBillboardDepthPatchApplied = false;
  material.needsUpdate = true;

  return material;
}
