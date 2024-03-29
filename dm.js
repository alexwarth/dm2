'use strict';

let debug = true;

class Obj {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.color = color;
  }

  moveTo(x, y) {
    const dx = x - this.x;
    const dy = y - this.y;
    this.moveBy(dx, dy);
  }

  moveBy(dx, dy) {
    this.x += dx;
    this.y += dy;
  }

  destroy() {
    const idx = objects.indexOf(this);
    if (idx < 0) {
      throw new Error('cannot destroy an object twice!');
    }
    objects.splice(idx, 1);
  }

  get to() {
    return new ReceiverDescriptor(this);
  }

  async ping() {
    return 'pong';
  }

  get leftX() {
    throw new Error('subclass responsibility');
  }

  get rightX() {
    throw new Error('subclass responsibility');
  }

  get topY() {
    throw new Error('subclass responsibility');
  }

  get bottomY() {
    throw new Error('subclass responsibility');
  }

  containsPoint(x, y) {
    throw new Error('subclass responsibility');
  }

  overlapsWith(thatObj) {
    throw new Error('subclass responsibility');
  }

  // TODO: come up with a better name for this
  drawUnderOn(ctxt, options) {
    // no-op
  }

  drawOn(ctxt, options) {
    throw new Error('subclass responsibility');
  }

  drawOverOn(ctxt, options) {
    // no-op
  }

  setStrokeStyle(ctxt, options) {
    if (!options) {
      return false;
    }
    if (options.isSender) {
      ctxt.strokeStyle = 'white';
      ctxt.lineWidth = 4;
      return true;
    } else if (options.isCurrentReceiver) {
      ctxt.strokeStyle = 'yellow';
      ctxt.lineWidth = 4;
      return true;
    } else if (options.isReceiver) {
      ctxt.strokeStyle = 'yellow';
      ctxt.lineWidth = 2;
      return true;
    } else {
      return false;
    }
  }

  async step(t) {
    // no-op
  }

  async send(receiverDescriptor, selector, ...args) {
    const waitTimeSecs = .5;
    const beam = receiverDescriptor.toBeam(selector, args);
    beams.push(beam);

    function dist(a, b) {
      return Math.pow(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2), 0.5);
    }

    const receivers = objects.
        filter(obj =>
            obj !== this &&
            obj instanceof receiverDescriptor.receiverType &&
            beam.overlapsWith(obj)).
        sort((a, b) => dist(a, beam.sender) - dist(b, beam.sender));
    receivers.length = Math.min(receivers.length, receiverDescriptor.maxNumReceivers);

    let receiver;

    async function showDebugStuff() {
      if (!debug) {
        return;
      }
      ctxt.clearRect(0, 0, canvas.width, canvas.height);
      const beamDampingFactor = 0.8;
      ctxt.globalAlpha = 0.25 * Math.pow(beamDampingFactor, beams.length - 1);
      for (let beam of beams) {
        beam.drawOn(ctxt);
        ctxt.globalAlpha /= beamDampingFactor;
      }
      ctxt.globalAlpha = 1;
      for (let obj of objects) {
        const options = {
          isSender: obj === beam.sender,
          isReceiver: receivers.includes(obj),
          isCurrentReceiver: obj === receiver
        }
        obj.drawUnderOn(ctxt, options);
      }
      for (let obj of objects) {
        const options = {
          isSender: obj === beam.sender,
          isReceiver: receivers.includes(obj),
          isCurrentReceiver: obj === receiver
        }
        obj.drawOn(ctxt, options);
      }
      for (let obj of objects) {
        const options = {
          isSender: obj === beam.sender,
          isReceiver: receivers.includes(obj),
          isCurrentReceiver: obj === receiver
        }
        obj.drawOverOn(ctxt, options);
      }

      ctxt.font = '12pt Avenir';
      const textDampingFactor = 0.45;
      ctxt.globalAlpha = Math.pow(textDampingFactor, beams.length - 1);
      for (let beam of beams) {
        const label = `${beam.selector}(${beam.args.map(stringify).join(', ')})`;
        const width = ctxt.measureText(label).width;
        const height = 12;
        const x = beam.sender.x - width / 2;
        const y = beam.sender.y + height / 2;
        ctxt.fillStyle = 'black';
        ctxt.fillText(label, x + 2, y + 2);
        ctxt.fillStyle = 'yellow';
        ctxt.fillText(label, x, y);
        ctxt.globalAlpha /= textDampingFactor;
      }
      ctxt.globalAlpha = 1;
      await seconds(waitTimeSecs);
    }

    await showDebugStuff();

    const responses = [];
    try {
      for (receiver of receivers) {
        const result = await (async () => {
          await showDebugStuff();
          const ans = await receiver[selector](...args);
          return ans;
        })();
        responses.push({receiver, result});
      }
      if (receivers.length > 0) {
        receiver = null;
        await showDebugStuff();
      }
      beams.pop();
      return responses;
    } catch (e) {
      console.error(e);
      throw new Error('TODO: handle exceptions...');
    }
  }
}

class Rectangle extends Obj {
  constructor(x, y, width, height, color) {
    super(x, y, color);
    this.width = width;
    this.height = height;
  }

  get leftX() {
    return this.x - this.width / 2;
  }

  get rightX() {
    return this.x + this.width / 2;
  }

  get topY() {
    return this.y - this.height / 2;
  }

  get bottomY() {
    return this.y + this.height / 2;
  }

  containsPoint(x, y) {
    return this.leftX <= x && x < this.rightX &&
           this.topY <= y && y < this.bottomY;
  }

  overlapsWith(that) {
    if (that instanceof Rectangle) {
      return !(
          this.rightX < that.leftX ||
          this.leftX > that.rightX ||
          this.bottomY < that.topY ||
          this.topY > that.bottomY);
    } else if (that instanceof Circle) {
      return false ||
          this.containsPoint(that.x, that.y) ||
          that.intersectsWithLine(this.leftX, this.topY, this.rightX, this.topY) ||
          that.intersectsWithLine(this.leftX, this.topY, this.leftX, this.bottomY) ||
          that.intersectsWithLine(this.rightX, this.topY, this.rightX, this.bottomY) ||
          that.intersectsWithLine(this.leftX, this.bottomY, this.rightX, this.bottomY);
    } else {
      throw new Error('???');
    }
  }

  drawOn(ctxt, options) {
    ctxt.fillStyle = this.color;
    ctxt.fillRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
    const oldLineWidth = ctxt.lineWidth;
    if (this.setStrokeStyle(ctxt, options)) {
      ctxt.strokeRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
      ctxt.lineWidth = oldLineWidth;
    }
  }
}

class Circle extends Obj {
  constructor(x, y, radius, color) {
    super(x, y, color);
    this.radius = radius;
  }

  get leftX() {
    return this.x - this.radius;
  }

  get rightX() {
    return this.x + this.radius;
  }

  get topY() {
    return this.y - this.radius;
  }

  get bottomY() {
    return this.y + this.radius;
  }

  containsPoint(x, y) {
    const dx = this.x - x;
    const dy = this.y - y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return dist < this.radius;
  }

  intersectsWithLine(x1, y1, x2, y2) {
    if (this.containsPoint(x1, y1) || this.containsPoint(x2, y2)) {
      return true;
    } else if (y1 === y2) {
      return this.topY <= y1 && y1 <= this.bottomY &&
             x1 <= this.leftX && this.rightX <= x2;
    } else if (x1 === x2) {
      return this.leftX <= x1 && x1 <= this.rightX &&
             y1 <= this.topY && this.bottomY <= y2;
    } else {
      throw new Error('TODO');
    }
  }

  overlapsWith(that) {
    if (that instanceof Rectangle) {
      return that.overlapsWith(this);
    } else if (that instanceof Circle) {
      const dx = this.x - that.x;
      const dy = this.y - that.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      return dist < this.radius + that.radius;
    } else {
      throw new Error('???');
    }
  }

  drawOn(ctxt, options) {
    ctxt.fillStyle = this.color;
    ctxt.beginPath();
    ctxt.arc(this.x, this.y, this.radius, 0, 2 * Math.PI);
    ctxt.fill();
    const oldLineWidth = ctxt.lineWidth;
    if (this.setStrokeStyle(ctxt, options)) {
      ctxt.stroke();
      ctxt.lineWidth = oldLineWidth;
    }
  }
}

class ReceiverDescriptor {
  constructor(sender) {
    this.sender = sender;
  }

  all(optReceiverType) {
    return this.upTo(Infinity, optReceiverType);
  }

  one(optReceiverType) {
    return this.upTo(1, optReceiverType);
  }

  upTo(maxNumReceivers, optReceiverType) {
    this._set('maxNumReceivers', maxNumReceivers);
    this._set('receiverType', optReceiverType);
    return this;
  }

  left(optMaxDistance) {
    this._set('direction', 'left');
    this._set('maxDistance', optMaxDistance);
    return this;
  }

  right(optMaxDistance) {
    return this.direction('right', optMaxDistance);
  }

  up(optMaxDistance) {
    return this.direction('up', optMaxDistance);
  }

  down(optMaxDistance) {
    return this.direction('down', optMaxDistance);
  }

  nearby(optMaxDistance) {
    return this.direction('nearby', optMaxDistance);
  }

  direction(direction, optMaxDistance) {
    this._set('direction', direction);
    this._set('maxDistance', optMaxDistance);
    return this;
  }

  _set(prop, optValue) {
    if (optValue === undefined) {
      // no-op
    } else if (this.hasOwnProperty(prop) && this[prop] !== optValue) {
      throw new Error('conflicting values for ' + prop);
    } else {
      this[prop] = optValue;
    }
  }

  async send(selector, ...args) {
    this.fillInDefaults();
    return await this.sender.send(this, selector, ...args);
  }

  fillInDefaults() {
    if (!this.hasOwnProperty('maxNumReceivers')) {
      this.maxNumReceivers = Infinity;
    }
    if (!this.hasOwnProperty('direction')) {
      this.direction = 'nearby';
    }
    if (!this.hasOwnProperty('receiverType')) {
      this.receiverType = Obj;
    }
    if (!this.hasOwnProperty('maxDistance')) {
      this.maxDistance = Infinity;
    }
  }

  toBeam(selector, args) {
    let beam;
    switch (this.direction) {
      case 'up': {
        const beamHeight = Math.min(this.maxDistance, this.sender.y);
        beam = new Rectangle(
          this.sender.x,
          this.sender.y - beamHeight / 2,
          this.sender.rightX - this.sender.leftX,
          beamHeight,
          'yellow');
        break;
      }
      case 'down': {
        const beamHeight = Math.min(this.maxDistance, canvas.height - this.sender.y);
        beam = new Rectangle(
          this.sender.x,
          this.sender.y + beamHeight / 2,
          this.sender.rightX - this.sender.leftX,
          beamHeight,
          'yellow');
        break;
      }
      case 'left': {
        const beamWidth = Math.min(this.maxDistance, this.sender.x);
        beam = new Rectangle(
          this.sender.x - beamWidth / 2,
          this.sender.y,
          beamWidth,
          this.sender.bottomY - this.sender.topY,
          'yellow');
        break;
      }
      case 'right': {
        const beamWidth = Math.min(this.maxDistance, canvas.width - this.sender.x);
        beam = new Rectangle(
          this.sender.x + beamWidth / 2,
          this.sender.y,
          beamWidth,
          this.sender.bottomY - this.sender.topY,
          'yellow');
        break;
      }
      case 'nearby': {
        const maxDistance = Math.min(
            this.maxDistance,
            2 * Math.max(canvas.width, canvas.height));
        beam = new Circle(this.sender.x, this.sender.y, maxDistance, 'yellow');
        break;
      }
      default: {
        throw new Error('unknown direction ' + dir);
      }
    }
    beam.sender = this.sender;
    beam.selector = selector;
    beam.args = args;
    return beam;
  }
}

function stringify(x) {
  if (x === null || typeof x === 'number' || typeof x === 'undefined') {
    return '' + x;
  } else if (typeof x === 'string') {
    return JSON.stringify(x);
  } else if (typeof x === 'function') {
    return 'fn';
  } else if (x instanceof Array) {
    return '[' + x.map(stringify).join(', ') + ']';
  } else if (typeof x === 'object') {
    return '{' + Object.keys(x).map(k => k + ': ' + stringify(x[k])).join(', ') + '}';
  } else {
    console.info(typeof x, x);
    return '?';
  }
}

function seconds(s) {
  return new Promise(resolve => {
    setTimeout(resolve, s * 1000);
  });
}

const mouse = {
  x: -10,
  y: -10,
  buttonIsDown: false,
  targetObj: null,
  targetObjOffsetX: 0,
  targetObjectOffsetY: 0
};

const ctxt = canvas.getContext('2d');

canvas.addEventListener('mousemove', e => {
  mouse.x = e.offsetX;
  mouse.y = e.offsetY;
  if (mouse.targetObj) {
    mouse.targetObj.moveTo(
      mouse.x - mouse.targetObjOffsetX,
      mouse.y - mouse.targetObjOffsetY);
  }
});

document.body.addEventListener('mousedown', e => {
  mouse.buttonIsDown = true;
  mouse.targetObj = null;
  for (let idx = objects.length - 1; idx >= 0; idx--) {
    const obj = objects[idx];
    if (!mouse.targetObj && obj.containsPoint(mouse.x, mouse.y)) {
      mouse.targetObj = obj;
      mouse.targetObjOffsetX = mouse.x - obj.x;
      mouse.targetObjOffsetY = mouse.y - obj.y;
      objects.splice(objects.indexOf(obj), 1);
      objects.push(obj);
    }
  }
});

document.body.addEventListener('mouseup', e => {
  mouse.buttonIsDown = false;
  mouse.targetObj = null;
});

document.body.addEventListener('keydown', e => {
  if (e.code === 'Space') {
    debug = !debug;
  }
});

let objects = [];
const beams = [];
let scheduledSends = [];
let t = 0;

function fixCanvasSize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

fixCanvasSize();

async function main() {
  fixCanvasSize();
  for (let obj of objects) {
    await obj.step(t);
  }
  t++;

  ctxt.clearRect(0, 0, canvas.width, canvas.height);
  for (let obj of objects) {
    obj.drawUnderOn(ctxt);
  }
  for (let obj of objects) {
    obj.drawOn(ctxt);
  }
  for (let obj of objects) {
    obj.drawOverOn(ctxt);
  }

  if (scheduledSends.length > 0) {
    const {descriptor, selector, args} = scheduledSends.shift();
    await descriptor.send(selector, ...args);
  }

  requestAnimationFrame(main);
}

requestAnimationFrame(main);
