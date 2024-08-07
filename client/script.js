let currentScreen = "trainPanel";
let serverStatus = "undefined";
let server = "";
let logTimeoutId;

document.addEventListener("DOMContentLoaded", function () {
    let prefers = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    let html = document.querySelector('html');

    html.classList.add(prefers);
    html.setAttribute('data-bs-theme', prefers);

    var topNav = document.getElementById("topNav");
    topNav.addEventListener("click", function(event) {
        var clickedElement = event.target;
        if (clickedElement.tagName === "BUTTON") {
            var screenId = clickedElement.getAttribute('target');
            window["setup" + screenId]();
            showScreen(screenId);
        }
    });

    document.getElementById('serverStatus').onclick = function() {
        const screenId = "serverSettings";
        if (typeof window["setup" + screenId] === 'function') {
            window["setup" + screenId]();
        }
        showScreen(screenId);
    };

    loadSection('trainPanel');
    loadSection('viewAccessories');
    loadSection('serverSettings');
    loadSection('addTrain');
    loadSection('addFunction');
    loadSection('viewTrains');
    loadSection('addPanel');
    loadSection('viewPanels');
    loadSection('viewFunctions');

    showScreen(currentScreen);
    pollServer();
    setInterval(pollServer, 5000);
});

async function pollServer() {
    let serverStatus, controllerStatus;

    if (localStorage.getItem("dctDCC-Server")) {
        server = localStorage.getItem("dctDCC-Server");
        const url = `//${server}/controller`;

        try {
            const response = await fetch(url);

            if (response.ok) {
                const data = await response.json();
                controllerStatus = data.status; // Get controller status from JSON response

                if (response.status === 200 || response.status === 404) {
                    serverStatus = "online";
                } else {
                    serverStatus = "error";
                }
            } else {
                serverStatus = "error";
                controllerStatus = "offline";
            }
        } catch (error) {
            console.error("Error fetching controller status:", error);
            serverStatus = "online"; // Assuming server is online but failed to get controller status
            controllerStatus = "offline";
        }
    } else {
        // No server configured
        serverStatus = "offline";
        controllerStatus = "offline";
    }

    // Determine overall status
    let overallStatus;
    if (serverStatus === "online" && controllerStatus === "online") {
        overallStatus = "Online";
    } else if (serverStatus === "online" && controllerStatus === "offline") {
        overallStatus = "Controller offline";
    } else {
        overallStatus = "Offline";
    }

    // Update the <span> element with id 'serverStatus'
    const serverStatusSpan = document.getElementById("serverStatus");
    if (serverStatusSpan) {
        serverStatusSpan.textContent = overallStatus;
    }
}

function loadSection(id) {
    var element = document.getElementById(id);
    fetch(`sections/${id}.html`)
    .then(response => response.text())
    .then(htmlContent => {
        // Set the innerHTML of the element with the loaded HTML content
        element.innerHTML = htmlContent;
        window["setup" + id]();
    })
    .catch(error => {
        console.error(`Error loading HTML content: ${error}`);
    });
}

function hideAllContentElements() {
    // Get the <section> element with the class "content"
    var contentSection = document.querySelector(".content");

    // Get all direct child elements of the "content" section
    var childElements = contentSection.children;

    // Loop through and hide each direct child element
    for (var i = 0; i < childElements.length; i++) {
        childElements[i].style.display = "none";
    }
}

function showScreen(id) {
    hideAllContentElements();
    var element = document.getElementById(id);
    element.style.display = "block";
    currentScreen = id;
}

function log(string) {
    const logElement = document.getElementById("log");

    if (logElement) {
        logElement.textContent = string;

        // Clear the previous timeout (if it exists)
        if (logTimeoutId) {
            clearTimeout(logTimeoutId);
        }

        // Set a new timeout to clear the content after 5 seconds
        logTimeoutId = setTimeout(() => {
            logElement.textContent = "";
        }, 5000);
    }
}
