'use strict';

const hexIn = document.getElementById('hexIn');
const decIn = document.getElementById('decIn');

const keycodeIn = document.getElementById('keycodeIn');
const showKey = document.getElementById('showKey');

const minifyJs = document.getElementById('minifyJs');

/**
 * Check if the currently active element matches a CSS selector
 * @param {String} selector 
 */
const active = selector => document.activeElement.matches(selector);

/**
 * Map a value from one range to another (taken from Arduino map function)
 * @param {Number} val 
 * @param {Number} fromLow 
 * @param {Number} fromHigh 
 * @param {Number} toLow 
 * @param {Number} toHigh 
 */
const mapVal = (val, fromLow, fromHigh, toLow, toHigh) => (val - fromLow) * (toHigh - toLow) / (fromHigh - fromLow) + toLow;

/**
 * Limit a number to a min and a max
 * @param {Number} val 
 * @param {Number} min 
 * @param {Number} max 
 */
const minMax = (val, min, max) => Math.max(Math.min(val, max), min);

/**
 * Turn an RGB(A) string or array into an rgb(a) color code
 * @param {Object} color Color object
 * @param {(string|number[])} color.rgb RGB array
 * @param {string|number} color.a Alpha value
 */
const toRgb = (color) => {
  if (typeof color.rgb === 'string') {
    color.rgb = color.rgb.split(/, */); // make sure there's a space after the commas
  }
  color.rgb = color.rgb.join(', ');
  if (color.a != null && parseFloat(color.a) !== 1) {
    return `rgba(${color.rgb}, ${Math.round(parseFloat(color.a)*1000)/1000})`;
  }
  return `rgb(${color.rgb})`;
}

/**
 * Turn an RGB(A) object into a hex color code
 * @param {Object} color Color object
 * @param {(string|number[])} color.rgb RGB array
 * @param {string|number} color.a Alpha value
 */
const toHex = (color) => {
  let hexCode = '#';
  if (typeof color.rgb === 'string') {
    color.rgb = color.rgb.split(/, */).map(i => parseInt(i));
  }
  for (let i of color.rgb) {
    hexCode += ('0' + parseInt(i, 10).toString(16).toUpperCase()).slice(-2);
  }
  if (color.a != null) {
    color.a = parseFloat(color.a);
    color.a !== 1 && (hexCode += ('0' + (color.a*255).toString(16).toUpperCase()).slice(-2));
  }
  return hexCode;
}

class ColorPicker {
  /**
   * Create a color picker
   * @param {string} showColors 
   * @param {string} colorPick 
   * @param {string} showColor 
   * @param {string} colorSlider 
   * @param {string} alphaSlider 
   * @param {string} showRgb 
   * @param {string} showHex 
   */
  constructor(showColors, colorPick, showColor, colorSlider, alphaSlider, showRgb, showHex) {
    this.colorPick = document.getElementById(colorPick); // color pick div that moves with cursor
    this.showColor = document.getElementById(showColor); // div to show the selected color
    this.cSlider = document.getElementById(colorSlider); // slider to select the main color
    this.aSlider = document.getElementById(alphaSlider); // slider to select alpha

    this.showRgb = document.getElementById(showRgb);
    this.showHex = document.getElementById(showHex);

    this.showColors = document.getElementById(showColors); // show the gradient

    this.showColors.parentNode.addEventListener('mousedown', e => {
      pickColor(e);
      document.documentElement.style.userSelect = 'none';
      document.addEventListener('mousemove', pickColor, {passive: true, useCapture: false});
      document.addEventListener('mouseup', () => {
        document.documentElement.style.userSelect = '';
        document.removeEventListener('mousemove', pickColor, {passive: true, useCapture: false});
      }, {once: true, useCapture: false});
    }, false);

    this.pickCoords = {x: this.showColors.offsetWidth, y: 0}

    this.maxColor = [255, 0, 0];

    this.color = {
      rgb: [255, 0, 0],
      a: 1
    };

    this.cSlider.addEventListener('input', () => {
      this.colorCanvas();
    });

    this.aSlider.addEventListener('input', () => {
      this.showColor.style.opacity = this.aSlider.value/255*100 + '%';
      document.body.style.setProperty('--picker-opacity', this.aSlider.value/255*100 + '%');
      this.color.a = this.aSlider.value/255;
      this.showRgb.value = toRgb(this.color);
      this.showHex.value = toHex(this.color);
    }, false);
        
    this.showHex.addEventListener('input', () => {
      if (/^#?([0-9a-fA-F]{3}(?!\S))|([0-9a-fA-F]{6}(?!\S))|([0-9a-fA-F]{8}(?!\S))/.test(this.showHex.value)) {
        const color = /[0-9a-f]{3,}/i.exec(this.showHex.value)[0];
        const colors = [];
        if (color.length === 8) { // with alpha
          for (let i = 0; i < 6; i+=2) {
            colors.push(parseInt(color.slice(i, i+2), 16));
          }
          colors.push(Math.round((parseInt(color.slice(6, 8), 16)/255)*1000)/1000);
          this.showRgb.value = `rgba(${colors.join(', ')})`;
          this.color.rgb = colors.slice(0, 3);
          this.color.a = colors[3];
          this.displayColor();
        }
        else if (color.length === 3) { // abbreviated 3
          for (let i = 0; i < 3; i++) {
            colors.push(parseInt(color.slice(i, i+1).repeat(2), 16));
          }
          this.showRgb.value = `rgb(${colors.join(', ')})`;
          this.color.rgb = colors;
          this.color.a = 1;
          this.displayColor();
        }
        else if (color.length === 6) { // full 6
          for (let i = 0; i < 6; i+=2) {
            colors.push(parseInt(color.slice(i, i+2), 16));
          }
          this.showRgb.value = `rgb(${colors.join(', ')})`;
          this.color.rgb = colors;
          this.color.a = 1;
          this.displayColor();
        }
      }
    }, false);

    this.showHex.addEventListener('focusout', () => {
      this.showHex.value = toHex(this.color);
      this.showRgb.value = toRgb(this.color);
    }, false);

    this.showRgb.addEventListener('input', () => {
      if(/^(rgb(a?))?\(?\d{1,3}, *\d{1,3}, *\d{1,3}(, \d?(\.\d*)?)?\)? */.test(this.showRgb.value)) {
        const color = /\d{1,3}, *\d{1,3}, *\d{1,3}(, \d?(\.\d*)?)?/.exec(this.showRgb.value)[0].split(/, */).map(i => parseInt(i));

        if (color[3] == null) {
          color[3] = 1;
        }
        this.color.rgb = color.slice(0, 3);
        this.color.a = color[3];

        this.showHex.value = toHex(this.color);
        this.displayColor();
      }
    }, false);

    this.showRgb.addEventListener('focusout', () => {
      this.showHex.value = toHex(this.color);
      this.showRgb.value = toRgb(this.color);
    }, false);

    this.colorCanvas();
  }
  
  /**
   * Take an input from the main color slider and turn it into the main color to display in the color picker
   * @param {number} sliderVal 
   */
  maxVal(sliderVal) {
    const which255 = Math.trunc(sliderVal/255);
    const upDown = !(which255 % 2); // updown === false -> down
    const modColor = 2 - ((which255 + 1) % 3);
    const offset = upDown ? 0 : 255;

    const baseR = ((!upDown && modColor === 2) || (upDown && modColor === 1)) ? 255 : 0;
    const baseG = ((!upDown && modColor === 0) || (upDown && modColor === 2)) ? 255 : 0;
    const baseB = ((!upDown && modColor === 1) || (upDown && modColor === 0)) ? 255 : 0;
    const baseColor = [baseR, baseG, baseB];
    baseColor[modColor] = offset + (sliderVal % 255) * (upDown ? 1 : -1);
    return baseColor;
  }

  /**
   * Calculate the color at a point on the canvas
   * @param {Number} x 
   * @param {Number} y 
   */
  calcColor(x, y) {
    x = minMax(x, 0, this.showColors.offsetWidth);
    y = minMax(y, 0, this.showColors.offsetHeight);
    const mapXR = mapVal(x, 0, this.showColors.offsetWidth, 255, this.maxColor[0]);
    const mapXG = mapVal(x, 0, this.showColors.offsetWidth, 255, this.maxColor[1]);
    const mapXB = mapVal(x, 0, this.showColors.offsetWidth, 255, this.maxColor[2]);
    const mappedX = [mapXR, mapXG, mapXB];

    const mapYR = Math.round(mapVal(y, 0, this.showColors.offsetHeight, mappedX[0], 0));
    const mapYG = Math.round(mapVal(y, 0, this.showColors.offsetHeight, mappedX[1], 0));
    const mapYB = Math.round(mapVal(y, 0, this.showColors.offsetHeight, mappedX[2], 0));
    return [mapYR, mapYG, mapYB];
  }

  /**Set the correct gradient on the colorpicker display*/
  colorCanvas(maxColor = this.maxVal(this.cSlider.value), setFromText = false) {
    this.maxColor = maxColor;
    this.showColors.style.backgroundImage = `linear-gradient(to right, rgb(255, 255, 255), rgb(${this.maxColor}))`;
    document.body.style.setProperty('--main-picker-color', `rgb(${this.maxColor})`); // change slider thumb color

    if (!setFromText) {
      this.color.rgb = this.calcColor(this.pickCoords.x, this.pickCoords.y);
      document.body.style.setProperty('--current-picker-color', this.color.rgb.join(', '));
      this.showRgb.value = toRgb(this.color);
      this.showHex.value = toHex(this.color);
    }
  }

  /**Show color from this.color (for when color is set from text input)*/
  displayColor() {
    this.aSlider.value = Math.round(this.color.a*255);
    document.body.style.setProperty('--current-picker-color', this.color.rgb.join(', '));
    this.showColor.style.opacity = this.color.a*100 + '%';
    document.body.style.setProperty('--picker-opacity', this.color.a*100 + '%');

    const maxVal = Math.max(...this.color.rgb);
    const minVal = Math.min(...this.color.rgb);
    const midVal = this.color.rgb.reduce((sum, cur) => sum + cur) - (maxVal + minVal);

    if (!this.color.rgb.every(i => i === this.color.rgb[0])) {
      this.maxColor = this.color.rgb;

      const newMid = midVal - minVal * ((maxVal - midVal) / (maxVal - minVal));
      if (minVal !== 0) { // scale to right side if not already there
        this.maxColor = this.color.rgb.map(i => {
          if (i === minVal) {
            return 0;
          }
          else if (i !== maxVal) {
            return newMid;
          }
          return i;
        });
      }

      const mapToMax = 255 / maxVal;
      if (mapToMax !== 0) { // scale to top
        this.maxColor = this.maxColor.map(i => Math.round(i * mapToMax));
      }
      
    }
    else { // if white/gray/black, default to red
      this.maxColor = [255, 0, 0];
      this.cSlider.value = 0;
    }
    
    if (this.color.rgb.reduce((s, c) => s + c) === 0) { // put in bottom left if black
      this.pickCoords.x = 0;
      this.pickCoords.y = this.showColors.offsetHeight;
    }
    else {
      this.pickCoords.x = mapVal(maxVal - minVal, 0, maxVal, 0, this.showColors.offsetWidth);
      this.pickCoords.y = mapVal(255 - maxVal, 0, 255, 0, this.showColors.offsetHeight);
    }
    this.colorPick.style.left = minMax(this.pickCoords.x, 0, this.showColors.offsetWidth) - 11 + 'px';
    this.colorPick.style.top = minMax(this.pickCoords.y, 0, this.showColors.offsetHeight) - 11 + 'px';

    let highs = [];
    let lows = [];
    for (let [idx, item] of this.maxColor.entries()) {
      if (item === 255) {
        highs.push(idx);
      }
      else if (item === 0) {
        lows.push(idx);
      }
    }
    if (highs.length === 2) { // secondary colors
      highs = highs.reduce((s, c) => s + c); // sum to find which highs
      switch (highs) {
        case 1:
          this.cSlider.value = 255;
        break;
        case 3:
          this.cSlider.value = 255*3;
        break;
        case 2:
          this.cSlider.value = 255*5;
        break;
        default:
      }
    }
    else if (lows.length === 2) { // primary colors
      lows = lows.reduce((s, c) => s + c); //sum to find which lows
      switch (lows) {
        case 3:
          this.cSlider.value = 0;
        break;
        case 2:
          this.cSlider.value = 255*2;
        break;
        case 1:
          this.cSlider.value = 255*4;
        break;
        default:
      }
    }
    else if (highs.length = 1) { // all other colors (I think)
      highs = highs[0];
      lows = lows[0];
      let mid = this.maxColor.reduce((s, c) => s + c) - 255;
      let midIdx = this.maxColor.indexOf(mid);
      switch (highs) {
        case 0:
          this.cSlider.value = lows === 2 ? mid : 255*5 + (255 - mid);
        break;
        case 1:
          this.cSlider.value = 255*2 + (mid * (midIdx === 2 ? 1 : -1));
        break;
        case 2:
          this.cSlider.value = 255*4 + (mid === 1 ? 255 - mid : mid);
        break;
      }
    }

    this.colorCanvas(this.maxColor, true);
  }
}

const colorPick = new ColorPicker('showColors', 'colorPick', 'showColor', 'mainColor', 'alphaSlider', 'showRgb', 'showHex');

hexIn.addEventListener('input', () => {
  decIn.value = isNaN(parseInt(hexIn.value, 16)) ? '' : parseInt(hexIn.value, 16);
}, false);

decIn.addEventListener('input', () => {
  hexIn.value = decIn.value !== '' ? parseFloat(decIn.value).toString(16) : '';
}, false);

addEventListener('keydown', e => {
  if (active('#keycodeIn') || active('#showKey')) {
    e.preventDefault();
    keycodeIn.value = e.keyCode;
    showKey.value = e.key;
  }
  if (!e.ctrlKey && !e.altKey && !e.metaKey && e.key.length === 1) {
    if (
    (((active('#hexIn') && /[^0-9a-f]/i.test(e.key)) || // hex and test hex
    (active('#decIn') && /\D/.test(e.key))) && // dec and test dec
    e.key !== '.') || // allow decimals for number conversions
    (active('#showHex') && (/[^0-9a-f#]/i.test(e.key) || // hex color and test hex color
    (!/#?[0-9a-f]{0,8}/i.test(colorPick.showHex.value) && colorPick.showHex.value !== '')))) { // possible number sign and up to eight hex digits
      e.preventDefault();
    }
  }
}, false);

document.addEventListener('click', e => {
  if (e.target.closest('#keycode')) {
    keycodeIn.focus();
  }
  else if (e.target.matches('#minifyBtn')) {
    fetch(
      'https://cors-anywhere.herokuapp.com/https://javascript-minifier.com/raw?input=' + minifyJs.value,
      {method: 'POST'}
    ).then(r => r.json())
    .then(json => {
      minifyJs.value = json;
    })
  }
  else if (e.target.matches('#clearBtn')) {
    minifyJs.value = ''; // maybe implement undo on this?
    minifyJs.focus();
  }
  else if (e.target.matches('#copyBtn')) {
    navigator.clipboard.writeText(minifyJs.value);
  }
}, false);

/**
 * Pick a color on the color picker
 * @param {Object} e 
 */
function pickColor(e) {
  const getRect = colorPick.showColors.getBoundingClientRect();
  let x = e.clientX - getRect.x;
  let y = e.clientY - getRect.y;

  colorPick.colorPick.style.left = minMax(x, 0, getRect.width) - 11 + 'px';
  colorPick.colorPick.style.top = minMax(y, 0, getRect.height) - 11 + 'px';
  
  colorPick.pickCoords = {x: x, y: y};

  const newColor = colorPick.calcColor(x, y);
  colorPick.color.rgb = newColor;
  document.body.style.setProperty('--current-picker-color', newColor.join(', '));
  colorPick.showRgb.value = toRgb(colorPick.color);
  colorPick.showHex.value = toHex(colorPick.color);
}