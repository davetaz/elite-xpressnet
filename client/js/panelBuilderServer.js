let serverStatus = "undefined";
let server = "";
let logTimeoutId;

document.addEventListener("DOMContentLoaded", function () {
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