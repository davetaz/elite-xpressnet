function setupaddTrain(data) {
    if (data) {
      $('#addTrainTitle').html("Edit Train");
    }
    $('#addTrainForm').html("");
    $('#trainRes').html("");
    $('.trainImg').remove();
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
                      $('#trainRes').html('<p>Please correct the errors in your form</p>');
                  } else {
                      var inputObject = values;

                      for (var key in schema) {
                        if (schema[key].type === 'file') {
                          var fileInput = document.getElementsByName(key)[0];
                          if (fileInput && fileInput.files.length > 0) {
                            inputObject[key] = fileInput.files[0].name;
                          } else {
                            const hiddenImageInput = document.getElementById('hiddenImageUrl');
                            if (hiddenImageInput && hiddenImageInput.value) {
                                inputObject[key] = getImageNameFromUrl(hiddenImageInput.value);
                            }
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
                      sendTrainDataToServer(inputObject);
                  }
              }
          });
          // Add a search button next to the file input
          const fileInput = document.querySelector('#addTrainForm input[type="file"]');
          if (fileInput) {
            const searchButton = document.createElement('button');
            searchButton.textContent = "Search for Images";
            searchButton.type = "button";
            searchButton.onclick = openImageSearchModal;
            fileInput.parentNode.appendChild(searchButton);
          }

          // Add a hidden input to store the selected image URL
          const hiddenImageInput = document.createElement('input');
          hiddenImageInput.type = 'hidden';
          hiddenImageInput.id = 'hiddenImageUrl';
          hiddenImageInput.name = 'hiddenImageUrl';
          document.querySelector('#addTrainForm').appendChild(hiddenImageInput);
      })
      .catch(error => {
          console.error("Error fetching schema:", error);
      });
      // Event listeners
      document.querySelector(".closeImageSelector").onclick = closeImageSearchModal;

      // When the user clicks anywhere outside of the modal, close it
      window.onclick = function(event) {
        const modal = document.getElementById("imageSearchModal");
        if (event.target == modal) {
          modal.style.display = "none";
        }
      }
}

async function sendTrainDataToServer(inputObject) {
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
          const hiddenImageInput = document.getElementById('hiddenImageUrl');

          if (pictureInput && pictureInput.files.length > 0) {
              formData.append('picture', pictureInput.files[0]);

              // Send a POST request to upload the picture to the server's directory
              const pictureResponse = await fetch(`//${server}/train/${newTrainID}`, {
                  method: 'POST',
                  body: formData,
              });

              if (pictureResponse.ok) {
                  // Request to upload picture was successful
                  console.log('Picture uploaded successfully');
              } else {
                  console.error("Failed to upload picture:", pictureResponse.status);
              }
          } else if (hiddenImageInput && hiddenImageInput.value) {
              // If the picture is a URL, send it in a separate request
              const pictureResponse = await fetch(`//${server}/train/${newTrainID}`, {
                  method: 'POST',
                  headers: {
                      "Content-Type": "application/json",
                  },
                  body: JSON.stringify({ imageUrl: hiddenImageInput.value }),
              });

              if (pictureResponse.ok) {
                  console.log('Picture URL uploaded successfully');
              } else {
                  console.error("Failed to upload picture URL:", pictureResponse.status);
              }
          }

          // Populate the hidden _id element in the form with the newTrainID
          const hiddenTrainIDElement = document.getElementsByName("_id")[0];
          if (hiddenTrainIDElement) {
              hiddenTrainIDElement.value = newTrainID;
          }
          $('#trainRes').html('<p>' + responseData.message + '</p>');
          $('form').hide();
      } else {
          console.error("Request failed with status:", response.status);
      }
  } catch (error) {
      console.error("An error occurred:", error);
  }
}

function getImageNameFromUrl(url) {
  const urlObj = new URL("https:"+url);
  const pathname = urlObj.pathname;
  const filename = pathname.substring(pathname.lastIndexOf('/') + 1);
  return filename;
}

function openImageSearchModal() {
  const modal = document.getElementById("imageSearchModal");
  modal.style.display = "block";
  searchForImages();
}

function closeImageSearchModal() {
  const modal = document.getElementById("imageSearchModal");
  modal.style.display = "none";
  const loadingAnimation = document.getElementById("loadingAnimation");
  loadingAnimation.innerHTML = "Loading...";
  loadingAnimation.style.display = "block";
}

async function searchForImages() {
  const make = document.getElementsByName("Make")[0]?.value;
  const model = document.getElementsByName("Model")[0]?.value;
  const shortName = document.getElementsByName("ShortName")[0]?.value;

  const loadingAnimation = document.getElementById("loadingAnimation");

  if (!model && !shortName) {
    loadingAnimation.innerHTML = "Error: Please provide at least one of Model or ShortName.";
    loadingAnimation.style.display = "block";
    return;
  }

  const query = encodeURIComponent(`${make} ${model} ${shortName}`);
  loadingAnimation.style.display = "block";

  try {
    const response = await fetch(`//localhost:3000/search?q=${query}`);
    const results = await response.json();
    console.log(results);

    displaySearchResults(results);
  } catch (error) {
    loadingAnimation.innerHTML = "Error fetching images:" + error;
  } finally {
    loadingAnimation.style.display = "none";
  }
}

function displaySearchResults(results) {
  const resultsContainer = document.getElementById("imageSearchResults");
  resultsContainer.innerHTML = "";
  results.forEach(result => {
    const imgElement = document.createElement("img");
    imgElement.src = result.image;
    imgElement.alt = result.name;
    imgElement.onclick = () => selectImage(result.image);
    resultsContainer.appendChild(imgElement);
  });
}

function selectImage(src) {
  const hiddenImageInput = document.getElementById('hiddenImageUrl');
  hiddenImageInput.value = src;

  // Remove any existing image
  const existingImg = document.querySelector('.trainImg');
  if (existingImg) {
    existingImg.remove();
  }

  // Create an <img> element
  const imgElement = document.createElement('img');

  // Set the src attribute to the image URL
  imgElement.setAttribute('src', src);
  imgElement.setAttribute('class', 'trainImg');

  // Append the <img> element before the #addTrainForm
  const addTrainForm = document.getElementById('addTrainForm');
  if (addTrainForm) {
      addTrainForm.parentNode.insertBefore(imgElement, addTrainForm);
  }

  closeImageSearchModal();
}