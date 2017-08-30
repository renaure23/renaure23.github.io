
var FPS = 60;
setInterval(function() {
  logic();
  render();
}, 1000/FPS);

// html elements
var can;     // canvas
var ctx;     // context
var log_p;   // log paragraph
var cred_p;  // credits paragraph

var symbols_loaded = false;
var reels_bg_loaded = false;

// art
var symbols = new Image();
var reels_bg = new Image();
var snd_reel_stop = new Array();
var snd_win;

symbols.src = "images/reddit_icons_small.png";
reels_bg.src = "images/reels_bg.png";

snd_win = new Audio("sounds/win.wav");
snd_reel_stop[0] = new Audio("sounds/reel_stop.wav");
snd_reel_stop[1] = new Audio("sounds/reel_stop.wav");
snd_reel_stop[2] = new Audio("sounds/reel_stop.wav");

// enums
var STATE_REST = 0;
var STATE_SPINUP = 1;
var STATE_SPINDOWN = 2;
var STATE_REWARD = 3;

// config
var reel_count = 3;
var reel_positions = 32;
var symbol_size = 32;
var symbol_count = 11;
var reel_pixel_length = reel_positions * symbol_size;
var row_count = 3;
var stopping_distance = 528;
var max_reel_speed = 32;
var spinup_acceleration = 2;
var spindown_acceleration = 1;
var starting_credits = 100;
var reward_delay = 3; // how many frames between each credit tick
var reward_delay_grand = 1; // delay for grand-prize winning
var reward_grand_threshhold = 25; // count faster if the reward is over this size

var match_payout = new Array(symbol_count);
match_payout[7] = 4; // 3Down
match_payout[6] = 6; // 2Down
match_payout[5] = 8; // 1Down
match_payout[1] = 10; // 1Up
match_payout[2] = 15; // 2Up
match_payout[3] = 20; // 3Up
match_payout[4] = 25; // OrangeRed
match_payout[0] = 50; // AlienHead
match_payout[9] = 75; // Bacon
match_payout[10] = 100; // Narwhal
match_payout[8] = 250; // CakeDay

var payout_ups = 6; // Any 3 Ups
var payout_downs = 2; // Any 3 Downs

var reel_area_left = 32;
var reel_area_top = 32;
var reel_area_width = 96;
var reel_area_height = 96;

// set up reels
var reels = new Array(reel_count);
reels[0] = new Array(2,1,7,1,2,7,6,7,3,10,1,6,1,7,3,4,3,2,4,5,0,6,10,5,6,5,8,3,0,9,5,4);
reels[1] = new Array(6,0,10,3,6,7,9,2,5,2,3,1,5,2,1,10,4,5,8,4,7,6,0,1,7,6,3,1,5,9,7,4);
reels[2] = new Array(1,4,2,7,5,6,4,10,7,5,2,0,6,4,10,1,7,6,3,0,5,7,2,3,9,3,5,6,1,8,1,3);

var reel_position = new Array(reel_count);
for (var i=0; i<reel_count; i++) {
  reel_position[i] = Math.floor(Math.random() * reel_positions) * symbol_size;
}

var stopping_position = new Array(reel_count);
var start_slowing = new Array(reel_count);

// reel spin speed in pixels per frame
var reel_speed = new Array(reel_count);
for (var i=0; i<reel_count; i++) {
  reel_speed[i] = 0;
}

var result = new Array(reel_count);
for (var i=0; i<reel_count; i++) {
  result[i] = new Array(row_count);
}

var game_state = STATE_REST;
var credits = starting_credits;
var payout = 0;
var reward_delay_counter = 0;
var playing_lines;

//---- Render Functions ---------------------------------------------

function draw_symbol(symbol_index, x, y) {
  var symbol_pixel = symbol_index * symbol_size;
  ctx.drawImage(symbols, 0,symbol_pixel,symbol_size,symbol_size, x+reel_area_left,y+reel_area_top,symbol_size,symbol_size);
}

function render_reel() {

  // clear reel
  ctx.drawImage(reels_bg, reel_area_left, reel_area_top);

  // set clipping area
  ctx.beginPath();
  ctx.rect(reel_area_left, reel_area_top, reel_area_width, reel_area_height);
  ctx.clip();

  var reel_index;
  var symbol_offset;
  var symbol_index;
  var x;
  var y;

  for (var i=0; i<reel_count; i++) {
    for (var j=0; j<row_count +1; j++) {

      reel_index = Math.floor(reel_position[i] / symbol_size) + j;
      symbol_offset = reel_position[i] % symbol_size;
 
      // reel wrap
      if (reel_index >= reel_positions) reel_index -= reel_positions;

      // symbol lookup
      symbol_index = reels[i][reel_index];

      x = i * symbol_size;
      y = j * symbol_size - symbol_offset;

      draw_symbol(symbol_index, x, y);

    }
  }
}

function highlight_line(line_num) {

  ctx.strokeStyle = "orange";
  var ss = symbol_size;

  // top row
  if (line_num == 2 || line_num == 4) {
    ctx.strokeRect(reel_area_left, reel_area_top, symbol_size-1, symbol_size-1); // top left
  }
  if (line_num == 2) {
    ctx.strokeRect(reel_area_left + ss, reel_area_top, ss-1, ss-1); // top middle
  }
  if (line_num == 2 || line_num == 5) {
    ctx.strokeRect(reel_area_left + ss + ss, reel_area_top, ss-1, ss-1); // top right
  }

  // middle row
  if (line_num == 1) {
    ctx.strokeRect(reel_area_left, reel_area_top + ss, ss-1, ss-1); // top left
  }
  if (line_num == 1 || line_num == 4 || line_num == 5) {
    ctx.strokeRect(reel_area_left + ss, reel_area_top + ss, ss-1, ss-1); // top middle
  }
  if (line_num == 1) {
    ctx.strokeRect(reel_area_left + ss + ss, reel_area_top + ss, ss-1, ss-1); // top right
  }

  // bottom row
  if (line_num == 3 || line_num == 5) {
    ctx.strokeRect(reel_area_left, reel_area_top + ss + ss, ss-1, ss-1); // top left
  }
  if (line_num == 3) {
    ctx.strokeRect(reel_area_left + ss, reel_area_top + ss + ss, ss-1, ss-1); // top middle
  }
  if (line_num == 3 || line_num == 4) {
