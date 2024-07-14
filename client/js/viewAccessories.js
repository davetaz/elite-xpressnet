function setupviewAccessories() {
    let firstLoad = true;
    if ($.fn.DataTable.isDataTable('#accessoriesTable')) {
        // Destroy the existing DataTable if it exists
        $('#accessoriesTable').DataTable().destroy();
        $('#accessoriesTable').empty();
    }

    // Fetch panel data
    $.get(`//${server}/panels/`, function (data) {
        if (data) {
            const elements = [];
            data.forEach(panel => {
                panel.elements.forEach(element => {
                    if ((element.type === "point" || element.type === "signal") && element.config) {
                        element.panelName = panel.Name;
                        elements.push(element);
                    }
                });
            });

            // Initialize the DataTable
            $('#accessoriesTable').DataTable({
                data: elements,
                columns: [
                    { title: "Name", data: "config.Name", defaultContent: "", width: "20%" },
                    { title: "Type", data: "type", defaultContent: "", width: "10%" },
                    {
                        title: "DCC Number(s)",
                        data: "config.DCCNumber",
                        render: function (data, type, row) {
                            if (row.type === "signal") {
                                return [...new Set(row.config.Aspects.map(aspect => aspect.DCCNumber))].join(', ');
                            }
                            return data || "";
                        },
                        defaultContent: "",
                        width: "10%"
                    },
                    { title: "Panel Name", data: "panelName", defaultContent: "", width: "20%" },
                    {
                        title: "Control",
                        data: null,
                        render: function (data, type, row) {
                            if (row.type === "point") {
                                return `
                                    <button onclick="configureElement('${row.id}')" class="configure-button"><i class="fa fa-cog"></i></button>
                                    <button onclick="setPointState('${row.id}', 'normal')" class="state-button">${row.config.Normal || "Normal"}</button>
                                    <button onclick="setPointState('${row.id}', 'switched')" class="state-button">${row.config.Switched || "Switched"}</button>
                                `;
                            } else if (row.type === "signal") {
                                return `
                                    <button onclick="configureElement('${row.id}')" class="configure-button"><i class="fa fa-cog"></i></button>
                                    ${_generateSignalButtons(row.config, row.id)}
                                `;
                            }
                            return "";
                        },
                        defaultContent: "",
                        width: "40%"
                    }
                ],
                dom: 'Bfrtip',
                buttons: [
                    'copy', 'csv', {
                        'text': '<i class="fa viewSwitch fa-id-badge fa-fw" aria-hidden="true"></i>',
                        'action': function (e, dt, node) {
                            firstLoad = false;
                            const tableNode = $(dt.table().node());
                            const isCardsView = tableNode.hasClass('cards');

                            tableNode.toggleClass('cards');

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

                            dt.draw('page');
                        },
                        'className': 'btn-sm',
                        'attr': {
                            'title': 'Change views',
                        }
                    }
                ],
                drawCallback: function(settings) {
                    // Add 'cards' class by default on table initialization
                    if (!$(this.api().table().node()).hasClass('cards') && firstLoad) {
                        $(this.api().table().node()).addClass('cards');
                    }
                }
            });
        }
    });
}

// Function to generate signal buttons
function _generateSignalButtons(config, id) {
    const buttons = [];
    if (!config) {
        config = {
            "Aspects": [
                {"Colour": "Red"},
                {"Colour": "Amber"},
                {"Colour": "Amber (second)"},
                {"Colour": "Green"}
            ]
        }
    }
    // Define the order of colors
    const colorOrder = ['Red', 'Amber', 'Amber (second)', 'Green'];
    const aspects = config.Aspects;
    //NEED TO BE IN ORDER
    colorOrder.forEach(color => {
        aspects.forEach(aspect => {
            if (aspect.Colour === color) {
                if (color === 'Red') {
                    buttons.push(`<button class="signal-button" onclick="changeSignal('${id}','red')">
                                    <svg width="20" height="26">
                                        <!-- Red signal icon -->
                                        <circle cx="10" cy="20" r="6" fill="red" />
                                    </svg>
                                </button>`);
                } else if (color === 'Amber') {
                    buttons.push(`<button class="signal-button" onclick="changeSignal('${id}','yellow')">
                                  <svg width="20" height="26">
                                      <!-- Yellow signal icon -->
                                      <circle cx="10" cy="20" r="6" fill="yellow" />
                                  </svg>
                                </button>`);
                } else if (aspect.Colour === 'Amber (second)') {
                    buttons.push(`<button class="signal-button" onclick="changeSignal('${id}','dyellow')">
                                  <svg width="20" height="26">
                                      <!-- Double yellow signal icon -->
                                      <circle cx="10" cy="6" r="6" fill="yellow" />
                                      <circle cx="10" cy="20" r="6" fill="yellow" />
                                  </svg>
                                </button>`);
                } else if (aspect.Colour === 'Green') {
                    buttons.push(`<button class="signal-button" onclick="changeSignal('${id}','green')">
                                  <svg width="20" height="26">
                                    <!-- Green signal icon -->
                                    <circle cx="10" cy="20" r="6" fill="green" />
                                </svg>
                              </button>`);
                }
            }
        });
    });
    return buttons.join('');
}

// Mock functions for testing
function configureElement(id) {
    console.log(`Configure element: ${id}`);
}

function setPointState(id, state) {
    console.log(`Set point state for element ${id} to ${state}`);
}

function changeSignal(id, color) {
    console.log(`Change signal for element ${id} to ${color}`);
}