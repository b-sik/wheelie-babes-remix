const contentWrapper = document.querySelector("main");

window.onload = function () {
    const day = new URLSearchParams(window.location.search).get("day");

    if (day) {
        updateContent(day);
    }
};

const map = L.map("map").setView([39, -97.5], 4);

L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
        '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}).addTo(map);

const options = {
    async: true,
    marker_options: {
        startIconUrl: null,
        endIconUrl: null,
    },
};

fetch("http://127.0.0.1:5000/tracks")
    .then((res) => (res.ok ? res.json() : false))
    .then((res) => {
        res.forEach((track) => {
            let day = track.split("/");
            day = Number(day[day.length - 1].split(".")[0]);

            new L.GPX(track, options)
                .on("loaded", function (e) {
                    const segment = e.target;

                    const coordinates =
                        segment.toGeoJSON().features[0].geometry.coordinates;
                    start = coordinates[0].reverse();
                    end = coordinates[coordinates.length - 1].reverse();

                    L.marker(end)
                        .bindTooltip(
                            `📍<code>${segment.get_name().substring(0, 31)}<br />
                    -> ${track}<br />
                    ${segment.get_distance_imp().toFixed(2)} miles<br />
                    <- ${track}</code>`
                        )
                        .on("click", () => {
                            const url = new URL(window.location);
                            url.searchParams.set("day", day);
                            history.pushState(null, "", url);

                            updateContent(day);
                        })
                        .addTo(map);

                    if (day === 1) {
                        L.marker(start)
                            .bindTooltip(
                                `📍<code>${segment.get_name().substring(0, 31)}<br />
                    <- ${track}<br />
                    ${segment.get_distance_imp().toFixed(2)} miles</code>`
                            )
                            .on("click", () => {
                                const url = new URL(window.location);
                                url.searchParams.set("day", 1);
                                history.pushState(null, "", url);

                                updateContent(1);
                            })
                            .addTo(map);
                    }
                })
                .addTo(map);
        });
    });

function updateContent(day) {
    fetch(`assets/json/${day}.json`)
        .then((res) => {
            if (!res.ok) {
                throw new Error("Status " + res.status);
            }

            return res.json();
        })
        .then((res) => {
            console.log(res);
            contentWrapper.innerHTML = `<h2>${res.title}</h2>${res.content}`;
        })
        .catch((err) => console.log(err));
}

// each segment has a hover state popup with info about each post relating to it
//  info to and from: either add to previous marker current segment distance or loop backwards

// on select, will display both blog posts below on desktop and as a full screen modal on mobile?
