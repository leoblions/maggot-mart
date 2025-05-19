import * as Utils from './utils.js'

const MAX_UNITS = 10
const SPRITE_WIDTH = 200
const SPRITE_HEIGHT = 50
const UNIT_LIFE = 120
const BUTTON_CLICK_DEBOUNCE_PERIOD = 1100
const SPLAT_SPEED = 2
const CHANGE_IMAGE_EVERY = 5
const ENTITY_HIT_OFFSET = 50
const DAMAGE_DIST = 50

const ROWS = 6

class Control {
  constructor (screenX, screenY, kind) {
    this.kind = kind // 0 static image, 1 button
    this.screenX = screenX
    this.screenY = screenY
    this.width = 300
    this.height = 50
    this.frame = 0
    this.active = true
    this.textString = ''
  }
}

export class Menu {
  constructor (game) {
    this.game = game
    this.active = true
    this.controlW = Math.floor(this.game.board.width / 4)
    this.controlH = Math.floor(this.game.board.height / 12)
    this.startX = Math.floor(this.game.board.width / 2 - this.controlW / 2)
    this.cornerY = []
    this.startY = this.controlH * 3
    this.spacingY = this.controlH
    this.images = null
    this.controls = new Array(MAX_UNITS)
    this.mainControlls = []
    this.optionControls = []
    this.toggelPacer = Utils.createMillisecondPacer(
      BUTTON_CLICK_DEBOUNCE_PERIOD
    )
    this.initImages()
    this.initControls()
  }

  async initImages () {
    let sheet = new Image()
    sheet.src = './images/buttonsC.png'
    sheet.onload = () => {
      this.ready = true
      let images, imagesD, imagesL, imagesR
      //promises
      Utils.cutSpriteSheetCallback(sheet, 4, 1, 50, 300, output => {
        this.images = output

        console.log('control images loaded')
      })
    }
  }

  initControls () {
    for (let i = 0; i < ROWS; i++) {
      let corner = Math.floor(i * (this.controlH + this.spacingY)) + this.startY
      this.cornerY.push(corner)
    }
  }

  addControl (worldX, worldY, kind) {
    let newControl
    for (let i = 0; i < MAX_UNITS; i++) {
      let element = this.units[i]
      if (!(element instanceof Control) || !element.active) {
        if (this.swooshPacer()) {
          newControl = new Control(worldX, worldY, kind)
          this.units[i] = newControl
          console.log('added control')
          break
        }
      }
    }
    return newControl
  }

  draw () {
    this.active ||
      (() => {
        return
      })()
    for (let control of this.controls) {
      //console.log('draw unit')
      //debugger
      if (control instanceof Control && control.active) {
        // debugger

        let image = this.images[control.frame]
        if (image == null) {
          return
        }
        this.game.ctx.drawImage(
          image,
          control.screenX,
          control.screenY,
          SPRITE_WIDTH,
          SPRITE_HEIGHT
        )
      }
    }
  }

  update () {
    for (let control of this.controls) {
      if (control instanceof Control && control.active) {
      }
    }
  }
}
