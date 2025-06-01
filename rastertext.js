import * as Utils from './utils.js'
import * as Assets from './assets.js'
const alphabet = 'abcdefghijklmnopqrstuvwxyz1234567890.:/ '
let revetment = {}
const LETTER_SIZE_BIG = 18
const LETTER_SIZE_SMALL = 10
const FAIL_INDEX = 39
const SPRITE_WIDTH = 18
const SPRITE_HEIGHT = 18

class Unit {
  constructor (screenX, screenY, content, kind = 0) {
    if (content == undefined) {
      content = ''
    }
    this.kind = kind
    this.screenX = screenX
    this.screenY = screenY
    this.active = true
    this.content = content.toLowerCase()
    this.indices = this.getIndices()
  }

  updateText (newString) {
    this.content = newString.toLowerCase()
    this.indices = this.getIndices()
  }
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
  //static letterSize = LETTER_SIZE
  constructor (game, kind = 0) {
    this.letterSize = LETTER_SIZE_BIG
    if (kind == 1) {
      this.letterSize = LETTER_SIZE_SMALL
    }
    this.kind = kind
    this.game = game
    this.onload = () => {}
    this.initImages()
    this.units = []
  }

  /**
   *
   * @param {string} newText text to replace old text in string
   * @param {number} unitNumber ID of unit in Rastertext component
   */
  updateUnitText (newText, unitNumber) {
    try {
      this.units[unitNumber].updateText(newText)
    } catch (error) {
      console.error(error)
    }
  }

  initImagesInternal () {
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

  initImages () {
    this.imagesBig = Assets.fontBig
    this.imagesSmall = Assets.fontSmall
    if (this.kind == 0) {
      this.images = this.imagesBig
    } else {
      this.images = this.imagesSmall
    }
  }

  /**
   *
   * @param {*} screenX screen position in pixels from left side
   * @param {*} screenY screen position in pixels down from top
   * @param {*} content string to display
   * @returns reference to the unit
   */
  addUnit (screenX, screenY, content) {
    let unit = new Unit(screenX, screenY, content, this.kind)
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
    let spriteWidth = 10
    if (unit.kind == 0) {
      spriteWidth = LETTER_SIZE_BIG
    } else if (unit.kind == 1) {
      spriteWidth = LETTER_SIZE_SMALL
    }
    let drawX = unit.screenX
    for (const index of unit.indices) {
      let currImage = this.images[index]
      //debugger
      if (currImage?.constructor.name == 'HTMLImageElement') {
        this.game.ctx.drawImage(
          this.images[index],
          drawX,
          unit.screenY,
          this.letterSize,
          this.letterSize
        )
      }

      drawX += this.letterSize
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
