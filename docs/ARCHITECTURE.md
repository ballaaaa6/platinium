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
