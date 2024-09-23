class WheelieBabes {
    constructor(content) {
        this.content = content;
        this.contentWrapper = document.querySelector("main");
        this.navWrapper = document.querySelector("nav");
        this.searchWrapper = document.getElementById("search-wrapper");
        this.paginationWrapper = document.getElementById("pagination-wrapper");
        this.contentList = this.navWrapper.querySelector("ol");
        this.currentPage = 1;

        this.populateNav();

        const initialDay = new URLSearchParams(window.location.search).get(
            "day"
        );

        if (initialDay) {
            this.updateContent(initialDay);
            this.highlightActiveDay(initialDay);
        }

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

        this.getTracks();

        /*
         * Search setup.
         */
        const searchOptions = {
            keys: ["content", "title"],
        };

        this.fuse = new Fuse(Object.values(this.content), searchOptions);

        this.addSearchListener();
    }

    populateNav(contents = null) {
        this.contentList.innerHTML = "";

        if (!contents) {
            contents = this.content;
        }

        const paginate = this.paginate(
            Object.values(contents).length,
            this.currentPage,
            10,
            999
        );

        const { endIndex, startIndex, pages } = paginate;

        this.paginationWrapper.innerHTML = "";
        pages.forEach((page) => {
            this.paginationWrapper.insertAdjacentHTML(
                "beforeend",
                `<button id='page-${page}' class="${page === this.currentPage ? "active-page" : ""}">${page}</button>`
            );

            document
                .getElementById(`page-${page}`)
                .addEventListener("click", () => {
                    this.currentPage = page;
                    this.populateNav(contents);
                });
        });

        Object.values(contents).forEach((content, i) => {
            this.contentList.insertAdjacentHTML(
                "beforeend",
                `
                <li role="button" id="day-${content.fields.day_number}" style="${i >= startIndex && i <= endIndex ? "" : "display:none;"}"> 
                <h3>Day ${content.fields.day_number}</h3>
                <h4>${content.fields.locations.start} to ${content.fields.locations.end}</h4>
                </li>
            `
            );

            document
                .getElementById(`day-${content.fields.day_number}`)
                .addEventListener("click", () => {
                    this.updateContent(content.fields.day_number);
                    this.setNewParams(content.fields.day_number);
                });
        });
    }

    addSearchListener() {
        const btn = this.searchWrapper.querySelector("button");
        const input = this.searchWrapper.querySelector("input");

        btn.addEventListener("click", () => {
            const result = this.fuse.search(input.value);
            const contents = Object.values(result).map((item) => item.item);
            this.currentPage = 1;
            this.populateNav(contents);
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
        this.highlightActiveDay(day);
    }

    highlightActiveDay(day) {
        const prevActive = document.querySelector(".active-day");

        if (prevActive) {
            prevActive.classList.remove("active-day");
        }

        const li = document.getElementById(`day-${day}`);
        li.classList.add("active-day");
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

    /**
     * @link https://jasonwatmore.com/post/2018/08/07/javascript-pure-pagination-logic-in-vanilla-js-typescript
     */
    paginate(totalItems, currentPage = 1, pageSize = 10, maxPages = 10) {
        // calculate total pages
        let totalPages = Math.ceil(totalItems / pageSize);

        // ensure current page isn't out of range
        if (currentPage < 1) {
            currentPage = 1;
        } else if (currentPage > totalPages) {
            currentPage = totalPages;
        }

        let startPage, endPage;
        if (totalPages <= maxPages) {
            // total pages less than max so show all pages
            startPage = 1;
            endPage = totalPages;
        } else {
            // total pages more than max so calculate start and end pages
            let maxPagesBeforeCurrentPage = Math.floor(maxPages / 2);
            let maxPagesAfterCurrentPage = Math.ceil(maxPages / 2) - 1;
            if (currentPage <= maxPagesBeforeCurrentPage) {
                // current page near the start
                startPage = 1;
                endPage = maxPages;
            } else if (currentPage + maxPagesAfterCurrentPage >= totalPages) {
                // current page near the end
                startPage = totalPages - maxPages + 1;
                endPage = totalPages;
            } else {
                // current page somewhere in the middle
                startPage = currentPage - maxPagesBeforeCurrentPage;
                endPage = currentPage + maxPagesAfterCurrentPage;
            }
        }

        // calculate start and end item indexes
        let startIndex = (currentPage - 1) * pageSize;
        let endIndex = Math.min(startIndex + pageSize - 1, totalItems - 1);

        // create an array of pages to ng-repeat in the pager control
        let pages = Array.from(Array(endPage + 1 - startPage).keys()).map(
            (i) => startPage + i
        );

        // return object with all pager properties required by the view
        return {
            totalItems: totalItems,
            currentPage: currentPage,
            pageSize: pageSize,
            totalPages: totalPages,
            startPage: startPage,
            endPage: endPage,
            startIndex: startIndex,
            endIndex: endIndex,
            pages: pages,
        };
    }
}

await fetch("http://127.0.0.1:5000/content")
    .then((res) => (res.ok ? res.json() : false))
    .then((res) => {
        new WheelieBabes(res);
    });
