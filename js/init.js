var main_loop, palette;
var playing = false;
var last_clock = Date.now();
var refreshrate = 100;
var clockrate = 300;
var semitones = 60;
var firesync = false;
var mode_down = false;
var steps_down = false;
var swing_down = false;
var dur_down = false;
var keypad_down = false;
var dragging = false;
var dragstart = 0;
var dragstop = 0;
var incrementor = 1;
var swing_amount = 0;
var dur_amount = 1;

let modes = ['1sequencer', '2sequencer', '4sequencer'];
var mode = 0;
var logic = 'none';

var grid = {
  'rows': ['a', 'b', 'c', 'd'],
  'columns': ['1', '2', '3', '4']
};
var indicator = ['#' + grid.rows[0] + grid.columns[0]];
var pagesize = grid.rows.length * grid.columns.length;
var stepcount = pagesize / indicator.length;
var direction = 'ltr'; // not used
var pointer = 0;
var current_page = 0;
var current_row = 0;
var current_column = 0;

var indicator_color = 'rgb(255, 255, 255)';
var trigger_color = 'rgb(0, 255, 255)';
var inactive_color = 'rgb(100, 100, 100)';
var active_color = 'rgb(240, 240, 255)';


var pattern = [
  [1, 55, 0, 0], [0, 23, 0, 0], [0, 43, 0, 0], [0, 45, 0, 0], 
  [0, 43, 0, 0], [0, 21, 0, 0], [1, 23, 0, 0], [0, 43, 0, 0], 
  [0, 60, 0, 0], [1, 32, 0, 0], [0, 33, 0, 0], [1, 44, 0, 0], 
  [0, 11, 0, 0], [0, 22, 0, 0], [1, 33, 0, 0], [1, 50, 0, 0],
  [1, 43, 0, 0], [0, 12, 0, 0], [1, 54, 0, 0], [0, 23, 0, 0], 
  [0, 54, 0, 0], [1, 21, 0, 0], [0, 23, 0, 0], [1, 12, 0, 0], 
  [1, 60, 0, 0], [1, 32, 0, 0], [1, 33, 0, 0], [1, 44, 0, 0], 
  [0, 11, 0, 0], [0, 22, 0, 0], [1, 33, 0, 0], [1, 50, 0, 0],
  [1, 45, 0, 0], [0, 23, 0, 0], [0, 43, 0, 0], [0, 45, 0, 0], 
  [0, 43, 0, 0], [1, 32, 0, 0], [1, 23, 0, 0], [0, 43, 0, 0], 
  [1, 60, 0, 0], [0, 32, 0, 0], [0, 33, 0, 0], [1, 44, 0, 0], 
  [0, 11, 0, 0], [0, 22, 0, 0], [0, 33, 0, 0], [1, 50, 0, 0],
  [1, 60, 0, 0], [0, 23, 0, 0], [1, 43, 0, 0], [0, 45, 0, 0], 
  [0, 43, 0, 0], [1, 21, 0, 0], [1, 23, 0, 0], [0, 43, 0, 0], 
  [0, 60, 0, 0], [1, 32, 0, 0], [0, 33, 0, 0], [1, 44, 0, 0], 
  [1, 11, 0, 0], [0, 22, 0, 0], [1, 33, 0, 0], [1, 50, 0, 0]
];
var current_state = pattern.slice(pointer, pagesize);

function hslToRgb(h, s, l) {
  var r, g, b;

  if (s == 0) {
      r = g = b = l; // achromatic
  } else {
    function hue2rgb(p, q, t) {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    }
    
    var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    var p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return [r * 255, g * 255, b * 255];
}

function cmap_rainbow(valcnt, cyclelen = null, s = 100, l = 50, stepsize=1) {
  if (cyclelen == null) {
    cyclelen = valcnt;
  }
  var cm = new Array(valcnt);
  if (cyclelen <= 2) {
    	var step = 360;
  } else {
    	var step = 360. / (cyclelen - 1);
  }
  for (var i = 0; i < valcnt * stepsize; i += stepsize) {
    let h = Math.round((i % cyclelen) * step);
    let rgb = hslToRgb(h / 360., s / 100., l / 100.);
    cm[i] = 'rgb(' + Math.round(rgb[0]) + ',' +
        Math.round(rgb[1]) + ',' + Math.round(rgb[2]) + ')';
  }
  return cm;
}

function increment(amount) {
  last_clock = Date.now();
  firesync = false;
  pointer += amount;
  if (amount > 0) {
    if (pointer >= stepcount) {
      current_page++;
      if (current_page >= Math.round(pattern.length / pagesize)) {
        current_page = 0;
        firesync = true;
      }
      pointer = 0;
    }
  } else if (amount < 0) {
    if (pointer < 0) {
      current_page--;
      if (current_page < 0) {
        current_page = Math.round(pattern.length / pagesize) - 1;
        firesync = true;
      }
      pointer = stepcount-1;
    }
  }
  current_state = pattern.slice(pagesize * current_page, pagesize * (current_page + 1));
  current_row = Math.floor(pointer / grid.columns.length);
  current_column = pointer % grid.rows.length;
  switch(mode) {
    case 3:
      indicator = [
        '#'+grid.rows[0]+grid.columns[current_column],
        '#'+grid.rows[1]+grid.columns[current_column],
        '#'+grid.rows[2]+grid.columns[current_column],
        '#'+grid.rows[3]+grid.columns[current_column]
      ];
      logic = 'xor';
    break;
    case 2:
      indicator = [
        '#'+grid.rows[0]+grid.columns[current_column],
        '#'+grid.rows[1]+grid.columns[current_column],
        '#'+grid.rows[2]+grid.columns[current_column],
        '#'+grid.rows[3]+grid.columns[current_column]
      ];
      logic = 'xor';
    break;
    case 1:
      indicator = [
        '#'+grid.rows[current_row]+grid.columns[current_column],
        '#'+grid.rows[current_row + 2]+grid.columns[current_column]
      ];
      logic = 'xor';
    break;
    case 0:
    default:
      indicator = ['#'+grid.rows[current_row]+grid.columns[current_column]];
      logic = 'none';
    break;
  }
  stepcount = pagesize / indicator.length;
}

function getIndex(row, column) {
  return (row * grid.columns.length) + column;
}

function draw() {
  $.each(grid.rows, function(y, row) {
    $.each(grid.columns, function(x, column) {
      var index = getIndex(y, x);
      var colorvalue = indicator.includes('#'+row+column) ? (current_state[index][0] ? trigger_color : indicator_color) : (current_state[index][0] ? palette[current_state[index][1] - 1] : inactive_color);
      $('#'+row+column).find('path').css('fill', colorvalue);
    });
    var outindex = getIndex(y, current_column);
    var outputcolorvalue = indicator.includes('#'+row+grid.columns[current_column]) && current_state[outindex][0] ? palette[current_state[outindex][1] - 1] : inactive_color;
    $('#'+row+' path').css('fill', outputcolorvalue);
  });
  $('#abcd path').css('fill', (current_state[pointer][0] ? palette[current_state[pointer][1] - 1] : inactive_color));
  $('#sync path').css('fill', (firesync ? active_color : inactive_color));
}


function runtime() {
  if (Date.now() - last_clock > clockrate && playing) {
    increment(incrementor);
  }
  draw();
}

$(function() {
  palette = cmap_rainbow(semitones, 320);
  main_loop = setInterval(runtime, refreshrate);
  $.each(grid.rows, function(y, row) {
    $.each(grid.columns, function(x, column) {
      $('#'+row+column).find('path').mousedown(function(e) {
        keypad_index = (current_page * pagesize) + getIndex(y, x);
        keypad_down = true;
        dragstart = e.pageY;
      });
    });
  });
  $('#steps').mousedown(function(e) {
    steps_down = true;
    dragstart = e.pageY;
  });
  $('#steps').mouseup(function(e) {
    if (!dragging) {
      playing = !playing;
    }
  });
  $('#mode').mousedown(function(e) {
    mode_down = true;
    dragstart = e.pageY;
  });
  $('#mode').mouseup(function(e) {
    if (!dragging) {
      mode = mode+1 == modes.length ? 0 : mode+1;
    }
  });
  $('#swing').mousedown(function(e) {
    swing_down = true;
    dragstart = e.pageY;
  });
  $('#dur').mousedown(function(e) {
    dur_down = true;
    dragstart = e.pageY;
  });
  $(window).mousemove(function(e) {
    if (steps_down) {
      dragging = true;
      var yoffset = (e.pageY - dragstart);
      var incrementamount = yoffset > 0 ? 1 : -1;
      if (playing) {
        incrementor = incrementamount;
      } else {
        if (yoffset > 5 || yoffset < -5) {
          increment(incrementamount);
          dragstart = e.pageY;
        }
      }
    }
    if (mode_down) {
      dragging = true;
      var yoffset = (e.pageY - dragstart);
      var incrementamount = yoffset > 0 ? 1 : -1;
      if (yoffset > 5 || yoffset < -5) {
        // add action here
        dragstart = e.pageY;
      }
    }
    if (keypad_down) {
      dragging = true;
      pattern[keypad_index][0] = 1;
      var yoffset = (e.pageY - dragstart);
      var incrementamount = yoffset > 0 ? 1 : -1;
      if (yoffset > 5 || yoffset < -5) {
        var semitone = pattern[keypad_index][1] + incrementamount;
        pattern[keypad_index][1] = semitone > 0 ? (semitone < 60 ? semitone : 60) : 0;
        dragstart = e.pageY;
      }
    }
    if (swing_down) {
      // add swing modifier
    }
    if (dur_down) {
      // add duration modifier
    }
  });
  $(window).mouseup(function(e) {
    if (keypad_down && !dragging) {
      pattern[keypad_index][0] = !pattern[keypad_index][0];
    }
    keypad_down = false;
    steps_down = false;
    mode_down = false;
    swing_down = false;
    dur_down = false;
    dragging = false;
  });
});
