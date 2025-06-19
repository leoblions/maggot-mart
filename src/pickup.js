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
const FRUIT_ADD_HEALTH_AMOUNT = 15

const FRUIT_KIND_MIN_INDEX = 0
const FRUIT_KIND_MAX_INDEX = 35

const BOX_KIND_MIN_INDEX = 36
const BOX_KIND_MAX_INDEX = 45

const SPRAY_KIND_MIN_INDEX = 46
const SPRAY_KIND_MAX_INDEX = 50

const KEY_KIND_MIN_INDEX = 52
const KEY_KIND_MAX_INDEX = 61

const RANDLOC_MAX = 3

class Unit {
  constructor (worldX, worldY, kind, imageID = -1) {
    this.kind = kind // 0 food, 1 box, 2 spray, 3 trap, 4 key
    this.worldX = worldX
    this.worldY = worldY
    this.active = true
    this.visible = true // false if off screen
    this.frame = 0
    this.level = 0
    this.image = null // reference to image object to use as sprite
    this.image = this.selectImage()
    this.velX = 0
    this.velY = 0
  }
  checkRange (range) {
    let dX = Math.abs(this.worldX - Pickup.sgame.player.worldX)
    let dY = Math.abs(this.worldY - Pickup.sgame.player.worldY)
    return dX < range && dY < range
  }
  selectImage () {
    let min = 0
    let max, index, image, collection
    debugger
    switch (this.kind) {
      case 0:
        //food
        collection = Pickup.imagesProduce
        break
      case 1:
        //box
        collection = Pickup.imagesBox
        break
      case 2:
        //spray
        collection = Pickup.imagesCan
        break
      case 3:
        //spray
        collection = Pickup.imagesTrap
        break
      case 4:
        //spray
        collection = Pickup.imagesKey
        break
      default:
        console.error('invalid kind ' + kind)
        return null
    }

    max = collection.length
    index = Utils.randRange(min, max)
    image = collection[index]
    return image
  }
}

export class Pickup {
  static sgame = null
  static {
    // static, so that Units may use these without reference to tilegrid instance
    this.images = null //don't use. assign images from other special arrays
    this.imagesTrap = null
    this.imagesBox = null
    this.imagesProduce = null
    this.imagesCan = null
    this.imagesKey = null
    this.imagesInitialized = false
  }
  constructor (game) {
    this.objectiveCategory = 0 // 0 box, 1 spray, 2 key, 3 trap
    this.addObjectiveItemEnabled = false
    this.currentObjectiveItem = 36
    this.spawnObjectiveItem = true
    this.sprays = 0
    this.boxes = 0
    this.game = game
    this.objective = false
    Pickup.sgame = game
    //images

    this.units = new Array(MAX_UNITS)
    this.randomPlacePacer = Utils.createMillisecondPacer(PICKUP_RATE)
    this.updateCullPacer = Utils.createMillisecondPacer(UPDATE_CULL_PERIOD)
    this.checkTouchPacer = Utils.createMillisecondPacer(CHECK_TOUCH_PERIOD)
    this.addObjectiveItemPacer = Utils.createMillisecondPacer(
      ADD_OBJECTIVE_ITEM_PERIOD
    )
    this.spawnData = null
    this.initPickupSpawnData()
    this.initImages()
  }

  async initPickupSpawnData () {
    //fetch returns a promise
    let response = await fetch('./data/location_target.json')

    this.spawndata = await response.json()
  }

  async getImagesFromURL (URL, cols, rows, width, height) {
    async function imageLoadPF (URL) {
      let imageLoadP = new Promise((resolve, reject) => {
        let sheet = new Image()
        sheet.src = URL
        sheet.onload = () => {
          console.error('load image good')
          resolve(sheet)
        }
        sheet.onerror = () => {
          console.error('load image failed')
          reject(sheet)
        }
      })
      let image = await imageLoadP
      return image
    }
    async function imageCutPF (image, cols, rows, width, height) {
      let imageCutP = new Promise((resolve, reject) => {
        Utils.cutSpriteSheetCallback(
          image,
          cols,
          rows,
          width,
          height,
          output => {
            if (output == undefined) {
              reject(output)
            } else {
              resolve(output)
            }

            console.log('pickup images loaded')
          }
        )
      })
      let imageArray = await imageCutP
      return imageArray
    }
    let sheet = await imageLoadPF(URL)
    let arr = await imageCutPF(sheet, cols, rows, width, height)
    return arr
  }

  objectiveItemActive () {
    let objItem = this.units[OBJECTIVE_ITEM_SLOT]
    if (
      objItem == null ||
      !(objItem instanceof Unit) ||
      objItem.active == false
    ) {
      return false
    } else {
      return true
    }
  }

  removeObjectiveItem () {
    this.units[OBJECTIVE_ITEM_SLOT] = null
  }

  async initImages () {
    Pickup.images = new Array(32)
    if (Pickup.imagesInitialized) {
      console.log('Images already initialized')
      return
    }

    Pickup.imagesProduce = await this.getImagesFromURL(
      '/images/produce.png',
      6,
      6,
      100,
      100
    )
    let boxesAndCans = await this.getImagesFromURL(
      '/images/boxescans.png',
      4,
      4,
      100,
      100
    )
    Pickup.imagesBox = boxesAndCans.slice(0, 9)
    Pickup.imagesCan = boxesAndCans.slice(10, 14)
    Pickup.imagesTrap = boxesAndCans.slice(15, 16)

    let keyImages = await this.getImagesFromURL(
      '/images/keys.png',
      4,
      4,
      100,
      100
    )
    Pickup.imagesKey = keyImages.slice(0, 9)

    Pickup.imagesInitialized = true
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

    let kind = 0

    let newUnit
    for (let i = RAND_ITEM_MIN_INDEX; i < MAX_UNITS; i++) {
      let unit = this.units[i]
      if (!(unit instanceof Unit) || !unit.active) {
        newUnit = new Unit(worldX, worldY, kind)
        newUnit.category = -1
        newUnit.level = this.game.level

        this.units[i] = newUnit
        return newUnit
      }
    }
    return null
  }

  deleteUnitsLevelTransition (destinationLevel) {
    //debugger
    let newUnits = []
    for (let i = 0; i < this.units.length; i++) {
      let unit = this.units[i]
      if (
        unit instanceof Unit &&
        unit.level == destinationLevel &&
        unit.active
      ) {
        newUnits.push(this.units[i])
      }
    }
    this.units = newUnits
  }

  removeUnitsLevelTransition (destinationLevel) {
    // keep nonobjective units that match next level
    // keep objective units
    let newUnits = []
    for (let i = 0; i < this.units.length; i++) {
      let unit = this.units[i]
      if (
        unit instanceof Unit &&
        unit.level == destinationLevel &&
        unit.active
      ) {
        newUnits.push(this.units[i])
      } else if (unit instanceof Unit && unit.objective) {
        newUnits.push(this.units[i])
      }
    }
    this.units = newUnits
  }

  addUnit (worldX, worldY, kind) {
    let newUnit
    for (let i = 0; i < MAX_UNITS; i++) {
      let unit = this.units[i]
      if (!(unit instanceof Unit) || !unit.active) {
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

  selectObjectiveItemKindFromCategory (category) {
    // old 0 box, 1 spray, 2 key, 3 trap
    // 0 food, 1 box, 2 spray, 3 trap, 4 key

    return category
  }

  getObjectiveItemLocation () {
    debugger
    let index = Utils.randRange(0, RANDLOC_MAX)

    for (let entry of this.spawndata) {
      if ((entry.stage = this.game.brain.stage)) {
        if (index >= entry.locations.length) {
          throw 'Matching stage in item spawn location data found, but index out of range'
        }
        return entry.locations[index]
      }
    }
    throw 'Matching stage in item spawn location data not found'
  }

  isObjectiveItemActive () {
    let currentObjItem = this.units[OBJECTIVE_ITEM_SLOT]
    if (
      currentObjItem == undefined ||
      (currentObjItem?.active ?? false) == false
    ) {
      if (currentObjItem?.objective ?? false) {
        return true
      }
    }

    return false
  }

  objectiveItemInCurrentLevel () {
    //debugger
    let currentObjItem = this.units[OBJECTIVE_ITEM_SLOT]
    if (
      !(currentObjItem == undefined) &&
      (currentObjItem?.level ?? -1) == this.game.level
    ) {
      return true
    }

    return false
  }

  objectiveItemExists () {
    //debugger
    let currentObjItem = this.units[OBJECTIVE_ITEM_SLOT]
    if (!(currentObjItem == undefined) && currentObjItem instanceof Unit) {
      return true
    }

    return false
  }

  getObjectiveItem () {
    //debugger
    let currentObjItem = this.units[OBJECTIVE_ITEM_SLOT]
    return currentObjItem
  }

  addObjectiveUnit (category = this.objectiveCategory) {
    category = Number(category)

    let newUnit = null

    let currentObjItem = this.units[OBJECTIVE_ITEM_SLOT]
    if (currentObjItem == undefined || currentObjItem?.active == false) {
      //debugger
      let kind = this.selectObjectiveItemKindFromCategory(category)
      // let [level, gridX, gridY] =
      //   this.selectObjectiveItemLocationFromCurrentCategory()

      // let level = 1
      // let gridX = 6
      // let gridY = 17
      let location = this.getObjectiveItemLocation()
      let level = location.l
      let gridX = location.x
      let gridY = location.y

      let worldX = gridX * this.game.tilegrid.tileSize
      let worldY = gridY * this.game.tilegrid.tileSize

      newUnit = this.units[OBJECTIVE_ITEM_SLOT] = new Unit(worldX, worldY, kind)
      newUnit.objective = true
      newUnit.category = this.objectiveCategory
      newUnit.level = level
    }

    return newUnit
  }

  /**
   *
   * @param {number} gridX grid location of objective unit left to right
   * @param {number} gridY grid location of objective unit top to bottom
   * @param {number} level which level to assign objective unit(location)
   * @param {number} category used to select a kind (kind!=category)
   * @returns reference to the unit
   */
  addObjectiveUnitXYLC (gridX, gridY, level, category = this.objectiveCategory) {
    category = Number(category)

    let newUnit = null

    let currentObjItem = this.units[OBJECTIVE_ITEM_SLOT]
    if (currentObjItem == undefined || currentObjItem?.active == false) {
      //debugger
      let kind = this.selectObjectiveItemKindFromCategory(category)

      let worldX = gridX * this.game.tilegrid.tileSize
      let worldY = gridY * this.game.tilegrid.tileSize

      newUnit = this.units[OBJECTIVE_ITEM_SLOT] = new Unit(worldX, worldY, kind)
      newUnit.objective = true
      newUnit.category = category
      newUnit.level = level
    }

    return newUnit
  }

  addUnitAtIndex (worldX, worldY, kind, index) {
    this.units[index] = new Unit(worldX, worldY, kind)
  }

  draw () {
    //this.game.ctx.drawImage(this.images[0], 0, 0, SPRITE_WIDTH, SPRITE_HEIGHT)
    for (let unit of this.units) {
      //console.log('draw unit')
      //debugger
      if (unit instanceof Unit && unit.active && unit.visible) {
        // debugger
        let screenX = unit.worldX - this.game.cameraX + SPRITE_OFFSET
        let screenY = unit.worldY - this.game.cameraY + SPRITE_OFFSET
        //let image = this.images[unit.kind]
        if (image == null) {
          return
        }
        this.game.ctx.drawImage(
          unit.image,
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
      this.game.brain.collectItemAction(unit.kind)
      this.game.brain.collectItemCategoryAction(unit.category)
      if (unit.kind >= BOX_KIND_MIN_INDEX && unit.kind <= BOX_KIND_MAX_INDEX) {
        this.boxes += 1
        console.log('Boxes ' + this.boxes)
      }
      if (
        unit.kind >= SPRAY_KIND_MIN_INDEX &&
        unit.kind <= SPRAY_KIND_MAX_INDEX
      ) {
        this.sprays += 1
      } else if (
        unit.kind >= FRUIT_KIND_MIN_INDEX &&
        unit.kind <= FRUIT_KIND_MAX_INDEX
      ) {
        this.game.player.addHealth(FRUIT_ADD_HEALTH_AMOUNT)
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

    for (let unit of this.units) {
      if (unit instanceof Unit && unit.active) {
        this.checkUnitHitEntity(unit)
        unit.worldX += unit.velX
        unit.worldY += unit.velY
        if (checkVisible) {
          unit.visible = unit.checkRange(CULL_DISTANCE)
          if (unit.level != this.game.level) {
            unit.visible = false
          } else {
            unit.visible = true
          }
        }
        if (checkTouched && unit.checkRange(TOUCH_PLAYER_RANGE)) {
          this.collectItemSpecialActions(unit)
          unit.active = false
          this.game.sound.playSoundByName('chime1')
          this.game.score += 1
        }
      }
    }
  }
}
