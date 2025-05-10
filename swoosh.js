import * as Utils from './utils.js'

const MAX_UNITS = 10
const SPRITE_WIDTH = 100
const SPRITE_HEIGHT = 100
const UNIT_LIFE = 120
const SWOOSH_RATE_MS = 800
const SWOOSH_SPEED = 2
const CHANGE_IMAGE_EVERY = 5

class Unit {
  constructor (worldX, worldY, kind) {
    this.kind = kind // 0 up / 1 down / 2 left / 3 right
    this.worldX = worldX
    this.worldY = worldY
    this.active = true
    this.imageID = 0
    this.frame = 0
    this.life = UNIT_LIFE
    this.velX = 0
    this.velY = 0
    switch (this.kind) {
      case 0:
        this.velY = -Swoosh.speed
        break
      case 1:
        this.velY = Swoosh.speed
        this.imageID += 8
        break
      case 2:
        this.velX = -Swoosh.speed
        this.imageID += 16
        break
      case 3:
        this.velX = Swoosh.speed
        this.imageID += 24
        break
    }
  }
}

export class Swoosh {
  static speed = SWOOSH_SPEED
  static animateSpeed = 60
  constructor (game) {
    this.game = game
    this.images = null
    this.units = new Array(MAX_UNITS)
    this.swooshPacer = Utils.createMillisecondPacer(SWOOSH_RATE_MS)
    this.initImages()
  }

  async initImages () {
    let sheet = new Image()
    sheet.src = './images/swoosh1m.png'
    sheet.onload = () => {
      this.ready = true
      let imagesU, imagesD, imagesL, imagesR
      //promises
      Utils.cutSpriteSheetCallback(sheet, 8, 1, 100, 100,(output)=>{
        imagesU=output
        imagesD = Utils.rotateImageArray(imagesU, 180)
        imagesL = Utils.rotateImageArray(imagesU, 270)
        imagesR = Utils.rotateImageArray(imagesU, 90)
        this.images = imagesU.concat(imagesD, imagesL, imagesR)
      console.log('swoosh images loaded')
      })
      

      
    }
  }

  initImages0 () {
    let sheet = new Image()
    sheet.src = './images/swoosh1m.png'
    sheet.onload = () => {
      this.ready = true
      //up
      let imagesOrig = Utils.cutSpriteSheet(sheet, 8, 1, 100, 100)
      //down
      let imagesD = Utils.rotateImageArray(imagesOrig, 180)
      let imagesL = Utils.rotateImageArray(imagesOrig, 270)
      let imagesR = Utils.rotateImageArray(imagesOrig, 90)
      this.images = imagesOrig.concat(imagesD, imagesL, imagesR)
      console.log('swoosh images loaded')
    }
  }

  addUnit (worldX, worldY, kind) {
    for (let i = 0; i < MAX_UNITS; i++) {
      let element = this.units[i]
      if (!(element instanceof Unit) || !element.active) {
        if (this.swooshPacer()) {
          this.units[i] = new Unit(worldX, worldY, kind)
          console.log('added unit')
          break
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
        let image = this.images[element.imageID + element.frame]
        if (image==null){
          return
        }
        this.game.ctx.drawImage(
          this.images[element.imageID + element.frame],
          screenX,
          screenY,
          SPRITE_WIDTH,
          SPRITE_HEIGHT
        )
      }
    }
  }

  update () {
    for (let element of this.units) {
      if (element instanceof Unit && element.active) {
        element.worldX += element.velX
        element.worldY += element.velY
        if (element.life > 0) {
          element.life -= 1
        } else {
          element.active = false
        }
        if (element.life % CHANGE_IMAGE_EVERY == 0) {
          if (element.frame < 7) {
            element.frame += 1
          } else {
            element.frame = 0
          }
        }
      }
    }
  }
}
