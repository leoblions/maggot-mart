import * as Utils from './utils.js'
import { Tilegrid } from './tilegrid.js'

const PF_GRID_PASSES = 15
const GRID_UPDATE_PERIOD = 800
const TARGET_OFFSET_X = 30
const TARGET_OFFSET_Y = 30
const DRAW_WALL_GRID = true
const DRAW_PF_NUMBERS = false
const SUPPRESS_OOBE = true
var tsize

export class Pathfind {
  constructor (game) {
    this.game = game
    this.cols = this.game.tilegrid.tilesX
    this.rows = this.game.tilegrid.tilesY
    //debugger
    tsize = this.game.tilegrid.tileSize
    this.halfSquare = Math.floor(tsize / 2)
    this.checkGrid = this.blankGrid(this.cols, this.rows, false)
    this.wallGrid = this.blankGrid(this.cols, this.rows, false)
    this.updateWallGrid()
    this.valueGrid = this.blankGrid(this.cols, this.rows, 0)
    this.updatePacer = Utils.createMillisecondPacer(GRID_UPDATE_PERIOD)
    
  }

  blankGrid (cols, rows, fillvalue) {
    let matrix = []
    let fillValue = 0
    for (let y = 0; y < rows; y++) {
      matrix[y] = [] // add row
      for (let x = 0; x < cols; x++) {
        matrix[y][x] = fillValue
      }
    }
    return matrix
  }

  screenGridPositionIsSolid (sgridX, sgridY) {
    let soffsetGridX = Math.floor((this.game.cameraX + this.halfSquare) / tsize)
    let soffsetGridY = Math.floor((this.game.cameraY + this.halfSquare) / tsize)
    let gridX = sgridX + soffsetGridX
    let gridY = sgridY + soffsetGridY
    let kind
    try {
      kind = Tilegrid.grid[gridY][gridX]
    } catch (error) {
      return true
    }
    return Tilegrid.solidArr[kind]
  }

  updateWallGrid () {
    // run once when loading level, or if walls change
    // true is wall, false is walkable
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        if (this.screenGridPositionIsSolid(x, y)) {
          this.wallGrid[y][x] = true
        } else {
          this.wallGrid[y][x] = false
        }
      }
    }
    //debugger
  }

  cellHasMarkedNeighbor (grid, gridX, gridY) {
    if (
      this.cellExistsAndGTOne(grid, gridX - 1, gridY - 1) ||
      this.cellExistsAndGTOne(grid, gridX - 1, gridY) ||
      this.cellExistsAndGTOne(grid, gridX - 1, gridY + 1) ||
      this.cellExistsAndGTOne(grid, gridX, gridY - 1) ||
      this.cellExistsAndGTOne(grid, gridX, gridY + 1) ||
      this.cellExistsAndGTOne(grid, gridX + 1, gridY - 1) ||
      this.cellExistsAndGTOne(grid, gridX + 1, gridY) ||
      this.cellExistsAndGTOne(grid, gridX + 1, gridY + 1)
    ) {
      return true
    } else {
      return false
    }
  }

  cellExistsAndGTOne (grid, gridX, gridY) {
    try {
      let cellValue = grid[gridY][gridX]
      return cellValue
    } catch (error) {
      return false
    }
  }

  getDirectionTowardsPlayer (worldX, worldY) {
    let screenX = worldX - this.game.cameraX
    let screenY = worldY - this.game.cameraY
    let screenGX = Math.floor(screenX / tsize)
    let screenGY = Math.floor(screenY / tsize)
    let L, R, U, D, max
    max = 0
    let dir = 'N'
    try {
      L = valueGrid[screenGY][screenGX - 1]
      if (L > max) {
        max = L
        dir = 'L'
      }
    } catch (Exception) {}
    try {
      R = valueGrid[screenGY][screenGX + 1]
      if (R > max) {
        max = R
        dir = 'R'
      }
    } catch (Exception) {}
    try {
      U = valueGrid[screenGY - 1][screenGX]
      if (U > max) {
        max = U
        dir = 'U'
      }
    } catch (Exception) {}
    try {
      D = valueGrid[screenGY + 1][screenGX]
      if (D > max) {
        max = D
        dir = 'D'
      }
    } catch (Exception) {}

    return dir
  }

  updateValueGrid () {
    this.checkGrid = this.blankGrid(this.cols, this.rows, false)
    this.valueGrid = this.blankGrid(this.cols, this.rows, 0)
    let pgX = Math.floor((this.game.player.screenX + TARGET_OFFSET_X) / tsize)
    let pgY = Math.floor((this.game.player.screenY + TARGET_OFFSET_Y) / tsize)
    try {
      this.checkGrid[pgY][pgX] = true
      this.valueGrid[pgY][pgX] = 5
    } catch (error) {}

    for (let i = 0; i < PF_GRID_PASSES; i++) {
      this.updateValueGridPass(i)
    }
  }

  updateValueGridPass (amountToAdd) {
    // update check grid
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        if (!this.wallGrid[y][x] && this.valueGrid[y][x] > 0) {
          this.checkGrid[y][x] = true
        }
      }
    }
    // update pfGrid
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        let tileIsWall = this.wallGrid[y][x]
        if (tileIsWall) {
          continue // don't mark walls
        } else {
          if (this.cellHasMarkedNeighbor(this.checkGrid, x, y)) {
            this.valueGrid[y][x] += amountToAdd
          }
        }
      }
    }
  }

  draw () {
    if (DRAW_WALL_GRID) {
      for (let y = 0; y < this.rows; y++) {
        for (let x = 0; x < this.cols; x++) {
          if (this.wallGrid[y][x]) {
            let w = tsize - 1
            let h = tsize - 1

            let boxX = x * tsize
            let boxY = y * tsize
            let alpha = 0.5
            this.game.ctx.fillStyle = `rgba(255, 0, 0, ${alpha})`
            this.game.ctx.fillRect(boxX, boxY, w, h)
            //gp.g2.fillRect(boxX, boxY, w, h)
          }
        }
      }
    }
    if (DRAW_PF_NUMBERS) {
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          if (this.valueGrid[y][x] > 0) {
            let w = tsize - 1
            let h = tsize - 1

            let boxX = x * tsize
            let boxY = y * tsize
            let alpha = this.valueGrid[y][x]
            this.game.ctx.fillStyle = `rgba(255, 0, 0, ${alpha})`
            this.game.ctx.fillRect(boxX, boxY, w, h)
          }
        }
      }
    }
  }

  update () {
    if (Tilegrid?.grid == null) {
      return
    }
    if (this.updatePacer()){
      this.updateValueGrid()
      //console.log("UPDATE PF GRID")
    }

    //this.updateWallGrid()
    
  }
}
