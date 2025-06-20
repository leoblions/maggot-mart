import * as Utils from './utils.js'
import { Tilegrid } from './tilegrid.js'

const MAX_UNITS = 10
const VERBOSE = true

const CYCLE_FLAGS_PERIOD = 800
const CLICK_ADD_PACER = 1000
const STAGE_RUN_PACER_PERIOD = 500
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

    this.stage = 0 // current stage of game, dealing with stageFlagss not the physical area
    this.carry = false // player is carrying item to stageFlags

    this.queuedActions = [] //actions to be processed
    this.stageFlags = {}
    /**
     * carry = player is carrying obj item
     * must carry = player must be carrying to activate obj marker
     * readyFNO = player did carry object and pressed OM
     * marker pressed = player pressed OM
     */
    this.stageFlags = {
      carry: false,
      mustCarry: false,
      readyForNextObjective: false,
      readyForNextStage: false,
      targetPressed: false
    } // flags to modify behavior of actions, or disable them
    this.stageFlags = {
      category: 0,
      complete: 0,
      incomplete: 0,
      total: 1,
      markerID: -1,
      markers: 0,
      kind: 0,
      markerSet: false,
      pickupIsSet: false,
      pickupPressed: false,
      pickupsPressed: 0,
      advanceStage: false,
      carry: false,
      mustCarry: false,
      readyForNextObjective: false,
      readyForNextTarget: false,
      readyForNextPickup: false,
      readyForNextStage: false,
      targetPressed: false,
      targetsPressed: 0,
      targetIsSet: false
    }
    this.warpDestinations = null
    this.stageData = null
    this.itemLocationData = null
    this.markerLocationData = null
    this.cycleFlagsPacer = new Utils.createMillisecondPacer(CYCLE_FLAGS_PERIOD)
    this.stageRunPacer = new Utils.createMillisecondPacer(
      STAGE_RUN_PACER_PERIOD
    )
    this.clickAddPacer = new Utils.createMillisecondPacer(CLICK_ADD_PACER)
    //this.defaultInitializer()
    this.initStageData()
    this.initLocationData()
  }

  setObjective (category) {
    this.stageFlags.category = category
    this.stageFlags.complete = 0
    this.stageFlags.total = OBJECTIVE_AMOUNTS[category] ?? 0
    this.setObjectiveText()
  }

  loadDataFromRecord (stageID) {
    for (const record of this.stageData) {
      if (record.stageID == stageID) {
        this.stageFlags.category = record.category
        this.stageFlags.carry = record?.carry ?? false
        this.stageFlags.mustCarry = record?.mustCarry ?? false
        this.stageFlags.complete = 0
        this.stageFlags.incomplete = record.amount
        this.stageFlags.total = record.amount
        this.stageFlags.markerID = record?.markerID ?? -1

        break
      }
    }
  }

  initStage (stageID) {
    this.loadDataFromRecord(stageID)
    this.stageFlags.advanceStage = false // must do at start of every stage to prevent runaway loop
    // pickup kinds 0 food, 1 box, 2 spray, 3 trap, 4 key
    switch (stageID) {
      case 1:
        this.stageFlags.boxesCollected = 0
        this.stageFlags.boxesPlaced = 0
        this.stageFlags.kind = 1
        this.stageFlags.boxesPlacedRequired = 3
        this.stageFlags.total = 3
        this.setObjectiveText()

        break
      case 3:
        this.stageFlags.kind = 2
        this.stageFlags.pickupIsSet = false
        this.stageFlags.pickupsRequired = 4
        this.stageFlags.targetsRequired = 1
        this.stageFlags.targetsPressed = 0
        this.stageFlags.pickupsPressed = 0
        this.setObjectiveText()
        break

      case 5:
        this.stageFlags.pickupsRequired = 4
        this.stageFlags.targetsRequired = 1
        this.stageFlags.targetsPressed = 0
        this.stageFlags.pickupsPressed = 0
        this.stageFlags.kind = 3
        this.stageFlags.total = 4
        this.setObjectiveText()
        break

      case 7:
        this.stageFlags.targetsPressed = 0
        this.stageFlags.pickupsPressed = 0
        this.stageFlags.touchedCan = false
        this.stageFlags.foundBags = false
        this.stageFlags.foundKey = false
        break
      default:
        //this.setObjectiveText()
        break
    }
    // applies for all stages
    this.stageFlags.carry = false
    this.stageFlags.targetsPressed = 0
    this.stageFlags.pickupsPressed = 0
    this.stageFlags.targetPressed = false
    this.stageFlags.pickupPressed = false
    this.stageFlags.targetsPressed = 0
    this.stageFlags.pickupsPressed = 0
    this.stageFlags.pickupIsSet = false
    this.stageFlags.targetIsSet = false
    this.stageFlags.readyForNextTarget = false
    this.currentItemIndex = 0 // used to select location of objective pickup
    //this.setObjectiveText()
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

  getNextPickupLocation () {
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
      if (location == undefined) {
        location = locations[0]
      }
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
      if (undefined == this.stageFlags.total) {
      } else {
        let category = this.stageFlags.category ?? 0
        newText =
          (OBJECTIVE_NAMES[category] ?? '') +
          ' ' +
          this.stageFlags.complete +
          '/' +
          this.stageFlags.total
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
        this.stageFlags.carry = false
        this.stageFlags.targetPressed = false
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

  collectItemAction (kind) {
    console.log('Pickup item kind ' + kind)
    if (kind == this.stageFlags.kind) {
      this.stageFlags.carry = true
      this.stageFlags.pickupPressed = true
    }
  }

  incrementObjectiveCounter (updateText = true) {
    //debugger
    this.stageFlags.complete += 1
    this.stageFlags.incomplete -= 1
    if (updateText) {
      this.setObjectiveText()
    }
  }

  collectItemKindAction (kind) {
    // set stageFlags based on player collecting OI
    if (kind == this.stageFlags.kind) {
      this.stageFlags.carry = true
      this.stageFlags.pickupPressed = true
    }
  }

  // spawnNextObjective () {
  //   this.game.entity.placeTarget(5, 5, 0)
  // }

  activateObjectiveMarker () {
    // player pressed on the stageFlags marker(red box with arrow)
    this.stageFlags.targetPressed = true
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

  advanceAndInitStage () {
    if (this.stageFlags.advanceStage) {
      this.stage += 1
      this.game.pickup.removeObjectiveItem()
      this.initStage(this.stage) // once per stage
      if (this.stageFlags.complete == this.stageFlags.total) {
        this.stageFlags.complete = 0
        this.stageFlags.advanceStage = false
        this.stageFlags.total = 1
        this.currentItemIndex = 0
      }
    }
  }

  update () {
    if (this.stageSelectRequest) {
      this.stageSelect() //manually select stage
    }
    if (this.cycleFlagsPacer()) {
      //execute a sequence of actions from a queue
      this.dequeueAction()
    }
    if (this.stageRunPacer()) {
      this.stageRun() // run repeatedly each stage
      this.advanceAndInitStage()
    }
    //this.game.pickup.addObjectiveItemEnabled = true
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
      this.initStage(newStage)
      //this.stageSelect = undefined
    }

    this.stageSelectRequest = false
    this.stageSelectEnabled = false
    setTimeout(() => {
      this.stageSelectEnabled = true
    }, delay)
  }

  missionPlaceBoxes () {
    // ASSESS
    let enoughBoxesPlaced =
      this.stageFlags.boxesPlaced >= this.stageFlags.boxesPlacedRequired
    this.stageFlags.targetIsSet = this.game.entity.targetIsSet()

    this.stageFlags.readyForNextPickup =
      !this.stageFlags.carry && !this.stageFlags.pickupIsSet

    // ADVANCE STAGE
    if (enoughBoxesPlaced) {
      console.log('MPB advance stage')
      this.stageFlags.advanceStage = true
      this.stageFlags.readyForNextPickup = false
      return //skip the rest, this stage is done
    }

    // FIRST PICKUP
    if (!this.stageFlags.pickupIsSet && this.stageFlags.boxesCollected == 0) {
      console.log('MPB set first pickup')
      this.stageFlags.carry = false
      this.stageFlags.readyForNextPickup = true
      this.stageFlags.setFirstPickup = false
      this.stageFlags.targetIsSet = false
    }

    // PLAYER PICKED UP ITEM

    if (this.stageFlags.pickupPressed && this.stageFlags.targetIsSet == false) {
      this.stageFlags.pickupPressed = false
      console.log('MPB player pickup item')

      this.stageFlags.boxesCollected += 1
      this.stageFlags.targetPressed = false
      this.stageFlags.readyForNextTarget = true
      this.stageFlags.readyForNextPickup = false
      this.stageFlags.pickupIsSet = false
      return
    }

    // PLAYER TOUCHED TARGET

    if (this.stageFlags.targetPressed && this.stageFlags.carry) {
      console.log('MPB player touch target')
      this.incrementObjectiveCounter()
      this.stageFlags.readyForNextPickup = true
      this.stageFlags.carry = false
      this.stageFlags.targetPressed = false
      this.stageFlags.boxesPlaced += 1
      this.stageFlags.targetIsSet = false
      return
    }

    //SPAWN PICKUP

    if (this.stageFlags.readyForNextPickup) {
      console.log('MPB spawn pickup')

      let location = this.getNextPickupLocation()
      this.game.pickup.addObjectiveUnitXYLC(
        location.gridX,
        location.gridY,
        location.level,
        this.stageFlags.kind
      )

      this.stageFlags.targetPressed = false
      this.stageFlags.readyForNextPickup = false

      this.stageFlags.carry = false
      this.stageFlags.pickupIsSet = true
      return
    }

    //SPAWN TARGET

    if (this.stageFlags.readyForNextTarget) {
      console.log('MPB spawn target')
      let markerObj = this.getMarkerObjectFromID(this.stageFlags.markerID)
      this.game.entity.placeTarget(
        markerObj.gridX,
        markerObj.gridY,
        markerObj.level
      )

      //this.stageFlags.readyForNextObjective = false

      this.stageFlags.targetPressed = false
      this.stageFlags.targetIsSet = true
      //this.stageFlags.carry = false
      this.stageFlags.readyForNextTarget = false
      this.stageFlags.readyForNextPickup = false
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

  missionGatherMousetraps () {
    // stage 5
    // ASSESS
    let OIactive = this.game.pickup.isObjectiveItemActive()

    // ADVANCE STAGE
    if (
      this.stageFlags.pickupsPressed >= this.stageFlags.pickupsRequired &&
      this.stageFlags.targetsPressed >= this.stageFlags.targetsRequired
    ) {
      this.stageFlags.advanceStage = true
      this.stageFlags.carry = false
      this.stageFlags.targetPressed = false
      return
    }

    // FIRST PICKUP
    if (!this.stageFlags.pickupIsSet && this.stageFlags.boxesCollected == 0) {
      console.log('MGM set first pickup')
      this.stageFlags.carry = false
      this.stageFlags.readyForNextPickup = true
      this.stageFlags.setFirstPickup = false
      this.stageFlags.targetIsSet = false
    }

    // PLAYER TOUCH TARGET
    if (this.stageFlags.targetPressed) {
      console.log('MGM touch target')
      this.stageFlags.targetsPressed += 1
      this.stageFlags.targetPressed = false
      this.stageFlags.carry = false
    }

    // PLAYER TOUCH PICKUP

    if (this.stageFlags.pickupPressed) {
      console.log('MGM touch pickup')
      this.incrementObjectiveCounter()
      this.stageFlags.pickupsPressed += 1
      this.stageFlags.pickupPressed = false
      if (this.stageFlags.pickupsPressed < this.stageFlags.pickupsRequired) {
        this.stageFlags.readyForNextPickup = true
      } else {
        this.stageFlags.readyForNextTarget = true
      }
    }

    // PLACE TARGET

    if (this.stageFlags.readyForNextTarget) {
      console.log('MGM place target')
      this.stageFlags.readyForNextTarget = false
      let markerObj = this.getMarkerObjectFromID(this.stageFlags.markerID)
      this.stageFlags.markerSet = true
      this.game.entity.placeTarget(
        markerObj.gridX,
        markerObj.gridY,
        markerObj.level
      )
    }

    // PLACE PICKUP

    if (this.stageFlags.readyForNextPickup) {
      this.stageFlags.readyForNextPickup = false
      this.stageFlags.pickupPressed = false
      console.log('MGM place pickup')
      let location = this.getNextPickupLocation()
      console.log(location)

      if (location != undefined) {
        this.game.pickup.addObjectiveUnitXYLC(
          location.gridX,
          location.gridY,
          location.level,
          this.stageFlags.kind
        )

        this.stageFlags.readyForNextObjective = false
        this.stageFlags.targetPressed = false
        this.stageFlags.carry = false
      } else {
        console.error('MGM place pickup - undefined location')
      }
    }

    // player is not carrying and OI not set
    if (!this.stageFlags.carry && this.stageFlags.complete == 0 && !OIactive) {
      this.placeObjectiveItem()
    } else if (this.stageFlags.carry && !OIactive) {
      // only do si if pickup is in current level
      if (!this.game.pickup.stageFlagsItemExists()) {
        this.stageFlags.readyForNextObjective = false
        //this.game.pickup.addObjectiveUnit(this.stageFlags.category)
        this.placeObjectiveItem()

        this.stageFlags.carry = false
        console.log('(2)placed obj item ' + this.stageFlags.category)
      }
    }
  }

  missionGatherCans () {
    // stage 3
    // ASSESS
    let OIactive = this.game.pickup.isObjectiveItemActive()

    // ADVANCE STAGE
    if (this.stageFlags.pickupsPressed >= this.stageFlags.pickupsRequired) {
      this.stageFlags.advanceStage = true
      this.stageFlags.carry = false
      this.stageFlags.targetPressed = false
      return
    }

    // FIRST PICKUP
    if (!this.stageFlags.pickupIsSet && this.stageFlags.pickupsPressed == 0) {
      console.log('MGC set first pickup')
      this.stageFlags.carry = false
      this.stageFlags.readyForNextPickup = true
      this.stageFlags.setFirstPickup = false
      this.stageFlags.targetIsSet = false
    }

    // PLAYER TOUCH PICKUP

    if (this.stageFlags.pickupPressed) {
      console.log('MGC touch pickup')
      this.incrementObjectiveCounter()
      this.stageFlags.pickupsPressed += 1
      this.stageFlags.pickupPressed = false
      if (this.stageFlags.pickupsPressed < this.stageFlags.pickupsRequired) {
        this.stageFlags.readyForNextPickup = true
      } else {
        this.stageFlags.readyForNextTarget = true
      }
    }

    // PLACE TARGET

    if (this.stageFlags.readyForNextTarget) {
      console.log('MGC place target')
      this.stageFlags.readyForNextTarget = false
      let markerObj = this.getMarkerObjectFromID(this.stageFlags.markerID)
      this.stageFlags.markerSet = true
      this.game.entity.placeTarget(
        markerObj.gridX,
        markerObj.gridY,
        markerObj.level
      )
    }

    // PLACE PICKUP

    if (this.stageFlags.readyForNextPickup) {
      this.stageFlags.readyForNextPickup = false
      this.stageFlags.pickupPressed = false
      console.log('MGC place pickup ' + this.stageFlags.kind)

      let location = this.getNextPickupLocation()
      console.log(location)

      if (location != undefined) {
        this.game.pickup.addObjectiveUnitXYLC(
          location.gridX,
          location.gridY,
          location.level,
          this.stageFlags.kind
        )

        this.stageFlags.readyForNextObjective = false
        this.stageFlags.targetPressed = false
        this.stageFlags.carry = false
      } else {
        console.error('MGC place pickup - undefined location')
      }
    }

    // player is not carrying and OI not set
    if (!this.stageFlags.carry && this.stageFlags.complete == 0 && !OIactive) {
      this.placeObjectiveItem()
    } else if (this.stageFlags.carry && !OIactive) {
      // only do si if pickup is in current level
      if (!this.game.pickup.stageFlagsItemExists()) {
        this.stageFlags.readyForNextObjective = false
        //this.game.pickup.addObjectiveUnit(this.stageFlags.category)
        this.placeObjectiveItem()

        this.stageFlags.carry = false
        console.log('(2)placed obj item ' + this.stageFlags.category)
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
  missionTrashBasement () {
    let targetIsActive = this.game.entity.targetIsSet()
    let targetInRoom = this.game.entity.targetInCurrentRoom()
    let targetExist = !(this.game.entity.getTarget() == undefined)
    //let currentItemLoc = this.getCurrentItemLocation()
    // this.stageFlags.touchedCan = false
    //     this.stageFlags.foundBags = false
    //     this.stageFlags.foundKey = false
    //targetExist = false

    //create trash can target
    if (this.stageFlags.touchedCan == false) {
      if (!targetExist || targetIsActive) {
        this.stageFlags.markerSet = true
        this.game.entity.placeTarget(17, 3, 0)

        console.log('placed trash can target ')
        this.setObjectiveText('Empty trash cans')
        this.stageFlags.targetPressed = false
      }
    }

    if (targetInRoom && this.stageFlags.markerSet && targetExist) {
      this.game.entity.activateTarget()
    }

    // PLAYER TOUCH TARGET
    if (this.stageFlags.targetPressed == true) {
      // player touches trash can in 0
      if (this.stageFlags.touchedCan == false) {
        this.stageFlags.touchedCan = true
        // bags
        console.log('placed trash bag target ')
        this.game.entity.placeTarget(17, 17, 3)
        this.game.dialog.startDialogChain(7)
        this.setObjectiveText('Find trash bags')
        this.stageFlags.targetPressed = false
        return
      }
      // player touches bags in basement
      if (this.stageFlags.touchedCan == true) {
        this.stageFlags.foundBags = true
        //place key
        this.game.dialog.startDialogChain(9)

        this.game.tilegrid.setTile(13, 11, TILE_DOOR) //lock door
        this.game.entity.placeTarget(13, 12, 3)
        if (location != undefined) {
          this.setObjectiveText('Find key or escape')
        }
        this.stageFlags.targetPressed = false
        return
      }
      if (this.stageFlags.foundBags == true) {
        //secret exit
        this.game.entity.placeTarget(2, 10, 3)
        this.stageFlags.kind = 4
        if (this.stageFlags.pickupIsSet == false) {
          this.game.pickup.addObjectiveUnitXYLC(1, 9, 3, this.stageFlags.kind)
          console.log('placed key target ')
          this.stageFlags.pickupIsSet = true
        }
        if (this.stageFlags.targetPressed) {
          this.game.dialog.startDialogChain(10)
          this.game.entity.placeTarget(2, 10, 3)
          this.stageFlags.targetPressed = false
        }

        console.log('placed exit target ')
      }

      this.stageFlags.markerSet = true

      this.stageFlags.targetPressed = false
    }
    // PLAYER TOUCH PICKUP
    if (this.stageFlags.pickupPressed) {
      if (this.stageFlags.kind == 4) {
        this.stageFlags.foundKey = true
        this.setObjectiveText('Unlock door to exit')
        this.stageFlags.foundKey = true
        this.stageFlags.pickupIsSet = false
      }

      this.stageFlags.pickupPressed
    }
  }

  placeObjectiveItem () {
    //console.log('POP')
    let locationsPossible = this.getLocationsFromStageID(this.stage).locations
      .length

    let location = this.getNextPickupLocation()
    while (location == this.lastLocation && locationsPossible > 1) {
      location = this.getNextPickupLocation()
    }
    this.lastLocation = location
    if (location != undefined) {
      this.game.pickup.addObjectiveUnitXYLC(
        location.gridX,
        location.gridY,
        location.level,
        Number(this.stageFlags.category)
      )
    }
  }
  stageRun () {
    // only this should call things based on stageFlags
    // other stageFlags functions are called externally and modify stageFlags
    switch (this.stage) {
      case 0:
        break
      case 1:
        //move boxes
        // pickup kinds 0 food, 1 box, 2 spray, 3 trap, 4 key
        this.missionPlaceBoxes()
        break
      case 2:
        this.setObjectiveTextIntermission(INTERMISSION_0)
        break
      case 3:
        // collect cans

        this.missionGatherCans()
        break
      case 4:
        this.setObjectiveTextIntermission(INTERMISSION_0)
        break
      case 5:
        // mouse traps
        //this.stageFlags.markerID = 1
        this.missionGatherMousetraps()

        break
      case 6:
        this.setObjectiveTextIntermission(INTERMISSION_0)
        this.intermissionSpecialActions()
        break

      case 7:
        this.missionTrashBasement()
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
          this.initStage(1)
        }

        break
      case 1:
        // categories: 0 box, 1 spray, 2 key, 3 trap 4 carts  5 hives
        //collect bug spray cans (stage 3)
        if (this.stage != 3) {
          this.stage = 3
          this.initStage(3)
        }

        break
      case 2:
        // categories: 0 box, 1 spray, 2 key, 3 trap 4 carts  5 hives
        //collect mouse traps
        if (this.stage != 5) {
          this.stage = 5
          this.initStage(5)
        }

        break

      case 3:
        // categories: 0 box, 1 spray, 2 key, 3 trap 4 carts  5 hives
        //collect mouse traps
        if (this.stage != 7) {
          this.stage = 7
          //this.stageFlags.targetPressed = false
          this.initStage(7)
        }

        break
    }
  }
}
