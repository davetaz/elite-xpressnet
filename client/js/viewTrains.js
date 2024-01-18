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
                columns.push({ title: columnTitle, data: key });
            }
        }

        // Initialize the DataTable with columns
        var table = $('#trainTable').DataTable({
            columns: columns,
            dom: 'Bfrtip', // Add export buttons
            buttons: [
                'copy', 'csv'
            ]
        });

        // Make an HTTP GET request to fetch data from http://${server}/trains/
        $.get(`http://${server}/trains/`, function (data) {
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
                        } else {
                            rowData[key] = data[i][key] || "";
                        }
                    }
                    table.row.add(rowData).draw(false);
                }
            }
        });
    });
}