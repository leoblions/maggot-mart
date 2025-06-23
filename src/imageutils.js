import * as Utils from './utils.js'

/*
https://blog.boot.dev/golang/gos-waitgroup-javascripts-promiseall/

*/
export async function getSubImageAsync1 (image, startX, startY, width, height) {
  // expects a tempCanvas id element
  const canvas = document.getElementById('tempCanvas')
  //canvas.id = 'tempCanvas'
  canvas.width = width
  canvas.height = height
  let ctx = canvas.getContext('2d')
  ctx.drawImage(image, startX, startY, width, height, 0, 0, width, height)
  document.body.appendChild(canvas)

  var image = new Image()
  image.src = canvas.toDataURL()
  return image
}

export async function initBugsheet () {
  let sheet = new Image()
  sheet.src = './images/bugsheet0.png'
  let imagesL = await cutSpriteSheetAsync(sheet, 4, 4, 150, 150)

  let imagesR = await Utils.applyFunctionToImageArray(output, Utils.flipImageH)
}

export async function cutSpriteSheetAsync (
  spritesheet,
  cols,
  rows,
  width,
  height
) {
  let sprites = []
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      let startX = x * width
      let startY = y * height
      let currImage = await getSubImageAsync(
        spritesheet,
        startX,
        startY,
        width,
        height
      )
      sprites.push(currImage)
    }
  }
  return sprites
}

export async function flipImageArrayHorizontalAsync (spriteArray) {
  let sprites = []
  for (let i = 0; i < spriteArray.length; i++) {
    let currImage = await flipImageHorizontalAsync(spriteArray[i])
    sprites.push(currImage)
  }
  return sprites
}

export async function getSingleImageFromURL (
  URL,
  startX,
  startY,
  width,
  height
) {
  if (typeof URL != 'string') {
    throw 'URL is not of type string'
  }
  async function imageLoadPF (URL) {
    let imageLoadP = new Promise((resolve, reject) => {
      let sheet = new Image()
      sheet.src = URL
      sheet.onload = () => {
        //console.log('load image good')
        resolve(sheet)
      }
      sheet.onerror = () => {
        console.error('load image failed ' + URL)
        reject(sheet)
      }
    })
    let image = await imageLoadP
    return image
  }
  async function imageCutPF (image, startX, startY, width, height) {
    let imageCutP = new Promise((resolve, reject) => {
      Utils.cutSpriteSheetSingleCallback(
        image,
        startX,
        startY,
        width,
        height,
        output => {
          if (output == undefined) {
            reject(output)
          } else {
            resolve(output)
          }
        }
      )
    })
    let imageArray = await imageCutP
    return imageArray
  }
  let sheet = await imageLoadPF(URL)
  let cutImg = await imageCutPF(sheet, startX, startY, width, height)
  return cutImg
}

export async function getImagesFromURL (URL, cols, rows, width, height) {
  async function imageLoadPF (URL) {
    let imageLoadP = new Promise((resolve, reject) => {
      let sheet = new Image()
      sheet.src = URL
      sheet.onload = () => {
        console.error('load image good')
        resolve(sheet)
      }
      sheet.onerror = () => {
        console.error('load image failed')
        reject(sheet)
      }
    })
    let image = await imageLoadP
    return image
  }
  async function imageCutPF (image, cols, rows, width, height) {
    let imageCutP = new Promise((resolve, reject) => {
      Utils.cutSpriteSheetCallback(image, cols, rows, width, height, output => {
        if (output == undefined) {
          reject(output)
        } else {
          resolve(output)
        }

        console.log('pickup images loaded')
      })
    })
    let imageArray = await imageCutP
    return imageArray
  }
  let sheet = await imageLoadPF(URL)
  let arr = await imageCutPF(sheet, cols, rows, width, height)
  return arr
}

export async function getSubImageAsync (image, startX, startY, width, height) {
  if (image.complete == false) {
    throw new Error(
      " the input image wasn't loaded yet. input is:" + typeof image
    )
  }
  const canvas = document.createElement('canvas')
  canvas.id = Utils.getUnusedHTMLElementID()
  canvas.width = width
  canvas.height = height
  let ctx = canvas.getContext('2d')

  ctx.drawImage(image, startX, startY, width, height, 0, 0, width, height)
  document.body.appendChild(canvas)

  let newimage = Utils.canvasToImage(canvas)
  let promise = new Promise((resolve, reject) => {
    newimage.onload = () => {
      document.body.removeChild(canvas)
      resolve(newimage)
    }
    newimage.onerror = reject
  })
  await promise

  return newimage
}

export async function mirrorAndAppendimageArrayFromURL (
  imageURL = './images/bugsheet0.png'
) {
  let sheet = new Image()
  sheet.src = imageURL

  let imageLoadedPromise = new Promise((resolve, reject) => {
    sheet.onload = () => resolve(sheet)
    sheet.onerror = reject
  })

  let imagesLeft, imagesRight

  await imageLoadedPromise

  if (sheet.complete == false) {
    debugger
    throw new Error(" the input image wasn't loaded yet")
  }

  imagesLeft = await cutSpriteSheetAsync(sheet, 4, 4, 150, 150)

  imagesRight = await flipImageArrayHorizontalAsync(imagesLeft)

  return imagesLeft.concat(imagesRight)
}

export async function flipImageHorizontalAsync (imageIn) {
  let output = await processImageBody()
  return output

  async function processImageBody () {
    const canvas = document.createElement('canvas')
    document.body.appendChild(canvas)
    canvas.id = Utils.getUnusedHTMLElementID()
    canvas.width = imageIn.width
    canvas.height = imageIn.height

    let ctx = canvas.getContext('2d')

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    //save rotation state of canvas
    ctx.save()
    // shift context right
    //ctx.translate(imageIn.width, 0)
    ctx.translate(imageIn.width, 0)
    ctx.scale(-1, 1)
    // draw image to context
    ctx.drawImage(imageIn, 0, 0)

    ctx.restore()

    /** @type {Image} */
    let imageNew = await Utils.canvasToImage(canvas)

    document.body.removeChild(canvas)
    //debugger
    return imageNew
  }
}
