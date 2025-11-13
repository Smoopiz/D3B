import leaflet from "leaflet";
import "leaflet/dist/leaflet.css";
import "./_leafletWorkaround.ts";
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

function _cellToBounds(cell: CellId): leaflet.LatLngBounds {
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

controlPanelDiv.innerHTML = `
  <div><strong>Cache Crafter</strong></div>
`;

statusPanelDiv.textContent = "Holding: (none)";
