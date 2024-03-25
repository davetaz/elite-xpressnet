let backgroundColor = "white";
let panelId = "";
let stage = {};
let layer = {};
let panelData = {};
let transformer = {};
var blockSnapSize = 37.5;
var controllers = [];
var defaultWidth = 1024;
var defaultHeight = 600;
// Call createKonvaStage when the page is fully loaded
document.addEventListener("DOMContentLoaded", function () {
    _initialiseButtonsContainer();
    stage = createKonvaStage();
    const layer = stage.getLayers()[0];
    addTransformer(stage,layer);
    loadStage();
});

//Initialisation functions
function createKonvaStage() {
    const stage = new Konva.Stage({
        container: 'trackCanvas',
        width: 1024,
        height: 600,
    });

    layer = new Konva.Layer();
    stage.add(layer);
    var width = 1024;
    var height = 600;
    var gridLayer = new Konva.Layer();
    var padding = blockSnapSize;
    for (var i = 0; i < width / padding; i++) {
      gridLayer.add(new Konva.Line({
        points: [Math.round(i * padding) + 0.5, 0, Math.round(i * padding) + 0.5, height],
        stroke: '#ddd',
        strokeWidth: 0.2,
        dash: [5, 5]
      }));
    }

    gridLayer.add(new Konva.Line({points: [0,0,10,10]}));
    for (var j = 0; j < height / padding; j++) {
      gridLayer.add(new Konva.Line({
        points: [0, Math.round(j * padding), width, Math.round(j * padding)],
        stroke: '#ddd',
        strokeWidth: 0.2,
        dash: [5, 5]
      }));
    }
    stage.add(gridLayer);

    return stage;
}

function _resizeStage(width, height) {
  // Set new width and height for the stage
  stage.width(width);
  stage.height(height);

  // Redraw the stage
  stage.draw();

  const containerId = 'trackCanvas';
  var container = document.getElementById(containerId);
  container.style.width = width + 'px';
  container.style.height = height + 'px';
}

function addTransformer(stage,layer) {
  transformer = new Konva.Transformer();
  layer.add(transformer);
  //var shapes = stage.find('.shape');
  // by default select all shapes
  //transformer.nodes(shapes);
  transformer.rotationSnaps([0, 90, 180, 270]);
  transformer.resizeEnabled(false);

  // Define a context menu
  var contextMenu = document.createElement('div');
  contextMenu.id = 'context-menu';
  contextMenu.style.display = 'none';
  contextMenu.style.position = 'absolute';
  contextMenu.innerHTML = `
    <ul>
      <li id="rotate">Rotate</li>
      <li id="horizontal-flip">Horizontal Flip</li>
      <li id="vertical-flip">Vertical Flip</li>
      <li id="delete">Delete</li>
    </ul>
  `;
  document.body.appendChild(contextMenu);
  // Add event listeners for context menu buttons
  contextMenu.addEventListener('click', function (e) {
      var target = e.target;
      switch (target.id) {
          case 'rotate':
              _rotateSelectedShapes();
              break;
          case 'horizontal-flip':
              _horizontalFlipSelectedShapes();
              break;
          case 'vertical-flip':
              _verticalFlipSelectedShapes();
              break;
          case 'delete':
              _deleteSelectedShapes();
              break;
          case 'properties':
            var elementId = e.target.elementId; // Retrieve elementId from data attribute
            configureElement(elementId, null); // Call properties function with elementId
            break;
          default:
              break;
      }
      hideContextMenu();
  });

  // Show the context menu
  function showContextMenu(x, y, elementId, elementType) {
      contextMenu.style.display = 'block';
      contextMenu.style.top = y + 'px';
      contextMenu.style.left = x + 'px';
      if (elementId) {
        var ul = contextMenu.querySelector('ul');
        if (elementType === "point" || elementType === "signal") {
          var propertiesOption = document.createElement('li');
          propertiesOption.id = 'properties';
          propertiesOption.textContent = 'Properties';
          propertiesOption.elementId = elementId; // Add elementId as a data attribute
          ul.appendChild(propertiesOption);
        } else if (elementType === "straight") {

        }
      }
  }

  // Hide the context menu
  function hideContextMenu() {
      contextMenu.style.display = 'none';
      var propertiesOption = contextMenu.querySelector('#properties');
      if (propertiesOption) {
        propertiesOption.remove();
      }
  }

  // Add event listener to stage to hide context menu on click outside
  stage.on('click', function (e) {
      hideContextMenu();
  });

  // Add event listeners to transformer to show context menu on right-click
  stage.on('contextmenu', function (e) {
    e.evt.preventDefault(); // Prevent default browser context menu
    var target = e.target;
    if (target !== stage) {
      // Right-clicked on a shape
      const selectedShapes = transformer.nodes();
      var elementId = null;
      var elementType = null;
      if (selectedShapes.length == 1) {
        if (selectedShapes[0].attrs.type === "point" || selectedShapes[0].attrs.type === "signal") {
          elementId = selectedShapes[0].attrs.id;
          elementType = selectedShapes[0].attrs.type;
        }
      }
      var containerRect = stage.container().getBoundingClientRect();
      var menuX = containerRect.left + stage.getPointerPosition().x + 4;
      var menuY = containerRect.top + stage.getPointerPosition().y + 4;
      showContextMenu(menuX, menuY, elementId, elementType);
    }
  });


  // add a new feature, lets add ability to draw selection rectangle
  var selectionRectangle = new Konva.Rect({
    fill: 'rgba(0,0,255,0.5)',
    visible: false,
  });
  layer.add(selectionRectangle);

  var x1, y1, x2, y2;
  var selecting = false;
  stage.on('mousedown touchstart', (e) => {
    // do nothing if we mousedown on any shape
    if (e.target !== stage) {
      return;
    }
    e.evt.preventDefault();
    x1 = stage.getPointerPosition().x;
    y1 = stage.getPointerPosition().y;
    x2 = stage.getPointerPosition().x;
    y2 = stage.getPointerPosition().y;

    selectionRectangle.width(0);
    selectionRectangle.height(0);
    selecting = true;
  });

  stage.on('mousemove touchmove', (e) => {
        // do nothing if we didn't start selection
    if (!selecting) {
      return;
    }
    e.evt.preventDefault();
    x2 = stage.getPointerPosition().x;
    y2 = stage.getPointerPosition().y;

    selectionRectangle.setAttrs({
      visible: true,
      x: Math.min(x1, x2),
      y: Math.min(y1, y2),
      width: Math.abs(x2 - x1),
      height: Math.abs(y2 - y1),
    });
  });

  stage.on('mouseup touchend', (e) => {
        // do nothing if we didn't start selection
    selecting = false;
    if (!selectionRectangle.visible()) {
      if (!e.target.hasName('shape') && !e.target.hasName('selector')) {
        return;
      }
          // Get the actual target based on the name
      const actualTarget = e.target.hasName('selector') ? e.target.parent : e.target;
      actualTarget.position({
        x: Math.round(actualTarget.x() / blockSnapSize) * blockSnapSize,
        y: Math.round(actualTarget.y() / blockSnapSize) * blockSnapSize,
      });
      stage.batchDraw();
      return;
    }
    e.evt.preventDefault();
        // update visibility in timeout, so we can check it in click event
    selectionRectangle.visible(false);
    var shapes = stage.find('.shape');
    var box = selectionRectangle.getClientRect();
    var selected = shapes.filter((shape) =>
      Konva.Util.haveIntersection(box, shape.getClientRect())
      );
    transformer.nodes(selected);
  });

  // clicks should select/deselect shapes
  stage.on('click tap', function (e) {
    transformer.resizeEnabled(false);
        // if we are selecting with rect, do nothing
    if (selectionRectangle.visible()) {
      return;
    }

        // if click on empty area - remove all selections
    if (e.target === stage) {
      transformer.nodes([]);
      return;
    }

    var actualTarget = e.target;
    while (actualTarget.parent && !actualTarget.hasName('shape')) {
      actualTarget = actualTarget.parent;
    }
        // Check if e.target has the name 'shape' or 'child'
    if (!actualTarget.hasName('shape')) {
        //if (!e.target.hasName('shape') && !e.target.hasName('selector')) {
      return;
    }

    // Get the actual target based on the name
    //var actualTarget = e.target.hasName('selector') ? e.target.parent : e.target;

    // do we pressed shift or ctrl?
    const metaPressed = e.evt.shiftKey || e.evt.ctrlKey || e.evt.metaKey;
    const isSelected = transformer.nodes().indexOf(actualTarget) >= 0;

    if (!metaPressed && !isSelected) {
        // if no key pressed and the node is not selected
        // select just one
      transformer.nodes([actualTarget]);
    } else if (metaPressed && isSelected) {
        // if we pressed keys and node was selected
        // we need to remove it from selection:
        const nodes = transformer.nodes().slice(); // use slice to have new copy of array
        // remove node from array
        nodes.splice(nodes.indexOf(actualTarget), 1);
        transformer.nodes(nodes);
    } else if (metaPressed && !isSelected) {
        // add the node into selection
        const nodes = transformer.nodes().concat([actualTarget]);
        transformer.nodes(nodes);
    }

  });

  // Attach a double-click event listener to the shape
  stage.on('dblclick', function() {
    const selectedShapes = transformer.nodes();
    if (selectedShapes.length == 1) {
      const element = selectedShapes[0];
      if (element.attrs.type == "point") {
        switchPoint(element.attrs.id);
      }
    }
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'r' || event.key === 'R') {
      _rotateSelectedShapes();
    }
    if (event.key === 'v' || event.key === 'V') {
      _verticalFlipSelectedShapes();
    }
    if (event.key === 'h' || event.key === 'H') {
      _horizontalFlipSelectedShapes();
    }
    if (event.key === 'Delete' || event.key === 'Backspace') {
      _deleteSelectedShapes();
    }
  });
}

function _initialiseButtonsContainer() {
  var isDragging = false;
  var buttonsContainer = document.getElementById('buttonsContainer');
  var toggleBtn = document.querySelector('.toggle-btn');
  var buttonsContent = document.querySelector('.buttons-content');

  // Function to adjust position and keep the container within the viewport
  function adjustPosition() {
      var rect = buttonsContainer.getBoundingClientRect();
      var offsetX = rect.width / 2; // Center horizontally
      var offsetY = rect.height / 2; // Center vertically

      // Calculate new position with a minimum margin of 5 pixels
      var newX = Math.max(5, Math.min(window.innerWidth - rect.width - 5, buttonsContainer.offsetLeft));
      var newY = Math.max(5, Math.min(window.innerHeight - rect.height - 5, buttonsContainer.offsetTop));

      // Set new position
      buttonsContainer.style.left = newX + 'px';
      buttonsContainer.style.top = newY + 'px';
  }

  // Call the function to adjust position when the page loads
  adjustPosition();

  // Recalculate position on window resize
  window.addEventListener('resize', adjustPosition);

  buttonsContainer.addEventListener('mousedown', function(event) {
      isDragging = true;
      offsetX = event.clientX - buttonsContainer.getBoundingClientRect().left;
      offsetY = event.clientY - buttonsContainer.getBoundingClientRect().top;
  });

  document.addEventListener('mousemove', function(event) {
      if (isDragging) {
          buttonsContainer.style.left = (event.clientX - offsetX) + 'px';
          buttonsContainer.style.top = (event.clientY - offsetY) + 'px';
          adjustPosition(); // Call adjustPosition during dragging as well
      }
  });

  document.addEventListener('mouseup', function() {
      isDragging = false;
      adjustPosition(); // Call adjustPosition when dragging ends
  });

  toggleBtn.addEventListener('click', function() {
      if (buttonsContent.style.display === 'none') {
          buttonsContent.style.display = 'block';
          toggleBtn.textContent = '-';
      } else {
          buttonsContent.style.display = 'none';
          toggleBtn.textContent = '+';
      }
      adjustPosition(); // Call adjustPosition when toggle button is clicked
  });
}

// Internal transformer functions
function _deleteSelectedShapes() {
  // Get the selected shapes from the transformer
  const selectedShapes = transformer.nodes();

  // Check if there are selected shapes
  if (selectedShapes.length > 0) {

    // Iterate through the selected shapes and remove them
    selectedShapes.forEach(function (shape) {
      shape.destroy(); // Remove the shape
    });

    // Clear the selection in the transformer
    transformer.nodes([]);

    // Redraw the layer to reflect the removal
    layer.batchDraw();
  }
}

function _verticalFlipSelectedShapes() {
// Check if there are selected shapes
  const selectedShapes = transformer.nodes();
  if (selectedShapes.length > 0) {
            // Iterate through selected shapes and rotate each one
    selectedShapes.forEach((shape) => {
      shape.offsetY(shape.height());
      if (shape.attrs.vflip) {
        shape.offsetY(0);
        shape.attrs.vflip = false;
      } else {
        shape.attrs.vflip = true;
      }
              //vertical flip
      shape.scaleY(-shape.scaleY());
    });

            // Update the transformer to reflect the changes
    transformer.forceUpdate();
            //layer.batchDraw(); // Redraw the layer
  }
}

function _horizontalFlipSelectedShapes() {
  // Check if there are selected shapes
  const selectedShapes = transformer.nodes();
  if (selectedShapes.length > 0) {
    // Iterate through selected shapes and rotate each one
    selectedShapes.forEach((shape) => {
      shape.offsetX(shape.width());
      if (shape.attrs.hflip) {
        shape.offsetX(0);
        shape.attrs.hflip = false;
      } else {
        shape.attrs.hflip = true;
      }
      //horizonal flip
      shape.scaleX(-shape.scaleX());
    });

    // Update the transformer to reflect the changes
    transformer.forceUpdate();
    //layer.batchDraw(); // Redraw the layer
  }
}

function _rotateSelectedShapes() {
  const selectedShapes = transformer.nodes();
  selectedShapes.forEach((shape) => {
    const width = shape.width();
    const height = shape.height();
    const rotation = shape.rotation();

            // Save the current offsets
    const offsetX = shape.offsetX();
    const offsetY = shape.offsetY();

            // Set the offsets to half of the width and height of the shape
    shape.offsetX(width / 2);
            //shape.offsetY(height / 2);

            // Rotate 90 degrees clockwise
    shape.rotation(rotation + 90);

            // Reset the offsets
            //shape.offsetX(offsetX);
            //shape.offsetY(offsetY);
  });
}

// Internal konva control functions for rendering
function _generateGUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0,
          v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
  });
}

function _findElementById(layer, id) {
  var foundElement = null;

  // Iterate through all children of the stage's layer
  layer.children.forEach(function(group) {
      // Check if the ID matches
      if (group.id() === id) {
          foundElement = group;
          // Exit loop if found
          return false;
      }
  });

  return foundElement;
}

function _createElementBaseGroup(element) {
  let group = new Konva.Group({
      id: element.id || _generateGUID(),
      x: element.x,
      y: element.y,
      rotation: element.rotation,
      width: element.width,
      height: element.height,
      draggable: true,
      name: element.name,
      type: element.type,
      switched: element.switched,
      subtype: element.subtype,
      color: element.color,
      save: true,
      vflip: element.vflip,
      hflip: element.hflip,
      config: element.config
  });
  if (element.rotation) {
    group.rotation(element.rotation);
  }
  if (element.vflip) {
    group.offsetY(group.height());
    group.scaleY(-group.scaleY());
  }
  if (element.hflip) {
    group.offsetX(group.width());
    group.scaleX(-group.scaleX());
  }
  const selector = new Konva.Rect({
      width: element.width,
      height: blockSnapSize,
      name: 'selector',
  })
  group.add(selector);
  return group;
}

// Render Konva point type element directions
function setPointDirection(group,switched) {
    var point = group.attrs;
    const mainShape = group.findOne('.mainShape');
    const selector = group.findOne('.selector');
    const entryLine = group.findOne('.entryLine') || null;
    group.removeChildren();
    group.add(selector);
    group.add(mainShape);
    if (entryLine) {
      group.add(entryLine);
    }
    if (switched) {
      point.switched = true;
    } else {
      point.switched = false;
    }

    if (point.subtype === "crossOver") {
      return _setCrossoverDirection(group,switched);
    } else if (point.subtype === "normal") {
      return _setNormalDirection(group,switched);
    } else if (point.subtype === "toStraight") {
      return _setToStraightDirection(group,switched);
    } else if (point.subtype === "toSiding") {
      return _setToSidingDirection(group,switched);
    }
}

function _setNormalDirection(group,switched) {
  var point = group.attrs;
  if (switched) {
    const switchLine = new Konva.Path({
      stroke: 'green',
      strokeWidth: 2,
              // This should be the only different thing between the two types of point
      data: ` M${blockSnapSize-5},${(blockSnapSize / 2)}
      C${(blockSnapSize * 2) - 20},${(blockSnapSize / 2)}
      ${blockSnapSize * 2},0
      ${blockSnapSize * 2},0`,
    });
    group.add(switchLine);
  } else {
    const switchLine = new Konva.Line({
      stroke: 'green',
      strokeWidth: 2,
      points: [blockSnapSize-5, (blockSnapSize / 2), point.width, (blockSnapSize / 2)],
    });
    group.add(switchLine)
  }
  return group;
}

function _setToStraightDirection(group,switched) {
  var point = group.attrs;
  if (switched) {
    const switchLine = new Konva.Path({
      stroke: 'green',
      strokeWidth: 2,
      data: `M${30},${(blockSnapSize / 2) + blockSnapSize}
      C${35 + 38},${(blockSnapSize / 2) + blockSnapSize - 7}
      ${point.width - 23},${(blockSnapSize / 2)}
      ${point.width - 1},${(blockSnapSize / 2)}`,
    });
    group.add(switchLine);
  } else {
    const switchLine = new Konva.Line({
      stroke: 'green',
      strokeWidth: 2,
      points: [30, (blockSnapSize / 2) + blockSnapSize, point.width, (blockSnapSize / 2) + blockSnapSize],
    });
    group.add(switchLine)
  }
  return group;
}

function _setToSidingDirection(group,switched) {
  var element = group.attrs;
  var halfX = ((blockSnapSize-9) + ((blockSnapSize*2)-9)/2);
  var halfY = (blockSnapSize/2);
  if (switched) {
    const switchLine = new Konva.Path({
      stroke: 'green',
      strokeWidth: 2,
      data: `M${blockSnapSize},${blockSnapSize}
             C${halfX-5},${halfY+1}
              ${blockSnapSize * 2},${(blockSnapSize / 2)}
              ${(blockSnapSize * 2)+9},${(blockSnapSize / 2)}`,
    });
    const exitLine = new Konva.Line({
      stroke: 'green',
      strokeWidth: 2,
      points: [(blockSnapSize * 2)+9, blockSnapSize / 2, (blockSnapSize*3), blockSnapSize / 2],
    })
    group.add(switchLine);
    group.add(exitLine);
  } else {
    const switchLine = new Konva.Line({
      stroke: 'green',
      strokeWidth: 2,
      points: [blockSnapSize, blockSnapSize, (blockSnapSize*2), 0],
    });
    group.add(switchLine);
  }
  return group;
}

function _setCrossoverDirection(group,switched) {
  var element = group.attrs;
  var halfX = ((blockSnapSize-9) + ((blockSnapSize*2)-9)/2);
  var halfY = (blockSnapSize/2);
  if (switched) {
    const switchLine = new Konva.Line({
      stroke: 'green',
      strokeWidth: 2,
      points: [blockSnapSize, blockSnapSize, (blockSnapSize*2), 0],
    });
    group.add(switchLine);
  } else {
    const switchLine = new Konva.Line({
        stroke: 'green',
        strokeWidth: 2,
        points: [0, halfY, (blockSnapSize*3), halfY],
    });
    group.add(switchLine);
  }
  return group;
}

// Render points
function createPoint(point) {
    if (point.subtype === "toStraight") {
      return _createPointToStraight(point);
    } else if (point.subtype === "normal") {
      return _createNormalPoint(point);
    } else if (point.subtype === "toSiding") {
      return _createPointToSiding(point);
    } else if (point.subtype === "crossOver") {
      return _createCrossOver(point)
    }
}

function _createNormalPoint(point) {
  let group = _createElementBaseGroup(point);
  const mainShape = new Konva.Shape({
      stroke: 'gray',
      strokeWidth: 2,
      width: point.width,
      height: point.height,
      name: 'mainShape',
      sceneFunc: function (ctx, shape) {
          ctx.beginPath();
          ctx.moveTo(0,(blockSnapSize / 2) - 5);
          // Left join
          ctx.lineTo(20,(blockSnapSize / 2) - 5);
          // Top right
          // ctx.bezierCurveTo(41+30, blockSnapSize + (blockSnapSize / 2) - 5, point.width-30, (blockSnapSize / 2) - 5, point.width,(blockSnapSize / 2) - 5);
          ctx.bezierCurveTo(30, (blockSnapSize / 2) - 5,
                            blockSnapSize + 8,  15,
                            (blockSnapSize * 2)-9,0);

          //ctx.lineTo(point.x + point.width, point.y);
          ctx.strokeShape(shape);

          ctx.beginPath();
          // Bottom left
          ctx.moveTo(0, (blockSnapSize / 2) + 5);
          // Bottom right (lower)
          ctx.lineTo(point.width, (blockSnapSize / 2) + 5);
          ctx.strokeShape(shape);

          ctx.beginPath();
          // Bottom right (upper)
          ctx.moveTo(point.width, (blockSnapSize / 2) - 5);
          // Right join
          ctx.lineTo((blockSnapSize /2) + blockSnapSize + 7, (blockSnapSize / 2) - 5);
          // Top right (lower)
          // ctx.bezierCurveTo(40+30, blockSnapSize + (blockSnapSize / 2) - 5, point.width-15, (blockSnapSize / 2) + 5, point.width, (blockSnapSize / 2) + 5);
          ctx.bezierCurveTo((blockSnapSize /2) + blockSnapSize + 9, (blockSnapSize / 2) - 5,
                            (blockSnapSize * 2), 9,
                            (point.width-blockSnapSize)+9, 0);
          // (!) Konva specific method, it is very important
          ctx.strokeShape(shape);
      }
  });

  // Create a line with green stroke
  const entryLine = new Konva.Line({
      points: [0, (blockSnapSize / 2), blockSnapSize-5, (blockSnapSize / 2)],
      stroke: 'green',
      strokeWidth: 2,
      name: 'entryLine',
  });
  group.add(entryLine);
  group.add(mainShape);
  group = setPointDirection(group,point.switched);
  return group;
}

function _createPointToStraight(point) {
  let group = _createElementBaseGroup(point);
  const mainShape = new Konva.Shape({
      stroke: 'gray',
      strokeWidth: 2,
      width: point.width,
      height: point.height,
      name: 'mainShape',
      sceneFunc: function (ctx, shape) {
          ctx.beginPath();
          ctx.moveTo(0,blockSnapSize + (blockSnapSize / 2) - 5);
          // Left join
          ctx.lineTo(20, blockSnapSize + (blockSnapSize / 2) - 5);
          // Top right
          ctx.bezierCurveTo(41+30, blockSnapSize + (blockSnapSize / 2) - 5, point.width-30, (blockSnapSize / 2) - 5, point.width,(blockSnapSize / 2) - 5);

          //ctx.lineTo(point.x + point.width, point.y);
          ctx.strokeShape(shape);

          ctx.beginPath();
          // Bottom left
          ctx.moveTo(0, blockSnapSize + (blockSnapSize / 2) + 5);
          // Bottom right (lower)
          ctx.lineTo(point.width,blockSnapSize + (blockSnapSize / 2) + 5);
          ctx.strokeShape(shape);

          ctx.beginPath();
          // Bottom right (upper)
          ctx.moveTo(point.width, blockSnapSize + (blockSnapSize / 2) - 5);
          // Right join
          ctx.lineTo((blockSnapSize /2) + blockSnapSize + 7, blockSnapSize + (blockSnapSize / 2) - 5);
          // Top right (lower)
          ctx.bezierCurveTo(40+30, blockSnapSize + (blockSnapSize / 2) - 5, point.width-15, (blockSnapSize / 2) + 5, point.width, (blockSnapSize / 2) + 5);

          // (!) Konva specific method, it is very important
          ctx.strokeShape(shape);
      }
  });

  // Create a line with green stroke
  const entryLine = new Konva.Line({
      points: [0, (blockSnapSize / 2) + blockSnapSize, blockSnapSize-5, (blockSnapSize / 2) + blockSnapSize],
      stroke: 'green',
      strokeWidth: 2,
      name: 'entryLine',
  });
  group.add(entryLine);
  group.add(mainShape);
  group = setPointDirection(group,point.switched);
  return group;
}

function _createPointToSiding(element) {
  let group = _createElementBaseGroup(element);
  const shape = new Konva.Shape({
      stroke: 'gray',
      strokeWidth: 2,
      width: element.width,
      height: element.height,
      name: 'mainShape',
      sceneFunc: function (ctx, shape) {
          ctx.beginPath();

          var halfX = ((blockSnapSize-9) + ((blockSnapSize*2)-9)/2);
          var halfY = (blockSnapSize/2);
          //bottom left
          ctx.moveTo(blockSnapSize-9,blockSnapSize);
          ctx.lineTo((blockSnapSize*2)-9,0);

          // bottom right
          ctx.moveTo(blockSnapSize+9,blockSnapSize)
          ctx.bezierCurveTo(blockSnapSize+9,blockSnapSize,
                            halfX, halfY+4,
                            (blockSnapSize*2)+9,halfY + 5);
          ctx.lineTo(blockSnapSize * 3, halfY + 5)

          // top right
          ctx.moveTo((blockSnapSize*3),halfY - 5)
          ctx.lineTo(halfX+9, halfY-5);
          ctx.lineTo((blockSnapSize*2)+9,0);

          ctx.strokeShape(shape);
      }
  });

  group.add(shape);

  group = setPointDirection(group,true);

  return group; // or return shape; if you don't need it inside a group
}

function _createCrossOver(element) {
  let group = _createElementBaseGroup(element);
  const shape = new Konva.Shape({
      stroke: 'gray',
      strokeWidth: 2,
      width: element.width,
      height: element.height,
      name: 'mainShape',
      sceneFunc: function (ctx, shape) {
          ctx.beginPath();

          //bottom left
          ctx.moveTo(blockSnapSize-9,blockSnapSize);
          var halfX = ((blockSnapSize-9) + ((blockSnapSize*2)-9)/2);
          var halfY = (blockSnapSize/2);
          ctx.lineTo(halfX - 18, halfY + 5);
          ctx.lineTo(0,halfY + 5)

          // top left
          ctx.moveTo(0, (blockSnapSize / 2) - 5);
          ctx.lineTo(halfX - 9, halfY - 5);
          ctx.lineTo((blockSnapSize*2)-9,0);

          // bottom right
          ctx.moveTo(blockSnapSize+9,blockSnapSize)
          ctx.lineTo(halfX, halfY + 5);
          ctx.lineTo((blockSnapSize*3),halfY + 5)

          // top right
          ctx.moveTo((blockSnapSize*3),halfY - 5)
          ctx.lineTo(halfX+9, halfY-5);
          ctx.lineTo((blockSnapSize*2)+9,0);

          ctx.strokeShape(shape);
      }
  });

  group.add(shape);

  group = setPointDirection(group,true);

  return group; // or return shape; if you don't need it inside a group
}

// Render plain line elements
function createStraight(element) {
  console.log(element);
    let group = _createElementBaseGroup(element);
    const shape = new Konva.Shape({
        stroke: 'gray',
        strokeWidth: 2,
        width: element.width,
        height: element.height,
        name: 'mainShape',
        sceneFunc: function (ctx, shape) {
            ctx.beginPath();
            ctx.moveTo(0, (blockSnapSize / 2) - 5);
            ctx.lineTo(element.width, (blockSnapSize / 2) - 5);

            ctx.moveTo(0, (blockSnapSize / 2) + 5);
            ctx.lineTo(element.width, (blockSnapSize / 2) + 5);

            ctx.strokeShape(shape);
        }
    });

    group.add(shape);

    return group; // or return shape; if you don't need it inside a group
}

function createDiagonal(element) {
  const group = _createElementBaseGroup(element);
  const shape = new Konva.Shape({
      stroke: 'gray',
      strokeWidth: 2,
      width: element.width,
      height: element.height,
      name: 'mainShape',
      sceneFunc: function (ctx, shape) {
          ctx.beginPath();
          ctx.moveTo(blockSnapSize-9,blockSnapSize);
          ctx.lineTo((blockSnapSize*2)-9, 0);

          ctx.moveTo(blockSnapSize+9,blockSnapSize)
          ctx.lineTo((blockSnapSize*2)+9, 0);

          ctx.strokeShape(shape);
      }
  });

  group.add(shape);

  return group; // or return shape; if you don't need it inside a group
}

function createCurve(element) {
  let group = _createElementBaseGroup(element);
  const shape = new Konva.Shape({
      stroke: 'gray',
      strokeWidth: 2,
      width: element.width,
      height: element.height,
      name: 'mainShape',
      sceneFunc: function (ctx, shape) {
          ctx.beginPath();

          var halfX = ((blockSnapSize-9) + ((blockSnapSize*2)-9)/2);
          var halfY = (blockSnapSize/2);
          //bottom left
          ctx.moveTo(blockSnapSize-9,blockSnapSize);
          ctx.bezierCurveTo(blockSnapSize-9,blockSnapSize,
                            blockSnapSize+9, halfY-4,
                            blockSnapSize*2,halfY - 5);

          // bottom right
          ctx.moveTo(blockSnapSize+9,blockSnapSize)
          ctx.bezierCurveTo(blockSnapSize+9,blockSnapSize,
                            halfX, halfY+4,
                            blockSnapSize*2,halfY + 5);

          ctx.strokeShape(shape);
      }
  });

  group.add(shape);

  return group; // or return shape; if you don't need it inside a group
}

// Render signals and sensors
function createSignal(signal) {
  signal.width = blockSnapSize;
  signal.height = blockSnapSize;
  signal.radius = 8;
  group = _createElementBaseGroup(signal);
  const outline = new Konva.Rect({
    x: blockSnapSize - (signal.radius * 2.5),
    y: 0,
    width: signal.radius * 2.5,
    height: signal.radius * 1.5,
      stroke: 'gray', // Outline color for the box
      strokeWidth: 1,
      name: 'outline',
    });
  group.add(outline);

    // Draw the left circle
  const leftCircle = new Konva.Circle({
    name: 'leftCircle',
    x: (blockSnapSize / 2) + (signal.radius / 2),
    y: (signal.radius / 2) + 2,
    radius: signal.radius / 2,
    fill: '',
    fill: (signal.color == "dyellow") ? signal.color : '',
  });
  group.add(leftCircle);

    // Draw the right circle
  const rightCircle = new Konva.Circle({
    name: 'rightCircle',
    x: (blockSnapSize / 2) + (signal.radius * 2) - 3,
    y: (signal.radius / 2) + 2.2,
    radius: signal.radius / 2,
    fill: '',
    fill: (signal.color == "red" || signal.color == "yellow" || signal.color == "green") ? signal.color : '',
  });
  group.add(rightCircle);

  group = setSignalColor(group,signal.color);

  return group;
}

// Render control elements
function createControlPanel(element) {
  let ID = _generateGUID();
  let width = blockSnapSize * 6;
  let height = blockSnapSize * 2;
  const connectedElement = _findElementById(layer,element.connectedElement);
  const group = new Konva.Group({
    id: ID,
    x: element.x,
    y: element.y,
    width: width,
    height: height,
    draggable: true,
    name: element.name,
    type: element.type,
    connectedElement: element.connectedElement,
    save: true,
  });
  const rect = new Konva.Rect({
    width: width,
    height: height,
    stroke: 'gray',
    fill: 'gray',
    strokeWidth: 2
  })
  group.add(rect);
  let text = new Konva.Text({
    text: `Control panel for ${connectedElement.attrs.type} ${connectedElement.attrs.id.split('-').pop()}`, // Get the last part of the GUID
    fontSize: 12,
    fill: 'black',
    align: 'center',
    width: width
  });
  group.add(text);
  controllers.push(ID);
  return group;
}

function createConnector(element1,element2) {
  const ID = "connector-" + element1.attrs.id;
  const line = new Konva.Line({
    id: ID,
    stroke: 'gray',
    strokeWidth: 2,
    dash: [5, 5]
  });

  line.points([element1.x() + (element1.width() / 2), element1.y() + (element1.height() / 2), element2.x() + (element2.width() / 2), element2.y() + (element2.height() / 2)]);
  layer.add(line);
  layer.batchDraw();
}

// Configuration functions for addng new elements new elements
function addPoint(type) {
  height = blockSnapSize;
  if (type == "toStraight") {
    height = blockSnapSize * 2;
  }
  const point = {
      x: blockSnapSize,
      y: blockSnapSize,
      width: blockSnapSize * 3,
      height: height,
      type: "point",
      name: "shape",
      subtype: type,
      switched: true,
      draggable: true,
  };
  element = createPoint(point);
  layer.add(element);
}

function addStraight(length) {
    let width = blockSnapSize;
    if (length == "long") {
        width = width * 4;
    }
    const striat = {
        x:blockSnapSize,
        y:blockSnapSize,
        width: width,
        height: blockSnapSize,
        type: "straight",
        name: "shape",
        draggable: true,
    };
    element = createStraight(striat);
    layer.add(element);
}

function addCurve(radius) {
  height = blockSnapSize * radius;
  const config = {
      x: blockSnapSize,
      y: blockSnapSize,
      width: blockSnapSize * 2,
      height: height,
      type: "plainline",
      name: "shape",
      subtype: "curve",
      draggable: true,
  };
  element = createCurve(config);
  layer.add(element);
}

function addDiagonal() {
  let width = blockSnapSize * 3;
  const striat = {
      x:blockSnapSize,
      y:blockSnapSize,
      width: width,
      height: blockSnapSize,
      type: "diagonal",
      name: "shape",
      draggable: true,
  };
  element = createDiagonal(striat);
  layer.add(element);
}

function addSignal(color) {
    const signal = {
        x:blockSnapSize,          // X-coordinate of the signal's center
        y:blockSnapSize,          // Y-coordinate of the signal's center
        color: color,  // Color of the signal (you can change this)
        type: "signal",
        name: "shape",
    };
    element = createSignal(signal);
    layer.add(element);
}

function addControlElement() {
  const selectedShapes = transformer.nodes();
  if (selectedShapes.length == 0) {
    showLogMessage("ERROR: Please select a point or signal");
    return;
  }
  if (selectedShapes.length > 1) {
    showLogMessage("ERROR: More than one element selected");
    return;
  }
  const connectedElement = selectedShapes[0];
  if (connectedElement.attrs.type !== "point" && connectedElement.attrs.type !== "signal") {
    showLogMessage("ERROR: No way of adding a controller for " + connectedElement.attrs.type);
    return;
  }
  const cp = {
    x:blockSnapSize,          // X-coordinate of the signal's center
    y:blockSnapSize,          // Y-coordinate of the signal's center
    type: "controlPanel",
    name: "shape",
    connectedElement: connectedElement.attrs.id
  };
  element = createControlPanel(cp);
  layer.add(element);
}

function resizePanel() {
  var width = parseInt(document.getElementById('panelWidth').value);
  var height = parseInt(document.getElementById('panelHeight').value);

  _resizeStage(width,height);
}
// Operation functions
function showLogMessage(message) {
  const logElement = document.getElementById('log');
  logElement.innerText = message;
  setTimeout(() => {
    logElement.innerText = ''; // Clear message after 5 seconds
  }, 5000);
}

function saveStage() {
  panelData.elements = [];
  layer.children.forEach(function(shapeData) {
    if (shapeData.attrs.save) {
      panelData.elements.push(shapeData.attrs);
    }
  });
  // Check if panelId is not null or undefined
  if (panelId) {
    // Get the server from localStorage
    const server = localStorage.getItem('dctDCC-Server');

    // Make a PUT request to update panel data
    fetch(`//${server}/panel/${panelId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(panelData),
      })
      .then(response => {
          if (!response.ok) {
              throw new Error('Network response was not ok');
          }
          return response.json();
      })
      .then(data => {
        showLogMessage('Panel data updated successfully');
      })
      .catch(error => {
          showLogMessage(`Error updating panel data: ${error}`);
      });
  } else {
      // Show error message if panelId is not found in the URL
      showLogMessage(`Panel ID not found in the URL`);
  }
}

function loadStage() {
  // Get the panelId query parameter from the URL
  panelId = _getQueryParam('panelId');

  // Check if panelId is not null or undefined
  if (panelId) {
      // Get the server from localStorage
      const server = localStorage.getItem('dctDCC-Server');

      // Make a GET request using panelId and server
      $.get(`//${server}/panel/${panelId}`, function (data) {
          // Handle the response data here
          panelData = data;
          if (panelData.elements) {
            const elements = panelData.elements;
            elements.forEach(function(shapeData) {
              // Create a new shape with the shape data
              if (shapeData.type == "point") {
                var point = createPoint(shapeData);
                layer.add(point);
              }
              if (shapeData.type == "straight") {
                var element = createStraight(shapeData);
                layer.add(element);
              }
              if (shapeData.type == "signal") {
                var element = createSignal(shapeData);
                layer.add(element);
              }
              if (shapeData.type == "controlPanel") {
                var element = createControlPanel(shapeData);
                layer.add(element);
              }
            });
            // Draw the layer
            layer.draw();
          }
      });
  } else {
      console.error('No saved data found');
  }
}

function _getQueryParam(name) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(name);
}

function _generateSignalButtons(config,id) {
  const buttons = [];
  if (!config) {
    config = {
      "Aspects": [
        {"Colour": "Red"},
        {"Colour": "Amber"},
        {"Colour": "Amber (second)"},
        {"Colour": "Green"}
      ]
    }
  }
  // Define the order of colors
  const colorOrder = ['Red', 'Amber', 'Amber (second)', 'Green'];
  const aspects = config.Aspects;
  //NEED TO BE IN ORDER
  colorOrder.forEach(color => {
    aspects.forEach(aspect => {
      if (aspect.Colour === color) {
        if (color === 'Red') {
          buttons.push(`<button style="padding: 10px;" onclick="changeSignal('${id}','red')">
                        <svg width="20" height="26">
                            <!-- Red signal icon -->
                            <circle cx="10" cy="20" r="6" fill="red" />
                        </svg>
                    </button>`);
        } else if (color === 'Amber') {
          buttons.push(`<button style="padding: 10px;" onclick="changeSignal('${id}','yellow')">
                      <svg width="20" height="26">
                          <!-- Yellow signal icon -->
                          <circle cx="10" cy="20" r="6" fill="yellow" />
                      </svg>
                    </button>`);
        } else if (aspect.Colour === 'Amber (second)') {
          buttons.push(`<button style="padding: 10px;" onclick="changeSignal('${id}','dyellow')">
                      <svg width="20" height="26">
                          <!-- Double yellow signal icon -->
                          <circle cx="10" cy="6" r="6" fill="yellow" />
                          <circle cx="10" cy="20" r="6" fill="yellow" />
                      </svg>
                    </button>`);
        } else if (aspect.Colour === 'Green') {
          buttons.push(`<button style="padding: 10px;" onclick="changeSignal('${id}','green')">
                      <svg width="20" height="26">
                        <!-- Green signal icon -->
                        <circle cx="10" cy="20" r="6" fill="green" />
                    </svg>
                  </button>`);
        }
      }
    });
  });
  return buttons.join('');
}

function showControllers() {
  document.getElementById('showControllers').style.display = 'none';
  document.getElementById('hideControllers').style.display = 'inline-block';
  for(var i=0;i<controllers.length;i++) {
    id = controllers[i];
    if (document.getElementById(id)) {
      var controller = document.getElementById(id);
      controller.style.display = 'block';
    } else {
      const element = _findElementById(layer, id);
      if (element) {
        const connectedElement = _findElementById(layer, element.attrs.connectedElement);
        var elementName = connectedElement.attrs.type + ": ";
        if (connectedElement.attrs.config) {
          elementName += connectedElement.attrs.config.Name;
        } else {
          elementName += connectedElement.attrs.id.split('-').pop();
        }
        if (connectedElement.attrs.type === "point") {
          var switchedLabel = "Switched";
          var normalLabel = "Normal";
          if (connectedElement.attrs.config) {
            switchedLabel = connectedElement.attrs.config.Switched;
            normalLabel = connectedElement.attrs.config.Normal;
          }
          const controllerHTML = `
            <div id="${element.id()}" style="background: gray; position: absolute; left: ${element.x()}px; top: ${element.y()}px; width: ${element.width()}px; height: ${element.height()}px; text-align: center;">
              <button onclick="configureElement('${connectedElement.attrs.id}','${element.id()}')" style="position: absolute; padding: 0px; top: 0px; right: 0px; background: none; border: none; cursor: pointer;">
                <i class="fas fa-cog"></i>
              </button>
              <p style="padding: 0; margin: 0;">${elementName}</p>
              <button onclick="setPointState('${connectedElement.attrs.id}','normal')">${normalLabel}</button>
              <button onclick="setPointState('${connectedElement.attrs.id}','switched')">${switchedLabel}</button>
            </div>
          `;
          document.getElementById('trackCanvas').insertAdjacentHTML('beforeend', controllerHTML);
        }
        if (connectedElement.attrs.type === "signal") {
          const config = connectedElement.attrs.config;

          var controllerHTML = `
            <div id="${element.id()}" style="background: gray; position: absolute; left: ${element.x()}px; top: ${element.y()}px; width: ${element.width()}px; height: ${element.height()}px; text-align: center;">
              <button onclick="configureElement('${connectedElement.attrs.id}','${element.id()}')" style="position: absolute; padding: 0px; top: 0px; right: 0px; background: none; border: none; cursor: pointer;">
                <i class="fas fa-cog"></i>
              </button>
              <p style="padding: 0; margin: 0;">${elementName}</p>`;

          controllerHTML += _generateSignalButtons(config,connectedElement.attrs.id) + "</div>";

          document.getElementById('trackCanvas').insertAdjacentHTML('beforeend', controllerHTML);
        }
      } else {
        console.error('Element not found');
      }
    }
  }
}

function hideControllers() {
  document.getElementById('hideControllers').style.display = 'none';
  document.getElementById('showControllers').style.display = 'inline-block';
  for (var i = 0; i < controllers.length; i++) {
      var id = controllers[i];
      var controller = document.getElementById(id);
      if (controller) {
          controller.style.display = 'none';
      }
  }
}

function showConnectors() {
  document.getElementById('showConnectors').style.display = 'none';
  document.getElementById('hideConnectors').style.display = 'inline-block';
  for(var i=0;i<controllers.length;i++) {
    id = "connector-" + controllers[i];
    const connector = _findElementById(layer, id);
    const element1 = _findElementById(layer, controllers[i]);
    const element2 = _findElementById(layer,element1.attrs.connectedElement);
    if (connector) {
      connector.points([element1.x() + (element1.width() / 2), element1.y() + (element1.height() / 2), element2.x() + (element2.width() / 2), element2.y() + (element2.height() / 2)]);
    } else {
      createConnector(element1,element2);
    }
  }
}

function hideConnectors() {
  document.getElementById('hideConnectors').style.display = 'none';
  document.getElementById('showConnectors').style.display = 'inline-block';
  for (var i = 0; i < controllers.length; i++) {
      var id = "connector-" + controllers[i];
      const connector = _findElementById(layer, id);
      if (connector) {
          connector.remove();
      }
  }
}

function saveElementData(elementId,values) {
  const element = _findElementById(layer, elementId);
  delete values._id;
  element.attrs.config = values;
  $('#res').html('<p>' + element.attrs.type + ' updated</p>');
  saveStage();
}

function configureElement(elementId,controllerID) {
  //Make sure no nodes are selected before typing on keyboard!
  transformer.nodes([]);
  const controller = document.getElementById(controllerID);
  const element = _findElementById(layer, elementId);

  // Get the popup template
  const popupTemplate = document.getElementById('popupTemplate');

  // Clone the template content
  const popupContent = popupTemplate.content.cloneNode(true);

  // NOT WORKING
  $('#elementType').html(element.attrs.type);

  var schema = 'schemas/points.json';
  if (element.attrs.type == "signal") {
      schema = 'schemas/signals.json';
  }
  var data = element.attrs.config || {};
  data._id = elementId;
  fetch(schema)
  .then(response => response.json())
  .then(schema => {
      $('#elementType').html(element.attrs.type);
      $('#configureElementForm').jsonForm({
          schema: schema,
          value: data,
          onSubmit: function (errors, values) {
              if (errors) {
                  $('#res').html('<p>Please correct the errors in your form</p>');
              } else {
                  var inputObject = values;
                  saveElementData(elementId,inputObject);
                  if (controller) {
                    controller.remove();
                    showControllers();
                  }
                  document.getElementsByClassName('popup-overlay')[0].remove();
              }
          }
      });
  })
  .catch(error => {
      console.error("Error fetching schema:", error);
  });

  // Add event listener for Close button
  popupContent.querySelector('#closeButton').addEventListener('click', function() {
    document.getElementsByClassName('popup-overlay')[0].remove();
  });

  // Append the popup content to the trackCanvas div
  document.getElementById('trackCanvas').appendChild(popupContent);
}

// Render signal colour
function setSignalColor(signalGroup, color) {
  const leftCircle = signalGroup.findOne('.leftCircle');
  const rightCircle = signalGroup.findOne('.rightCircle');

  // Update fill color based on the provided color
  if (color === "dyellow") {
      leftCircle.fill("yellow");
      rightCircle.fill("yellow");
  } else {
      leftCircle.fill((color === "red" || color === "yellow" || color === "green") ? color : '');
      rightCircle.fill('');
  }

  // Update the color attribute
  signalGroup.attrs.color = color;

  return signalGroup;
}

// DCC operation functions
function switchPoint(id) {
  const element = _findElementById(layer, id);
  if (element) {
    element.attrs.switched = !element.attrs.switched;
    setPointDirection(element, element.attrs.switched);
    const switchedDirection = element.attrs.config.SwitchedDirection;
          var direction = switchedDirection;
          if (switched) {
            direction = switchedDirection.toUpperCase();
          } else {
            if (switchedDirection.toUpperCase() == "FORWARD") {
              direction = "REVERSE";
            } else {
              direction = "FORWARD";
            }
          }
          setAccessoryDirection(element.attrs.config.DCCNumber,direction);
    saveStage();
  } else {
    console.error(`Element with id ${id} not found`);
  }
}

function setPointState(id, state) {
  const element = _findElementById(layer, id);
  if (element) {
      if (state === "normal" || state === "switched") {
          element.attrs.switched = (state === "switched");
          setPointDirection(element, element.attrs.switched);
          const switchedDirection = element.attrs.config.SwitchedDirection;
          var direction = switchedDirection;
          if (element.attrs.switched) {
            direction = switchedDirection.toUpperCase();
          } else {
            if (switchedDirection.toUpperCase() == "FORWARD") {
              direction = "REVERSE";
            } else {
              direction = "FORWARD";
            }
          }
          setAccessoryDirection(element.attrs.config.DCCNumber,direction);
          saveStage();
      } else {
          console.error('Invalid state provided');
      }
  } else {
      console.error(`Element with id ${id} not found`);
  }
}

function changeSignal(id, color) {
  const element = _findElementById(layer, id);
  if (element) {
    const config = element.attrs.config || { Aspects: [] };
    let dccNumber, direction;

    // Map colors from config to colors used in the code
    const colorMap = {
      "red": "Red",
      "yellow": "Amber",
      "green": "Green",
      "dyellow": "Amber (second)"
    };

    // Find the aspect in config that matches the given color
    const matchingAspect = config.Aspects.find(aspect => aspect.Colour === colorMap[color]);

    // If a matching aspect is found, retrieve dccNumber and direction
    if (matchingAspect) {
      dccNumber = matchingAspect.DCCNumber;
      direction = matchingAspect['Aspect direction'].toUpperCase();

      // Set accessory direction using retrieved values
      setAccessoryDirection(dccNumber, direction);
    } else {
      console.error(`Aspect with color ${color} not found in the configuration.`);
    }
    // Set signal color and save stage
    setSignalColor(element, color);
    saveStage();
  } else {
    console.error(`Element with id ${id} not found`);
  }
}

function setAccessoryDirection(dccNumber, direction) {
  if (serverStatus != "online"){
      log('Cannot send command, server ' + serverStatus );
      return;
  }
  return fetch(`//${server}/accessory/${dccNumber}`, {
      method: "PUT",
      headers: {
          "Content-Type": "application/json",
      },
      body: JSON.stringify({ direction }),
  })
  .then((response) => response.json())
  .catch((error) => {
      console.error("Error updating server:", error);
  });
}