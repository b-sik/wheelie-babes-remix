class WheelieBabes {
    constructor() {
        this.contentWrapper = document.querySelector("main");
        this.day = new URLSearchParams(window.location.search).get("day"); // only for initial load.
        this.map = L.map("map").setView([39, -97.5], 4);

        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution:
                '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }).addTo(this.map);

        this.mapOptions = {
            async: true,
            marker_options: {
                startIconUrl: null,
                endIconUrl: null,
            },
        };

        if (this.day) {
            this.updateContent(this.day);
        }

        this.getTracks();
    }

    updateContent(day) {
        fetch(`assets/json/${day}.json`)
            .then((res) => {
                if (!res.ok) {
                    throw new Error("Status " + res.status);
                }

                return res.json();
            })
            .then((res) => {
                console.log(res);
                this.contentWrapper.innerHTML = `<h2>${res.title}</h2>${res.content}`;
            })
            .catch((err) => console.log(err));
    }

    getTracks() {
        fetch("http://127.0.0.1:5000/tracks")
            .then((res) => (res.ok ? res.json() : false))
            .then((res) => {
                res.forEach((track) => {
                    this.addTrack(track);
                });
            });
    }

    addTrack(track) {
        let day = track.split("/");
        day = Number(day[day.length - 1].split(".")[0]);

        new L.GPX(track, this.mapOptions)
            .on("loaded", (e) => {
                const segment = e.target;

                const coordinates =
                    segment.toGeoJSON().features[0].geometry.coordinates;
                const start = coordinates[0].reverse();
                const end = coordinates[coordinates.length - 1].reverse();

                L.marker(end)
                    .bindTooltip(this.toolTipMarkupEnd(segment, track))
                    .on("click", () => {
                        this.setNewParams(day);
                        this.updateContent(day);
                    })
                    .addTo(this.map);

                if (day === 1) {
                    L.marker(start)
                        .bindTooltip(this.toolTipMarkupStart(segment, track))
                        .on("click", () => {
                            this.setNewParams(day);
                            this.updateContent(day);
                        })
                        .addTo(this.map);
                }
            })
            .addTo(this.map);
    }

    setNewParams(day) {
        const url = new URL(window.location);
        url.searchParams.set("day", day);
        history.pushState(null, "", url);
    }

    toolTipMarkupStart(segment, track) {
        return `📍<code>${segment.get_name().substring(0, 31)}<br />
                    <- ${track}<br />
                    ${segment.get_distance_imp().toFixed(2)} miles</code>`;
    }

    toolTipMarkupEnd(segment, track) {
        return `📍<code>${segment.get_name().substring(0, 31)}<br />
                    -> ${track}<br />
                    ${segment.get_distance_imp().toFixed(2)} miles<br />
                    <- ${track}</code>`;
    }
}

window.addEventListener("DOMContentLoaded", () => {
    new WheelieBabes();
});
