from flask import Flask, request, jsonify
from flask_cors import CORS

import time
import threading

app = Flask(__name__)
CORS(app)  # Enable CORS for the entire application

# Dictionary to store the state of trains
train_state = {}

class RealHornbyController:
    def __init__(self, device_path, baud_rate):
        try:
            import hornby  # Import hornby module only when using the real controller
            # Open a serial connection with the Hornby Elite DCC controller
            hornby.connection_open(device_path, baud_rate)
        except ImportError:
            raise ImportError("Hornby library not installed. Please install it to use the real controller.")

    def throttle(self, train_number, speed, direction):
        import hornby  # Import hornby module only when using the real controller
        # Control the train throttle
        t = hornby.Train(train_number)
        t.throttle(speed, direction)

    def function(self, train_number, function_id, switch):
        import hornby  # Import hornby module only when using the real controller
        # Control the train function
        t = hornby.Train(train_number)
        t.function(function_id, switch)

    def accessory(self, accessory_number, direction):
        import hornby  # Import hornby module only when using the real controller
        # Control the accessory based on the state parameter
        a = hornby.Accessory(accessory_number)
        if direction == "FORWARD":
            a.activateOutput2()
        elif direction == "REVERSE":
            a.activateOutput1()
        else:
            print("Invalid state specified.")

class MockHornbyController:
    def __init__(self):
        pass

    def throttle(self, train_number, speed, direction):
        # Simulate throttle control (update mock state)
        pass

    def function(self, train_number, function_id, switch):
        # Simulate function control (update mock state)
        pass

    def accessory(self, accessory_number,direction):
        # Simulate accessory control (update mock state)
        pass

# Check if the real controller is available
def is_real_controller_available():
    try:
        import hornby
        # Attempt to open connection to the real controller
        hornby.connection_open('/dev/ttyACM0', 9600)
        return True
    except ImportError:
        return False
    except Exception as e:
        print("Error while checking real controller availability:", e)
        return False

# Create the appropriate controller based on availability
if is_real_controller_available():
    print(" * Connected to xPressNet controller")
    controller = RealHornbyController('/dev/ttyACM0', 9600)
else:
    print(" * Using mock controller")
    controller = MockHornbyController()

# Periodically check if the real controller becomes available or unavailable
def controller_availability_check():
    global controller
    while True:
        if is_real_controller_available():
            if not isinstance(controller, RealHornbyController):
                print("Real controller detected. Switching to real controller.")
                controller = RealHornbyController('/dev/ttyACM0', 9600)
        else:
            if not isinstance(controller, MockHornbyController):
                print("Real controller not available. Switching to mock controller.")
                controller = MockHornbyController()
        time.sleep(10)  # Check every 30 seconds

# Start controller availability check in a separate thread
availability_check_thread = threading.Thread(target=controller_availability_check)
availability_check_thread.daemon = True
availability_check_thread.start()

# Helper function to wait for a given number of seconds
def wait(secs):
    time.sleep(secs)

# Add a route to GET controller state
@app.route('/controller', methods=['GET'])
def get_controller_state():
    if is_real_controller_available():
        return jsonify({"status": "online"})
    else:
        return jsonify({"status": "offline"})

# API endpoint to control the throttle of a train
@app.route('/train/<int:train_number>/throttle', methods=['PUT', 'GET'])
def control_train_throttle(train_number):
    if request.method == 'PUT':
        speed = request.json.get('speed', 0)
        direction = request.json.get('direction', 0)  # Replace with your desired default direction

        # Create or update train state
        train_state[train_number] = {'speed': speed, 'direction': direction}

        # Control the train throttle
        controller.throttle(train_number, speed, direction)

        return jsonify({'message': f'Train {train_number} throttle set to speed {speed} and direction {direction}'}), 200

    elif request.method == 'GET':
        if train_number in train_state:
            return jsonify(train_state[train_number]), 200
        else:
            return jsonify({'message': f'Train {train_number} state not found'}), 404

# API endpoint to control the function of a train
@app.route('/train/<int:train_number>/function/<int:function_id>', methods=['PUT'])
def control_train_function(train_number, function_id):
    switch = request.json.get('switch', 0)  # Replace with your desired default switch value

    # Control the train function
    controller.function(train_number, function_id, switch)

    return jsonify({'message': f'Train {train_number} function {function_id} set to {switch}'}), 200

# API endpoint to control the state of an accessory
@app.route('/accessory/<int:accessory_number>', methods=['PUT'])
def control_accessory_state(accessory_number):
    state = request.json.get('state', 0)
    if state == 1:
        # Activate the accessory
        controller.accessory(accessory_number,state)
        return jsonify({'message': f'Accessory {accessory_number} activated'}), 200
    elif state == 0:
        # Deactivate the accessory
        controller.accessory(accessory_number,state)
        return jsonify({'message': f'Accessory {accessory_number} deactivated'}), 200
    else:
        return jsonify({'message': 'Invalid state specified. Please use "activate" or "deactivate"'}), 400

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)