function setupviewTrains() {

    if ($.fn.DataTable.isDataTable('#trainTable')) {
        // Destroy the existing DataTable if it exists
        $('#trainTable').DataTable().destroy();
        $('#trainTable').empty();
    }

    // Make an HTTP GET request to fetch the schema from "schema/trains.json"
    $.get('schemas/trains.json', function (schema) {
        // Create an array to store table column definitions
        var columns = [];
        if (schema) {
            for (var key in schema) {
                var columnTitle = schema[key].title || key; // Use title from schema or key if title is not available
                if (schema[key].type == 'hidden') {
                    //ignore these
                } else {
                    columns.push({ title: columnTitle, data: key });
                }
            }
            columns.push({title: 'Edit', data: "Edit"});
            columns.push({title: 'Delete', data: "Delete"});
        }
        // Initialize the DataTable with columns
        var table = $('#trainTable').DataTable({
            columns: columns,
            dom: 'Bfrtip', // Add export buttons
            buttons: [
                'copy', 'csv'
            ]
        });

        // Make an HTTP GET request to fetch data from //${server}/trains/
        $.get(`//${server}/trains/`, function (data) {
            // Assuming 'data' is an array of train objects
            if (data) {
                // Iterate over the train data and add rows to the DataTable
                for (var i = 0; i < data.length; i++) {
                    var rowData = {};
                    for (var key in schema) {
                        if (schema[key].type === 'array') {
                            if (data[i][key]) {
                                rowData[key] = data[i][key].length;
                            } else {
                                rowData[key] = 0;
                            }
                        } else if (schema[key].type === 'file') {
                            rowData[key] = `<img src="//${server}/train/${data[i]._id}/${data[i][key]}" class="tablePicture"/>`
                        } else {
                            rowData[key] = data[i][key] || "";
                        }
                    }
                    // Add an "Edit" link column
                    rowData['Edit'] = `<a href="javascript:void(0);" onclick="editTrain('${data[i]._id}');">Edit</a>`;
                    rowData['Delete'] = `<a href="javascript:void(0);" onclick="confirmDelete('${data[i]._id}','${data[i].ShortName}');">Delete</a>`;
                    // Add edit here
                    // Add delete here
                    table.row.add(rowData).draw(false);
                }
            }
        });
    });
}

// Function to confirm train deletion
function confirmDelete(trainId, trainShortName) {
    if (confirm('Are you sure you want to delete the train: ' + trainShortName + '?')) {
        // Send a DELETE request to the server using fetch
        fetch(`//${server}/train/${trainId}`, {
            method: 'DELETE',
        })
        .then(response => {
            if (response.ok) {
                // Train deleted successfully, refresh the table
                setupviewTrains();
            } else {
                alert('Failed to delete the train.');
            }
        })
        .catch(error => {
            console.error('An error occurred:', error);
            alert('Failed to delete the train.');
        });
    }
}

function editTrain(trainID) {
    // Make an HTTP GET request to fetch data for the specified TrainID
    fetch(`//${server}/train/${trainID}`)
        .then(response => response.json())
        .then(trainData => {
            // Call setupaddTrain with the fetched data
            setupaddTrain(trainData);
            showScreen('addTrain');
        })
        .catch(error => {
            console.error("An error occurred:", error);
        });
}
