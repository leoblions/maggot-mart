import * as Utils from './utils.js'
import * as Assets from './assets.js'
import * as Tilegrid from './tilegrid.js'
import Enums from './enums.js'

const MAX_UNITS = 15
const ENEMY_START_ARRAY_INDEX = 5
const SPRITE_WIDTH = 100
const SPRITE_HEIGHT = 100
const UNIT_LIFE = 40
const DEFAULT_DAMAGE_FROM_PLAYER = 10
const SPAWN_RATE = 10000
const FRAME_DURATION_MS = 300
const ENTITY_SPEED = 2
const MAX_KIND = 3
const CHANGE_DIRECTION_PERIOD = 40
const CHANGE_DIRECTION_PERIOD_W = 1000
const PF_SPRITE_OFFSET_X = -50
const PF_SPRITE_OFFSET_Y = -50
const FRAMES_PER_KIND = 4
const DAMAGE_TO_PLAYER = 4
const PLAYER_TOUCH_OFFSET_X = 50
const PLAYER_TOUCH_OFFSET_Y = 50
const BUG_IMAGES_PER_ROW = 4
const IMAGES_IN_BUG_SPRITESHEET = 16
const ENABLE_SPAWNER_OVERRIDE = false
const SPAWN_X = 1000
const SPAWN_Y = 900
const CHARACTER_IMAGES_X = 6
const CHARACTER_IMAGES_Y = 4
const EK_MANAGER = 8
const EK_ELLIOT = 9
const EK_TREY = 10
const EK_DARRYL = 11
const EK_TARGET = 20
const DEFAULT_ENEMIES_LIMIT = 3
const TARGET_MARKER_ARRAY_INDEX = 4
const MOVE_PERIOD = 10
/*
Entity kinds
0-7 enemy
8 manager
9 elliot
20 objective

*/

class Unit {
  /**
   * @param {number} worldX - world position x in pixels
   * @param {number} worldY - world position y in pixels
   * @param {number} kind - kind of entity
   */
  constructor (worldX, worldY, kind) {
    this.kind = kind // what kind of entity.  Each enemy and NPC type is a kind. Player is not an entity
    this.worldX = worldX
    this.worldY = worldY
    this.active = true // is entity displayed, processed for current room.  Set unit reference to null to remove
    // If unit is alive but in another room then it is inactive and not deleted but not shown
    this.alive = true // when dead, unit can be deleted
    this.deactivateOnInteract = false
    this.imageSet = 0 // up down left right
    this.level = Entity.currentLevel
    this.speed = Entity.speed
    this.state = 'f' // s stand, f follow, a attack, w wander
    this.direction = 'd' // u d l r
    this.imageArray = null
    this.imagesPerDirection = 6
    this.dialogChain = -1
    // kind specific data
    switch (this.kind) {
      case Enums.EK_MAGGOT:
        this.imagesPerDirection = 4
        this.width = 70
        this.height = 70
        this.state = 'f'
        this.imageArray = Entity.maggotImages
        this.isEnemy = true
        break
      case Enums.EK_MANAGER:
        this.imagesPerDirection = 4
        this.width = 80
        this.height = 120
        this.state = 's'
        this.imageArray = Entity.managerImages
        this.isEnemy = false
        this.dialogChain = 0
        break
      case Enums.EK_ELLIOT:
        this.imagesPerDirection = 6
        this.width = 80
        this.height = 110
        this.state = 's'
        this.imageArray = Entity.elliotImages
        this.isEnemy = false
        this.dialogChain = 1
        break
      case Enums.EK_DARRYL:
        this.imagesPerDirection = 4
        this.state = 'w'
        this.isEnemy = false
        this.imageArray = Entity.darrylImages
        this.width = 80
        this.height = 100
        this.speed = 1
        break
      case Enums.EK_TARGET:
        this.imagesPerDirection = 6
        this.state = 's'
        this.direction = 'u'
        this.isEnemy = false
        this.deactivateOnInteract = true
        this.width = 100
        this.height = 100
        this.imageArray = Entity.markerImages
        break
      case Enums.EK_TREY:
        this.imagesPerDirection = 4
        this.state = 'w'
        this.isEnemy = false
        this.imageArray = Entity.treyImages
        this.width = 80
        this.height = 100
        this.speed = 1
        break
      case Enums.EK_ALBERT:
        this.imagesPerDirection = 4
        this.state = 'w'
        this.isEnemy = false
        this.imageArray = Entity.treyImages
        this.width = 80
        this.height = 100
        this.speed = 1
        break
      default:
        this.isEnemy = true
        this.state = 'f'
        this.isEnemy = true
        this.imageArray = Entity.bugImages
        this.width = SPRITE_WIDTH
        this.height = SPRITE_HEIGHT
    }

    this.imageID = 0 //which image to use for current frame, from array of images
    this.frameMin = 0
    this.frameMax = 0
    this.leftOfPlayer = true
    this.life = UNIT_LIFE
    this.velX = 0
    this.velY = 0
    this.damageToPlayer = DAMAGE_TO_PLAYER

    //this.setFrameMinAndmax()
  }
  // setFrameMinAndmax () {
  //   //do not use
  //   this.frameMin = FRAMES_PER_KIND * this.kind
  //   this.imageID = this.frameMin
  //   this.frameMax = FRAMES_PER_KIND * this.kind + FRAMES_PER_KIND - 1
  // }

  takeDamage (damageAmount = DEFAULT_DAMAGE_FROM_PLAYER) {
    let newLife = this.life - damageAmount
    if (newLife > 0) {
      this.life = newLife
    } else {
      this.life = 0
      this.alive = false
    }
    console.log(`entity took damage. new life: ${this.life}`)
  }
}

export class Entity {
  // class for managing enemies and NPCs

  static imagesLoaded = false
  static speed = ENTITY_SPEED
  static animateSpeed = 60
  static spawner = false
  static bugImages
  static managerImages
  static currentLevel

  constructor (game) {
    this.ready = false
    this.game = game
    this.changeDirectionActive = false // pacer has fired, change direction in units
    this.currentEnemiesLimit = DEFAULT_ENEMIES_LIMIT
    Entity.currentLevel = this.game.level
    this.worldXMax = this.game.tileSize * this.game.tilegrid.tilesX
    this.worldYMax = this.game.tileSize * this.game.tilegrid.tilesY
    this.imageSets = null
    this.units = new Array(MAX_UNITS)
    this.spawnPacer = Utils.createMillisecondPacer(SPAWN_RATE)
    this.changeDirectionPacer = Utils.createTickPacer(CHANGE_DIRECTION_PERIOD)
    this.changeDirectionWander = Utils.createTickPacer(
      CHANGE_DIRECTION_PERIOD_W
    )
    this.changeFramePacer = Utils.createMillisecondPacer(FRAME_DURATION_MS)
    this.movePacer = Utils.createTickPacer(MOVE_PERIOD)
    this.playerPressedActivate = false
    this.actorLocationData = null
    this.initActorLocationData()
    this.initImages()
    //debugger
    //this.addUnitToGrid(2, 2, 8, true)
    //this.addUnit(200, 200, 8, true)
    //this.addUnit(500, 200, 9, true)

    //this.addUnitToGrid(5, 6, 20, true)
  }

  initImages () {
    Entity.bugImages = Assets.bugsA
    Entity.managerImages = Assets.managerImg
    Entity.elliotImages = Assets.elliotImg
    Entity.treyImages = Assets.treyImg
    Entity.darrylImages = Assets.darrylImg
    Entity.markerImages = Assets.markerImg
    Entity.maggotImages = Assets.maggotImg
    Entity.albertImages = Assets.albertImg
  }

  async initActorLocationData () {
    this.actorLocationData = await fetch('./data/location_actor.json')
    this.actorLocationData = await this.actorLocationData.json()
    this.placeActorOnGrid(Enums.EK_MANAGER, 0)
    this.placeActorOnGrid(Enums.EK_ELLIOT, 1)
    this.placeActorOnGrid(Enums.EK_TREY, 2)
    this.placeActorOnGrid(Enums.EK_DARRYL, 5)
    this.placeActorOnGrid(Enums.EK_MAGGOT, 7)
  }

  placeActorOnGrid (actorKind, locationID) {
    for (let location of this.actorLocationData) {
      if (location.locationID == locationID) {
        this.addUnitToGrid(
          location.gridX,
          location.gridY,
          actorKind,
          location.level,
          true
        )
        return
      }
    }
    throw 'No matching locationID found ' + locationID
  }

  spawnUnit () {
    let kind = Math.floor(Math.random() * MAX_KIND)
    let worldX = SPAWN_X
    let worldY = SPAWN_Y
    for (let i = ENEMY_START_ARRAY_INDEX; i < MAX_UNITS; i++) {
      let element = this.units[i]
      if (!(element instanceof Unit) || !element.active) {
        if (true) {
          this.units[i] = new Unit(worldX, worldY, kind)
          console.log('add unit to ' + i)
        }
        break
      }
    }
  }

  moveEntityToActorPosition (kind, locationID) {
    let positionRecord = null
    for (let location of this.actorLocationData) {
      if (location.locationID == locationID) {
        positionRecord = location
        break
      }
    }
    if (positionRecord == null) {
      debugger
      throw 'No matching locationRecord found ' + positionRecord
    }

    let [matchedEntity] = this.units.filter(unit => {
      return unit.kind == kind
    })
    if (undefined != matchedEntity) {
      Object.assign(matchedEntity, {
        gridX: positionRecord.gridX,
        gridY: positionRecord.gridY,
        level: positionRecord.level,
        worldX: Math.round(positionRecord.gridX * this.game.tileSize),
        worldY: Math.round(positionRecord.gridY * this.game.tileSize)
      })
      return true
    } else {
      return false
    }
  }

  moveEntityKindToGridXY (kind, gridX, gridY, level) {
    if (typeof kind != 'number') {
      throw 'kind is not a number'
    }
    let [entity] = this.units.filter(val, index, () => {
      return value.kind == kind
    })
    if (undefined != entity) {
      Object.assign(entity, { gridX, gridY, level })
      entity.worldX = gridX * this.game.tilegrid.tileSize
      entity.worldY = gridY * this.game.tilegrid.tileSize
      return true
    } else {
      return false
    }
  }

  moveEntityToGridXY (entity, gridX, gridY, level) {
    if (undefined != entity) {
      Object.assign(entity, { gridX, gridY, level })
      entity.worldX = gridX * this.game.tilegrid.tileSize
      entity.worldY = gridY * this.game.tilegrid.tileSize
      return true
    } else {
      throw 'entity is not a entity'
      return false
    }
  }

  placeTargetByName (collection, name) {
    for (let loc of collection) {
      let locname = loc?.name ?? null

      if (locname == name) {
        let { gridX, gridY, level } = loc

        let entity = (this.units[TARGET_MARKER_ARRAY_INDEX] =
          this.createUnitGridLoc(gridX, gridY, Enums.EK_TARGET, level))
        entity.worldX = gridX * this.game.tilegrid.tileSize
        entity.worldY = gridY * this.game.tilegrid.tileSize
        return entity
      }
    }
    console.error('location not found ' + name)
    return null
  }

  placeTarget (gridX, gridY, level) {
    let index = TARGET_MARKER_ARRAY_INDEX
    let kind = Enums.EK_TARGET

    this.units[index] = this.createUnitGridLoc(gridX, gridY, kind, level)
    if (level == this.game.level) {
      let entity = this.units[index]
      entity.active = true
      entity.visible = true
      entity.worldX = gridX * this.game.tilegrid.tileSize
      entity.worldY = gridY * this.game.tilegrid.tileSize
    }
    console.log('added objective marker ' + level)
  }
  activateTarget () {
    let marker = this.units[TARGET_MARKER_ARRAY_INDEX]
    //debugger
    marker.active = true
    marker.alive = true
    marker.life = 100
  }
  targetIsSet () {
    let marker = this.units[TARGET_MARKER_ARRAY_INDEX]
    if (marker != null && marker.alive) {
      return true
    } else {
      return false
    }
  }
  targetInCurrentRoom () {
    let marker = this.units[TARGET_MARKER_ARRAY_INDEX]
    if (marker != null && marker.level == this.game.level) {
      return true
    } else {
      return false
    }
  }
  getTarget () {
    return this.units[TARGET_MARKER_ARRAY_INDEX]
  }
  createUnitGridLoc (gridX, gridY, kind, level = 0) {
    let worldX = Math.round(gridX * this.game.tileSize)
    let worldY = Math.round(gridY * this.game.tileSize)

    let unit = new Unit(worldX, worldY, kind)
    unit.level = level
    return unit
  }

  moveEntity (kind, gridX, gridY, level) {
    // finds the entity of correct kind and moves them
    for (let iter in this.units) {
      let unit = this.units[iter]
      if (unit == undefined) {
        continue
      }
      if (kind == unit.kind) {
        this.units[iter].gridX = gridX
        this.units[iter].gridY = gridY
        this.units[iter].level = level
        this.moveEntityToGridXY(this.units[iter], gridX, gridY, level)
      }
    }
  }

  removeEntityByKind (kind) {
    // deletes all entity of a specific type
    for (let iter in this.units) {
      let unit = this.units[iter]
      if (unit == undefined) {
        continue
      }
      if (kind == unit.kind) {
        this.units[iter] = null
      }
    }
  }
  entitySetDialogChain (kind, chainID) {
    for (let unit of this.units) {
      if (unit == undefined) {
        continue
      }

      if (kind == unit.kind) {
        unit.dialogChain = chainID
        return
      }
    }
  }

  getEntity (kind) {
    // return reference to an entity
    for (let unit of this.units) {
      if (unit == undefined) {
        continue
      }
      if (kind == unit.kind) {
        return unit
      }
    }
  }

  addUnitToGrid (gridX, gridY, kind, level = 0, forceAdd = false) {
    let worldX = Math.round(gridX * this.game.tileSize)
    let worldY = Math.round(gridY * this.game.tileSize)
    let unit = null

    for (let i = 0; i < MAX_UNITS; i++) {
      let element = this.units[i]
      if (!(element instanceof Unit) || !element.alive) {
        if (forceAdd || this.spawnPacer()) {
          this.units[i] = new Unit(worldX, worldY, kind)

          unit = this.units[i]
          unit.level = level
          //let worldX = Math.round(girdX * this.game.tileSize)
          //let worldY = Math.round(gridY * this.game.tileSize)
          console.log(`add unit type ${kind} X:${gridX}Y:${gridY}`)
        }
        break
      }
    }
    return unit
  }

  addUnit (worldX, worldY, kind, forceAdd = false) {
    let unit = null
    for (let i = 0; i < MAX_UNITS; i++) {
      let element = this.units[i]
      if (!(element instanceof Unit) || !element.alive) {
        if (forceAdd || this.spawnPacer()) {
          this.units[i] = new Unit(worldX, worldY, kind)
          unit = this.units[i]
          let gridX = Math.round(worldX / this.game.tileSize)
          let gridY = Math.round(worldY / this.game.tileSize)
          console.log(`add unit type ${kind} X:${gridX}Y:${gridY}`)
        }
        break
      }
    }
    return unit
  }

  getAmountActiveEnemies () {
    let amount = 0
    for (let i = 0; i < MAX_UNITS; i++) {
      let element = this.units[i]
      if (
        element instanceof Unit &&
        element.active &&
        element.alive &&
        element.isEnemy
      ) {
        amount++
      }
    }
    return amount
  }

  draw () {
    for (let element of this.units) {
      if (element instanceof Unit && element.active) {
        let screenX = element.worldX - this.game.cameraX
        let screenY = element.worldY - this.game.cameraY
        // choose left or right images
        let imageArray = element.imageArray
        let currImage = imageArray[element.imageID]
        //debugger

        if (currImage) {
          this.game.ctx.drawImage(
            currImage,
            screenX,
            screenY,
            element.width,
            element.height
          )
        }
      }
    }
  }

  /**
   * @deprecated
   * @param {Unit} unit reference to unit
   */
  setVelocityB (unit) {
    console.warn('do not use this function')
    let direction = this.game.pathfind.getDirectionTowardsPlayer(
      unit.worldX,
      unit.worldY
    )

    let directions = this.game.pathfind.entitySteeringDirections(
      unit.worldX,
      unit.worldY
    )

    if (this.changeDirectionPacer()) {
      switch (direction) {
        case 'N':
          break
        case 'U':
          unit.velY = -unit.speed
          break
        case 'D':
          unit.velY = unit.speed
          break
        case 'L':
          unit.velX = -unit.speed
          break
        case 'R':
          unit.velX = unit.speed
          break
        default:
      }
    }
  }

  entityPlayerInteract (unit) {
    if (this.entityTouchPlayer(unit)) {
      if (unit.isEnemy) {
        this.game.player.playerHitByEnemy(unit)
      } else if (!unit.isEnemy) {
        this.game.hud.interactText.active = true
        //activate NPC
        if (this.playerPressedActivate) {
          this.game.brain.playerActivateNPC(unit.kind)
          if (unit.deactivateOnInteract) {
            unit.active = false
            unit.life = 0
            console.log(
              `deactivated unit kind ${unit.kind} at array pos ${unit.index}`
            )
          }
          this.playerPressedActivate = false
        }

        //console.log('player activate npc ' + unit.kind)
      }
    }
  }

  entityMotion (unit) {
    if (unit.state == 's') {
      // standing
      return
    }

    //up down left right center
    if (this.changeDirectionActive) {
      unit.velX = 0
      unit.velY = 0
      let pathfindX = unit.worldX - PF_SPRITE_OFFSET_X
      let pathfindY = unit.worldY - PF_SPRITE_OFFSET_Y
      let gridvalues = this.game.pathfind.entitySteeringMatrix(
        pathfindX,
        pathfindY
      )

      let maxValue = 0
      let maxIndex = -1

      if (unit.state == 'f') {
        for (let i = 0; i < 5; i++) {
          if (gridvalues[i] > maxValue) {
            maxIndex = i
            maxValue = gridvalues[i]
          }
        }
      } else if (unit.state == 'w') {
        if (unit.kind == EK_TREY) {
        }
        if (undefined != unit.lastIndex) {
          maxIndex = unit.lastIndex
          let possDirections = []
          for (let i = 0; i < 5; i++) {
            if (gridvalues[i] > 0) {
              possDirections.push(i)
            }
          }

          let randval = Math.random()
          let randIndex = Math.round(randval * possDirections.length)
          maxIndex = randIndex
        } else {
          maxIndex = 4
        }
      }

      let collSides = this.game.collision.entityCollideTile(unit)
      if (collSides[maxIndex] == false) {
        switch (maxIndex) {
          case -1:
            unit.velX = 0
            unit.velY = 0
            break
          case 0: //up
            unit.velX = 0
            unit.direction = 'u'
            unit.velY = -Entity.speed
            break
          case 1: //down
            unit.velX = 0
            unit.direction = 'd'
            unit.velY = Entity.speed
            break
          case 2: //left
            unit.velX = -Entity.speed
            unit.direction = 'l'
            unit.velY = 0
            break
          case 3: //down
            unit.velX = Entity.speed
            unit.direction = 'r'
            unit.velY = 0
            break
          case 4: //center
            unit.velX = 0
            unit.direction = 'd'
            unit.velY = 0
            break
          default:
            unit.velX = 0
            unit.velY = 0
        }
      }

      unit.lastIndex = maxIndex
    }
  }

  setDirection (unit) {
    if (unit.velX > 0) {
      unit.direction = 'r'
    } else if (unit.velX < 0) {
      unit.direction = 'l'
    } else if (unit.velY > 0) {
      unit.direction = 'd'
    } else if (unit.velY < 0) {
      unit.direction = 'u'
    } else {
      unit.direction = 'd'
    }
  }

  /**
 * @param {Unit} unit - current entity unit

 */
  entitySelectImage (unit) {
    if (unit.active) {
      let lastImageID = unit.imageID
      let cycleImageHere = false
      let min = 0
      let max = 0

      switch (unit.kind) {
        case Enums.EK_MANAGER:
        case Enums.EK_ELLIOT:
        case Enums.EK_TREY:
        case Enums.EK_DARRYL:
        case Enums.EK_MAGGOT:
          this.selectImageCharacter(unit)
          break
        case Enums.EK_TARGET:
          cycleImageHere = true
          min = 0
          max = 5
          break
        default:
          // bugs
          cycleImageHere = true
          min = unit.kind * BUG_IMAGES_PER_ROW
          max = min + BUG_IMAGES_PER_ROW - 1
          if (!unit.leftOfPlayer) {
            min += IMAGES_IN_BUG_SPRITESHEET
            max += IMAGES_IN_BUG_SPRITESHEET
          }
      }

      if (cycleImageHere) {
        if (unit.imageID < max && unit.imageID >= min) {
          unit.imageID++
        } else if (unit.imageID < min) {
          unit.imageID = min
        } else {
          unit.imageID = min
        }
      }
    }
  }

  selectImageCharacter (unit) {
    let imageSet = 0
    if (unit.kind == EK_TARGET) {
      return
    }

    switch (unit.direction) {
      case 'u':
        imageSet = 0
        break
      case 'd':
        imageSet = 1
        break
      case 'l':
        imageSet = 2
        break
      case 'r':
        imageSet = 3
        break
      default:
        imageSet = 0
        break
    }
    if (unit.kind == Enums.EK_TARGET) {
      debugger
    }

    let min = imageSet * unit.imagesPerDirection
    let max = min + unit.imagesPerDirection - 1

    if (unit.imageID < max && unit.imageID >= min) {
      unit.imageID++
    } else {
      unit.imageID = min
    }
  }

  setSpawner (enabled) {
    Entity.spawner = enabled
  }

  entityTouchPlayer (unit) {
    return Utils.near(
      unit.worldX,
      unit.worldY,
      this.game.player.worldX,
      this.game.player.worldY,
      PLAYER_TOUCH_OFFSET_X,
      PLAYER_TOUCH_OFFSET_Y
    )
  }

  canSpawnEnemy () {
    let enemies = this.getAmountActiveEnemies()
    return enemies <= this.currentEnemiesLimit
  }

  update () {
    Entity.currentLevel = this.game.level
    this.game.brain.spawnerFlags.enabled = Entity.spawner
    let mpvalue = this.movePacer()
    let changeFrame = this.changeFramePacer()
    this.changeDirectionTick = this.changeDirectionWander()
    this.changeDirectionActive = this.changeDirectionPacer()
    if (Entity.spawner && this.spawnPacer()) {
      let enemies = this.getAmountActiveEnemies()
      if (enemies <= this.currentEnemiesLimit) {
        this.spawnUnit()
      }
    }
    let index = 0

    for (let unit of this.units) {
      if (unit instanceof Unit) {
        unit.index = index
        unit.alive = unit.life > 0
        unit.active = unit.level == this.game.level && unit.alive

        if (unit.active) {
          this.entityPlayerInteract(unit)
          if (mpvalue) {
            this.entityMotion(unit)
          }

          //this.setDirection(unit)
          changeFrame && this.entitySelectImage(unit)
          unit.leftOfPlayer = unit.worldX < this.game.player.worldX
          unit.worldX += unit.velX
          unit.worldY += unit.velY
        }
      }
      index++
    }
    this.playerPressedActivate = false
  }
}
