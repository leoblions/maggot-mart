const SCORE_X = 5
const SCORE_Y = 10
const SCORE_FONT = `${SCORE_Y}px sans-serif`
const SCORE_TEMPLATE = "Score "
let score = 0
let kills = 0

export class Hud {
  static SCORE_TEMPLATE = `Score: ${score}`
  static KILL_TEMPLATE = `Kills: ${kills}`
  constructor (game) {
    this.game = game
  }

  draw () {
    let ctx = this.game.ctx
    ctx.fillStyle = 'white' //color of font
    ctx.font = `12px sans-serif`
    ctx.fillText(SCORE_TEMPLATE+this.game.score, SCORE_X, SCORE_Y)
    ctx.fillText("TPS "+this.game.displayTPS, SCORE_X, SCORE_Y+20)
  }

  update () {
    this.score = this.game.score
  }
}
