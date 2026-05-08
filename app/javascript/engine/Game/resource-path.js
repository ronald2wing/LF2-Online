import select from "engine/Game/select"

const resourcePath = {}

resourcePath.basename = function (file) {
  const lastSlash = file.lastIndexOf("/")
  if (lastSlash !== -1) file = file.slice(lastSlash + 1)
  const lastDot = file.lastIndexOf(".js")
  if (lastDot !== -1) file = file.slice(0, lastDot)
  return file
}

resourcePath.setupResourceMap = function (pack) {
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

resourcePath.normalizePath = function (path) {
  if (!path) return ""
  path = path.replace(/\\/g, "/")
  if (!path.endsWith("/")) path += "/"
  return path.startsWith("/") ? path.slice(1) : path
}

resourcePath.parseLocationParams = function () {
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

resourcePath.organizePackDependencies = function (pack) {
  const objects = pack.data.object
  const specials = select.selectAll(objects, object => {
    if (!object.file) return false
    return object.type === "specialattack" || object.type === "effect" || object.type === "broken"
  })
  for (const character of objects) {
    if (character.type !== "character") continue

    const name = resourcePath.basename(character.file)
    const related = select.selectAll(objects, object => {
      if (!object.file) return false
      return resourcePath.basename(object.file).includes(name)
    })
    const seen = {}
    const dependencies = []
    for (const dependency of related.concat(specials)) {
      if (seen[dependency.id]) continue
      seen[dependency.id] = true
      dependencies.push(dependency)
    }
    character.pack = dependencies
  }
}

export default resourcePath
