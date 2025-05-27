import * as Utils from './utils.js'

const MAX_UNITS = 10
const SPRITE_WIDTH = 50
const SPRITE_HEIGHT = 50
const SPRITE_OFFSET = 25

const PICKUP_RATE = 5000
const UPDATE_CULL_PERIOD = 1000

const AVOID_FLOOR_CELL_NEAR_PLAYER = false
const ENTITY_HIT_OFFSET = 50
const DAMAGE_DIST = 50
const MAX_KIND = 35
const CULL_DISTANCE = 500
const TOUCH_PLAYER_RANGE = 50
const CHECK_TOUCH_PERIOD = 100
const ADD_OBJECTIVE_ITEM_PERIOD = 1000
const OBJECTIVE_ITEM_SLOT = 0
const RAND_ITEM_MIN_INDEX = 1 //slot zero is reserved for objective items

const FRUIT_KIND_MIN_INDEX = 0
const FRUIT_KIND_MAX_INDEX = 35

const BOX_KIND_MIN_INDEX = 36
const BOX_KIND_MAX_INDEX = 45

const SPRAY_KIND_MIN_INDEX = 46
const SPRAY_KIND_MAX_INDEX = 50

const KEY_KIND_MIN_INDEX = 52
const KEY_KIND_MAX_INDEX = 61

const boxSpawnPoints = [
  [1, 2, 17],
  [1, 4, 17],
  [1, 6, 17],
  [1, 8, 17]
]
const keySpawnPoints = [
  [1, 2, 17],
  [1, 4, 17],
  [1, 6, 17],
  [1, 8, 17]
]
const trapSpawnPoints = [
  [1, 2, 17],
  [1, 4, 17],
  [1, 6, 17],
  [1, 8, 17]
]
const spraySpawnPoints = [
  [1, 2, 17],
  [1, 4, 17],
  [1, 6, 17],
  [1, 8, 17]
]

class Unit {
  constructor (worldX, worldY, kind) {
    this.kind = kind // 0 up / 1 down / 2 left / 3 right
    this.worldX = worldX
    this.worldY = worldY
    this.active = true
    this.visible = true // false if off screen
    this.frame = 0
    this.level = 0
    this.frameMin = 0
    this.frameMax = 0

    this.velX = 0
    this.velY = 0
  }
  checkRange (range) {
    let dX = Math.abs(this.worldX - Pickup.sgame.player.worldX)
    let dY = Math.abs(this.worldY - Pickup.sgame.player.worldY)
    return dX < range && dY < range
  }
}

export class Pickup {
  static sgame = null
  constructor (game) {
    this.objectiveCategory = 0 // 0 box, 1 spray, 2 key, 3 trap
    this.addObjectiveItemEnabled = false
    this.currentObjectiveItem = 36
    this.spawnObjectiveItem = true
    this.sprays = 0
    this.boxes = 0
    this.game = game
    Pickup.sgame = game
    this.images = null
    this.units = new Array(MAX_UNITS)
    this.randomPlacePacer = Utils.createMillisecondPacer(PICKUP_RATE)
    this.updateCullPacer = Utils.createMillisecondPacer(UPDATE_CULL_PERIOD)
    this.checkTouchPacer = Utils.createMillisecondPacer(CHECK_TOUCH_PERIOD)
    this.addObjectiveItemPacer = Utils.createMillisecondPacer(
      ADD_OBJECTIVE_ITEM_PERIOD
    )
    this.initImages()
  }

  async initImages0 () {
    let sheet = new Image()
    sheet.src = './images/produce.png'
    sheet.onload = () => {
      this.ready = true
      let images, imagesD, imagesL, imagesR
      //promises
      Utils.cutSpriteSheetCallback(sheet, 6, 6, 100, 100, output => {
        this.images = output

        console.log('pickup images loaded')
      })
    }
  }

  initImages () {
    this.images = new Array(32)
    let sheet = new Image()
    let len = 0
    sheet.src = '/images/produce.png'
    sheet = sheet
    let images1 = null
    sheet.onload = () => {
      // 0-35 fruit
      images1 = Utils.cutSpriteSheet(sheet, 6, 6, 100, 100)
      for (let i = 0; i < 0 + images1.length; i++) {
        this.images[i + 0] = images1[i]
      }
    }

    let sheet2 = new Image()
    let images2 = []
    sheet2.src = '/images/boxescans.png'

    sheet2.onload = () => {
      // 36 - 45 boxes
      // 46 - 50 spraycans
      // 51 mousetrap

      images2 = Utils.cutSpriteSheet(sheet2, 4, 4, 100, 100)
      for (let i = 0; i < images2.length; i++) {
        images2[i].solid = true

        this.images[i + BOX_KIND_MIN_INDEX] = images2[i]
      }
    }

    let sheet3 = new Image()
    let images3 = []
    sheet3.src = '/images/keys.png'

    sheet3.onload = () => {
      // 52 - 61 boxes

      images3 = Utils.cutSpriteSheet(sheet3, 4, 4, 100, 100)
      for (let i = 0; i < images3.length; i++) {
        images3[i].solid = true

        this.images[i + KEY_KIND_MIN_INDEX] = images3[i]
      }
    }
  }

  updateDisplayUnits () {
    this.displayUnits = []
    for (const unit of this.units) {
      if (unit?.constructor.name == 'Unit' && unit.active && unit.isInRange()) {
        this.displayUnits.append(unit)
      }
    }
  }

  checkPlayerTouchedDisplayUnits () {
    this.displayUnits = []
    for (const unit of this.units) {
      if (unit?.constructor.name == 'Unit' && unit.active && unit.isInRange()) {
        this.displayUnits.append(unit)
      }
    }
  }

  getRandomFloorCell () {
    let foundFloor = false
    while (!foundFloor) {
      let tileX =
        Math.trunc(Math.random() * (this.game.tilegrid.tilesX - 2)) + 1
      let tileY =
        Math.trunc(Math.random() * (this.game.tilegrid.tilesY - 2)) + 1
      if (!this.game.tilegrid.tileSolid(tileX, tileY)) {
        let worldX = tileX * this.game.tileSize
        let worldY = tileY * this.game.tileSize
        if (AVOID_FLOOR_CELL_NEAR_PLAYER) {
          if (
            Math.abs(worldX - this.game.player.worldX) > CULL_DISTANCE &&
            Math.abs(worldY - this.game.player.worldY) > CULL_DISTANCE
          ) {
            foundFloor = true
            return [worldX, worldY]
          }
        } else {
          foundFloor = true
          return [worldX, worldY]
        }
      }
    }
    return null
  }

  addRandomUnit () {
    let [worldX, worldY] = this.getRandomFloorCell()

    let kind = Math.trunc(Math.random() * MAX_KIND)
    if (kind >= 36 && kind <= 45) {
      // dont add boxes as random items
      kind = 35
    }
    let newUnit
    for (let i = RAND_ITEM_MIN_INDEX; i < MAX_UNITS; i++) {
      let element = this.units[i]
      if (!(element instanceof Unit) || !element.active) {
        newUnit = new Unit(worldX, worldY, kind)
        newUnit.level = this.game.level

        this.units[i] = newUnit
        return newUnit
      }
    }
    return null
  }

  removeUnitsLevelTransition (destinationLevel) {
    //debugger
    let newUnits = []
    for (let i = 0; i < this.units.length; i++) {
      let element = this.units[i]
      if (
        element instanceof Unit &&
        element.level == destinationLevel &&
        element.active
      ) {
        newUnits.push(this.units[i])
      }
    }
    this.units = newUnits
  }

  addUnit (worldX, worldY, kind) {
    let newUnit
    for (let i = 0; i < MAX_UNITS; i++) {
      let element = this.units[i]
      if (!(element instanceof Unit) || !element.active) {
        newUnit = new Unit(worldX, worldY, kind)
        this.units[i] = newUnit
        return newUnit
      }
    }
    return null
  }

  /**
   * Given an item category from the class, select an item kind
   * 0 box, 1 spray, 2 key, 3 trap
   * @return{number} - item kind
   */
  selectObjectiveItemKindFromCurrentCategory () {
    // 0 box, 1 spray, 2 key, 3 trap
    let kind = 0
    switch (this.objectiveCategory) {
      case 0:
        kind = Utils.randRange(BOX_KIND_MIN_INDEX, BOX_KIND_MAX_INDEX)
        break
      case 1:
        kind = Utils.randRange(SPRAY_KIND_MIN_INDEX, SPRAY_KIND_MAX_INDEX)
        break
      case 2:
        kind = Utils.randRange(KEY_KIND_MIN_INDEX, KEY_KIND_MAX_INDEX)
        break
      case 3:
        kind = 51
        break
    }
    return kind
  }

  selectObjectiveItemLocationFromCurrentCategory () {
    // 0 box, 1 spray, 2 key, 3 trap
    let gridLocation = null
    let locationCollection = null
    //debugger
    switch (this.objectiveCategory) {
      case 0:
        locationCollection = boxSpawnPoints
        break
      case 1:
        locationCollection = spraySpawnPoints
        break
      case 2:
        locationCollection = keySpawnPoints
        break
      case 3:
        locationCollection = trapSpawnPoints
        break
      default:
        return null
    }
    let max = locationCollection.length - 1
    let index = Utils.randRange(0, max)
    return locationCollection[index]
  }

  addObjectiveUnit () {
    let newUnit = null

    let currentObjItem = this.units[OBJECTIVE_ITEM_SLOT]
    if (currentObjItem == undefined || currentObjItem?.active == false) {
      //debugger
      let kind = this.selectObjectiveItemKindFromCurrentCategory()
      let [level, gridX, gridY] =
        this.selectObjectiveItemLocationFromCurrentCategory()

      let worldX = gridX * this.game.tilegrid.tileSize
      let worldY = gridY * this.game.tilegrid.tileSize

      newUnit = this.units[OBJECTIVE_ITEM_SLOT] = new Unit(worldX, worldY, kind)
      newUnit.level = level
    }

    return newUnit
  }

  addUnitAtIndex (worldX, worldY, kind, index) {
    this.units[index] = new Unit(worldX, worldY, kind)
  }

  draw () {
    //this.game.ctx.drawImage(this.images[0], 0, 0, SPRITE_WIDTH, SPRITE_HEIGHT)
    for (let element of this.units) {
      //console.log('draw unit')
      //debugger
      if (element instanceof Unit && element.active && element.visible) {
        // debugger
        let screenX = element.worldX - this.game.cameraX + SPRITE_OFFSET
        let screenY = element.worldY - this.game.cameraY + SPRITE_OFFSET
        let image = this.images[element.kind]
        if (image == null) {
          return
        }
        this.game.ctx.drawImage(
          image,
          screenX,
          screenY,
          SPRITE_WIDTH,
          SPRITE_HEIGHT
        )
      }
    }
  }

  checkUnitHitEntity (unit) {
    for (const entity of this.game.entity.units) {
      //debugger
      if (entity?.constructor.name == 'Unit' && entity.active) {
        let entX = ENTITY_HIT_OFFSET + entity.worldX
        let entY = ENTITY_HIT_OFFSET + entity.worldY
        let dX = Math.abs(entX - unit.worldX)
        let dY = Math.abs(entY - unit.worldY)
        if (dX < DAMAGE_DIST && dY < DAMAGE_DIST) {
          entity.takeDamage()
        }
      }
    }
  }

  collectItemSpecialActions (unit) {
    if (unit.active) {
      if (unit.kind >= BOX_KIND_MIN_INDEX && unit.kind <= BOX_KIND_MAX_INDEX) {
        this.boxes += 1
        console.log('Boxes ' + this.boxes)
      }
      if (
        unit.sprays >= SPRAY_KIND_MIN_INDEX &&
        unit.kind <= SPRAY_KIND_MAX_INDEX
      ) {
        this.sprays += 1
      }
    }
  }

  update () {
    let checkVisible = this.updateCullPacer()
    let checkTouched = this.checkTouchPacer()
    this.randomPlacePacer() && this.addRandomUnit()
    if (this.addObjectiveItemEnabled && this.addObjectiveItemPacer()) {
      this.addObjectiveUnit()
    }

    for (let element of this.units) {
      if (element instanceof Unit && element.active) {
        this.checkUnitHitEntity(element)
        element.worldX += element.velX
        element.worldY += element.velY
        if (checkVisible) {
          element.visible = element.checkRange(CULL_DISTANCE)
        }
        if (checkTouched && element.checkRange(TOUCH_PLAYER_RANGE)) {
          this.collectItemSpecialActions(element)
          element.active = false
          this.game.sound.playSoundByName('chime1')
          this.game.score += 1
        }
      }
    }
  }
}
