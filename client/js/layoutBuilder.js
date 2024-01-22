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
// Define the point's properties
const points = [];
let isDragging = false;
let offsetX, offsetY;
let selectedPoint = null;

// Function to add a new point
function addPoint(x, y, switched) {
    const newPoint = {
        x,
        y,
        width: 90,
        height: 55,
        switched: switched,
    };
    points.push(newPoint);
    drawPoints();
}

function drawPoint(point) {
    // Draw point (outline only, in gray)
    ctx.strokeStyle = "gray";
    ctx.lineWidth = 2;
    ctx.beginPath();
    // Top right
    ctx.moveTo(point.x + point.width, point.y);
    // Left join
    ctx.lineTo(point.x + 41, point.y + 45);
    // Top left
    ctx.lineTo(point.x, point.y + 45);
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
    ctx.lineTo(point.x + 52, point.y + 45);
    // Top right (lower)
    ctx.lineTo(point.x + point.width, point.y + 10);
    ctx.stroke();

    drawDirection(point);
}
function drawDirection(point) {
    ctx.lineWidth = 4;
    if (point.switched) {
        ctx.beginPath();
        ctx.strokeStyle = backgroundColor; // Set color to white
        ctx.moveTo(point.x + 42, point.y + 50);
        ctx.lineTo(point.x + point.width - 2, point.y + 50);
        ctx.stroke();

        ctx.beginPath();
        ctx.strokeStyle = "green";
        ctx.moveTo(point.x + 41, point.y + 50);
        ctx.lineTo(point.x + point.width - 3, point.y + 8);
        ctx.stroke();
    } else {
        ctx.beginPath();
        ctx.strokeStyle = backgroundColor; // Set color to white
        ctx.moveTo(point.x + 41, point.y + 50);
        ctx.lineTo(point.x + point.width - 3, point.y + 8);
        ctx.stroke();

        ctx.beginPath();
        ctx.strokeStyle = "green";
        ctx.moveTo(point.x + 41, point.y + 50);
        ctx.lineTo(point.x + point.width - 2, point.y + 50);
        ctx.stroke();
    }
    ctx.beginPath();
    ctx.strokeStyle = "green";
    ctx.moveTo(point.x + 2, point.y + 50);
    ctx.lineTo(point.x + 42, point.y + 50);
    ctx.stroke();
}
function drawPoints() {
    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Draw each point in the array
    for (const point of points) {
        //Find direction from point config and call correct drawPoint function (LHup,LHdown,RHup,RHdown) will also need drawDirectionLHup etc
        drawPoint(point);
    }
}

function switchPoint(index, isSwitched) {
    if (index >= 0 && index < points.length) {
        points[index].switched = isSwitched;
        drawDirection(points[index]); // Redraw the specific point
    }
}

//This is for the EDITOR only, not for the config.
function handleMouseDown(e) {
    const mouseX = e.clientX - canvas.getBoundingClientRect().left;
    const mouseY = e.clientY - canvas.getBoundingClientRect().top;

    // Check if the mouse click is within the point's bounding box
    for (const point of points) {
        if (
            mouseX >= point.x &&
            mouseX <= point.x + point.width &&
            mouseY >= point.y &&
            mouseY <= point.y + point.height
        ) {
            isDragging = true;
            selectedPoint = point;
            offsetX = mouseX - point.x;
            offsetY = mouseY - point.y;
            break;
        }
    }
}

function handleMouseOver(e) {

    console.log("Mouse over");
    const mouseX = e.clientX - canvas.getBoundingClientRect().left;
    const mouseY = e.clientY - canvas.getBoundingClientRect().top;

    // Check if the mouse is over any point's bounding box
    for (const point of points) {
        if (
            mouseX >= point.x &&
            mouseX <= point.x + point.width &&
            mouseY >= point.y &&
            mouseY <= point.y + point.height
        ) {
            canvas.style.cursor = "pointer"; // Change cursor to pointer
            return; // Exit the loop when a point is found
        }
    }

    // If the mouse is not over any point, reset the cursor
    canvas.style.cursor = "default";
}

function handleMouseUp() {
    isDragging = false;
    selectedPoint = null;
}
// Function to handle mouse move event
function handleMouseMove(e) {
    if (isDragging && selectedPoint) {
        const mouseX = e.clientX - canvas.getBoundingClientRect().left;
        const mouseY = e.clientY - canvas.getBoundingClientRect().top;
        selectedPoint.x = mouseX - offsetX;
        selectedPoint.y = mouseY - offsetY;
        drawPoints();
    }
}

canvas.addEventListener("mousedown", handleMouseDown);
canvas.addEventListener("mouseup", handleMouseUp);
canvas.addEventListener("mousemove", handleMouseMove);
canvas.addEventListener("mousemove", handleMouseOver);

addPoint(100,100,true);
addPoint(200,200,true);