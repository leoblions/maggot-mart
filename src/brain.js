import * as Utils from './utils.js'
import { Tilegrid } from './tilegrid.js'
import Enums from './enums.js'

const MAX_UNITS = 10
const VERBOSE = true

const LK_STORAGE = 1
const PK_KEY = 4

const CYCLE_FLAGS_PERIOD = 800
const CLICK_ADD_PACER = 1000
const STAGE_RUN_PACER_PERIOD = 500
const SPAWNER_PACER_PERIOD = 2000
const TARGET_CLICK_DEBOUNCE = 1000
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
const OM_GREENBIN = 'put in green bin'
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
    this.spawnerFlags = {
      location: null,
      locationID: 0,
      enabled: true,
      kind: Enums.EK_MAGGOT,
      concurrent: -1, // -1 for unlimited
      amountToSpawn: -1
    } // flags to modify behavior of actions, or disable them
    this.stageFlags = {
      category: 0,
      complete: 0,
      incomplete: 0,
      pickuptotal: 1,
      locationID: -1,
      activateAny: false,
      markers: 0,
      pickupKind: 0,
      markerSet: false,
      pickupIsSet: false,
      pickupPressed: false,
      pickupsPressed: 0,
      advanceStage: false,
      counter: 0,
      carry: false,
      mustCarry: false,
      readyForNextObjective: false,
      readyForNextTarget: false,
      objectiveString: '',
      readyForNextPickup: false,
      readyForNextStage: false,
      stageDialogFlag: 0,
      actorPressedKind: 0,
      actorPressed: false,
      targetPressed: false,
      targetsPressed: 0,
      targetIsSet: false
    }
    this.locationRecordsWarp = null
    this.stageData = null
    this.locationRecordsPickup = null
    this.locationRecordsTarget = null
    this.cycleFlagsPacer = new Utils.createMillisecondPacer(CYCLE_FLAGS_PERIOD)
    this.stageRunPacer = new Utils.createMillisecondPacer(
      STAGE_RUN_PACER_PERIOD
    )
    this.spawnerPacer = new Utils.createMillisecondPacer(SPAWNER_PACER_PERIOD)
    this.clickAddPacer = new Utils.createMillisecondPacer(CLICK_ADD_PACER)
    //this.defaultInitializer()
    this.initStageData()
    this.initLocationData()
    this.initStage(0)
  }

  setObjective (category) {
    this.stageFlags.category = category
    this.stageFlags.complete = 0
    this.stageFlags.pickuptotal = OBJECTIVE_AMOUNTS[category] ?? 0
    this.setObjectiveText()
  }

  getLocation (collection, locationID) {
    for (let loc of collection) {
      let lid = loc?.locationID ?? null

      if (lid == locationID) {
        return loc
      }
    }
    console.error('location not found ' + locationID)
    return null
  }

  getLocationByName (collection, name) {
    for (let loc of collection) {
      let locname = loc?.name ?? null

      if (locname == name) {
        return loc
      }
    }
    console.error('location not found ' + name)
    return null
  }

  loadDataFromRecord (stageID) {
    for (const record of this.stageData) {
      if (record.stageID == stageID) {
        this.stageFlags.category = record.category
        this.stageFlags.carry = record?.carry ?? false
        this.stageFlags.mustCarry = record?.mustCarry ?? false
        this.stageFlags.complete = 0
        this.stageFlags.incomplete = record.amount
        this.stageFlags.pickuptotal = record.amount
        this.stageFlags.locationID = record?.locationID ?? -1

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
    // read in locations records and parse the json to an object array
    this.locationRecordsPickup = await fetch('./data/location_item.json')
    this.locationRecordsPickup = await this.locationRecordsPickup.json()

    this.locationRecordsActor = await fetch('./data/location_actor.json')
    this.locationRecordsActor = await this.locationRecordsActor.json()

    this.locationRecordsTarget = await fetch('./data/location_target.json')
    this.locationRecordsTarget = await this.locationRecordsTarget.json()

    this.locationRecordsWarp = await fetch('./data/warp_destinations.json')
    this.locationRecordsWarp = await this.locationRecordsWarp.json()

    this.locationRecordsSpawner = await fetch('./data/location_spawner.json')
    this.locationRecordsSpawner = await this.locationRecordsSpawner.json()

    this.actionTable = await fetch('./data/action_table.json')
    this.actionTable = await this.actionTable.json()
    Brain.actionTable = this.actionTable
  }

  getRandomItemLocation () {
    let defaultLocationRecord = null
    for (const record of this.locationRecordsPickup) {
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
    let location = null
    let thisStageRecords = this.getLocationsFromStageID(this.stage).locations

    let len = thisStageRecords.length
    // default location to 0
    if (undefined == this.currentItemIndex) {
      this.currentItemIndex = 0
    }

    //let desiredRecord = this.getLocationsFromStageID(this.stage)
    if (thisStageRecords != null) {
      location = thisStageRecords[this.currentItemIndex]
      if (location == undefined) {
        location = thisStageRecords[0]
      }
      //return location
    }

    if (this.currentItemIndex < len) {
      this.currentItemIndex += 1
    } else {
      this.currentItemIndex = 0
    }
    return location
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
      if (undefined == this.stageFlags.pickuptotal) {
      } else {
        let category = this.stageFlags.objectiveString
        newText =
          (this.stageFlags.objectiveString ?? '') +
          ' ' +
          this.stageFlags.complete +
          '/' +
          this.stageFlags.pickuptotal
      }

      this.game.hud.objectiveText.updateText(newText)
    } else {
      this.game.hud.objectiveText.updateText(overrideText)
    }
  }
  setObjectiveTextCT (string, complete, total) {
    if (string != null) {
      let newText = string + ' ' + complete + '/' + total

      this.game.hud.objectiveText.updateText(newText)
    } else {
      console.error(newText)
      this.game.hud.objectiveText.updateText('ERROR SOTCT')
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
            Enums.EK_MANAGER,
            BOSS_OFFICE_POSITION
          )
        }
        break
      default:
        break
    }
  }

  collectItemAction (pickupKind) {
    console.log('Pickup item pickupKind ' + pickupKind)
    if (pickupKind == this.stageFlags.pickupKind) {
      this.stageFlags.carry = true
      this.stageFlags.pickupPressed = true
    }
  }

  collectItemKindAction (pickupKind) {
    // set stageFlags based on player collecting OI
    //console.log('pickup pickupKind was ' + pickupKind)
    //console.log('objective pickup pickupKind is ' + this.stageFlags.pickupKind)
    if (pickupKind == this.stageFlags.pickupKind) {
      this.stageFlags.carry = true
      this.stageFlags.pickupPressed = true
    }
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

  playerActivateNPC (kind) {
    this.stageFlags.actorPressed = true
    this.stageFlags.actorPressedKind = kind
    switch (kind) {
      case Enums.EK_MANAGER:
      case Enums.EK_ELLIOT:
        //let managerChainID = this.getManagerDialogChain()
        //console.log('activate npc ' + unitKind)

        //let chainID = this.getActorDialogChain(unitKind)

        let entref = this.game.entity.getEntity(kind)
        let chainID = entref?.dialogChain ?? -1
        if (chainID != -1) {
          this.game.dialog.startDialogChain(chainID)
        } else {
          console.error('failed to get dialog record for unit ' + kind)
          console.log(this.game.entity.units)
        }

        break
      case Enums.EK_TARGET:
        this.stageFlags.actorPressed = false
        if (this.game.dialog.active) {
          // prevent reactivation of target
          break
        }
        this.stageFlags.targetPressed = true
        break
      default:
        break
    }
    this.game.entity.playerPressedActivate = false
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
    for (let i in this.locationRecordsWarp) {
      if (this.locationRecordsWarp[i].destID == destID) {
        foundIndex = i
        break
      }
    }

    // let index = this.locationRecordsWarp.find((value, i, a) => {
    //   if (value.destID == destID) {
    //     return i
    //   }
    // })
    let destUnit = this.locationRecordsWarp[foundIndex] ?? undefined
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
    this.game.pickup.recheckVisible = true
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
      if (this.stageFlags.complete == this.stageFlags.pickuptotal) {
        this.stageFlags.complete = 0
        this.stageFlags.advanceStage = false
        this.stageFlags.pickuptotal = 1
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
    if (this.spawnerPacer()) {
      this.spawner()
    }
    //this.game.pickup.addObjectiveItemEnabled = true
    this.stageFlags.activateAny = false
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
      try {
        this.initStage(newStage)
      } catch (error) {
        console.error(error)
      }
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
      this.setObjectiveTextCT(
        this.stageFlags.objectiveString,
        this.stageFlags.complete,
        this.stageFlags.total
      )
    }

    // PLAYER PICKED UP ITEM

    if (this.stageFlags.pickupPressed) {
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
      this.setObjectiveTextCT(
        this.stageFlags.objectiveString,
        this.stageFlags.complete,
        this.stageFlags.total
      )
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
      this.game.pickup.addObjectiveUnitXYLK(
        location.gridX,
        location.gridY,
        location.level,
        this.stageFlags.pickupKind
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
      let markerObj = this.getMarkerObjectFromID(Enums.TL_BOX)
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

  getMarkerObjectFromID (locationID) {
    for (let marker of this.locationRecordsTarget) {
      let currentID = marker?.locationID ?? -1
      if (currentID == locationID) {
        return marker
      }
    }
    console.error('Location not found ' + locationID)
    return null
  }

  missionGatherMousetraps () {
    // stage 5
    // ASSESS
    let OIactive = this.game.pickup.isObjectiveItemActive()
    this.stageFlags.pickupKind = Enums.PK_TRAP
    let spawnTargetNow = false
    let spawnPickupNow = false

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
    if (!this.stageFlags.pickupIsSet && this.stageFlags.pickupsPressed == 0) {
      console.log('MGM set first pickup')
      this.stageFlags.carry = false
      spawnPickupNow = true
      //this.stageFlags.readyForNextPickup = true
      this.stageFlags.setFirstPickup = false
      this.stageFlags.pickupIsSet = true
      //this.stageFlags.targetIsSet = false
      this.setObjectiveTextCT(
        this.stageFlags.objectiveString,
        this.stageFlags.pickupsPressed,
        this.stageFlags.pickupsRequired
      )
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

      this.stageFlags.pickupsPressed += 1
      this.stageFlags.pickupPressed = false
      this.stageFlags.complete += 1

      if (
        this.stageFlags.pickupsPressed < this.stageFlags.pickupsRequired &&
        this.stageFlags.targetIsSet == false
      ) {
        // spawn more pickups
        spawnPickupNow = true
        this.setObjectiveTextCT(
          this.stageFlags.objectiveString,
          this.stageFlags.pickupsPressed,
          this.stageFlags.pickupsRequired
        )
      } else {
        // enable target
        spawnTargetNow = true
      }
    }

    // PLACE TARGET

    if (spawnTargetNow) {
      console.log('MGM place target')
      this.setObjectiveTextIntermission('put in the green dumpster')
      this.stageFlags.readyForNextTarget = false
      //let markerObj = this.getMarkerObjectFromID(this.stageFlags.locationID)
      this.stageFlags.markerSet = true
      this.stageFlags.targetIsSet = true
      let loc = this.getLocationByName(this.locationRecordsTarget, 'DUMPSTER')
      this.game.entity.placeTarget(loc.gridX, loc.gridY, loc.level)
    }

    // PLACE PICKUP

    if (spawnPickupNow) {
      this.stageFlags.readyForNextPickup = false
      this.stageFlags.pickupPressed = false
      console.log('MGM place pickup')
      let location = this.getNextPickupLocation()
      console.log(location)

      if (location != undefined) {
        this.game.pickup.addObjectiveUnitXYLK(
          location.gridX,
          location.gridY,
          location.level,
          Enums.PK_TRAP
        )

        this.stageFlags.readyForNextObjective = false
        this.stageFlags.targetPressed = false
        this.stageFlags.carry = false
      } else {
        console.error('MGM place pickup - undefined location')
      }
    }

    // player is not carrying and OI not set
    // if (!this.stageFlags.carry && this.stageFlags.complete == 0 && !OIactive) {
    //   this.placeObjectiveItem()
    // } else if (this.stageFlags.carry && !OIactive) {
    //   // only do si if pickup is in current level
    //   if (!this.game.pickup.stageFlagsItemExists()) {
    //     this.stageFlags.readyForNextObjective = false
    //     //this.game.pickup.addObjectiveUnit(this.stageFlags.category)
    //     this.placeObjectiveItem()

    //     this.stageFlags.carry = false
    //     console.log('(2)placed obj item ' + this.stageFlags.category)
    //   }
    // }
  }

  missionGatherCans () {
    // stage 3
    // ASSESS

    this.stageFlags.pickupKind = Enums.PK_SPRAY
    let OIactive = this.game.pickup.isObjectiveItemActive()

    // ADVANCE STAGE
    if (this.stageFlags.complete >= this.stageFlags.total) {
      this.stageFlags.advanceStage = true
      this.stageFlags.carry = false
      this.stageFlags.targetPressed = false
      return
    }

    // FIRST PICKUP
    if (!this.stageFlags.pickupIsSet && this.stageFlags.complete == 0) {
      console.log('MGC set first pickup')
      this.stageFlags.carry = false
      this.stageFlags.readyForNextPickup = true

      let location = this.getNextPickupLocation()
      console.log(location)
      this.stageFlags.pickupIsSet = true
      if (location != undefined) {
        this.game.pickup.addObjectiveUnitXYLK(
          location.gridX,
          location.gridY,
          location.level,
          Enums.PK_SPRAY
        )
      }
      this.stageFlags.setFirstPickup = false
      this.stageFlags.targetIsSet = false
      this.stageFlags.pickupIsSet = true
    }

    // PLAYER TOUCH PICKUP

    if (this.stageFlags.pickupPressed) {
      console.log('MGC touch pickup')

      //this.stageFlags.pickupsPressed += 1
      this.stageFlags.pickupPressed = false
      this.stageFlags.complete += 1
      this.stageFlags.pickupIsSet = false
      this.setObjectiveTextCT(
        this.stageFlags.objectiveString,
        this.stageFlags.complete,
        this.stageFlags.total
      )
      if (this.stageFlags.total == this.stageFlags.complete) {
        this.setObjectiveText('Talk to boss')
      }
    }

    // PLACE TARGET

    // if (this.stageFlags.readyForNextTarget) {
    //   console.log('MGC place target')
    //   this.stageFlags.readyForNextTarget = false
    //   let markerObj = this.getMarkerObjectFromID(this.stageFlags.locationID)
    //   this.stageFlags.markerSet = true
    //   this.game.entity.placeTarget(
    //     markerObj.gridX,
    //     markerObj.gridY,
    //     markerObj.level
    //   )
    // }

    // PLACE PICKUP
    //console.log(OIactive)

    if (
      this.stageFlags.complete < this.stageFlags.total &&
      this.stageFlags.pickupIsSet == false
    ) {
      debugger
      this.stageFlags.readyForNextPickup = false
      this.stageFlags.pickupPressed = false
      console.log('MGC place pickup ' + this.stageFlags.pickupKind)

      let location = this.getNextPickupLocation()
      console.log(location)
      this.stageFlags.pickupIsSet = true
      if (location != undefined) {
        this.game.pickup.addObjectiveUnitXYLK(
          location.gridX,
          location.gridY,
          location.level,
          Enums.PK_SPRAY
        )

        this.stageFlags.readyForNextObjective = false
        this.stageFlags.targetPressed = false
        this.stageFlags.carry = false
      } else {
        console.error('MGC place pickup - undefined location')
      }
    }

    // player is not carrying and OI not set
    // if (!this.stageFlags.carry && this.stageFlags.complete == 0 && !OIactive) {
    //   this.placeObjectiveItem()
    // } else if (this.stageFlags.carry && !OIactive) {
    //   // only do si if pickup is in current level
    //   if (!this.game.pickup.stageFlagsItemExists()) {
    //     this.stageFlags.readyForNextObjective = false
    //     //this.game.pickup.addObjectiveUnit(this.stageFlags.category)
    //     this.placeObjectiveItem()

    //     this.stageFlags.carry = false
    //     console.log('(2)placed obj item ' + this.stageFlags.category)
    //   }
    // }
  }

  missionTrashBasement () {
    //stage 8
    this.stageFlags.pickupKind = Enums.PK_KEY
    let targetIsActive = this.game.entity.targetIsSet()
    let targetInRoom = this.game.entity.targetInCurrentRoom()
    let target = this.game.entity.getTarget()
    let targetExist = !(target == undefined)
    let showExitDoorTarget =
      this.stageFlags.complete == 2 || this.stageFlags.complete == 3

    if (this.stageFlags.complete == 4 && this.game.level == Enums.LK_STORAGE) {
      this.stageFlags.complete = 5
      this.game.dialog.startDialogChain(12)
      //this.stageFlags.advanceStage=true
    }
    debugger

    if (this.game.level == Enums.LK_FRONT && this.stageFlags.complete == 0) {
      this.game.entity.activateTarget()
    } else if (
      this.game.level == Enums.LK_BASEMENT &&
      showExitDoorTarget &&
      this.stageFlags.counter == 0 &&
      this.game.dialog.active == false
    ) {
      this.game.entity.activateTarget()
      this.stageFlags.counter == 20
    }
    /**
     * complete:
     * 0 = start
     * 1 = touched can
     * 2 = touched bags
     * 3 = found key
     * 4 = returned to storage
     */

    // PLAYER TOUCH TARGET, set complete flag value
    dlg_active: if (this.stageFlags.targetPressed == true) {
      this.stageFlags.targetPressed = false
      if (this.game.dialog.active == true) {
        break dlg_active
      } else {
        debugger
        switch (this.stageFlags.complete) {
          case -1:
            this.stageFlags.complete = 1

            break
          case 0:
            if (true) {
              this.stageFlags.markerSet = true
              this.game.entity.placeTargetByName('BAGS_BASEMENT')
              this.game.dialog.startDialogChain(7)
              this.game.entity.removeEntityByKind(Enums.EK_ALFRED)
              console.log('placed trash bag target ')
              this.setObjectiveText('Find trash bags')
              this.stageFlags.targetPressed = false
              this.game.entity.placeTargetByName(
                this.locationRecordsTarget,
                'BAGS_BASEMENT'
              )
              this.stageFlags.complete = 1
              break
            }
          case 1:
            this.game.dialog.startDialogChain(9)
            this.game.tilegrid.setTile(13, 11, TILE_DOOR) //lock door
            console.log('placed bd door target ')
            let entity = this.game.entity.placeTargetByName(
              this.locationRecordsTarget,
              'BASEMENT_EXIT'
            )
            entity.deactivateOnInteract = true
            if (location != undefined) {
              this.setObjectiveText('Find key or escape')
            }
            this.stageFlags.complete = 2
            if (this.stageFlags.pickupIsSet == false) {
              this.game.pickup.addObjectiveUnitXYLK(1, 9, 3, Enums.PK_KEY)
              console.log('placed key target ')
              this.stageFlags.pickupIsSet = true
            }
            break
          case 2:
            // player presses basement exit door target

            this.stageFlags.pickupKind = Enums.PK_KEY

            if (this.stageFlags.pickupsPressed > 0) {
              this.game.tilegrid.setTile(13, 11, 8)
              //this.stageFlags.advanceStage = true
              this.stageFlags.complete = 4
            } else {
              if (
                this.game.dialog.active == false &&
                this.stageFlags.counter == 0
              ) {
                this.game.dialog.startDialogChain(10)
              }
            }

            break
          case 3:
            //found the key
            this.game.tilegrid.setTile(13, 11, 8)
            //this.stageFlags.advanceStage = true
            this.stageFlags.complete = 4
            break
        }
      }
    }
    // PLAYER TOUCH PICKUP
    if (this.stageFlags.pickupPressed) {
      debugger
      this.stageFlags.pickupsPressed += 1
      if (
        this.stageFlags.pickupKind == PK_KEY &&
        this.stageFlags.complete >= 2
      ) {
        this.stageFlags.complete = 3
        this.setObjectiveText('Unlock door to exit')

        this.stageFlags.pickupIsSet = false
      }

      this.stageFlags.pickupPressed = false
    }
  }

  missionLastBag () {
    let objectivePickup = this.game.pickup.getObjectiveItem()
    /**
     * Talk to elliot
     * elliot gives bugspray
     * fetch last trash bag from front
     * put in green dumpster
     * maggot attacks from above
     * talk to elliot
     *
     * complete :
     * 0 start
     * 1 talk to elliot
     * 2 got bag
     * 3 touched dumpster
     * 4 monolog complete
     */
    // ACTOR PRESSED
    if (
      this.stageFlags.actorPressed == true &&
      this.stageFlags.actorPressedKind == Enums.EK_ELLIOT
    ) {
      this.stageFlags.actorPressed = false

      if (this.stageFlags.stageDialogFlag == 0) {
        this.stageFlags.stageDialogFlag = 1 // talked to elliot
        this.stageFlags.complete = 1
      }
    }

    if (
      objectivePickup != null &&
      objectivePickup.alive &&
      objectivePickup.level == this.game.level
    ) {
      objectivePickup.active = true
    }

    // SPAWN PICKUPS
    if (
      this.stageFlags.pickupIsSet == false &&
      this.stageFlags.stageDialogFlag == 1 &&
      this.stageFlags.pickupsPressed == 0
    ) {
      this.game.pickup.addObjectiveUnitXYLK(17, 3, 0, Enums.PK_BAG)
      //debugger
      //this.stageFlags.pickupsPressed = 1
      this.setObjectiveTextIntermission('get trash bag')
      console.log('added pickup trashbag')
      this.stageFlags.pickupKind = Enums.PK_BAG
      let entity = this.game.entity.placeTargetByName(
        this.locationRecordsTarget,
        'DUMPSTER'
      )

      entity.deactivateOnInteract = true
      this.stageFlags.pickupIsSet = true
    }
    // PICKUP PRESSED
    if (this.stageFlags.pickupPressed) {
      this.stageFlags.pickupPressed = false
      this.stageFlags.pickupIsSet = false
      this.stageFlags.pickupsPressed += 1
      if (this.stageFlags.pickupsPressed == 1) {
        this.setObjectiveTextIntermission(OM_GREENBIN)
      }
    }
    //TARGET PRESSED
    if (this.stageFlags.targetPressed) {
      this.stageFlags.targetPressed = false
      this.targetsPressed += 1
      this.stageFlags.complete = 3
      this.setObjectiveText('Run')
      this.game.dialog.startDialogChain(13)
    }
    // start spawner
    if (this.stageFlags.complete == 4) {
      this.spawnerFlags.enabled = true
    }
  }

  getLocationsFromStageID (stage) {
    for (let location of this.locationRecordsPickup) {
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

    let location = this.getNextPickupLocation()
    while (location == this.lastLocation && locationsPossible > 1) {
      location = this.getNextPickupLocation()
    }
    this.lastLocation = location
    if (location != undefined) {
      this.game.pickup.addObjectiveUnitXYLK(
        location.gridX,
        location.gridY,
        location.level,
        Number(this.stageFlags.category)
      )
    }
  }
  /**
   *
   * @param {number} stageID which stage or mission to start
   * This code is run once at the start of each mission
   */
  initStage (stageID) {
    // let alfredChains = [0, 0, 2, 2, 3, 3, 6, 6]
    // let elliotChains = [1, 1, 1, 1, 5, 5, 5, 5]
    try {
      //this.loadDataFromRecord(stageID)
    } catch (error) {
      console.error(error)
    }
    // nonspecific flags and counters to reset
    this.stageFlags.targetPressed = false
    this.stageFlags.actorPressed = false
    this.stageFlags.pickupPressed = false
    this.stageFlags.targetIsSet = false
    this.stageFlags.pickupsPressed = 0
    this.stageFlags.targetsPressed = 0
    this.stageFlags.complete = 0
    this.currentItemIndex = 0

    this.stageFlags.advanceStage = false // must do at start of every stage to prevent runaway loop
    // pickup pickupKinds 0 food, 1 box, 2 spray, 3 trap, 4 key
    switch (stageID) {
      case 0:
        this.game.entity.entitySetDialogChain(Enums.EK_ELLIOT, 1)
        this.game.entity.entitySetDialogChain(Enums.EK_MANAGER, 0)
        break
      case 1:
        this.stageFlags.boxesCollected = 0
        this.stageFlags.boxesPlaced = 0
        this.stageFlags.pickupKind = 1
        this.stageFlags.boxesPlacedRequired = 3
        this.stageFlags.pickuptotal = 3
        this.stageFlags.objectiveString = 'Place boxes'
        this.stageFlags.total = 3
        this.stageFlags.complete = 0
        this.game.entity.entitySetDialogChain(Enums.EK_ELLIOT, 1)
        this.game.entity.entitySetDialogChain(Enums.EK_MANAGER, 0)
        try {
          this.setObjectiveTextCT(
            this.stageFlags.objectiveString,
            this.stageFlags.complete,
            this.stageFlags.total
          )
        } catch (error) {
          console.error(error)
        }

        break
      case 2:
        this.game.entity.entitySetDialogChain(Enums.EK_MANAGER, 2)
        break
      case 3:
        this.stageFlags.pickupKind = Enums.PK_SPRAY
        this.stageFlags.pickupIsSet = false
        this.stageFlags.pickupsRequired = 4
        this.stageFlags.targetsRequired = 1
        this.stageFlags.targetsPressed = 0
        this.stageFlags.pickupsPressed = 0
        this.stageFlags.total = 4
        this.stageFlags.complete = 0
        this.stageFlags.objectiveString = 'Bug spray'
        try {
          this.setObjectiveTextCT(
            this.stageFlags.objectiveString,
            this.stageFlags.pickupsPressed,
            this.stageFlags.pickupsRequired
          )
        } catch (error) {
          console.error(error)
        }

        break
      case 4:
        this.game.entity.entitySetDialogChain(Enums.EK_MANAGER, 3)
        break

      case 5:
        this.stageFlags.pickupKind = Enums.PK_TRAP
        this.stageFlags.pickupsRequired = 4
        this.stageFlags.targetsRequired = 1
        this.stageFlags.pickupIsSet = false
        this.stageFlags.targetsPressed = 0
        this.stageFlags.complete = 0
        this.stageFlags.total = 4
        this.stageFlags.pickupsPressed = 0
        this.stageFlags.pickupKind = 3
        this.stageFlags.pickuptotal = 4
        this.stageFlags.objectiveString = 'Mouse traps'
        this.setObjectiveText()
        break
      case 6:
        this.game.entity.entitySetDialogChain(Enums.EK_MANAGER, 6)
        break

      case 7:
        this.setObjectiveText('Empty the trash in front')
        this.game.entity.placeTargetByName(
          this.locationRecordsTarget,
          'TRASHCAN_1'
        )
        this.stageFlags.complete = 0
        this.stageFlags.targetIsSet = true
        this.stageFlags.targetsPressed = 0
        this.stageFlags.pickupsPressed = 0

        break
      case 8:
        this.setObjectiveText('talk to elliot')
        this.pickupIsSet = false
        this.game.entity.entitySetDialogChain(Enums.EK_ELLIOT, 11)
        this.stageFlags.stageDialogFlag = 0
        this.stageFlags.actorPressed = false
        this.spawnerFlags.concurrent = 1
        let elliotLoc = this.getLocation(this.locationRecordsActor, 6)
        this.game.entity.removeEntityByKind(Enums.EK_TREY)
        this.game.entity.removeEntityByKind(Enums.EK_DARRYL)
        this.game.entity.removeEntityByKind(Enums.EK_ALFRED)
        this.game.entity.moveEntity(
          Enums.EK_ELLIOT,
          elliotLoc.gridX,
          elliotLoc.gridY,
          elliotLoc.level
        )
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

  spawner () {
    let spawnLevel = this.spawnerFlags.location?.level ?? null
    if (undefined == this.locationRecordsSpawner) {
      console.warn(' locationRecordsSpawner not loaded')
      return
    }

    let currentAmountOfEnemies = this.game.entity.getAmountActiveEnemies()
    if (
      this.spawnerFlags.concurrent != -1 &&
      currentAmountOfEnemies > this.spawnerFlags.concurrent
    ) {
      return // too many concurrent enemies
    }

    if (
      spawnLevel != null &&
      this.game.level == spawnLevel &&
      this.spawnerFlags.enabled &&
      this.game.entity.canSpawnEnemy()
    ) {
      this.game.entity.addUnitToGrid(
        this.spawnerFlags.location.gridX,
        this.spawnerFlags.location.gridY,
        this.spawnerFlags.kind,
        this.spawnerFlags.location.level,
        true
      )
    } else {
      for (let loc of this.locationRecordsSpawner) {
        if (loc != null && loc.locationID == this.spawnerFlags.locationID) {
          this.spawnerFlags.location = loc
          break
        }
      }
    }
  }

  stageRun () {
    // only this should call things based on stageFlags
    // other stageFlags functions are called externally and modify stageFlags
    this.stageFlags.counter =
      this.stageFlags.counter > 0
        ? this.stageFlags.counter - 1
        : this.stageFlags.counter
    switch (this.stage) {
      case 0:
        break
      case 1:
        //move boxes
        // pickup pickupKinds 0 food, 1 box, 2 spray, 3 trap, 4 key
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
        //this.stageFlags.locationID = 1
        this.missionGatherMousetraps()

        break
      case 6:
        this.setObjectiveTextIntermission(INTERMISSION_0)
        this.intermissionSpecialActions()
        break

      case 7:
        this.missionTrashBasement()
        break
      case 8:
        this.missionLastBag()
        break
      default:
        break
    }
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
      case 4:
        // categories: 0 box, 1 spray, 2 key, 3 trap 4 carts  5 hives
        //collect mouse traps
        if (this.stage != 8) {
          this.stage = 8
        }

        break
      case 5:
        this.stageFlags.counter = 0
        break
      case 6:
        this.stageFlags.complete += 1
        console.log('sf complete is ' + this.stageFlags.complete)
        break
      case 7:
        this.stageFlags.advanceStage = true
        break
      case 8:
        this.spawnerFlags.enabled = !this.spawnerFlags.enabled
        this.game.entity.setSpawner(this.spawnerFlags.enabled)
        this.game.entity.currentEnemiesLimit = 1

        break
    }
  }
}
