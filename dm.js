'use strict';

class Obj {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.color = color;
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

  drawOn(ctxt, options) {
    throw new Error('subclass responsibility');
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

  async step() {
    // no-op
  }

  async conduct(dir, dist) {
    if (this.color !== 'red') {
      this.color = 'red';
      await this.to.direction(dir, dist).send('conduct', dir, dist);
    }
  }

  async send(receiverDescriptor, selector, ...args) {
    const waitTimeSecs = .1;
    const beam = receiverDescriptor.toBeam();
    beams.push(beam);

    const receivers = objects.filter(obj =>
        obj !== this &&
        obj instanceof receiverDescriptor.receiverType &&
        beam.overlapsWith(obj));

    async function showDebugStuff() {
      if (!debug) {
        return;
      }
      ctxt.clearRect(0, 0, canvas.width, canvas.height);
      const dampingFactor = 0.8;
      ctxt.globalAlpha = 0.25 * Math.pow(dampingFactor, beams.length - 1);
      for (let beam of beams) {
        beam.drawOn(ctxt);
        ctxt.globalAlpha /= dampingFactor;
      }
      ctxt.globalAlpha = 1;
      for (let obj of objects) {
        const options = {
          isSender: obj === beam.sender,
          isReceiver: receivers.includes(obj)
        }
        obj.drawOn(ctxt, options);
      }
      await seconds(waitTimeSecs);
    }

    await showDebugStuff();

    const responses = [];
    try {
      for (let receiver of receivers) {
        const result = await (async () => {
          const ans = await receiver[selector](...args);
          return ans;
        })();
        responses.push({receiver, result});
      }
      beams.pop();
      await showDebugStuff();
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
    if (this.setStrokeStyle(ctxt, options)) {
      ctxt.strokeRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
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
    if (this.setStrokeStyle(ctxt, options)) {
      ctxt.stroke();
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
    this._set('receiverType', optType);
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
    if (optValue && this.hasOwnProperty(prop)) {
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

  toBeam() {
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
            Math.max(canvas.width, canvas.height));
        beam = new Circle(this.sender.x, this.sender.y, maxDistance, 'yellow');
        break;
      }
      default: {
        throw new Error('unknown direction ' + dir);
      }
    }
    beam.sender = this;
    return beam;
  }
}
