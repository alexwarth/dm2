'use strict';

class Obj {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.color = color;
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

  async conductRight() {
    await this.send('right', 100, 'conductRight');
  }

  async send(dir, threshold, selector, ...args) {
    const beam = this.makeBeam(dir, threshold);
    beams.push(beam);

    const dampingFactor = 0.8;
    ctxt.clearRect(0, 0, canvas.width, canvas.height);
    ctxt.globalAlpha = 0.25 * Math.pow(dampingFactor, beams.length - 1);
    for (let beam of beams) {
      console.log('ga', ctxt.globalAlpha);
      beam.drawOn(ctxt);
      ctxt.globalAlpha /= dampingFactor;
    }
    ctxt.globalAlpha = 1;

    const receivers = objects.filter(obj => obj !== this && beam.overlapsWith(obj));
    for (let obj of objects) {
      const options = {
        isSender: obj === this,
        isReceiver: receivers.includes(obj)
      }
      obj.drawOn(ctxt, options);
    }
    await seconds(1);

    const responses = [];
    try {
      for (let receiver of receivers) {
        const result = await (async () => {
          return await receiver[selector](args);
        })();
        responses.push({receiver, result});
      }
      beams.pop();
      return responses;
    } catch (e) {
      throw new Error('TODO: handle exceptions...');
    }
  }

  makeBeam(dir, optThreshold) {
    switch (dir) {
      case 'up': {
        const beamHeight = optThreshold || this.y;
        return this.makeDirectionalBeam(
          this.x,
          this.y - beamHeight / 2,
          this.rightX - this.leftX,
          beamHeight);
      }
      case 'down': {
        const beamHeight = optThreshold || this.y;
        return this.makeDirectionalBeam(
          this.x,
          this.y + beamHeight / 2,
          this.rightX - this.leftX,
          beamHeight);
      }
      case 'left': {
        const beamWidth = optThreshold || this.x;
        return this.makeDirectionalBeam(
          this.x - beamWidth / 2,
          this.y,
          beamWidth,
          this.bottomY - this.topY);
      }
      case 'right': {
        const beamWidth = optThreshold || this.x;
        return this.makeDirectionalBeam(
          this.x + beamWidth / 2,
          this.y,
          beamWidth,
          this.bottomY - this.topY);
      }
      case 'nearby': {
        return this.makeProximityBeam(optThreshold || Math.max(canvas.width, canvas.height));
      }
      default: {
        throw new Error('unknown direction ' + dir);
      }
    }
  }

  makeDirectionalBeam(x, y, width, height) {
    const beam = new Rectangle(x, y, width, height, 'yellow');
    beam.sender = this;
    return beam;
  }

  makeProximityBeam(radius) {
    const beam = new Circle(this.x, this.y, radius, 'yellow');
    beam.sender = this;
    return beam;
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
      return false ||
          this.containsPoint(that.leftX, that.topY) ||
          this.containsPoint(that.leftX, that.bottomY) ||
          this.containsPoint(that.rightX, that.topY) ||
          this.containsPoint(that.rightX, that.bottomY);
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
