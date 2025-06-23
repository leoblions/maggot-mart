import * as Utils from './utils.js'
import * as Assets from './assets.js'

const MAX_UNITS = 10
const SPRITE_WIDTH = 100
const SPRITE_HEIGHT = 100
const UNIT_LIFE = 120
const PROJECTILE_RATE_MS = 800
const PROJECTILE_SPEED = 2
const CHANGE_IMAGE_EVERY = 5
const ENTITY_HIT_OFFSET = 50
const DAMAGE_DIST = 50
const ENTITY_SPLAT_KIND = 4
const HITBOX_OFFSET = 25
const REMOVE_PROJ_ON_HIT_ENEMY = true

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
        this.velY = -Projectile.speed
        break
      case 1:
        this.velY = Projectile.speed
        this.imageID += 8
        break
      case 2:
        this.velX = -Projectile.speed
        this.imageID += 16
        break
      case 3:
        this.velX = Projectile.speed
        this.imageID += 24
        break
    }
  }
}

export class Projectile {
  static sprayImages
  static fireImages
  static imagesLoaded = false
  static speed = PROJECTILE_SPEED
  static animateSpeed = 60
  constructor (game) {
    this.game = game
    this.images = null
    this.units = new Array(MAX_UNITS)
    this.projectilePacer = Utils.createMillisecondPacer(PROJECTILE_RATE_MS)
    this.initImages()
  }

  initImages () {
    // if (Projectile.imagesLoaded == true) {
    //   return
    // }
    // let sheet = new Image()

    // sheet.src = './images/projectile1m.png'
    // sheet.onload = () => {
    //   this.ready = true
    //   let imagesU, imagesD, imagesL, imagesR
    //   //promises
    //   Utils.cutSpriteSheetCallback(sheet, 8, 1, 100, 100, output => {
    //     imagesU = output
    //     //debugger
    //     imagesD = Utils.rotateImageArray(imagesU, 180)
    //     imagesL = Utils.rotateImageArray(imagesU, 270)
    //     imagesR = Utils.rotateImageArray(imagesU, 90)
    //     this.images = imagesU.concat(imagesD, imagesL, imagesR)
    //     Projectile.imagesLoaded = true
    //     console.log('projectile images loaded')
    //   })
    // }

    this.sprayImages = Assets.sprayImg
    this.flameImages = Assets.flameImg
    this.images = Assets.sprayImg
    Projectile.imagesLoaded = true
  }

  addUnit (worldX, worldY, kind) {
    for (let i = 0; i < MAX_UNITS; i++) {
      let element = this.units[i]
      if (!(element instanceof Unit) || !element.active) {
        if (this.projectilePacer()) {
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
        //debugger
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
        let entX = ENTITY_HIT_OFFSET + entity.worldX - HITBOX_OFFSET
        let entY = ENTITY_HIT_OFFSET + entity.worldY - HITBOX_OFFSET
        let dX = Math.abs(entX - unit.worldX)
        let dY = Math.abs(entY - unit.worldY)
        if (dX < DAMAGE_DIST && dY < DAMAGE_DIST) {
          entity.takeDamage()
          if (REMOVE_PROJ_ON_HIT_ENEMY) {
            unit.active = false
          }
          //debugger
          let splat = this.game.splat.addUnit(
            entity.worldX,
            entity.worldY,
            ENTITY_SPLAT_KIND
          )
          //splat.velX = unit.velX
          //splat.velY = unit.velY
          //entity.active = false
          break
        }
      }
    }
  }

  update () {
    if (!Projectile.imagesLoaded) {
      //this.initImages()
      return
    }
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
