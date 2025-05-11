const soundURLs = ['./sound/sfx.wav']

class Sound {
  constructor () {
    this.sounds = this.initSounds()
  }

  initSounds () {
    let sounds = []
    for (const soundURL of soundURLs) {
      let audioElement = new Audio(soundURL)
      sounds.push(audioElement)
    }
    return sounds
  }

  playSound (soundID) {
    this.sounds[soundID].play()
  }
  loopSound (soundID) {
    this.sounds[soundID].loop = true
  }
  pauseSound (soundID) {
    this.sounds[soundID].pause()
  }

  restartSound (soundID) {
    this.sounds[soundID].currentTime = 0
    this.sounds[soundID].paused ? this.sounds[soundID].play() : null
  }
}
