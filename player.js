import * as Utils from './utils.js'
const startGridX = 2
const startGridY = 4
const spriteWidth = 70
const spriteHeight = 100
const WALK_SPEED = 2
const RUN_SPEED = 5

const COLL_WIDTH = 50
const COLL_HEIGHT = 80
const FRAME_PERIOD = 120
const SPRITES_PER_DIRECTION = 6

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
    //animation
    this.frameID = 0 // which sprite in the series for same direction
    this.spriteID = 0 // which sprite in whole array
    this.images
    this.currImage = null
    this.direction = 'n' // n u d l r
    this.state = 'w' // w walk / s stand / a attack
    this.walking = false
    this.cyclePart = 0
    this.walkPacer = Utils.createMillisecondPacer(FRAME_PERIOD)

    this.ready = false
    this.game = game
    this.dpad = dpadStart

    //collision and sprite location
    this.collider = collider
    this.worldY = startGridY * game.tileSize
    this.worldX = startGridX * game.tileSize
    this.updateScreenXY()
    this.width = spriteWidth
    this.height = spriteHeight
    this.speed = WALK_SPEED
    this.velX = 0
    this.velY = 0
    this.framePacer = Utils.createPacer(FRAME_PERIOD)
    this.initImages()
    //this.ready = true
  }
  initImages0 () {
    this.image = new Image()
    this.image.src = './images/playerPH0.png'
    this.image.onload = () => {
      this.ready = true
      console.log('player image loaded')
    }
  }

  initImages () {
    let sheet = new Image()
    sheet.src = './images/playersheet.png'
    sheet.onload = () => {
      this.ready = true
      this.images = Utils.cutSpriteSheet(sheet, 6, 4, 100, 200)
      console.log('player images loaded')
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
    if (null == this.currImage) {
      return
    }
    this.game.ctx.drawImage(
      this.currImage,
      this.screenX,
      this.screenY,
      this.width,
      this.height
    )
  }

  swooshDirection () {
    switch (this.direction) {
      case 'u':
        return 0
      case 'd':
        return 1
      case 'l':
        return 2
      case 'r':
        return 3
      default:
        return 0
    }
  }

  playerMotion () {
    let keys = this.game.input.keys
    if (this.state == 'w') {
      // reset to standing if previously walking
      this.state = 's'
    }

    let collSides = this.game.collision.playerCollideTile()

    let up = keys['ArrowUp'] === true
    let down = keys['ArrowDown'] === true
    let left = keys['ArrowLeft'] === true
    let right = keys['ArrowRight'] === true

    if (keys['w'] === true) up = true
    if (keys['s'] === true) down = true
    if (keys['a'] === true) left = true
    if (keys['d'] === true) right = true

    if (keys['Shift'] == true) {
      this.speed = RUN_SPEED
    } else {
      this.speed = WALK_SPEED
    }
    if (keys['f'] == true) {
      this.game.swoosh.addUnit(this.worldX, this.worldY, this.swooshDirection())
    }

    if (up && !down && !collSides[0]) {
      this.velY = -this.speed
      this.direction = 'u'
      this.state = 'w'
    } else if (down && !up && !collSides[1]) {
      this.velY = this.speed
      this.direction = 'd'
      this.state = 'w'
    } else {
      this.velY = 0
    }
    if (left && !right && !collSides[2]) {
      this.velX = -this.speed
      this.direction = 'l'
      this.state = 'w'
    } else if (!left && right && !collSides[3]) {
      this.velX = this.speed
      this.direction = 'r'
      this.state = 'w'
    } else {
      this.velX = 0
    }
    this.worldX += this.velX
    this.worldY += this.velY
  }

  updateFrame () {
    const nextCyclePart = () => {
      if (this.cyclePart < 5) {
        this.cyclePart++
      } else {
        this.cyclePart = 0
      }
    }
    if (this.state == 'w' && this.walkPacer()) {
      nextCyclePart()
    } else if (this.state == 's') {
      this.cyclePart = 0
    }

    let directionPart = 0
    switch (this.direction) {
      case 'u':
        directionPart = 0
        break
      case 'd':
        directionPart = 6
        break
      case 'l':
        directionPart = 12
        break
      case 'r':
        directionPart = 18
        break
    }

    this.spriteID = directionPart + this.cyclePart
    //console.log(this.spriteID)
    //console.log(this.images.length)
    if (this.images != null) {
      this.currImage = this.images[this.spriteID]
    }
  }

  update () {
    //
    this.updateScreenXY()
    this.playerMotion()
    this.updateFrame()
    this.resetDpad()
    this.collider.x = this.worldX + 25
    this.collider.y = this.worldY + 10
  }
}
