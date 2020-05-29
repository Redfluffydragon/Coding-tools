'use strict';

const hexIn = document.getElementById('hexIn');
const decIn = document.getElementById('decIn');

const keycode = document.getElementById('keycode');
const keycodeIn = document.getElementById('keycodeIn');
const showKey = document.getElementById('showKey');

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

    this.showColors.parentNode.addEventListener('touchstart', e => {
      pickColor(e);
      document.documentElement.style.userSelect = 'none';
      // passive false so can prevent default - shouldn't be a problem because it gets removed and there's no scrolling
      document.addEventListener('touchmove', pickColor, {passive: false, useCapture: false});
      document.addEventListener('touchend', () => {
        document.documentElement.style.userSelect = '';
        document.removeEventListener('touchmove', pickColor, {passive: false, useCapture: false});
      }, {once: true, useCapture: false});
    }, false);

    this.pickCoords = {
      x: Math.round(Math.random() * this.showColors.offsetWidth / 2) + this.showColors.offsetWidth/2,
      y: Math.round(Math.random() * this.showColors.offsetHeight / 2),
    }
    this.setPickPos();

    this.maxColor = [255, 0, 0];

    this.color = {rgb: [255, 0, 0], a: 1};

    this.cSlider.addEventListener('input', () => {
      this.colorCanvas();
    });
    this.cSlider.value = Math.round(Math.random() * this.cSlider.max);

    this.aSlider.addEventListener('input', () => {
      document.body.style.setProperty('--picker-opacity', this.aSlider.value/255*100 + '%');
      this.color.a = this.aSlider.value/255;
      this.showRgb.value = toRgb(this.color);
      this.showHex.value = toHex(this.color);
    }, false);
        
    this.showHex.addEventListener('input', () => {
      if (/^#?([0-9a-f]{3}(?!\S))|([0-9a-f]{6}(?!\S))|([0-9a-f]{8}(?!\S))/i.test(this.showHex.value)) {
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
        else if (color.length === 3 || color.length === 6) { // no alpha
          const oneThird = color.length / 3;
          for (let i = 0; i < 3; i++) {
            colors.push(parseInt(color.slice(i*oneThird, (i + 1)*oneThird).repeat(3 - oneThird), 16));
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
    document.body.style.setProperty('--main-picker-color', `rgb(${this.maxColor})`); // change slider thumb and main gradient color

    if (!setFromText) { // if not set from text input
      this.color.rgb = this.calcColor(this.pickCoords.x, this.pickCoords.y);
      document.body.style.setProperty('--current-picker-color', this.color.rgb);
      this.showRgb.value = toRgb(this.color);
      this.showHex.value = toHex(this.color);
    }
  }

  /**Show color from this.color (for when color is set from text input)*/
  displayColor() {
    this.aSlider.value = Math.round(this.color.a*255);
    document.body.style.setProperty('--current-picker-color', this.color.rgb);
    document.body.style.setProperty('--picker-opacity', this.color.a*100 + '%');

    const maxVal = Math.max(...this.color.rgb);
    const minVal = Math.min(...this.color.rgb);
    const midVal = this.color.rgb.reduce((s, c) => s + c) - (maxVal + minVal);

    if (!this.color.rgb.every(i => i === this.color.rgb[0])) { // if not white/gray/black

      this.maxColor = this.color.rgb.map(i => { // scale to right side if not already there
        if (i === minVal) { // set min to zero
          return 0;
        }
        else if (i === midVal) { // calculate new mid val
          return midVal - minVal * ((maxVal - midVal) / (maxVal - minVal));
        }
        return i; // max val stays the same when going right or left
      });

      const mapToMax = 255 / maxVal;
      this.maxColor = this.maxColor.map(i => Math.round(i * mapToMax)); // scale to top
      
    }
    else { // if white/gray/black, default to red
      this.maxColor = [255, 0, 0];
      this.cSlider.value = 0;
    }
    
    if (this.color.rgb.every(i => i === 0)) { // put in bottom left if black
      this.pickCoords.x = 0;
      this.pickCoords.y = this.showColors.offsetHeight;
    }
    else {
      this.pickCoords.x = mapVal(maxVal - minVal, 0, maxVal, 0, this.showColors.offsetWidth);
      this.pickCoords.y = mapVal(255 - maxVal, 0, 255, 0, this.showColors.offsetHeight);
    }
    this.setPickPos();

    let highsIdx = [];
    let lowsIdx = [];
    for (let [idx, item] of this.maxColor.entries()) {
      if (item === 255) {
        highsIdx.push(idx);
      }
      else if (item === 0) {
        lowsIdx.push(idx);
      }
    }
    if (highsIdx.length === 2) { // secondary colors
      highsIdx = highsIdx.reduce((s, c) => s + c); // sum to find which highs
      if (highsIdx === 2) {
        this.cSlider.value = 255*5;
      }
      else {
        this.cSlider.value = 255 * highsIdx;
      }
    }
    else if (lowsIdx.length === 2) { // primary colors
      lowsIdx = lowsIdx.reduce((s, c) => s + c); //sum to find which lows
      this.cSlider.value = 255 * (6 - 2 * lowsIdx); // works out nicely with a linear function
    }
    else if (highsIdx.length = 1) { // all other colors
      const highIdx = highsIdx[0]; // get the single high
      const mid = this.maxColor.reduce((s, c) => s + c) - 255; // maxColor should be 1 zero, 1 255, and mid val
      const midIdx = this.maxColor.indexOf(mid);
      switch (highIdx) {
        case 0: // orange - purple
          this.cSlider.value = midIdx === 1 ? mid : 255*5 + (255 - mid);
        break;
        case 1: // yellow - cyan
          this.cSlider.value = 255*2 + (midIdx === 2 ? mid : -mid); // midIdx: 0 (n) or 2 (p)
        break;
        case 2: // cyan - purple
          this.cSlider.value = 255*4 + (midIdx === 0 ? mid : -mid); // midIdx: 1 (n) or 0 (p)
        break;
      }
    }

    this.colorCanvas(this.maxColor, true);
  }

  /**Set the picker position based on colorPickCoords*/
  setPickPos() {
    this.colorPick.style.left = minMax(this.pickCoords.x, 0, this.showColors.offsetWidth) + 'px';
    this.colorPick.style.top = minMax(this.pickCoords.y, 0, this.showColors.offsetHeight) + 'px';
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
    (!/^#?[0-9a-f]{0,8}(?!\S)/i.test(colorPick.showHex.value) &&
    colorPick.showHex.value !== '') ||
    colorPick.showHex.value.replace('#', '').length >= 8))) { // possible number sign and up to eight hex digits
      e.preventDefault();
    }
  }
}, false);

document.addEventListener('click', e => {
  if (e.target.closest('#keycode')) {
    keycode.focus();
    keycode.classList.add('focused');
  }
}, false);

keycode.addEventListener('focusout', () => {
  keycode.classList.remove('focused');
  keycodeIn.value = '';
  showKey.value = '';
}, false);

/**
 * Pick a color on the color picker
 * @param {Object} e 
 */
function pickColor(e) {
  e.preventDefault();
  const getRect = colorPick.showColors.getBoundingClientRect();
  
  let event = e.type.includes('mouse') ? e : e.touches[0];
  let x = event.clientX - getRect.x;
  let y = event.clientY - getRect.y;

  colorPick.pickCoords = {x: x, y: y};
  colorPick.setPickPos();

  colorPick.color.rgb = colorPick.calcColor(x, y);
  document.body.style.setProperty('--current-picker-color', colorPick.color.rgb);
  colorPick.showRgb.value = toRgb(colorPick.color);
  colorPick.showHex.value = toHex(colorPick.color);
}