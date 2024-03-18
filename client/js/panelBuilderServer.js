let serverStatus = "undefined";
let server = "";
let logTimeoutId;

document.addEventListener("DOMContentLoaded", function () {
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