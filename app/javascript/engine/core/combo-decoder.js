/*\
 * combo detector
 * - listen key events and detect combo from a controller
 * - maintains a clean sequence of pressed keys and fire events when combo is detected
 * - fighting game style combos
 * - eliminating auto-repeated keys
\*/

/*\
 * combodec
 [ class ]
 - controller (object) a reference to @controller
 - config (object)
 - combo (array) combo definition
 | var con_config=
 | {
 |   up:'h',down:'n',left:'b',right:'m',def:'v',jump:'f',att:'d'
 |   //,'control name':'control key',,,
 | }
 | var con = new controller(con_config);
 | var dec_config=
 | {
 |   timeout: 30,  //[optional] time before clearing the sequence buffer in terms of frames
 |   comboout: 15, //[optional] the max time interval between keys to make a combo,
 |     //an interrupt is inserted when comboout expires
 |   clear_on_combo: true, //[optional] if true, will clear the sequence buffer when a combo occur
 |   callback: dec_callback, //callback function when combo detected
 |   rp: {up:1,down:1,left:2,right:2,def:3,jump:1,att:5}
 |     //[optional] max repeat count of each key, unlimited if not stated
 | };
 | var combo = [
 | {
 |   name: 'blast',  //combo name
 |   seq:  ['def','right','att'], //array of key sequence
 |   maxtime: 10 //[optional] the max allowed time difference between the first and last key input
 |   clear_on_combo: false, //[optional] override generic config
 | } //,,,
 | ];
 | var dec = new combodec ( con, dec_config, combo);
 | function dec_callback(combo)
 | {
 |   alert(combo);
 | }
 *
 * [example](../sample/combo.html)
\*/
export default class ComboDecoder {
  constructor(controller, config, combo) {
    this.time = 1
    /*\
     * combodec.timeout
     - (number) when to clear the sequence buffer
     [ property ]
    \*/
    this.timeout = 0
    /*\
     * combodec.comboout
     - (number) when to interrupt the current combo
     [ property ]
    \*/
    this.comboout = 0
    this.con = controller
    /*\
     * combodec.seq
     - (array) the key input sequence. note that combodec logs key names rather than key stroke,
     * i.e. `up`,`down` rather than `w`,`s`
     - (object) each is `{k:key,t:time}`
     *
     * will be cleared regularly as defined by `config.timeout` or `config.clear_on_combo`
     [ property ]
    \*/
    this.seq = []
    this.config = config
    this.combo = combo
    this.con.child.push(this)
  }

/*\
 * combodec.key
 * supply keys to combodec
  [ method ]
  - keyName (string) key name
  - down (boolean)
 * note that it receives key name, i.e. `up`,`down` rather than `w`,`s`
\*/
key(keyName, down) {
  if (!down) { return }

  const seq = this.seq

  let push = true
  if (this.config.rp) { // detect repeated keys
    for (let i = seq.length - 1, repeatCount = 1; i >= 0 && seq[i] == keyName; i--, repeatCount++) {
      if (repeatCount >= this.config.rp[keyName]) { push = false }
    }
  }

  // eliminate repeated key strokes by browser; discard keys that are already pressed down
  if (this.con.state[keyName]) { push = false }

  if (this.config.timeout) { this.timeout = this.time + this.config.timeout }
  if (this.config.comboout) { this.comboout = this.time + this.config.comboout }

  if (push) { seq.push({ k: keyName, t: this.time }) }

  if (this.combo && push) { // detect combo
    const combos = this.combo
    for (let i in combos) {
      let detected = true
      let j = seq.length - combos[i].seq.length
      if (j < 0) detected = false
      else {
        for (let k = 0; j < seq.length; j++, k++) {
          if (combos[i].seq[k] !== seq[j].k ||
            (combos[i].maxtime !== null && combos[i].maxtime !== undefined && seq[seq.length - 1].t - seq[j].t > combos[i].maxtime)) {
            detected = false
            break
          }
        }
      }
      if (detected) {
        this.config.callback(combos[i])
        if (combos[i].clear_on_combo || (combos[i].clear_on_combo !== false && this.config.clear_on_combo)) { this.clear_seq() }
      }
    }
  }
}

/*\
 * combodec.clear_seq
 * clear the key sequence
 [ method ]
 * normally you would not need to call this manually
\*/
clear_seq() {
  this.seq.length = 0
  this.timeout = this.time - 1
  this.comboout = this.time - 1
}

/*\
 * combodec.frame
 * a tick of time
 [ method ]
\*/
frame() {
  if (this.time === this.timeout) { this.clear_seq() }
  if (this.time === this.comboout) { this.seq.push({ k: '_', t: this.time }) }
  this.time++
}

}
