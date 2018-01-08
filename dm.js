'use strict';

class Obj {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.color = color;
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
    if (options.isSender) {
      ctxt.strokeStyle = 'yellow';
      ctxt.lineWidth = 4;
      return true;
    } else if (options.isCurrentReceiver) {
      ctxt.strokeStyle = 'red';
      ctxt.lineWidth = 4;
      return true;
    } else if (options.isReceiver) {
      ctxt.strokeStyle = 'red';
      ctxt.lineWidth = 2;
      return true;
    } else {
      return false;
    }
  }

  sendUp(optThreshold) {
    const beamHeight = optThreshold || this.y;
    this.addDirectionalBeam(
      this.x,
      this.y - beamHeight / 2,
      this.rightX - this.leftX,
      beamHeight);
  }

  sendLeft(optThreshold) {
    const beamWidth = optThreshold || this.x;
    this.addDirectionalBeam(
      this.x - beamWidth / 2,
      this.y,
      beamWidth,
      this.bottomY - this.topY);
  }

  sendNearby(radius) {
    this.addProximityBeam(radius);
  }

  addDirectionalBeam(x, y, width, height) {
    const beam = new Rectangle(x, y, width, height, 'rgba(255, 255, 255, .25)');
    beam.isBeam = true;
    beam.sender = this;
    objects.splice(objects.indexOf(this), 0, beam);
    return beam;
  }

  addProximityBeam(radius) {
    const beam = new Circle(this.x, this.y, radius, 'rgba(255, 255, 255, .25)');
    beam.isBeam = true;
    beam.sender = this;
    objects.splice(objects.indexOf(this), 0, beam);
    return beam;
  }

  async step() {
    // no-op
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
          that.containsPoint(this.leftX, this.topY) ||
          that.containsPoint(this.leftX, this.bottomY) ||
          that.containsPoint(this.rightX, this.topY) ||
          that.containsPoint(this.rightX, this.bottomY);
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
