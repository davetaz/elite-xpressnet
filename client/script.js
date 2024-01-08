document.addEventListener("DOMContentLoaded", function () {
    const addButton = document.getElementById("addButton");
    const popup = document.getElementById("popup");
    const closePopup = document.getElementById("closePopup");
    const popupInput = document.getElementById("popupInput");
    const trainContainer = document.getElementById("trainContainer");

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
});

function setThrottleSpeed(trainNumber, speed, direction) {
    return fetch(`http://127.0.0.1:8080/train/${trainNumber}/throttle`, {
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

function createTrain(container, number) {
    container.innerHTML = "";
    const trainTemplate = document.getElementById("trainTemplate");
    const clone = document.importNode(trainTemplate.content, true);
    const trainContainer = container;
    let direction = 1;

    // Set the train number
    const trainNumber = clone.querySelector(".train-number");
    trainNumber.textContent = number;

    // Set up the slider and its value display
    const slider = clone.querySelector(".throttle");
    const sliderValue = clone.querySelector(".throttle-value");

    let sliderInputTimer = null; // Timer to debounce slider input events

    // Add an event listener to the slider's input event to update the server when the slider moves
    slider.addEventListener("input", () => {
        // Clear the previous timer if it exists
        if (sliderInputTimer) {
            clearTimeout(sliderInputTimer);
        }

        // Set a new timer to execute the fetch after 100ms
        sliderInputTimer = setTimeout(() => {
            // const direction = $(flipSwitch).val() === "forward" ? 1 : 0;
            const direction = 1;
            const speed = parseInt(slider.value, 10);
            sliderValue.textContent = speed;
            console.log(JSON.stringify({ direction, speed }));

            // Call the setThrottleSpeed function to update the server
            setThrottleSpeed(number, speed, direction)
                .then((data) => {
                    // Handle the response if needed
                    console.log("Server response:", data);
                });
        }, 100); // Execute the fetch after 100ms of no slider input events
    });

    // Add event listeners for the direction buttons
    const reverseButton = clone.querySelector("#reverse");
    const forwardButton = clone.querySelector("#forward");

    reverseButton.addEventListener("click", () => {
        // Set the clicked button as active and the other as inactive
        reverseButton.classList.add("active");
        forwardButton.classList.remove("active");

        // Call setThrottleSpeed with direction set to 0 (reverse) and the current slider value
        const direction = 0;
        const speed = parseInt(slider.value, 10);
        sliderValue.textContent = speed;
        setThrottleSpeed(number, speed, direction)
            .then((data) => {
                // Handle the response if needed
                console.log("Server response:", data);
            });
    });

    forwardButton.addEventListener("click", () => {
        // Set the clicked button as active and the other as inactive
        forwardButton.classList.add("active");
        reverseButton.classList.remove("active");

        // Call setThrottleSpeed with direction set to 1 (forward) and the current slider value
        const direction = 1;
        const speed = parseInt(slider.value, 10);
        sliderValue.textContent = speed;
        setThrottleSpeed(number, speed, direction)
            .then((data) => {
                // Handle the response if needed
                console.log("Server response:", data);
            });
    });

    const stopButton = clone.querySelector("#Stop");

    stopButton.addEventListener("click", () => {
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
        setThrottleSpeed(number, speed, direction)
            .then((data) => {
                // Handle the response if needed
                console.log("Server response:", data);
            });
    });

    const onButtons = clone.querySelectorAll(".function-buttons button");
    onButtons.forEach((button) => {
        button.addEventListener("click", () => {
            button.classList.toggle("active");
        });
    });

    // Append the new train to the container
    trainContainer.appendChild(clone);
}