// character_selection.js — character selection UI screen (LF2 Online).

import domQuery from "engine/Game/dom-query"
import spriteDOM from "engine/core/sprite-dom"
import animator from "engine/core/animator"
import TouchController from "engine/Game/touchcontroller"
import { show, hide, createTextBox, VerticalMenuDialog, HorizontalNumberDialog } from "engine/Game/manager-dialogs"

export function createCharacterSelection(ctx) {
  return {
    onactive: function () {
      if (ctx.session.control.f.paused) {
        ctx.session.control.f.paused(true)
      }
      // show the on-screen touch controls only on touch devices (P1 is
      // switched to touch by the first touchstart), so the d-pad is usable
      // during character selection without appearing on desktop
      if (ctx.settings.control[0].type === 'touch') {
        ctx.controllers.touch.c.show()
        TouchController.enable(true)
      }
    },
    deactive: function () {
      if (ctx.session.control.f.paused) {
        ctx.session.control.f.paused(false)
      }
    },
    create: function () {
      this.state =
      {
        t: 0,
        step: 0,
        setting_computer: -1
      }

      const bg = new spriteDOM({
        canvas: domQuery.queryUI('character_selection'),
        img: ctx.pack.data.UI.data.character_selection.pic,
        wh: 'fit'
      })

      const players = this.players = []
      for (let i = 0; i < 8; i++) {
        // sprite & animator
        const sp = new spriteDOM({
          canvas: domQuery.queryUI('character_selection'),
          img: ctx.img_list,
          xywh: {
            x: ctx.sel.posx[i % 4],
            y: ctx.sel.posy[i - i % 4],
            w: ctx.sel.box_width,
            h: ctx.sel.box_height
          }
        })
        const ani_config =
        {
          x: 0,
          y: 0, // top left margin of the frames
          w: ctx.sel.box_width,
          h: ctx.sel.box_height, // width, height of a frame
          gx: 10,
          gy: 1, // define a gx*gy grid of frames
          tar: sp // target sprite
        }
        const ani = new animator(ani_config)
        // text boxes
        const textbox = []
        for (let j = 0; j < 3; j++) {
          textbox.push(createTextBox({
            canvas: domQuery.queryUI('character_selection'),
            xywh: {
              x: ctx.sel.posx[i % 4],
              y: ctx.sel.posy[i - i % 4 + j + 1],
              w: ctx.sel.text.box_width,
              h: ctx.sel.text.box_height
            }
          }))
        }
        //
        this.players.push({
          sp: sp,
          ani: ani,
          textbox: textbox
        })
      }

      this.dialog = new VerticalMenuDialog({
        canvas: domQuery.queryUI('character_selection'),
        data: ctx.pack.data.UI.data.vs_mode_dialog,
        html: true,
        valueCounts: [0, 0, 0, ctx.bg_list.length, ctx.diff_list.length, 0],
        valueText: (i, v) => {
          if (i === 3) return ctx.bg_list[v - 1].name   // background: v=0 → bg_list[-1] "Random"
          if (i === 4) return ctx.diff_list[v]          // difficulty
          return ""
        }
      })
      this.how_many = new HorizontalNumberDialog({
        canvas: domQuery.queryUI('character_selection'),
        data: ctx.pack.data.UI.data.how_many_computer_players
      })
      this.options = {}

      this.steps = [
        { // step 0
          // human players select characters
          key: function (i, key) {
            switch (key) {
              case 'att':
                if (ctx.manager._championship_pending && i !== 0) return  // championship: only P1 joins
                players[i].use = true
                players[i].type = 'human'
                players[i].name = ctx.session.player[i] ? ctx.session.player[i].name : ''
                players[i].step < 3 ? players[i].step++ : null
                let finished = true
                for (let k = 0; k < players.length; k++) {
                  finished = finished && (players[k].use ? players[k].step === 3 : true)
                }
                if (finished) {
                  if (ctx.manager._stage_mode_pending || ctx.manager._battle_mode_pending || ctx.manager._championship_pending) {
                    this.set_step(3) // skip computer setup, go to stage/battle/championship setup
                  } else {
                    this.set_step(1)
                  }
                }
                ctx.manager.sound.play('1/m_join')
                break
              case 'jump':
                if (players[i].step > 0) {
                  players[i].step--
                  if (players[i].step === 0) {
                    players[i].use = false
                  }
                }
                ctx.manager.sound.play('1/m_cancel')
                break
              case 'right':
                if (players[i].step === 1) {
                  players[i].selected++
                  if (players[i].selected >= ctx.char_list.length) {
                    players[i].selected = -1
                  }
                }
                if (players[i].step === 2) {
                  players[i].team++
                  if (ctx.manager._battle_mode_pending) {
                    if (players[i].team > 2) players[i].team = 1
                  } else if (players[i].team > 4) {
                    players[i].team = 0
                  }
                }
                break
              case 'left':
                if (players[i].step === 1) {
                  players[i].selected--
                  if (players[i].selected < -1) {
                    players[i].selected = ctx.char_list.length - 1
                  }
                }
                if (players[i].step === 2) {
                  players[i].team--
                  if (ctx.manager._battle_mode_pending) {
                    if (players[i].team < 1) players[i].team = 2
                  } else if (players[i].team < 0) {
                    players[i].team = 4
                  }
                }
                break
            }
          },
          show: function () {
            for (let i = 0; i < players.length; i++) {
              switch (players[i].step) {
                case 0:
                  players[i].textbox[0].innerHTML = 'Join?'
                  players[i].textbox[1].innerHTML = ''
                  players[i].textbox[2].innerHTML = ''
                  players[i].sp.switch_img('waiting')
                  break
                case 1:
                  players[i].textbox[0].style.color = static_color(i)
                  players[i].textbox[0].textContent = players[i].name
                  players[i].textbox[1].innerHTML = ctx.char_list[players[i].selected].name
                  players[i].textbox[2].innerHTML = ''
                  players[i].ani.rewind()
                  players[i].sp.switch_img(players[i].selected)
                  break
                case 2:
                  players[i].textbox[1].style.color = static_color(i)
                  players[i].textbox[2].innerHTML = players[i].team === 0 ? 'Independent' : 'Team ' + players[i].team
                  break
                case 3:
                  players[i].textbox[2].style.color = static_color(i)
                  break
              }
            }
          },
          enter: function () {
            for (let i = 0; i < players.length; i++) {
              players[i].sp.show()
              for (let j = 0; j < players[i].textbox.length; j++) {
                show(players[i].textbox[j])
              }
            }
          },
          leave: function () {
            for (let i = 0; i < players.length; i++) {
              if (!players[i].use) {
                players[i].sp.hide()
                for (let j = 0; j < players[i].textbox.length; j++) {
                  hide(players[i].textbox[j])
                }
              } else {
                players[i].textbox[players[i].textbox.length - 1].style.color = static_color(i)
              }
            }
          }
        },
        {
          // step 1
          // how many computers
          key: function (i, key) {
            switch (key) {
              case 'att':
                this.state.num_of_computers = parseInt(this.how_many.active_item)
                this.set_step(2)
                break
              case 'left':
                this.how_many.navLeft()
                break
              case 'right':
                this.how_many.navRight()
                break
            }
          },
          show: function () {
          },
          enter: function () {
            let low = 0; let high
            let used = 0
            for (let i = 0; i < players.length; i++) {
              if (players[i].use) {
                used++
              }
            }
            high = players.length - used
            let same_team = true
            let last_item
            for (let i = 0; i < players.length; i++) {
              if (players[i].use) {
                if (last_item === undefined) {
                  last_item = i
                } else {
                  same_team = same_team && players[i].team === players[last_item].team && players[i].team !== 0
                }
              }
            }
            if (same_team) {
              low = 1
            }
            this.how_many.init(low, high)
            this.how_many.show()
          },
          leave: function () {
            this.how_many.hide()
          }
        },
        { // step 2
          // select computers
          key: function step1_key(i, key) {
            switch (key) {
              case 'att':
                i = this.state.setting_computer
                players[i].step++
                if (players[i].step === 3) {
                  this.state.already_set_computer++
                  this.steps[this.state.step].next_computer_slot.call(this)
                }
                ctx.manager.sound.play('1/m_join')
                break
              case 'jump':
                i = this.state.setting_computer
                if (players[i].step > 0) {
                  players[i].step--
                }
                ctx.manager.sound.play('1/m_cancel')
                break
              case 'right':
                i = this.state.setting_computer
                if (players[i].step === 1) {
                  players[i].selected++
                  if (players[i].selected >= ctx.char_list.length) {
                    players[i].selected = 0
                  }
                }
                if (players[i].step === 2) {
                  players[i].team++
                  if (players[i].team > 4) {
                    players[i].team = 0
                  }
                }
                break
              case 'left':
                i = this.state.setting_computer
                if (players[i].step === 1) {
                  players[i].selected--
                  if (players[i].selected < 0) {
                    players[i].selected = ctx.char_list.length - 1
                  }
                }
                if (players[i].step === 2) {
                  players[i].team--
                  if (players[i].team < 0) {
                    players[i].team = 4
                  }
                }
                break
            }
          },
          show: function () {
            for (let i = 0; i < players.length; i++) {
              switch (players[i].step) {
                case 0:
                  players[i].name = ctx.AI_list[0].name
                  players[i].textbox[0].textContent = players[i].name
                  players[i].textbox[1].innerHTML = ctx.char_list[players[i].selected].name
                  players[i].textbox[2].innerHTML = ''
                  players[i].ani.rewind()
                  players[i].sp.switch_img(players[i].selected)
                  break
                case 1:
                  players[i].textbox[0].style.color = static_color(i)
                  players[i].textbox[1].innerHTML = ctx.char_list[players[i].selected].name
                  players[i].textbox[2].innerHTML = ''
                  players[i].sp.switch_img(players[i].selected)
                  break
                case 2:
                  players[i].textbox[1].style.color = static_color(i)
                  players[i].textbox[2].innerHTML = players[i].team === 0 ? 'Independent' : 'Team ' + players[i].team
                  break
                case 3:
                  players[i].textbox[2].style.color = static_color(i)
                  break
              }
            }
          },
          enter: function () {
            this.state.already_set_computer = 0
            this.steps[this.state.step].next_computer_slot.call(this)
          },
          next_computer_slot: function () {
            if (this.state.num_of_computers === this.state.already_set_computer) {
              this.set_step(3)
              return
            }
            let next
            for (let i = 0; i < players.length; i++) {
              if (!players[i].use) {
                next = i
                break
              }
            }
            if (next !== undefined) {
              let i = this.state.setting_computer = next
              players[i].use = true
              players[i].step = 1 // skip the AI picker — "Computer" is the only AI
              players[i].selected_AI = 0
              players[i].type = 'computer'
              players[i].sp.show()
              for (let j = 0; j < players[i].textbox.length; j++) {
                show(players[i].textbox[j])
              }
            }
          }
        },
        { // step 3
          // dialog menu
          key: function step2_key(i, key) {
            switch (key) {
              case 'att':
                ctx.manager.sound.play('1/m_ok')
                const active = this.dialog.active_item
                if (active === 3) { this.dialog.cycleValue(3, 1); this._syncOptions(); return } // Background
                if (active === 4) { this.dialog.cycleValue(4, 1); this._syncOptions(); return } // Difficulty
                switch (active) {
                  case 0: ctx.manager.start_match({ players: this.players, options: this.options }); return // Fight!
                  case 1: this.reset(); return          // Reset All
                  case 2: this._resetRandom(); return   // Reset Random
                  case 5: ctx.manager.switch_UI('frontpage'); return // Exit
                }
              case 'jump':
                // cannot go back
                break
              case 'up':
                this.dialog.navUp()
                break
              case 'down':
                this.dialog.navDown()
                break
              case 'left':
                if (this.dialog.valueCounts[this.dialog.active_item]) {
                  this.dialog.cycleValue(this.dialog.active_item, -1)
                  this._syncOptions()
                }
                break
              case 'right':
                if (this.dialog.valueCounts[this.dialog.active_item]) {
                  this.dialog.cycleValue(this.dialog.active_item, 1)
                  this._syncOptions()
                }
                break
            }
          },
          show: function () {
            this.dialog.show()
            for (let i = 0; i < players.length; i++) {
              switch (players[i].step) {
                case 3:
                  players[i].textbox[2].style.color = static_color(i)
                  break
              }
            }
          },
          enter: function () {
            if (ctx.manager._championship_pending) {
              // Championship: skip VS dialog, auto-fill the bracket, go to shuffle screen
              ctx.manager._championship_pending = false
              ctx.manager._build_championship(players[0].selected)
              ctx.manager.switch_UI('championship')
              return
            }
            if (ctx.manager._battle_mode_pending) {
              // Battle mode: skip VS dialog, capture leaders, go to battle setup
              ctx.manager._battle_mode_pending = false
              ctx.manager._battle_leaders = players.filter(p => p.use).map(p => ({
                name: p.name, type: p.type,
                // Resolve "Random" (-1) to an actual character NOW so the setup
                // screen shows the real hero instead of an empty slot.
                selected: p.selected === -1 ? Math.floor(ctx.randomseed.next() * ctx.char_list.length) : p.selected,
                // Battle has no "Independent" team (only 1/2); a leader still on the
                // default team 0 defaults to Team 1, else the auto-fill below would
                // add a computer for BOTH teams (the "3 heroes" bug).
                team: (p.team === 1 || p.team === 2) ? p.team : 1
              }))
              // Auto-fill the opponent team's leader (a random computer hero) so
              // both teams have a leader (official: "each team needs ≥1 hero").
              for (const team of [1, 2]) {
                if (!ctx.manager._battle_leaders.some(L => L.team === team)) {
                  const idx = Math.floor(ctx.randomseed.next() * ctx.char_list.length)
                  ctx.manager._battle_leaders.push({ name: 'Computer', type: 'computer', selected: idx, team: team })
                }
              }
              ctx.manager.switch_UI('battle_setup')
              return
            }
            if (ctx.manager._stage_mode_pending) {
              // In stage mode, skip VS dialog and go to stage select
              ctx.manager._stage_mode_pending = false
              // Store selected character info for stage use
              ctx.manager._stage_char_selected = players[0].selected
              ctx.manager._stage_char_name = players[0].name
              ctx.manager.switch_UI('stage_select')
              return
            }
            this.state.random_slot = {}
            for (let i = 0; i < players.length; i++) {
              if (players[i].selected === -1) {
                this.state.random_slot[i] = true
              }
            }
            this.steps[this.state.step].update_random.call(this)
          },
          update_random: function () {
            for (let i in this.state.random_slot) {
              players[i].selected = Math.floor(ctx.randomseed.next() * ctx.char_list.length)
              players[i].textbox[1].innerHTML = ctx.char_list[players[i].selected].name
              players[i].sp.switch_img(players[i].selected)
            }
          }
        }
      ]

      this.reset()

      function static_color(i) {
        return players[i].type === 'human' ? ctx.sel.text.color[2] : ctx.sel.text.color[3]
      }
    },
    reset: function () {
      const players = this.players
      this.state.step = 0
      this.dialog.hide()
      this.dialog.activateItem(0)
      this.how_many.hide()
      for (let i = 0; i < players.length; i++) {
        players[i].use = false
        players[i].step = 0
        players[i].type = 'human'
        players[i].name = ''
        players[i].team = 0
        players[i].selected = -1
        players[i].selected_AI = 0
      }
      this.options.background = -1
      this.options.difficulty = 2
      this.dialog.setValue(3, 0) // background → Random (-1)
      this.dialog.setValue(4, 2) // difficulty → Difficult
      this.steps[this.state.step].show.call(this)
    },
    // Re-sync each portrait sprite's image map with the current img_list.
    // The lf2.net cheat unlocks more fighters after the sprites are built, so
    // any newly-available portraits must be added here (the "-1" Random and
    // "waiting" keys are already present and left untouched).
    refreshPortraits: function () {
      const players = this.players
      if (!players) return
      for (let i = 0; i < players.length; i++) {
        const sp = players[i].sp
        for (const name in ctx.img_list) {
          if (!(name in sp.img)) {
            sp.add_img(ctx.img_list[name], name)
          }
        }
        // add_img switches the display to each newly-added portrait; restore
        // the player's current view (unjoined slots show "waiting").
        const p = players[i]
        sp.switch_img(p.step === 0 ? 'waiting' : p.selected)
      }
    },
    _syncOptions: function () {
      this.options.background = this.dialog.getValue(3) - 1 // value 0 → -1 (Random)
      this.options.difficulty = this.dialog.getValue(4)
    },

    _resetRandom: function () {
      this.state.random_slot = {}
      for (let i = 0; i < this.players.length; i++) {
        if (this.players[i].selected === -1) this.state.random_slot[i] = true
      }
      this.steps[this.state.step].update_random.call(this)
    },
    key: function (controller_num, key) {
      const players = this.players
      const i = controller_num
      if (this.state.step > 0 && players[i].type !== 'human') {
        return
      }
      this.steps[this.state.step].key.call(this, i, key)
      this.steps[this.state.step].show.call(this)
    },
    set_step: function (newstep) {
      if (this.steps[this.state.step].leave) {
        this.steps[this.state.step].leave.call(this)
      }
      this.state.step = newstep
      if (this.steps[this.state.step].enter) {
        this.steps[this.state.step].enter.call(this)
      }
    },
    frame: function () {
      const players = this.players
      const t = this.state.t
      for (let i in players) {
        switch (players[i].step) {
          case 0:
            if (this.state.step === 0) {
              players[i].ani.set_frame(t % 2)
            }
            players[i].textbox[0].style.color = ctx.sel.text.color[t % 2]
            break
          case 1:
            players[i].textbox[1].style.color = ctx.sel.text.color[t % 2]
            break
          case 2:
            players[i].textbox[2].style.color = ctx.sel.text.color[t % 2]
            break
        }
      }
      for (let i = 0; i < ctx.session.control.length; i++) {
        ctx.session.control[i].fetch()
      }
      ctx.manager.sound.TU()
      this.state.t++
    }
  }
}
