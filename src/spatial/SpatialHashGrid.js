//2d spatial hash grid for frustum culling and fast spatial collision queries
let globalQueryToken = 1;

export class SpatialHashGrid {
  constructor(cellSize = 8.0, mapSize = 80.0) {
    this.cellSize = cellSize;
    this.mapSize = mapSize;
    this.dim = Math.ceil(mapSize / cellSize);
    this.cells = new Array(this.dim * this.dim);
    for (let i = 0; i < this.cells.length; i++) {
      this.cells[i] = [];
    }
  }

  clear() {
    for (let i = 0; i < this.cells.length; i++) {
      this.cells[i].length = 0;
    }
  }

  insert(entity, radius = 0.5) {
    const x = entity.x;
    const y = entity.y;
    const minCx = Math.max(0, Math.floor((x - radius) / this.cellSize));
    const maxCx = Math.min(this.dim - 1, Math.floor((x + radius) / this.cellSize));
    const minCy = Math.max(0, Math.floor((y - radius) / this.cellSize));
    const maxCy = Math.min(this.dim - 1, Math.floor((y + radius) / this.cellSize));

    for (let cy = minCy; cy <= maxCy; cy++) {
      const rowOffset = cy * this.dim;
      for (let cx = minCx; cx <= maxCx; cx++) {
        this.cells[rowOffset + cx].push(entity);
      }
    }
  }

  queryAABB(minX, minY, maxX, maxY, outList = []) {
    outList.length = 0;
    const token = ++globalQueryToken;

    const minCx = Math.max(0, Math.floor(minX / this.cellSize));
    const maxCx = Math.min(this.dim - 1, Math.floor(maxX / this.cellSize));
    const minCy = Math.max(0, Math.floor(minY / this.cellSize));
    const maxCy = Math.min(this.dim - 1, Math.floor(maxY / this.cellSize));

    for (let cy = minCy; cy <= maxCy; cy++) {
      const rowOffset = cy * this.dim;
      for (let cx = minCx; cx <= maxCx; cx++) {
        const bucket = this.cells[rowOffset + cx];
        for (let i = 0; i < bucket.length; i++) {
          const item = bucket[i];
          if (item._sqToken !== token) {
            item._sqToken = token;
            outList.push(item);
          }
        }
      }
    }
    return outList;
  }
}
