function setupaddTrain(data) {
    $('#addTrainForm').html("");
    $('#res').html("");
    $('form').show();

      // Fetch the schema from "schemas/trains.json"
    fetch('schemas/trains.json')
      .then(response => response.json())
      .then(schema => {
          // Use the fetched schema to set up the form
          $('#addTrainForm').jsonForm({
              schema: schema,
              onSubmit: function (errors, values) {
                  if (errors) {
                      $('#res').html('<p>Please correct the errors in your form</p>');
                  } else {
                      var inputObject = values;
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

  if (inputObject.TrainID && inputObject.TrainID != "") {
    // If TrainID is set, use PUT to update existing data
    url = `http://${server}/train/${inputObject.TrainID}`;
    method = "PUT";
  } else {
    // If TrainID is not set, use POST to create new data
    url = `http://${server}/train/`;
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

      // Populate the hidden TrainID element in the form with the newTrainID
      const hiddenTrainIDElement = document.getElementsByName("TrainID")[0];
      if (hiddenTrainIDElement) {
        hiddenTrainIDElement.value = newTrainID;
      }
      $('#res').html('<p>Train created</p>');
      $('form').hide();
    } else {
      console.error("Request failed with status:", response.status);
    }
  } catch (error) {
    console.error("An error occurred:", error);
  }
}