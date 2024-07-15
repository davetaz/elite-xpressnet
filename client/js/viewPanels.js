function setupviewPanels() {

    if ($.fn.DataTable.isDataTable('#panelTable')) {
        // Destroy the existing DataTable if it exists
        $('#panelTable').DataTable().destroy();
        $('#panelTable').empty();
    }

    // Make an HTTP GET request to fetch the schema from "schema/trains.json"
    $.get('schemas/panels.json', function (schema) {
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
            columns.push({title: 'mEdit', data: "mEdit"});
            columns.push({title: 'pEdit', data: "pEdit"});
            columns.push({title: 'Delete', data: "Delete"});
        }
        // Initialize the DataTable with columns
        var table = $('#panelTable').DataTable({
            columns: columns,
            dom: 'frtiBp', // Add export buttons
            buttons: [
                'copy', 'csv'
            ],
            language: {
                searchPlaceholder: "Search"
            },
        });
        // Make an HTTP GET request to fetch data from //${server}/trains/
        $.get(`//${server}/panels/`, function (data) {
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
                            rowData[key] = `<img src="//${server}/panel/${data[i]._id}/${data[i][key]}" class="tablePicture"/>`
                        } else {
                            rowData[key] = data[i][key] || "";
                        }
                    }
                    // Add an "Edit" link column
                    rowData['mEdit'] = `<a href="javascript:void(0);" onclick="editPanel('${data[i]._id}');">Edit panel name/location</a>`;
                    rowData['pEdit'] = `<a href="javascript:void(0);" onclick="editPanelLayout('${data[i]._id}');">Edit panel layout</a>`;
                    rowData['Delete'] = `<a href="javascript:void(0);" onclick="confirmDeletePanel('${data[i]._id}','${data[i].Name}');">Delete</a>`;
                    // Add edit here
                    // Add delete here
                    table.row.add(rowData).draw(false);
                }
            }
        });
    });
}

// Function to confirm train deletion
function confirmDeletePanel(itemID, itemName) {
    if (confirm('Are you sure you want to delete the panel: ' + itemName + '?')) {
        // Send a DELETE request to the server using fetch
        fetch(`//${server}/panel/${itemID}`, {
            method: 'DELETE',
        })
        .then(response => {
            if (response.ok) {
                // Train deleted successfully, refresh the table
                setupviewPanels();
            } else {
                alert('Failed to delete the panel.');
            }
        })
        .catch(error => {
            console.error('An error occurred:', error);
            alert('Failed to delete the panel.');
        });
    }
}

function editPanel(itemID) {
    // Make an HTTP GET request to fetch data for the specified TrainID
    fetch(`//${server}/panel/${itemID}`)
        .then(response => response.json())
        .then(data => {
            // Call setupaddTrain with the fetched data
            setupaddPanel(data);
            showScreen('addPanel');
        })
        .catch(error => {
            console.error("An error occurred:", error);
        });
}

function editPanelLayout(itemID) {
    const url = `panelBuilder.html?panelId=${itemID}`;
    window.open(url, '_blank');
}