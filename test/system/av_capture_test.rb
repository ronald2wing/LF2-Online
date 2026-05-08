require "application_system_test_case"
require "open3"
require "json"

# Temporary, assertion-free capture harness for Firzen's Arctic Volcano
# (D+^J = defend `z`, up `w`, jump `q`). It drives the real game through the
# browser UI only — key events and DOM reads — and screenshots the effect so it
# can be inspected and measured offline.
#
# The browser window is sized to the game's native 794x550 so the capture is a
# direct 1:1 copy of the canvas pixels (no letterboxing, no upscale, no
# downscale), and the per-frame interval is ~60ms — the official reference
# GIF's own per-frame delay — so a ~400ms decay curve and 1-tick peaks are
# resolved instead of being flattened by a coarse ~150-500ms sampler.
#
# The test never asserts and swallows every error, so it can never turn the
# suite red. It self-verifies each attempt by counting fire/ice pixels against
# a pre-move baseline and re-runs the whole match (up to MAX_ATTEMPTS times)
# until the effect clearly appears.
class AvCaptureTest < ApplicationSystemTestCase
  CAPTURE_ROOT = Rails.root.join("tmp/av-capture")
  WINDOW_W = 794             # native width  (1x capture, no upscale/downscale)
  WINDOW_H = 700             # native height + ~143px browser chrome => viewport 794x557, game at 1x
  FRAME_INTERVAL = 0.06      # ~60ms — the official GIF's per-frame delay
  FRAME_COUNT = 65           # ~3.9s at 60ms — the whole move + dissipation
  MAX_ATTEMPTS = 5
  FIRE_MIN = 1_000           # fire pixel delta that means the cast showed up
  ICE_MIN = 3_000            # ice pixel delta (columns are far larger)
  # Minimum caster↔CPU world-x separation a spawn must satisfy before it is
  # accepted. See the spawn guard in run_attempt for the rationale.
  MIN_SEPARATION = 250

  # Native-scale output. The window is sized to native 794x550, so the raw
  # screenshot is already the 1x canvas pixels; each frame is still emitted as
  # a 1x native copy (794x550) and as a 392x234 window centred on the caster's
  # feet (the player1 name-label), matching the official reference GIF's
  # framing.
  NATIVE_DIR = "native"
  NATIVE_CROP_DIR = "native-crop"
  NATIVE_W = 794
  NATIVE_H = 550
  CROP_W = 392
  CROP_H = 234
  CROP_HALF_W = 196          # CROP_W / 2 — horizontal clamp radius (arena edge)
  CROP_FEET_Y = 205          # feet sit this far from the crop top (29px above bottom)

  test "capture arctic volcano" do
    run_capture
  rescue StandardError => e
    warn "[av-capture] aborted (ignored): #{e.class}: #{e.message}"
  end

  private

  def run_capture
    FileUtils.mkdir_p(CAPTURE_ROOT)
    FileUtils.rm_rf(Dir[CAPTURE_ROOT.join("attempt-*").to_s])
    FileUtils.rm_rf(CAPTURE_ROOT.join(NATIVE_DIR).to_s)
    FileUtils.rm_rf(CAPTURE_ROOT.join(NATIVE_CROP_DIR).to_s)
    puts "[av-capture] capture: #{FRAME_COUNT} frames at #{FRAME_INTERVAL}s nominal interval"

    best = nil
    failures = Hash.new(0)
    MAX_ATTEMPTS.times do |attempt|
      puts "[av-capture] attempt #{attempt + 1}/#{MAX_ATTEMPTS}"
      begin
        fire_max, ice_max, frames, reason = run_attempt(attempt)
        puts "[av-capture]   fire_delta max=#{fire_max}  ice_delta max=#{ice_max}"
        if fire_max >= FIRE_MIN && ice_max >= ICE_MIN
          best = { attempt: attempt + 1, frames: frames }
          puts "[av-capture]   SUCCESS on attempt #{attempt + 1}"
          break
        end
        failures[reason || :no_effect] += 1
        puts "[av-capture]   effect not clearly visible, retrying"
      rescue StandardError => e
        failures[:error] += 1
        warn "[av-capture]   attempt #{attempt + 1} errored (retrying): #{e.class}: #{e.message}"
      end
    end

    report_failure(failures) unless best

    build_montage(best)
    emit_native_outputs(best)
    emit_times(best)
    File.write(CAPTURE_ROOT.join("result.txt").to_s, JSON.pretty_generate(
      best ? { success: true, attempt: best[:attempt], interval: FRAME_INTERVAL, frame_count: FRAME_COUNT, frames: best[:frames].map { |f| File.basename(f) } }
           : { success: false }
    ))
  end

  # Summarise why no attempt produced an acceptable capture, naming the spawn
  # guard(s) that were never satisfied (off-centre / CPU separation) alongside
  # any completed capture whose effect stayed invisible. Print-only: it never
  # raises and never asserts, so the suite stays green.
  def report_failure(failures)
    parts = []
    parts << "Firzen off-centre x#{failures[:off_centre]}" if failures[:off_centre].positive?
    parts << "CPU too close x#{failures[:too_close]}" if failures[:too_close].positive?
    parts << "effect not visible x#{failures[:no_effect]}" if failures[:no_effect].positive?
    parts << "page not ready x#{failures[:not_ready]}" if failures[:not_ready].positive?
    parts << "errored x#{failures[:error]}" if failures[:error].positive?
    detail = parts.empty? ? "unknown reason" : parts.join(", ")
    puts "[av-capture] FAILED: no acceptable spawn after #{MAX_ATTEMPTS} attempts (#{detail})"
  end

  def run_attempt(attempt)
    dir = CAPTURE_ROOT.join("attempt-#{attempt + 1}")
    FileUtils.mkdir_p(dir)

    begin
      page.current_window.resize_to(WINDOW_W, WINDOW_H)
    rescue StandardError => e
      warn "[av-capture]   resize failed (using default): #{e.message}"
    end

    visit "/"
    # Reset persisted settings so `lf2.net` below always toggles the cheat ON
    # (clicking VS mode saves it, which would otherwise flip it off next attempt).
    page.execute_script("localStorage.removeItem('F.Game/settings')")
    visit "/"

    return [ 0, 0, [], :not_ready ] unless page.has_css?(".frontpage_title", visible: false, wait: 15)

    page.find("body").send_keys("lf2.net")  # unlock full roster (Firzen = index 22)

    find(".frontpage_menu_item", visible: false, text: "game start（開始遊戲）").click
    find(".frontpage_mode_item", visible: false, text: "VS mode（對決模式）").click
    return [ 0, 0, [], :not_ready ] unless page.has_css?(".character_selection", wait: 10)

    # P1: join, pick Firzen, team, done.
    press("s")
    sleep 0.3
    23.times { press("d") }
    sleep 0.5
    press("s")  # team
    sleep 0.2
    press("s")  # done -> how-many-computers
    sleep 0.3

    log_p1_selection

    # One computer (dialog default), then computer char + team.
    press("s")  # how many computers = 1
    sleep 0.2
    press("s")  # computer char -> team
    sleep 0.2
    press("s")  # computer team -> done -> VS dialog
    sleep 0.3

    select_wide_stage_and_easy
    press("s")  # Fight!
    sleep 0.2

    # Both characters spawn asynchronously; their name labels are the signal.
    return [ 0, 0, [], :not_ready ] unless page.has_css?(".char_name_label", minimum: 2, wait: 10)

    sleep 1.5  # let the spawn/landing animation finish so Firzen is standing idle
    baseline = dir.join("base.png").to_s
    page.save_screenshot(baseline)

    # Record the name-label screen positions (native canvas coords) so the
    # measurement can pin Firzen (P1) and the CPU (P2) even if the stage has
    # green scenery that confuses hair detection.
    labels = read_labels
    File.write(dir.join("labels.json").to_s, JSON.pretty_generate(labels))

    # The match spawns both fighters at random world positions, so Firzen can
    # land off-frame (label X past either edge) — the crop and the effect
    # measurement are then unusable. Require the caster near screen centre so
    # both flank columns (≈−105/+135px from the caster) and the 392px crop
    # (≈±196px) stay inside the 794px frame. Treat an off-centre spawn as a
    # failed attempt so run_capture re-rolls it.
    p1_x = labels&.find { |l| l["text"] == "player1" }&.dig("left")&.to_f
    if p1_x.nil? || p1_x < 220 || p1_x > 574
      puts "[av-capture]   Firzen off-centre (label x=#{p1_x.inspect}), re-rolling spawn"
      return [ 0, 0, [], :off_centre ]
    end

    # The CPU spawns at a random world x anywhere across the ~2400px Stanley
    # Prison stage, so it can land right on top of Firzen. A too-close CPU is
    # engulfed by the fire explosion (contaminating its width measurement) and
    # trips the barrage balls' chase (hit_Fa: 7), so the balls detonate on it
    # almost immediately and their arc/apex can't be measured at all. Both name
    # labels share the same camX offset, so their screen-x delta equals the
    # world-x separation exactly. Require at least MIN_SEPARATION px and re-roll
    # a spawn that violates it, mirroring the off-centre guard above.
    cpu_x = labels&.find { |l| l["text"] == "Com" }&.dig("left")&.to_f
    separation = (cpu_x && p1_x) ? (p1_x - cpu_x).abs : nil
    if separation.nil? || separation < MIN_SEPARATION
      puts "[av-capture]   CPU too close (sep=#{separation.inspect}, need >=#{MIN_SEPARATION}), re-rolling spawn"
      return [ 0, 0, [], :too_close ]
    end
    puts "[av-capture]   spawn accepted: caster x=#{format('%.2f', p1_x)} " \
         "CPU x=#{format('%.2f', cpu_x)} separation=#{format('%.2f', separation)}px"

    # Record the game window's on-screen rect so each frame can be cropped out
    # of the screenshot and (if the window is ever letterboxed) resized to
    # exact 794x550 native.
    viewport = read_viewport
    File.write(dir.join("viewport.json").to_s, JSON.pretty_generate(viewport || {}))

    # Each frame's wall-clock timestamp (monotonic seconds since the cast) is
    # recorded alongside the screenshot so the measurement can map frame -> ms
    # exactly, independent of screenshot latency. The actual cadence is the
    # interval between timestamps, not the sleep alone.
    page.find("body").send_keys("zwq")  # fire D+^J as one fast burst
    t0 = Process.clock_gettime(Process::CLOCK_MONOTONIC)

    frames = []
    times = []
    FRAME_COUNT.times do |i|
      sleep FRAME_INTERVAL
      path = dir.join("f-#{format('%02d', i)}.png").to_s
      page.save_screenshot(path)
      frames << path
      times << (Process.clock_gettime(Process::CLOCK_MONOTONIC) - t0)
    end
    File.write(dir.join("times.json").to_s, JSON.pretty_generate(times))

    [ *verify_effect(baseline, frames), frames, nil ]
  end

  # VS dialog items: 0 Fight, 1 Reset All, 2 Reset Random, 3 Background,
  # 4 Difficulty, 5 Exit. Pick Stanley Prison (grey, 2400 wide, no green
  # scenery) + Easy difficulty so the CPU starts far away and stays passive.
  def select_wide_stage_and_easy
    3.times { press("x") }      # -> 3 Background
    3.times { press("d") }      # value 0 (Random) -> 3 (Stanley Prison)
    press("x")                  # -> 4 Difficulty
    2.times { press("a") }      # value 2 (Difficult) -> 0 (Easy)
    4.times { press("w") }      # -> 0 Fight
    sleep 0.3
  end

  def read_labels
    page.evaluate_script(
      "Array.from(document.querySelectorAll('.char_name_label')).map(function (l) { " \
      "return { text: l.textContent, left: parseFloat(l.style.left), top: parseFloat(l.style.top) } })"
    )
  rescue StandardError
    []
  end

  # On-screen rect of the 794x550 game window (viewport coords). Cropping this
  # out of a full-page screenshot and resizing to 794x550 recovers the 1x
  # native frame regardless of how the browser letterboxes the game.
  def read_viewport
    page.evaluate_script(
      "(function () { var w = document.querySelector('.window'); if (!w) return null; " \
      "var r = w.getBoundingClientRect(); " \
      "return { left: r.left, top: r.top, width: r.width, height: r.height }; })()"
    )
  rescue StandardError => e
    warn "[av-capture]   read_viewport failed (ignored): #{e.class}: #{e.message}"
    nil
  end

  def press(key)
    page.find("body").send_keys(key)
  end

  def log_p1_selection
    name = page.evaluate_script(
      "var b = document.querySelectorAll('.character_selection .textbox'); b[1] ? b[1].textContent : ''"
    )
    puts "[av-capture]   P1 selected: #{name.inspect}"
  rescue StandardError
    nil
  end

  # The fire/ice pixel counts are computed inline (no external helper) so the
  # test works from a fresh checkout with nothing under /tmp. Pixels are read
  # as raw RGBA via `magick` (already used by build_montage below) and classed
  # by colour: fire = warm red/orange dominance; ice = the bright cyan of the
  # frozen column. Firzen's own dark-blue body has a low green channel, so it
  # is not counted as ice. Deltas against the pre-move baseline cancel out the
  # character's own warm/cool body pixels and isolate the cast.
  def verify_effect(baseline, frames)
    base_fire, base_ice = count_fire_ice(baseline)
    fire_max = ice_max = 0
    frames.each do |frame|
      fire, ice = count_fire_ice(frame)
      fire_max = [ fire_max, fire - base_fire ].max
      ice_max = [ ice_max, ice - base_ice ].max
    end
    [ fire_max, ice_max ]
  rescue StandardError => e
    warn "[av-capture]   verify failed (treated as no-effect): #{e.message}"
    [ 0, 0 ]
  end

  def count_fire_ice(path)
    raw = Open3.capture2("magick", path.to_s, "-depth", "8", "rgba:-").first.b
    fire = ice = 0
    i = 0
    n = raw.bytesize
    while i < n
      r = raw.getbyte(i)
      g = raw.getbyte(i + 1)
      b = raw.getbyte(i + 2)
      a = raw.getbyte(i + 3)
      if a >= 128
        fire += 1 if r > 150 && r - g > 40 && r - b > 40
        ice += 1 if b > 150 && g > 150 && r < 150
      end
      i += 4
    end
    [ fire, ice ]
  end

  # Most recent attempt directory as a Pathname (so `.join` below works the
  # same whether `best` was chosen or we fall back to the last attempt). The
  # glob returns Strings, hence the explicit Pathname wrap; nil when none yet.
  def last_attempt_dir
    last = Dir[CAPTURE_ROOT.join("attempt-*").to_s].sort.last
    last && Pathname(last)
  end

  def build_montage(best)
    frames = if best
               best[:frames]
    else
               last = last_attempt_dir
               last ? Dir[last.join("f-*.png").to_s].sort : []
    end
    return if frames.empty?

    ok = system("magick", "montage", *frames, "-tile", "4x", "-geometry", "+4+4",
                CAPTURE_ROOT.join("montage.png").to_s)
    puts "[av-capture] montage #{ok ? 'built' : 'FAILED'} -> #{CAPTURE_ROOT.join('montage.png')}"
  end

  # Emit the 1x-native frame (game window cropped from the screenshot and
  # resized to 794x550) and the 392x234 caster-centred crop for the baseline
  # and every frame of the chosen attempt. Never raises; failures only warn.
  def emit_native_outputs(best)
    dir = if best
            CAPTURE_ROOT.join("attempt-#{best[:attempt]}")
    else
            last_attempt_dir
    end
    return unless dir

    labels = read_json(dir.join("labels.json"))
    viewport = read_json(dir.join("viewport.json"))
    feet = labels&.find { |l| l["text"] == "player1" }
    return unless feet && viewport && viewport["width"].to_f.positive?

    native_dir = CAPTURE_ROOT.join(NATIVE_DIR)
    crop_dir = CAPTURE_ROOT.join(NATIVE_CROP_DIR)
    FileUtils.mkdir_p(native_dir)
    FileUtils.mkdir_p(crop_dir)

    # The caster's centre-x comes from his SHADOW (the dark ellipse the engine
    # draws centred exactly on ps.x — the same axis the fire explosion and the
    # flanking ice columns are placed about). It is symmetric, so unlike the old
    # gold-trim anchor it is facing-independent and sits on the true centre
    # instead of ~32px off it. The label's Y (feet) is reliable and is kept.
    # The label's X is used only as a search seed + cross-check: it carries a
    # fractional camera-scroll offset (update_char_labels uses the float
    # cameraX while the foreground layer is pixel-snapped with `| 0`), so it is
    # not trusted as the anchor itself.
    base_src = dir.join("base.png").to_s
    base_native = native_dir.join("base.png").to_s
    anchor = nil
    if extract_native(base_src, base_native, viewport)
      anchor = detect_caster_x(base_native, feet["left"].to_f, feet["top"].to_f)
    end
    detected_x = anchor&.dig(:x)
    caster = { "left" => (detected_x || feet["left"].to_f), "top" => feet["top"].to_f }

    sources = [ base_src ] + Dir[dir.join("f-*.png").to_s].sort
    sources.each do |src|
      native = native_dir.join(File.basename(src)).to_s
      next if src == base_src # already extracted above
      next unless extract_native(src, native, viewport)
      extract_native_crop(native, crop_dir.join(File.basename(src)).to_s, caster)
    end
    extract_native_crop(base_native, crop_dir.join("base.png").to_s, caster)

    left, top, clamped_x, clamped_y = crop_box(caster)
    File.write(CAPTURE_ROOT.join("native-meta.json").to_s, JSON.pretty_generate(
      feet: feet,
      caster: caster,
      detected_x: detected_x,
      anchor: anchor,
      viewport: viewport,
      crop: { left: left, top: top, width: CROP_W, height: CROP_H },
      clamped: { x: clamped_x, y: clamped_y },
      note: (clamped_x || clamped_y) ? "crop clamped to arena edge" : "crop unclamped"
    ))
    if anchor
      puts "[av-capture] caster x=#{format('%.2f', anchor[:x])} " \
           "(shadow, ±#{format('%.2f', anchor[:std_err])}px, #{anchor[:width]}px wide, " \
           "label delta #{format('%.2f', anchor[:label_agreement])}px, " \
           "confidence #{anchor[:confidence]})"
    else
      puts "[av-capture] caster x=#{format('%.2f', feet['left'].to_f)} " \
           "(shadow not found, label fallback, confidence low)"
    end
    puts "[av-capture] native frames -> #{native_dir}"
    puts "[av-capture] native crops -> #{crop_dir} (clamped: x=#{clamped_x}, y=#{clamped_y})"
  rescue StandardError => e
    warn "[av-capture] native output failed (ignored): #{e.class}: #{e.message}"
  end

  # Copy the chosen attempt's per-frame timestamps to the capture root and
  # report the measured cadence so the capture is self-describing. Never
  # raises; a missing times.json only warns.
  def emit_times(best)
    dir = if best
            CAPTURE_ROOT.join("attempt-#{best[:attempt]}")
    else
            last_attempt_dir
    end
    return unless dir

    src = dir.join("times.json")
    return unless File.exist?(src)

    FileUtils.cp(src, CAPTURE_ROOT.join("times.json"))
    times = JSON.parse(File.read(src))
    deltas = times.each_cons(2).map { |a, b| b - a }
    return if deltas.empty?

    avg = deltas.sum / deltas.size
    puts "[av-capture] frame cadence: min=#{(deltas.min * 1000).round}ms " \
         "avg=#{(avg * 1000).round}ms max=#{(deltas.max * 1000).round}ms " \
         "span=#{(times.last * 1000).round}ms over #{times.size} frames"
  rescue StandardError => e
    warn "[av-capture] times output failed (ignored): #{e.class}: #{e.message}"
  end

  def extract_native(src, dst, viewport)
    w = viewport["width"].to_f.round
    h = viewport["height"].to_f.round
    x = viewport["left"].to_f.round
    y = viewport["top"].to_f.round
    return false unless w.positive? && h.positive?

    system("magick", src, "-crop", "#{w}x#{h}+#{x}+#{y}", "+repage",
           "-resize", "#{NATIVE_W}x#{NATIVE_H}!", dst)
  end

  def extract_native_crop(native_src, dst, feet)
    left, top, = crop_box(feet)
    system("magick", native_src, "-crop", "#{CROP_W}x#{CROP_H}+#{left}+#{top}", "+repage", dst)
  end

  # Firzen's centre-x in the native baseline, found by his SHADOW — the dark
  # ellipse the engine draws under his feet, centred exactly on ps.x
  # (mechanics.js: `shadow.set_x_y(floor(ps.x - shadow.x), floor(ps.z - shadow.y))`,
  # with no facing term). ps.x is the axis the Arctic Volcano places its fire
  # explosion (make_point resolves to ps.x + 1) and its flanking ice columns
  # (±~90-110px) about, so the shadow's centroid is the ground-truth reference.
  #
  # The shadow is a symmetric ellipse, so unlike the old gold-trim anchor it
  # cannot drift or flip with facing. It renders as a fixed rgb(72,66,61) (a
  # 50%-opacity dark ellipse over the flat grey floor), matched by exact colour
  # rather than a luminance heuristic, so the blue body, the gold trim, the
  # warm fire, and any nearby opponent all fall outside the match.
  #
  # Returns a hash { x:, std:, std_err:, width:, count:, label_x:,
  # label_agreement:, confidence: }. `std_err` is the centroid's ±px
  # uncertainty (spread / sqrt(count)); the `std` alone is the ellipse's own
  # width, not the anchor error. Returns nil (caller falls back to the label
  # X) if no shadow is found, so a detection miss can never break the crop.
  def detect_caster_x(native_path, label_x, label_y)
    raw = Open3.capture2("magick", native_path, "-depth", "8", "rgba:-").first.b
    # The shadow is a fixed 50%-opacity dark ellipse over the flat grey Stanley
    # Prison floor, so it always renders as rgb(72,66,61). Match that exact
    # colour (small tolerance for the antialiased edge) rather than a
    # luminance/saturation heuristic: the character's dark outline (40,40,40),
    # his saturated blue body, the gold trim, and any nearby opponent's body
    # are all far from this colour, so they can no longer leak into the band.
    y0 = [ (label_y - 6).floor, 0 ].max
    y1 = [ (label_y + 6).ceil, NATIVE_H - 1 ].min
    x0 = [ (label_x - 80).floor, 0 ].max
    x1 = [ (label_x + 80).ceil, NATIVE_W - 1 ].min

    sum_x = 0.0
    sum_x2 = 0.0
    count = 0
    min_x = x1
    max_x = x0
    (y0..y1).each do |y|
      (x0..x1).each do |x|
        i = (y * NATIVE_W + x) * 4
        r = raw.getbyte(i)
        g = raw.getbyte(i + 1)
        b = raw.getbyte(i + 2)
        a = raw.getbyte(i + 3)
        next if a < 128
        # Sum of absolute channel deltas from the shadow colour; the flat grey
        # floor is 44 away, so this threshold admits only the ellipse and its
        # antialiased rim.
        next unless (r - 72).abs + (g - 66).abs + (b - 61).abs < 30
        sum_x += x
        sum_x2 += x * x
        count += 1
        min_x = x if x < min_x
        max_x = x if x > max_x
      end
    end
    return nil if count.zero?

    mean = sum_x / count
    std = Math.sqrt([ sum_x2 / count - mean * mean, 0.0 ].max)
    std_err = std / Math.sqrt(count)
    width = max_x - min_x + 1
    agreement = (mean - label_x).abs
    # Confidence is judged on the shadow's own shape (a clean shadow is a solid
    # ~30-45px ellipse of >=60px). It deliberately does NOT use the label
    # agreement: the label is read a beat after the baseline screenshot, so any
    # camera scroll between the two shows up as a label-vs-shadow delta that is
    # not an anchor error.
    confidence = if count >= 60 && width >= 25 && width <= 45
                   "high"
    elsif count >= 20 && width >= 15
                   "medium"
    else
                   "low"
    end
    { x: mean, std: std, std_err: std_err, width: width, count: count,
      label_x: label_x, label_agreement: agreement, confidence: confidence }
  end

  # 392x234 window centred on the caster's feet. Horizontally centred with a
  # 196px clamp so the crop never leaves the arena; vertically the feet sit at
  # CROP_FEET_Y (29px above the crop bottom) so the upward eruption stays in
  # frame, matching the official reference.
  def crop_box(feet)
    feet_x = feet["left"].to_f
    feet_y = feet["top"].to_f
    left = (feet_x - CROP_HALF_W).round.clamp(0, NATIVE_W - CROP_W)
    top = (feet_y - CROP_FEET_Y).round.clamp(0, NATIVE_H - CROP_H)
    clamped_x = (feet_x - CROP_HALF_W).round != left
    clamped_y = (feet_y - CROP_FEET_Y).round != top
    [ left, top, clamped_x, clamped_y ]
  end

  def read_json(path)
    return nil unless File.exist?(path)
    JSON.parse(File.read(path))
  rescue StandardError
    nil
  end
end
