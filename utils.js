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
  debugger
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
    console.log(splitNewline[y])
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

export function getUnusedHTMLElementID () {
  let i = 0
  while (document.getElementById(i) != null) {
    i += 1
  }
  return i
}

export function cutSpriteSheet (spritesheet, cols, rows, width, height) {
  let sprites = []
  for (let y = 0; y < cols; y++) {
    for (let x = 0; x < rows; x++) {
      let startX = x * width
      let startY = y * height
      let currImage = getSubImage0(spritesheet, startX, startY, width, height)
      sprites.push(currImage)
    }
  }
  return sprites
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
