const NEWLINE_CHAR = 'n'
const COL_DELIMITER = ','

/*

grid data

*/

export async function loadFileAsText (fileURL) {
  let response = await fetch(fileURL)
  if (response.status != 200) {
    throw new Error(`Server error while loading:${fileURL}`)
  }
  let textData = await response.text()
  return textData
}

export function newArray (cols, rows) {
  let matrix = []
  let fillValue = 0
  for (let y = 0; y < rows; y++) {
    matrix[y] = [] // add row
    for (let x = 0; x < cols; x++) {
      matrix[y][x] = fillValue
    }
  }
  return matrix
}

export function saveDataToCookie (name, obj) {
  let stringified = JSON.stringify(obj)
  let cookieString = name + '=' + stringified
  document.cookie = cookieString
  console.log('Wrote the cookie: ' + cookieString)
}

export function saveStringToCookie (name, str) {
  let cookieString = name + '=' + str
  document.cookie = cookieString
  console.log('Wrote the cookie: ' + cookieString)
}

export function gridToString (grid) {
  let rows = grid.length
  if (rows == 0) {
    throw new Error('gridToString: grid is empty')
  }
  let cols = grid[0].length
  let total = ''
  for (let y = 0; y < rows; y++) {
    let thisrow = ''
    for (let x = 0; x < cols; x++) {
      let value = grid[y][x]
      thisrow += value
      thisrow += COL_DELIMITER
    }
    thisrow += NEWLINE_CHAR
    total += thisrow
    thisrow = ''
  }
  //debugger
  //console.log(total)
  return total
}

export function getCookieValueFromCookieName (name) {
  let allcookies = document.cookie
  let splitBySemicolon = allcookies.split(';')
  let splitByEquals
  for (let i = 0; i < splitBySemicolon.length; i++) {
    splitByEquals = splitBySemicolon[i].split('=')
    if (splitByEquals[0] == name) {
      let value = splitByEquals[1]
      //debugger
      return value
    }
  }
  return null
}

export function stringToGrid (instring) {
  //debugger
  //let fixNewlineChar = instring.replace('\\n', '\n')
  let splitNewline = instring.split(NEWLINE_CHAR)
  let rows = 0
  for (let i in splitNewline) {
    if (splitNewline[i].length > 0) {
      rows += 1
    }
  }

  let output = []
  let rowNumbers = null
  let splitToCols = null
  let cols = null
  for (let y = 0; y < rows; y++) {
    rowNumbers = []
    if (splitNewline[y].length == 0) {
      continue
    }
    //console.log(splitNewline[y])
    splitToCols = splitNewline[y].split(COL_DELIMITER)
    cols = 0
    for (let i in splitToCols) {
      if (splitToCols[i].length > 0) {
        cols += 1
      }
    }
    for (let x = 0; x < cols; x++) {
      rowNumbers[x] = Number(splitToCols[x])
    }
    output[y] = rowNumbers
  }

  return output
}

export function fillArray (cols, rows, fillValue) {
  let matrix = []
  for (let y = 0; y < rows; y++) {
    matrix[y] = [] // add row
    for (let x = 0; x < cols; x++) {
      matrix[y][x] = fillValue
    }
  }
  return matrix
}

/*

Image data, sprites

*/

export function getSubImage0 (image, startX, startY, width, height) {
  if (image.complete == false) {
    throw new Error("getSubImage0 the input image wasn't loaded yet")
  }
  const canvas = document.createElement('canvas')
  canvas.id = getUnusedHTMLElementID()
  canvas.width = width
  canvas.height = height
  let ctx = canvas.getContext('2d')
  ctx.drawImage(image, startX, startY, width, height, 0, 0, width, height)
  document.body.appendChild(canvas)

  let newimage = canvasToImage(canvas)

  document.body.removeChild(canvas)
  return newimage
}

export function getSubImageNoAddElement (image, startX, startY, width, height) {
  if (image.complete == false) {
    throw new Error("getSubImage0 the input image wasn't loaded yet")
  }
  const canvas = document.createElement('canvas')
  canvas.id = getUnusedHTMLElementID()
  canvas.width = width
  canvas.height = height
  let ctx = canvas.getContext('2d')
  ctx.drawImage(image, startX, startY, width, height, 0, 0, width, height)
  //document.body.appendChild(canvas)

  let newimage = canvasToImage(canvas)

  //document.body.removeChild(canvas)
  return newimage
}

/**
 * @param {Array} imageArray - The input image array.
 * @param {number} degrees - degrees to rotate.
 * @returns {Array} rotated image array.
 */
export function rotateImageArray (imageArray, degrees) {
  console.log(typeof imageArray)
  if (!imageArray instanceof Array) {
    console.error('rotateImageArray: imageArray invalid data')
    return
  }
  if (typeof degrees != 'number') {
    console.error('rotateImageArray: degrees invalid data')
    return
  }
  let length = imageArray.length
  let outputArr = new Array(length)
  for (let i = 0; i < length; i++) {
    let currentImage = imageArray[i]
    if (!currentImage instanceof Image) {
      console.error(`Element ${i} is not a valid image`)
      return
    }
    let rotatedImage = rotateImage(currentImage, degrees)
    outputArr[i] = rotatedImage
  }
  return outputArr
}

/**
 * @param {Array} imageArray - The input image array.
 * @param {func} myFunc - degrees to rotate.
 * @returns {Array} rotated image array.
 */
export function applyFunctionToImageArray (imageArray, myFunc) {
  console.log(typeof imageArray)
  if (!imageArray instanceof Array) {
    console.error('rotateImageArray: imageArray invalid data')
    return
  }
  if (!myFunc instanceof Function) {
    console.error('rotateImageArray: func invalid data')
    return
  }
  let length = imageArray.length
  let outputArr = new Array(length)
  for (let i = 0; i < length; i++) {
    let currentImage = imageArray[i]
    if (!currentImage instanceof Image) {
      console.error(`Element ${i} is not a valid image`)
      return
    }
    let rotatedImage = myFunc(currentImage)
    outputArr[i] = rotatedImage
  }
  return outputArr
}

/**
 * @param {Image} imageIn - The input image.
 * @param {number} degrees - degrees to rotate.
 * @returns {Image} rotated image.
 */
export function rotateImage (imageIn, degrees) {
  //console.log(imageIn.complete)
  if (imageIn.complete == false) {
    throw new Error("rotateImage the input image wasn't loaded yet")
  }
  const canvas = document.createElement('canvas')
  document.body.appendChild(canvas)
  canvas.id = getUnusedHTMLElementID()
  canvas.width = imageIn.width
  canvas.height = imageIn.height

  let ctx = canvas.getContext('2d')

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  //save rotation state of canvas
  ctx.save()
  //shift pivot point to center
  ctx.translate(canvas.width / 2, canvas.height / 2)
  // rotate the context
  ctx.rotate((degrees * Math.PI) / 180)
  // draw image to context
  ctx.drawImage(imageIn, -imageIn.width / 2, -imageIn.width / 2)

  ctx.restore()

  /** @type {Image} */
  let imageNew = canvasToImage(canvas)

  document.body.removeChild(canvas)
  return imageNew
}

export function getUnusedHTMLElementID () {
  let i = 0
  while (document.getElementById(i) != null) {
    i += 1
  }
  return i
}

/**
 * @param {Image} imageIn - The input image.
 * @returns {Image} rotated image.
 */
export function flipImageH (imageIn) {
  if (imageIn.complete == false) {
    throw new Error("  the input image wasn't loaded yet")
  }
  const canvas = document.createElement('canvas')
  document.body.appendChild(canvas)
  canvas.id = getUnusedHTMLElementID()
  canvas.width = imageIn.width
  canvas.height = imageIn.height

  let ctx = canvas.getContext('2d')

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  //save rotation state of canvas
  ctx.save()
  // shift context right
  //ctx.translate(imageIn.width, 0)
  ctx.scale(-1, 1)
  // draw image to context
  ctx.drawImage(imageIn, 0, 0)

  ctx.restore()

  /** @type {Image} */
  let imageNew = canvasToImage(canvas)

  document.body.removeChild(canvas)
  return imageNew
}

export function cutSpriteSheetX (spritesheet, cols, rows, width, height) {
  let sprites = new Array(rows * cols)
  let subscript = 0
  for (let y = 0; y < cols; y++) {
    for (let x = 0; x < rows; x++) {
      subscript += 1
      let startX = x * width
      let startY = y * height
      const currImage = getSubImage0(
        spritesheet,
        startX,
        startY,
        width,
        height
      ).then(
        function (result) {
          sprites[subscript] = currImage
        },
        function (error) {
          sprites[subscript] = null
        }
      )
      sprites[subscript] = currImage
    }
  }
  return sprites
}

export function cutSpriteSheet (spritesheet, cols, rows, width, height) {
  let sprites = []
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      let startX = x * width
      let startY = y * height
      let currImage = getSubImage0(spritesheet, startX, startY, width, height)
      sprites.push(currImage)
    }
  }
  //console.log(sprites instanceof Array)
  return sprites
}

export async function cutSpriteSheetPR (spritesheet, cols, rows, width, height) {
  let sprites = []
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      let startX = x * width
      let startY = y * height
      let currImage = getSubImage0(spritesheet, startX, startY, width, height)
      sprites.push(currImage)
    }
  }
  //console.log(sprites instanceof Array)
  return Promise.resolve(sprites)
}

export function clamp (min, max, test) {
  if (test > max) {
    return max
  } else if (test < min) {
    return min
  } else {
    return test
  }
}

export function getSubImage (image, startX, startY, width, height) {
  // expects a tempCanvas id element
  const canvas = document.getElementById('tempCanvas')
  //canvas.id = 'tempCanvas'
  canvas.width = width
  canvas.height = height
  let ctx = canvas.getContext('2d')
  ctx.drawImage(image, startX, startY, width, height, 0, 0, width, height)
  document.body.appendChild(canvas)

  let newimage = canvasToImage(canvas)

  //document.removeChild(canvas)
  return newimage
}

export function downloadObject (obj, filename) {
  var json = JSON.stringify(obj, null, 2)
  var blob = new Blob([json], { type: 'application/json;charset=utf-8' })
  var elem = document.createElement('a')
  elem.href = url
  elem.download = filename
  document.body.appendChild(elem)
  elem.click()
  document.body.removeChild(elem)
}

function canvasToImage (canvas) {
  var image = new Image()
  image.src = canvas.toDataURL()
  return image
}

export function createPacer (tickPeriod) {
  let tickPeriodT = tickPeriod
  let tickCount = 0
  let inner = () => {
    if (tickCount > tickPeriodT) {
      tickCount = 0
      return true
    } else {
      tickCount += 1
      return false
    }
  }
  return inner
}

export function createMillisecondPacer (millisecondPeriod) {
  // true when rate limit elapsed
  const period = millisecondPeriod
  let lastTime = Date.now()
  let inner = () => {
    let now = Date.now()
    //console.log(period)
    if (now - lastTime > period) {
      lastTime = now
      return true
    } else {
      return false
    }
  }
  return inner
}

export function createTickPacer (tickPeriod) {
  // true when rate limit elapsed
  const period = tickPeriod
  let tickCount = 0
  let inner = () => {
    if (tickCount > period) {
      tickCount = 0
      return true
    } else {
      tickCount += 1
      return false
    }
  }
  return inner
}

export function createTimeout (startTicks = 0) {
  let ticksRemaining = startTicks
  const timeout = function (addTicks = 0) {
    //return true until ticks reaches zero
    ticks += addTicks
    if (ticksRemaining <= 0) {
      return false
    } else {
      ticksRemaining -= 1
      return true
    }
  }
  return timeout(startTicks)
}
