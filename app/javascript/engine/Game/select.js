const select = {}

select.selectAll = function (source, criteria) {
  const matches = []
  const items = Array.isArray(source) ? source : Object.values(source)
  for (const item of items) {
    let matchesCriteria = true
    if (typeof criteria === "function") {
      matchesCriteria = criteria(item)
    } else {
      for (const key of Object.keys(criteria)) {
        if (item[key] !== criteria[key]) matchesCriteria = false
      }
    }
    if (matchesCriteria) matches.push(item)
  }
  return matches
}

select.selectOne = function (source, criteria) {
  const matches = select.selectAll(source, criteria)
  // Category queries need every match; unique-id queries need a single object.
  return matches.length > 1 ? matches : matches[0]
}

select.lookupTableAbs = function (table, value) {
  const magnitude = Math.abs(value)
  let fallback
  for (const threshold of Object.keys(table)) {
    fallback = table[threshold]
    if (magnitude <= Number(threshold)) return table[threshold]
  }
  return fallback
}

export default select
