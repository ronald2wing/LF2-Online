const util = {}

util.selectAll = function (from, where, option) {
  const res = []
  const items = Array.isArray(from) ? from : Object.values(from)
  for (const O of items) {
    let match = true
    if (typeof where === "function") {
      if (!where(O)) match = false
    } else {
      for (const key of Object.keys(where)) {
        if (O[key] !== where[key]) match = false
      }
    }
    if (match) res.push(O)
  }
  return res
}

util.selectOne = function (from, where, option) {
  const res = util.selectAll(from, where, option)
  return res.length === 1 ? res[0] : res.length > 1 ? res : undefined
}

util.lookupTable = function (A, x) {
  for (const i of Object.keys(A)) {
    if (x <= Number(i)) return A[i]
  }
}

util.lookupTableAbs = function (A, x) {
  x = Math.abs(x)
  let last
  for (const i of Object.keys(A)) {
    last = A[i]
    if (x <= Number(i)) return A[i]
  }
  return last
}

util.shallowCopy = function (obj) {
  return { ...obj }
}

util.queryUI = function (...classchain) {
  if (!util.container) {
    util.root = document.getElementsByClassName("game-root")[0]
    util.container = util.root.getElementsByClassName("container")[0]
  }
  let cur = util.root
  while (classchain.length) {
    cur = cur.getElementsByClassName(classchain.shift())[0]
  }
  return cur
}

util.basename = function (file) {
  const lastSlash = file.lastIndexOf("/")
  if (lastSlash !== -1) file = file.slice(lastSlash + 1)
  const lastDot = file.lastIndexOf(".js")
  if (lastDot !== -1) file = file.slice(0, lastDot)
  return file
}

util.setupResourceMap = function (pack) {
  if (pack.resourcemap && typeof pack.resourcemap.condition === "string") {
    const cond = pack.resourcemap.condition.split(" ")
    if (cond[0] === "location" && cond[1] === "contain" && cond[2]) {
      if (cond[3] === "at" && cond[4]) {
        const pos = parseInt(cond[4])
        pack.resourcemap.condition = () => window.location.href.indexOf(cond[2]) === pos
      } else {
        pack.resourcemap.condition = () => window.location.href.indexOf(cond[2]) !== -1
      }
    }
    if (typeof pack.resourcemap.condition === "function") {
      return [
        pack.resourcemap,
        {
          get(res) { return pack.location + res }
        }
      ]
    }
  }
}

util.normalizePath = function (ppp) {
  if (!ppp) return ""
  ppp = ppp.replace(/\\/g, "/")
  if (ppp.charAt(ppp.length - 1) !== "/") ppp += "/"
  if (ppp.charAt(0) === "/") ppp = ppp.slice(1)
  return ppp
}

util.parseLocationParams = function () {
  const lastSegment = window.location.href.split("/").pop()
  const query = {}
  const queryIndex = lastSegment.indexOf("?")
  if (queryIndex === -1) return query
  for (const pair of lastSegment.slice(queryIndex + 1).split("&")) {
    const [key, value] = pair.split("=")
    if (key) query[key] = value === undefined ? 1 : value
  }
  return query
}

util.organizePackDependencies = function (pack) {
  const specials = util.selectAll(pack.data.object, O => {
    if (!O.file) return false
    return O.type === "specialattack" || O.type === "effect" || O.type === "broken"
  })
  for (let i = 0; i < pack.data.object.length; i++) {
    if (pack.data.object[i].type === "character") {
      const name = util.basename(pack.data.object[i].file)
      const related = util.selectAll(pack.data.object, O => {
        if (!O.file) return false
        return util.basename(O.file).indexOf(name) !== -1
      })
      const seen = {}
      const merged = []
      for (const obj of related) {
        if (!seen[obj.id]) { seen[obj.id] = true; merged.push(obj) }
      }
      for (const sp of specials) {
        if (!seen[sp.id]) { seen[sp.id] = true; merged.push(sp) }
      }
      pack.data.object[i].pack = merged
    }
  }
}

export default util
