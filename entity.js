import * as Utils from './utils.js'

const MAX_UNITS = 10
const SPRITE_WIDTH = 100
const SPRITE_HEIGHT = 100
const UNIT_LIFE = 120
const SPAWN_RATE = 1000
const ENTITY_SPEED = 2
const CHANGE_DIRECTION_PERIOD = 40
const PF_SPRITE_OFFSET_X = -50
const PF_SPRITE_OFFSET_Y = -50

class Unit {
  constructor (worldX, worldY, kind) {
    this.kind = kind // 0 up / 1 down / 2 left / 3 right
    this.worldX = worldX
    this.worldY = worldY
    this.active = true
    this.speed = Entity.speed
    this.imageID = 0
    this.life = UNIT_LIFE
    this.velX = 0
    this.velY = 0
  }
}

export class Entity {
  static speed = ENTITY_SPEED
  static animateSpeed = 60
  constructor (game) {
    this.game = game
    this.worldXMax = this.game.tileSize * this.game.tilegrid.tilesX
    this.worldYMax = this.game.tileSize * this.game.tilegrid.tilesY
    this.imageSets = null
    this.units = new Array(MAX_UNITS)
    this.spawnPacer = Utils.createMillisecondPacer(SPAWN_RATE)
    this.changeDirectionPacer = Utils.createTickPacer(CHANGE_DIRECTION_PERIOD)
    this.initImages()
  }

  initImages () {
    let sheet = new Image()
    sheet.src = './images/bugsheet0.png'
    sheet.onload = () => {
      this.ready = true
      let imagesL = Utils.cutSpriteSheet(sheet, 4, 4, 150, 150)
      let imagesR = Utils.applyFunctionToImageArray(imagesL, Utils.flipImageH)
      this.images = imagesL.concat(imagesR)
      console.log('enemy images loaded')
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
    //this.game.ctx.drawImage(this.images[0], 0, 0, SPRITE_WIDTH, SPRITE_HEIGHT)
    for (let element of this.units) {
      //console.log('draw unit')
      //debugger
      if (element instanceof Unit && element.active) {
        let screenX = element.worldX - this.game.cameraX
        let screenY = element.worldY - this.game.cameraY
        this.game.ctx.drawImage(
          this.images[element.imageID],
          screenX,
          screenY,
          SPRITE_WIDTH,
          SPRITE_HEIGHT
        )
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
    //unit.velX = 0
    //unit.velY = 0
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

    if (this.game.pathfind.entityMatchesPlayerSquare(pathfindX, pathfindY)) {
      unit.velY = 0
      unit.velX = 0
      console.log('entity match player')
      return
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

      //up and down
      // if(gridvalues[0]>gridvalues[1]){
      //   unit.velY = -Entity.speed
      // }else if(gridvalues[1]>gridvalues[0]){
      //   unit.velY = Entity.speed
      // }
      // //left and right
      // if(gridvalues[2]>gridvalues[3]){
      //   unit.velX = -Entity.speed
      // }else if(gridvalues[3]>gridvalues[2]){
      //   unit.velX = Entity.speed
      // }

      // if (directions[0]&&!directions[1]){
      //   unit.velY = -Entity.speed
      // }else if(directions[1]&&!directions[0]){
      //   unit.velY = Entity.speed
      // }else if (directions[2]&&!directions[3]){
      //   unit.velX = -Entity.speed
      // }else if(directions[3]&&!directions[2]){
      //   unit.velX = Entity.speed
      // }
    }
  }

  update () {
    for (let element of this.units) {
      if (element instanceof Unit && element.active) {
        this.setVelocity(element)
        element.worldX += element.velX
        element.worldY += element.velY
      }
    }
  }
}
