# Architecture

The V1 project keeps the runtime in small, focused modules:

- `src/app.js` builds the dashboard shell, starts the renderer, and wires UI state.
- `src/world/` owns the orthographic camera, GLB map, grid conversion, overlay, and furniture placement.
- `src/agents/` owns actor state, real PNG frame animation, seeded movement, reservations, and occupancy.
- `src/assets/` owns catalog loading, GLB/PNG loading, and canonical asset paths.
- `src/ui/` owns the sidebar, dashboard controls, inspector, and Assets page.
- `tools/validate-assets.mjs` checks the prepared runtime foundation before browser validation.

The world coordinate convention is centered on the supplied normalized GLB: `C01,R01` is the center of world cell `(-11.5,-4.5)` and `C24,R10` is `(11.5,4.5)`. Grid boundaries are `x = [-12,12]` and `z = [-5,5]`.

The only live simulation states are `IDLE` and `WALKING`. An actor holds its occupied source cell, reserves a cardinal target before moving, interpolates between the two cells, then releases and occupies the target on completion.

## Field render depth contract

The field is rendered as a depth-tested 3D scene:

1. Canonical map/land geometry writes depth.
2. Furniture/map props retain their authored material depth behavior.
3. PNG field billboards use a small clip-space depth bias in `src/rendering/platinumBillboardDepth.js`.
4. Billboards keep normal transparent sorting, `depthTest: true`, and `depthWrite: false`.
5. The grid and selection ring remain separate debug/selection visuals.

Scene-graph insertion order is not the field-layer contract. The source-grounded Platinum sequence is: compute the camera view, render land, render map props, save the projection, apply the temporary projection-depth adjustment, render field effects and `BillboardLists_Draw()`, then restore the original projection. Actor billboards intentionally receive the small bias to match that adjustment near raised world geometry while retaining ordinary depth testing. The development-only `window.__OFFICE_DEPTH_TEST__` harness reproduces top-wall, floor, foreground-prop, and two-actor overlap cases without changing normal runtime state.
