import * as Utils from './utils.js'
import { Tilegrid } from './tilegrid.js'

const MAX_UNITS = 10
const VERBOSE = true

const CYCLE_FLAGS_PERIOD = 800
const CLICK_ADD_PACER = 1000
const HIGHTLIGHT_COLOR = `rgba(1, 100, 100, 0.5)`
const DEFAULT_LEVEL_DATA_URL = '/data/trigger0.txt'
const LEVEL_DATA_PREFIX = '/data/actionTable'
const LEVEL_DATA_SUFFIX = '.txt'
const LOAD_DEFAULT_LEVEL = false
const DEFAULT_ITEM_SPAWN_STAGE = 0
const BOSS_OFFICE_POSITION = 3
const TILE_DOOR = 23

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
 * trigger -> actionID -> actionTable -> functionID + arg
 * Player steps on trigger zone, or some other trigger happens that
 * calls a function in Brain with an actionID.  brain looks up the
 * action object in the action table, then runs its corresponding function.
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
    this.stageFlags = {}
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
      targetPressed: false
    } // flags to modify behavior of actions, or disable them
    this.objective = {
      category: 0,
      complete: 0,
      incomplete: 0,
      total: 1,
      markerID: -1,
      markers: 0,
      markerSet: false
    }
    this.warpDestinations = null
    this.stageData = null
    this.itemLocationData = null
    this.markerLocationData = null
    this.cycleFlagsPacer = new Utils.createMillisecondPacer(CYCLE_FLAGS_PERIOD)
    this.clickAddPacer = new Utils.createMillisecondPacer(CLICK_ADD_PACER)
    //this.defaultInitializer()
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
        this.objective.markerID = record?.markerID ?? -1
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
    this.itemLocationData = await fetch('./data/location_item.json')
    this.itemLocationData = await this.itemLocationData.json()

    this.markerLocationData = await fetch('./data/location_marker.json')
    this.markerLocationData = await this.markerLocationData.json()

    this.warpDestinations = await fetch('./data/warp_destinations.json')
    this.warpDestinations = await this.warpDestinations.json()

    this.actionTable = await fetch('./data/action_table.json')
    this.actionTable = await this.actionTable.json()
    Brain.actionTable = this.actionTable
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

  getCurrentItemLocation () {
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

  setObjectiveText (overrideText = null) {
    if (overrideText == null) {
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
    } else {
      this.game.hud.objectiveText.updateText(overrideText)
    }
  }

  setObjectiveTextIntermission (newText) {
    this.game.hud.objectiveText.updateText(newText)
  }
  intermissionSpecialActions () {
    switch (this.stage) {
      case 6:
        if (
          this.stageFlags?.moved == undefined ||
          this.stageFlags?.moved == false
        ) {
          this.stageFlags.moved = true
          this.game.entity.moveEntityToActorPosition(
            EK_MANAGER,
            BOSS_OFFICE_POSITION
          )
        }
        break
      default:
        break
    }
  }

  collectItemAction (category) {
    console.log('Pickup item category ' + category)
  }

  incrementObjectiveCounter (updateText = true) {
    this.objective.complete += 1
    this.objective.incomplete -= 1
    if (updateText) {
      this.setObjectiveText()
    }
  }

  collectItemCategoryAction (itemCategory) {
    // set bflags based on player collecting OI
    if (itemCategory == this.objective.category) {
      this.bflags.carry = true
    }
  }

  // spawnNextObjective () {
  //   this.game.entity.placeTarget(5, 5, 0)
  // }

  activateObjectiveMarker () {
    // player pressed on the objective marker(red box with arrow)
    this.bflags.targetPressed = true
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
    let matchingObj = this.actionTable.find(function (element) {
      return element.actionID == actionID
    })
    if (undefined == matchingObj) {
      console.error('No matching actionTable record actionID ' + actionID)
      return
    } else {
      // unpack row array with spread operator
      //let action = new Action(...matchingObj)
      this.queuedActions.push(matchingObj)
      if (VERBOSE) {
        console.log('brain: enqueued action ' + actionID)
      }
    }
  }

  playerActivateNPC (unitKind) {
    switch (unitKind) {
      case EK_MANAGER:
      case EK_ELLIOT:
        //let managerChainID = this.getManagerDialogChain()
        //console.log('activate npc ' + unitKind)

        let chainID = this.getActorDialogChain(unitKind)
        this.game.dialog.startDialogChain(chainID)
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
          this.warp(action.arg0)
          break
        case 1:
          this.setFlag(action.arg0)
          break
        case 2:
          this.startDialog(action.arg0)
          break
        case 3:
          this.startCutscene(action.arg0)
          break
        default:
          this.special(action.arg0)
          break
      }
      if (action.nextActionID != -1) {
        this.enqueueAction(action.nextActionID)
      }
    }
  }

  warp (destID) {
    let foundIndex = -1
    for (let i in this.warpDestinations) {
      if (this.warpDestinations[i].destID == destID) {
        foundIndex = i
        break
      }
    }

    // let index = this.warpDestinations.find((value, i, a) => {
    //   if (value.destID == destID) {
    //     return i
    //   }
    // })
    let destUnit = this.warpDestinations[foundIndex] ?? undefined
    if (destUnit == undefined) {
      debugger
      throw 'Matching destunit not found, id: ' + destID
    }
    const [destinationLevel, gridX, gridY] = [
      destUnit.level,
      destUnit.gridX,
      destUnit.gridY
    ]
    if (destinationLevel == -1) {
      console.error('Invalid level data for warpID ' + destID)
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
        this.currentItemIndex = 0
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
      this.bflags.targetPressed
    ) {
      this.incrementObjectiveCounter()
      this.bflags.readyForNextObjective = true
      this.bflags.carry = false
      this.bflags.targetPressed = false
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
      this.bflags.targetPressed = false
      this.bflags.carry = false
    }

    // player is carrying and objective marker is not set, set OM
    if (this.bflags.carry && !this.game.entity.targetIsSet()) {
      let markerObj = this.getMarkerObjectFromID(this.objective.markerID)
      this.game.entity.placeTarget(
        markerObj.gridX,
        markerObj.gridY,
        markerObj.level
      )
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
  getMarkerObjectFromID (markerID) {
    for (let marker of this.markerLocationData) {
      let currentID = marker?.markerID ?? -1
      if (currentID == markerID) {
        return marker
      }
    }
    return null
  }

  gatherThenDepositMission () {
    debugger
    let OIactive = this.game.pickup.isObjectiveItemActive()
    // player picked up OI, and less than amount needed
    if (this.bflags.carry && this.objective.complete < this.objective.total) {
      this.incrementObjectiveCounter()
      this.bflags.readyForNextObjective = true
      this.bflags.carry = false
      this.bflags.targetPressed = false
    }

    // player touched marker
    if (this.bflags.targetPressed) {
      this.objective.markerSet = false
      this.advanceStageOnObjectiveCount = true
      this.bflags.readyForNextStage = true
    } else {
      this.advanceStageOnObjectiveCount = false
    }

    // player has pickuped up OI and touched OM

    if (this.bflags.readyForNextObjective) {
      let location = this.getNextItemLocation()
      if (location != undefined) {
        this.game.pickup.addObjectiveUnitXYLC(
          location.gridX,
          location.gridY,
          location.level,
          this.objective.category
        )

        this.bflags.readyForNextObjective = false
        console.log('(1)placed obj item ' + this.objective.category)
        this.bflags.targetPressed = false
        this.bflags.carry = false
      }
    }

    // player collected enough OI, set OM
    if (
      this.objective.total == this.objective.complete &&
      !(this.objective?.markerSet ?? false)
    ) {
      let markerObj = this.getMarkerObjectFromID(this.objective.markerID)
      this.objective.markerSet = true
      this.game.entity.placeTarget(
        markerObj.gridX,
        markerObj.gridY,
        markerObj.level
      )
    }

    // player is not carrying and OI not set
    if (!this.bflags.carry && this.objective.complete == 0 && !OIactive) {
      this.placeObjectiveItem()
    } else if (this.bflags.carry && !OIactive) {
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

  multipleMarkerMission () {
    debugger
    let targetIsActive = this.game.entity.targetIsSet()
    let targetInRoom = this.game.entity.targetInCurrentRoom()
    let targetExist = !(this.game.entity.getTarget() == undefined)
    //let currentItemLoc = this.getCurrentItemLocation()

    if (
      this.objective.complete == 0 &&
      !this.bflags.targetPressed &&
      this.objective.markerSet == false
    ) {
      this.bflags.readyForNextObjective = true
    }

    if (targetInRoom && this.objective.markerSet && targetExist) {
      this.game.entity.activateTarget()
    }

    if (this.bflags.targetPressed == true) {
      // spawn new target
      this.objective.markerSet = false
      this.incrementObjectiveCounter(false)
      this.setObjectiveText('Empty trash cans')
      this.bflags.readyForNextObjective = true
      this.bflags.carry = false
      this.bflags.targetPressed = false
    } else {
      this.setObjectiveText('Empty trash cans')
    }

    // have needed objectives been reached?
    if (this.objective.complete >= this.objective.total) {
      this.bflags.readyForNextStage = true
      this.bflags.readyForNextObjective = false
    } else {
    }

    if (
      this.bflags.readyForNextObjective &&
      (!targetIsActive || !targetExist)
    ) {
      this.bflags.readyForNextObjective = false
      let location = this.getNextItemLocation()
      if (location != undefined) {
        this.objective.markerSet = true
        this.game.entity.placeTarget(
          location.gridX,
          location.gridY,
          location.level
        )

        this.bflags.readyForNextObjective = false
        console.log('(1)placed obj item ' + this.objective.category)
        this.bflags.targetPressed = false
        this.bflags.carry = false
      }
    } else if (!this.bflags.readyForNextObjective && targetInRoom) {
      this.game.entity.activateTarget()
    }
  }

  gatherMission () {
    // if player is carrying remove item and increment counter

    if (this.bflags.carry) {
      this.incrementObjectiveCounter()
      this.bflags.readyForNextObjective = true
      this.bflags.carry = false
      this.bflags.targetPressed = false
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

      this.bflags.readyForNextObjective = false
      console.log('(1)placed obj item ' + this.objective.category)
      this.bflags.targetPressed = false
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
    //console.log('POP')
    let locationsPossible = this.getLocationsFromStageID(this.stage).locations
      .length

    let location = this.getNextItemLocation()
    while (location == this.lastLocation && locationsPossible > 1) {
      location = this.getNextItemLocation()
    }
    this.lastLocation = location
    if (location != undefined) {
      this.game.pickup.addObjectiveUnitXYLC(
        location.gridX,
        location.gridY,
        location.level,
        Number(this.objective.category)
      )
    }
  }
  stageSpecificChanges () {
    // only this should call things based on bflags
    // other bflags functions are called externally and modify bflags
    switch (this.stage) {
      case 0:
        break
      case 1:
        //move boxes
        this.objective.markerID = 0
        this.moveitemAtoBMission()
        break
      case 2:
        this.setObjectiveTextIntermission(INTERMISSION_0)
        break
      case 3:
        // collect cans

        this.gatherMission()
        break
      case 4:
        this.setObjectiveTextIntermission(INTERMISSION_0)
        break
      case 5:
        // mouse traps
        this.objective.markerID = 1
        this.gatherThenDepositMission()

        break
      case 6:
        this.setObjectiveTextIntermission(INTERMISSION_0)
        this.intermissionSpecialActions()
        break

      case 7:
        let chainID = -1
        if (this.bflags.targetPressed) {
          switch (this.objective.complete) {
            case 0:
              chainID = 7
              this.game.dialog.startDialogChain(chainID)
              break

            case 1:
              chainID = 9
              this.game.dialog.startDialogChain(chainID)

              this.game.tilegrid.setTile(13, 11, TILE_DOOR)
              break
          }
        }
        this.multipleMarkerMission()
        break
      default:
        break
    }
  }

  getActorDialogChain (actorID) {
    let alfredChains = [0, 0, 2, 2, 3, 3, 6, 6]
    let elliotChains = [1, 1, 1, 1, 5, 5, 5, 5]
    let chainSet = null

    switch (actorID) {
      case 8:
        chainSet = alfredChains
        break
      case 9:
        chainSet = elliotChains
        break

      default:
        chainSet = alfredChains
    }
    let chainID = chainSet.at(this.stage) ?? 0
    //console.log('selected manager dialog chain ' + chainID)
    return chainID
  }

  dialogInvokeAction (actionID) {
    /**
     * talking to boss and certain characters will advance the stage or other things
     */
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

      case 3:
        // categories: 0 box, 1 spray, 2 key, 3 trap 4 carts  5 hives
        //collect mouse traps
        if (this.stage != 7) {
          this.stage = 7
          this.bflags.targetPressed = false
          this.setStageData(7)
        }

        break
    }
  }
}
