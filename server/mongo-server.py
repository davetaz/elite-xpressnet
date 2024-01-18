from flask import Flask, request, jsonify
from pymongo import MongoClient
import json
from bson import json_util
from flask_cors import CORS

import time

app = Flask(__name__)
CORS(app, supports_credentials=True)  # Enable CORS for the entire application

# Initialize MongoDB client
client = MongoClient('mongodb://localhost:27017/')
db = client['dcc_db']

# Configuration: Set this flag to True to use the mock controller for development.
USE_MOCK_CONTROLLER = True
trains_collection = db['trains']

# Dictionary to store the state of trains
train_state = {}

class RealHornbyController:
    def __init__(self, device_path, baud_rate):
        import hornby  # Import hornby module only when using the real controller
        # Open a serial connection with the Hornby Elite DCC controller
        hornby.connection_open(device_path, baud_rate)

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

class MockHornbyController:
    def __init__(self):
        pass

    def throttle(self, train_number, speed, direction):
        # Simulate throttle control (update mock state)
        pass

    def function(self, train_number, function_id, switch):
        # Simulate function control (update mock state)
        pass

# Create the appropriate controller based on configuration
if USE_MOCK_CONTROLLER:
    controller = MockHornbyController()
else:
    controller = RealHornbyController('/dev/ttyACM0', 9600)

# Helper function to wait for a given number of seconds
def wait(secs):
    time.sleep(secs)

def parse_json(data):
    return json.loads(json_util.dumps(data))

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
    response.headers['Access-Control-Allow-Methods'] = 'POST, PUT'
    return response

# API endpoint to create a new locomotive with metadata
@app.route('/train/', methods=['POST'])
def create_train():
    data = request.json
    trains_collection = db['trains']

    try:
        # Attempt to insert the train data into the MongoDB collection
        inserted_train = trains_collection.insert_one(data)
        # Return the MongoDB object identifier to the client
        return jsonify({'message': f'Train created successfully', '_id': str(inserted_train.inserted_id)}), 201
    except Exception as e:
        return jsonify({'message': f'An error occurred while creating the train: {str(e)}'}), 500

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

# Route to search for a train by DCCNumber
@app.route('/train', methods=['GET'])
def get_train_by_dcc_number():
    dcc_number = request.args.get('DCCNumber')

    if not dcc_number:
        return jsonify({'message': 'DCCNumber parameter is missing'}), 400

    train = trains_collection.find_one({'DCCNumber': dcc_number})

    if not train:
        return jsonify({'message': f'Train with DCCNumber {dcc_number} not found'}), 404

    return jsonify(train), 200

# API endpoint to get train data including metadata, functions, and state
@app.route('/train/<train_id>', methods=['GET', 'PUT'])
def update_train(train_id):
    if request.method == 'GET':
        trains_collection = db['trains']
        train = trains_collection.find_one({'_id': ObjectId(train_id)})

        if not train:
            return jsonify({'message': f'Train {train_id} not found'}), 404

        return jsonify(train), 200
    elif request.method == 'PUT':
        data = request.json

        trains_collection = db['trains']
        train = trains_collection.find_one({'_id': ObjectId(train_id)})
        if not train:
            return jsonify({'message': f'Train {train_id} not found'}), 404

        # Update the entire train document with the new data
        trains_collection.replace_one({'_id': ObjectId(train_id)}, data)
        return jsonify({'message': f'Train {train_id} updated successfully'}), 200

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

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)