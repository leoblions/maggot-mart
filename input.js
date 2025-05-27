import { Game } from './game.js'
const LOG_CLICK_LOCATION = false
export class Input {
  constructor (game) {
    this.game = game
    //let kda = this.keydownActionClosure()
    //document.addEventListener('keydown', kda)
    // location of canvas to calculate click location
    this.boardLocation = this.game.board.getBoundingClientRect()
    //console.log(this.boardLocation)
    // resizing window calls anonymous callback function to recalculate location of canvas
    window.addEventListener('onresize', () => {
      this.boardLocation = this.game.board.getBoundingClientRect()
    })
    //console.log(this.boardLocation)

    this.keys = {}
    this.clicks = []

    document.addEventListener('click', event => {
      this.clicks.push(event)
      //console.log(this.clicks)
    })

    document.addEventListener('keydown', event => {
      this.keys[event.key] = true
    })

    document.addEventListener('keyup', event => {
      this.keys[event.key] = false
    })
  }

  clickIsInBounds (e) {
    if (
      e.clientX < this.boardLocation.x ||
      e.clientX > this.boardLocation.x + this.boardLocation.width
    ) {
      return false
    }
    if (
      e.clientY < this.boardLocation.y ||
      e.clientY > this.boardLocation.y + this.boardLocation.height
    ) {
      return false
    }
    return true
  }

  handleClick (e) {
    this.adjustClick(e)
  }

  adjustClick (e) {
    //console.log(e)
    if (this.boardLocation == null) {
      this.boardLocation = this.game.board.getBoundingClientRect()
    }
    let clickX = e.clientX - this.boardLocation.x
    let clickY = e.clientY - this.boardLocation.y
    let loc = {
      clickX: clickX,
      clickY: clickY
    }
    if (isNaN(e.clientX) || isNaN(e.clientY)) {
      throw new Error(
        `adjustClick invalid output client ${e.clientX} ${e.clientY}`
      )
    }
    if (isNaN(clickX) || isNaN(clickY)) {
      throw new Error('adjustClick invalid output click')
    } else {
      return loc
    }
  }

  gridXYfromScreenXY (screenX, screenY) {
    let worldX = screenX + this.game.cameraX
    let worldY = screenY + this.game.cameraY
    let gridX = Math.floor(worldX / this.game.tileSize)
    let gridY = Math.floor(worldY / this.game.tileSize)
    let loc = {
      gridX: gridX,
      gridY: gridY
    }
    if (isNaN(gridX) || isNaN(gridY)) {
      throw new Error('gridXYfromScreenXY invalid output')
    } else {
      return loc
    }
  }

  update () {
    //console.log('update input')
    for (const index in this.clicks) {
      let event = this.clicks[index]
      let panelLoc = this.adjustClick(event)
      if (LOG_CLICK_LOCATION) {
        console.log(
          'location ' + panelLoc.clickX + ' location ' + panelLoc.clickY
        )
      }
      //editor clicks
      // if (this.game.editor.enabled && this.clickIsInBounds(event)) {
      //   this.game.editor.handleClick(event, panelLoc)
      // }
      //menu clicks
      if ((this.game.mode = Game.modes.PLAY)) {
        if (this.game.editor.enabled && this.clickIsInBounds(event)) {
          this.game.editor.handleClick(event, panelLoc)
        }
      } else {
        this.game.menu.handleClick(event, panelLoc)
      }
    }
    this.menuMotion() // menu activation keypresses

    this.clicks = []
  }

  menuMotion () {
    let keys = this.game.input.keys

    if (keys['Escape'] == true) {
      if (this.game.getMode() == Game.modes.PLAY) {
        this.game.requestStateChange(Game.modes.PAUSED)
      } else {
        this.game.requestStateChange(Game.modes.PLAY)
      }
      keys['Escape'] = false
    }
    if (keys[' '] == true) {
      console.log(this.game.getMode())
    }

    let up = keys['ArrowUp'] === true
    let down = keys['ArrowDown'] === true
    let left = keys['ArrowLeft'] === true
    let right = keys['ArrowRight'] === true

    if (keys['w'] === true) up = true
    if (keys['s'] === true) down = true
    if (keys['a'] === true) left = true
    if (keys['d'] === true) right = true

    if (keys['Shift'] == true) {
    }
    if (keys['f'] == true) {
    }

    if (keys['e'] == true) {
    }
    //debugger
  }

  // keydownActionClosure () {
  //   let gamecl = this.game
  //   const keydownAction = e => {
  //     if (e.code == 'ArrowUp' || e.code == 'KeyW') {
  //       gamecl.player.dpad.up = true
  //     }
  //     if (e.code == 'ArrowDown' || e.code == 'KeyS') {
  //       gamecl.player.dpad.down = true
  //     }
  //     if (e.code == 'ArrowLeft' || e.code == 'KeyA') {
  //       gamecl.player.dpad.left = true
  //     }
  //     if (e.code == 'ArrowRight' || e.code == 'KeyD') {
  //       gamecl.player.dpad.right = true
  //     }
  //   }
  //   return keydownAction
  // }
}
