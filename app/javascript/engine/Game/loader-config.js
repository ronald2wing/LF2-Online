export default {
  // Defer match-specific data; shared UI, weapons, and effects load at boot.
  lazyload: function (folder, entry) {
    if (folder === 'object') {
      return entry.type === 'character' || entry.type === 'specialattack'
    }
    return folder === 'background' || folder === 'AI'
  }
}
