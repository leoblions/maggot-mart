const startGridX = 2
const startGridY = 4
const spriteWidth = 100
const spriteHeight = 100
const walkSpeed = 2
const runSpeed = 5

const COLL_WIDTH = 50
const COLL_HEIGHT = 80

export const dpadStart = {
  up: false,
  down: false,
  left: false,
  right: false
}

const collider = {
  x: 0,
  y: 0,
  w: COLL_WIDTH,
  h: COLL_HEIGHT
}

export class Player {
  constructor (game) {
    this.ready = false
    this.game = game
    this.dpad = dpadStart
    this.direction = 'n'
    this.collider = collider
    this.worldY = startGridY * game.tileSize
    this.worldX = startGridX * game.tileSize
    this.updateScreenXY()
    this.width = spriteWidth
    this.height = spriteHeight
    this.speed = walkSpeed
    this.velX = 0
    this.velY = 0
    this.initImages()
    //this.ready = true
  }
  initImages () {
    this.image = new Image()
    this.image.src = './images/playerPH0.png'
    this.image.onload = () => {
      this.ready = true
      console.log('player image loaded')
    }
  }

  updateScreenXY () {
    this.screenX = this.worldX - this.game.cameraX
    this.screenY = this.worldY - this.game.cameraY
  }

  resetDpad () {
    this.dpad.up = false
    this.dpad.down = false
    this.dpad.right = false
    this.dpad.left = false
  }

  draw () {
    this.game.ctx.drawImage(
      this.image,
      this.screenX,
      this.screenY,
      this.width,
      this.height
    )
  }

  playerMotion () {
    let keys = this.game.input.keys
    //console.log(keys)

    let collSides = this.game.collision.playerCollideTile()

    let up = keys['ArrowUp'] === true
    let down = keys['ArrowDown'] === true
    let left = keys['ArrowLeft'] === true
    let right = keys['ArrowRight'] === true

    if (keys['w'] === true) up = true
    if (keys['s'] === true) down = true
    if (keys['a'] === true) left = true
    if (keys['d'] === true) right = true

    if (up && !down && !collSides[0]) {
      this.velY = -this.speed
    } else if (down && !up && !collSides[1]) {
      this.velY = this.speed
    } else {
      this.velY = 0
    }
    if (left && !right && !collSides[2]) {
      this.velX = -this.speed
    } else if (!left && right && !collSides[3]) {
      this.velX = this.speed
    } else {
      this.velX = 0
    }
    this.worldX += this.velX
    this.worldY += this.velY
  }

  update () {
    //
    this.updateScreenXY()
    this.playerMotion()
    this.resetDpad()
    this.collider.x = this.worldX + 25
    this.collider.y = this.worldY + 10
  }
}
