import * as Utils from './utils.js'
import { Tilegrid } from './tilegrid.js'

const MAX_UNITS = 10

const CHECK_TOUCHED_PERIOD = 800
const CLICK_ADD_PACER = 1000
const HIGHTLIGHT_COLOR = `rgba(1, 100, 100, 0.5)`

class Unit {
  constructor (gridX, gridY, gridW, gridH, actionID) {
    //debugger
    this.actionID = actionID
    this.gridX = Math.floor(gridX)
    this.gridY = Math.floor(gridY)
    // actionID determines which action to take from a table
    // the trigger does not care what kind of trigger it is, that's determined elsewhere
    this.worldX = Math.floor(gridX * Tilegrid.tileSize)
    this.worldY = Math.floor(gridY * Tilegrid.tileSize)

    this.gridW = gridW
    this.gridH = gridH
    this.width = gridW * Tilegrid.tileSize
    this.height = gridH * Tilegrid.tileSize
    this.active = true
    this.frame = 0
    this.frameMin = 0
    this.frameMax = 0
    this.velX = 0
    this.velY = 0
  }
}

export class Trigger {
  static grid
  constructor (game) {
    this.game = game
    this.units = new Array(MAX_UNITS)
    this.checkTouchedPacer = new Utils.createMillisecondPacer(
      CHECK_TOUCHED_PERIOD
    )
    this.clickAddPacer = new Utils.createMillisecondPacer(CLICK_ADD_PACER)
  }

  addUnitAtPoint (worldX, worldY, actionID) {
    let gridW = 1
    let gridH = 1
    let gridX = worldX / Tilegrid.tileSize
    let gridY = worldY / Tilegrid.tileSize
    return this.addUnitToGrid(gridX, gridY, gridW, gridH, actionID)
  }

  unitCellMatchesLocation (gridX, gridY) {
    for (const unit of this.units) {
      if (unit instanceof Unit) {
        if (unit.gridX == gridX && unit.gridY == gridY) {
          return true
        }
      }
    }
    return false
  }

  updateGrid () {
    let grid = []
    for (const unit of this.units) {
      if (unit instanceof Unit) {
        let row = [
          unit.gridX,
          unit.gridY,
          unit.gridW,
          unit.gridH,
          unit.actionID
        ]
        grid.push(row)
      }
    }
    console.log('trigger grid updated')
    Trigger.grid = grid
  }

  addUnitToGridDefault (gridX, gridY, actionID) {
    let gridW = 1
    let gridH = 1
    if (this.clickAddPacer()) {
      this.addUnitToGrid(gridX, gridY, gridW, gridH, actionID)
      this.updateGrid()
    }
  }

  addUnitToGrid (gridX, gridY, gridW, gridH, actionID) {
    let newUnit
    for (let i = 0; i < MAX_UNITS; i++) {
      let element = this.units[i]
      if (!(element instanceof Unit)) {
        this.units[i] = new Unit(gridX, gridY, gridW, gridH, actionID)
        console.log('added trigger zone at ' + i)
        break
      } else if (this.unitCellMatchesLocation(gridX, gridY)) {
        this.units[i] = new Unit(gridX, gridY, gridW, gridH, actionID)
        console.log('updated trigger zone at ' + i)
        break
      }
    }
    return newUnit
  }

  draw () {
    for (let unit of this.units) {
      if (unit instanceof Unit && unit.active) {
        //debugger
        let screenX = unit.worldX - this.game.cameraX
        let screenY = unit.worldY - this.game.cameraY

        this.game.ctx.fillStyle = HIGHTLIGHT_COLOR

        this.game.ctx.fillRect(screenX, screenY, unit.width, unit.height)
      }
    }
  }

  detectCollision = (a, b) => {
    return (
      a.worldX < b.worldX + b.width &&
      a.worldX + a.width > b.worldX &&
      a.worldY < b.worldY + b.height &&
      a.worldY + a.height > b.worldY
    )
  }

  triggerAction (triggerID) {
    console.log('Trigger action ' + triggerID)
  }

  checkPlayerTouchUnit (unit) {
    if (unit?.constructor.name == 'Unit' && entity.active) {
      if (this.detectCollision(unit, this.game.player)) {
        this.triggerAction(unit.triggerID)
      }
    }
  }

  update () {
    for (let unit of this.units) {
      if (unit instanceof Unit && unit.active) {
        this.checkTouchedPacer() && this.checkPlayerTouchUnit()
      }
    }
  }
}
