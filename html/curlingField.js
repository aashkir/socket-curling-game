$(document).ready(function() {
	let stones = [] // array that stores the stones, gets them from server
	let player = null
	let selectedStone = null // stone to toss
	let tossX = 0
	let tossY = 0
	//connect to server and retain the socket
	let socket = io('http://' + window.document.location.host)
	socket.emit('requestPlayerCount', 'true')
	// set player
	socket.on('joinGame', function(message) {
	  if (player === null) {
	      if (confirm(message)) {
	      	socket.emit('requestJoin', 'true')
	      }
  	  }
    })

	socket.on('playerData', function(data) {
		player = JSON.parse(data)
		console.log("Player Data Recieved: " + player)
	})

	socket.on('stonesData', function(data) {
		stones = JSON.parse(data)
		//console.log("Stones Data Recieved: \n" + stones)
		drawCanvas()
	})

	let canvas = $("#canvas1")

	//add mouse down listener to our canvas object
  	$("#canvas1").mousedown(handleMouseDown)

  	function handleMouseDown(e) {
	  //get mouse location relative to canvas top left
	  let rect = canvas[0].getBoundingClientRect()
	  let canvasX = e.pageX - rect.left //use  event object pageX and pageY
	  let canvasY = e.pageY - rect.top

	  let realX =  canvasX - overViewX
	  let realY =  canvasY - overViewY
	  tossX = realX
	  tossY = realY
	  console.log("mouse down:" + canvasX + ", " + canvasY)

	  selectedStone = null
	  for (let stone of stones) {
	  	console.log("stone x:" + stone.x+ " y: " +stone.y)
	  	if (Math.sqrt((stone.x-realX)*(stone.x-realX) + (stone.y-realY)*(stone.y-realY)) < stone.radius) {
	  		selectedStone = stone
	  		break
	  	}
	  }
	  //attach mouse move and mouse up handlers
	  if (selectedStone != null) {
	  	console.log("Selecting stone")
	  	//console.log(selectedStone)
	  	$("#canvas1").mousemove(handleMouseMove)
    	$("#canvas1").mouseup(handleMouseUp)
	  }
	  // Stop propagation of the event and stop any default
	  //  browser action
	  e.stopPropagation()
	  e.preventDefault()
	}

	function handleMouseMove(e) {
	  console.log("mouse move");

	  //get mouse location relative to canvas top left
	  let rect = canvas[0].getBoundingClientRect()
	  let canvasX = e.pageX - rect.left
	  let canvasY = e.pageY - rect.top

	  let realX =  canvasX - overViewX
	  let realY =  canvasY - overViewY

	  if (selectedStone != null) {
	  	console.log("powering stone")
	  	tossX = realX
		tossY = realY
	  }

	  e.stopPropagation()
	}

	function handleMouseUp(e) {
	  console.log("mouse up")
	  e.stopPropagation()
	  if (selectedStone != null) {
	  	let dX = tossX-selectedStone.x
		let dY = tossY-selectedStone.y
		let distance = Math.sqrt((dX*dX)+(dY*dY));
		if (distance > 3) { // move it
			selectedStone.vX = dX / 10
			selectedStone.vY = dY / 10

			socket.emit("stoneLaunched", JSON.stringify(selectedStone))
		}
		// send velocity to sever
	  }
	  //remove mouse move and mouse up handlers but leave mouse down handler
	  $("#canvas1").off("mousemove", handleMouseMove); //remove mouse move handler
	  $("#canvas1").off("mouseup", handleMouseUp); //remove mouse up handler
	  selectedStone = null
	  tossX = -1
	  tossY = -1
	}



	let context = canvas.get(0).getContext("2d")

	let canvasWidth = canvas.width()
	let canvasHeight = canvas.height()

	let closeUpWidth = canvasHeight
	let closeUpHeight = canvasHeight

	let overViewWidth = canvasWidth - closeUpWidth
	let overViewHeight = canvasHeight
	let overViewX = canvasWidth - overViewWidth
	let overViewY = 0

	let closeUpPadding = 90
	let overViewPadding = closeUpPadding / 3

	let colours = ["blue", "white", "red", "white"]

	function drawCanvas() { 
		// paint canvas white
		context.fillStyle = "white"
		context.fillRect(0, 0, canvasWidth, canvasHeight)
		context.fill()
		// CLOSE UP
		// draw rings
		let ringRadius = (closeUpWidth - closeUpPadding) / 2
		let distBtwnRings = (closeUpWidth - closeUpPadding) / 8
		let ringX = closeUpWidth / 2
		let ringY = closeUpHeight / 2
		for (let i = 0; i < 4; i++) {
			context.fillStyle = colours[i]
			context.beginPath()
			context.arc(ringX, ringY, ringRadius, 0, Math.PI*2, true)
			context.closePath()
			context.fill()
			ringRadius = ringRadius - distBtwnRings
		}

		// DRAW SERVER SIDE CLOSEUP PUCKS HERE
		let magnification = 3
		for(let i = 0; i < stones.length; i++) {
			// draw grey outer part first
			context.fillStyle = "grey"
			context.beginPath()
			context.arc(stones[i].x * magnification, stones[i].y * magnification, stones[i].radius * magnification, 0, Math.PI*2, true)
			context.closePath()
			context.fill()
			// draw inner coloured part
			if (stones[i].player != null)
				context.fillStyle = stones[i].player.colour;
			context.beginPath()
			context.arc(stones[i].x * magnification, stones[i].y * magnification, (stones[i].radius * magnification) / 2, 0, Math.PI*2, true)
			context.closePath()
			context.fill()
		}

		// OVERVIEW

		// line separator
		context.strokeStyle = "black"
		context.lineWidth = 1
		context.beginPath();
		context.moveTo(overViewX, overViewY)
		context.lineTo(overViewX, overViewY + overViewHeight)
		context.stroke()

		context.fillStyle = "white"
		context.fillRect(overViewX, overViewY, overViewWidth, overViewHeight)
		// draw rings
		ringRadius = (overViewWidth - overViewPadding) / 2
		distBtwnRings = (overViewWidth - overViewPadding) / 8
		ringX = overViewX + (overViewWidth/2)
		ringY = overViewY + (overViewHeight/6)

		for (let i = 0; i < 4; i++) {
			context.fillStyle = colours[i]
			context.beginPath()
			context.arc(ringX, ringY, ringRadius, 0, Math.PI*2, true)
			context.closePath()
			context.fill()
			ringRadius = ringRadius - distBtwnRings
		}

		// DRAW SERVER SIDE OVERVIEW PUCKS HERE
		for(let i = 0; i < stones.length; i++) {
			// draw grey outer part first
			context.fillStyle = "grey"
			context.beginPath()
			context.arc(overViewX + stones[i].x, overViewY + stones[i].y, stones[i].radius, 0, Math.PI*2, true)
			context.closePath()
			context.fill()
			// draw inner coloured part
			if (stones[i].player != null)
				context.fillStyle = stones[i].player.colour
			context.beginPath()
			context.arc(overViewX + stones[i].x, overViewY + stones[i].y, (stones[i].radius) / 2, 0, Math.PI*2, true)
			context.closePath()
			context.fill()
		}

		// DRAW CLIENT SIDE ARROW
		if (selectedStone != null) {
			//console.log("Drawing!")
			context.strokeStyle = "green"
			context.lineWidth = 2
			context.beginPath()
			context.moveTo(overViewX + selectedStone.x, overViewY + selectedStone.y)
			context.lineTo(overViewX + tossX, overViewY + tossY)
			context.closePath()
			context.stroke()
		}
	}

	drawCanvas()
})