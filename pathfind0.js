import * as Utils from './utils.js'
import { Tilegrid } from './tilegrid.js'

const PF_GRID_PASSES = 6
const GRID_UPDATE_PERIOD = 800
const TARGET_OFFSET_X = 30
const TARGET_OFFSET_Y = 30
const DRAW_WALL_GRID = false
const DRAW_PF_NUMBERS = true
const SUPPRESS_OOBE = true
var tsize
const SCREEN_TILES = 10 // divide the screen into 10x10
const PLAYER_CELL_START_VALUE = 5
const STEP = 1
/*
First pass zeroes value grid
Iterator counts down from pass amount
assign iterator to Player's square
count down iterator
assign iterator to squares bordering ones with value iterator+1(player) and not a solid square
count down iterator, loop until reaching zero
untouched squares will have zero value
enemies will move to a square with higher value
enemies will not move if all quares have zero value




*/


export class Pathfind {
  constructor (game) {
    this.game = game
    this.cols = this.game.tilegrid.tilesX
    this.rows = this.game.tilegrid.tilesY
    //debugger
    tsize = this.game.tilegrid.tileSize
    this.halfSquare = Math.floor(tsize / 2)
    this.checkGrid = this.blankGrid(this.cols, this.rows, false)
    //world grid coord space
    this.wallGrid = this.blankGrid(this.cols, this.rows, false)
    this.updateWallGrid()
    //screen coord space
    this.screenSolidGrid = this.blankGrid(SCREEN_TILES, SCREEN_TILES, false)
    
    this.valueGrid = this.blankGrid(this.cols, this.rows, 0)
    this.updatePacer = Utils.createMillisecondPacer(GRID_UPDATE_PERIOD)
    this.screenTileWidth = Math.floor(this.game.board.width / SCREEN_TILES)
    this.screenTileHeight = Math.floor(this.game.board.height / SCREEN_TILES)
    
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

  screenGridPositionIsSolidWG (sgridX, sgridY) {
    //debugger
    let soffsetGridX = Math.floor((this.game.cameraX + this.halfSquare) / tsize)
    let soffsetGridY = Math.floor((this.game.cameraY + this.halfSquare) / tsize)
    let gridX = sgridX + soffsetGridX
    let gridY = sgridY + soffsetGridY
    let kind
    try {
      kind = this.wallGrid[gridY][gridX]
      return kind
    } catch (error) {
      // solid if out of bounds
      return true
    }
  }

  updateWallGrid () {
    // run once when loading level, or if walls change
    // wall grid assigns boolean value to every world grid cell
    // true is wall, false is walkable
    let wc = 0
    let fc = 0
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        let kind = Tilegrid.grid[y][x]
        let solid = Tilegrid.solidArr[kind]
        //debugger
        if (solid) {
          this.wallGrid[y][x] = true
          wc+=1
        } else {
          this.wallGrid[y][x] = false
          fc+=1
        }
      }
    }
    //console.log("Wall cells "+wc)
    //debugger
  }

  screenPointSolid(screenX,screenY){
    let gridX = Math.floor((screenX+this.game.cameraX)/this.game.tileSize)
    let gridY = Math.floor((screenY+this.game.cameraY)/this.game.tileSize)
    //debugger
    try {
      //solid = this.wallGrid[gridY][gridX]
      let solid = Tilegrid.solidArr[Tilegrid.grid[gridY][gridX]]
      return solid
    } catch (error) {
      // solid if out of bounds
      return true
    }

  }

  updateSolidTileGrid () {
    // run repeatedly 
    // which areas on screen are solid
    // screen divided into squares, smaller area than wallgrid
    // true is wall, false is walkable
    let wc = 0
    let fc = 0
    for (let y = 0; y < SCREEN_TILES; y++) {
      for (let x = 0; x < SCREEN_TILES; x++) {
        let screenX = this.screenTileWidth*x
        let screenY = this.screenTileHeight*y
        //debugger
        let solid = this.screenPointSolid (screenX+20, screenY+20)
        //debugger
        if (solid) {
          this.screenSolidGrid[y][x] = true
          wc+=1
        } else {
          this.screenSolidGrid[y][x] = false
          fc+=1
        }
      }
    }
    console.log("Wall cells "+wc)
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
  
    let gridX = Math.floor(worldX / tsize)
    let gridY = Math.floor(worldY / tsize)
    let L, R, U, D, max
    max = 0
    let dir = 'N'
    try {
      L = this.valueGrid[gridY][gridX - 1]
      if (L > max) {
        max = L
        dir = 'L'
      }
    } catch (Exception) {}
    try {
      R = this.valueGrid[gridY][gridX + 1]
      if (R > max) {
        max = R
        dir = 'R'
      }
    } catch (Exception) {}
    try {
      U = this.valueGrid[gridY - 1][gridX]
      if (U > max) {
        max = U
        dir = 'U'
      }
    } catch (Exception) {}
    try {
      D = this.valueGrid[gridY + 1][gridX]
      if (D > max) {
        max = D
        dir = 'D'
      }
    } catch (Exception) {}

    return dir
  }

  updateValueGrid () {
    // reset grids
    this.checkGrid = this.blankGrid(this.cols, this.rows, false)
    this.valueGrid = this.blankGrid(this.cols, this.rows, 0)
    // location of player on grid
    let playerGridX = Math.floor((this.game.player.worldX + TARGET_OFFSET_X) / tsize)
    let playerGridY = Math.floor((this.game.player.worldY + TARGET_OFFSET_Y) / tsize)
    try {
      // mark the player position
      this.checkGrid[playerGridY][playerGridX] = true
      this.valueGrid[playerGridY][playerGridX] = PLAYER_CELL_START_VALUE
    } catch (error) {}
    let amountToAdd = PF_GRID_PASSES +1
    for (let i = 0; i < PF_GRID_PASSES; i++) {
      // update grids several passes
      this.updateValueGridPass(amountToAdd)
      amountToAdd-=STEP
    }
  }

  updateValueGridPass (amountToAdd) {
    //debugger
    // update check grid
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        if (!this.game.tilegrid.tileSolid(x,y) && this.valueGrid[y][x] > 0) {
          this.checkGrid[y][x] = true
        }
      }
    }
    // update pfGrid
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        let solid = this.game.tilegrid.tileSolid(x,y)
        if (solid) {
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
      
      for (let y = 0; y < SCREEN_TILES; y++) {
        for (let x = 0; x < SCREEN_TILES; x++) {
          //debugger
          if (this.screenSolidGrid[y][x]) {
            let w = this.screenTileWidth - 1
            let h = this.screenTileHeight - 1

            let boxX = x * this.screenTileWidth
            let boxY = y * this.screenTileHeight
            let alpha = 0.5
            this.game.ctx.fillStyle = `rgba(255, 0, 0, ${alpha})`
            //debugger
            this.game.ctx.fillRect(boxX, boxY, w, h)
            //gp.g2.fillRect(boxX, boxY, w, h)
          }
        }
      }
    }
    if (DRAW_PF_NUMBERS) {
      for (let y = 0; y < this.rows; y++) {
        for (let x = 0; x < this.cols; x++) {
          if (this.valueGrid[y][x] > 0) {
            let w = tsize - 1
            let h = tsize - 1

            let screenX = (x * tsize) + this.halfSquare - this.game.cameraX
            let screenY = (y * tsize) + this.halfSquare - this.game.cameraY
            //let alpha = this.valueGrid[y][x]
            this.game.ctx.fillStyle = `rgba(100, 100, 0, 0.5)`
            this.game.ctx.fillText( this.valueGrid[y][x] , screenX, screenY)
            
            //this.game.ctx.fillRect(boxX, boxY, w, h)
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
      //this.updateSolidTileGrid ()
      this.updateValueGrid()
      //console.log("UPDATE PF GRID")
    }

    //this.updateWallGrid()
    
  }
}
