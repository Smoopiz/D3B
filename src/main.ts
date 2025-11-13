import leaflet from "leaflet";
import "leaflet/dist/leaflet.css";
import "./_leafletWorkaround.ts";
import luck from "./_luck.ts";
import "./style.css";

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

const playerLatLng = START_LOCATION;
const _playerMarker = leaflet
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

function _nearby(cell: CellId) {
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

function drawCell(cell: CellId) {
  const bounds = cellToBounds(cell);
  const rect = leaflet.rectangle(bounds, { weight: 1, fillOpacity: 0.05 })
    .addTo(map);
  const center = bounds.getCenter();
  const v = baseValue(cell);

  const label = leaflet
    .marker(center, { icon: makeLabel(labelTextFor(v)), interactive: false })
    .addTo(map);

  drawn.set(cellKey(cell), { rect, label, cell });
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

controlPanelDiv.innerHTML = `
  <div><strong>Cache Crafter</strong></div>
`;

statusPanelDiv.textContent = "Holding: (none)";
