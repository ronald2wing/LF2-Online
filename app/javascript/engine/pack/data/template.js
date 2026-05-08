export default {
  bmp: {
    file: [
      { "file(0-69)": "sprite/template/template_0.png", w: 79, h: 79, row: 10, col: 7 },
      { "file(70-139)": "sprite/template/template_1.png", w: 79, h: 79, row: 10, col: 7 }
    ],
    name: "Template",
    head: "sprite/template/template_f.png",
    small: "sprite/template/template_s.png",
    walking_frame_rate: 3,
    walking_speed: 5,
    walking_speedz: 2.5,
    running_frame_rate: 3,
    running_speed: 10,
    running_speedz: 1.6,
    heavy_walking_speed: 3.7,
    heavy_walking_speedz: 1.85,
    heavy_running_speed: 6.2,
    heavy_running_speedz: 1.0,
    jump_height: -16.3,
    jump_distance: 10,
    jump_distancez: 3,
    dash_height: -10,
    dash_distance: 18,
    dash_distancez: 3.75,
    rowing_height: -2,
    rowing_distance: 5
  },
  frame: {
    // ── Standing (0-3) ──
    0: { pic: 0, state: 0, wait: 5, next: 1, dvx: 0, dvy: 0, dvz: 0, centerx: 39, centery: 79, hit_a: 60, hit_d: 110, hit_j: 210,
    bdy: { kind: 0, x: 21, y: 18, w: 43, h: 62 } },
    1: { pic: 1, state: 0, wait: 5, next: 2, dvx: 0, dvy: 0, dvz: 0, centerx: 39, centery: 79, hit_a: 60, hit_d: 110, hit_j: 210,
    bdy: { kind: 0, x: 21, y: 18, w: 43, h: 62 } },
    2: { pic: 2, state: 0, wait: 5, next: 3, dvx: 0, dvy: 0, dvz: 0, centerx: 39, centery: 79, hit_a: 60, hit_d: 110, hit_j: 210,
    bdy: { kind: 0, x: 21, y: 18, w: 43, h: 62 } },
    3: { pic: 3, state: 0, wait: 5, next: 999, dvx: 0, dvy: 0, dvz: 0, centerx: 39, centery: 79, hit_a: 60, hit_d: 110, hit_j: 210,
    bdy: { kind: 0, x: 21, y: 18, w: 43, h: 62 } },
    // ── Walking (5-8) ──
    5: { pic: 4, state: 1, wait: 3, next: 6, dvx: 5, dvy: 0, dvz: 0, centerx: 39, centery: 79, hit_a: 60, hit_d: 110, hit_j: 210,
    bdy: { kind: 0, x: 21, y: 18, w: 43, h: 62 } },
    6: { pic: 5, state: 1, wait: 3, next: 7, dvx: 5, dvy: 0, dvz: 0, centerx: 39, centery: 79, hit_a: 60, hit_d: 110, hit_j: 210,
    bdy: { kind: 0, x: 21, y: 18, w: 43, h: 62 } },
    7: { pic: 6, state: 1, wait: 3, next: 8, dvx: 5, dvy: 0, dvz: 0, centerx: 39, centery: 79, hit_a: 60, hit_d: 110, hit_j: 210,
    bdy: { kind: 0, x: 21, y: 18, w: 43, h: 62 } },
    8: { pic: 7, state: 1, wait: 3, next: 999, dvx: 5, dvy: 0, dvz: 0, centerx: 39, centery: 79, hit_a: 60, hit_d: 110, hit_j: 210,
    bdy: { kind: 0, x: 21, y: 18, w: 43, h: 62 } },
    // ── Running (9-11) ──
    9: { pic: 8, state: 2, wait: 3, next: 10, dvx: 10, dvy: 0, dvz: 0, centerx: 39, centery: 79, hit_a: 85, hit_d: 110, hit_j: 213,
    bdy: { kind: 0, x: 21, y: 18, w: 43, h: 62 } },
    10: { pic: 9, state: 2, wait: 3, next: 11, dvx: 10, dvy: 0, dvz: 0, centerx: 39, centery: 79, hit_a: 85, hit_d: 110, hit_j: 213,
    bdy: { kind: 0, x: 21, y: 18, w: 43, h: 62 } },
    11: { pic: 10, state: 2, wait: 3, next: 999, dvx: 10, dvy: 0, dvz: 0, centerx: 39, centery: 79, hit_a: 85, hit_d: 110, hit_j: 213,
    bdy: { kind: 0, x: 21, y: 18, w: 43, h: 62 } },
    // ── Heavy Walking (12-15) ──
    12: { pic: 11, state: 1, wait: 3, next: 13, dvx: 3.7, dvy: 0, dvz: 0, centerx: 39, centery: 79, hit_a: 60, hit_d: 110, hit_j: 210 },
    13: { pic: 12, state: 1, wait: 3, next: 14, dvx: 3.7, dvy: 0, dvz: 0, centerx: 39, centery: 79, hit_a: 60, hit_d: 110, hit_j: 210 },
    14: { pic: 13, state: 1, wait: 3, next: 15, dvx: 3.7, dvy: 0, dvz: 0, centerx: 39, centery: 79, hit_a: 60, hit_d: 110, hit_j: 210 },
    15: { pic: 14, state: 1, wait: 3, next: 999, dvx: 3.7, dvy: 0, dvz: 0, centerx: 39, centery: 79, hit_a: 60, hit_d: 110, hit_j: 210 },
    // ── Heavy Running (16-18) ──
    16: { pic: 15, state: 2, wait: 3, next: 17, dvx: 6.2, dvy: 0, dvz: 0, centerx: 39, centery: 79, hit_a: 85, hit_d: 110, hit_j: 213 },
    17: { pic: 16, state: 2, wait: 3, next: 18, dvx: 6.2, dvy: 0, dvz: 0, centerx: 39, centery: 79, hit_a: 85, hit_d: 110, hit_j: 213 },
    18: { pic: 17, state: 2, wait: 3, next: 999, dvx: 6.2, dvy: 0, dvz: 0, centerx: 39, centery: 79, hit_a: 85, hit_d: 110, hit_j: 213 },
    // ── Heavy Stop Run (19) ──
    19: { pic: 11, state: 15, wait: 3, next: 999, dvx: 0, dvy: 0, dvz: 0, centerx: 39, centery: 79 },
    // ── Normal Weapon Attack (20-28) ──
    20: { pic: 20, state: 3, wait: 2, next: 21, dvx: 2, dvy: 0, dvz: 0, centerx: 39, centery: 79,
    itr: { kind: 0, x: 30, y: 12, w: 38, h: 58, dvx: 2, fall: 20, bdefend: 16, injury: 30, zwidth: 3, effect: 0 } },
    21: { pic: 21, state: 3, wait: 2, next: 22, dvx: 2, dvy: 0, dvz: 0, centerx: 39, centery: 79,
    itr: { kind: 0, x: 30, y: 14, w: 40, h: 55, dvx: 2, fall: 20, bdefend: 16, injury: 30, zwidth: 3, effect: 0 } },
    22: { pic: 22, state: 3, wait: 2, next: 23, dvx: 2, dvy: 0, dvz: 0, centerx: 39, centery: 79,
    itr: { kind: 0, x: 28, y: 10, w: 42, h: 58, dvx: 4, fall: 20, bdefend: 16, injury: 30, zwidth: 3, effect: 0 } },
    23: { pic: 23, state: 3, wait: 2, next: 24, dvx: 3, dvy: 0, dvz: 0, centerx: 39, centery: 79,
    itr: { kind: 0, x: 25, y: 12, w: 44, h: 54, dvx: 4, fall: 20, bdefend: 16, injury: 30, zwidth: 3, effect: 0 } },
    24: { pic: 24, state: 3, wait: 5, next: 999, dvx: 0, dvy: 0, dvz: 0, centerx: 39, centery: 79 },
    // ── Jump Weapon Attack (30-33) ──
    30: { pic: 30, state: 3, wait: 2, next: 31, dvx: 2, dvy: 0, dvz: 0, centerx: 39, centery: 79,
    itr: { kind: 0, x: 18, y: 8, w: 48, h: 48, dvx: 3, fall: 20, bdefend: 16, injury: 30, zwidth: 2, effect: 0 } },
    31: { pic: 31, state: 3, wait: 2, next: 999, dvx: 2, dvy: 0, dvz: 0, centerx: 39, centery: 79,
    itr: { kind: 0, x: 16, y: 8, w: 50, h: 45, dvx: 3, fall: 20, bdefend: 16, injury: 30, zwidth: 2, effect: 0 } },
    // ── Run Weapon Attack (35-37) ──
    35: { pic: 35, state: 3, wait: 2, next: 36, dvx: 4, dvy: 0, dvz: 0, centerx: 39, centery: 79,
    itr: { kind: 0, x: 20, y: 14, w: 45, h: 45, dvx: 10, fall: 20, bdefend: 16, injury: 30, zwidth: 2, effect: 0 } },
    36: { pic: 36, state: 3, wait: 2, next: 37, dvx: 4, dvy: 0, dvz: 0, centerx: 39, centery: 79 },
    37: { pic: 20, state: 3, wait: 5, next: 999, dvx: 0, dvy: 0, dvz: 0, centerx: 39, centery: 79 },
    // ── Dash Weapon Attack (40-43) ──
    40: { pic: 40, state: 3, wait: 2, next: 41, dvx: 4, dvy: 0, dvz: 0, centerx: 39, centery: 79,
    itr: { kind: 0, x: 18, y: 6, w: 50, h: 50, dvx: 8, fall: 20, bdefend: 16, injury: 30, zwidth: 2, effect: 0 } },
    41: { pic: 41, state: 3, wait: 2, next: 42, dvx: 4, dvy: 0, dvz: 0, centerx: 39, centery: 79 },
    42: { pic: 20, state: 3, wait: 3, next: 999, dvx: 0, dvy: 0, dvz: 0, centerx: 39, centery: 79 },
    // ── Light Weapon Throw (45-47) ──
    45: { pic: 45, state: 3, wait: 2, next: 46, dvx: 2, dvy: 0, dvz: 0, centerx: 39, centery: 79,
    wpoint: { kind: 1, x: 40, y: 48, weaponact: 30, attacking: 0, cover: 1, dvx: 0, dvy: 0, dvz: 0 } },
    46: { pic: 46, state: 3, wait: 2, next: 47, dvx: 2, dvy: 0, dvz: 0, centerx: 39, centery: 79,
    wpoint: { kind: 2, x: 50, y: 40, weaponact: 40, attacking: 0, cover: 1, dvx: 6, dvy: -6, dvz: 0 } },
    47: { pic: 20, state: 3, wait: 5, next: 999, dvx: 0, dvy: 0, dvz: 0, centerx: 39, centery: 79 },
    // ── Heavy Weapon Throw (50-51) ──
    50: { pic: 50, state: 3, wait: 2, next: 51, dvx: 2, dvy: 0, dvz: 0, centerx: 39, centery: 79,
    wpoint: { kind: 1, x: 40, y: 48, weaponact: 30, attacking: 0, cover: 1, dvx: 0, dvy: 0, dvz: 0 } },
    51: { pic: 51, state: 3, wait: 2, next: 999, dvx: 2, dvy: 0, dvz: 0, centerx: 39, centery: 79,
    wpoint: { kind: 2, x: 48, y: 40, weaponact: 20, attacking: 0, cover: 1, dvx: 5, dvy: -10, dvz: 0 } },
    // ── Weapon Drink (55-58) ──
    55: { pic: 55, state: 17, wait: 5, next: 56, dvx: 0, dvy: 0, dvz: 0, centerx: 39, centery: 79,
    wpoint: { kind: 1, x: 40, y: 45, weaponact: 30, attacking: 0, cover: 0, dvx: 0, dvy: 0, dvz: 0 } },
    56: { pic: 56, state: 17, wait: 5, next: 57, dvx: 0, dvy: 0, dvz: 0, centerx: 39, centery: 79,
    wpoint: { kind: 1, x: 38, y: 48, weaponact: 35, attacking: 0, cover: 0, dvx: 0, dvy: 0, dvz: 0 } },
    57: { pic: 57, state: 17, wait: 5, next: 58, dvx: 0, dvy: 0, dvz: 0, centerx: 39, centery: 79 },
    58: { pic: 58, state: 17, wait: 3, next: 999, dvx: 0, dvy: 0, dvz: 0, centerx: 39, centery: 79 },
    // ── Punch (60-65) ──
    60: { pic: 60, state: 3, wait: 2, next: 61, dvx: 1, dvy: 0, dvz: 0, centerx: 39, centery: 79,
    itr: { kind: 0, x: 35, y: 22, w: 34, h: 48, dvx: 2, fall: 20, bdefend: 16, injury: 25, zwidth: 2, effect: 0 } },
    61: { pic: 61, state: 3, wait: 2, next: 62, dvx: 4, dvy: 0, dvz: 0, centerx: 39, centery: 79,
    itr: { kind: 0, x: 30, y: 18, w: 38, h: 48, dvx: 2, fall: 20, bdefend: 16, injury: 25, zwidth: 2, effect: 0 } },
    62: { pic: 62, state: 3, wait: 2, next: 63, dvx: 2, dvy: 0, dvz: 0, centerx: 39, centery: 79,
    itr: { kind: 0, x: 28, y: 16, w: 42, h: 50, dvx: 2, fall: 20, bdefend: 16, injury: 25, zwidth: 2, effect: 0 } },
    63: { pic: 63, state: 3, wait: 2, next: 65, dvx: 3, dvy: 0, dvz: 0, centerx: 39, centery: 79,
    itr: { kind: 0, x: 25, y: 18, w: 45, h: 48, dvx: 10, fall: 20, bdefend: 16, injury: 25, zwidth: 2, effect: 0 } },
    65: { pic: 65, state: 3, wait: 4, next: 999, dvx: 0, dvy: 0, dvz: 0, centerx: 39, centery: 79, hit_a: 65 },
    // ── Super Punch (70-73) ──
    70: { pic: 70, state: 3, wait: 2, next: 71, dvx: 2, dvy: 0, dvz: 0, centerx: 39, centery: 79,
    itr: { kind: 0, x: 35, y: 20, w: 35, h: 48, dvx: 3, fall: 20, bdefend: 30, injury: 35, zwidth: 2, effect: 0 } },
    71: { pic: 71, state: 3, wait: 2, next: 72, dvx: 3, dvy: 0, dvz: 0, centerx: 39, centery: 79,
    itr: { kind: 0, x: 30, y: 18, w: 40, h: 50, dvx: 3, fall: 20, bdefend: 30, injury: 35, zwidth: 2, effect: 0 } },
    72: { pic: 72, state: 3, wait: 2, next: 73, dvx: 4, dvy: 0, dvz: 0, centerx: 39, centery: 79,
    itr: { kind: 0, x: 25, y: 16, w: 45, h: 52, dvx: 12, fall: 30, bdefend: 30, injury: 35, zwidth: 2, effect: 0 } },
    73: { pic: 73, state: 3, wait: 5, next: 999, dvx: 0, dvy: 0, dvz: 0, centerx: 39, centery: 79 },
    // ── Jump Attack (80-81) ──
    80: { pic: 80, state: 3, wait: 2, next: 81, dvx: 2, dvy: 0, dvz: 0, centerx: 39, centery: 79,
    itr: { kind: 0, x: 15, y: 10, w: 52, h: 44, dvx: 4, fall: 20, bdefend: 16, injury: 30, zwidth: 2, effect: 0 } },
    81: { pic: 81, state: 3, wait: 2, next: 999, dvx: 2, dvy: 0, dvz: 0, centerx: 39, centery: 79,
    itr: { kind: 0, x: 12, y: 10, w: 55, h: 45, dvx: 4, fall: 20, bdefend: 16, injury: 30, zwidth: 2, effect: 0 } },
    // ── Run Attack (85-87) ──
    85: { pic: 85, state: 3, wait: 2, next: 86, dvx: 4, dvy: 0, dvz: 0, centerx: 39, centery: 79,
    itr: { kind: 0, x: 30, y: 22, w: 40, h: 38, dvx: 12, fall: 20, bdefend: 16, injury: 30, zwidth: 2, effect: 0 } },
    86: { pic: 86, state: 3, wait: 2, next: 87, dvx: 4, dvy: 0, dvz: 0, centerx: 39, centery: 79,
    itr: { kind: 0, x: 28, y: 20, w: 42, h: 42, dvx: 10, fall: 20, bdefend: 16, injury: 30, zwidth: 2, effect: 0 } },
    87: { pic: 87, state: 3, wait: 5, next: 999, dvx: 0, dvy: 0, dvz: 0, centerx: 39, centery: 79 },
    // ── Dash Attack (90-91) ──
    90: { pic: 90, state: 3, wait: 2, next: 91, dvx: 4, dvy: 0, dvz: 0, centerx: 39, centery: 79,
    itr: { kind: 0, x: 20, y: 8, w: 48, h: 48, dvx: 10, fall: 20, bdefend: 16, injury: 30, zwidth: 2, effect: 0 } },
    91: { pic: 91, state: 3, wait: 3, next: 999, dvx: 0, dvy: 0, dvz: 0, centerx: 39, centery: 79 },
    // ── Dash Defend (95) ──
    95: { pic: 95, state: 7, wait: 5, next: 999, dvx: 0, dvy: 0, dvz: 0, centerx: 39, centery: 79,
    bdy: { kind: 0, x: 21, y: 8, w: 38, h: 58 } },
    // ── Rowing / Get Up Forward (100-101) ──
    100: { pic: 100, state: 6, wait: 2, next: 101, dvx: 5, dvy: -2, dvz: 0, centerx: 39, centery: 79 },
    101: { pic: 101, state: 6, wait: 2, next: 999, dvx: 5, dvy: 0, dvz: 0, centerx: 39, centery: 79 },
    // ── Rowing (102-107) ──
    102: { pic: 102, state: 6, wait: 3, next: 103, dvx: 5, dvy: 0, dvz: 0, centerx: 39, centery: 79 },
    // ── Defend (110-111) ──
    110: { pic: 110, state: 7, wait: 12, next: 999, dvx: 0, dvy: 0, dvz: 0, centerx: 39, centery: 79,
    bdy: { kind: 0, x: 21, y: 18, w: 43, h: 62 } },
    111: { pic: 111, state: 7, wait: 0, next: 110, dvx: 0, dvy: 0, dvz: 0, centerx: 39, centery: 79,
    bdy: { kind: 0, x: 21, y: 18, w: 43, h: 62 } },
    // ── Broken Defend (112-114) ──
    112: { pic: 112, state: 8, wait: 2, next: 113, dvx: -4, dvy: 0, dvz: 0, centerx: 39, centery: 79 },
    113: { pic: 113, state: 8, wait: 2, next: 114, dvx: -2, dvy: 0, dvz: 0, centerx: 39, centery: 79 },
    114: { pic: 114, state: 8, wait: 30, next: 999, dvx: 0, dvy: 0, dvz: 0, centerx: 39, centery: 79 },
    // ── Pick Light Weapon (115) ──
    115: { pic: 115, state: 15, wait: 5, next: 999, dvx: 0, dvy: 0, dvz: 0, centerx: 39, centery: 79 },
    // ── Pick Heavy Weapon (116-117) ──
    116: { pic: 116, state: 15, wait: 5, next: 117, dvx: 0, dvy: 0, dvz: 0, centerx: 39, centery: 79 },
    117: { pic: 116, state: 15, wait: 5, next: 999, dvx: 0, dvy: 0, dvz: 0, centerx: 39, centery: 79 },
    // ── Catching (120-123) ──
    120: { pic: 120, state: 9, wait: 5, next: 121, dvx: 0, dvy: 0, dvz: 0, centerx: 39, centery: 79,
    cpoint: { kind: 1, x: 61, y: 39, vaction: 130, aaction: 122, taction: -232, hurtable: 1, decrease: -7 } },
    121: { pic: 121, state: 9, wait: 0, next: 0, dvx: 0, dvy: 0, dvz: 0, centerx: 39, centery: 79,
    cpoint: { kind: 1, x: 61, y: 39, vaction: 130, aaction: 122, taction: -232, hurtable: 1, decrease: -7 } },
    122: { pic: 120, state: 9, wait: 4, next: 123, dvx: 0, dvy: 0, dvz: 0, centerx: 39, centery: 79 },
    123: { pic: 121, state: 9, wait: 3, next: 121, dvx: 0, dvy: 0, dvz: 0, centerx: 39, centery: 79 },
    // ── Picked Caught (130-131) ──
    130: { pic: 130, state: 10, wait: 3, next: 131, dvx: 0, dvy: 0, dvz: 0, centerx: 39, centery: 79,
    cpoint: { kind: 2, x: 41, y: 39, fronthurtact: 132, backhurtact: 132 } },
    131: { pic: 131, state: 10, wait: 3, next: 0, dvx: 0, dvy: 0, dvz: 0, centerx: 39, centery: 79,
    cpoint: { kind: 2, x: 41, y: 39, fronthurtact: 132, backhurtact: 132 } },
    132: { pic: 132, state: 11, wait: 3, next: 999, dvx: -4, dvy: -4, dvz: 0, centerx: 39, centery: 79 },
    // ── Falling Forward (180-185) ──
    180: { pic: 120, state: 12, wait: 5, next: 181, dvx: -6, dvy: -4, dvz: 0, centerx: 39, centery: 79 },
    181: { pic: 121, state: 12, wait: 5, next: 182, dvx: -3, dvy: -2, dvz: 0, centerx: 39, centery: 79 },
    182: { pic: 122, state: 12, wait: 5, next: 183, dvx: 0, dvy: 0, dvz: 0, centerx: 39, centery: 79 },
    183: { pic: 122, state: 12, wait: 10, next: 999, dvx: 0, dvy: 0, dvz: 0, centerx: 39, centery: 79 },
    // ── Falling Backward (186-191) ──
    186: { pic: 120, state: 12, wait: 5, next: 187, dvx: 6, dvy: -4, dvz: 0, centerx: 39, centery: 79 },
    187: { pic: 121, state: 12, wait: 5, next: 188, dvx: 3, dvy: -2, dvz: 0, centerx: 39, centery: 79 },
    188: { pic: 122, state: 12, wait: 5, next: 189, dvx: 0, dvy: 0, dvz: 0, centerx: 39, centery: 79 },
    189: { pic: 122, state: 12, wait: 10, next: 999, dvx: 0, dvy: 0, dvz: 0, centerx: 39, centery: 79 },
    // ── Ice (200-202) ──
    200: { pic: 130, state: 13, wait: 2, next: 201, dvx: 0, dvy: 0, dvz: 0, centerx: 39, centery: 79 },
    201: { pic: 131, state: 13, wait: 90, next: 202, dvx: 0, dvy: 0, dvz: 0, centerx: 39, centery: 79 },
    202: { pic: 132, state: 13, wait: 4, next: 999, dvx: 0, dvy: 0, dvz: 0, centerx: 39, centery: 79 },
    // ── Fire (203-206) ──
    203: { pic: 133, state: 18, wait: 2, next: 204, dvx: 0, dvy: 0, dvz: 0, centerx: 39, centery: 79 },
    204: { pic: 134, state: 18, wait: 2, next: 205, dvx: 0, dvy: 0, dvz: 0, centerx: 39, centery: 79 },
    205: { pic: 135, state: 18, wait: 2, next: 206, dvx: 0, dvy: 0, dvz: 0, centerx: 39, centery: 79 },
    206: { pic: 136, state: 18, wait: 40, next: 999, dvx: 0, dvy: 0, dvz: 0, centerx: 39, centery: 79 },
    // ── Tired (207) ──
    207: { pic: 2, state: 15, wait: 20, next: 999, dvx: 0, dvy: 0, dvz: 0, centerx: 39, centery: 79 },
    // ── Jump (210-212) ──
    210: { pic: 120, state: 4, wait: 3, next: 211, dvx: 0, dvy: -10, dvz: 0, centerx: 39, centery: 79, hit_a: 80, hit_j: 0,
    bdy: { kind: 0, x: 21, y: 12, w: 43, h: 58 } },
    211: { pic: 121, state: 4, wait: 3, next: 212, dvx: 0, dvy: 0, dvz: 0, centerx: 39, centery: 79, hit_a: 80, hit_j: 0,
    bdy: { kind: 0, x: 21, y: 12, w: 43, h: 58 } },
    212: { pic: 122, state: 4, wait: 3, next: 999, dvx: 0, dvy: 0, dvz: 0, centerx: 39, centery: 79, hit_a: 80, hit_j: 0,
    bdy: { kind: 0, x: 21, y: 12, w: 43, h: 58 } },
    // ── Dash (213-214) ──
    213: { pic: 110, state: 4, wait: 3, next: 214, dvx: 10, dvy: -10, dvz: 0, centerx: 39, centery: 79, hit_a: 90, hit_j: 0,
    bdy: { kind: 0, x: 21, y: 12, w: 43, h: 58 } },
    214: { pic: 111, state: 4, wait: 3, next: 999, dvx: 10, dvy: 0, dvz: 0, centerx: 39, centery: 79, hit_a: 90, hit_j: 0,
    bdy: { kind: 0, x: 21, y: 12, w: 43, h: 58 } },
    // ── Crouch (215) ──
    215: { pic: 100, state: 15, wait: 5, next: 999, dvx: 0, dvy: 0, dvz: 0, centerx: 39, centery: 79, hit_a: 60, hit_d: 110, hit_j: 210,
    bdy: { kind: 0, x: 21, y: 28, w: 43, h: 52 } },
    // ── Stop Running (218) ──
    218: { pic: 2, state: 15, wait: 3, next: 999, dvx: 0, dvy: 0, dvz: 0, centerx: 39, centery: 79 },
    // ── Crouch2 (219) ──
    219: { pic: 100, state: 15, wait: 5, next: 999, dvx: 0, dvy: 0, dvz: 0, centerx: 39, centery: 79 },
    // ── Injured (220-227) ──
    220: { pic: 130, state: 11, wait: 2, next: 221, dvx: -3, dvy: 0, dvz: 0, centerx: 39, centery: 79 },
    221: { pic: 131, state: 11, wait: 4, next: 999, dvx: 0, dvy: 0, dvz: 0, centerx: 39, centery: 79 },
    222: { pic: 130, state: 11, wait: 2, next: 223, dvx: -4, dvy: 0, dvz: 0, centerx: 39, centery: 79 },
    223: { pic: 131, state: 11, wait: 6, next: 999, dvx: 0, dvy: 0, dvz: 0, centerx: 39, centery: 79 },
    224: { pic: 130, state: 11, wait: 2, next: 225, dvx: -5, dvy: 0, dvz: 0, centerx: 39, centery: 79 },
    225: { pic: 131, state: 11, wait: 8, next: 999, dvx: 0, dvy: 0, dvz: 0, centerx: 39, centery: 79 },
    226: { pic: 130, state: 11, wait: 2, next: 227, dvx: -6, dvy: 0, dvz: 0, centerx: 39, centery: 79 },
    227: { pic: 131, state: 11, wait: 10, next: 999, dvx: 0, dvy: 0, dvz: 0, centerx: 39, centery: 79 },
    // ── Lying (230-231) ──
    230: { pic: 132, state: 14, wait: 5, next: 999, dvx: 0, dvy: 0, dvz: 0, centerx: 39, centery: 79 },
    231: { pic: 133, state: 14, wait: 5, next: 999, dvx: 0, dvy: 0, dvz: 0, centerx: 39, centery: 79 },
    // ── Throw Lying Man (232-234) ──
    232: { pic: 110, state: 9, wait: 3, next: 233, dvx: 2, dvy: 0, dvz: 0, centerx: 39, centery: 79,
    bdy: { kind: 0, x: 21, y: 18, w: 43, h: 62 } },
    233: { pic: 110, state: 9, wait: 3, next: 234, dvx: 4, dvy: 0, dvz: 0, centerx: 39, centery: 79,
    bdy: { kind: 0, x: 21, y: 18, w: 43, h: 62 } },
    234: { pic: 110, state: 9, wait: 5, next: 999, dvx: 0, dvy: 0, dvz: 0, centerx: 39, centery: 79,
    bdy: { kind: 0, x: 21, y: 18, w: 43, h: 62 } },
  }
}
