const domQuery = {}

domQuery.queryUI = function (...classchain) {
  if (!domQuery.container) {
    domQuery.root = document.getElementsByClassName("game-root")[0]
    domQuery.container = domQuery.root.getElementsByClassName("container")[0]
  }
  let cur = domQuery.root
  while (classchain.length) {
    cur = cur.getElementsByClassName(classchain.shift())[0]
  }
  return cur
}

export default domQuery
