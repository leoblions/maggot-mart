export class Hud {
  constructor (game) {
    this.game = game
  }

  draw () {
    context = this.game.ctx
    context.fillStyle = 'white' //color of font
    context.font = '45px sans-serif'
    context.fillText(this.game.score, 5, 45)
  }

  update () {
    //
  }
}
