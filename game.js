import { Player } from './player.js'
import { Tilegrid } from './tilegrid.js'
import { Input } from './input.js'
import { Editor } from './editor.js'
import { Collision } from './collision.js'
import { Hud } from './hud.js'
import { Projectile } from './projectile.js'
import { Entity } from './entity.js'
import { Pathfind } from './pathfind.js'
import { Rastertext } from './rastertext.js'
import { Menu } from './menu.js'
import { Splat } from './splat.js'
import { Pickup } from './pickup.js'
import { Sound } from './sound.js'
import { Trigger } from './trigger.js'
import { Brain } from './brain.js'
import { Decor } from './decor.js'
import * as Utils from './utils.js'
import * as Assets from './assets.js'
;('use strict')

const msPerTick = 60 / 1000
const tileSize = 10
export const TILESIZE = 100
const NO_SCROLL = true
const TPS_COUNTER_INTERVAL_SEC = 5
const FRAME_PERIOD_MS = Math.floor(1000 / 60)
const START_HEALTH = 100

// game modes

/*

screenY + cameraY = worldY
screenY = worldY - cameraY

*/

// export const game = {
//   cameraX: 0,
//   cameraY: 0,
//   tileSize: TILESIZE,
//   player: null,
//   hud: null,
//   tilegrid: null,
//   editor: null,
//   input: null,
//   entity: null,
//   projectile: null,
//   pathfind: null,
//   collision: null,
//   ctx: null,
//   rastertext: null,
//   boardWidth: null,
//   boardHeight: null,
//   score: 0,
//   health: 0,
//   level: 0,
//   stamina: 0
// }

export let game

export class Game {
  #mode = 0
  static difficulty = 5
  static godmode = false
  static noclip = false
  static volume = 5
  // immutable "enum" of game modes
  static modes = Object.freeze({
    PLAY: 0,
    MAINMENU: 1,
    OPTIONS: 2,
    PAUSED: 3,
    TITLE: 4,
    HELP: 5
  })
  constructor () {
    this.stage = 0
    this.cameraX = 0
    this.cameraY = 0
    this.tileSize = TILESIZE
    this.player = null
    this.hud = null
    this.tilegrid = null
    this.editor = null
    this.input = null
    this.entity = null
    this.projectile = null
    this.pathfind = null
    this.brain = null
    this.puckup = null
    this.collision = null
    this.splat = null
    this.ctx = null
    this.decor = null
    this.menu = null
    this.sound = null
    this.game = null
    this.mode = () => {
      while (true) {}
    }
    this.rastertext = null
    this.boardWidth = null
    this.boardHeight = null
    this.score = 0
    this.health = START_HEALTH
    this.level = 0
    this.stamina = START_HEALTH
    this.objectiveTotal = 0
    this.objectiveComplete = 0
  }
  requestStateChange (newState) {
    if (this.stateChangePacer()) {
      this.#mode = newState
    }
  }

  getMode () {
    return this.#mode
  }

  keyModeSelector1 () {
    let keys = this?.input.keys
    if (keys == undefined) {
      return
    }

    if (keys['Escape'] == true) {
      if (this.game.mode == Game.modes.PLAY) {
        this.game.requestStateChange(Game.modes.MAINMENU)
      } else if (this.game.mode == Game.modes.MAINMENU) {
        this.game.requestStateChange(Game.modes.PLAY)
      } else if (this.game.mode == Game.modes.PAUSED) {
        this.game.requestStateChange(Game.modes.PLAY)
      }
    }
    if (keys['p'] == true) {
      if (this.game.mode == Game.modes.PLAY) {
        this.game.requestStateChange(Game.modes.PAUSED)
      } else if (this.game.mode == Game.modes.PAUSED) {
        this.game.requestStateChange(Game.modes.PLAY)
      }
    }
  }
}

//board

let board
let boardWidth = 600
let boardHeight = 500
let context //used for drawing on canvas

window.onload = function () {
  game = new Game()
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

  Assets.loadAssets(() => {
    game.player = new Player(game)
    game.input = new Input(game)
    game.collision = new Collision(game)
    game.tilegrid = new Tilegrid(game)
    game.decor = new Decor(game)
    game.brain = new Brain(game)
    game.projectile = new Projectile(game)
    game.editor = new Editor(game)

    game.entity = new Entity(game)
    game.splat = new Splat(game)
    game.rastertext = new Rastertext(game)
    game.menu = new Menu(game)
    game.pickup = new Pickup(game)

    game.sound = new Sound(this)
    game.pathfind = new Pathfind(game)
    game.hud = new Hud(game)
    game.trigger = new Trigger(game)
    game.boardWidth = boardWidth
    game.boardHeight = boardHeight
    game.tickCount = 0
    game.displayTPS = 0
    game.counterPacer = Utils.createMillisecondPacer(1000)
    game.framePacer = Utils.createMillisecondPacer(FRAME_PERIOD_MS)
    game.stateChangePacer = new Utils.createMillisecondPacer(1000)

    requestAnimationFrame(draw)
    let uinterval = setInterval(update, msPerTick)
    board.click()
  })
}

function update () {
  game.input.update()
  let currMode = game.getMode()
  if (currMode == Game.modes.PLAY) {
    game.player.update()
    game.brain.update()
    game.tilegrid.update()
    game.projectile.update()
    game.entity.update()
    game.pathfind.update()

    game.hud.update()
    game.decor.update()

    game.rastertext.update()
    game.splat.update()
    game.pickup.update()
    game.trigger.update()
  } else {
    game.menu.update()
  }

  game.tickCount += 1
  if (game.counterPacer()) {
    // Math.floor(game.tickCount / (TPS_COUNTER_INTERVAL_SEC*1000))
    game.displayTPS = game.tickCount
    game.tickCount = 0
  }
}

function draw () {
  // draw loop can run as fast as browser wants

  requestAnimationFrame(draw)
  if (game.framePacer()) {
    context.clearRect(0, 0, board.width, board.height) // clear previous frame
    let currMode = game.getMode()
    if (currMode == Game.modes.PLAY) {
      game.tilegrid.draw()
      game.decor.draw()
      game.projectile.draw()
      game.splat.draw()
      game.pickup.draw()
      // game.menu.draw()
      game.player.draw()
      game.pathfind.draw()
      game.trigger.draw()
      game.entity.draw()
      //top
      game.hud.draw()

      game.rastertext.draw()
    } else {
      game.menu.draw()
    }
  }
}
