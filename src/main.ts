import leaflet from "leaflet";
import "leaflet/dist/leaflet.css";
import "./style.css";
import "./_leafletWorkaround.ts";
import luck from "./_luck.ts";

const controlPanelDiv = document.createElement("div");
controlPanelDiv.id = "controlPanel";
document.body.append(controlPanelDiv);

const mapDiv = document.createElement("div");
mapDiv.id = "map";
document.body.append(mapDiv);

const statusPanelDiv = document.createElement("div");
statusPanelDiv.id = "statusPanel";
document.body.append(statusPanelDiv);

const START_LOCATION = leaflet.latLng(
  36.997936938057016,
  -122.05703507501151,
);
const NULL_ISLAND = leaflet.latLng(0, 0);

const GAME_ZOOM = 19;
const TILE_DEG = 1e-4;
const NEARBY_RADIUS = 3;
const _WIN_THRESHOLD = 32;

const SPAWN_PROB = 0.35;

type CellId = { i: number; j: number };

const map = leaflet.map(mapDiv, {
  center: START_LOCATION,
  zoom: GAME_ZOOM,
  minZoom: GAME_ZOOM,
  maxZoom: GAME_ZOOM,
  zoomControl: false,
  scrollWheelZoom: false,
});

leaflet
  .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  })
  .addTo(map);

let playerLatLng = START_LOCATION;
const playerMarker = leaflet
  .marker(playerLatLng)
  .addTo(map)
  .bindTooltip("You");

function latLngToCell(latlng: leaflet.LatLng): CellId {
  const i = Math.floor((latlng.lat - NULL_ISLAND.lat) / TILE_DEG);
  const j = Math.floor((latlng.lng - NULL_ISLAND.lng) / TILE_DEG);
  return { i, j };
}

function cellToBounds(cell: CellId): leaflet.LatLngBounds {
  const lat0 = NULL_ISLAND.lat + cell.i * TILE_DEG;
  const lng0 = NULL_ISLAND.lng + cell.j * TILE_DEG;
  return leaflet.latLngBounds(
    [lat0, lng0],
    [lat0 + TILE_DEG, lng0 + TILE_DEG],
  );
}

function manhattan(a: CellId, b: CellId) {
  return Math.abs(a.i - b.i) + Math.abs(a.j - b.j);
}

function getPlayerCell(): CellId {
  return latLngToCell(playerLatLng);
}

function nearby(cell: CellId) {
  return manhattan(cell, getPlayerCell()) <= NEARBY_RADIUS;
}

function baseSpawns(cell: CellId): boolean {
  return luck(`${cell.i},${cell.j},spawn`) < SPAWN_PROB;
}

function baseValue(cell: CellId): number {
  if (!baseSpawns(cell)) return 0;
  const r = luck(`${cell.i},${cell.j},value`);
  if (r < 0.25) return 1;
  if (r < 0.5) return 2;
  if (r < 0.75) return 4;
  return 8;
}

function makeLabel(text: string) {
  return leaflet.divIcon({
    className: "cell-label",
    html: `<div class="cell-label-inner">${text}</div>`,
    iconSize: [30, 12],
    iconAnchor: [15, 6],
  });
}

function labelTextFor(v: number) {
  return v > 0 ? String(v) : "·";
}

type DrawnCell = {
  rect: leaflet.Rectangle;
  label: leaflet.Marker;
  cell: CellId;
};

const drawn: Map<string, DrawnCell> = new Map();

function cellKey(cell: CellId): string {
  return `${cell.i},${cell.j}`;
}

function styleCell(cell: CellId) {
  const item = drawn.get(cellKey(cell));
  if (!item) return;
  const isNearby = nearby(cell);
  item.rect.setStyle({
    color: isNearby ? "#000" : "#888",
    weight: isNearby ? 2 : 1,
    fillOpacity: 0.05,
  });
}

function drawCell(cell: CellId) {
  const bounds = cellToBounds(cell);
  const rect = leaflet.rectangle(bounds, { weight: 1, fillOpacity: 0.05 })
    .addTo(map);
  const center = bounds.getCenter();
  const v = baseValue(cell);

  const label = leaflet
    .marker(center, { icon: makeLabel(labelTextFor(v)), interactive: false })
    .addTo(map);

  rect.on("click", () => {
    if (!nearby(cell)) return;
  });

  const info: DrawnCell = { rect, label, cell };
  drawn.set(cellKey(cell), info);
  styleCell(cell);
}

function updateVisibleCells() {
  const bounds = map.getBounds();
  const south = bounds.getSouth();
  const north = bounds.getNorth();
  const west = bounds.getWest();
  const east = bounds.getEast();

  const iMin = Math.floor((south - NULL_ISLAND.lat) / TILE_DEG);
  const iMax = Math.floor((north - NULL_ISLAND.lat) / TILE_DEG);
  const jMin = Math.floor((west - NULL_ISLAND.lng) / TILE_DEG);
  const jMax = Math.floor((east - NULL_ISLAND.lng) / TILE_DEG);

  const needed = new Set<string>();

  for (let i = iMin; i <= iMax; i++) {
    for (let j = jMin; j <= jMax; j++) {
      const cell: CellId = { i, j };
      const key = cellKey(cell);
      needed.add(key);
      if (!drawn.has(key)) {
        drawCell(cell);
      } else {
        styleCell(cell);
      }
    }
  }

  for (const [key, value] of drawn) {
    if (!needed.has(key)) {
      map.removeLayer(value.rect);
      map.removeLayer(value.label);
      drawn.delete(key);
    }
  }
}

map.whenReady(() => {
  updateVisibleCells();
});

map.on("moveend", () => {
  updateVisibleCells();
});

function restyleAllVisibleCells() {
  for (const { cell } of drawn.values()) {
    styleCell(cell);
  }
}

function movePlayer(di: number, dj: number) {
  playerLatLng = leaflet.latLng(
    playerLatLng.lat + di * TILE_DEG,
    playerLatLng.lng + dj * TILE_DEG,
  );
  playerMarker.setLatLng(playerLatLng);

  map.panTo(playerLatLng);
  restyleAllVisibleCells();
}

controlPanelDiv.innerHTML = `
  <div><strong>Cache Crafter</strong></div>
  <div class="controls-row">
    <button id="moveNorth">↑ North</button>
  </div>
  <div class="controls-row">
    <button id="moveWest">← West</button>
    <button id="moveCenter">⌖ Center Map</button>
    <button id="moveEast">East →</button>
  </div>
  <div class="controls-row">
    <button id="moveSouth">South ↓</button>
  </div>
`;

statusPanelDiv.textContent = "Holding: (none)";

const btnNorth = document.getElementById("moveNorth") as
  | HTMLButtonElement
  | null;
const btnSouth = document.getElementById("moveSouth") as
  | HTMLButtonElement
  | null;
const btnWest = document.getElementById("moveWest") as HTMLButtonElement | null;
const btnEast = document.getElementById("moveEast") as HTMLButtonElement | null;
const btnCenter = document.getElementById("moveCenter") as
  | HTMLButtonElement
  | null;

btnNorth?.addEventListener("click", () => movePlayer(+1, 0));
btnSouth?.addEventListener("click", () => movePlayer(-1, 0));
btnWest?.addEventListener("click", () => movePlayer(0, -1));
btnEast?.addEventListener("click", () => movePlayer(0, +1));
btnCenter?.addEventListener("click", () => map.panTo(playerLatLng));
