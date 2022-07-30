//eggs
//"3.ly/_"
//<parameters>
var gridWidth = 10; //width of the cell grid
var gridHeight = 10; //height of the cell grid
var drift = 50; //how far to drift when letting go after moving and when returning home
//DO NOT CHANGE WHILE RUNNING, instead use: gridResize(width, height)
var realtime = false; //if ticks should be run in realtime as fast as possible or on a clock
var tickRate = 100; //time to wait between each tick in miliseconds if realtime is off
//better off changing with setTick(realtime, tickRate)
var recovery = false; //if the program should try to recover if it can't keep up
var paused = true; //if ticks should disabled when loaded
//</parameters>
var cellGrid, cellConnections;
var emptyGrid = JSON.stringify({ "cells": Array(gridWidth).fill(null).map(() => Array(gridHeight).fill(0)), "connections": { horizontal: Array(gridWidth).fill(null).map(() => Array(gridHeight).fill(null).map(() => { return { type: 0, flipped: false }; })), vertical: Array(gridWidth).fill(null).map(() => Array(gridHeight).fill(null).map(() => { return { type: 0, flipped: false }; })), } });
var control = false;
var driftCharge = 0;
var driftx = 0;
var drifty = 0;
var extra = 1;
var homeCharge = 0;
var mobile = false;
var magicNumber = 1;
var driftAscention = Array(20).fill(0);
var lastDrift = 0;
var lastCell = [0, 0];
var imgBuffer = new Image();
var imgNot = new Image();
var helpMenu = false;
var render = true;
var del = false;
var forceOn = false;
var forceOff = false;
var lastTarget = null;
var w = canvas.width;
var h = canvas.height;
var start;
var nextAt;
var ticks = 0;
var cellGrid = Array(gridWidth)
  .fill(null)
  .map(() => Array(gridHeight).fill(0));
var cellConnections = {
  horizontal: Array(gridWidth)
    .fill(null)
    .map(() =>
      Array(gridHeight)
        .fill(null)
        .map(() => {
          return { type: 0, flipped: false };
        })
    ),
  vertical: Array(gridWidth)
    .fill(null)
    .map(() =>
      Array(gridHeight)
        .fill(null)
        .map(() => {
          return { type: 0, flipped: false };
        })
    ),
}
if (!realtime)
{
  tick()
}
const panZoom = {
  x: mobile ? 0 : 464,
  y: mobile ? 0 : 140,
  scale: mobile ? 1 : 0.5,
  apply() {
    ctx.setTransform(this.scale, 0, 0, this.scale, this.x, this.y);
  },
  scaleAt(x, y, sc) {
    // x & y are screen coords, not world
    this.scale *= sc;
    this.x = x - (x - this.x) * sc;
    this.y = y - (y - this.y) * sc;
  },
  toWorld(x, y, point = {}) {
    // converts from screen coords to world coords
    const inv = 1 / this.scale;
    point.x = (x - this.x) * inv;
    point.y = (y - this.y) * inv;
    return point;
  },
};
const ctx = canvas.getContext("2d");
const mouse = {
  x: 0,
  y: 0,
  button: false,
  wheel: 0,
  lastX: 0,
  lastY: 0,
  lastTouches: [{ pageX: 0, pageY: 0 }],
  drag: false,
};
const gridLimit = 512; // max grid lines for static grid
const gridSize = 128; // grid size in screen pixels for adaptive and world pixels for static
const scaleRate = 1.02; // Closer to 1 slower rate of change
const topLeft = { x: 0, y: 0 }; // holds top left of canvas in world coords.

/*
if (localStorage.getItem("orcells") === null) {
  localStorage.setItem("orcells", emptyGrid);
} else {
  let localGrid = localStorage.getItem('orcells');
  cellGrid = JSON.parse(localGrid).cells;
  cellConnections = JSON.parse(localGrid).connections;
}
*/

window.addEventListener("dragenter", function(e) { 
  showWrapper();
  lastTarget = e.target;
});

window.addEventListener("dragleave", function(e) {
  if (e.target === lastTarget || e.target === document) {
    hideWrapper();
  }
});

window.addEventListener("dragover", function(e) { e.preventDefault();});

window.addEventListener("drop", function(e) {
  e.preventDefault();
  hideWrapper();
  loadData(e.dataTransfer.files[0]);
});

document.addEventListener("keydown", (e) => {
  switch (String(e.key)) {
    case "Control":
    case "Meta":
      movingEnabled(true);
      break;
    case "Delete":
    case "Backspace":
      del = true;
      break;
    case " ":
      e.preventDefault();
      if (paused) { play()} else { pause()}
      break
    case ".":
      tick(false)
      break;
    case "/":
      toggleRealtime();
      break;
    case "e":
      forceOn = true;
      break;
    case "q":
      forceOff = true;
      break;
  }
});

document.addEventListener("keyup", (e) => {
  switch (String(e.key)) {
    case "Control":
    case "Meta":
      movingEnabled(false);
      break;
    case "Delete":
    case "Backspace":
      del = false;
      break;
    case "e":
      forceOn = false;
      break;
    case "q":
      forceOff = false;
      break;
  }
});

document.addEventListener("contextmenu", (event) => event.preventDefault());

[
  "mousedown",
  "mouseup",
  "mousemove",
  "touchstart",
  "touchmove",
  "touchend",
].forEach((name) => document.addEventListener(name, mouseEvents));
document.addEventListener("wheel", mouseEvents, { passive: false });

function setDeviceReqs() {
  if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
    // true for mobile device
    mobile = true;
    document.getElementById("controls").style.visibility = "hidden";
    document.getElementById("modeRadio").style.visibility = "visible";
    imgBuffer.src = "/tiles/buffer.png";
    imgNot.src = "/tiles/not.png";
  } else {
    // false for not mobile device
    document.getElementById("controls").style.visibility = "visible";
    document.getElementById("modeRadio").style.visibility = "hidden";
    imgBuffer.src = "/tiles/buffer.svg";
    imgNot.src = "/tiles/not.svg";
  }
}

function home() { homeCharge = drift }

function rad(angle) { return angle * (Math.PI / 180) }

function distance(x1, y1, x2, y2) { return Math.sqrt(((x2 - x1) ** 2) + ((y2 - y1) ** 2)) }

function movingEnabled(status) {
  if (status) {
    control = true;
    canvas.style.cursor = "move";
    document.getElementById("controls").style.cursor = "move";
  } else if (status == false) {
    control = false;
    canvas.style.cursor = "default";
    document.getElementById("controls").style.cursor = "default";
    
  }
}

function toggleRealtime() {
    document.getElementById("realtimeCheckBox").checked = !document.getElementById("realtimeCheckBox").checked;
    realtimeCheck();
}

function download(filename) {
  var element = document.createElement("a");
  element.setAttribute(
    "href",
    "data:text/plain;charset=utf-8," +
    encodeURIComponent(JSON.stringify({ cells: cellGrid, connections: cellConnections }))
  );
  element.setAttribute("download", filename);
  element.style.display = "none";
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}

function hideWrapper() {
  document.querySelector(".wrapper").style.visibility = "hidden";
  document.querySelector(".wrapper").style.opacity = 0;
}

function showWrapper() {
  document.querySelector(".wrapper").style.visibility = "";
  document.querySelector(".wrapper").style.opacity = 0.5;
}

function upload() {
  var input = document.createElement("input");
  input.type = "file";
  input.onchange = (e) => {
    var uploadedFileData = e.target.files[0];
    loadData(uploadedFileData);

  };

  input.click();
}

function loadData(finalFileData) {
  var reader = new FileReader();
  reader.readAsText(finalFileData, "UTF-8");

  reader.onload = (readerEvent) => {
    var content = readerEvent.target.result; // this is the content!
    cellGrid = JSON.parse(content).cells;
    cellConnections = JSON.parse(content).connections;
    gridWidth = cellGrid.length
    gridHeight = cellGrid[0].length
  };
}

function realtimeCheck() {
  if (document.getElementById("realtimeCheckBox").checked) {
    setTick(true)
  }
  else {
    setTick(false, 100)
  }
}

function gridResize(width, height) {
  if (height>gridHeight)
  {
    cellGrid = cellGrid.map((e) => {
      return e.concat(Array(height-gridHeight).fill(0))
    })
    cellConnections.horizontal = cellConnections.horizontal.map((e) => {
      return e.concat(Array(height-gridHeight).fill(null).map(() => {return {type: 0, flipped: false}}))
    })
    cellConnections.vertical = cellConnections.vertical.map((e) => {
      return e.concat(Array(height-gridHeight).fill(null).map(() => {return {type: 0, flipped: false}}))
    })
    gridHeight = height
  }
  if (height<gridHeight)
  {
    cellGrid = cellGrid.map((e) => {
      return e.splice(0, height)
    })
    cellConnections.horizontal = cellConnections.horizontal.map((e) => {
      return e.splice(0, height)
    })
    cellConnections.vertical = cellConnections.vertical.map((e) => {
      return e.splice(0, height)
    })
    gridHeight = height
  }
  if (width>gridWidth)
  {
    cellGrid = cellGrid.concat(Array(width-gridWidth).fill(null).map(() => Array(height).fill(0)))
    cellConnections.horizontal = cellConnections.horizontal.concat(Array(width-gridWidth).fill(null).map(() => {return Array(height).fill(null).map(() => {return {type: 0, flipped: false};})}))
    cellConnections.vertical = cellConnections.vertical.concat(Array(width-gridWidth).fill(null).map(() => {return Array(height).fill(null).map(() => {return {type: 0, flipped: false};})}))
    gridWidth = width
  }
  if (width<gridWidth)
  {
    cellGrid = cellGrid.splice(0, width)
    cellConnections.horizontal = cellConnections.horizontal.splice(0, width)
    cellConnections.vertical = cellConnections.vertical.splice(0, width)
    gridWidth = width
  }
}
function help() {
  if (helpMenu) {
    helpMenu = false;
    document.getElementById("gameDiv").style.filter = "blur(0px)";
    document.getElementById("help").style.visibility = "hidden";
  } else {
    helpMenu = true;
    document.getElementById("gameDiv").style.filter = "blur(8px)";
    document.getElementById("help").style.visibility = "visible";
  }
}

function pause() {
  paused = true
  document.getElementById("pause").style.visibility = "hidden";
  document.getElementById("play").style.visibility = "visible";
}

function play() {
  paused = false
  document.getElementById("pause").style.visibility = "visible";
  document.getElementById("play").style.visibility = "hidden";
  start = new Date().getTime();
  nextAt = start;
  ticks = 0;
  tick();
}

function setTick(setRealTime, setTickRate) {
  tickRate = setTickRate
  if (setRealTime) {
    realtime = true;
  }
  else {
    realtime = false
    start = new Date().getTime();
    nextAt = start;
    ticks = 0;
    tick();
  }
}

function skipCatchup() {
  start = new Date().getTime();
  nextAt = start;
  ticks = 0;
}
function mouseEvents(e) {
  const bounds = canvas.getBoundingClientRect();
  if (e.type == "touchstart") {
    pageX =
      Array.from(e.touches, (x) => x.pageX).reduce((a, b) => a + b, 0) /
      e.touches.length;
    pageY =
      Array.from(e.touches, (x) => x.pageY).reduce((a, b) => a + b, 0) /
      e.touches.length;
    mouse.lastX = pageX - bounds.left - scrollX;
    mouse.lastY = pageY - bounds.top - scrollY;
    mouse.x = pageX - bounds.left - scrollX;
    mouse.y = pageY - bounds.top - scrollY;
  } else {
    if (e.type == "touchmove") {
      pageX =
        Array.from(e.touches, (x) => x.pageX).reduce((a, b) => a + b, 0) /
        e.touches.length;
      pageY =
        Array.from(e.touches, (x) => x.pageY).reduce((a, b) => a + b, 0) /
        e.touches.length;
      mouse.x = pageX - bounds.left - scrollX;
      mouse.y = pageY - bounds.top - scrollY;
      if (e.touches.length >= 2) {
        mouse.wheel += 1;
        e.preventDefault();
      }
      mouse.lastTouches = e.touches;
    } else {
      if (e.type == "touchend") {
        pageX =
          Array.from(e.changedTouches, (x) => x.pageX).reduce(
            (a, b) => a + b,
            0
          ) / e.changedTouches.length;
        pageY =
          Array.from(e.changedTouches, (x) => x.pageY).reduce(
            (a, b) => a + b,
            0
          ) / e.changedTouches.length;
        mouse.x = pageX - bounds.left - scrollX;
        mouse.y = pageY - bounds.top - scrollY;
        mouse.x += driftx;
        mouse.y += drifty;
      } else {
        mouse.x = e.pageX - bounds.left - scrollX;
        mouse.y = e.pageY - bounds.top - scrollY;
      }
    }
  }
  mouse.button =
    e.type === "mousedown" || e.type === "touchstart"
      ? true
      : e.type === "mouseup" || e.type === "touchend"
        ? false
        : mouse.button;
  if (e.type === "wheel") {
    mouse.wheel += -e.deltaY;
    e.preventDefault();
  }
}

function drawGrid(gridScreenSize = 128) {
  var size,
    x,
    y,
    gridScale = gridScreenSize;
  size = Math.max(w, h) / panZoom.scale + gridScale * 2;
  panZoom.toWorld(0, 0, topLeft);
  x = Math.floor(topLeft.x / gridScale) * gridScale;
  y = Math.floor(topLeft.y / gridScale) * gridScale;
  if (size / gridScale > gridLimit) {
    size = gridScale * gridLimit;
    limitedGrid = true;
  }
  panZoom.apply();
  ctx.lineWidth = panZoom.scale * 10;
  ctx.strokeStyle = "#333333";
  ctx.beginPath();
  for (i = 0; i < size; i += gridScale) {
    ctx.moveTo(x + i, y);
    ctx.lineTo(x + i, y + size);
    ctx.moveTo(x, y + i);
    ctx.lineTo(x + size, y + i);
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0); // reset the transform so the lineWidth is 1
  ctx.stroke();
}

function update() {
  localStorage.setItem('orcells', JSON.stringify({ cells: cellGrid, connections: cellConnections }));
  ctx.setTransform(1, 0, 0, 1, 0, 0); // reset transform
  ctx.globalAlpha = 1; // reset alpha
  if (w !== innerWidth || h !== innerHeight) {
    w = canvas.width = innerWidth + 8;
    h = canvas.height = innerHeight + 8;
  } else {
    ctx.clearRect(0, 0, w, h);
  }
  if (mouse.wheel !== 0) {
    let scale = 1;
    scale = mouse.wheel < 0 ? 1 / scaleRate : scaleRate;
    mouse.wheel *= 0.8;
    if (Math.abs(mouse.wheel) < 1) {
      mouse.wheel = 0;
    }
    panZoom.scaleAt(mouse.x, mouse.y, scale); //scale is the change in scale
  }
  if (
    mouse.button &&
    ((control && !mobile) ||
      (document.querySelector('input[name="move"]:checked').value == 0 &&
        mobile))
  ) {
    if (!mouse.drag) {
      mouse.lastX = mouse.x;
      mouse.lastY = mouse.y;
      mouse.drag = true;
    } else {
      panZoom.x += mouse.x - mouse.lastX;
      panZoom.y += mouse.y - mouse.lastY;
      driftx = mouse.x - mouse.lastX;
      drifty = mouse.y - mouse.lastY;
      mouse.lastX = mouse.x;
      mouse.lastY = mouse.y;
      driftCharge = drift;
    }
  } else {
    mouse.drag = false;
    if (driftCharge > 0) {
      let driftspeed = 1 - Math.sin(rad((1 - driftCharge / drift) * 90));
      panZoom.x += driftx * driftspeed;
      panZoom.y += drifty * driftspeed;
      driftCharge--;
    }
    mouse.lastX = mouse.x;
    mouse.lastY = mouse.y;
  }
  requestAnimationFrame(update);
  //<toggle>
  canvas.onmousedown = (e) => {
    lastCell = WorldToGrid(panZoom.toWorld(mouse.x, mouse.y));
    if (e.button == 1) {
      e.preventDefault();
    }
    // if (
    //   (!control && !mobile) ||
    //   (document.querySelector('input[name="move"]:checked').value == 1 && mobile)
    // ) {
    //   if (!mobile && e.button === 2) {
    //     var cellpoint = WorldToGrid(panZoom.toWorld(mouse.x, mouse.y));
    //     if (cellGrid[cellpoint[0]][cellpoint[1]] === -1) {
    //       SetCell(cellpoint, 0);
    //     } else {
    //       SetCell(cellpoint, -1);
    //       cellConnections.horizontal[cellpoint[0]][cellpoint[1]].type = 0
    //       cellConnections.horizontal[cellpoint[0]-1][cellpoint[1]].type = 0
    //       cellConnections.vertical[cellpoint[0]][cellpoint[1]].type = 0
    //       cellConnections.vertical[cellpoint[0]][cellpoint[1]-1].type = 0
    //     }
    //   } else {
    //     if ((!mobile && e.button === 0) || (mobile)) {
    //       var cellpoint = WorldToGrid(panZoom.toWorld(mouse.x, mouse.y));
    //       ToggleCell(cellpoint);
    //     }
    //   }
    // }
  };
  if (forceOn) {
    var cellpoint = WorldToGrid(panZoom.toWorld(mouse.x, mouse.y));
    if ((cellpoint[0] >= 0) && (cellpoint[0] < gridWidth) && (cellpoint[1] >= 0) && (cellpoint[1] < gridHeight))
    {
      cellGrid[cellpoint[0]][cellpoint[1]] = 1
    }
  }
  else {
    if (forceOff) {
      var cellpoint = WorldToGrid(panZoom.toWorld(mouse.x, mouse.y));
      if ((cellpoint[0] >= 0) && (cellpoint[0] < gridWidth) && (cellpoint[1] >= 0) && (cellpoint[1] < gridHeight))
      {
        cellGrid[cellpoint[0]][cellpoint[1]] = 0
      }
    }
  }
  document.getElementById("controls").onmousedown = canvas.onmousedown;
  //</toggle>
  //<connect>
  canvas.onmousemove = (e) => {
    if (
      (e.buttons === 1 || e.buttons === 2 || e.buttons === 4 || del) &&
      !control
    ) {
      let currentCell = WorldToGrid(panZoom.toWorld(mouse.x, mouse.y));
      try {
        if (currentCell[0] != lastCell[0] || currentCell[1] != lastCell[1]) {
          let direction = [
            currentCell[0] - lastCell[0],
            currentCell[1] - lastCell[1],
          ];
          //horizontal
          if (Math.abs(direction[0]) === 1 && direction[1] === 0) {
            cellConnections.horizontal[
              currentCell[0] - (direction[0] === 1 ? 1 : 0)
            ][currentCell[1]].type = e.buttons === 4 || del ? 0 : e.buttons;
            cellConnections.horizontal[
              currentCell[0] - (direction[0] === 1 ? 1 : 0)
            ][currentCell[1]].flipped = direction[0] === -1;
          }
          //vertical
          if (direction[0] === 0 && Math.abs(direction[1]) === 1) {
            cellConnections.vertical[currentCell[0]][
              currentCell[1] - (direction[1] === 1 ? 1 : 0)
            ].type = e.buttons === 4 || del ? 0 : e.buttons;
            cellConnections.vertical[currentCell[0]][
              currentCell[1] - (direction[1] === 1 ? 1 : 0)
            ].flipped = direction[1] === -1;
          }
        }
        lastCell = currentCell;
      } catch (error) { }
    }
  };
  //</connect>
  //<tick>
  if (realtime) {
    tick(true);
  }
  //</tick>
  //<render>
  for (let x2 = 0; x2 < gridWidth; x2++) {
    for (let y2 = 0; y2 < gridHeight; y2++) {
      render = true;
      color = getColour(cellGrid[x2][y2]);
      if (render) {
        DrawCell([x2, y2], color, false);
      }
    }
  }
  drawGrid(gridSize);
  for (let x2 = 0; x2 < gridWidth - 1; x2++) {
    for (let y2 = 0; y2 < gridHeight; y2++) {
      if (cellConnections.horizontal[x2][y2].type > 0) {
        drawConnection(
          [x2, y2],
          cellConnections.horizontal[x2][y2].type,
          cellConnections.horizontal[x2][y2].flipped ? 2 : 0,
          false
        );
      }
    }
  }
  for (let x2 = 0; x2 < gridWidth; x2++) {
    for (let y2 = 0; y2 < gridHeight - 1; y2++) {
      if (cellConnections.vertical[x2][y2].type > 0) {
        drawConnection(
          [x2, y2],
          cellConnections.vertical[x2][y2].type,
          cellConnections.vertical[x2][y2].flipped ? 3 : 1,
          true
        );
      }
    }
  }
  //</render>
  homeDrift();
}

function homeDrift() {
  if (homeCharge === 1) {
    panZoom.x = mobile ? 0 : 464;
    panZoom.y = mobile ? 0 : 140;
    panZoom.scale = mobile ? 1 : 0.5;
    homeCharge = 0;
  }
  if (homeCharge > 2) {
    let homeSpeed =
      drift - Math.sin(rad((drift - homeCharge) * (90 / drift))) * drift;
    panZoom.x -= (panZoom.x - (mobile ? 0 : 464)) / homeSpeed;
    panZoom.y -= (panZoom.y - (mobile ? 0 : 140)) / homeSpeed;
    panZoom.scale -= (panZoom.scale - (mobile ? 1 : 0.5)) / homeSpeed;
    homeCharge--;
  }
}

function WorldToGrid(point) {
  return [
    Math.round((point.x + gridSize / 2) / gridSize),
    Math.round((point.y + gridSize / 2) / gridSize),
  ]; // Converts world cords to grid cords
}

function GridToWorld(point) {
  size = 1 / panZoom.scale;
  return [
    (point[0] * gridSize - gridSize / 2) * size + panZoom.x * magicNumber,
    (point[1] * gridSize - gridSize / 2) * size + panZoom.y * magicNumber,
  ];
}

function getColour(state) {
  if (state === 0) {
    return "#000000";
    //return "#1c4d66"
  } else {
    if (state === 1) {
      return "#eeeeee";
      //return "#3eaee6"
    } else {
      render = false;
      return "#ff00ff";
    }
  }
}

function ToggleCell(point) {
  if (cellGrid[point[0]][point[1]] != -1) {
    cellGrid[point[0]][point[1]] = Math.abs(cellGrid[point[0]][point[1]] - 1);
  }
}

function SetCell(point, v) {
  cellGrid[point[0]][point[1]] = v;
}

function DrawCell(point, color) {
  magicNumber = (1 / panZoom.scale) ** 2;
  point = GridToWorld(point);
  //ctx.save()
  ctx.fillStyle = color;
  ctx.beginPath();
  size = panZoom.scale;
  //ctx.globalAlpha = 0.75
  ctx.rect(
    point[0] / magicNumber - (gridSize / 2) * panZoom.scale,
    point[1] / magicNumber - (gridSize / 2) * panZoom.scale + size,
    gridSize * size,
    gridSize * size
  );
  ctx.fill();
  //ctx.restore()
}

function drawConnection(point, type, rotate, vertical) {
  magicNumber = (1 / panZoom.scale) ** 2;
  point = GridToWorld(point);
  size = panZoom.scale;
  ctx.save();
  if (vertical) {
    ctx.translate(
      point[0] / magicNumber + size,
      point[1] / magicNumber + (gridSize / 2) * panZoom.scale + size
    );
  } else {
    ctx.translate(
      point[0] / magicNumber + (gridSize / 2) * panZoom.scale + size,
      point[1] / magicNumber + size
    );
  }
  ctx.rotate(rad(rotate * 90));
  ctx.translate(
    -((panZoom.scale * gridSize) / 2),
    -(panZoom.scale * gridSize) / 2
  );
  ctx.drawImage(
    type === 1 ? imgBuffer : imgNot,
    0,
    0,
    panZoom.scale * gridSize,
    panZoom.scale * gridSize
  );
  ctx.restore();
}

function tick(auto = true) {
  if (!auto || !paused) {
    lastTick = Date.now();
    let newGrid = JSON.parse(JSON.stringify(cellGrid));
    for (let x2 = 0; x2 < gridWidth; x2++) {
      for (let y2 = 0; y2 < gridHeight; y2++) {
        let bit = 0;
        if (x2 > 0) {
          bit |=
            (cellConnections.horizontal[x2 - 1][y2].type == 1 &&
              !cellConnections.horizontal[x2 - 1][y2].flipped &&
              cellGrid[x2 - 1][y2] == 1) ||
            (cellConnections.horizontal[x2 - 1][y2].type == 2 &&
              !cellConnections.horizontal[x2 - 1][y2].flipped &&
              cellGrid[x2 - 1][y2] == 0);
        }
        if (x2 < gridWidth) {
          bit |=
            (cellConnections.horizontal[x2][y2].type == 1 &&
              cellConnections.horizontal[x2][y2].flipped &&
              cellGrid[x2 + 1][y2] == 1) ||
            (cellConnections.horizontal[x2][y2].type == 2 &&
              cellConnections.horizontal[x2][y2].flipped &&
              cellGrid[x2 + 1][y2] == 0);
        }
        if (y2 > 0) {
          bit |=
            (cellConnections.vertical[x2][y2 - 1].type == 1 &&
              !cellConnections.vertical[x2][y2 - 1].flipped &&
              cellGrid[x2][y2 - 1] == 1) ||
            (cellConnections.vertical[x2][y2 - 1].type == 2 &&
              !cellConnections.vertical[x2][y2 - 1].flipped &&
              cellGrid[x2][y2 - 1] == 0);
        }
        if (y2 < gridHeight) {
          bit |=
            (cellConnections.vertical[x2][y2].type == 1 &&
              cellConnections.vertical[x2][y2].flipped &&
              cellGrid[x2][y2 + 1] == 1) ||
            (cellConnections.vertical[x2][y2].type == 2 &&
              cellConnections.vertical[x2][y2].flipped &&
              cellGrid[x2][y2 + 1] == 0);
        }
        newGrid[x2][y2] = bit;
      }
    }
    if (!auto || !paused) {
      cellGrid = newGrid;
    }
  //timing  
    if (!realtime && !paused && auto)
    {
      if (!start) {
          start = new Date().getTime();
          nextAt = start;
      }
      nextAt += tickRate;
  
      var drift = (new Date().getTime() - start)-(ticks*tickRate)
      if (drift > tickRate)
      {
        document.getElementById("behindDiv").style.visibility = "visible";
        document.getElementById("behind").textContent = "Running Behind "+Math.floor(drift/tickRate)+" ticks!"
      }
      else
      {
        document.getElementById("behindDiv").style.visibility = "hidden";
      }
      ticks++
      if (recovery)
      {
        let count = driftAscention.filter(value => value === true).length;
        console.log("count: "+count, "drift: "+drift)
        if ((count>=8)&&(drift>(10*tickRate)))
        {
          document.getElementById("unstable").style.visibility = "visible";
          console.warn("unstable, rasing tickrate to: "+ tickRate)
          setTick(false, tickRate*2)
        }
        else
        {
          document.getElementById("unstable").style.visibility = "hidden";
        }
         driftAscention.unshift(Math.floor(drift/tickRate)>Math.floor(lastDrift/tickRate));
        driftAscention.pop();
        lastDrift = drift
      }
      setTimeout(tick, nextAt - new Date().getTime());
    }
  }
}

requestAnimationFrame(update);