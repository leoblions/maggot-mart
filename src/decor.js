import * as Utils from './utils.js'
import * as Assets from './assets.js'

const tilesX = 20
const tilesY = 20
const tileDrawDist = 6
//const tileSize = 100
const CAMERA_SPEED = 4
const amountOfPictures = 32

const DEFAULT_GROUND = -1
const OOB_TILE_KIND = 0
const DEFAULT_LEVEL_DATA_URL = '/data/level0.txt'
const LEVEL_DATA_PREFIX = '/data/decor'
const LEVEL_DATA_SUFFIX = '.txt'
const LOAD_DEFAULT_LEVEL = false
const TILE_TYPE_AMOUNT = 48
const SHIFT_DECOR_DOWN_INDEX = 12
const SHIFT_DECOR_DOWN_AMOUNT = 25

export class Decor {
  static grid = null
  static tileSize

  constructor (game) {
    this.ready = false
    this.game = game
    this.tilesX = tilesX
    this.tilesY = tilesY
    //this.cameraSpeed = this.player.speed
    this.images = Array(amountOfPictures).fill(null)
    this.tileSize = this.game.tileSize
    Decor.tileSize = this.game.tileSize
    this.bounds = {
      startX: 0,
      startY: 0,
      endX: 10,
      endY: 10
    }

    this.cameraBounds = {
      startX: 0,
      startY: 0,
      endX: 10,
      endY: 10
    }

    this.initImages()
    //this.getImages()
    this.initGrid()

    if (LOAD_DEFAULT_LEVEL) {
      this.loadDefaultLevel()
    } else {
      Decor.lastInstance = this
      this.loadCurrentLevel()
    }
  }

  async loadCurrentLevel () {
    let currentLevelFile =
      LEVEL_DATA_PREFIX + this.game.level + LEVEL_DATA_SUFFIX
    try {
      let decorData = await Utils.loadFileAsText(currentLevelFile)
      let grid = Utils.stringToGrid(decorData)
      //check for garbage data
      if (grid != undefined && grid != null && grid.length != 0) {
        Decor.grid = grid
      } else {
        throw `file ${currentLevelFile}contained garbage`
      }
    } catch (error) {
      console.log('Load level failed. ' + currentLevelFile)
      console.log(error)
      console.log('creating empty table')
      Decor.grid = this.emptyGrid()
    }
  }

  emptyGrid () {
    let grid = []
    for (let y = 0; y < tilesY; y++) {
      let row = []
      for (let y = 0; y < tilesX; y++) {
        row.push(DEFAULT_GROUND)
      }
      grid.push(row)
    }
    return grid
  }

  loadDefaultLevel () {
    Utils.loadFileAsText(DEFAULT_LEVEL_DATA_URL).then(
      function (value) {
        let grid = Utils.stringToGrid(value)

        //console.log(grid)
        if (grid != undefined && grid != null && grid.length != 0) {
          Decor.grid = grid
          Decor.lastInstance.gridDataToUnitsList()
        }
      },
      function (error) {
        console.log('Load default level failed.')
        console.log(error)
      }
    )
  }

  initGrid () {
    Decor.grid = Utils.fillArray(tilesX, tilesY, DEFAULT_GROUND)
  }

  initImages () {
    // let sheet = new Image()
    // let len = 0
    // sheet.src = '/images/decor.png'
    // sheet = sheet
    // let images1 = null
    // sheet.onload = () => {
    //   // prevent these from running until input image is loaded
    //   this.image = Utils.getSubImage(sheet, 0, 0, 100, 100)
    //   images1 = Utils.cutSpriteSheet(sheet, 4, 4, 100, 100)
    //   for (let i = 0; i < 0 + images1.length; i++) {
    //     this.images[i + 0] = images1[i]
    //   }
    // }
    this.images = Assets.decorImg
  }

  draw1 () {
    let bounds = this.game.tilegrid.bounds
    //console.log(bounds)
    for (let y = bounds.startY; y <= this.bounds.endY; y++) {
      for (let x = bounds.startX; x <= this.bounds.endX; x++) {
        let screenX = x * this.tileSize - this.game.cameraX
        let screenY = y * this.tileSize - this.game.cameraY
        let kind = Decor.grid[y][x]
        let image = this.images[kind]
        if (null == image || kind == -1) continue

        this.game.ctx.drawImage(
          image,
          screenX,
          screenY,
          this.tileSize,
          this.tileSize
        )
      }
    }
  }

  draw () {
    let startX = this.game.tilegrid.bounds.startX
    let startY = this.game.tilegrid.bounds.startY
    let endX = this.game.tilegrid.bounds.endX
    let endY = this.game.tilegrid.bounds.endY
    //console.log(bounds)
    for (let y = startY; y <= endY; y++) {
      for (let x = startX; x <= endX; x++) {
        let screenX = x * this.tileSize - this.game.cameraX
        let screenY = y * this.tileSize - this.game.cameraY
        let kind = Decor.grid[y][x]
        if (kind >= SHIFT_DECOR_DOWN_INDEX) {
          screenY += SHIFT_DECOR_DOWN_AMOUNT
        }
        let image = this.images[kind]
        if (null == image || kind == -1) continue

        this.game.ctx.drawImage(
          image,
          screenX,
          screenY,
          this.tileSize,
          this.tileSize
        )
      }
    }
  }

  editTile (gridX, gridY, kind) {
    if (
      gridX >= 0 &&
      gridX < Decor.grid.length &&
      gridY >= 0 &&
      gridY < Decor.grid[0].length &&
      null != this.images[kind]
    ) {
      Decor.grid[gridY][gridX] = kind
      console.log(`edit decor tileX${gridX}, tileY${gridY} kind:${kind}`)
    }
  }

  delTile (gridX, gridY) {
    if (
      gridX >= 0 &&
      gridX < Decor.grid.length &&
      gridY >= 0 &&
      gridY < Decor.grid[0].length
    ) {
      Decor.grid[gridY][gridX] = DEFAULT_GROUND
      console.log(
        `edit decor tileX${gridX}, tileY${gridY} kind:${DEFAULT_GROUND}`
      )
    }
  }

  update () {}
}
