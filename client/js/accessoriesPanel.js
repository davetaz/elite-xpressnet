// Function to fetch panel data and generate controller HTML
function setupaccessoriesPanel() {
    document.getElementById('accessories_panel').innerHTML = "";
    $.get(`//${server}/panels/`, function (data) {
        if (data) {
            data.forEach(panel => {
                panel.elements.forEach(element => {
                    if (element.type === "point" && element.config) {
                        createPointController(element);
                    } else if (element.type === "signal" && element.config) {
                        createSignalController(element);
                    }
                });
            });
        }
    });
}

// Function to create point controller HTML
function createPointController(element) {
    const { id, x, y, width, height, config } = element;
    const switchedLabel = config.Switched || "Switched";
    const normalLabel = config.Normal || "Normal";

    const controllerHTML = `
        <div id="${id}" class="controller point-controller">
            <p class="controller-dcc-number">#${config.DCCNumber}</p>
            <button onclick="configureElement('${id}')" class="configure-button">
                <i class="fas fa-cog">c</i>
            </button>
            <p class="controller-name">${config.Name}</p>
            <button onclick="setPointState('${id}', 'normal')" class="state-button">${normalLabel}</button>
            <button onclick="setPointState('${id}', 'switched')" class="state-button">${switchedLabel}</button>
        </div>
    `;

    document.getElementById('accessories_panel').insertAdjacentHTML('beforeend', controllerHTML);
}

// Function to create signal controller HTML
function createSignalController(element) {
    const { id, x, y, width, height, config } = element;
    const elementName = config.Name || "Signal";

    // Get unique DCC numbers
    const dccNumbers = [...new Set(config.Aspects.map(aspect => aspect.DCCNumber))].join(', ');

    let controllerHTML = `
        <div id="${id}" class="controller signal-controller">
            <p class="controller-dcc-number">#${dccNumbers}</p>
            <button onclick="configureElement('${id}')" class="configure-button">
                <i class="fas fa-cog">c</i>
            </button>
            <p class="controller-name">${elementName}</p>
    `;

    controllerHTML += _generateSignalButtons(config, id) + "</div>";

    document.getElementById('accessories_panel').insertAdjacentHTML('beforeend', controllerHTML);
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