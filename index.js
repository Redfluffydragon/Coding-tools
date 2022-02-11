'use strict';

const hexIn = document.getElementById('hexIn');
const decIn = document.getElementById('decIn');

const keycode = document.getElementById('keycode');
const keycodeIn = document.getElementById('keycodeIn');
const showKey = document.getElementById('showKey');

const charCounter = document.getElementById('charCounter');

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

const showCharCount = () => {
  document.getElementById('charCount').innerText = 
    document.getElementById('noSpacesCheck').checked ?
      charCounter.value.replace(/\s/gm, '').length :
      charCounter.value.length;

  document.getElementById('wordCount').innerText = charCounter.value.split(/\s+/).length;
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
   * @param {string} showHsl
   */
  constructor(showColors, colorPick, showColor, colorSlider, alphaSlider, showRgb, showHex, showHsl, showHsv, showHsi) {
    this.colorPick = document.getElementById(colorPick); // color pick div that moves with cursor
    this.showColor = document.getElementById(showColor); // div to show the selected color
    this.cSlider = document.getElementById(colorSlider); // slider to select the main color
    this.aSlider = document.getElementById(alphaSlider); // slider to select alpha

    this.inputs = {
      rgb: document.getElementById(showRgb),
      hex: document.getElementById(showHex),
      hsl: document.getElementById(showHsl),
      hsv: document.getElementById(showHsv),
      hsi: document.getElementById(showHsi),
    }

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

    this.colorCanvas();

    this.aSlider.addEventListener('input', () => {
      document.body.style.setProperty('--picker-opacity', this.aSlider.value/255*100 + '%');
      this.color.a = this.aSlider.value/255;
      this.setInputs();
    }, false);

    for (const color in this.inputs) {
      this.inputs[color].addEventListener('contextmenu', e => {
        e.preventDefault();
        e.target.select();
        navigator.clipboard.writeText(e.target.value);
      }, false);

      this.inputs[color].addEventListener('focusout', () => {
        this.setInputs(color);
      }, false);
    }

    this.inputs.hex.addEventListener('input', () => {
      if (/^#?([0-9a-f]{3}(?!\S))|([0-9a-f]{6}(?!\S))|([0-9a-f]{8}(?!\S))/i.test(this.inputs.hex.value)) {
        const color = /[0-9a-f]{3,}/i.exec(this.inputs.hex.value)[0];
        const colors = [];
        if (color.length === 8) { // with alpha
          for (let i = 0; i < 6; i+=2) {
            colors.push(parseInt(color.slice(i, i+2), 16));
          }
          colors.push(Math.round((parseInt(color.slice(6, 8), 16)/255)*1000)/1000);
          this.color.rgb = colors.slice(0, 3);
          this.color.a = colors[3];
          this.displayColor();
          this.setInputs('hex');
        }
        else if (color.length === 3 || color.length === 6) { // no alpha
          const oneThird = color.length / 3;
          for (let i = 0; i < 3; i++) {
            colors.push(parseInt(color.slice(i*oneThird, (i + 1)*oneThird).repeat(3 - oneThird), 16));
          }
          this.color.rgb = colors;
          this.color.a = 1;
          this.displayColor();
          this.setInputs('hex');
        }
      }
    }, false);

    this.inputs.rgb.addEventListener('input', () => {
      if(/^(rgb(a?))?\(?\d{1,3}, *\d{1,3}, *\d{1,3}(, \d?(\.\d*)?)?\)? */i.test(this.inputs.rgb.value)) {
        const color = /\d{1,3}, *\d{1,3}, *\d{1,3}(, \d?(\.\d*)?)?/.exec(this.inputs.rgb.value)[0].split(/, */)
          .map((i, idx) => idx < 3 ? parseInt(i) : parseFloat(i));

        this.color.rgb = color.slice(0, 3);
        this.color.a = color[3] == null ? 1 : color[3];

        this.displayColor();
        this.setInputs('rgb');
      }
    }, false);

    this.inputs.hsl.addEventListener('input', () => {
      if (/^(hsl)?\(?\d{1,3}°?, *\d{1,3}%, *\d{1,3}%(, *\d{1,3}%)?\)? */i.test(this.inputs.hsl.value)) {
        const getNumbers = /\d{1,3}, *\d{1,3}%, *\d{1,3}%(, *\d{1,3}%)?/.exec(this.inputs.hsl.value)[0].split(/, */).map(i => parseInt(i));

        const hsl = {
          h: getNumbers[0],
          s: getNumbers[1] / 100,
          l: getNumbers[2] / 100,
        }

        this.color.rgb = [this.hslToRgbFunc(hsl, 0), this.hslToRgbFunc(hsl, 8), this.hslToRgbFunc(hsl, 4)];
        this.color.a = getNumbers[3] == null ? 1 : getNumbers[3];

        this.displayColor();
        this.setInputs('hsl');
      }
    }, false);

    this.inputs.hsv.addEventListener('input', () => {
      if (/^(hsv)?\(?\d{1,3}°?, *\d{1,3}%, *\d{1,3}%(, *\d{1,3}%)?\)? */i.test(this.inputs.hsv.value)) {
        const getNumbers = /\d{1,3}, *\d{1,3}%, *\d{1,3}%(, *\d{1,3}%)?/.exec(this.inputs.hsv.value)[0].split(/, */).map(i => parseInt(i));
        const hsv = {
          h: getNumbers[0],
          s: getNumbers[1] / 100,
          v: getNumbers[2] / 100,
        }

        this.color.rgb = [this.hsvToRgbFunc(hsv, 5), this.hsvToRgbFunc(hsv, 3), this.hsvToRgbFunc(hsv, 1)]
        this.color.a = getNumbers[3] == null ? 1 : getNumbers[3];

        this.displayColor();
        this.setInputs('hsv');
      }
    }, false);

    this.inputs.hsi.addEventListener('input', () => {
      if (/^(hsi)?\(?\d{1,3}°?, *\d{1,3}%, *\d{1,3}%(, *\d{1,3}%)?\)? */i.test(this.inputs.hsi.value)) {
        const getNumbers = /\d{1,3}, *\d{1,3}%, *\d{1,3}%(, *\d{1,3}%)?/.exec(this.inputs.hsi.value)[0].split(/, */).map(i => parseInt(i));

        this.color.rgb = this.hsiToRgbFunc({
          h: getNumbers[0],
          s: getNumbers[1] / 100,
          i: getNumbers[2] / 100,
        });
        this.color.a = getNumbers[3] == null ? 1 : getNumbers[3];

        this.displayColor();
        this.setInputs('hsi');
      }
    }, false);
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
   * @param {Object} coords 
   * @param {number} maxColor 
   */
  calcColor(coords = this.pickCoords, maxColor = this.maxColor) {
    const x = minMax(coords.x, 0, this.showColors.offsetWidth);
    const y = minMax(coords.y, 0, this.showColors.offsetHeight);
   
    const mappedX = [
      mapVal(x, 0, this.showColors.offsetWidth, 255, maxColor[0]),
      mapVal(x, 0, this.showColors.offsetWidth, 255, maxColor[1]),
      mapVal(x, 0, this.showColors.offsetWidth, 255, maxColor[2]),
    ];

    return mappedX.map((item, idx)  => Math.round(mapVal(y, 0, this.showColors.offsetHeight, mappedX[idx], 0)));
  }

  /**Set the correct gradient on the colorpicker display*/
  colorCanvas(maxColor = this.maxVal(this.cSlider.value), setFromText = false) {
    this.maxColor = maxColor;
    document.body.style.setProperty('--main-picker-color', `rgb(${this.maxColor})`); // change slider thumb and main gradient color

    if (!setFromText) { // if not set from text input
      this.color.rgb = this.calcColor();
      document.body.style.setProperty('--current-picker-color', this.color.rgb);
      this.setInputs();
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

  /**
   * Show current color in all text inputs except for one excluded one
   * @param {string} exclude The input to exclude
   */
  setInputs(exclude = 'none') {
    exclude !== 'rgb' && (this.inputs.rgb.value = this.toRgb());
    exclude !== 'hex' && (this.inputs.hex.value = this.toHex());
    exclude !== 'hsl' && (this.inputs.hsl.value = this.toHsl());
    exclude !== 'hsv' && (this.inputs.hsv.value = this.toHsv());
    exclude !== 'hsi' && (this.inputs.hsi.value = this.toHsi());
  }

  roundHex(hex) {
    if (!hex.includes('.')) {
      return hex;
    }
    const decimal = hex.indexOf('.');
    const sixteenths = hex.slice(decimal + 1, decimal + 2);
    const integer = hex.slice(0, decimal);
    return sixteenths < 8 ? integer : (parseInt(integer, 16) + 1).toString(16);
  }
  
  /**
   * Turn an RGB(A) string or array into an rgb(a) color code
   * @param {Object} color Color object
   * @param {(string|number[])} color.rgb RGB array
   * @param {string|number} color.a Alpha value
 */
  toRgb(color = this.color) {
    if (typeof color.rgb === 'string') {
      color.rgb = color.rgb.split(/, */); // make sure there's a space after the commas
    }
    if (color.a != null && parseFloat(color.a) !== 1) {
      return `rgba(${color.rgb.join(', ')}, ${Math.round(parseFloat(color.a)*1000)/1000})`;
    }
    return `rgb(${color.rgb.join(', ')})`;
  }
  
  /**
   * Turn an RGB(A) object into a hex color code
   * @param {Object} color Color object
   * @param {(string|number[])} color.rgb RGB array
   * @param {string|number} color.a Alpha value
   */
  toHex(color = this.color) {
    let hexCode = '#';
    if (typeof color.rgb === 'string') {
      color.rgb = color.rgb.split(/, */).map(i => parseInt(i));
    }
    for (let i of color.rgb) {
      hexCode += ('0' + parseInt(i, 10).toString(16).toUpperCase()).slice(-2);
    }
    if (color.a != null) {
      color.a = parseFloat(color.a);
      color.a !== 1 && (hexCode += ('0' + this.roundHex((color.a * 255).toString(16)).toUpperCase()).slice(-2));
    }
    return hexCode;
  }

  /**
   * Turn an RGB(A) value into an HSL color code
   * @param {number} sliderVal A percentage for the color slider
   * @param {Object} color A color object
   */
  toHsl(slider = this.cSlider, color = this.color) {
    const mainColor = Math.round((slider.value / slider.max) * 360);

    let hue = 0;
    const max = Math.max(...color.rgb);
    const min = Math.min(...color.rgb);
    const chroma = max - min;

    if (chroma !== 0) {
      switch (max) {
        case color.rgb[0]:
          hue = ((color.rgb[1] - color.rgb[2]) / chroma) % 6;
        break;
        case color.rgb[1]:
          hue = ((color.rgb[2] - color.rgb[0]) / chroma) + 2;
        break;
        case color.rgb[2]:
          hue = ((color.rgb[0] - color.rgb[1]) / chroma) + 4;
        break;
      }
    }
    hue = Math.round(hue * 60);
    hue = Math.sign(hue) === -1 ? 360 + hue : hue;

    const lightness = (max + min) / 2 / 255;

    let saturation = 0;
    if (lightness !== 0 && lightness !== 1) {
      saturation = (chroma / (1 - Math.abs(2 * lightness - 1))) / 255;
    }

    const alpha = color.a;
    const includeAlpha = alpha === 1 ? '' : `, ${Math.round(alpha * 100)}%`;

    return `hsl(${mainColor}, ${Math.round(saturation * 100)}%, ${Math.round(lightness * 100)}%${includeAlpha})`;
  }

  hslToRgbFunc(hsl, number) {
    const k = (number + hsl.h / 30) % 12;
    return Math.round((hsl.l - (hsl.s * Math.min(hsl.l, 1 - hsl.l) * Math.max(-1, Math.min(k - 3, 9 - k, 1)))) * 255);
  }

  toHsv(slider = this.cSlider, color = this.color) {
    const hue = Math.round((slider.value / slider.max) * 360);
    const max = Math.max(...color.rgb);

    const value = max / 255;

    let saturation = 0;

    if (value !== 0) {
      saturation = ((max - Math.min(...color.rgb)) / value) / 255;
    }

    const showAlpha = color.a === 1 ? '' : `, ${Math.round(color.a * 100)}%`;
    return `hsv(${hue}, ${Math.round(saturation * 100)}%, ${Math.round(value *100)}%${showAlpha})`;
  }

  hsvToRgbFunc(hsv, number) {
    const k = (number + (hsv.h / 60)) % 6;
    return Math.round((hsv.v - (hsv.v * hsv.s * Math.max(0, Math.min(k, 4 - k, 1)))) * 255);
  }

  toHsi(slider = this.cSlider, color = this.color) {
    const mainColor = Math.round((slider.value / slider.max) * 360);
    const intensity = color.rgb.reduce((s, c) => s + c) / 3;

    let saturation = 0;
    if (intensity !== 0) {
      const min = Math.min(...color.rgb);
      saturation = 1 - (min / intensity)
    }

    const showAlpha = color.a === 1 ? '' : `, ${Math.round(color.a * 100)}%`;
    return `hsi(${mainColor}, ${Math.round(saturation * 100)}%, ${Math.round(intensity / 255 * 100)}%${showAlpha})`;
  }

  hsiToRgbFunc(hsi) { // might be possible to improve later
    const hPrime = hsi.h / 60;
    const z = 1 - Math.abs((hPrime % 2) - 1);
    const maxVal = (3 * hsi.i * hsi.s) / (1 + z);
    const midVal = maxVal * z;
    let rgb = [0, 0, 0];
    
    if (hPrime >= 0 && hPrime < 1) {
      rgb = [maxVal, midVal, 0];
    }
    else if (hPrime >= 1 && hPrime < 2) {
      rgb = [midVal, maxVal, 0];
    }
    else if (hPrime >= 2 && hPrime < 3) {
      rgb = [0, maxVal, midVal];
    }
    else if (hPrime >= 3 && hPrime < 4) {
      rgb = [0, midVal, maxVal];
    }
    else if (hPrime >= 4 && hPrime < 5) {
      rgb = [midVal, 0, maxVal];
    }
    else if (hPrime >= 5 && hPrime < 6) {
      rgb = [maxVal, 0, midVal];
    }

    return rgb.map(i => Math.round((i + (hsi.i * (1 - hsi.s))) * 255));
  }
}

const colorPick = new ColorPicker(
  'showColors', 'colorPick', 'showColor', 'mainColor', 'alphaSlider', 
'showRgb', 'showHex', 'showHsl', 'showHsv', 'showHsi');

document.body.style.setProperty('--show-optionals', 'none');
document.getElementById('showMore').addEventListener('click', () => {
  const toggle = getComputedStyle(document.body).getPropertyValue('--show-optionals') === 'none' ? 'block' : 'none';
  document.body.style.setProperty('--show-optionals', toggle);
}, false);

hexIn.addEventListener('input', () => {
  decIn.value = isNaN(parseInt(hexIn.value, 16)) ? '' : parseInt(hexIn.value, 16);
}, false);

decIn.addEventListener('input', () => {
  hexIn.value = decIn.value !== '' ? parseFloat(decIn.value).toString(16) : '';
}, false);

charCounter.addEventListener('input', showCharCount, false);
document.getElementById('noSpacesCheck').addEventListener('input', showCharCount, false);

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
    (!/^#?[0-9a-f]{0,8}(?!\S)/i.test(colorPick.inputs.hex.value) &&
    colorPick.inputs.hex.value !== '') ||
    colorPick.inputs.hex.value.replace('#', '').length >= 8))) { // possible number sign and up to eight hex digits
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
  if (e.type.includes('touch')) {
    e.preventDefault();
    e = e.touches[0];
  }
  const getRect = colorPick.showColors.getBoundingClientRect();
  
  colorPick.pickCoords = {
    x: minMax(e.clientX - getRect.x, 0, getRect.width),
    y: minMax(e.clientY - getRect.y, 0, getRect.height),
  };
  colorPick.setPickPos();

  colorPick.color.rgb = colorPick.calcColor();
  document.body.style.setProperty('--current-picker-color', colorPick.color.rgb);
  colorPick.setInputs();
}