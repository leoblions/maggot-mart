import { Player } from './player.js'
import { Tilegrid } from './tilegrid.js'
import { Input } from './input.js'
import { Editor } from './editor.js'
import { Collision } from './collision.js'
import * as Utils from './utils.js'
;('use strict')

const msPerTick = 60 / 1000
const tileSize = 10
export const TILESIZE = 100

/*

screenY + cameraY = worldY
screenY = worldY - cameraY

*/

export const game = {
  cameraX: 0,
  cameraY: 0,
  tileSize: TILESIZE,
  player: null,
  tilegrid: null,
  editor: null,
  input: null,
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

//bird
let birdWidth = 34
let birdHeight = 24
let birdX = boardWidth / 8
let birdY = boardHeight / 2
let birdImg

//pipes
let pipeArray = []
let pipeWidth = 64
let pipeHeight = 512
let pipeX = boardWidth
let pipeY = 0
let topPipeImg
let bottomPipeImg

//physics
let velocityX = -2
let velocityY = 0
let gravity = 0.4
let score = 0

let gameOver = false

let spriteSheet, floor0

//javascript object
let bird = {
  x: birdX,
  y: birdY,
  width: birdWidth,
  height: birdHeight
}

window.onload = function () {
  board = document.getElementById('board')
  game.board = board
  board.height = boardHeight
  board.width = boardWidth
  context = board.getContext('2d')
  game.ctx = context
  game.player = new Player(game)
  game.input = new Input(game)
  game.collision = new Collision(game)
  game.tilegrid = new Tilegrid(game)
  game.editor = new Editor(game)
  game.boardWidth = boardWidth
  game.boardHeight = boardHeight

  requestAnimationFrame(draw)
  let uinterval = setInterval(update, msPerTick)
}

function moveBird (e) {
  if (e.code == 'Space' || e.code == 'ArrowUp' || e.code == 'KeyX') {
    velocityY = -6
  }

  if (gameOver) {
    bird.y = birdY
    pipeArray = []
    score = 0
    gameOver = false
  }
}

function update () {
  game.player.update()
  game.tilegrid.update()
  game.input.update()
}

function placePipes () {
  if (gameOver) {
    return
  }
  let randomPipeY = pipeY - pipeHeight / 4 - Math.random() * (pipeHeight / 2)
  let openingSpace = board.height / 4

  let topPipe = {
    img: topPipeImg,
    x: pipeX,
    y: randomPipeY,
    width: pipeWidth,
    height: pipeHeight,
    passed: false
  }
  pipeArray.push(topPipe)

  let bottomPipe = {
    img: bottomPipeImg,
    x: pipeX,
    y: randomPipeY + pipeHeight + openingSpace,
    width: pipeWidth,
    height: pipeHeight,
    passed: false
  }
  pipeArray.push(bottomPipe)
}

function draw () {
  // draw loop can run as fast as browser wants

  requestAnimationFrame(draw)

  context.clearRect(0, 0, board.width, board.height) // clear previous frame
  game.tilegrid.draw()
  game.player.draw()
}

const detectCollision = (a, b) => {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  )
}
