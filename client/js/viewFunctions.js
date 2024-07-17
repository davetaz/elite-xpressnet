function setupviewFunctions() {
    let firstLoad = true;

    if ($.fn.DataTable.isDataTable('#functionTable')) {
        // Destroy the existing DataTable if it exists
        $('#functionTable').DataTable().destroy();
        $('#functionTable').empty();
    }

    // Make an HTTP GET request to fetch the schema from "schema/functions.json"
    $.get('schemas/functions.json', function (schema) {
        // Create an array to store table column definitions
        var columns = [];
        if (schema) {
            for (var key in schema) {
                var columnTitle = schema[key].title || key; // Use title from schema or key if title is not available
                if (schema[key].type == 'hidden') {
                    // Ignore these
                } else {
                    columns.push({ title: columnTitle, data: key });
                }
            }
            columns.push({title: 'Edit', data: "Edit"});
            columns.push({title: 'Delete', data: "Delete"});
        }
        // Initialize the DataTable with columns
        var table = $('#functionTable').DataTable({
            columns: columns,
            dom: 'frtBip', // Add export buttons
            buttons: [
                'copy', 'csv', {
                    'text': '<i class="fa viewSwitch fa-table fa-fw" aria-hidden="true"></i>',
                    'action': function (e, dt, node) {
                        firstLoad = false;

                        const tableNode = $(dt.table().node());
                        const isCardsView = tableNode.hasClass('cards');

                        if (isCardsView) {
                            tableNode.removeClass('cards');
                            $('.viewSwitch', node).removeClass('fa-table').addClass('fa-id-badge');
                            // Switch to table view
                            dt.draw('page');
                        } else {
                            tableNode.addClass('cards');
                            $('.viewSwitch', node).removeClass('fa-id-badge').addClass('fa-table');
                            dt.draw('page');
                        }
                    },
                    'className': 'btn-sm',
                    'attr': {
                        'title': 'Change views',
                    }
                }
            ],
            language: {
                searchPlaceholder: "Search"
            },
            createdRow: function (row, data, dataIndex) {
                // Add data-column attributes to each cell
                $('td', row).each(function (colIndex) {
                    var columnName = columns[colIndex].data;
                    if (data[columnName] != "") {
                        $(this).attr('data-column', columnName);
                    }
                });
            },
            drawCallback: function(settings) {
                // Add 'cards' class by default on table initialization
                if (!$(this.api().table().node()).hasClass('cards') && firstLoad) {
                    $(this.api().table().node()).addClass('cards');
                }
            }
        });

        // Make an HTTP GET request to fetch data from //${server}/functions/
        $.get(`//${server}/functions/`, function (data) {
            // Assuming 'data' is an array of function objects
            if (data) {
                // Iterate over the function data and add rows to the DataTable
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
                            rowData[key] = `<img src="//${server}/function/${data[i]._id}/${data[i][key]}" class="tablePicture"/>`
                        } else {
                            rowData[key] = data[i][key] || "";
                        }
                    }
                    // Add an "Edit" link column
                    rowData['Edit'] = `<a href="javascript:void(0);" onclick="editFunction('${data[i]._id}');">Edit</a>`;
                    rowData['Delete'] = `<a href="javascript:void(0);" onclick="confirmDeleteFunction('${data[i]._id}','${data[i].Name}');">Delete</a>`;
                    // Add edit here
                    // Add delete here
                    table.row.add(rowData).draw(false);
                }
            }
        });
    });
}

// Function to confirm function deletion
function confirmDeleteFunction(functionId, functionName) {
    if (confirm('Are you sure you want to delete the function: ' + functionName + '?')) {
        // Send a DELETE request to the server using fetch
        fetch(`//${server}/function/${functionId}`, {
            method: 'DELETE',
        })
        .then(response => {
            if (response.ok) {
                // Function deleted successfully, refresh the table
                setupviewFunctions();
            } else {
                alert('Failed to delete the function.');
            }
        })
        .catch(error => {
            console.error('An error occurred:', error);
            alert('Failed to delete the function.');
        });
    }
}

function editFunction(functionID) {
    // Make an HTTP GET request to fetch data for the specified FunctionID
    fetch(`//${server}/function/${functionID}`)
        .then(response => response.json())
        .then(functionData => {
            // Call setupaddFunction with the fetched data
            setupaddFunction(functionData);
            showScreen('addFunction');
        })
        .catch(error => {
            console.error("An error occurred:", error);
        });
}
