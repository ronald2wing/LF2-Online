/*\
 * animator
 [ class ]
 * - animate sprites
 * - support multiple animation sequence on the same image
 - config (object)
 | {
 |   x:0,y:0,     //top left margin of the frames
 |   w:100, h:100,//width, height of a frame
 |   gx:4,gy:4,   //define a gx*gy grid of frames
 |   tar:         //target @sprite
 |   ani:         //[optional] animation sequence:
 |     null,    //if undefined, loop through top left to lower right, row by row
 |     [0,1,2,1,0],//use custom animation sequence
 |   borderright: 1, //[optionals] trim the right edge pixels away
 |   borderbottom: 1,
 |   borderleft: 1,
 |   bordertop: 1
 | }
 * multiple animators reference to the same config, so dont play with it in runtime
 *
 * [example](../sample/sprite1.html)
\*/
export default class Animator {
  constructor(config) {
  this.config = config
  this.target = config.tar
  /*\
   * animator.I
   * current frame
   [ property ]
   * if `config.ani` exists, `I` is the index to this array. otherwise it is the frame number
  \*/
  this.I = 0
  /*\
   * animator.flip_x
   [ property ]
   - (boolean) true: mirrored, false: normal
   * usually a sprite character is drawn to face right and mirrored to face left. hmirror mode works with sprites that is flipped horizontally __as a whole image__.
  \*/
  this.flip_x = false // horizontal mirror
  if (!config.borderright) config.borderright = 0
  if (!config.borderbottom) config.borderbottom = 0
  if (!config.borderleft) config.borderleft = 0
  if (!config.bordertop) config.bordertop = 0
}
/*\
 * animator.next_frame
 * turn to the next frame
 [ method ]
 * if `config.ani` exists, will go to the next frame of animation sequence
 *
 * otherwise, loop through top left to lower right, row by row
 = (number) the frame just shown
 * remarks: if you want to check whether the animation is __ended__, test it against 0. when `animator.I` equals 'max frame index', the last frame is _just_ being shown. when `animator.I` equals 0, the last frame had finished the whole duration of a frame and is _just_ ended.
\*/
next_frame() {
  const config = this.config
  this.I++
  if (!config.ani) {
    if (this.I == config.gx * config.gy) {
      this.I = 0 // repeat sequence
    }
    this.show_frame(this.I)
  } else {
    let frameIndex = config.ani[this.I]
    if (this.I >= config.ani.length || this.I < 0) {
      this.I = 0; frameIndex = config.ani[0] // repeat sequence
    }
    this.show_frame(frameIndex)
  }
  return this.I
}
/*\
 * animator.rewind
 [ method ]
 * return to the first frame of animation sequence
\*/
rewind() {
  this.I = -1
  this.next_frame()
}
/*\
 * animator.set_frame
 [ method ]
 * set to a particular frame
 - i (number) frame number on image
 * the top-left frame is 0
\*/
set_frame(frame) {
  this.I = frame
  this.show_frame(frame)
}
show_frame(frame) {
  const config = this.config
  let left, top
  left = -((frame % config.gx) * config.w + config.x + config.borderleft)
  top = -((Math.floor(frame / config.gx)) * config.h + config.y + config.bordertop)
  if (this.flip_x) { left = -this.target.img[this.target.cur_img].naturalWidth - left + config.w - config.borderleft - config.borderright }
  this.target.set_w_h(
    config.w - config.borderleft - config.borderright,
    config.h - config.bordertop - config.borderbottom
  )
  this.target.set_img_x_y(left, top)
  // may also need to set_x_y to compensate the border
}
}
