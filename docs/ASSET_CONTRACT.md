# Asset contract

The runtime consumes the prepared package under `public/game-assets/`.

- `map/default_office.glb` is the real map geometry.
- The public planning grid is 24 columns × 10 rows.
- One logical tile equals one Three.js world unit.
- Door cells are `C08,R01` and `C21,R10`.
- `catalog/furniture.json` contains 590 prop records with GLB paths and logical footprints.
- `catalog/characters.json` contains 269 graphics records; standard billboard-ready actors use the supplied PNG frames.
- Direction frames are `NORTH = [0,8,9,10]`, `SOUTH = [11,12,13,14]`, `WEST = [15,1,2,3]`, and `EAST = [4,5,6,7]`.
- Actor occupancy is one logical tile; the visual canvas is approximately 2×2 world units and anchored bottom-center.

Collision is planned from logical grid and catalog footprint metadata. Mesh triangles do not define simulation collision.
