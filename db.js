'use strict'

const db = new RoomDB(`http://localhost:3000`)
const client = db.connect()
client.assert('#C1 is a circle at (300, 300)')
client.assert('#C1\'s color is "cornflowerblue"')
client.assert('#C1\'s radius is 50')
client.assert('#C1 is a circle at (300, 300)')
client.assert('#R1 is a rectangle at (450, 150)')
client.assert('#R1\'s width is 50')
client.assert('#R1\'s height is 100')
client.assert('#R1\'s color is "salmon"')

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
    process.client = db.connect()
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
        fn(process.client, t)
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
  client => {
    client.select(
      '$obj is a circle at ($x, $y)',
      '$obj\'s radius is $r',
      '$obj\'s color is $color'
    ).do(({obj, x, y, r, color}) => {
      const c = new Circle(x, y, r, color)
      c.id = obj
      objects.push(c)
    })
  })

orchestrator.addProcess(
  'rectangle illuminator',
  'salmon',
  client => {
    client.select(
      '$obj is a rectangle at ($x, $y)',
      '$obj\'s width is $w',
      '$obj\'s height is $h',
      '$obj\'s color is $color'
    ).do(({obj, x, y, w, h, color}) => {
      const r = new Rectangle(x, y, w, h, color)
      r.id = obj
      objects.push(r)
    })
  })

orchestrator.addProcess(
  'object labeler',
  'maroon',
  client => {
    client.select(
      '$id is a $t at ($x, $y)'
    ).do(({id, x, y}) => {
      illuminate(ctxt => {
        const label = id.toString()
        ctxt.fillStyle = 'lightyellow'
        ctxt.fillText(label, x - ctxt.measureText(label).width / 2, y + 6)
      })
    })
  })

orchestrator.addProcess(
  'halos',
  '#abc',
  client => {
    client.select(
      '$obj is a circle at ($x, $y)',
      '$obj\'s radius is $r'
    ).do(({x, y, r}) => {
      illuminate(ctxt => {
        ctxt.beginPath()
        ctxt.strokeStyle = 'yellow'
        ctxt.lineWidth = 10
        ctxt.arc(x, y, r + 20, 0, Math.PI * 2)
        ctxt.stroke()
        ctxt.linewidth = 1
      })
    })
  },
  true)

let globalVy = 0
orchestrator.addProcess(
  'gravity',
  'midnightblue',
  client => {
    globalVy += 1
    client.select(
      '$obj is a $t at ($x, $y)'
    ).do(({obj, t, x, y}) => {
      client.retract('_ is a $t at ($x, $y)', obj)
      client.assert(`${obj} is a ${t} at (${x}, ${y + globalVy})`)
    })
  },
  true)

function dist (ax, ay, bx, by) {
  return Math.pow(Math.pow(ax - bx, 2) + Math.pow(ay - by, 2), 0.5)
}

orchestrator.addProcess(
  'seeing',
  'lightgreen',
  client => {
    client.retractEverythingAssertedByMe()
    client.select(
      '$obj1 is a $t1 at ($x1, $y1)',
      '$obj2 is a $t2 at ($x2, $y2)'
    ).do(({obj1, x1, y1, obj2, x2, y2}) => {
      const d = dist(x1, y1, x2, y2)
      if (d < 300) {
        client.assert('_ can see _', obj1, obj2)
        client.assert('_ can see _', obj2, obj1)
      }
    })
  },
  true)

orchestrator.addProcess(
  'draw sightlines',
  'red',
  client => {
    client.select(
      '$obj1 is a $t1 at ($x1, $y1)',
      '$obj2 is a $t2 at ($x2, $y2)',
      '$obj1 can see $obj2'
    ).do(({x1, y1, x2, y2}) => {
      illuminate(ctxt => {
        ctxt.beginPath()
        ctxt.strokeStyle = 'yellow'
        ctxt.lineWidth = 10
        ctxt.moveTo(x1, y1)
        ctxt.lineTo(x2, y2)
        ctxt.stroke()
        ctxt.linewidth = 1
      })
    })
  },
  true)

orchestrator.addProcess(
  'is near a mouse',
  'orange',
  client => {
    client.retractEverythingAssertedByMe()
    client.select(
      '$obj is a $t at ($ox, $oy)',
      'mouse is at ($mx, $my)'
    ).do(({obj, ox, oy, mx, my}) => {
      const d = dist(ox, oy, mx, my)
      if (d < 100) {
        client.assert('_ is near a mouse', obj)
      }
    })
  },
  true)

orchestrator.addProcess(
  'fear of mice',
  'red',
  client => {
    client.select(
      '$obj is near a mouse',
      '$obj is a $t at ($ox, $oy)',
      '$obj is afraid of mice',
      '$mouse is at ($mx, $my)'
    ).do(({obj, t, ox, oy, mx, my}) => {
      const v = 2
      const dx = v * (mx > ox ? -1 : 1)
      const dy = v * (my > oy ? -1 : 1)
      client.retract('_ is a _ at (_, _)', obj, t, ox, oy)
      client.assert('_ is a _ at (_, _)', obj, t, ox + dx, oy + dy)
    })
  },
  true)

orchestrator.addProcess(
  'learning to not be afraid',
  'blue',
  client => {
    client.select(
      '$obj1 is afraid of mice',
      '$obj1 can see $obj2',
      '$obj2 is not afraid of mice',
      '$obj2 is near a mouse'
    ).do(({obj1}) => {
      client.retract('_ is afraid of mice', obj1)
      client.assert('_ is not afraid of mice', obj1)
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
  client => {
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
        client.retract('image from webcam is $bitmap')
        client.assert('image from webcam is _', x)
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
  client => {
    client.select(
      'image from webcam is $bitmap'
    ).do(({bitmap}) => {
      illuminate(ctxt => {
        ctxt.drawImage(bitmap, canvas.width - 320, 0, 320, 240)
      })
    })
  },
  true)

let targetObjId = null

let nextIdNum = 1
function makeNewId () {
  return new Id('obj' + nextIdNum++)
}

const colors = ['cornflowerblue', 'steelblue', 'maroon', 'yellow', '#ccc']
function randomColor () {
  return colors[Math.floor(Math.random() * Math.floor(colors.length))]
}

let mouseButtonFact = null

document.body.addEventListener('mousedown', e => {
  client.retract('mouse button is $mouseButtonState')
  client.assert('mouse button is down')

  for (let process of orchestrator.processes) {
    if (process.containsPoint(mouse.x, mouse.y)) {
      process.disabled = !process.disabled
    }
  }

  if (e.altKey) {
    const obj = makeNewId()
    client.assert('_ is a circle at (_, _)', obj, mouse.x, mouse.y)
    client.assert('_\'s radius is _', obj, 50 + (Math.random() - 0.5) * 20)
    client.assert('_\'s color is _', obj, randomColor())
    if (Math.random() < 0.5) {
      client.assert('_ is afraid of mice', obj)
    } else {
      client.assert('_ is not afraid of mice', obj)
    }
  } else if (e.metaKey) {
    const obj = makeNewId()
    client.assert('_ is a rectangle at (_, _)', obj, mouse.x, mouse.y)
    client.assert('_\'s width is _', obj, 50 + (Math.random() - 0.5) * 20)
    client.assert('_\'s height is _', obj, 50 + (Math.random() - 0.5) * 20)
    client.assert('_\'s color is _', obj, randomColor())
    if (Math.random() < 0.5) {
      client.assert('_ is afraid of mice', obj)
    } else {
      client.assert('_ is not afraid of mice', obj)
    }
  } else {
    targetObjId = mouse.targetObj && mouse.targetObj.id
  }
  console.log('-----')
  console.log(db.toString())
})

document.body.addEventListener('mousemove', e => {
  client.retract('mouse is at ($x, $y)')
  client.assert('mouse is at (_, _)', mouse.x, mouse.y)

  if (targetObjId) {
    client.select(
      ['_ is a $t at ($x, $y)', targetObjId]
    ).do(({t, x, y}) => {
      client.retract('_ is a _ at (_, _)', targetObjId, t, x, y)
      client.assert('_ is a _ at (_, _)', targetObjId, t, mouse.x, mouse.y)
    })
  }

  console.log('-----')
  console.log(db.toString())
})

document.body.addEventListener('mouseup', e => {
  client.retract('mouse button is $mouseButtonState')
  client.assert('mouse button is up')
  targetObjId = null
  console.log('-----')
  console.log(db.toString())
})

// const host = window.document.location.host.replace(/:.*/, '')
// let ws = new WebSocket('ws://' + host + ':3000')

// ws.onconnect = (event, somethingelse) => {
//  ws.send('it me')
// }

// ws.onmessage = event => {
//  console.log(event)
//  const assertion = JSON.parse(event.data)
//  if (typeof assertion == 'Array') {
 //   db.assert(assertion)
  // }
// }
