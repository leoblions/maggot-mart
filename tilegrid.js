import * as Utils from './utils.js'

const tilesX = 20
const tilesY = 20
const tileDrawDist = 6
//const tileSize = 100
const CAMERA_SPEED = 4
const amountOfPictures = 32

const DEFAULT_GROUND = 0
const OOB_TILE_KIND = 0
const DEFAULT_LEVEL_DATA_URL = '/data/level0.txt'
const LOAD_DEFAULT_LEVEL = true

export class Tilegrid {
  static grid = null
  static solidArr = []
  constructor (game) {
    this.ready = false
    this.game = game
    this.tilesX = tilesX
    this.tilesY = tilesY
    //this.cameraSpeed = this.player.speed
    this.images = Array(amountOfPictures).fill(null)
    this.tileSize = this.game.tileSize

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
    this.setCameraBounds()

    this.initImages()
    //this.getImages()
    this.initGrid()
    if (LOAD_DEFAULT_LEVEL) {
      Utils.loadFileAsText(DEFAULT_LEVEL_DATA_URL).then(
        function (value) {
          let grid = Utils.stringToGrid(value)
          //console.log(grid)
          if (grid != undefined && grid != null && grid.length != 0) {
            Tilegrid.grid = grid
          }
        },
        function (error) {
          console.log('Load default level failed.')
          console.log(error)
        }
      )
    }
    this.adjustBounds()
  }

  setCameraBounds () {
    let height = this.game.board.height
    let width = this.game.board.width
    this.cameraBounds.startX = width / 4
    this.cameraBounds.startY = height / 4
    this.cameraBounds.endX = width * 0.6
    this.cameraBounds.endY = height * 0.6
    console.log('boardWidth startX' + this.cameraBounds.startX)
  }

  initGrid () {
    Tilegrid.grid = Utils.fillArray(tilesX, tilesY, DEFAULT_GROUND)
  }

  adjustBounds () {
    let pTileX = Math.round(this.game.player.worldX / this.tileSize)
    let pTileY = Math.round(this.game.player.worldY / this.tileSize)
    this.bounds.startX = Math.max(0, pTileX - tileDrawDist)
    this.bounds.startY = Math.max(0, pTileY - tileDrawDist)
    this.bounds.endX = Math.min(tilesX - 1, pTileX + tileDrawDist)
    this.bounds.endY = Math.min(tilesY - 1, pTileY + tileDrawDist)
  }

  async getImages () {
    // get group of pictures, is asynchronous due to loading image
    async function batchFn (sheetURL) {
      let sheet = new Image()
      sheet.src = sheetURL
      sheet = sheet
      let imageBatch = null
      sheet.onload = () => {
        // prevent these from running until input image is loaded
        //this.image = Utils.getSubImage(sheet, 0, 0, 100, 100)
        imageBatch = Utils.cutSpriteSheet(sheet, 4, 4, 100, 100)
        return imageBatch
      }
    }
    // when image partial arrays done, copy results to main image array
    let walls = await batchFn('/images/wallTile0.png').then(
      result => result => {
        for (i = 0; i < result.length; i++) this.images[i] = result[i]
      }
    )
    let floors = await batchFn('/images/floorTile0.png').then(
      result => result => {
        for (i = 0; i < result.length; i++) this.images[i + 15] = result[i]
      }
    )
  }

  initImages () {
    let sheet = new Image()
    let len = 0
    sheet.src = '/images/floorTile1.png'
    sheet = sheet
    let images1 = null
    sheet.onload = () => {
      // prevent these from running until input image is loaded
      this.image = Utils.getSubImage(sheet, 0, 0, 100, 100)
      images1 = Utils.cutSpriteSheet(sheet, 4, 4, 100, 100)
      for (let i = 0; i < 0 + images1.length; i++) {
        //images1[i].solid = false
        Tilegrid.solidArr[i] = false
        this.images[i + 0] = images1[i]
      }
    }

    let sheet2 = new Image()
    let images2 = []
    sheet2.src = '/images/wallTile1.png'

    sheet2.onload = () => {
      images2 = Utils.cutSpriteSheet(sheet2, 4, 4, 100, 100)
      for (let i = 0; i < images2.length; i++) {
        images2[i].solid = true
        Tilegrid.solidArr[i + 16] = true
        this.images[i + 16] = images2[i]
      }
    }
  }

  adjustCamera () {
    let cb = this.cameraBounds
    let cameraSpeed = this.game.player.speed

    if (this.game.player.screenX < cb.startX) {
      this.game.cameraX -= cameraSpeed
    }
    if (this.game.player.screenX > cb.endX) {
      this.game.cameraX += cameraSpeed
    }

    if (this.game.player.screenY < cb.startY) {
      this.game.cameraY -= cameraSpeed
    }
    if (this.game.player.screenY > cb.endY) {
      this.game.cameraY += cameraSpeed
    }
  }

  draw () {
    //this.game.ctx.drawImage(this.image, 0, 0, 100, 100)

    if (this.image == null) {
      //console.log('null tile img')
    }
    let bounds = this.bounds
    //console.log(bounds)
    for (let y = bounds.startY; y < this.bounds.endY; y++) {
      for (let x = bounds.startX; x < this.bounds.endX; x++) {
        let screenX = x * this.tileSize - this.game.cameraX
        let screenY = y * this.tileSize - this.game.cameraY
        let kind = Tilegrid.grid[y][x]
        let image = this.images[kind]
        if (null == image) continue

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

  isTileSolid (gridX, gridY) {
    //debugger
    if (gridX < 0 || gridX >= tilesX || gridY < 0 || gridY >= tilesY) {
      return true
    }
    let kind = Tilegrid.grid[gridY][gridX]
    let solid = Tilegrid.solidArr[kind]

    return solid
  }
  isTileSolid1 (gridX, gridY) {
    let kind
    let solid = false
    try {
      kind = Tilegrid.grid[gridY][gridX] ??= OOB_TILE_KIND
      solid = this.images[kind].solid
    } catch (e) {
      kind = OOB_TILE_KIND
      solid = this.images[kind].solid ??= false
    }

    return solid
  }

  isSolidAtWorldCoord (worldX, worldY) {
    //debugger
    let gridX = Math.floor(worldX / this.tileSize)
    let gridY = Math.floor(worldY / this.tileSize)
    return this.isTileSolid(gridX, gridY)
  }

  editTile (gridX, gridY, kind) {
    if (
      gridX >= 0 &&
      gridX < Tilegrid.grid.length &&
      gridY >= 0 &&
      gridY < Tilegrid.grid[0].length &&
      null != this.images[kind]
    ) {
      Tilegrid.grid[gridY][gridX] = kind
      console.log(`edit tileX${gridX}, tileY${gridY} kind:${kind}`)
    }
  }

  update () {
    this.adjustBounds()
    this.adjustCamera()
  }
}
