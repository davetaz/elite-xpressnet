let currentScreen = "trainPanel";

document.addEventListener("DOMContentLoaded", function () {
    loadSection('trainPanel');
    loadSection('serverSettings');

    showScreen(currentScreen);
});

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
        showScreen(screenId);
    }
});