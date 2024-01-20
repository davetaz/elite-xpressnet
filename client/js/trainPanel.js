function setuptrainPanel() {
    const initialContainer = document.getElementById("container1");
    initialContainer.classList.add("active");

    const addTrainButtons = document.querySelectorAll(".add-train-button");
    addTrainButtons.forEach((button) => {
        button.addEventListener("click", () => {
            const container = button.parentElement; // Get the container of the clicked button
            const trainNumber = Number(prompt("Enter a train number (1-9999):"));

            if (trainNumber >= 1 && trainNumber <= 9999) {
                createTrain(container, trainNumber);
            } else {
                alert("Please enter a number between 1 and 9999.");
            }
        });
    });

    // Add event listeners to container buttons to switch between containers
    const containerButtons = document.querySelectorAll(".container-button");
    containerButtons.forEach((button) => {
        button.addEventListener("click", () => {
            const targetContainerId = button.getAttribute("data-container");
            const targetContainer = document.getElementById(targetContainerId);

            // Hide all containers
            const containers = document.querySelectorAll(".container");
            containers.forEach((container) => {
                container.style.display = "none";
            });

            // Show the selected container
            targetContainer.style.display = "inline-grid";

            // Toggle the active class for the buttons
            containerButtons.forEach((btn) => {
                btn.classList.remove("active");
            });
            button.classList.add("active");
        });
    });
}

function setThrottleSpeed(trainNumber, speed, direction) {
    if (serverStatus != "online"){
        log('Cannot send command, server ' + serverStatus );
        return;
    }
    return fetch(`//${server}/train/${trainNumber}/throttle`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ direction, speed }),
    })
    .then((response) => response.json())
    .catch((error) => {
        console.error("Error updating server:", error);
    });
}

// Function to set the function state
function setFunctionState(trainNumber, functionNumber, state) {
    if (serverStatus != "online"){
        log('Cannot send command, server ' + serverStatus );
        return;
    }
    // Make a PUT request to update the function state
    fetch(`http://${server}/train/${trainNumber}/function/${functionNumber}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ "switch": state }),
    })
    .then((response) => response.json())
    .then((data) => {
        // Handle the response if needed
        console.log("Function state updated:", data);
    })
    .catch((error) => {
        console.error("Error updating function state:", error);
    });
}

async function createTrain(container, number) {
    container.innerHTML = "";
    const trainTemplate = document.getElementById("trainTemplate");
    const clone = document.importNode(trainTemplate.content, true);
    const trainContainer = container;

    // Set the train number
    const trainNumber = clone.querySelector(".train-number");
    trainNumber.textContent = number;

    const response = await fetch(`//${server}/train?DCCNumber=${number}`);

    if (response.ok) {
        const trainData = await response.json();

        // Check if train data exists
        if (trainData) {

            const makeElement = clone.querySelector(".train-name");
            makeElement.textContent = trainData.ShortName;
            const imgElement = clone.querySelector(".train-image img");
            imgElement.src = `//${server}/train/${trainData._id}/${trainData.Picture}`;

        }
    } else {
        const makeElement = clone.querySelector(".train-name");
        makeElement.textContent = `Train #${number}`;
    }

    // Set up the slider and its value display
    const slider = clone.querySelector(".throttle");
    const sliderValue = clone.querySelector(".throttle-value");

    let sliderInputTimer = null; // Timer to debounce slider input events

    // Add event listeners for the direction buttons
    const reverseButton = clone.querySelector("#reverse");
    const forwardButton = clone.querySelector("#forward");

    // Add an event listener to the slider's input event to update the server when the slider moves
    slider.addEventListener("input", () => {
        // Clear the previous timer if it exists
        if (sliderInputTimer) {
            clearTimeout(sliderInputTimer);
        }

        // Set a new timer to execute the fetch after 100ms
        sliderInputTimer = setTimeout( async () => {
            const direction = forwardButton.classList.contains("active") ? 1 : 0; // Determine the current direction
            const speed = parseInt(slider.value, 10);
            sliderValue.textContent = speed;
            console.log(JSON.stringify({ direction, speed }));

            try {
                const data = await setThrottleSpeed(number, speed, direction);
                // Handle the response if needed
                console.log("Server response:", data);
            } catch (error) {
                // Handle errors here
                console.error("Error updating server:", error);
            }
        }, 100); // Execute the fetch after 100ms of no slider input events
    });

    reverseButton.addEventListener("click", async () => {
        // Set the clicked button as active and the other as inactive
        reverseButton.classList.add("active");
        forwardButton.classList.remove("active");

        // Call setThrottleSpeed with direction set to 0 (reverse) and the current slider value
        const direction = 0;
        const speed = parseInt(slider.value, 10);
        sliderValue.textContent = speed;
        try {
            const data = await setThrottleSpeed(number, speed, direction);
            // Handle the response if needed
            console.log("Server response:", data);
        } catch (error) {
            // Handle errors here
            console.error("Error updating server:", error);
        }
    });

    forwardButton.addEventListener("click", async () => {
        // Set the clicked button as active and the other as inactive
        forwardButton.classList.add("active");
        reverseButton.classList.remove("active");

        // Call setThrottleSpeed with direction set to 1 (forward) and the current slider value
        const direction = 1;
        const speed = parseInt(slider.value, 10);
        sliderValue.textContent = speed;
        try {
            const data = await setThrottleSpeed(number, speed, direction);
            // Handle the response if needed
            console.log("Server response:", data);
        } catch (error) {
            // Handle errors here
            console.error("Error updating server:", error);
        }
    });

    const stopButton = clone.querySelector("#Stop");

    stopButton.addEventListener("click", async () => {
        // 1. Set the speed to 0 and update the slider to this value
        const speed = 0;
        slider.value = speed;
        sliderValue.textContent = speed;

        // 2. Set the button to be active for 5 seconds
        stopButton.classList.add("active");
        setTimeout(() => {
            stopButton.classList.remove("active");
        }, 3000);

        // 3. Call setThrottleSpeed with speed 0
        const direction = forwardButton.classList.contains("active") ? 1 : 0; // Determine the current direction
        try {
            const data = await setThrottleSpeed(number, speed, direction);
            // Handle the response if needed
            console.log("Server response:", data);
        } catch (error) {
            // Handle errors here
            console.error("Error updating server:", error);
        }
    });

    const functionButtons = clone.querySelectorAll(".function-button");
    functionButtons.forEach((button) => {
        button.addEventListener("click", async () => {
            console.log('hello');
            button.classList.toggle("active");

            const functionNumber = parseInt(button.id.replace("f", ""), 10);
            // Determine the state based on the presence of the 'active' class
            const state = button.classList.contains("active") ? 1 : 0;

            // Call setFunctionState to update the function state
            try {
                const data = await setFunctionState(number, functionNumber, state);
                // Handle the response if needed
                console.log("Server response:", data);
            } catch (error) {
                // Handle errors here
                console.error("Error updating server:", error);
            }
        });
    });


    // Append the new train to the container
    trainContainer.appendChild(clone);
}