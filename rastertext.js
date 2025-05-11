import * as Utils from './utils.js'
const alphabet = 'abcdefghijklmnopqrstuvwxyz1234567890.:/ '
let revetment = {}
const LETTER_SIZE = 18
const FAIL_INDEX = 39
const SPRITE_WIDTH = 18
const SPRITE_HEIGHT = 18

class Unit {
  constructor (screenX, screenY, content) {
    this.screenX = screenX
    this.screenY = screenY
    this.active = true
    this.content = content.toLowerCase()
    this.indices = this.getIndices()
  }

  updateText (newString) {}
  getIndices () {
    let indices = []
    for (const letter of this.content) {
      let index = alphabet.indexOf(letter) ?? FAIL_INDEX
      indices.push(index)
    }
    return indices
  }
}

export class Rastertext {
  static letterSize = LETTER_SIZE
  constructor (game) {
    this.game = game
    this.initImages()
    this.units = []
  }
  initImages () {
    let sheet = new Image()
    sheet.src = './images/font50horOL.png'
    sheet.onload = () => {
      this.ready = true
      let font1 = Utils.cutSpriteSheet(sheet, 40, 1, 50, 50)
      //let imagesR = Utils.applyFunctionToImageArray(imagesL, Utils.flipImageH)
      this.images = font1
      console.log('font images loaded')
    }
  }

  addUnit (screenX, screenY, content) {
    let unit = new Unit(screenX, screenY, content)
    this.units.push(unit)
    return unit
  }

  drawUnit (unit) {
    let drawX = unit.screenX
    for (const index of unit.indices) {
      let currImage = this.images[index]
      //debugger
      if (currImage?.constructor.name == 'HTMLImageElement') {
        this.game.ctx.drawImage(
          this.images[index],
          drawX,
          unit.screenY,
          SPRITE_WIDTH,
          SPRITE_HEIGHT
        )
      }

      drawX += SPRITE_WIDTH
    }
  }

  draw () {
    if (this.images === undefined) {
      return
    }
    for (const unit of this.units) {
      if (unit != null && unit instanceof Unit) {
        this.drawUnit(unit)
      }
    }
  }

  update () {
    for (const unit of this.units) {
      if (unit != null && unit instanceof Unit) {
      }
    }
  }
}
