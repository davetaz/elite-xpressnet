function setupserverSettings() {
    var serverForm = document.getElementById("serverForm");

    // Get a reference to the message div
    var messageDiv = document.getElementById("message");

    // Get the current server value from localStorage, if available
    var currentServer = localStorage.getItem("server");

    // Get a reference to the server input field
    var serverInput = document.getElementById("serverInput");

    // Set the input field value to the current server value, if defined
    if (currentServer) {
        serverInput.value = currentServer;
    }

    // Add a submit event listener to the form
    serverForm.addEventListener("submit", function(event) {
        event.preventDefault(); // Prevent the form from submitting normally

        // Get the input value
        var serverValue = serverInput.value;

        // Save the server value to localStorage
        localStorage.setItem("server", serverValue);

        // Update the message div with the saved server value
        messageDiv.textContent = "Server value saved: " + serverValue;
        messageDiv.style.display = "block"; // Show the message
    });
}