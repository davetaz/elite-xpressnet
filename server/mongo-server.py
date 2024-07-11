import os
from flask import Flask, request, jsonify, send_from_directory
from pymongo import MongoClient
import json
from bson import json_util, ObjectId
from flask_cors import CORS
import configparser  # Import the configparser module

import time
import threading

app = Flask(__name__)
CORS(app, supports_credentials=True)  # Enable CORS for the entire application

# Load configuration from .config file
config = configparser.ConfigParser()
config.read('config.ini')  # Assuming your config file is named 'config.ini'
# Read the value of USE_MOCK_CONTROLLER from the config file
USE_MOCK_CONTROLLER = config.getboolean('general', 'USE_MOCK_CONTROLLER')

# Initialize MongoDB client
client = MongoClient('mongodb://localhost:27017/')
db = client['dcc_db']

trains_collection = db['trains']

# Configuration for file upload
UPLOAD_FOLDER = 'data'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Dictionary to store the state of trains
train_state = {}

# Dictionary to store the state of trains
accessory_state = {}

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

def parse_json(data):
    return json.loads(json_util.dumps(data))

# Add a route to GET controller state
@app.route('/controller', methods=['GET'])
def get_controller_state():
    if is_real_controller_available():
        return jsonify({"status": "online"})
    else:
        return jsonify({"status": "offline"})

# Add an OPTIONS route for the same URL path
@app.route('/train/', methods=['OPTIONS'])
def options_train():
    response = jsonify()
    response.headers['Access-Control-Allow-Methods'] = 'POST'
    return response

# Add an OPTIONS route for '/train/<train_id>'
@app.route('/train/<train_id>', methods=['OPTIONS'])
def options_train_id(train_id):
    response = jsonify()
    response.headers['Access-Control-Allow-Methods'] = 'POST, PUT, DELETE'
    return response

# API endpoint to create a new locomotive with metadata
@app.route('/train/', methods=['POST'])
def create_train():
    data = request.json
    # Remove the _id field from the data dictionary
    if '_id' in data:
        del data['_id']

    trains_collection = db['trains']

    try:
        # Attempt to insert the train data into the MongoDB collection
        inserted_train = trains_collection.insert_one(data)

        # Return the MongoDB object identifier to the client
        return jsonify({'message': f'Train created successfully', '_id': str(inserted_train.inserted_id)}), 201
    except Exception as e:
        return jsonify({'message': f'An error occurred while creating the train: {str(e)}'}), 500

# Add an OPTIONS route for the same URL path
@app.route('/panel/', methods=['OPTIONS'])
def options_panel():
    response = jsonify()
    response.headers['Access-Control-Allow-Methods'] = 'POST'
    return response

# Add an OPTIONS route for '/panel/<panel_id>'
@app.route('/panel/<panel_id>', methods=['OPTIONS'])
def options_panel_id(panel_id):
    response = jsonify()
    response.headers['Access-Control-Allow-Methods'] = 'POST, PUT, DELETE'
    return response


# API endpoint to create a new layout panel with metadata
@app.route('/panel/', methods=['POST'])
def create_panel():
    data = request.json
    # Remove the _id field from the data dictionary
    if '_id' in data:
        del data['_id']

    collection = db['panels']

    try:
        # Attempt to insert the train data into the MongoDB collection
        inserted_item = collection.insert_one(data)

        # Return the MongoDB object identifier to the client
        return jsonify({'message': f'Panel created successfully', '_id': str(inserted_item.inserted_id)}), 201
    except Exception as e:
        return jsonify({'message': f'An error occurred while creating the panel: {str(e)}'}), 500

# Route for retrieving all trains
@app.route('/trains/', methods=['GET'])
def get_all_trains():

    # Retrieve all trains from the MongoDB collection
    all_trains = list(trains_collection.find({}))

    # Create a list to store the results
    results = []

    # Convert ObjectId to str for JSON serialization
    for train in all_trains:
        train["_id"] = str(train["_id"])
        results.append(train)

    # Return the array containing all trains as JSON response
    return jsonify(results), 200

# Route for retrieving all panels
@app.route('/panels/', methods=['GET'])
def get_all_panels():
    collection = db['panels']
    # Retrieve all trains from the MongoDB collection
    all_items = list(collection.find({}))

    # Create a list to store the results
    results = []

    # Convert ObjectId to str for JSON serialization
    for item in all_items:
        item["_id"] = str(item["_id"])
        results.append(item)

    # Return the array containing all trains as JSON response
    return jsonify(results), 200

# Route to search for a train by DCCNumber
@app.route('/train', methods=['GET'])
def get_train_by_dcc_number():
    dcc_number = request.args.get('DCCNumber')
    print(dcc_number)

    if not dcc_number:
        return jsonify({'message': 'DCCNumber parameter is missing'}), 400

    try:
        dcc_number = int(dcc_number)
    except ValueError:
        return jsonify({'message': 'DCCNumber must be an integer'}), 400

    train = trains_collection.find_one({'DCCNumber': dcc_number})

    if not train:
        return jsonify({'message': f'Train with DCCNumber {dcc_number} not found'}), 404

    train["_id"] = str(train["_id"])
    return jsonify(train), 200

# API endpoint to get train data including metadata, functions, and state
@app.route('/train/<train_id>', methods=['GET', 'PUT', 'DELETE', 'POST'])
def update_train(train_id):

    if request.method == 'GET':
        trains_collection = db['trains']
        train = trains_collection.find_one({'_id': ObjectId(train_id)})

        if not train:
            return jsonify({'message': f'Train {train_id} not found'}), 404

         # Convert ObjectId to string before serializing to JSON
        train['_id'] = str(train['_id'])

        return jsonify(train), 200

    elif request.method == 'PUT':
        data = request.json
        # Remove the _id field from the data dictionary
        if '_id' in data:
            del data['_id']

        trains_collection = db['trains']
        train = trains_collection.find_one({'_id': ObjectId(train_id)})
        if not train:
            return jsonify({'message': f'Train {train_id} not found'}), 404

        # Update the entire train document with the new data

        trains_collection.replace_one({'_id': ObjectId(train_id)}, data)
        return jsonify({'message': f'Train {train_id} updated successfully', '_id': train_id}), 200

    elif request.method == 'DELETE':
        trains_collection = db['trains']
        result = trains_collection.delete_one({'_id': ObjectId(train_id)})

        # Delete the associated directory and picture file
        directory_path = os.path.join(app.config['UPLOAD_FOLDER'], train_id)
        if os.path.exists(directory_path):
            try:
                os.rmdir(directory_path)
            except OSError as e:
                print(f"Error deleting directory: {e}")

        if result.deleted_count == 0:
            return jsonify({'message': f'Train {train_id} not found'}), 404

        return jsonify({'message': f'Train {train_id} deleted successfully'}), 200

    elif request.method == 'POST':
        # Check if the POST request has a file part
        if 'picture' not in request.files:
            return jsonify({'message': 'No file part'}), 400

        file = request.files['picture']

        # If the user does not select a file, the browser submits an empty file
        if file.filename == '':
            return jsonify({'message': 'No selected file'}), 400

        # Check if the train directory exists, and create it if not
        directory_path = os.path.join(app.config['UPLOAD_FOLDER'], train_id)
        if not os.path.exists(directory_path):
            try:
                os.makedirs(directory_path)
            except OSError as e:
                print(f"Error creating directory: {e}")
                return jsonify({'message': 'Failed to create directory'}), 500

        # Save the uploaded file with its original filename
        file_path = os.path.join(directory_path, file.filename)
        file.save(file_path)

        return jsonify({'message': 'File uploaded successfully'}), 200

# API endpoint to get panel data including metadata, functions, and state
@app.route('/panel/<panel_id>', methods=['GET', 'PUT', 'DELETE', 'POST'])
def update_panel(panel_id):
    collection = db['panels']
    if request.method == 'GET':
        item = collection.find_one({'_id': ObjectId(panel_id)})

        if not item:
            return jsonify({'message': f'Panel {panel_id} not found'}), 404

         # Convert ObjectId to string before serializing to JSON
        item['_id'] = str(item['_id'])

        return jsonify(item), 200

    elif request.method == 'PUT':
        data = request.json
        # Remove the _id field from the data dictionary
        if '_id' in data:
            del data['_id']

        item = collection.find_one({'_id': ObjectId(panel_id)})
        if not item:
            return jsonify({'message': f'Panel {panel_id} not found'}), 404

        # Update the entire panel document with the new data

        collection.replace_one({'_id': ObjectId(panel_id)}, data)
        return jsonify({'message': f'Panel {panel_id} updated successfully', '_id': panel_id}), 200

    elif request.method == 'DELETE':
        result = collection.delete_one({'_id': ObjectId(panel_id)})

        # Delete the associated directory and picture file
        directory_path = os.path.join(app.config['UPLOAD_FOLDER'], panel_id)
        if os.path.exists(directory_path):
            try:
                os.rmdir(directory_path)
            except OSError as e:
                print(f"Error deleting directory: {e}")

        if result.deleted_count == 0:
            return jsonify({'message': f'Panel {panel_id} not found'}), 404

        return jsonify({'message': f'Panel {panel_id} deleted successfully'}), 200

    elif request.method == 'POST':
        # Check if the POST request has a file part
        if 'picture' not in request.files:
            return jsonify({'message': 'No file part'}), 400

        file = request.files['picture']

        # If the user does not select a file, the browser submits an empty file
        if file.filename == '':
            return jsonify({'message': 'No selected file'}), 400

        # Check if the panel directory exists, and create it if not
        directory_path = os.path.join(app.config['UPLOAD_FOLDER'], panel_id)
        if not os.path.exists(directory_path):
            try:
                os.makedirs(directory_path)
            except OSError as e:
                print(f"Error creating directory: {e}")
                return jsonify({'message': 'Failed to create directory'}), 500

        # Save the uploaded file with its original filename
        file_path = os.path.join(directory_path, file.filename)
        file.save(file_path)

        return jsonify({'message': 'File uploaded successfully'}), 200

@app.route('/train/<train_id>/<path:filename>', methods=['GET'])
def serve_picture(train_id, filename):
    print('jello')
    # Construct the path to the picture file
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], train_id, filename)

    # Check if the file exists
    if os.path.isfile(file_path):
        # Serve the file from the specified directory
        return send_from_directory(os.path.dirname(file_path), filename)
    else:
        return jsonify({'message': 'Picture not found'}), 404

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
@app.route('/accessory/<int:accessory_number>', methods=['PUT', 'GET'])
def control_accessory_state(accessory_number):
    if request.method == 'PUT':
        direction = request.json.get('direction', 0)

        # Check if the direction is valid
        if direction in ["FORWARD", "REVERSE"]:
            # Save the state of the accessory
            accessory_state[accessory_number] = {'direction': direction}

            # Perform action on the accessory
            controller.accessory(accessory_number, direction)
            return jsonify({'message': f'Accessory {accessory_number}: Set direction {direction}'}), 200
        else:
            # Return an error message for invalid direction
            return jsonify({'message': 'Invalid state specified. Please use "FORWARD" or "REVERSE"'}), 400

    elif request.method == 'GET':
        # Check if the accessory state exists
        if accessory_number in accessory_state:
            # Retrieve and return the accessory state
            return jsonify(accessory_state[accessory_number]), 200
        else:
            # Return a 404 Not Found error if the accessory state is not found
            return jsonify({'message': f'Accessory {accessory_number} state not found'}), 404

# API endpoint to get the state of all accessories
@app.route('/accessories', methods=['GET'])
def get_all_accessory_states():
    return jsonify(accessory_state), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)