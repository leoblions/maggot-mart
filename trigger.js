import * as Utils from './utils.js'
import { Tilegrid } from './tilegrid.js'

const MAX_UNITS = 10

const CHECK_TOUCHED_PERIOD = 800
const CLICK_ADD_PACER = 1000
const HIGHTLIGHT_COLOR = `rgba(1, 100, 100, 0.5)`
const DEFAULT_LEVEL_DATA_URL = '/data/trigger0.txt'
const LEVEL_DATA_PREFIX = '/data/trigger'
const LEVEL_DATA_SUFFIX = '.txt'
const LOAD_DEFAULT_LEVEL = false
/**
 * Data format:
 * gridX, gridY, gridW, gridH, actionID
 *
 * Trigger zones are rectangular zones in the world. When the player touches them,
 * it invokes a response in Brain
 */

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
  }
}

export class Trigger {
  static grid
  static lastInstance
  constructor (game) {
    this.game = game
    this.units = new Array(MAX_UNITS)
    this.checkTouchedPacer = new Utils.createMillisecondPacer(
      CHECK_TOUCHED_PERIOD
    )
    this.clickAddPacer = new Utils.createMillisecondPacer(CLICK_ADD_PACER)
    Trigger.lastInstance = this
    this.triggerZones = null
    this.initDataFromFile()
    // if (LOAD_DEFAULT_LEVEL) {
    //   this.loadDefaultLevel()
    // } else {
    //   this.loadCurrentLevel()
    // }
    //this.adjustBounds()
  }

  async initDataFromFile () {
    //fetch returns a promise
    let response = await fetch('./data/trigger_zones.json')

    this.triggerZones = await response.json()

    for (let unit of this.triggerZones) {
      unit.worldX = unit.gridX * Tilegrid.tileSize
      unit.worldY = unit.gridY * Tilegrid.tileSize
      unit.width = unit.gridW * Tilegrid.tileSize
      unit.height = unit.gridH * Tilegrid.tileSize
    }
  }

  loadCurrentLevel () {}

  loadCurrentLevel0 () {
    let currentLevelFile =
      LEVEL_DATA_PREFIX + this.game.level + LEVEL_DATA_SUFFIX
    Utils.loadFileAsText(currentLevelFile).then(
      function (value) {
        let grid = Utils.stringToGrid(value)

        //console.log(grid)
        if (grid != undefined && grid != null && grid.length != 0) {
          Trigger.grid = grid
          Trigger.lastInstance.gridDataToUnitsList()
        }
      },
      function (error) {
        console.log('No data found for ' + currentLevelFile)
        //console.log(error)
        Trigger.grid = null
      }
    )
  }

  loadDefaultLevel () {
    Utils.loadFileAsText(DEFAULT_LEVEL_DATA_URL).then(
      function (value) {
        let grid = Utils.stringToGrid(value)

        //console.log(grid)
        if (grid != undefined && grid != null && grid.length != 0) {
          Trigger.grid = grid
          Tilegrid.lastInstance.gridDataToUnitsList()
        }
      },
      function (error) {
        console.log('Load default level failed.')
        console.log(error)
      }
    )
  }

  gridDataToUnitsList () {
    for (const row of Trigger.grid) {
      this.units = []
      // destructure each line of grid
      const [gridX, gridY, gridW, gridH, actionID] = row
      let newUnit = new Unit(gridX, gridY, gridW, gridH, actionID)
      this.units.push(newUnit)
    }
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

  updateGridOld () {
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
  updateGrid () {
    let level = this.game.level
    for (const unit of this.units) {
      if (unit instanceof Unit && unit.level == level) {
        unit.active = true
      } else {
        unit.level = false
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
      let element = this.triggerZones[i]
      if (!(element instanceof Unit)) {
        this.triggerZones[i] = new Unit(gridX, gridY, gridW, gridH, actionID)
        console.log('added trigger zone at ' + i)
        break
      } else if (this.unitCellMatchesLocation(gridX, gridY)) {
        this.triggerZones[i] = new Unit(gridX, gridY, gridW, gridH, actionID)
        console.log('updated trigger zone at ' + i)
        break
      }
    }
    return newUnit
  }

  draw () {
    if (this.triggerZones == null) return
    for (let unit of this.triggerZones) {
      if (unit != null && unit.active) {
        //debugger
        let screenX = unit.worldX - this.game.cameraX
        let screenY = unit.worldY - this.game.cameraY

        this.game.ctx.fillStyle = HIGHTLIGHT_COLOR

        this.game.ctx.fillRect(screenX, screenY, unit.width, unit.height)
      }
    }
  }

  detectCollision = (a, b) => {
    debugger
    return (
      a.worldX < b.worldX + b.width &&
      a.worldX + a.width > b.worldX &&
      a.worldY < b.worldY + b.height &&
      a.worldY + a.height > b.worldY
    )
  }

  triggerAction (actionID) {
    console.log('Trigger action ' + actionID)
    this.game.brain.enqueueAction(actionID)
  }

  checkPlayerTouchUnit (unit) {
    if (!unit?.constructor.name == 'Unit') {
      debugger
    }
    if (unit.active) {
      if (this.detectCollision(unit, this.game.player)) {
        debugger
        this.triggerAction(unit.actionID)
      }
    }
  }

  update () {
    let checkColl = this.checkTouchedPacer()
    if (this.triggerZones == null) return
    for (let unit of this.triggerZones) {
      if (unit != null) {
        if (unit?.level == undefined) {
          unit.level = 0
          unit.active = false
        } else if (unit.level == this.game.level) {
          unit.active = true
        } else if (unit.level != this.game.level) {
          unit.active = false
        }
        if (
          checkColl &&
          unit.level == this.game.level &&
          this.detectCollision(unit, this.game.player)
        ) {
          debugger
          this.triggerAction(unit.actionID)
        }
      }
    }
  }
}
