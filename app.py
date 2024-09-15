import os
from flask import Flask, jsonify
from flask_cors import CORS, cross_origin

app = Flask(__name__)

if __name__ == '__main__':
    app.run(debug=True)
    
CORS(app)

@app.route('/tracks', methods=['GET'])
@cross_origin(origins=["http://wheelie-babes-remix.test"])
def get_tracks():
      filelist = []
      for f in os.listdir(os.getcwd() + '/assets/gpx'):
        if f.endswith(".gpx"):
            filelist.append( 'http://wheelie-babes-remix.test/assets/gpx/' + f)
      filelist.sort()
      return jsonify(filelist)
