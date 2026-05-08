const select = {}

select.selectAll = function (from, where) {
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

select.selectOne = function (from, where) {
  const res = select.selectAll(from, where)
  return res.length === 1 ? res[0] : res.length > 1 ? res : undefined
}

select.lookupTableAbs = function (A, x) {
  x = Math.abs(x)
  let last
  for (const i of Object.keys(A)) {
    last = A[i]
    if (x <= Number(i)) return A[i]
  }
  return last
}

export default select
