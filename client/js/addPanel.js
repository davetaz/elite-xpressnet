function setupaddPanel(data) {
    if (data) {
      $('#addPanelTitle').html("Edit Train");
    }
    $('#addPanelForm').html("");
    $('#panelRes').html("");
    $('form').show();

      // Fetch the schema from "schemas/trains.json"
    fetch('schemas/panels.json')
      .then(response => response.json())
      .then(schema => {
          $('#addPanelForm').jsonForm({
              schema: schema,
              value: data,
              onSubmit: function (errors, values) {
                  if (errors) {
                      $('#panelRes').html('<p>Please correct the errors in your form</p>');
                  } else {
                      var inputObject = values;
                      sendPanelDataToServer(inputObject);
                  }
              }
          });
      })
      .catch(error => {
          console.error("Error fetching schema:", error);
      });
}

async function sendPanelDataToServer(inputObject) {
  let url;
  let method;

  if (inputObject._id && inputObject._id != "") {
    // If _id is set, use PUT to update existing data
    url = `//${server}/panel/${inputObject._id}`;
    method = "PUT";
  } else {
    // If _id is not set, use POST to create new data
    url = `//${server}/panel/`;
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
      const newPanelID = responseData._id; // Replace with the actual field name from the response

      // Populate the hidden _id element in the form with the newTrainID
      const hiddenIDElement = document.getElementsByName("_id")[0];
      if (hiddenIDElement) {
        hiddenIDElement.value = newPanelID;
      }
      $('#panelRes').html('<p>'+responseData.message+'</p>');
      $('form').hide();
    } else {
      console.error("Request failed with status:", response.status);
    }
  } catch (error) {
    console.error("An error occurred:", error);
  }
}