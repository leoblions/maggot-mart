import * as Utils from './utils.js'
const SCORE_X = 5
const SCORE_Y = 10
const SCORE_FONT = `${SCORE_Y}px sans-serif`
const SCORE_TEMPLATE = 'Score '
let score = 0
let kills = 0

let HEALTHBAR_X = 150
const HEALTHBAR_Y = 50
const HEALTHBAR_SHEET_W = 300
const HEALTHBAR_SHEET_H = 50
const HEALTHBAR_W = 150
const HEALTHBAR_H = 25
const HB_INNER_W_MAX = HEALTHBAR_W - 2
const HB_INNER_H_MAX = HEALTHBAR_H - 2
var HB_POSITION = new Utils.Rectangle()
var HB_POSITION_INNER = new Utils.Rectangle()
const HB_INNER_FILL_COLOR = `rgba(1, 1, 1, 0.9)`

export class Hud {
  static SCORE_TEMPLATE = `Score: ${score}`
  static KILL_TEMPLATE = `Kills: ${kills}`
  /**
   * @param {Game} game - game stem object
   */
  constructor (game) {
    this.game = game
    this.gridX, this.gridY

    this.blackRect = new Utils.Rectangle()
    this.images = null
    this.initImages()
    this.objectiveName = 'Boxes'
    this.initHealthBarPositions()
    this.updateHealthbarBlankingRect(100)
    this.updateObjectiveTextPacer = new Utils.createTickPacer(500)
    this.objectiveString = ''

    this.objectiveText = this.game.rastertext.addUnit(
      200,
      10,
      this.objectiveStringTemplate
    )
  }

  initHealthBarPositions () {
    HB_POSITION.x = this.game.board.width - (HEALTHBAR_W + HEALTHBAR_H)
    HB_POSITION.y = HEALTHBAR_H
    HB_POSITION.width = HEALTHBAR_W
    HB_POSITION.height = HEALTHBAR_H

    HB_POSITION_INNER.x =
      this.game.board.width - (HEALTHBAR_W + HEALTHBAR_H) + 5
    HB_POSITION_INNER.y = HEALTHBAR_H + 7
    HB_POSITION_INNER.width = HEALTHBAR_W - 20
    HB_POSITION_INNER.height = HEALTHBAR_H - 12
    this.healthbarInnerMax = HB_POSITION_INNER.width
    this.healthBarInnerStartX = HB_POSITION_INNER.x
  }
  /**
   * @param {number} percentHealth - 0 to 100 percent health
   */
  updateHealthbarBlankingRect (percentHealth) {
    //debugger
    //console.log('update hb')
    let fullWidth = Math.floor((percentHealth / 100) * this.healthbarInnerMax)
    let coverWidth = this.healthbarInnerMax - fullWidth
    if (coverWidth > 0) {
      HB_POSITION_INNER.width = coverWidth
      HB_POSITION_INNER.x = this.healthBarInnerStartX + fullWidth
    } else {
      HB_POSITION_INNER.width = 1
    }
  }

  updateHealthbar () {
    //debugger
    //console.log('update hb')
    let percentHealth = this.game.health

    let fullWidth = Math.floor((percentHealth / 100) * this.healthbarInnerMax)
    let coverWidth = this.healthbarInnerMax - fullWidth
    if (coverWidth > 0) {
      HB_POSITION_INNER.width = coverWidth
      HB_POSITION_INNER.x = this.healthBarInnerStartX + fullWidth
    } else {
      HB_POSITION_INNER.width = 1
    }
  }

  initImages () {
    let sheet = new Image()
    sheet.src = './images/healthBars.png'
    sheet.onload = () => {
      this.ready = true
      let imgs = Utils.cutSpriteSheet(
        sheet,
        9,
        2,
        HEALTHBAR_SHEET_W,
        HEALTHBAR_SHEET_H
      )
      this.images = imgs
      console.log('hb images loaded')
    }
  }

  draw () {
    let ctx = this.game.ctx
    ctx.fillStyle = 'white' //color of font
    ctx.font = `12px sans-serif`
    ctx.fillText(SCORE_TEMPLATE + this.game.score, SCORE_X, SCORE_Y)
    ctx.fillText('TPS ' + this.game.displayTPS, SCORE_X, SCORE_Y + 20)
    ctx.fillText(`Player:  ${this.gridX} ${this.gridY}`, SCORE_X, SCORE_Y + 40)
    ctx.fillText(`Stage:  ${this.game.brain.stage}  `, SCORE_X, SCORE_Y + 60)
    this.drawHealthbar()
  }

  drawHealthbar () {
    if (this.images != null) {
      this.game.ctx.drawImage(
        this.images[0],
        HB_POSITION.x,
        HB_POSITION.y,
        HB_POSITION.width,
        HB_POSITION.height
      )
      this.game.ctx.fillStyle = HB_INNER_FILL_COLOR

      this.game.ctx.fillRect(
        HB_POSITION_INNER.x,
        HB_POSITION_INNER.y,
        HB_POSITION_INNER.width,
        HB_POSITION_INNER.height
      )
    }
  }

  updateObjectiveText () {
    this.gridX = Math.floor(
      this.game.player.worldX / this.game.tilegrid.tileSize
    )
    this.gridY = Math.floor(
      this.game.player.worldY / this.game.tilegrid.tileSize
    )
  }

  update () {
    this.score = this.game.score
    this.updateObjectiveTextPacer() && this.updateObjectiveText()
  }
}
