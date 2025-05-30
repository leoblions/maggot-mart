import * as Utils from './utils.js'
import * as Assets from './assets.js'

const MESSAGE_DEBOUNCE = 500
const BOX_WIDTH = 350
const BOX_HEIGHT = 100
const TEXT_OFFSET_X = 10
const TEXT_OFFSET_Y = 10

export class Dialog {
  static animateSpeed = 60
  constructor (game) {
    this.game = game
    this.screenX = Math.round(this.game.board.width / 2 - BOX_WIDTH / 2)
    this.screenY = this.game.board.height - BOX_HEIGHT
    this.images = null
    this.active = false
    this.changeMessageRequested = false
    this.dialogPacer = Utils.createMillisecondPacer(MESSAGE_DEBOUNCE)
    this.background = Assets.dialogImg[0]
    this.currentLineNumber = 0
    this.currentChainID = null
    this.currentChainObj = null
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

  startDialogChain (chainID) {
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
      }
      if (changed == false) {
        console.error(`Chain ${chainID} not found`)
      }
    }
  }

  advanceDialogChain () {
    let changed = false
    if (this.active && this.currentLineNumber <= this.chainMaxLineNumber) {
      changed = true
      this.currentSpeaker = chain.speaker[this.currentLineNumber]
      this.currentText = chain.line[this.currentLineNumber]
      this.chainMaxLineNumber = chain.line.length
    } else {
      this.active = false
    }
  }

  drawText () {
    let ctx = this.game.ctx
    ctx.fillStyle = 'white' //color of font
    ctx.font = `12px sans-serif`
    ctx.fillText(
      this.currentText,
      this.screenX + TEXT_OFFSET_X,
      this.screenY + TEXT_OFFSET_Y
    )
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
    }
    this.drawText()
  }

  update () {
    if (this.changeMessageRequested && this.dialogPacer()) {
      if (this.active) {
        console.log('advance chain')
        this.advanceDialogChain()
      }
      this.changeMessageRequested = false
    }
  }
}
