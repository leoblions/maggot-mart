import * as Utils from './utils.js'
import * as Assets from './assets.js'
import { Rastertext } from './rastertext.js'

const MESSAGE_DEBOUNCE = 500
const BOX_WIDTH = 350
const BOX_HEIGHT = 100
const TEXT_OFFSET_X = 20
const TEXT_OFFSET_Y = 25
const DIALOG_BOC_LINE_MAX_CHARS = 25
const DIALOG_BOX_LINES = 5
const LINE_SPACING_Y = 10

/**
 *  display and update dialog boxes
 */
export class Dialog {
  static animateSpeed = 60
  static rastertext
  /**
   *
   * @param {Game} game = game stem object
   * @param {number} kind = 0 for vector text, 1 for raster text
   */
  constructor (game, kind = 0) {
    this.game = game
    this.kind = kind

    this.screenX = Math.round(this.game.board.width / 2 - BOX_WIDTH / 2)
    this.screenY = this.game.board.height - BOX_HEIGHT

    if (kind == 1) {
      this.rastertext = new Rastertext(game, 1)
      this.initRTUnits()
      this.drawText = this.drawTextRaster
    } else {
      this.rastertext = null
      this.drawText = this.drawTextVector
    }

    this.images = null
    this.active = false
    this.dflags = []
    this.changeMessageRequested = false
    this.dialogPacer = Utils.createMillisecondPacer(MESSAGE_DEBOUNCE)
    this.background = Assets.dialogImg[0]
    this.currentLineNumber = 0
    this.currentChainID = null
    this.currentChainObj = null
    this.dialogBoxLines = null
    this.currentSpeaker = 'None'
    this.currentText = 'no text'
    this.chainMaxLineNumber = 0
    this.playerPressedActivate = false
    this.initChains()
  }

  async initChains () {
    //fetch returns a promise
    let response = await fetch('./data/dialog_chains.json')
    this.dialogChains = await response.json()
  }

  async initChainsT () {
    //fetch returns a promise
    fetch('./data/dialog_chains.json')
      .then(response => response.json())
      .then(value => () => {
        this.dialogChains = value
      })
      .catch(error => console.error(error))
  }

  initRTUnits () {
    let lineOffsetY = 0

    for (let i = 0; i < DIALOG_BOX_LINES; i++) {
      this.rastertext.addUnit(
        this.screenX + TEXT_OFFSET_X,
        this.screenY + lineOffsetY + TEXT_OFFSET_Y,
        ''
      )
      lineOffsetY += LINE_SPACING_Y
    }
  }

  startDialogChain (chainID) {
    if (this.active || !this.dialogPacer()) {
      return
    }
    this.active = true
    this.currentChainID = chainID
    this.currentLineNumber = 0
    let changed = false
    for (let chain of this.dialogChains) {
      if (chain.chainID == chainID) {
        changed = true
        this.currentChainObj = chain
        this.currentSpeaker = chain.speaker[0]
        this.currentText = chain.line[0]
        this.chainMaxLineNumber = chain.line.length
        this.game.player.freeze = true
        this.updateDialogBoxLines()
        break
      }
    }
    if (changed == false) {
      debugger
      console.error(`Chain ${chainID} not found`)
    }
  }

  updateDialogBoxLines () {
    this.dialogBoxLines = Utils.stringSplitter(
      this.currentText,
      DIALOG_BOC_LINE_MAX_CHARS
    )
    if (this.kind == 1 && this.dialogBoxLines != null) {
      for (let i = 0; i < DIALOG_BOX_LINES; i++) {
        let line = this.dialogBoxLines[i] ?? ''
        if (line == undefined) {
          line = ''
        }
        try {
          this.rastertext.updateUnitText(line, i)
        } catch (error) {}
      }
    }
  }

  endDialog () {
    this.active = false
    this.game.player.freeze = false
    let actionID = this.currentChainObj?.actionID
    if (actionID != null) {
      this.game.brain.dialogInvokeAction(actionID)
    }
  }

  advanceDialogChain () {
    let changed = false
    //debugger

    if (this.active && this.currentLineNumber <= this.chainMaxLineNumber) {
      changed = true
      this.currentSpeaker = this.currentChainObj.speaker[this.currentLineNumber]
      this.currentText = this.currentChainObj.line[this.currentLineNumber]
      this.updateDialogBoxLines()
      if (this.currentText == undefined) {
        this.endDialog()
      }
      this.chainMaxLineNumber = this.currentChainObj.line.length
      this.currentLineNumber += 1
    } else {
      this.endDialog()
    }
  }

  drawTextRaster () {
    this.rastertext.draw()
  }

  drawTextVector () {
    let ctx = this.game.ctx
    ctx.fillStyle = 'black' //color of font
    ctx.font = `12px sans-serif`
    let lineSpacingY = LINE_SPACING_Y
    let lineOffsetY = 0

    for (const line of this.dialogBoxLines) {
      ctx.fillText(
        line,
        this.screenX + TEXT_OFFSET_X,
        this.screenY + lineOffsetY + TEXT_OFFSET_Y
      )
      lineOffsetY += lineSpacingY
    }
  }

  draw () {
    if (this.active) {
      this.game.ctx.drawImage(
        this.background,
        this.screenX,
        this.screenY,
        BOX_WIDTH,
        BOX_HEIGHT
      )
      this.drawText()
    }
  }

  handleMessageChangeRequest () {
    if (this.changeMessageRequested) {
      if (this.active && this.dialogPacer()) {
        console.log('advance chain')
        this.advanceDialogChain()
      }
      this.changeMessageRequested = false
    }
  }

  update () {
    this.handleMessageChangeRequest()
  }
}
