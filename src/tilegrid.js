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
const LEVEL_DATA_PREFIX = '/data/level'
const LEVEL_DATA_SUFFIX = '.txt'
const LOAD_DEFAULT_LEVEL = false
const TILE_TYPE_AMOUNT = 48

export class Tilegrid {
  static grid = null
  static tileSize
  static solidArr = new Array(TILE_TYPE_AMOUNT).fill(false).map((v, i) => {
    return i > 15 ? true : false
  })

  constructor (game) {
    this.ready = false
    this.game = game
    this.tilesX = tilesX
    this.tilesY = tilesY
    //this.cameraSpeed = this.player.speed
    this.images = Array(amountOfPictures).fill(null)
    this.tileSize = this.game.tileSize
    Tilegrid.tileSize = this.game.tileSize
    console.log(Tilegrid.solidArr)
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
      this.loadDefaultLevel()
    } else {
      Tilegrid.lastInstance = this
      this.loadCurrentLevel()
    }
    this.adjustBounds()
  }

  resetGrid () {
    let newArray = []
    for (let y = 0; y < tilesY; y++) {
      let currentRow = []
      for (let x = 0; x < tilesX; x++) {
        currentRow.push(DEFAULT_GROUND)
      }
      newArray.push(currentRow)
    }
    Tilegrid.grid = newArray
  }

  loadCurrentLevel () {
    let currentLevelFile =
      LEVEL_DATA_PREFIX + this.game.level + LEVEL_DATA_SUFFIX
    Utils.loadFileAsText(currentLevelFile).then(
      function (value) {
        let grid = Utils.stringToGrid(value)

        //console.log(grid)
        if (grid != undefined && grid != null && grid.length != 0) {
          Tilegrid.grid = grid
          //Tilegrid.lastInstance.gridDataToUnitsList()
        }
      },
      function (error) {
        console.log('Load default level failed.')
        console.log(error)
      }
    )
  }

  loadDefaultLevel () {
    Utils.loadFileAsText(DEFAULT_LEVEL_DATA_URL).then(
      function (value) {
        let grid = Utils.stringToGrid(value)

        //console.log(grid)
        if (grid != undefined && grid != null && grid.length != 0) {
          Trigger.grid = grid
          Tilegrid.lastInstance.gridDataToUnitsList()
        }
      },
      function (error) {
        console.log('Load default level failed.')
        console.log(error)
      }
    )
  }

  tileSolid (tileX, tileY) {
    // return true if solid
    //debugger
    try {
      let kind = Tilegrid.grid[tileY][tileX]
      let solid = Tilegrid.solidArr[kind]
      return solid
    } catch (error) {
      // treat as solid if out of bounds
      return true
    }
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
    let pTileX = Math.floor(this.game.player.worldX / this.tileSize)
    let pTileY = Math.floor(this.game.player.worldY / this.tileSize)
    this.bounds.startX = Math.max(0, pTileX - tileDrawDist)
    this.bounds.startY = Math.max(0, pTileY - tileDrawDist)
    this.bounds.endX = Math.min(tilesX - 1, pTileX + tileDrawDist)
    this.bounds.endY = Math.min(tilesY - 1, pTileY + tileDrawDist)
  }

  initImages () {
    let sheet = new Image()
    let len = 0
    sheet.src = '/images/tileFloor.png'
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
    sheet2.src = '/images/tileWall.png'

    sheet2.onload = () => {
      images2 = Utils.cutSpriteSheet(sheet2, 4, 4, 100, 100)
      for (let i = 0; i < images2.length; i++) {
        images2[i].solid = true
        Tilegrid.solidArr[i + 16] = true
        this.images[i + 16] = images2[i]
      }
    }

    let sheet3 = new Image()
    let images3 = []
    sheet3.src = '/images/tileShelf.png'

    sheet3.onload = () => {
      images3 = Utils.cutSpriteSheet(sheet3, 4, 4, 100, 100)
      for (let i = 0; i < images3.length; i++) {
        images3[i].solid = true
        Tilegrid.solidArr[i + 32] = true
        this.images[i + 32] = images3[i]
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

  centerCamera () {
    this.game.cameraX = Math.floor(
      this.game.player.worldX - this.game.board.width / 2
    )
    this.game.cameraY = Math.floor(
      this.game.player.worldY - this.game.board.height / 2
    )
  }

  setTile (gridX, gridY, kind) {
    // does not persist across level changes

    if (
      kind < this.images.length &&
      gridX < Tilegrid.grid[0].length &&
      gridY < Tilegrid.grid.length
    ) {
      Tilegrid.grid[gridY][gridX] = kind
    }
  }

  draw () {
    //this.game.ctx.drawImage(this.image, 0, 0, 100, 100)

    if (this.image == null) {
      //console.log('null tile img')
    }
    let bounds = this.bounds
    //console.log(bounds)
    for (let y = bounds.startY; y <= this.bounds.endY; y++) {
      for (let x = bounds.startX; x <= this.bounds.endX; x++) {
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
    let kind = -1
    try {
      kind = Tilegrid.grid[gridY][gridX]
    } catch {
      return true
    }

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
  delTile (gridX, gridY) {
    if (
      gridX >= 0 &&
      gridX < Decor.grid.length &&
      gridY >= 0 &&
      gridY < Decor.grid[0].length &&
      null != this.images[kind]
    ) {
      Decor.grid[gridY][gridX] = DEFAULT_GROUND
      console.log(`edit tilegrid tileX${gridX}, tileY${gridY} kind:${kind}`)
    }
  }

  update () {
    this.adjustBounds()
    this.adjustCamera()
  }
}
