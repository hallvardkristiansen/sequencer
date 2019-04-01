var main_loop;
var playing = false;
var last_clock = Date.now();
var refreshrate = 10;
var clockrate = 1234;
var semitones = 60;
var firesync = false;
var interacting = false;
var dragstart = 0;
var dragstop = 0;
var incrementor = 1;

var buttons = {
  'keypad': {
    'down': false
  },
  'mode': {
    'down': false,
    'amount': 0
  },
  'steps': {
    'down': false,
    'amount': 0
  },
  'swing': {
    'down': false,
    'amount': 50
  },
  'dur': {
    'down': false,
    'amount': 100
  }
}

let modes = ['1sequencer', '2sequencer', '4sequencer'];
var mode = 0;
var logic = 'none';
var palette = {
  'rainbow': [],
  'semitones': [],
  'swing': [],
  'glide': [],
  'duration': [],
  'patterns': []
};

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
var reDraw = true;

var indicator_color = 'rgb(255, 255, 255)';
var trigger_color = 'rgb(0, 255, 255)';
var inactive_color = 'rgb(100, 100, 100)';
var active_color = 'rgb(240, 240, 255)';


var pattern = [
  [1, 55], [0, 23], [0, 43], [0, 45], 
  [0, 43], [0, 21], [1, 23], [0, 43], 
  [0, 60], [1, 32], [0, 33], [1, 44], 
  [0, 11], [0, 22], [1, 33], [1, 50],
  [1, 43], [0, 12], [1, 54], [0, 23], 
  [0, 54], [1, 21], [0, 23], [1, 12], 
  [1, 60], [1, 32], [1, 33], [1, 44], 
  [0, 11], [0, 22], [1, 33], [1, 50],
  [1, 45], [0, 23], [0, 43], [0, 45], 
  [0, 43], [1, 32], [1, 23], [0, 43], 
  [1, 60], [0, 32], [0, 33], [1, 44], 
  [0, 11], [0, 22], [0, 33], [1, 50],
  [1, 60], [0, 23], [1, 43], [0, 45], 
  [0, 43], [1, 21], [1, 23], [0, 43], 
  [0, 60], [1, 32], [0, 33], [1, 44], 
  [1, 11], [0, 22], [1, 33], [1, 50]
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

function onEncoderRotate(position) {
  interacting = true;
  var yoffset = position - dragstart;
  var incrementamount = yoffset > 0 ? 1 : -1;
  if (yoffset > 5 || yoffset < -5) {
    dragstart = position;
    return incrementamount;
  }
  return 0;
}

function resetState() {
  buttons.keypad.down = false;
  buttons.steps.down = false;
  buttons.mode.down = false;
  buttons.swing.down = false;
  buttons.dur.down = false;
  interacting = false;
}

function generatePalettes() {
  palette.rainbow = cmap_rainbow(320, 320);
  palette.semitones = palette.rainbow.slice(0, semitones);
  palette.swing = palette.rainbow.slice(semitones * 2, semitones * 3); // good
  palette.glide = palette.rainbow.slice(semitones * 3, semitones * 4); // adjust
  palette.duration = palette.rainbow.slice(semitones * 4, semitones * 5); // good
  palette.patterns.fill('rgb(100, 200, 255)', 0, 60);
}

function activateOutput(selector, level) {
  $(selector).css('fill', level);
}

function draw() {
  $.each(grid.rows, function(y, row) {
    $.each(grid.columns, function(x, column) {
      var index = getIndex(y, x);
      var colorvalue = indicator.includes('#'+row+column) ? (current_state[index][0] ? trigger_color : indicator_color) : (current_state[index][0] ? palette.semitones[current_state[index][1] - 1] : inactive_color);
      activateOutput('#'+row+column+' path', colorvalue);
    });
    var outindex = getIndex(y, current_column);
    var outputcolorvalue = indicator.includes('#'+row+grid.columns[current_column]) && current_state[outindex][0] ? palette.semitones[current_state[outindex][1] - 1] : inactive_color;
    activateOutput('#'+row+' path', outputcolorvalue);
  });
  activateOutput('#abcd path', (current_state[pointer][0] ? palette.semitones[current_state[pointer][1] - 1] : inactive_color));
  activateOutput('#sync path', (firesync ? active_color : inactive_color));
  reDraw = false;
}


function runtime() {
  if (Date.now() - last_clock > clockrate && playing) {
    increment(incrementor);
    reDraw = true;
  }
  if (reDraw) {
    draw();
  }
}

$(function() {
  generatePalettes();
  main_loop = setInterval(runtime, refreshrate);
  $.each(grid.rows, function(y, row) {
    $.each(grid.columns, function(x, column) {
      $('#'+row+column).find('path').mousedown(function(e) {
        keypad_index = (current_page * pagesize) + getIndex(y, x);
        buttons.keypad.down = true;
        dragstart = e.pageY;
      });
    });
  });
  $('#steps').mousedown(function(e) {
    buttons.steps.down = true;
    dragstart = e.pageY;
  });
  $('#steps').mouseup(function(e) {
    if (!interacting) {
      playing = !playing;
    }
  });
  $('#mode').mousedown(function(e) {
    buttons.mode.down = true;
    dragstart = e.pageY;
  });
  $('#mode').mouseup(function(e) {
    if (!interacting) {
      mode = mode+1 == modes.length ? 0 : mode+1;
      if (!playing) {
        increment(0);
        reDraw = true;
      }
    }
  });
  $('#swing').mousedown(function(e) {
    buttons.swing.down = true;
    dragstart = e.pageY;
  });
  $('#dur').mousedown(function(e) {
    buttons.dur.down = true;
    dragstart = e.pageY;
  });
  $(window).mousemove(function(e) {
    if (buttons.keypad.down) {
      pattern[keypad_index][0] = 1;
      var incrementamount = onEncoderRotate(e.pageY);
      if (incrementamount) {
        var semitone = pattern[keypad_index][1] - incrementamount;
        pattern[keypad_index][1] = semitone > 0 ? (semitone < 60 ? semitone : 60) : 0;
        reDraw = true;
      }
    }
    if (buttons.steps.down) {
      var incrementamount = onEncoderRotate(e.pageY);
      if (playing) {
        incrementor = incrementamount;
      } else {
        increment(incrementamount);
        reDraw = true;
      }
    }
    if (buttons.mode.down) {
      buttons.mode.amount += onEncoderRotate(e.pageY);
    }
    if (buttons.swing.down) {
      buttons.swing.amount += onEncoderRotate(e.pageY);
    }
    if (buttons.dur.down) {
      buttons.dur.amount += onEncoderRotate(e.pageY);
    }
  });
  $(window).mouseup(function(e) {
    if (buttons.keypad.down && !interacting) {
      pattern[keypad_index][0] = !pattern[keypad_index][0];
    }
    resetState();
    reDraw = true;
  });
});
