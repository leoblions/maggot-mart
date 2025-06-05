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
const DEFAULT_ITEM_SPAWN_STAGE = 0
const INTERMISSION_0 = 'talk to boss'
const INTERMISSION_1 = 'talk to elliot'
const BLOCK_DUPLICATE_CONSECUTIVE_ACTIONS = true
// categories: 0 box, 1 spray, 2 key, 3 trap 4 carts  5 hives
const OBJECTIVE_NAMES = [
  'boxes placed',
  'bugspray',
  'keys',
  'traps',
  'carts',
  'hives'
]
const OBJECTIVE_AMOUNTS = [5, 5, 5, 5, 5]

const EK_MANAGER = 8
const EK_ELLIOT = 9
const EK_OBJECTIVE = 20

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

    this.stage = 0 // current stage of game, dealing with objectives not the physical area
    this.carry = false // player is carrying item to objective

    this.advanceStageOnObjectiveCount = true
    this.queuedActions = [] //actions to be processed
    /**
     * carry = player is carrying obj item
     * must carry = player must be carrying to activate obj marker
     * readyFNO = player did carry object and pressed OM
     * marker pressed = player pressed OM
     */
    this.bflags = {
      carry: false,
      mustCarry: false,
      readyForNextObjective: false,
      readyForNextStage: false,
      markerPressed: false
    } // flags to modify behavior of actions, or disable them
    this.objective = {
      category: 0,
      complete: 0,
      incomplete: 0,
      total: 1
    }
    this.warpDestinations = []
    this.stageData = null
    this.itemLocationData = null
    this.markerLocationData = null
    this.cycleFlagsPacer = new Utils.createMillisecondPacer(CYCLE_FLAGS_PERIOD)
    this.clickAddPacer = new Utils.createMillisecondPacer(CLICK_ADD_PACER)
    this.defaultInitializer()
    this.initStageData()
    this.initLocationData()
  }

  setObjective (category) {
    this.objective.category = category
    this.objective.complete = 0
    this.objective.total = OBJECTIVE_AMOUNTS[category] ?? 0
    this.setObjectiveText()
  }

  setStageData (stageID) {
    for (const record of this.stageData) {
      if (record.stageID == stageID) {
        this.objective.category = record.category
        this.bflags.carry = record?.carry ?? false
        this.bflags.mustCarry = record?.mustCarry ?? false
        this.objective.complete = 0
        this.objective.incomplete = record.amount
        this.objective.total = record.amount
        this.setObjectiveText()
        break
      }
    }
  }

  async initStageData () {
    //fetch returns a promise
    let response = await fetch('./data/stage_data.json')

    this.stageData = await response.json()
  }

  async initLocationData () {
    //fetch returns a promise
    this.itemLocationData = await fetch('./data/locationItem.json')
    this.itemLocationData = await this.itemLocationData.json()

    this.markerLocationData = await fetch('./data/locationMarker.json')
    this.markerLocationData = await this.markerLocationData.json()
  }

  getRandomItemLocation () {
    let defaultLocationRecord = null
    for (const record of this.itemLocationData) {
      if (record.stage == DEFAULT_ITEM_SPAWN_STAGE) {
        defaultLocationRecord = record
      }
      if (record.stage == this.stage) {
        let locations = record.locations
        let location = locations[Math.floor(Math.random() * locations.length)]
        return location
      }
    }
    if (defaultLocationRecord != null) {
      let locations = record.locations
      let location = locations[Math.floor(Math.random() * locations.length)]
      return location
    }

    throw 'Could not find matching stage item location record'
  }

  getNextItemLocation () {
    let defaultLocationRecord = null
    let len = this.itemLocationData.length
    // default location to 0
    if (undefined == this.currentItemIndex) {
      this.currentItemIndex = 0
    } else {
      if (this.currentItemIndex < len) {
        this.currentItemIndex += 1
      } else {
        this.currentItemIndex = 0
      }
    }

    let desiredRecord = this.getLocationsFromStageID(this.stage)
    if (desiredRecord != null) {
      let locations = desiredRecord.locations
      let location = locations[this.currentItemIndex]
      return location
    } else {
      desiredRecord = this.getLocationsFromStageID(DEFAULT_ITEM_SPAWN_STAGE)
      if (null == desiredRecord) {
        throw 'Could not find matching stage item location record'
      }
      let locations = desiredRecord.locations
      let location = locations[this.currentItemIndex]
      return location
    }

    throw 'Could not find matching stage item location record'
  }

  setObjectiveText () {
    let newText = ''
    if (undefined == this.objective.total) {
    } else {
      let category = this.objective.category ?? 0
      newText =
        (OBJECTIVE_NAMES[category] ?? '') +
        ' ' +
        this.objective.complete +
        '/' +
        this.objective.total
    }

    this.game.hud.objectiveText.updateText(newText)
  }

  setObjectiveTextIntermission (newText) {
    this.game.hud.objectiveText.updateText(newText)
  }

  defaultInitializer () {
    // 0 dest level, 1 dest gridX, 2 dest gridY
    this.warpDestinations = []
    this.warpDestinations.push([0, 15, 1])
    this.warpDestinations.push([1, 15, 18])

    //actionID, nextActionID, enabled 0/1, functionID, functionArg
    Brain.actionTable = []
    Brain.actionTable.push([0, -1, 1, 0, 1]) // warp room 0 to 1
    Brain.actionTable.push([1, -1, 1, 0, 0]) // warp room 1 to 0
  }

  collectItemAction (category) {
    console.log('Pickup item category ' + category)
  }

  incrementObjectiveCounter () {
    this.objective.complete += 1
    this.objective.incomplete -= 1
    this.setObjectiveText()
  }

  collectItemCategoryAction (itemCategory) {
    // set bflags based on player collecting OI
    if (itemCategory == this.objective.category) {
      this.bflags.carry = true
    }
  }

  // spawnNextObjective () {
  //   this.game.entity.placeObjectiveMarker(5, 5, 0)
  // }

  activateObjectiveMarker () {
    // player pressed on the objective marker(red box with arrow)
    this.bflags.markerPressed = true
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

  playerActivateNPC (category) {
    switch (category) {
      case EK_MANAGER:
        let managerChainID = this.getManagerDialogChain()
        this.game.dialog.startDialogChain(managerChainID)
        break
      case EK_OBJECTIVE:
        this.activateObjectiveMarker()
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
    const [destinationLevel, gridX, gridY] = this.warpDestinations[warpID] ?? [
      -1, -1, -1
    ]
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

  advanceStageIfObjectivesComplete () {
    if (
      this.objective.complete == this.objective.total &&
      this.advanceStageOnObjectiveCount
    ) {
      this.stage += 1
      this.game.pickup.removeObjectiveItem()
      this.setStageData(this.stage)
      if (this.objective.complete == this.objective.total) {
        this.objective.complete = 0
        this.objective.total = 1
      }
    }
  }

  update () {
    if (this.stageSelectRequest) {
      this.stageSelect()
    }
    this.cycleFlagsPacer() && this.dequeueAction()
    //this.game.pickup.addObjectiveItemEnabled = true
    this.stageSpecificChanges()
    this.advanceStageIfObjectivesComplete()
  }

  stageSelect1 () {
    const period = 20000

    let now = Date.now()
    //console.log(period)

    if (this.SSlastTime == undefined || now - this.SSlastTime > period) {
      let newStage = prompt('Enter stage number: ')
      newStage = Number(newStage)
      this.stage = newStage
      this.setStageData(newStage)
      //this.stageSelect = undefined
    }
    this.SSlastTime = now
    this.stageSelectRequest = false
  }

  stageSelect () {
    const delay = 2000
    if (this.stageSelectEnabled == undefined) {
      this.stageSelectEnabled = true
    }

    if (this.stageSelectEnabled) {
      let newStage = prompt('Enter stage number: ')
      newStage = Number(newStage)
      this.stage = newStage
      this.setStageData(newStage)
      //this.stageSelect = undefined
    }

    this.stageSelectRequest = false
    this.stageSelectEnabled = false
    setTimeout(() => {
      this.stageSelectEnabled = true
    }, delay)
  }

  moveitemAtoBMission () {
    // if player is carrying, carrying is required, and marker is pressed, set next obj
    if (
      this.bflags.mustCarry &&
      this.bflags.carry &&
      this.bflags.markerPressed
    ) {
      this.incrementObjectiveCounter()
      this.bflags.readyForNextObjective = true
      this.bflags.carry = false
      this.bflags.markerPressed = false
    }

    // have needed objectives been reached?
    if (this.objective.complete >= this.objective.total) {
      this.bflags.readyForNextStage = true
    }

    // player has pickuped up OI and touched OM
    if (this.bflags.readyForNextObjective) {
      let location = this.getRandomItemLocation()
      this.game.pickup.addObjectiveUnitXYLC(
        location.gridX,
        location.gridY,
        location.level,
        this.objective.category
      )
    }
    // if player got OI and touched OM but does not have enough objectives
    if (this.bflags.readyForNextObjective && !this.bflags.readyForNextStage) {
      this.game.pickup.addObjectiveUnit(this.objective.category)
      this.bflags.readyForNextObjective = false
      console.log('placed box 1')
      this.bflags.markerPressed = false
      this.bflags.carry = false
    }

    // player is carrying and objective marker is not set, set OM
    if (this.bflags.carry && !this.game.entity.objectiveMarkerIsSet()) {
      this.game.entity.placeObjectiveMarker(8, 8, 0)
    }

    // if player is not carrying and no OI is active, create OI
    if (!this.bflags.carry && !this.game.pickup.isObjectiveItemActive()) {
      // only do si if pickup is in current level
      if (!this.game.pickup.objectiveItemExists()) {
        this.bflags.readyForNextObjective = false
        //this.game.pickup.addObjectiveUnit(this.objective.category)

        let location = this.getRandomItemLocation()
        this.game.pickup.addObjectiveUnitXYLC(
          location.gridX,
          location.gridY,
          location.level,
          Number(this.objective.category)
        )
        console.log('placed box 2')
      }
    }
  }

  gatherThenDepositMission () {
    if (this.bflags.carry) {
      this.incrementObjectiveCounter()
      this.bflags.readyForNextObjective = true
      this.bflags.carry = false
      this.bflags.markerPressed = false
    }

    // have needed objectives been reached?
    if (this.objective.complete >= this.objective.total) {
      let location = this.getRandomItemLocation()
      this.game.pickup.addObjectiveUnitXYLC(
        location.gridX,
        location.gridY,
        location.level,
        this.objective.category
      )
    }

    // player touched marker
    if (this.bflags.markerPressed) {
      this.bflags.readyForNextStage = true
    }

    // player has pickuped up OI and touched OM
    if (this.bflags.readyForNextObjective) {
      let location = this.getRandomItemLocation()
      this.game.pickup.addObjectiveUnitXYLC(
        location.gridX,
        location.gridY,
        location.level,
        this.objective.category
      )
    }
    // if player got OI and touched OM but does not have enough objectives
    if (this.bflags.readyForNextObjective && !this.bflags.readyForNextStage) {
      this.game.pickup.addObjectiveUnit(this.objective.category)
      this.bflags.readyForNextObjective = false
      console.log('(1)placed obj item ' + this.objective.category)
      this.bflags.markerPressed = false
      this.bflags.carry = false
    }

    // player is not carrying and OI not set
    if (!this.bflags.carry && !this.game.pickup.isObjectiveItemActive()) {
      this.placeObjectiveItem()
    }

    // place OI
    if (this.bflags.carry && !this.game.pickup.isObjectiveItemActive()) {
      // only do si if pickup is in current level
      if (!this.game.pickup.objectiveItemExists()) {
        this.bflags.readyForNextObjective = false
        //this.game.pickup.addObjectiveUnit(this.objective.category)
        this.placeObjectiveItem()

        this.bflags.carry = false
        console.log('(2)placed obj item ' + this.objective.category)
      }
    }
  }

  gatherMission () {
    // if player is carrying remove item and increment counter

    if (this.bflags.carry) {
      this.incrementObjectiveCounter()
      this.bflags.readyForNextObjective = true
      this.bflags.carry = false
      this.bflags.markerPressed = false
    }

    // have needed objectives been reached?
    if (this.objective.complete >= this.objective.total) {
      this.bflags.readyForNextStage = true
    }

    // player has pickuped up OI and touched OM
    if (this.bflags.readyForNextObjective) {
      let location = this.getNextItemLocation()
      this.game.pickup.addObjectiveUnitXYLC(
        location.gridX,
        location.gridY,
        location.level,
        this.objective.category
      )
    }
    // if player got OI and touched OM but does not have enough objectives
    if (this.bflags.readyForNextObjective && !this.bflags.readyForNextStage) {
      this.game.pickup.addObjectiveUnit(this.objective.category)
      this.bflags.readyForNextObjective = false
      console.log('(1)placed obj item ' + this.objective.category)
      this.bflags.markerPressed = false
      this.bflags.carry = false
    }

    // player is not carrying and OI not set
    if (!this.bflags.carry && !this.game.pickup.isObjectiveItemActive()) {
      this.currentOI = this.game.pickup.getObjectiveItem()
      if (
        this.currentOI == undefined ||
        (this.game.level == this.currentOI.level && !this.currentOI.active)
      ) {
        this.placeObjectiveItem()

        console.log('placeObjectiveItem')
      }
    }

    // place OI
    if (this.bflags.carry && !this.game.pickup.isObjectiveItemActive()) {
      // only do si if pickup is in current level
      if (!this.game.pickup.objectiveItemExists()) {
        this.bflags.readyForNextObjective = false
        //this.game.pickup.addObjectiveUnit(this.objective.category)
        this.placeObjectiveItem()

        this.bflags.carry = false
        console.log('(2)placed obj item ' + this.objective.category)
      }
    }
  }
  getLocationsFromStageID (stage) {
    for (let location of this.itemLocationData) {
      if (location.stage == stage) {
        return location
      }
    }
    return null
  }
  placeObjectiveItem () {
    let locationsPossible = this.getLocationsFromStageID(this.stage).locations
      .length

    let location = this.getNextItemLocation()
    while (location == this.lastLocation && locationsPossible > 1) {
      location = this.getNextItemLocation()
    }
    this.lastLocation = location
    this.game.pickup.addObjectiveUnitXYLC(
      location.gridX,
      location.gridY,
      location.level,
      Number(this.objective.category)
    )
  }
  stageSpecificChanges () {
    // only this should call things based on bflags
    // other bflags functions are called externally and modify bflags
    switch (this.stage) {
      case 0:
        break
      case 1:
        //debugger
        this.moveitemAtoBMission()
        break
      case 2:
        this.setObjectiveTextIntermission(INTERMISSION_0)
        break
      case 3:
        this.gatherMission()
        break
      case 4:
        this.setObjectiveTextIntermission(INTERMISSION_0)
        break
      case 5:
        this.gatherThenDepositMission()
      default:
        break
    }
  }

  getManagerDialogChain () {
    let chainID = 0
    switch (this.stage) {
      case 0:
      case 1:
        chainID = 0
        break
      case 2:
        chainID = 2
        break
      case 4:
        chainID = 3
        break
      default:
        chainID = 0
    }
    //console.log('selected manager dialog chain ' + chainID)
    return chainID
  }

  dialogInvokeAction (actionID) {
    switch (actionID) {
      case 0:
        //collect boxes, stock shelves

        if (this.stage != 1) {
          this.stage = 1
          this.setStageData(1)
        }

        break
      case 1:
        // categories: 0 box, 1 spray, 2 key, 3 trap 4 carts  5 hives
        //collect bug spray cans (stage 3)
        if (this.stage != 3) {
          this.stage = 3
          this.setStageData(3)
        }

        break
      case 2:
        // categories: 0 box, 1 spray, 2 key, 3 trap 4 carts  5 hives
        //collect mouse traps
        if (this.stage != 5) {
          this.stage = 5
          this.setStageData(5)
        }

        break
    }
  }
}
