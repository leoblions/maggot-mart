import * as Utils from './utils.js'
import { Tilegrid } from './tilegrid.js'

const MAX_UNITS = 10

const CYCLE_FLAGS_PERIOD = 800
const CLICK_ADD_PACER = 1000
const HIGHTLIGHT_COLOR = `rgba(1, 100, 100, 0.5)`
const DEFAULT_LEVEL_DATA_URL = '/data/trigger0.txt'
const LEVEL_DATA_PREFIX = '/data/actionTable'
const LEVEL_DATA_SUFFIX = '.txt'
const LOAD_DEFAULT_LEVEL = false
const BLOCK_DUPLICATE_CONSECUTIVE_ACTIONS = true

/**
 * Data format:
 * Actions:
 * actionID, nextActionID, enabled 0/1, functionID, functionArg
 *
 * functionID
 * 0 warp, 1 set flag, 2 dialog, 3 custcene
 *
 * Warp can be to current or a different level
 *
 * Warps:
 * 0 dest level, 1 dest gridX, 2 dest gridY
 *
 * trigger -> actionID -> actionTable -> functionID
 *
 */

/**
 * Stage 0
 * stock the shelves with boxes
 * Stage 1
 * Clean up mouse traps
 * Stage 2
 * Spray insect repellant
 *
 */
class Action {
  constructor (actionID, nextActionID, enabled, functionID, functionArg) {
    //debugger
    this.actionID = actionID
    this.nextActionID = nextActionID
    this.enabled = enabled
    this.functionID = functionID
    this.functionArg = functionArg
  }
}

export class Brain {
  static actionTable // only lookup table for what actions do
  static lastInstance
  constructor (game) {
    this.game = game
    this.queuedActions = [] //actions to be processed
    this.bflags = [] // flags to modify behavior of actions, or disable them
    this.warps = []
    this.cycleFlagsPacer = new Utils.createMillisecondPacer(CYCLE_FLAGS_PERIOD)
    this.clickAddPacer = new Utils.createMillisecondPacer(CLICK_ADD_PACER)
    this.defaultInitializer()
  }

  defaultInitializer () {
    this.warps = []
    this.warps.push([0, 15, 1])
    this.warps.push([1, 15, 18])

    Brain.actionTable = []
    Brain.actionTable.push([0, -1, 1, 0, 1]) // warp room 0 to 1
    Brain.actionTable.push([1, -1, 1, 0, 0]) // warp room 1 to 0
  }

  enqueueAction (actionID) {
    //debugger
    if (BLOCK_DUPLICATE_CONSECUTIVE_ACTIONS) {
      let lastElement = this.queuedActions.at(-1)
      if (undefined != lastElement || lastElement?.actionID == actionID) {
        // is a duplicate
        return
      }
    }
    let matchingRow = Brain.actionTable.find(function (element) {
      return element[0] == actionID
    })
    if (undefined == matchingRow) {
      console.error('No matching actionTable record actionID ' + actionID)
      return
    } else {
      // unpack row array with spread operator
      let action = new Action(...matchingRow)
      this.queuedActions.push(action)
      console.log('enqueued action ')
    }
  }

  playerActivateNPC (kind) {
    switch (kind) {
      case 8:
        this.game.dialog.startDialogChain(0)
        break
      default:
        break
    }
  }

  dequeueAction () {
    let action = this.queuedActions.shift()
    if (undefined != action) {
      switch (action.functionID) {
        case 0:
          this.warp(action.functionArg)
          break
        case 1:
          this.setFlag(action.functionArg)
          break
        case 2:
          this.startDialog(action.functionArg)
          break
        case 3:
          this.startCutscene(action.functionArg)
          break
        default:
          this.special(action.functionArg)
          break
      }
      if (action.nextActionID != -1) {
        this.enqueueAction(action.nextActionID)
      }
    }
  }

  warp (warpID) {
    const [destinationLevel, gridX, gridY] = this.warps[warpID] ?? [-1, -1, -1]
    if (destinationLevel == -1) {
      console.error('Invalid level data for warpID ' + warpID)
    }
    if (destinationLevel == this.game.level) {
      this.movePlayer(gridX, gridY)
      this.game.tilegrid.centerCamera()
    } else {
      this.game.level = destinationLevel
      this.movePlayer(gridX, gridY)
      this.switchLevelTo(destinationLevel)

      this.game.pickup.removeUnitsLevelTransition(destinationLevel)
    }
  }

  movePlayer (gridX, gridY) {
    this.game.player.worldX = gridX * this.game.tilegrid.tileSize
    this.game.player.worldY = gridY * this.game.tilegrid.tileSize
  }

  switchLevelTo (newLevel) {
    this.game.level = newLevel
    this.game.tilegrid.loadCurrentLevel()
    this.game.trigger.loadCurrentLevel()
    this.game.decor.loadCurrentLevel()
    this.game.tilegrid.centerCamera()
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

  update () {
    this.cycleFlagsPacer() && this.dequeueAction()
    this.game.pickup.addObjectiveItemEnabled = true
  }
}
