let currentScreen = "trainPanel";
let serverStatus = "undefined";
let server = "";
let logTimeoutId;

document.addEventListener("DOMContentLoaded", function () {
    let prefers = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    let html = document.querySelector('html');

    html.classList.add(prefers);
    html.setAttribute('data-bs-theme', prefers);

    loadSection('trainPanel');
    loadSection('serverSettings');
    loadSection('addTrain');
    loadSection('viewTrains');
    loadSection('addPanel');
    loadSection('viewPanels');

    showScreen(currentScreen);
    pollServer();
    setInterval(pollServer, 5000);
});

async function pollServer() {
    if (localStorage.getItem("dctDCC-Server")) {
        server = localStorage.getItem("dctDCC-Server");
        const url = `//${server}/train/3/throttle`;

        try {
            const response = await fetch(url);

            if (response.status === 200 || response.status === 404) {
                serverStatus = "online"; // Set serverStatus to online for 200 or 404 status codes
            } else {
                serverStatus = "error"; // Set serverStatus to error for any other status code
                server = null;
            }
        } catch (error) {
            serverStatus = "offline"; // Set serverStatus to offline if there is an error in the fetch request
            server = null;
        }
    } else {
        // Handle the case when 'dctDCC-Server' is not set in localStorage
        serverStatus = "offline";
        server = null;
    }
    // Update the <span> element with id 'serverStatus'
    const serverStatusSpan = document.getElementById("serverStatus");
    if (serverStatusSpan) {
        serverStatusSpan.textContent = serverStatus;
    }
}

function loadSection(id) {
    console.log("loadSection " + id)
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

// Click event listener for the menu icon
var menuIcon = document.getElementById("menuIcon");
menuIcon.addEventListener("click", function() {
    var mainMenu = document.getElementById("main-menu");
    if (mainMenu.style.display === "none") {
        // If the menu is currently hidden, show it and hide other content
        hideAllContentElements();
        mainMenu.style.display = "block";
        document.getElementById(currentScreen).style.display = "none";
    } else {
        // If the menu is currently shown, hide it and show the specified element
        mainMenu.style.display = "none";
        document.getElementById(currentScreen).style.display = "block";
    }
});

function showScreen(id) {
    hideAllContentElements();
    var element = document.getElementById(id);
    element.style.display = "block";
    currentScreen = id;
}

// Get a reference to the parent container (the <ul> element)
var menuContainer = document.getElementById("main-menu");
// Click event listener for the parent container (event delegation)
menuContainer.addEventListener("click", function(event) {
    var clickedElement = event.target;
    if (clickedElement.tagName === "LI") {
        var screenId = clickedElement.getAttribute('target');
        window["setup" + screenId]();
        showScreen(screenId);
    }
});

var topNav = document.getElementById("topNav");
topNav.addEventListener("click", function(event) {
    var clickedElement = event.target;
    if (clickedElement.tagName === "BUTTON") {
        var screenId = clickedElement.getAttribute('target');
        showScreen(screenId);
    }
});

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
