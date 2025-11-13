# D3: Cache Crafter (D3.b)

## Game Design Vision

A globe-spanning grid-crafting game. The grid is defined over the entire Earth using a coordinate system anchored at **Null Island** (0° lat, 0° lng). You can pan the map anywhere to _see_ cells, but only cells near your character are interactive. Cells are “memoryless” once they leave the screen, letting you farm tokens by moving in and out of range. Practice collecting and crafting to reach a higher-value target token and win.

## Technologies

TypeScript, Leaflet, Deno/Vite build, GH Actions + Pages, deterministic hashing via luck().

## D3.b Steps

Global grid scaffold — world map, player marker, Null-Island cell math.
Viewport-driven grid — spawn/despawn cells based on map bounds.
Player movement & nearby radius — N/S/E/W controls, local interaction zone.
Crafting mastery & memoryless cells — inventory, crafting, higher win threshold, off-screen reset.

## Checklist

[x] Global grid scaffold
[x] Viewport-driven grid
[ ] Player movement & nearby radius
[ ] Crafting mastery & memoryless cells
