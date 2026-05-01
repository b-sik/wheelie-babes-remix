import os
import json
from flask import Flask, jsonify, send_from_directory
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

origins = ["https://wheelie-babes.bsik.net", "https://wheelie-babes-remix.test", "http://localhost:3000", "http://127.0.0.1:5500"]

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
              env = os.getenv('NODE_ENV')
              if env == 'development':
                  be = os.getenv('DEV_BE')
                  if isinstance(be, str):
                      filelist.append(be + '/gpx/' + f.rsplit(".", 1)[0])
              else:
                  filelist.append('https://wheelie-babes.bsik.net/gpx/' +
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

@app.route('/tracks/index.json', methods=['GET'])
@cross_origin(origins=origins)
def tracks_index():
    # static/tracks/index.json
    return app.send_static_file('tracks/index.json')


@app.route('/tracks/overview.geojson', methods=['GET'])
@cross_origin(origins=origins)
def tracks_overview():
    # static/tracks/overview.geojson
    return app.send_static_file('tracks/overview.geojson')


@app.route('/tracks/full/<day_num>.geojson', methods=['GET'])
@cross_origin(origins=origins)
def tracks_full(day_num):
    # static/tracks/full/<day_num>.geojson
    return send_from_directory(os.path.join(app.static_folder, 'tracks', 'full'),
                               f'{day_num}.geojson')
