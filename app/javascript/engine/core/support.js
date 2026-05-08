const support = {};

// test for css 2d transform support
// [--adapted from https://gist.github.com/3626934
(function () {
  const el = document.createElement('p'); let transform
  const transforms = {
    WebkitTransform: '-webkit-transform',
    OTransform: '-o-transform',
    MSTransform: '-ms-transform',
    MozTransform: '-moz-transform',
    transform: 'transform'
  }

  /* Add it to the body to get the computed style. */
  document.getElementsByTagName('body')[0].appendChild(el)

  for (transform in transforms) {
    if (el.style[transform] !== undefined) {
      let matrix
      matrix = 'matrix(1, 0, 0, 1, 0, 0)'
      el.style[transform] = matrix
      if (matrix === window.getComputedStyle(el).getPropertyValue(transforms[transform])) { support.css2dtransform = transform }

      matrix = 'matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 1, 1, 1)'
      el.style[transform] = matrix
      if (window.getComputedStyle(el).getPropertyValue(transforms[transform]).indexOf('matrix3d') === 0) { support.css3dtransform = transform }
    }
  }

  el.parentNode.removeChild(el)
}())
// --] end

support.localStorage = window.localStorage

export default support
