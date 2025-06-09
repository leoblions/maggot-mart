import * as Utils from './utils.js'
import { Game } from './game.js'
import * as Assets from './assets.js'

const MAX_UNITS = 10

const BUTTON_CLICK_DEBOUNCE_PERIOD = 500

const LETTER_SIZE = 30

const MAIN_MENU_LABELS = ['new game', 'continue', 'options', 'help', 'exit']
const PAUSE_MENU_LABELS = ['restart', 'status', 'options', 'help', 'exit']
const OPTIONS_MENU_LABELS = ['sfx vol', 'music vol', 'difficulty', 'back']
const INDICATOR_COLOR_G = `rgba(50, 250, 50, 0.9)`
const INDICATOR_COLOR_Y = `rgba(250, 250, 50, 0.9)`
const INDICATOR_COLOR_R = `rgba(250, 50, 50, 0.9)`

const ROWS = 5

class Control {
  constructor (screenX, screenY, kind = 0) {
    this.kind = kind // 0 static image, 1 button
    this.screenX = screenX
    this.screenY = screenY
    this.width = 300
    this.height = 50
    this.frame = 0
    this.fill = this.width
    this.image = null
    this.textWidth = 100
    this.textOffset = 0
    this.labelImage = null
    this.active = true
    this.label = ''
  }
}

export class Menu {
  constructor (game) {
    this.game = game
    this.imagesLoaded = false
    this.active = true
    this.controlW = Math.floor(this.game.board.width / 3)
    this.controlTenthW = Math.floor(this.controlW / 10)
    this.lowBorder = this.controlTenthW * 4
    this.highBorder = this.controlTenthW * 7
    this.controlH = Math.floor(this.game.board.height / 12)
    this.startX = Math.floor(
      this.game.board.width / 2 - Math.floor(this.controlW / 2)
    )
    this.cornerY = []
    this.startY = this.controlH * 3
    this.spacingY = Math.floor(this.controlH / 2)
    this.images = null
    this.controls = new Array(MAX_UNITS)
    this.mainControls = []
    this.pausedControls = []
    this.optionControls = []
    this.buttonPacer = Utils.createMillisecondPacer(
      BUTTON_CLICK_DEBOUNCE_PERIOD
    )
    this.barsSfx = 5
    this.barsMusic = 5
    this.barsDifficulty = 5
    this.labelImages = null
    this.initImages()
    this.initControls()
    this.initButtonLabelImages()
    this.mouse = {
      clicked: false,
      panelX: 0,
      panelY: 0
    }
  }

  async initImages1 () {
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

  async initImages () {
    this.images = Assets.menuBtnImg
  }

  initButtonLabelImages () {
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map
    this.labelImagesM = []

    //debugger
    for (let label of MAIN_MENU_LABELS) {
      let labelImage = this.game.rastertext.createLabel(label)
      this.labelImagesM.push(labelImage)
    }
    this.labelImagesP = []
    for (let label of PAUSE_MENU_LABELS) {
      let labelImage = this.game.rastertext.createLabel(label)
      this.labelImagesP.push(labelImage)
    }
    this.labelImagesO = []
    for (let label of OPTIONS_MENU_LABELS) {
      let labelImage = this.game.rastertext.createLabel(label)
      this.labelImagesO.push(labelImage)
    }
  }

  initControls () {
    this.labelsArrayToControls(MAIN_MENU_LABELS, this.mainControls)
    this.labelsArrayToControls(OPTIONS_MENU_LABELS, this.optionControls, true)
    this.labelsArrayToControls(PAUSE_MENU_LABELS, this.pausedControls)
  }

  labelsArrayToControls (labelsArray, outputArray, isOptions = false) {
    let i = 0
    for (const label of labelsArray) {
      //debugger
      let corner = Math.floor(i * (this.controlH + this.spacingY)) + this.startY
      this.cornerY.push(corner)
      let kind = isOptions && i != 3 ? 1 : 0
      let newControl = new Control(this.startX, corner, kind)
      newControl.label = label
      newControl.labelImage = this.game.rastertext.createLabel(label)
      newControl.image = this.images[kind]
      newControl.width = this.controlW
      newControl.textWidth = Math.round((LETTER_SIZE * label.length) / 2)
      newControl.textOffset = Math.round(
        newControl.width / 2 - newControl.textWidth / 2
      )
      newControl.height = this.controlH
      //this.controls.push(newControl)
      outputArray[i] = newControl
      i++
    }
  }

  initControls1 () {
    for (let i = 0; i < ROWS; i++) {
      //debugger
      let corner = Math.floor(i * (this.controlH + this.spacingY)) + this.startY
      this.cornerY.push(corner)
      let newControl = new Control(this.startX, corner, 1)
      newControl.width = this.controlW
      newControl.height = this.controlH
      //this.controls.push(newControl)
      this.controls[i] = newControl
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
    //console.log('menu click ')

    this.mouse.clicked = true
    this.mouse.panelX = panelLoc.clickX
    this.mouse.panelY = panelLoc.clickY
  }

  pointCollideControl (control, screenX, screenY) {
    //debugger
    let x2 = control.screenX + control.width
    let y2 = control.screenY + control.height
    return (
      screenX >= control.screenX &&
      screenX <= x2 &&
      screenY >= control.screenY &&
      screenY <= y2
    )
  }

  buttonSideClicked () {
    // 0 left 1 right
    let dx1 = this.mouse.panelX
    let dx2 = this.game.board.width - dx1
    if (dx1 < dx2) {
      return 0
    } else {
      return 1
    }
  }

  whichButtonClicked () {
    let counter = 0

    for (let control of this.controls) {
      if (
        control?.active &&
        this.pointCollideControl(control, this.mouse.panelX, this.mouse.panelY)
      ) {
        //debugger
        return counter
      }
      counter++
    }
    return -1
  }

  buttonClickAction (buttonID, clickedSide) {
    let mode = this.game.getMode()

    switch (mode) {
      case Game.modes.MAINMENU:
        switch (buttonID) {
          case 0:
            this.game.mode = Game.modes.PLAY
            break
          case 1:
            this.game.mode = Game.modes.PLAY

            break
          case 2:
            this.game.mode = Game.modes.OPTIONS

            break
          case 3:
            this.game.mode = Game.modes.HELP
            break
          case 4:
            this.game.mode = Game.modes.PLAY
            break
          default:
            this.labelImages = this.labelImagesM
            break
        }
        break
      case Game.modes.PAUSED:
        switch (buttonID) {
          case 0:
            this.game.mode = Game.modes.PLAY
            break
          case 1:
            this.game.mode = Game.modes.PLAY

            break
          case 2:
            this.game.requestStateChange(Game.modes.OPTIONS)
            //this.game.mode = Game.modes.OPTIONS

            break
          case 3:
            this.game.mode = Game.modes.HELP
            break
          case 4:
            this.game.requestStateChange(Game.modes.PLAY)
            break
          default:
            this.labelImages = this.labelImagesM
            break
        }
        break
      case Game.modes.OPTIONS:
        switch (buttonID) {
          case 0:
            let orig = this.barsSfx
            if (clickedSide == 0) {
              this.barsSfx = orig > 0 ? orig - 1 : orig
            } else {
              this.barsSfx = orig < 9 ? orig + 1 : orig
            }
            break
          case 1:
            let origm = this.barsMusic
            if (clickedSide == 0) {
              this.barsMusic = origm > 0 ? origm - 1 : origm
            } else {
              this.barsMusic = origm < 9 ? origm + 1 : origm
            }

            break
          case 2:
            let origd = this.barsMusic
            if (clickedSide == 0) {
              this.barsDifficulty = origd > 0 ? origd - 1 : origd
            } else {
              this.barsDifficulty = origd < 9 ? origd + 1 : origd
            }

            break
          case 3:
            this.game.requestStateChange(Game.modes.PAUSED)
            break
          case 4:
            this.game.mode = Game.modes.PLAY
            break
          default:
            this.labelImages = this.labelImagesM
            break
        }
        break
      default:
        //this.labelImages = this.labelImagesM
        break
    }
  }

  setBarsSMD () {
    this.optionControls[0].fill = this.controlTenthW * this.barsSfx
    this.optionControls[1].fill = this.controlTenthW * this.barsMusic
    this.optionControls[2].fill = this.controlTenthW * this.barsDifficulty
  }

  draw () {
    //if (!this.active) return
    let iter = 0
    for (let control of this.controls) {
      //console.log('draw unit')
      //debugger
      if (control instanceof Control && control.active) {
        if (this.images == null) {
          return
        } else {
          //let image = this.images[control.frame]
          let image = control.image
          let labelImage = control.labelImage
          this.game.ctx.drawImage(
            image,
            control.screenX,
            control.screenY,
            control.width,
            control.height
          )
          this.game.ctx.drawImage(
            labelImage,
            control.screenX + control.textOffset + 10,
            control.screenY + 10,
            control.textWidth - 20,
            control.height - 20
          )
          if (control.kind == 1) {
            if (control.fill < this.lowBorder) {
              this.game.ctx.fillStyle = INDICATOR_COLOR_G
            } else if (control.fill < this.highBorder) {
              this.game.ctx.fillStyle = INDICATOR_COLOR_Y
            } else {
              this.game.ctx.fillStyle = INDICATOR_COLOR_R
            }

            this.game.ctx.fillRect(
              control.screenX + 10,
              control.screenY + control.height + 3,
              control.fill,
              5
            )
          }
        }
        iter++
      }
    }
  }

  update () {
    let clickedButton = this.whichButtonClicked()
    let clickedSide = this.buttonSideClicked()

    if (this.mouse.clicked) {
      console.log('button clicked ' + clickedButton)
    }

    if (clickedButton != -1 && this.mouse.clicked && this.buttonPacer()) {
      console.log('button clicked ' + clickedButton)
      this.buttonClickAction(clickedButton, clickedSide)
    }

    this.selectButtonSet()
    this.setBarsSMD()

    this.mouse.clicked = false
  }

  selectButtonSet () {
    let mode = this.game.getMode()
    switch (mode) {
      case Game.modes.MAINMENU:
        this.labelImages = this.labelImagesM
        this.controls = this.mainControls
        break
      case Game.modes.PAUSED:
        this.labelImages = this.labelImagesP
        this.controls = this.pausedControls
        break
      case Game.modes.OPTIONS:
        this.labelImages = this.labelImagesO
        this.controls = this.optionControls
        break
      default:
        this.labelImages = this.labelImagesM
        break
    }
  }
}
