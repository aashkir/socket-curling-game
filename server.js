// Note: Barebones Node server by LD Nel

//Cntl+C to stop server

const http = require("http") //need to http
const fs = require("fs") //need to read static files
const url = require("url") //to parse url strings

const app = require('http').createServer(handler)
const io = require('socket.io')(app) //wrap server app in socket io capability
const PORT = process.env.PORT || 3000 //useful if you want to specify port through environment variable

let redSocket = null
let yellowSocket = null

let playerCount = 0

let stones = []

// Stone class
let Stone = function(x, y, radius, mass, friction, player, id) {
  this.x = x
  this.y = y
  this.radius = radius

  this.mass = mass
  this.friction = friction // 0: stops isntantly, 1: no friction
  // velocities
  this.vX = 0
  this.vY = 0
  
  this.player = player
  this.id = id
}
// default player object
let defaultPlayer = {
  socket : -1,
  type : "spectator",
  colour: "black"
}

for (let i = 0; i < 6; i++) {
  stones.push(new Stone(10 + (35 * i), 600 - 10 - 100, 10, 10, 0.95, defaultPlayer, i))
  //stones[i].vX = (Math.random() * 1) - 1
  //stones[i].vY = (Math.random() * 1) - 1
}

const ROOT_DIR = "html" //dir to serve static files from

const MIME_TYPES = {
  css: "text/css",
  gif: "image/gif",
  htm: "text/html",
  html: "text/html",
  ico: "image/x-icon",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  js: "application/javascript",
  json: "application/json",
  png: "image/png",
  svg: "image/svg+xml",
  txt: "text/plain"
}


app.listen(PORT) // start server listening on PORT

function handler(request, response) {
  let urlObj = url.parse(request.url, true, false)
  console.log("\n============================")
  console.log("PATHNAME: " + urlObj.pathname)
  console.log("REQUEST: " + ROOT_DIR + urlObj.pathname)
  console.log("METHOD: " + request.method)

  let receivedData = ""

  //attached event handlers to collect the message data
  request.on("data", function(chunk) {
    receivedData += chunk
  })

  //event handler for the end of the message
  request.on("end", function() {
    console.log("REQUEST END: ")
    console.log("received data: ", receivedData)
    console.log("type: ", typeof receivedData)
    
    if (request.method == "GET") {
      //handle GET requests as static file requests
      fs.readFile(ROOT_DIR + urlObj.pathname, function(err, data) {
        if (err) {
          //report error to console
          console.log("ERROR: " + JSON.stringify(err))
          //respond with not found 404 to client
          response.writeHead(404)
          response.end(JSON.stringify(err))
          return
        }
        response.writeHead(200, {
          "Content-Type": get_mime(urlObj.pathname)
        })
        response.end(data)
      })
    }
  })
}

io.on('connection', function(socket){
  // someone launched a stone
  socket.on('stoneLaunched', function(data) {
    //console.log("STONE LAUNCHED")
    let tossedStone = JSON.parse(data)
    for (let stone of stones) {
      if (tossedStone.id === stone.id && stone.player.socket === socket.id) {
        //console.log("setting stone")
        stone.vX = -tossedStone.vX
        stone.vY = -tossedStone.vY
        break
      }
    }
  })
  // client connected
  socket.on('requestPlayerCount', function(data) {
    if (redSocket === null || yellowSocket === null) { // space available, send request message to user
      socket.emit('joinGame', 'Join game?')
    }
  })
  // client wants to play
  socket.on('requestJoin', function(data) {
    console.log('RECEIVED JOIN CONFIRMATION')
    let player = {}
    if (redSocket === null) {
      console.log("in red socket")
      player.type = "player1"
      player.colour = "red"
      player.socket = socket.id
      stones[0].player = player
      stones[1].player = player
      stones[2].player = player
      redSocket = socket.id
      let jsonPlayer = JSON.stringify(player)
      socket.emit('playerData', jsonPlayer) // give player control
    } else if (yellowSocket === null) {
      console.log("in yellow socket")
      player.type = "player2"
      player.colour = "yellow"
      player.socket = socket.id
      stones[3].player = player
      stones[4].player = player
      stones[5].player = player
      yellowSocket = socket.id
      let jsonPlayer = JSON.stringify(player)
      socket.emit('playerData', jsonPlayer) // give player control
    }
    io.emit('stonesData', JSON.stringify(stones)) // update stones for client
  })
  // someone dc'd check if they own stones and put them away
  socket.on('disconnect', function () {
    if (socket.id === redSocket) {
      redSocket = null
    } else if (socket.id === yellowSocket ) {
      yellowSocket = null
    }

    for (let stone of stones) {
      if (stone.player.socket === socket.id) {
        stone.player = defaultPlayer
      }
    }
    io.emit('stonesData', JSON.stringify(stones))
    io.emit('joinGame', 'Join game?')
  })
  io.emit('stonesData', JSON.stringify(stones)) // update stones for client
})

function get_mime(filename) {
  for (let ext in MIME_TYPES) {
    if (filename.indexOf(ext, filename.length - ext.length) !== -1) {
      return MIME_TYPES[ext]
    }
  }
  return MIME_TYPES["txt"]
}

// start server
timer = setInterval(serverTick, 33)

function serverTick() {
  //console.log("tick")
  // CITATION
  // collision physics is from "Foundation HTML5 Canvas For Games and Entertainment" by Rob Hawkes
  // https://www.apress.com/us/book/9781430232919
  for (let i = 0; i < stones.length; i++) {
    let tmpStone = stones[i]

    for (let j = i + 1; j < stones.length; j++) {
      let tmpStone2 = stones[j]

      let dX = tmpStone2.x - tmpStone.x
      let dY = tmpStone2.y - tmpStone.y
      let distance = Math.sqrt((dX * dX) + (dY*dY))
      // rotation to avoid extra math
      if (distance < tmpStone.radius + tmpStone2.radius) {
        let angle = Math.atan2(dY, dX)
        let sine = Math.sin(angle)
        let cosine = Math.cos(angle)
        // rotate stone pos
        let x = 0
        let y = 0

        // rotate stone2 pos
        let x2 = dX * cosine + dY * sine
        let y2 = dY * cosine - dX * sine

        // rotate stone vel
        let vX = tmpStone.vX * cosine + tmpStone.vY * sine
        let vY = tmpStone.vY * cosine - tmpStone.vX * sine

        // rotate stone2 vel
        let vX2 = tmpStone2.vX * cosine + tmpStone2.vY * sine
        let vY2 = tmpStone2.vY * cosine - tmpStone2.vX * sine

        // momentum
        let vTotal = vX - vX2
        vX = ((tmpStone.mass - tmpStone2.mass) * vX + 2 * tmpStone2.mass * vX2) / (tmpStone.mass + tmpStone2.mass)
        vX2 = vTotal + vX

        // move stones
        x2 = x + (tmpStone.radius + tmpStone2.radius)

        // rotate stone pos back
        tmpStone.x = tmpStone.x + (x * cosine - y * sine)
        tmpStone.y = tmpStone.y + (y * cosine + x * sine)

        tmpStone2.x = tmpStone.x + (x2 * cosine - y2 * sine)
        tmpStone2.y = tmpStone.y + (y2 * cosine + x2 * sine)

        // rotate stone vel back
        tmpStone.vX = vX * cosine - vY * sine
        tmpStone.vY = vY * cosine + vX * sine

        tmpStone2.vY = vY2 * cosine - vY2 * sine
        tmpStone2.vY = vY2 * cosine + vX2 * sine
      }
    }

    tmpStone.x += tmpStone.vX
    tmpStone.y += tmpStone.vY

    // apply friction
    if (Math.abs(tmpStone.vX) > 0.1)
      tmpStone.vX *= tmpStone.friction // slow down
    else
      tmpStone.vX = 0;

    if (Math.abs(tmpStone.vY) > 0.1)
      tmpStone.vY *= tmpStone.friction
    else
      tmpStone.vY = 0

    // wall bounce
    if (tmpStone.x - tmpStone.radius < 0 || tmpStone.x + tmpStone.radius > 200) {
      tmpStone.vX *= -1
    }
    // ceiling bounce
    if (tmpStone.y - tmpStone.radius < 0 || tmpStone.y + tmpStone.radius > 600) {
      tmpStone.vY *= -1
    }
  }

  io.emit('stonesData', JSON.stringify(stones))
}

console.log("Server Running at PORT: 3000  CNTL-C to quit")
console.log("To Test:")
console.log("Open several browsers at: http://localhost:3000/assignment3.html")
