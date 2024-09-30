import os
import json
from flask import Flask, jsonify
from flask_cors import CORS, cross_origin
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__,
            static_url_path='',
            static_folder='static')

if __name__ == '__main__':
    app.run(debug=True)

static_folder = app.static_folder

CORS(app)

origins = ["https://wheelie-babes.bsik.net", "https://wheelie-babes-remix.test", "https://localhost:3000"]

@app.route('/', methods=['GET'])
@cross_origin(origins=origins)
def get_index():
    return app.send_static_file('index.html')

@app.route('/gpx/<day_num>')
@cross_origin(origins=origins)
def get_gpx(day_num):
    return app.send_static_file('gpx/' + day_num + '.gpx')

@app.route('/tracks', methods=['GET'])
@cross_origin(origins=origins)
def get_tracks():
      filelist = []
      if isinstance(static_folder, str):
          for f in os.listdir(static_folder + '/gpx'):
              filelist.append(os.getenv('DEV_BE') + '/gpx/' +
                            f.rsplit(".", 1)[0])
          filelist.sort()
          return jsonify(filelist)

@app.route('/content', methods=['GET'])
@cross_origin(origins=origins)
def get_content():
      filelist = {}
      if (isinstance(static_folder, str)):
        for f in os.listdir(static_folder + '/json'):
            with open(static_folder + '/json/' + f, 'r') as file:
              day = int(f.split('.')[0])
              filelist[day] = json.load(file);
        return jsonify(filelist)
