'use strict'

const db = new Database(
  ['C1', 'is a', 'circle', 'at', '(', 300, ',', 300, ')'],
  ['C1', '\'s', 'color', 'is', 'cornflowerblue'],
  ['C1', '\'s', 'radius', 'is', 50],
  ['R1', 'is a', 'rectangle', 'at', '(', 450, ',', 150, ')'],
  ['R1', '\'s', 'width', 'is', 50],
  ['R1', '\'s', 'height', 'is', 100],
  ['R1', '\'s', 'color', 'is', 'salmon']
)

class Orchestrator extends Rectangle {
  constructor (...processes) {
    super(20, 20, 30, 30, 'indigo')
    this.processes = processes
  }

  async step (t) {
    objects = [this, ...this.processes]
  }

  addProcess (name, color, fn, optDisabled) {
    const lastObj = this.processes.length === 0
        ? this
        : this.processes[this.processes.length - 1]
    const process = new Rectangle(20, lastObj.y + 40, 30, 30, color)
    process.name = name
    process.drawOn = function (ctxt, options) {
      ctxt.font = '12pt optima'
      this.width = ctxt.measureText(this.name).width + 8
      this.x = this.width / 2 + 5
      Rectangle.prototype.drawOn.call(this, ctxt, options)
      ctxt.fillStyle = 'yellow'
      ctxt.fillText(this.name, this.x - this.width / 2 + 4, this.y + 6)
      if (this.disabled) {
        ctxt.lineWidth = 2
        ctxt.strokeStyle = 'red'
        ctxt.beginPath()
        ctxt.moveTo(this.leftX, this.topY)
        ctxt.lineTo(this.rightX, this.bottomY)
        ctxt.moveTo(this.rightX, this.topY)
        ctxt.lineTo(this.leftX, this.bottomY)
        ctxt.stroke()
        ctxt.lineWidth = 1
      }
    }
    process.step = t => {
      if (!process.disabled) {
        fn(t)
      }
    }
    process.disabled = !!optDisabled
    this.processes.push(process)
  }
}

const orchestrator = new Orchestrator()
objects.push(orchestrator)

function illuminate (fn) {
  const r = new Rectangle(0, 0, 0, 0, 'black')
  r.drawOn = () => {}
  r.drawOverOn = fn
  objects.push(r)
}

orchestrator.addProcess(
  'circle illuminator',
  'steelblue',
  () => {
    db.query(
      [
        ['$c', 'is a', 'circle', 'at', '(', '$x', ',', '$y', ')'],
        ['$c', '\'s', 'radius', 'is', '$r'],
        ['$c', '\'s', 'color', 'is', '$color']
      ],
      ({$x, $y, $r, $color}, facts, assert, retract) => {
        const c = new Circle($x, $y, $r, $color)
        c.fact = facts[0]
        objects.push(c)
      }
    )
  })

orchestrator.addProcess(
  'rectangle illuminator',
  'salmon',
  () => {
    db.query(
      [
        ['$r', 'is a', 'rectangle', 'at', '(', '$x', ',', '$y', ')'],
        ['$r', '\'s', 'width', 'is', '$w'],
        ['$r', '\'s', 'height', 'is', '$h'],
        ['$r', '\'s', 'color', 'is', '$color']
      ],
      ({$x, $y, $w, $h, $color}, facts, assert, retract) => {
        const r = new Rectangle($x, $y, $w, $h, $color)
        r.fact = facts[0]
        objects.push(r)
      }
    )
  })

orchestrator.addProcess(
  'object labeler',
  'maroon',
  () => {
    db.query(
      [['$c', 'is a', '$t', 'at', '(', '$x', ',', '$y', ')']],
      ({$c, $x, $y}, facts, assert, retract) => {
        illuminate(ctxt => {
          ctxt.fillStyle = 'lightyellow'
          ctxt.fillText($c, $x - ctxt.measureText($c).width / 2, $y + 6)
        })
      }
    )
  },
  true)

let globalVy = 0
orchestrator.addProcess(
  'gravity',
  'midnightblue',
  () => {
    globalVy += 1
    db.query(
      [['$obj', 'is a', '$t', 'at', '(', '$x', ',', '$y', ')']],
      ({$obj, $x, $y}, facts, assert, retract) => {
        retract(facts[0])
        const newFact = facts[0].slice()
        newFact[7] += globalVy
        assert(newFact).withoutEvidence()
      })
  },
  true)

function dist (ax, ay, bx, by) {
  return Math.pow(Math.pow(ax - bx, 2) + Math.pow(ay - by, 2), 0.5)
}

orchestrator.addProcess(
  'draw sightlines',
  'red',
  () => {
    db.query(
      [['$obj', 'is a', '$t', 'at', '(', '$x', ',', '$y', ')'],
       ['$obj2', 'is a', '$t2', 'at', '(', '$x2', ',', '$y2', ')'],
       ['$obj', 'can see', '$obj2']
      ],
      ({$obj, $obj2, $x, $y, $x2, $y2}, facts, assert, retract) => {
        illuminate(ctxt => {
          ctxt.beginPath()
          ctxt.strokeStyle = 'yellow'
          ctxt.lineWidth = 10
          ctxt.moveTo($x, $y)
          ctxt.lineTo($x2, $y2)
          ctxt.stroke()
          ctxt.linewidth = 1
        })
      }
    )
  })

orchestrator.addProcess(
  'seeing',
  'lightgreen',
  () => {
    db.query([
       ['$obj1', 'is a', '$t1', 'at', '(', '$x1', ',', '$y1', ')'],
       ['$obj2', 'is a', '$t2', 'at', '(', '$x2', ',', '$y2', ')']
    ],
      ({$obj1, $obj2, $x1, $y1, $x2, $y2}, facts, assert, retract) => {
        const d = dist($x1, $y1, $x2, $y2)
        if (d < 300) {
          assert([$obj1, 'can see', $obj2])
          assert([$obj2, 'can see', $obj1])
        } else {
          retract([$obj1, 'can see', $obj2])
          retract([$obj2, 'can see', $obj1])
        }
      }
    )
  })

orchestrator.addProcess(
  'is near a mouse',
  'orange',
  () => {
    db.query([
      ['$obj', 'is a', '$t', 'at', '(', '$x', ',', '$y', ')'],
      ['mouse', 'is', 'at', '(', '$mx', ',', '$my', ')']
    ],
    ({$obj, $mx, $my, $x, $y}, facts, assert, retract) => {
      const d = dist($mx, $my, $x, $y)
      if (d < 100) {
        assert([$obj, 'is near a mouse'])
      } else {
        retract([$obj, 'is near a mouse'])
      }
    })
  }
)

orchestrator.addProcess(
  'learning to not be afraid',
  'blue',
  () => {
    db.query([
        ['$obj', 'is afraid of mice'],
        ['$obj', 'can see', '$obj2'],
        ['$obj2', 'is not afraid of mice'],
        ['$obj2', 'is near a mouse']
    ],
      ({$obj}, facts, assert, retract) => {
        retract([$obj, 'is afraid of mice'])
        assert([$obj, 'is not afraid of mice'])
      }
    )
  },
  true)

orchestrator.addProcess(
  'fear of mice',
  'red',
  () => {
    db.query([
        ['$obj', 'is near a mouse'],
        ['$obj', 'is a', '$t', 'at', '(', '$x', ',', '$y', ')'],
        ['$obj', 'is afraid of mice'],
        ['mouse', 'is', 'at', '(', '$mx', ',', '$my', ')']
    ],
      ({$mx, $my, $obj, $x, $y}, facts, assert, retract) => {
        retract(facts[1])
        const newFact = facts[1].slice()
        const v = 2
        const dx = v * ($mx > $x ? -1 : 1)
        const dy = v * ($my > $y ? -1 : 1)
        newFact[5] += dx
        newFact[7] += dy
        assert(newFact)
      })
  },
  true)

let webcamInitStarted = false
let webcamTrack = null
let webcamFrameFact = null
let readyForNextFrame = true
orchestrator.addProcess(
  'webcam',
  'blue',
  () => {
    if (!webcamTrack) {
      if (webcamInitStarted) {
        return
      }
      webcamInitStarted = true
      navigator.mediaDevices.getUserMedia({video: true}).then(mediaStream => {
        webcamTrack = mediaStream.getVideoTracks()[0]
      })
    } else if (readyForNextFrame) {
      readyForNextFrame = false
      const imageCapture = new ImageCapture(webcamTrack)
      imageCapture.grabFrame().then(x => {
        db.retract(webcamFrameFact)
        webcamFrameFact = ['image', 'from', 'webcam', 'is', x]
        db.assert(webcamFrameFact)
        readyForNextFrame = true
        console.log('-----')
        console.log(db.toString())
      }).catch(e => {
        readyForNextFrame = true
      })
    }
  },
  true)

orchestrator.addProcess(
  'video display',
  'violet',
  () => {
    db.query(
      [['image', 'from', 'webcam', 'is', '$bitmap']],
      ({$bitmap}, facts, assert, retract) => {
        const r = new Rectangle(canvas.width - 160, 120, 320, 240, 'green')
        r.drawOn = function (ctxt) {
          ctxt.drawImage($bitmap, r.leftX, r.topY, r.width, r.height)
        }
        r.facts = facts[0]
        objects.push(r)
      })
  },
  true)

orchestrator.addProcess(
  'halos',
  '#abc',
  () => {
    db.query(
      [['$thing', 'is a', 'circle', 'at', '(', '$x', ',', '$y', ')'],
       ['$thing', '\'s', 'radius', 'is', '$r']],
      ({$x, $y, $r}, facts, assert, retract) => {
        illuminate(ctxt => {
          ctxt.beginPath()
          ctxt.strokeStyle = 'yellow'
          ctxt.lineWidth = 10
          ctxt.arc($x, $y, $r + 20, 0, Math.PI * 2)
          ctxt.stroke()
          ctxt.linewidth = 1
        })
      })
  })

let targetObjId = null

let nextIdNum = 1
function makeNewId () {
  return 'obj#' + nextIdNum++
}

const colors = ['cornflowerblue', 'steelblue', 'maroon', 'yellow', '#ccc']
function randomColor () {
  return colors[Math.floor(Math.random() * Math.floor(colors.length))]
}

let mouseButtonFact = null

document.body.addEventListener('mousedown', e => {
  db.retract(mouseButtonFact)
  mouseButtonFact = ['mouse', 'button', 'is', 'down']
  db.assert(mouseButtonFact)

  for (let process of orchestrator.processes) {
    if (process.containsPoint(mouse.x, mouse.y)) {
      process.disabled = !process.disabled
    }
  }

  if (e.altKey) {
    const obj = makeNewId()
    const facts = [
      [obj, 'is a', 'circle', 'at', '(', mouse.x, ',', mouse.y, ')'],
      [obj, '\'s', 'radius', 'is', 50 + (Math.random() - 0.5) * 20],
      [obj, '\'s', 'color', 'is', randomColor()]
    ]
    if (Math.random() < 0.5) {
      facts.push([obj, 'is afraid of mice'])
    } else {
      facts.push([obj, 'is not afraid of mice'])
    }
    db.assert(...facts)
  } else if (e.metaKey) {
    const obj = makeNewId()
    const facts = [
      [obj, 'is a', 'rectangle', 'at', '(', mouse.x, ',', mouse.y, ')'],
      [obj, '\'s', 'width', 'is', 50 + (Math.random() - 0.5) * 20],
      [obj, '\'s', 'height', 'is', 50 + (Math.random() - 0.5) * 20],
      [obj, '\'s', 'color', 'is', randomColor()]
    ]
    if (Math.random() < 0.5) {
      facts.push([obj, 'is afraid of mice'])
    } else {
      facts.push([obj, 'is not afraid of mice'])
    }
    db.assert(...facts)
  } else {
    targetObjId = mouse.targetObj && mouse.targetObj.fact && mouse.targetObj.fact[0]
  }
  console.log('-----')
  console.log(db.toString())
})

let mousePosFact = null

document.body.addEventListener('mousemove', e => {
  db.retract(mousePosFact)
  mousePosFact = ['mouse', 'is', 'at', '(', mouse.x, ',', mouse.y, ')']
  db.assert(mousePosFact)

  if (targetObjId) {
    db.query(
      [[targetObjId, 'is a', '$t', 'at', '(', '$x', ',', '$y', ')']],
      ({targetObjId, $t, $x, $y}, facts, assert, retract) => {
        retract(facts[0])
        const newFact = facts[0].slice()
        newFact[5] = mouse.x
        newFact[7] = mouse.y
        assert(newFact).withoutEvidence()
      })
  }

  console.log('-----')
  console.log(db.toString())
})

document.body.addEventListener('mouseup', e => {
  db.retract(mouseButtonFact)
  mouseButtonFact = ['mouse', 'button', 'is', 'up']
  db.assert(mouseButtonFact)
  targetObjId = null
  console.log('-----')
  console.log(db.toString())
})

const host = window.document.location.host.replace(/:.*/, '')
let ws = new WebSocket('ws://' + host + ':3000')

ws.onconnect = (event, somethingelse) => {
  ws.send('it me')
}

ws.onmessage = event => {
  console.log(event)
//  const assertion = JSON.parse(event.data)
//  if (typeof assertion == 'Array') {
 //   db.assert(assertion)
  // }
}
