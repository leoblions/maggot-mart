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
      this.label1 = this.createLabel('THIS IS A TEST')
    }
  }

  addUnit (screenX, screenY, content) {
    let unit = new Unit(screenX, screenY, content)
    this.units.push(unit)
    return unit
  }

  createLabel (text) {
    //create blank image

    text = text.toLowerCase()

    const canvas = document.createElement('canvas')
    canvas.id = Utils.getUnusedHTMLElementID()
    canvas.width = (SPRITE_WIDTH * text.length) | 1
    canvas.height = SPRITE_HEIGHT
    let ctx = canvas.getContext('2d')
    //convert letters to offset indices
    let indices = []
    for (const letter of text) {
      let index = alphabet.indexOf(letter) ?? FAIL_INDEX
      indices.push(index)
    }
    //draw subimages to new image
    let drawX = 0
    for (const index of indices) {
      let currImage = this.images[index]
      //debugger
      if (currImage?.constructor.name == 'HTMLImageElement') {
        ctx.drawImage(this.images[index], drawX, 0, SPRITE_WIDTH, SPRITE_HEIGHT)
      }

      drawX += SPRITE_WIDTH
    }

    document.body.appendChild(canvas)

    let newimage = Utils.canvasToImage(canvas)

    document.body.removeChild(canvas)
    return newimage
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
    //debugger
    //this.game.ctx.drawImage(this.label1, 100, 100, 200, 15)
  }

  update () {
    for (const unit of this.units) {
      if (unit != null && unit instanceof Unit) {
      }
    }
  }
}
