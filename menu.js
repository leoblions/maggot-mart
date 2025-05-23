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

const ROWS = 5

class Control {
  constructor (screenX, screenY, kind) {
    this.kind = kind // 0 static image, 1 button
    this.screenX = screenX
    this.screenY = screenY
    this.width = 300
    this.height = 50
    this.frame = 0
    this.image = null
    this.active = true
    this.textString = ''
  }
}

export class Menu {
  constructor (game) {
    this.game = game
    this.imagesLoaded = false
    this.active = true
    this.controlW = Math.floor(this.game.board.width / 3)
    this.controlH = Math.floor(this.game.board.height / 12)
    this.startX = Math.floor(
      this.game.board.width / 2 - Math.floor(this.controlW / 2)
    )
    this.cornerY = []
    this.startY = this.controlH * 3
    this.spacingY = Math.floor(this.controlH / 2)
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

  initImages () {
    if (this.imagesLoaded) {
      return
    }

    let sheet = new Image()
    sheet.src = './images/buttonsC.png'
    sheet.onload = () => {
      this.ready = true
      let images, imagesD, imagesL, imagesR
      //promises
      Utils.cutSpriteSheetCallback(sheet, 1, 4, 300, 50, output => {
        this.images = output
        this.imagesLoaded = true

        console.log('control images loaded')
      })
    }
  }

  initControls () {
    for (let i = 0; i < ROWS; i++) {
      let corner = Math.floor(i * (this.controlH + this.spacingY)) + this.startY
      this.cornerY.push(corner)
      let newControl = new Control(this.startX, corner, 1)
      newControl.width = this.controlW
      newControl.height = this.controlH
      this.controls.push(newControl)
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

  handleClick (event, panelLoc) {
    //console.log(event)
    let gridLoc = this.game.editor.panelXYtoGridXY(
      panelLoc.clickX,
      panelLoc.clickY
    )
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

        if (this.images == null) {
          return
        } else {
          let image = this.images[control.frame]
          this.game.ctx.drawImage(
            image,
            control.screenX,
            control.screenY,
            control.width,
            control.height
          )
        }
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
