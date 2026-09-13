import { planeColor, makeGamutMesh } from "../../utils/gamut";
import type { Plane } from "../../utils/gamut";
import { toColor } from "../../utils/oklch";
import type { ColorMode, Gamut, PickerColor } from "../../utils/oklch";

interface ChartRequest {
  type: "chart";
  id: number;
  value: PickerColor;
  plane: Plane;
  width: number;
  height: number;
  maxChroma: number;
  p3: boolean;
  rec2020: boolean;
  displayP3: boolean;
}
interface MeshRequest {
  type: "mesh";
  id: number;
  mode: ColorMode;
  gamuts: Gamut[];
}
const EDGE_RGB = [
  [34, 50, 65],
  [255, 255, 255],
  [135, 68, 204],
];
const SPACES: Gamut[] = ["srgb", "p3", "rec2020"];
const showRank = (rank: number, request: ChartRequest): boolean =>
  rank === 0 || (rank === 1 && request.p3) || (rank >= 1 && rank <= 2 && request.rec2020);
const traceEdges = (ranks: Uint8Array, pixels: Uint8ClampedArray, request: ChartRequest) => {
  const { width, height } = request;
  const edges: { index: number; rank: number }[] = [];
  for (let y = 1; y < height; y += 1) {
    for (let x = 1; x < width; x += 1) {
      const index = y * width + x;
      const rank = ranks[index] ?? 4;
      const neighbors = [
        ranks[index - 1] ?? 4,
        ranks[index + 1] ?? 4,
        ranks[index - width] ?? 4,
        ranks[index + width] ?? 4,
      ];
      const neighbor = Math.min(...neighbors.filter((candidate) => candidate !== rank));
      const edge = Math.min(rank, neighbor);
      if (Number.isFinite(neighbor) && EDGE_RGB[edge] && showRank(edge, request)) {
        edges.push({ index, rank: edge });
      }
    }
  }
  for (const edge of edges) {
    const x = edge.index % width;
    const y = Math.floor(edge.index / width);
    const rgb = EDGE_RGB[edge.rank];
    if (!rgb) {
      continue;
    }
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        const px = x + dx;
        const py = y + dy;
        if (px >= 0 && px < width && py >= 0 && py < height) {
          pixels.set(rgb, (py * width + px) * 4);
          pixels[py * width * 4 + px * 4 + 3] = 255;
        }
      }
    }
  }
};
const renderChart = (request: ChartRequest) => {
  const { width, height } = request;
  const checkerSize = Math.max(6, Math.round(width / 32));
  const pixels = new Uint8ClampedArray(width * height * 4);
  const ranks = new Uint8Array(width * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const color = toColor(
        planeColor(
          request.value,
          request.plane,
          x / (width - 1),
          1 - y / (height - 1),
          request.maxChroma,
        ),
      );
      const rank = SPACES.findIndex((space) => color.inGamut(space, { epsilon: 0.00001 }));
      const index = y * width + x;
      ranks[index] = rank === -1 ? 4 : rank;
      const offset = index * 4;
      if (showRank(rank, request)) {
        const channels = color.to(request.displayP3 ? "p3" : "srgb").coords;
        for (let channel = 0; channel < 3; channel += 1) {
          pixels[offset + channel] = Math.max(0, Math.min(1, channels[channel] ?? 0)) * 255;
        }
      } else {
        const shade =
          (Math.floor(x / checkerSize) + Math.floor(y / checkerSize)) % 2 === 0 ? 235 : 243;
        pixels.set([shade, shade + 2, shade + 4], offset);
      }
      pixels[offset + 3] = 255;
    }
  }
  traceEdges(ranks, pixels, request);
  return { displayP3: request.displayP3, height, id: request.id, pixels, width };
};
self.addEventListener("message", (event: MessageEvent<ChartRequest | MeshRequest>) => {
  const request = event.data;
  const response =
    request.type === "mesh"
      ? {
          id: request.id,
          meshes: request.gamuts.map((gamut) => makeGamutMesh(request.mode, gamut)),
        }
      : renderChart(request);
  // Worker messaging has no Window targetOrigin parameter.
  // oxlint-disable-next-line unicorn/require-post-message-target-origin
  self.postMessage(response);
});
