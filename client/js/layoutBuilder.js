const canvas = document.getElementById("trackCanvas");
const ctx = canvas.getContext("2d");
let backgroundColor = "white";
if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    backgroundColor = "#202b38";
    console.log("Dark mode is enabled.");
} else {
    // Dark mode is not enabled
    backgroundColor = "#fff";
    console.log("Dark mode is not enabled.");
}
// Define the element's properties
const elements = [];
let isDragging = false;
let offsetX, offsetY;
let selectedElement = null;
var editMode = true;

// Function to add a new point
function addPoint(x, y, direction, switched) {
    const newPoint = {
        x,
        y,
        width: 90,
        height: 55,
        type: "point",
        direction: direction,
        switched: switched,
    };
    elements.push(newPoint);
    drawElements();
}

function addStrait(x,y,length) {
    let width = 90;
    if (length == "long") {
        width = 180;
    }
    const newStriat = {
        x,
        y,
        width: width,
        height: 10,
        type: "strait",
    };
    elements.push(newStriat);
    drawElements();
}

function addSignal(x,y, color) {
    let radius = 8;
    const signal = {
        x,          // X-coordinate of the signal's center
        y,          // Y-coordinate of the signal's center
        height: radius * 1.5,
        width: radius * 2.5,
        radius: radius,      // Radius of the signal
        color: color,  // Color of the signal (you can change this)
        type: "signal"
    };
    elements.push(signal);
    drawElements();
}

function drawSignal(signal) {
    // Draw the signal's box
    ctx.strokeStyle = "gray"; // Outline color for the box
    ctx.lineWidth = 1;
    ctx.strokeRect(signal.x, signal.y, signal.radius * 2.5, signal.radius * 1.5);

    if (signal.color == "red" || signal.color == "yellow" || signal.color == "dyellow") {
        // Draw the left circle
        ctx.fillStyle = signal.color; // Fill color for the left circle
    } else {
        ctx.fillStyle = backgroundColor; // Fill color for the left circle
    }
    ctx.beginPath();
    ctx.arc(signal.x + signal.radius / 2+2, signal.y +signal.radius -2, signal.radius / 2, 0, 2 * Math.PI);
    ctx.fill();


    if (signal.color == "green" || signal.color == "dyellow") {
        // Draw the left circle
        ctx.fillStyle = signal.color; // Fill color for the left circle
    } else {
        ctx.fillStyle = backgroundColor; // Fill color for the left circle
    }
    ctx.beginPath();
    ctx.arc(signal.x + signal.radius * 2 - 2, signal.y + signal.radius / 2+2.2, signal.radius / 2, 0, 2 * Math.PI);
    ctx.fill();
}

function drawPointLHup(point) {
    // Draw point (outline only, in gray)
    ctx.strokeStyle = "gray";
    ctx.lineWidth = 2;

    ctx.beginPath();
    // Left top
    ctx.moveTo(point.x, point.y + 45);
    // Left join
    ctx.lineTo(point.x + 20, point.y + 45);
    // Top right
    ctx.bezierCurveTo(point.x+41+30, point.y + 45 , point.x+point.width-30, point.y+5, point.x+point.width, point.y+5);
    //ctx.lineTo(point.x + point.width, point.y);
    ctx.stroke();

    ctx.beginPath();
    // Bottom left
    ctx.moveTo(point.x, point.y + point.height);
    // Bottom right (lower)
    ctx.lineTo(point.x + point.width, point.y + point.height);
    ctx.stroke();

    ctx.beginPath();
    // Bottom right (upper)
    ctx.moveTo(point.x + point.width, point.y + 45);
    // Right join
    ctx.lineTo(point.x + 56, point.y + 45);
    // Top right (lower)
    ctx.bezierCurveTo(point.x+40+30, point.y + 45, point.x+point.width-15, point.y+15, point.x+point.width, point.y+15);
    ctx.stroke();

    drawDirectionLHup(point);
}

function drawPointRHup(point) {
    // Draw point (outline only, in gray)
    ctx.strokeStyle = "gray";
    ctx.lineWidth = 2;

    ctx.beginPath();
    // Right top
    ctx.moveTo(point.x + point.width, point.y + 45);
    // Right join
    ctx.lineTo(point.x + point.width - 20, point.y + 45);
    // Top left (upper)
    ctx.bezierCurveTo(point.x+point.width-41-30, point.y + 45 , point.x+40, point.y+5, point.x, point.y+5);
    //ctx.lineTo(point.x + point.width, point.y);
    ctx.stroke();

    ctx.beginPath();
    // Bottom left (lower)
    ctx.moveTo(point.x, point.y + point.height);
    // Bottom right (lower)
    ctx.lineTo(point.x + point.width, point.y + point.height);
    ctx.stroke();

    ctx.beginPath();
    // Bottom left (upper)
    ctx.moveTo(point.x, point.y + 45);
    // Left join
    ctx.lineTo(point.x + point.width -54, point.y + 45);
    // Top left (lower)
    ctx.bezierCurveTo(point.x+22, point.y + 45, point.x+25, point.y+15, point.x, point.y+15);
    ctx.stroke();

    drawDirectionRHup(point);

}

function drawPointLHdown(point) {
    // Draw point (outline only, in gray)
    ctx.strokeStyle = "gray";
    ctx.lineWidth = 2;

    ctx.beginPath();
    // Top left
    ctx.moveTo(point.x, point.y);
    // Top right (upper)
    ctx.lineTo(point.x + point.width, point.y);
    ctx.stroke();

    ctx.beginPath();
    // Left top
    ctx.moveTo(point.x, point.y + 10);
    // Left join
    ctx.lineTo(point.x + 20, point.y + 10);
    // Top right
    ctx.bezierCurveTo(point.x+41+30, point.y + 10, point.x+point.width-30, point.y+50, point.x+point.width, point.y+50);
    //ctx.lineTo(point.x + point.width, point.y);
    ctx.stroke();

    ctx.beginPath();
    // Bottom right (upper)
    ctx.moveTo(point.x + point.width, point.y + 10);
    // Right join
    ctx.lineTo(point.x + 57, point.y + 10);
    // Top right (lower)
    ctx.bezierCurveTo(point.x+40+30, point.y + 10, point.x+point.width-15, point.y+40, point.x+point.width, point.y+40);
    ctx.stroke();

    drawDirectionLHdown(point);
}

function drawPointRHdown(point) {
    // Draw point (outline only, in gray)
    ctx.strokeStyle = "gray";
    ctx.lineWidth = 2;

    ctx.beginPath();
    // Bottom left (lower)
    ctx.moveTo(point.x, point.y);
    // Bottom right (lower)
    ctx.lineTo(point.x + point.width, point.y);
    ctx.stroke();

    ctx.beginPath();
    // Right top
    ctx.moveTo(point.x + point.width, point.y + 10);
    // Right join
    ctx.lineTo(point.x + 57, point.y + 10);
    // Top left (upper)
    ctx.bezierCurveTo(point.x+25, point.y + 10 , point.x+40, point.y+50, point.x, point.y+50);
    //ctx.lineTo(point.x + point.width, point.y);
    ctx.stroke();

    ctx.beginPath();
    // Bottom left (upper)
    ctx.moveTo(point.x, point.y + 10);
    // Left join
    ctx.lineTo(point.x + point.width - 57, point.y + 10);
    // Top left (lower)
    ctx.bezierCurveTo(point.x+20, point.y + 10, point.x+24, point.y+40, point.x, point.y+40);
    ctx.stroke();

    drawDirectionRHdown(point);

}

function drawDirectionLHup(point) {
    ctx.lineWidth = 4;
    if (point.switched) {
        ctx.beginPath();
        ctx.strokeStyle = backgroundColor; // Set color to background color
        ctx.moveTo(point.x + 30, point.y + 50);
        ctx.lineTo(point.x + point.width, point.y + 50);
        ctx.stroke();

        ctx.beginPath();
        ctx.strokeStyle = "green";
        ctx.moveTo(point.x + 30, point.y + 50);
        ctx.bezierCurveTo(point.x+35+38, point.y + 45, point.x+point.width-23, point.y+10, point.x+point.width-1, point.y+10);
        ctx.lineTo(point.x+point.width,point.y+10);
        ctx.stroke();
    } else {
        ctx.beginPath();
        ctx.strokeStyle = backgroundColor; // Set color to background color
        ctx.moveTo(point.x + 30, point.y + 50);
        ctx.bezierCurveTo(point.x+35+38, point.y + 45, point.x+point.width-23, point.y+10, point.x+point.width-1, point.y+10);
        ctx.lineTo(point.x+point.width,point.y+10);
        ctx.stroke();

        ctx.beginPath();
        ctx.strokeStyle = "green";
        ctx.moveTo(point.x + 30, point.y + 50);
        ctx.lineTo(point.x + point.width, point.y + 50);
        ctx.stroke();
    }
    ctx.beginPath();
    ctx.strokeStyle = "green";
    ctx.moveTo(point.x + 0, point.y + 50);
    ctx.lineTo(point.x + 30, point.y + 50);
    ctx.stroke();
}

function drawDirectionLHdown(point) {
    ctx.lineWidth = 4;
    if (point.switched) {
        ctx.beginPath();
        ctx.strokeStyle = backgroundColor; // Set color to background color
        ctx.moveTo(point.x + 30, point.y + 5);
        ctx.lineTo(point.x + point.width, point.y + 5);
        ctx.stroke();

        ctx.beginPath();
        ctx.strokeStyle = "green";
        ctx.moveTo(point.x + 30, point.y + 5);
        ctx.bezierCurveTo(point.x+35+33, point.y + 5, point.x+point.width-23, point.y+45, point.x+point.width-1, point.y+45);
        ctx.lineTo(point.x+point.width,point.y+45);
        ctx.stroke();
    } else {
        ctx.beginPath();
        ctx.strokeStyle = backgroundColor; // Set color to background color
        ctx.moveTo(point.x + 30, point.y + 5);
        ctx.bezierCurveTo(point.x+35+33, point.y + 5, point.x+point.width-23, point.y+45, point.x+point.width-1, point.y+45);
        ctx.lineTo(point.x+point.width,point.y+45);
        ctx.stroke();

        ctx.beginPath();
        ctx.strokeStyle = "green";
        ctx.moveTo(point.x + 30, point.y + 5);
        ctx.lineTo(point.x + point.width, point.y + 5);
        ctx.stroke();
    }
    ctx.beginPath();
    ctx.strokeStyle = "green";
    ctx.moveTo(point.x + 0, point.y + 5);
    ctx.lineTo(point.x + 30, point.y + 5);
    ctx.stroke();
}

function drawDirectionRHup(point) {
    ctx.lineWidth = 4;
    if (point.switched) {
        ctx.beginPath();
        ctx.strokeStyle = backgroundColor; // Set color to background color
        ctx.moveTo(point.x, point.y + 50);
        ctx.lineTo(point.x + point.width - 30, point.y + 50);
        ctx.stroke();

        ctx.beginPath();
        ctx.strokeStyle = "green";
        ctx.moveTo(point.x + point.width - 30, point.y + 50);
        ctx.bezierCurveTo(point.x + point.width -35-38, point.y + 45, point.x+35, point.y+10, point.x+1, point.y+10);
        ctx.lineTo(point.x,point.y+10);
        ctx.stroke();
    } else {
        ctx.beginPath();
        ctx.strokeStyle = backgroundColor; // Set color to background color
        ctx.moveTo(point.x + point.width - 30, point.y + 50);
        ctx.bezierCurveTo(point.x + point.width -35-38, point.y + 45, point.x+35, point.y+10, point.x+1, point.y+10);
        ctx.lineTo(point.x,point.y+10);
        ctx.stroke();

        ctx.beginPath();
        ctx.strokeStyle = "green";
        ctx.moveTo(point.x, point.y + 50);
        ctx.lineTo(point.x + point.width - 30, point.y + 50);
        ctx.stroke();
    }
    ctx.beginPath();
    ctx.strokeStyle = "green";
    ctx.moveTo(point.x + point.width - 30, point.y + 50);
    ctx.lineTo(point.x + point.width, point.y + 50);
    ctx.stroke();
}

function drawDirectionRHdown(point) {
    ctx.lineWidth = 4;
    if (point.switched) {
        ctx.beginPath();
        ctx.strokeStyle = backgroundColor; // Set color to background color
        ctx.moveTo(point.x, point.y + 5);
        ctx.lineTo(point.x + point.width - 30, point.y + 5);
        ctx.stroke();

        ctx.beginPath();
        ctx.strokeStyle = "green";
        ctx.moveTo(point.x + point.width - 30, point.y + 5);
        ctx.bezierCurveTo(point.x + point.width -35-38, point.y + 5, point.x+35, point.y+45, point.x+1, point.y+45);
        ctx.lineTo(point.x,point.y+45);
        ctx.stroke();
    } else {
        ctx.beginPath();
        ctx.strokeStyle = backgroundColor; // Set color to background color
        ctx.moveTo(point.x + point.width - 30, point.y + 5);
        ctx.bezierCurveTo(point.x + point.width -35-38, point.y + 5, point.x+35, point.y+45, point.x+1, point.y+45);
        ctx.lineTo(point.x,point.y+45);
        ctx.stroke();

        ctx.beginPath();
        ctx.strokeStyle = "green";
        ctx.moveTo(point.x, point.y + 5);
        ctx.lineTo(point.x + point.width - 30, point.y + 5);
        ctx.stroke();
    }
    ctx.beginPath();
    ctx.strokeStyle = "green";
    ctx.moveTo(point.x + point.width - 30, point.y + 5);
    ctx.lineTo(point.x + point.width, point.y + 5);
    ctx.stroke();
}

function drawElements() {
    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Draw each element in the array
    for (const element of elements) {
        //Find direction from element config and call correct drawPoint function (LHup,LHdown,RHup,RHdown) will also need drawDirectionLHup etc
        if (element.type == "point") {
            if (element.direction == "LHup") {
                drawPointLHup(element);
            }
            if (element.direction == "RHup") {
                drawPointRHup(element);
            }
            if (element.direction == "LHdown") {
                drawPointLHdown(element);
            }
            if (element.direction == "RHdown") {
                drawPointRHdown(element);
            }
        }
        if (element.type == "strait") {
            drawStrait(element);
        }
        if (element.type == "signal") {
            drawSignal(element);
        }
    }
}

function drawStrait(element) {
    ctx.strokeStyle = "gray";
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(element.x, element.y);
    ctx.lineTo(element.x + element.width, element.y);

    ctx.moveTo(element.x, element.y + 10);
    ctx.lineTo(element.x + element.width, element.y + 10);

    ctx.stroke();
}

function switchPoint(index, isSwitched) {
    if (index >= 0 && index < elements.length) {
        elements[index].switched = isSwitched;
        if (elements[index].direction == "LHup") {
            drawDirectionLHup(elements[index]); // Redraw the specific element
        }
        if (elements[index].direction == "RHup") {
            drawDirectionRHup(elements[index]); // Redraw the specific element
        }
        if (elements[index].direction == "LHdown") {
            drawDirectionLHdown(elements[index]); // Redraw the specific element
        }
        if (elements[index].direction == "RHdown") {
            drawDirectionRHdown(elements[index]); // Redraw the specific element
        }
    }
}

function switchSignal(index) {
    signal = elements[index];
    if (signal.color == "red") {
        signal.color = "green";
    } else {
        signal.color = "red";
    }
    console.log('switch signal');
    console.log(signal);
    if (signal.color == "red" || signal.color == "yellow" || signal.color == "dyellow") {
        // Draw the left circle
        ctx.fillStyle = signal.color; // Fill color for the left circle
    } else {
        ctx.fillStyle = backgroundColor; // Fill color for the left circle
    }
    ctx.beginPath();
    ctx.arc(signal.x + signal.radius / 2+2, signal.y +signal.radius -2, signal.radius / 2, 0, 2 * Math.PI);
    ctx.fill();


    if (signal.color == "green" || signal.color == "dyellow") {
        // Draw the left circle
        ctx.fillStyle = signal.color; // Fill color for the left circle
    } else {
        ctx.fillStyle = backgroundColor; // Fill color for the left circle
    }
    ctx.beginPath();
    ctx.arc(signal.x + signal.radius * 2 - 2, signal.y + signal.radius / 2+2.2, signal.radius / 2, 0, 2 * Math.PI);
    ctx.fill();
}

//This is for the EDITOR only, not for the config.
function handleMouseDown(e) {
    const mouseX = e.clientX - canvas.getBoundingClientRect().left;
    const mouseY = e.clientY - canvas.getBoundingClientRect().top;

    // Check if the mouse click is within the element's bounding box
    for (const element of elements) {
        if (
            mouseX >= element.x &&
            mouseX <= element.x + element.width &&
            mouseY >= element.y &&
            mouseY <= element.y + element.height
        ) {
            isDragging = true;
            selectedElement = element;
            offsetX = mouseX - element.x;
            offsetY = mouseY - element.y;
            break;
        }
    }
}

function handleMouseOver(e) {

    console.log("Mouse over");
    const mouseX = e.clientX - canvas.getBoundingClientRect().left;
    const mouseY = e.clientY - canvas.getBoundingClientRect().top;

    // Check if the mouse is over any element's bounding box
    for (const element of elements) {
        if (
            mouseX >= element.x &&
            mouseX <= element.x + element.width &&
            mouseY >= element.y &&
            mouseY <= element.y + element.height
        ) {
            canvas.style.cursor = "pointer"; // Change cursor to pointer
            return; // Exit the loop when a element is found
        }
    }

    // If the mouse is not over any element, reset the cursor
    canvas.style.cursor = "default";
}

function handleMouseUp() {
    isDragging = false;
    selectedElement = null;
}
// Function to handle mouse move event
function handleMouseMove(e) {
    if (isDragging && selectedElement) {
        const mouseX = e.clientX - canvas.getBoundingClientRect().left;
        const mouseY = e.clientY - canvas.getBoundingClientRect().top;
        selectedElement.x = mouseX - offsetX;
        selectedElement.y = mouseY - offsetY;
        drawElements();
    }
}

function handleDoubleClick(e) {
    var indexToRemove = null;
    const mouseX = e.clientX - canvas.getBoundingClientRect().left;
    const mouseY = e.clientY - canvas.getBoundingClientRect().top;

    // Check if the mouse click is within the bounding box of any point
    for (let i = 0; i < elements.length; i++) {
        const element = elements[i];
        if (
            mouseX >= element.x &&
            mouseX <= element.x + element.width &&
            mouseY >= element.y &&
            mouseY <= element.y + element.height
        ) {
            // Toggle the point by calling switchPoint
            if (editMode) {
                indexToRemove = i;
                break; // Exit the loop when a point is found
            } else {
                if (element.type == "point") {
                    switchPoint(i, !element.switched);
                    return
                }
                if (element.type == "signal") {
                    switchSignal(i);
                    return;
                }
            }
        }
    }
    // Remove the point if it was found
    if (indexToRemove !== -1) {
        elements.splice(indexToRemove, 1);
        drawElements(); // Redraw the canvas after removing the point
    }
}

canvas.addEventListener("mousedown", handleMouseDown);
canvas.addEventListener("mouseup", handleMouseUp);
canvas.addEventListener("mousemove", handleMouseMove);
canvas.addEventListener("mousemove", handleMouseOver);
canvas.addEventListener("dblclick", handleDoubleClick);
// Get the checkbox element by its ID
const editModeCheckbox = document.getElementById("editModeCheckbox");

// Add an event listener to handle checkbox changes
editModeCheckbox.addEventListener("change", function() {
    editMode = this.checked; // Set editMode to the checkbox's checked state
    console.log(editMode);
    // You can perform additional actions based on the editMode state here
});