document.addEventListener("DOMContentLoaded", function () {
    const addButton = document.getElementById("addButton");
    const popup = document.getElementById("popup");
    const closePopup = document.getElementById("closePopup");
    const popupInput = document.getElementById("popupInput");
    const trainContainer = document.getElementById("trainContainer");

    addButton.addEventListener("click", () => {
        popup.style.display = "block";
    });

    closePopup.addEventListener("click", () => {
        popup.style.display = "none";
        popupInput.value = ""; // Clear the input when closing the popup
    });

    // Handle number buttons on the popup keypad
    const popupKeys = document.querySelectorAll(".popup-key");
    popupKeys.forEach((key) => {
        key.addEventListener("click", () => {
            if (key.id === "clearPopup") {
                popupInput.value = "";
            } else if (key.id === "confirmButton") {
                const number = Number(popupInput.value);
                if (number >= 1 && number <= 9999) {
                    createTrain(number);
                    popup.style.display = "none";
                    popupInput.value = "";
                } else {
                    alert("Please enter a number between 1 and 9999.");
                }
            } else {
                popupInput.value += key.textContent;
            }
        });
    });
    // Function to create a new train with a slider, flip switch, and on/off buttons
function createTrain(number) {
    const trainTemplate = document.getElementById("trainTemplate");
    const clone = document.importNode(trainTemplate.content, true);
    const trainContainer = document.getElementById("trainContainer");
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
            //const direction = $(flipSwitch).val() === "forward" ? 1 : 0;
            const direction = 1;
            const speed = parseInt(slider.value, 10);
            sliderValue.textContent = speed;
            console.log(JSON.stringify({ direction, speed }));
            // Update the server by making a POST request
            fetch(`http://127.0.0.1:8080/train/${number}/throttle`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ direction, speed }),
            })
                .then((response) => response.json())
                .then((data) => {
                    // Handle the response if needed
                    console.log("Server response:", data);
                })
                .catch((error) => {
                    console.error("Error updating server:", error);
                });
        }, 100); // Execute the fetch after 100ms of no slider input events
    });
/*
    // Set up the jQuery Mobile flip switch
    const flipSwitch = clone.querySelector("#direction-switch");

    // Handle flip switch change event
    $(flipSwitch).on("change", function() {
        console.log($(this).val());
        direction = $(this).val();
    });
*/
    // Set up the on/off buttons
    const onButtons = clone.querySelectorAll(".function-buttons button");
    onButtons.forEach((button) => {
        button.addEventListener("click", () => {
            button.classList.toggle("active");
        });
    });

    // Append the new train to the container
    trainContainer.appendChild(clone);
}



});