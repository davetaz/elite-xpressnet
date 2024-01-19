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
          $('#addTrainForm').jsonForm({
              schema: schema,
              value: data,
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

  if (inputObject._id && inputObject._id != "") {
    // If _id is set, use PUT to update existing data
    url = `http://${server}/train/${inputObject._id}`;
    method = "PUT";
  } else {
    // If _id is not set, use POST to create new data
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