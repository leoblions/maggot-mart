import { Player } from './player.js'
import { Tilegrid } from './tilegrid.js'
import { Input } from './input.js'
import { Editor } from './editor.js'
import { Collision } from './collision.js'
import { Hud } from './hud.js'
import { Swoosh } from './swoosh.js'
import { Entity } from './entity.js'
import { Pathfind } from './pathfind.js'
import * as Utils from './utils.js'
;('use strict')

const msPerTick = 60 / 1000
const tileSize = 10
export const TILESIZE = 100
const NO_SCROLL = true
const TPS_COUNTER_INTERVAL_SEC = 5
const FRAME_PERIOD_MS =Math.floor(1000/60)

/*

screenY + cameraY = worldY
screenY = worldY - cameraY

*/

export const game = {
  cameraX: 0,
  cameraY: 0,
  tileSize: TILESIZE,
  player: null,
  hud: null,
  tilegrid: null,
  editor: null,
  input: null,
  entity: null,
  swoosh: null,
  pathfind: null,
  collision: null,
  ctx: null,
  boardWidth: null,
  boardHeight: null,
  score: 0,
  health: 0,
  level: 0,
  stamina: 0
}

//board

let board
let boardWidth = 600
let boardHeight = 500
let context //used for drawing on canvas





window.onload = function () {
  board = document.getElementById('board')
  // disable scrollbar
  const [body] = document.getElementsByTagName('body')
  if (NO_SCROLL) {
    body.setAttribute('style', 'overflow:hidden')
  }
  game.board = board
  board.height = boardHeight
  board.width = boardWidth
  context = board.getContext('2d')
  game.ctx = context
  game.player = new Player(game)
  game.input = new Input(game)
  game.collision = new Collision(game)
  game.tilegrid = new Tilegrid(game)
  game.swoosh = new Swoosh(game)
  game.editor = new Editor(game)
  game.entity = new Entity(game)
  game.pathfind = new Pathfind(game)
  game.hud = new Hud(game)
  game.boardWidth = boardWidth
  game.boardHeight = boardHeight
  game.tickCount = 0
  game.displayTPS = 0
  game.counterPacer = Utils.createMillisecondPacer( 1000)
  game.framePacer = Utils.createMillisecondPacer(FRAME_PERIOD_MS)

  requestAnimationFrame(draw)
  let uinterval = setInterval(update, msPerTick)
}



function update () {
  game.player.update()
  game.tilegrid.update()
  game.swoosh.update()
  game.entity.update()
  game.pathfind.update()
  game.input.update()
  game.hud.update()
  game.tickCount+=1
  if (game.counterPacer()){
    // Math.floor(game.tickCount / (TPS_COUNTER_INTERVAL_SEC*1000))
    game.displayTPS =  game.tickCount 
    game.tickCount = 0
  }

}



function draw () {
  // draw loop can run as fast as browser wants

  requestAnimationFrame(draw)
if (game.framePacer()){
  context.clearRect(0, 0, board.width, board.height) // clear previous frame
  game.tilegrid.draw()
  game.swoosh.draw()
  game.player.draw()
  game.pathfind.draw()
  game.entity.draw()
  game.hud.draw()
}
  
  
}

const detectCollision = (a, b) => {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  )
}
