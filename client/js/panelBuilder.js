let backgroundColor = "white";
let stage = {};
let layer = {};
let transformer = {};
let elements = [];
var blockSnapSize = 45;
// Call createKonvaStage when the page is fully loaded
document.addEventListener("DOMContentLoaded", function () {
    stage = createKonvaStage();
    const layer = stage.getLayers()[0];
    addTransformer(stage,layer);
});

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
    console.log(width, padding, width / padding);
    for (var i = 0; i < width / padding; i++) {
      gridLayer.add(new Konva.Line({
        points: [Math.round(i * padding) + 0.5, 0, Math.round(i * padding) + 0.5, height],
        stroke: '#ddd',
        strokeWidth: 1,
      }));
    }

    gridLayer.add(new Konva.Line({points: [0,0,10,10]}));
    for (var j = 0; j < height / padding; j++) {
      gridLayer.add(new Konva.Line({
        points: [0, Math.round(j * padding), width, Math.round(j * padding)],
        stroke: '#ddd',
        strokeWidth: 0.5,
      }));
    }
    stage.add(gridLayer);

    return stage;
}

// Add the transformer
function addTransformer(stage,layer) {
      transformer = new Konva.Transformer();
      layer.add(transformer);
      var shapes = stage.find('.shape');
      // by default select all shapes
      transformer.nodes(shapes);
      transformer.rotationSnaps([0, 90, 180, 270]);
      transformer.resizeEnabled(false);

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
            y: Math.round(actualTarget.y() / blockSnapSize) * blockSnapSize
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
        // if we are selecting with rect, do nothing
        if (selectionRectangle.visible()) {
        return;
        }

        // if click on empty area - remove all selections
        if (e.target === stage) {
        transformer.nodes([]);
        return;
        }

        // Check if e.target has the name 'shape' or 'child'
        if (!e.target.hasName('shape') && !e.target.hasName('selector')) {
        return;
        }

        // Get the actual target based on the name
        const actualTarget = e.target.hasName('selector') ? e.target.parent : e.target;

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
      //switch the point
      /*
      if (point.switched) {
          point.switched = false;
      } else {
          point.switched = true;
      }
      setPointDirection(element,point);
      layer.batchDraw();
      */
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'r' || event.key === 'R') {
          const selectedShapes = transformer.nodes();

          if (selectedShapes.length > 1) {
              // Create a new Konva Group
              const group = new Konva.Group();
              // Add all selected shapes to the group
              selectedShapes.forEach((shape) => {
                  group.add(shape);
              });
              layer.add(group);
              console.log(group);
              // Perform the rotation on the group
              //group.rotation(group.rotation() + 90);

              transformer.forceUpdate();
              layer.batchDraw(); // Redraw the layer
          } else {
            selectedShapes.forEach((shape) => {
              shape.offsetX(shape.width() / 2);
              shape.offsetY(shape.height() / 2);
              shape.rotation(shape.rotation() + 90); // Rotate 90 degrees clockwise
            });
          }
      }
  });

    /*
    document.addEventListener('keydown', (event) => {
        if (event.key === 'r' || event.key === 'R') {
          // Calculate the center point of the selectionRectangle
          let centerX = 0;
          let centerY = 0;
          let minX = 20000;
          let maxX = 0;
          let width = 0;
          let minY = 20000;
          let maxY = 0;
          let height = 0;
          // Check if there are selected shapes
          const selectedShapes = transformer.nodes();
          if (selectedShapes.length > 1) {
            // Iterate through selected shapes and rotate each one
            selectedShapes.forEach((shape) => {
              const clientRect = shape.getClientRect();
              console.log(clientRect);
              if(clientRect.x < minX) {
                minX = clientRect.x;
              }
              if (maxX < (clientRect.x + clientRect.width)) {
                maxX = clientRect.x + clientRect.width;
              }
              if(clientRect.y < minY) {
                minY = clientRect.y;
              }
              if (maxY < (clientRect.y + clientRect.height)) {
                maxY = clientRect.y + clientRect.height;
              }
            });
            width = maxX - minX;
            height = maxY - minY;
            centerX = minX + (width / 2);
            centerY = minY + (height / 2);
            // Draw the center circle
            const center = new Konva.Circle({
                x: centerX,
                y: centerY,
                radius: 5,
                fill: 'red',
            });
            layer.add(center);
            selectedShapes.forEach((shape) => {
                const clientRect = shape.getClientRect();
                shape.offsetX((shape.width() / 2) - centerX);
                shape.offsetY((shape.width() / 2) - centerY);
                shape.rotation(shape.rotation() + 90); // Rotate 90 degrees clockwise
            });
          } else {
            selectedShapes.forEach((shape) => {
                shape.offsetX(shape.width() / 2);
                shape.offsetY(shape.height() / 2);
                shape.rotation(shape.rotation() + 90); // Rotate 90 degrees clockwise
            });
          }

          // Update the transformer to reflect the changes
          transformer.forceUpdate();
          layer.batchDraw(); // Redraw the layer
        }
    });
    */
    document.addEventListener('keydown', (event) => {
        if (event.key === 'h' || event.key === 'H') {
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
    });
    document.addEventListener('keydown', (event) => {
        if (event.key === 'v' || event.key === 'V') {
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
    });
    document.addEventListener('keydown', function (event) {
        // Check if the "Delete" key (key code 46) is pressed
        if (event.keyCode === 46) {
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
    });
}

function updateTransformer(stage) {
    var shapes = stage.find('.shape');
    transformer.nodes(shapes);
}

function setPointDirection(group,switched) {
    var point = group.attrs;
    const mainShape = group.findOne('.mainShape');
    const selector = group.findOne('.selector');
    const entryLine = group.findOne('.entryLine');
    group.removeChildren();
    group.add(selector);
    group.add(mainShape);
    group.add(entryLine);

    if (switched) {
        point.switched = true;
        const switchLine = new Konva.Path({
            stroke: 'green',
            strokeWidth: 2,
            data: `M${30},${+ 50}
                C${35 + 38},${45}
                    ${point.width - 23},${10}
                    ${point.width - 1},${10}`,
        });
        group.add(switchLine);
    } else {
        point.switched = false;
        const switchLine = new Konva.Line({
            stroke: 'green',
            strokeWidth: 2,
            points: [30, 50, point.width, 50],
        });
        group.add(switchLine)
    }
    return group;
}

function createPoint(point) {
    let group = new Konva.Group({
        x: point.x,
        y: point.y,
        rotation: point.rotation,
        width: point.width,
        height: point.height,
        draggable: true,
        name: point.name,
        type: point.type,
        switched: point.switched,
        vflip: point.vflip,
        hflip: point.hflip
    })
    if (point.rotation) {
      group.rotation(point.rotation);
    }
    if (point.vflip) {
      group.offsetY(group.height());
      group.scaleY(-group.scaleY());
    }
    if (point.hflip) {
      group.offsetX(group.width());
      group.scaleX(-group.scaleX());
    }
    const selector = new Konva.Rect({
        width: point.width,
        height: point.width,
        offsetY: 20,
        name: 'selector',
    })
    group.add(selector);
    const mainShape = new Konva.Shape({
        stroke: 'gray',
        strokeWidth: 2,
        width: point.width,
        height: point.height,
        name: 'mainShape',
        sceneFunc: function (ctx, shape) {
            ctx.beginPath();
            ctx.moveTo(0,45);
            // Left join
            ctx.lineTo(20, 45);
            // Top right
            ctx.bezierCurveTo(41+30, 45, point.width-30, 5, point.width,5);
            //ctx.lineTo(point.x + point.width, point.y);
            ctx.strokeShape(shape);

            ctx.beginPath();
            // Bottom left
            ctx.moveTo(0, point.height);
            // Bottom right (lower)
            ctx.lineTo(point.width,point.height);
            ctx.strokeShape(shape);

            ctx.beginPath();
            // Bottom right (upper)
            ctx.moveTo(point.width, 45);
            // Right join
            ctx.lineTo(56, 45);
            // Top right (lower)
            ctx.bezierCurveTo(40+30, 45, point.width-15, 15, point.width, 15);
            // (!) Konva specific method, it is very important
            ctx.strokeShape(shape);
        }
    });

    // Create a line with green stroke
    const entryLine = new Konva.Line({
        points: [0, 50, 30, 50],
        stroke: 'green',
        strokeWidth: 2,
        name: 'entryLine',
    });
    group.add(entryLine);
    group.add(mainShape);
    group = setPointDirection(group,point.switched);
    console.log(group);
    return group;
}

function createStrait(element) {
    let group = new Konva.Group({
        x: element.x,
        y: element.y,
        rotation: element.rotation,
        width: element.width,
        height: element.height,
        draggable: true,
        name: element.name,
        type: element.type,
    });
    if (element.rotation) {
      group.rotation(element.rotation);
    }
    if (element.vflip) {
      element.offsetY(element.height());
      element.scaleY(-element.scaleY());
    }
    if (element.hflip) {
      element.offsetX(element.width());
      element.scaleX(-element.scaleX());
    }
    const selector = new Konva.Rect({
        width: element.width,
        height: element.height,
        name: 'selector',
    })
    group.add(selector);
    const shape = new Konva.Shape({
        stroke: 'gray',
        strokeWidth: 2,
        width: element.width,
        height: element.height,
        name: 'mainShape',
        sceneFunc: function (ctx, shape) {
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(element.width, 0);

            ctx.moveTo(0, 10);
            ctx.lineTo(element.width, 10);

            ctx.strokeShape(shape);
        }
    });

    group.add(shape);

    return group; // or return shape; if you don't need it inside a group
}

function createSignal(signal) {
    const group = new Konva.Group({
        width: signal.width,
        height: signal.height,
        draggable: true,
        name: signal.name,
        type: signal.type,
    });

    // Draw the signal's box (rectangle)
    const rect = new Konva.Rect({
        x: signal.x,
        y: signal.y,
        width: signal.radius * 2.5,
        height: signal.radius * 1.5,
        stroke: 'gray', // Outline color for the box
        strokeWidth: 1,
        name: 'selector',
    });
    group.add(rect);

    // Draw the left circle
    const leftCircle = new Konva.Circle({
        x: signal.x + signal.radius / 2 + 2,
        y: signal.y + signal.radius - 2,
        radius: signal.radius / 2,
        fill: (signal.color == "red" || signal.color == "yellow" || signal.color == "dyellow") ? signal.color : '',
    });
    group.add(leftCircle);

    // Draw the right circle
    const rightCircle = new Konva.Circle({
        x: signal.x + signal.radius * 2 - 2,
        y: signal.y + signal.radius / 2 + 2.2,
        radius: signal.radius / 2,
        fill: (signal.color == "green" || signal.color == "dyellow") ? signal.color : '',
    });
    group.add(rightCircle);

    return group;
}

// Function to add a new point
function addPoint() {
    const point = {
        x: 10,
        y: 10,
        width: 90,
        height: 55,
        type: "point",
        name: "shape",
        switched: false,
        draggable: true,
    };
    element = createPoint(point);
    layer.add(element);
    updateTransformer(stage);
    elements.push(point);
}

function addStrait(length) {
    let width = 90;
    if (length == "long") {
        width = 180;
    }
    const striat = {
        x:10,
        y:10,
        width: width,
        height: 10,
        type: "strait",
        name: "shape",
        draggable: true,
    };
    element = createStrait(striat);
    layer.add(element);
    updateTransformer(stage);
    elements.push(striat);
}

function addSignal(color) {
    let radius = 8;
    const signal = {
        x:0,          // X-coordinate of the signal's center
        y:0,          // Y-coordinate of the signal's center
        height: radius * 1.5,
        width: radius * 2.5,
        radius: radius,      // Radius of the signal
        color: color,  // Color of the signal (you can change this)
        type: "signal",
        name: "shape",
    };
    element = createSignal(signal);
    layer.add(element);
    updateTransformer(stage);
    elements.push(signal);
}

function saveStage() {
  var json = stage.toJSON();
  console.log(json);
  localStorage.setItem('stageData', JSON.stringify(json));
}

function loadStage() {
  var savedData = localStorage.getItem('stageData');
  if (savedData) {
    var stageData = JSON.parse(JSON.parse(savedData));

    // Clear existing children of the layer
    //layer.destroyChildren();

    // Iterate over each layer in the saved JSON data
    stageData.children.forEach(function(layerData) {
      // Iterate over each shape in the layer data
      layerData.children.forEach(function(shapeData) {
        // Create a new shape with the shape data
        if (shapeData.attrs.type == "point") {
          var point = createPoint(shapeData.attrs);
          layer.add(point);
        }
        if (shapeData.attrs.type == "strait") {
          var element = createStrait(shapeData.attrs);
          layer.add(element);
        }
      });
    });

    // Draw the layer
    layer.draw();
    updateTransformer(stage);
  } else {
    console.log("No saved data found.");
  }
}
