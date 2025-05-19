import * as Utils from './utils.js'

const MAX_UNITS = 10
const SPRITE_WIDTH = 100
const SPRITE_HEIGHT = 100
const UNIT_LIFE = 120
const SPLAT_RATE_MS = 800
const SPLAT_SPEED = 2
const CHANGE_IMAGE_EVERY = 5
const ENTITY_HIT_OFFSET = 50
const DAMAGE_DIST = 50

class Unit {
  constructor (worldX, worldY, kind) {
    this.kind = kind // 0 up / 1 down / 2 left / 3 right
    this.worldX = worldX
    this.worldY = worldY
    this.active = true
    //this.imageID = 0
    this.frame = 0
    this.frameMin = 0
    this.frameMax = 0
    this.life = UNIT_LIFE
    this.velX = 0
    this.velY = 0
    switch (this.kind) {
      case 0:
        //red blood
        this.frame = this.frameMin = 0
        this.frameMax = 11
        break
      case 1:
        //green splat
        this.frame = this.frameMin = 12
        this.frameMax = 28
        break
      case 2:
        //yellow splat
        this.frame = this.frameMin = 30
        this.frameMax = 34
        break
      case 3:
        //single red puddle
        this.frame = this.frameMin = 29
        this.frameMax = 29
        break
      case 4:
        //random static green puddle
        this.frameMin = 12
        this.frameMax = 28
        //select a random green splat that stays the same
        this.frame = Math.trunc(Math.random() * 15) + 12

        break
      case 5:
        //random static red puddle
        this.frameMin = 0
        this.frameMax = 11
        //select a random red splat that stays the same
        this.frame = Math.trunc(Math.random() * 10)

        break
    }
  }
  updateFrame () {
    if (this.kind < 4 && this.life % CHANGE_IMAGE_EVERY == 0) {
      if (this.frame < this.frameMax) {
        this.frame += 1
      } else {
        this.frame = this.frameMin
      }
    }
  }
}

export class Splat {
  static speed = SPLAT_SPEED
  static animateSpeed = 60
  constructor (game) {
    this.game = game
    this.images = null
    this.units = new Array(MAX_UNITS)
    this.swooshPacer = Utils.createMillisecondPacer(SPLAT_RATE_MS)
    this.initImages()
  }

  async initImages () {
    let sheet = new Image()
    sheet.src = './images/splatsheet.png'
    sheet.onload = () => {
      this.ready = true
      let images, imagesD, imagesL, imagesR
      //promises
      Utils.cutSpriteSheetCallback(sheet, 6, 6, 100, 100, output => {
        this.images = output

        console.log('splat images loaded')
      })
    }
  }

  addUnit (worldX, worldY, kind) {
    let newUnit
    for (let i = 0; i < MAX_UNITS; i++) {
      let element = this.units[i]
      if (!(element instanceof Unit) || !element.active) {
        if (this.swooshPacer()) {
          newUnit = new Unit(worldX, worldY, kind)
          this.units[i] = newUnit
          console.log('added splat')
          break
        }
      }
    }
    return newUnit
  }

  draw () {
    //this.game.ctx.drawImage(this.images[0], 0, 0, SPRITE_WIDTH, SPRITE_HEIGHT)
    for (let element of this.units) {
      //console.log('draw unit')
      //debugger
      if (element instanceof Unit && element.active) {
        // debugger
        let screenX = element.worldX - this.game.cameraX
        let screenY = element.worldY - this.game.cameraY
        let image = this.images[element.frame]
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

  update () {
    for (let element of this.units) {
      if (element instanceof Unit && element.active) {
        this.checkUnitHitEntity(element)
        element.worldX += element.velX
        element.worldY += element.velY
        if (element.life > 0) {
          element.life -= 1
        } else {
          element.active = false
        }
        element.updateFrame()
      }
    }
  }
}
