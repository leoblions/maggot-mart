const SCORE_X = 5
const SCORE_Y = 30
const SCORE_FONT = `${SCORE_Y}px sans-serif`
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
    ctx.font = SCORE_FONT
    ctx.fillText(SCORE_TEMPLATE, SCORE_X, SCORE_Y)
  }

  update () {
    this.score = this.game.score
  }
}
