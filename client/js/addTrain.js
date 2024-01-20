function setupaddTrain(data) {
    if (data) {
      $('#addTrainTitle').html("Edit Train");
    }
    $('#addTrainForm').html("");
    $('#res').html("");
    $('form').show();

      // Fetch the schema from "schemas/trains.json"
    fetch('schemas/trains.json')
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
                        const imageUrl = `//${server}/train/${data._id}/${filename}`;

                        // Create an <img> element
                        const imgElement = document.createElement('img');

                        // Set the src attribute to the image URL
                        imgElement.setAttribute('src', imageUrl);
                        imgElement.setAttribute('class', 'trainImg');

                        // Append the <img> element before the #addTrainForm
                        const addTrainForm = document.getElementById('addTrainForm');
                        if (addTrainForm) {
                            addTrainForm.parentNode.insertBefore(imgElement, addTrainForm);
                        }
                    }
                }
            }
          }
          $('#addTrainForm').jsonForm({
              schema: schema,
              value: data,
              onSubmit: function (errors, values) {
                  if (errors) {
                      $('#res').html('<p>Please correct the errors in your form</p>');
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

                      if (inputObject.DCCConfig && Array.isArray(inputObject.DCCConfig)) {
                          inputObject.DCCConfig = inputObject.DCCConfig.filter(item => item.SocketLocation);
                      }

                      // Remove items from DCCFunctions without FunctionNumber
                      if (inputObject.DCCFunctions && Array.isArray(inputObject.DCCFunctions)) {
                          inputObject.DCCFunctions = inputObject.DCCFunctions.filter(item => item.FunctionNumber);
                      }
                      sendDataToServer(inputObject);
                  }
              }
          });
      })
      .catch(error => {
          console.error("Error fetching schema:", error);
      });
}

async function sendDataToServer(inputObject) {
  let url;
  let method;

  if (inputObject._id && inputObject._id != "") {
    // If _id is set, use PUT to update existing data
    url = `//${server}/train/${inputObject._id}`;
    method = "PUT";
  } else {
    // If _id is not set, use POST to create new data
    url = `//${server}/train/`;
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
      const newTrainID = responseData._id; // Replace with the actual field name from the response

      // Create a FormData object to store the picture file
      const formData = new FormData();
      const pictureInput = document.querySelector('input[type="file"]');
      formData.append('picture', pictureInput.files[0]);

      // Send a POST request to upload the picture to the server's directory
      const pictureResponse = await fetch(`//${server}/train/${newTrainID}`, {
        method: 'POST',
        body: formData,
      });

      if (pictureResponse.ok) {
        // Request to upload picture was successful
        // You can handle the success accordingly
        console.log('Picture uploaded successfully');
      } else {
        console.error("Failed to upload picture:", pictureResponse.status);
      }

      // Populate the hidden _id element in the form with the newTrainID
      const hiddenTrainIDElement = document.getElementsByName("_id")[0];
      if (hiddenTrainIDElement) {
        hiddenTrainIDElement.value = newTrainID;
      }
      $('#res').html('<p>'+responseData.message+'</p>');
      $('form').hide();
    } else {
      console.error("Request failed with status:", response.status);
    }
  } catch (error) {
    console.error("An error occurred:", error);
  }
}