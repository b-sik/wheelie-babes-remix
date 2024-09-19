class WheelieBabes {
    constructor(content) {
        this.content = content;
        this.contentWrapper = document.querySelector("main");
        this.navWrapper = document.querySelector("nav");
        this.searchWrapper = document.getElementById("search-wrapper");

        /*
         * Map setup.
         */
        this.map = L.map("map").setView([39, -97.5], 4);

        this.mapOptions = {
            async: true,
            marker_options: {
                startIconUrl: null,
                endIconUrl: null,
            },
        };

        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution:
                '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }).addTo(this.map);

        /*
         * Search setup.
         */
        const searchOptions = {
            keys: ["content", "title"],
        };

        this.fuse = new Fuse(Object.values(this.content), searchOptions);

        this.addSearchListener();

        /*
         * Start app.
         */
        const initialDay = new URLSearchParams(window.location.search).get(
            "day"
        );

        if (initialDay) {
            this.updateContent(initialDay);
        }

        this.getTracks();
    }

    addSearchListener() {
        const btn = this.searchWrapper.querySelector("button");
        const input = this.searchWrapper.querySelector("input");

        btn.addEventListener("click", () => {
            const result = this.fuse.search(input.value);
            console.log(result);
        });
    }

    updateContent(day) {
        const content = this.content[Number(day)];
        this.contentWrapper.innerHTML = `<h2>${content.title}</h2>${content.content}`;
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

await fetch("http://127.0.0.1:5000/content")
    .then((res) => (res.ok ? res.json() : false))
    .then((res) => {
        new WheelieBabes(res);
    });
