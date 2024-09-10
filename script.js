const map = L.map("map").setView([39, -97.5], 4);

L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution:
    '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}).addTo(map);

const numFiles = 106;
const options = {
  async: true,
  marker_options: {
    startIconUrl: null,
    endIconUrl: null,
  },
};

const gpx_file = (i) => `gpx/${i}.gpx`;

for (let i = 1; i <= numFiles; i++) {
  new L.GPX(gpx_file(i), options)
    .on("loaded", function (e) {
      const segment = e.target;

      const coordinates = segment.toGeoJSON().features[0].geometry.coordinates;
      start = coordinates[0].reverse();
      end = coordinates[coordinates.length - 1].reverse();

      L.marker(end)
        .bindTooltip(
          `📍<code>${segment.get_name().substring(0, 31)}<br />
                    -> ${gpx_file(i)}<br />
                    ${segment.get_distance_imp().toFixed(2)} miles<br />
                    <- ${gpx_file(i + 1)}</code>`,
        )
        .addTo(map);

      if (i === 1) {
        L.marker(start)
          .bindTooltip(
            `📍<code>${segment.get_name().substring(0, 31)}<br />
                    <- ${gpx_file(i)}<br />
                    ${segment.get_distance_imp().toFixed(2)} miles</code>`,
          )
          .addTo(map);
      }
    })
    .addTo(map);
}

// each segment has a hover state popup with info about each post relating to it
//  info to and from: either add to previous marker current segment distance or loop backwards

// on select, will display both blog posts below on desktop and as a full screen modal on mobile?
