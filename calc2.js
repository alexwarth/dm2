'use strict'

debug = false

class CalcObj extends Rectangle {
  info () {
    return [this.x, this.y, this.color, this.optInput]
  }

  constructor (x, y, color, optInput) {
    super(x, y, 50, 50, color)
    this.operands = []
    this.optInput = optInput
    this.acceptInput(optInput !== undefined ? optInput : '() => {}')
  }

  acceptInput (str) {
    const parts = /([a-zA-Z0-9_]+):(.*)/.exec(str)
    if (parts === null) {
      this.setValueFnFromString(str)
      this.labelStr = str
    } else {
      this.setValueFnFromString(parts[2])
      this.setLabelFromString(parts[1])
    }
  }

  setValueFnFromString (str) {
    return this.setValueFn(eval(str))
  }

  setValueFn (fn) {
    if (typeof fn !== 'function') {
      fn = eval(`() => ${fn}`)
    }
    this.valueFn = fn
    let argNames = fn.toString().split('=>')[0].replace(/[\(\)\ ]/g, '').split(',')
    if (argNames.length === 1 && argNames[0].length === 0) {
      argNames = []
    }
    const hasRestArg = argNames.length > 0 && argNames[argNames.length - 1].startsWith('...')
    this.minArity = Math.max(0, hasRestArg ? argNames.length - 1 : argNames.length)
    this.maxArity = hasRestArg ? Infinity : this.minArity
  }

  setLabelFromString (str) {
    try {
      const fn = eval(str)
      if (typeof fn === 'function') {
        this.labelFn = fn
      }
    } catch (e) {}
    this.labelStr = str
  }

  get label () {
    return this.labelFn ? this.labelFn(this.value) : this.labelStr
  }

  async step () {
    this.value = undefined
    const responses = await this.to.left(200).upTo(this.maxArity).send('ping')
    this.operands = responses.map(response => response.receiver)
    if (this.operands.length >= this.minArity) {
      const values = this.operands.map(operand => operand.value)
      this.value = values.some(value => value === undefined)
          ? undefined
          : this.valueFn(...values)
    }

    const label = this.label
    ctxt.font = '12pt Monaco'
    this.width = 30 + ctxt.measureText(label).width
    this.height = Math.max(50 * Math.max(this.minArity, 1), this.operands.length * 50)
  }

  drawUnderOn (ctxt, options) {
    for (let operand of this.operands) {
      ctxt.strokeStyle = 'yellow'
      ctxt.moveTo(this.x, this.y)
      ctxt.lineTo(operand.x, operand.y)
      ctxt.stroke()
    }
  }

  drawOn (ctxt, options) {
    super.drawOn(ctxt, options)
    ctxt.font = '12pt Monaco'
    ctxt.fillStyle = 'yellow'
    const text = this.label
    const x = this.x - ctxt.measureText(text).width / 2
    const y = this.y + 6
    ctxt.fillText(text, x, y)
  }
}

const data = (() => {
  // First grab from the url, if someone shares us a link
  const hash = rison.decode_object(decodeURI(window.location.hash.substring(1)))
  if (Date.parse(hash.updated) > Date.parse('14 Aug 1987')) { return hash }

  // Then grab from localstorage, if they were working on something
  const local = rison.decode_object(localStorage.getItem('calc2') || '')
  if (Date.parse(local.updated) > Date.parse('14 Aug 1987')) { return local }

  console.log(`using defaults`)
  // Otherwise make a set of defaults
  return {
    updated: new Date(),
    objects: [
      [100, 120, 'cornflowerblue', '1'],
      [100, 180, 'steelblue', '5'],
      [200, 150, 'indigo', 'plus: (a, b) => a + b'],
      [300, 150, 'maroon', 'a => a']
    ]
  }
})()

objects = data.objects.map(info => new CalcObj(...info))

window.setInterval(() => {
  const datastring = rison.encode_object({
    updated: new Date(),
    objects: objects.map(object => object.info())
  })

  localStorage.setItem('calc2', datastring)
  window.location.hash = datastring
}, 5000)
