function setupaddFunction(data) {
    if (data) {
        $('#addFunctionTitle').html("Edit Function");
    }
    $('#addFunctionForm').html("");
    $('#functionRes').html("");
    $('form').show();

    // Fetch the schema from "schemas/functions.json"
    fetch('schemas/functions.json')
        .then(response => response.json())
        .then(schema => {
            // Use the fetched schema to set up the form
            if (data) {
                for (var key in schema) {
                    if (schema[key].type === 'file') {
                        const filename = data[key];

                        // Check if a filename exists
                        if (filename) {
                            // Construct the URL to fetch the image
                            const imageUrl = `//${server}/function/${data._id}/${filename}`;

                            // Create an <img> element
                            const imgElement = document.createElement('img');

                            // Set the src attribute to the image URL
                            imgElement.setAttribute('src', imageUrl);
                            imgElement.setAttribute('class', 'functionImg');

                            // Append the <img> element before the #addFunctionForm
                            const addFunctionForm = document.getElementById('addFunctionForm');
                            if (addFunctionForm) {
                                addFunctionForm.parentNode.insertBefore(imgElement, addFunctionForm);
                            }
                        }
                    }
                }
            }
            $('#addFunctionForm').jsonForm({
                schema: schema,
                value: data,
                onSubmit: function (errors, values) {
                    if (errors) {
                        $('#functionRes').html('<p>Please correct the errors in your form</p>');
                        console.log(errors);
                    } else {
                        var inputObject = values;

                        for (var key in schema) {
                            if (schema[key].type === 'file') {
                                // Get the file input element by name
                                var fileInput = document.getElementsByName(key)[0];
                                // Check if a file is selected
                                if (fileInput && fileInput.files.length > 0) {
                                    inputObject[key] = fileInput.files[0].name;
                                }
                            }
                        }

                        sendFunctionDataToServer(inputObject);
                    }
                }
            });
        })
        .catch(error => {
            console.error("Error fetching schema:", error);
        });
}

async function sendFunctionDataToServer(inputObject) {
    let url;
    let method;

    if (inputObject._id && inputObject._id != "") {
        // If _id is set, use PUT to update existing data
        url = `//${server}/function/${inputObject._id}`;
        method = "PUT";
    } else {

        // If _id is not set, use POST to create new data
        delete inputObject._id;
        url = `//${server}/function/`;
        method = "POST";
    }

    try {
        const response = await fetch(url, {
            method,
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(inputObject),
        });

        if (response.ok) {
            // Request was successful, parse the response to get the ID
            const responseData = await response.json();
            const newFunctionID = responseData._id; // Replace with the actual field name from the response

            // Create a FormData object to store the icon file
            const formData = new FormData();
            const iconInput = document.querySelector('input[type="file"]');

            if (iconInput.files[0]) {
                formData.append('icon', iconInput.files[0]);

                // Send a POST request to upload the icon to the server's directory
                const iconResponse = await fetch(`//${server}/function/${newFunctionID}`, {
                    method: 'POST',
                    body: formData,
                });

                if (iconResponse.ok) {
                    // Request to upload icon was successful
                    // You can handle the success accordingly
                    //console.log('Icon uploaded successfully');
                } else {
                    console.error("Failed to upload icon:", iconResponse.status);
                }
            }

            // Populate the hidden _id element in the form with the newFunctionID
            const hiddenFunctionIDElement = document.getElementsByName("_id")[0];
            if (hiddenFunctionIDElement) {
                hiddenFunctionIDElement.value = newFunctionID;
            }
            $('#functionRes').html('<p>' + responseData.message + '</p>');
            setTimeout(function() {
                setupaddFunction(/* parameters if any */);
            }, 2000);
        } else {
            console.error("Request failed with status:", response.status);
        }
    } catch (error) {
        console.error("An error occurred:", error);
    }
}