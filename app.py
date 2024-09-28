import os
import json
from flask import Flask, jsonify
from flask_cors import CORS, cross_origin

app = Flask(__name__)

if __name__ == '__main__':
    app.run(debug=True)
    
CORS(app)

origins = ["https://wheelie-babes-remix.test", "https://localhost:3000"]

@app.route('/tracks', methods=['GET'])
@cross_origin(origins=origins)
def get_tracks():
      filelist = []
      for f in os.listdir(os.getcwd() + '/assets/gpx'):
          filelist.append( 'https://wheelie-babes-remix.test/assets/gpx/' + f)
      filelist.sort()
      return jsonify(filelist)

@app.route('/content', methods=['GET'])
@cross_origin(origins=origins)
def get_content():
      filelist = {}
      for f in os.listdir(os.getcwd() + '/assets/json'):
          with open(os.getcwd()+ '/assets/json/' +f, 'r') as file:  
            day = int(f.split('.')[0])
            filelist[day] = json.load(file);
      return jsonify(filelist)
