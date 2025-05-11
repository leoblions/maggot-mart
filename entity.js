import * as Utils from './utils.js'

const MAX_UNITS = 10
const SPRITE_WIDTH = 100
const SPRITE_HEIGHT = 100
const UNIT_LIFE = 120
const SPAWN_RATE = 1000
const FRAME_DURATION_MS = 300
const ENTITY_SPEED = 2
const CHANGE_DIRECTION_PERIOD = 40
const PF_SPRITE_OFFSET_X = -50
const PF_SPRITE_OFFSET_Y = -50
const FRAMES_PER_KIND = 4
const DAMAGE_TO_PLAYER = 4
const PLAYER_TOUCH_OFFSET_X = 50
const PLAYER_TOUCH_OFFSET_Y = 50

class Unit {
  /**
   * @param {number} worldX - world position x in pixels
   * @param {number} worldY - world position y in pixels
   * @param {number} kind - kind of entity
   */
  constructor (worldX, worldY, kind) {
    this.kind = kind // 0 up / 1 down / 2 left / 3 right
    this.worldX = worldX
    this.worldY = worldY
    this.active = true
    this.speed = Entity.speed
    this.imageID = 0
    this.frameMin = 0
    this.frameMax = 0
    this.leftOfPlayer = true
    this.life = UNIT_LIFE
    this.velX = 0
    this.velY = 0
    this.damageToPlayer = DAMAGE_TO_PLAYER
    this.setFrameMinAndmax()
  }
  setFrameMinAndmax () {
    this.frameMin = FRAMES_PER_KIND * this.kind
    this.frameMax = FRAMES_PER_KIND * this.kind + FRAMES_PER_KIND - 1
  }

  takeDamage (damageAmount = 10) {
    let newLife = this.life - damageAmount
    if (newLife > 0) {
      this.life = newLife
    } else {
      this.life = 0
      this.active = false
    }
  }
}

export class Entity {
  static speed = ENTITY_SPEED
  static animateSpeed = 60

  constructor (game) {
    this.ready = false
    this.game = game
    this.worldXMax = this.game.tileSize * this.game.tilegrid.tilesX
    this.worldYMax = this.game.tileSize * this.game.tilegrid.tilesY
    this.imageSets = null
    this.units = new Array(MAX_UNITS)
    this.spawnPacer = Utils.createMillisecondPacer(SPAWN_RATE)
    this.changeDirectionPacer = Utils.createTickPacer(CHANGE_DIRECTION_PERIOD)
    this.changeFramePacer = Utils.createMillisecondPacer(FRAME_DURATION_MS)
    this.initImages()
  }

  initImages () {
    let sheet = new Image()
    sheet.src = './images/bugsheet0.png'
    sheet.onload = () => {
      Utils.cutSpriteSheetCallback(sheet, 4, 4, 150, 150, output => {
        //debugger
        this.imagesL = output
        this.imagesR = Utils.applyFunctionToImageArray(output, Utils.flipImageH)

        //this.images = this.imagesL.concat(this.imagesR)
      })
      // this.imagesR = Utils.applyFunctionToImageArray(
      //   this.imagesL,
      //   Utils.flipImageH
      // )

      console.log('enemy images loaded')
      this.ready = true
    }
  }

  addUnit (worldX, worldY, kind) {
    for (let i = 0; i < MAX_UNITS; i++) {
      let element = this.units[i]
      if (!(element instanceof Unit) || !element.active) {
        if (this.spawnPacer()) {
          this.units[i] = new Unit(worldX, worldY, kind)
          console.log('add unit to ' + i)
        }
      }
    }
  }

  draw () {
    for (let element of this.units) {
      if (element instanceof Unit && element.active) {
        let screenX = element.worldX - this.game.cameraX
        let screenY = element.worldY - this.game.cameraY
        // choose left or right images
        let imageArray = element.leftOfPlayer ? this.imagesL : this.imagesR
        let currImage = imageArray[element.imageID]
        //debugger
        if (true) {
          this.game.ctx.drawImage(
            currImage,
            screenX,
            screenY,
            SPRITE_WIDTH,
            SPRITE_HEIGHT
          )
        }
      }
    }
  }

  setVelocityB (unit) {
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
          unit.velY = -Entity.speed
          break
        case 'D':
          unit.velY = Entity.speed
          break
        case 'L':
          unit.velX = -Entity.speed
          break
        case 'R':
          unit.velX = Entity.speed
          break
        default:
      }
    }
  }

  setVelocity (unit) {
    let pathfindX = unit.worldX - PF_SPRITE_OFFSET_X
    let pathfindY = unit.worldY - PF_SPRITE_OFFSET_Y

    // if (this.game.pathfind.entityMatchesPlayerSquare(pathfindX, pathfindY)) {

    //   return
    // }

    if (this.entityTouchPlayer(unit)) {
      unit.velY = 0
      unit.velX = 0
      this.game.player.playerHitByEnemy(unit)
    }

    let gridvalues = this.game.pathfind.entitySteeringMatrix(
      pathfindX,
      pathfindY
    )
    //up down left right center
    if (this.changeDirectionPacer()) {
      unit.velX = 0
      unit.velY = 0

      let maxValue = 0
      let maxIndex = -1

      for (let i = 0; i < 5; i++) {
        if (gridvalues[i] > maxValue) {
          maxIndex = i
          maxValue = gridvalues[i]
        }
      }

      switch (maxIndex) {
        case -1:
          unit.velX = 0
          unit.velY = 0
          break
        case 0: //up
          unit.velX = 0
          unit.velY = -Entity.speed
          break
        case 1: //down
          unit.velX = 0
          unit.velY = Entity.speed
          break
        case 2: //left
          unit.velX = -Entity.speed
          unit.velY = 0
          break
        case 3: //down
          unit.velX = Entity.speed
          unit.velY = 0
          break
        case 4: //center
          unit.velX = 0
          unit.velY = 0
          break
        default:
          unit.velX = 0
          unit.velY = 0
      }
    }
  }

  /**
 * @param {Unit} unit - current entity unit

 */
  unitAdvanceFrame (unit) {
    if (unit.active) {
      unit.imageID =
        unit.imageID < unit.frameMax ? unit.imageID + 1 : unit.frameMin
    }
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

  update () {
    let changeFrame = this.changeFramePacer()
    for (let unit of this.units) {
      if (unit instanceof Unit && unit.active) {
        this.setVelocity(unit)
        changeFrame && this.unitAdvanceFrame(unit)
        unit.leftOfPlayer = unit.worldX < this.game.player.worldX
        unit.worldX += unit.velX
        unit.worldY += unit.velY
      }
    }
  }
}
