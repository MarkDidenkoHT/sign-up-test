const SOUNDS = {
  new_message: '/assets/sounds/new_message.mp3',
  error: '/assets/sounds/error.mp3',
};

export function getSoundUrl(name) {
  return SOUNDS[name] || null;
}

if (typeof module !== 'undefined') {
  module.exports = { getSoundUrl, SOUNDS };
}