import Fuse from "fuse.js";

const env: string | undefined = process.env.NODE_ENV;

interface Paginate {
    totalItems: number;
    currentPage: number;
    pageSize: number;
    totalPages: number;
    startPage: number;
    endPage: number;
    startIndex: number;
    endIndex: number;
    pages: number[];
}

interface MilesAndElevation {
    elevation_gain: string;
    elevation_loss: string;
    flats: string;
    miles: string;
    rest_day: boolean;
}

interface Locations {
    end: string;
    single: boolean;
    start: string;
}

interface Fields {
    date: string;
    day_number: string;
    locations: Locations;
    miles_and_elevation: MilesAndElevation;
    weather: string;
}

interface ContentItem {
    ID: number;
    content: string;
    date: string;
    fields: Fields;
    title: string;
}

interface AllContent {
    [key: number]: ContentItem;
}

interface SegmentAndMarker {
    segment: L.Polyline;
    marker: L.Marker;
}

interface SegmentsAndMarkers {
    [key: number]: SegmentAndMarker;
}

interface MediaQueries {
    [key: string]: Boolean;
}

export class WheelieBabes {
    mediaQueries: MediaQueries;
    contentWrapper: HTMLElement | null;
    navWrapper: HTMLElement | null;
    searchWrapper: HTMLDivElement | null;
    paginationWrapper: HTMLDivElement | null;
    contentList: HTMLOListElement | null | undefined;
    currentPage: number;
    map: L.Map;
    mapOptions: object;
    //redMarker: L.Icon;
    //blueMarker: L.Icon;
    segmentsAndMarkers: SegmentsAndMarkers;
    currentMarker: L.Marker | null;
    currentSegment: L.Polyline | null;
    fuse: Fuse<ContentItem[]>;

    constructor(public content: AllContent) {
        this.mediaQueries = {
            "phone-only": window.matchMedia("(max-width: 599px)").matches,
            "tablet-portrait": window.matchMedia("(min-width: 600px)").matches,
            "tablet-landscape": window.matchMedia("(min-width: 900px)").matches,
            desktop: window.matchMedia("(min-width: 1200px)").matches,
            "big-desktop": window.matchMedia("(min-width: 1800px)").matches,
        };

        this.content = content;
        this.contentWrapper = document.querySelector("article");
        this.navWrapper = document.querySelector("nav");
        this.searchWrapper = document.querySelector(".search-wrapper");
        this.paginationWrapper = document.querySelector(".pagination-wrapper");
        this.contentList = this.navWrapper?.querySelector("ol");
        this.currentPage = 1;

        this.closeTripLog();
        this.populateNav();

        const initialDay: string | null = new URLSearchParams(
            window.location.search
        ).get("day");

        if (initialDay) {
            this.updateContent(initialDay);
            this.highlightActiveDayNav(initialDay);
        } else {
            this.updateContent(1);
            this.highlightActiveDayNav(1);
        }

        /*
         * Map setup.
         */
        this.mapOptions = {
            async: true,
            markers: {
                startIcon: null,
                endIcon: null,
            },
        };

        this.segmentsAndMarkers = {};

        // keep track of active marker and active.
        this.currentMarker = null;
        this.currentSegment = null;

        //this.blueMarker = L.icon({
        //iconUrl: "blue-pin.png",
        //iconSize: [30, 30],
        //iconAnchor: [12, 27],
        //tooltipAnchor: [10, -24],
        //});

        //this.redMarker = L.icon({
        //iconUrl: "red-pin.png",
        //iconSize: [30, 30],
        //iconAnchor: [12, 27],
        //tooltipAnchor: [10, -24],
        //});

        this.map = L.map("map", this.mapOptions).setView([39, -97.5], 4);

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

    closeTripLog(): void {
        const detailsEl = document.getElementById("nav-details");
        if (detailsEl && this.mediaQueries["phone-only"]) {
            detailsEl.removeAttribute("open");
        }
    }

    /*
     * Set which day (blog post) to show.
     */
    setDay(day: string): void {
        const url: URL = new URL(window.location.href);
        url.searchParams.set("day", day);
        history.pushState(null, "", url);
        this.highlightActiveDayNav(day);
    }

    updateContent(day: string | number): void {
        const contentItem: ContentItem = this.content[Number(day)];

        if (this.contentWrapper) {
            const { title, content, fields } = contentItem;
            const { miles_and_elevation, weather, date } = fields;

            let stats = "";

            if (miles_and_elevation.rest_day) {
                stats = `<h3>Rest Day 😴</h3>`;
            } else {
                stats = this.getStats(miles_and_elevation);
            }

            const headings: string = this.getHeadings(
                title,
                miles_and_elevation.rest_day
            );

            this.contentWrapper.innerHTML = `
            ${headings}
            <h3><time datetime="${new Date(date)}">${contentItem.date}</time> | Weather: ${weather} <span class="weather-emoji">${this.getWeatherEmoji(weather)}</span></h3>
            ${stats}
            <hr />
            ${content}

            `;
        }

        this.reloadLightbox();
    }

    getWeatherEmoji(str: string): string {
        str = str.toLowerCase();

        if (str.includes("sunny")) {
            return "🌞";
        } else if (str.includes("hot")) {
            return "🥵";
        } else if (str.includes("perfect")) {
            return "👌";
        } else if (str.includes("storm")) {
            return "⛈️ ";
        } else if (str.includes("cloudy")) {
            return "☁️ ";
        }

        return "";
    }

    getHeadings(title: string, restDay: boolean): string {
        const headings = title
            .split("&#8211;")
            .map((heading: string) => heading.trim());

        let subheadings: string[] = [];

        if (!restDay && headings[1]) {
            subheadings = headings[1].split(" to ");
        }

        return `
        <h1>${headings[0]}</h1>
        ${
            subheadings.length > 0
                ? `<h2><span>${subheadings[0]}</span><span> to ${subheadings[1]}</span></h2>`
                : `<h2>${headings[1]}</h2>`
        }
        `;
    }

    getStats(stats: MilesAndElevation): string {
        const { elevation_loss, elevation_gain, flats, miles } = stats;

        const km = Math.floor(Number(miles) * 1.609344);
        const meters = (feet: number) => Math.floor(feet * 0.3048);

        return `
                <table>
                <tr><td>Distance: </td><td>${miles} mi</td><td>${km} km</td></tr>
                <tr><td>Elevation gain: </td><td>${elevation_gain} ft</td>
                  <td>${meters(Number(elevation_gain))} m</td></tr>
                <tr><td>Elevation loss: </td><td>${elevation_loss} ft</td>
                  <td>${meters(Number(elevation_loss))} m</td></tr>
                <tr><td>Flat tires: </td><td>${flats === "" ? "0" : flats}</td></tr>
                </table>
                `;
    }

    highlightActiveDayNav(day: string | number): void {
        const prevActive: HTMLLIElement | null =
            document.querySelector(".active-day");

        if (prevActive) {
            prevActive.classList.remove("active-day");
        }

        const li: HTMLElement | null = document.getElementById(`day-${day}`);

        if (li) {
            li.classList.add("active-day");
        }
    }

    populateNav(
        contents: ContentItem[] | null = null,
        page: number | null = null
    ): void {
        const pageLength: number = this.mediaQueries["tablet-landscape"]
            ? 20
            : 7;

        if (this.contentList) {
            this.contentList.innerHTML = "";
        }

        if (!contents) {
            contents = Object.values(this.content);
        }

        const activeDay: string | null = new URLSearchParams(
            window.location.search
        ).get("day");

        this.setCurrentPage(page, contents, activeDay, pageLength);

        const paginate: Paginate = this.paginate(
            contents.length,
            this.currentPage,
            pageLength,
            999
        );

        const { endIndex, startIndex, pages } = paginate;

        this.buildPaginationMarkup(contents, pages);

        this.buildNavigationMarkup(contents, startIndex, endIndex);

        if (activeDay) {
            this.highlightActiveDayNav(activeDay);
        }
    }

    setCurrentPage(
        page: number | null,
        contents: ContentItem[],
        activeDay: string | null,
        pageLength: number
    ): void {
        if (page === null) {
            const currentDayIndex: number = activeDay
                ? contents
                      .map((content: ContentItem) => content.fields.day_number)
                      .indexOf(activeDay)
                : -1;

            if (currentDayIndex !== -1) {
                this.currentPage = Math.ceil(
                    (currentDayIndex + 1) / pageLength
                );
            } else {
                this.currentPage = 1;
            }
        } else {
            this.currentPage = page;
        }
    }

    buildPaginationMarkup(contents: ContentItem[], pages: number[]): void {
        if (this.paginationWrapper) {
            this.paginationWrapper.innerHTML = "";
            pages.forEach((page: number) => {
                this.paginationWrapper?.insertAdjacentHTML(
                    "beforeend",
                    `<button id='page-${page}' class="${page === this.currentPage ? "active-page" : ""}">${page}</button>`
                );

                document
                    .getElementById(`page-${page}`)
                    ?.addEventListener("click", () => {
                        this.currentPage = page;
                        this.populateNav(contents, page);
                    });
            });
        }
    }

    buildNavigationMarkup(
        contents: ContentItem[],
        startIndex: number,
        endIndex: number
    ): void {
        contents.forEach((content: ContentItem, i: number) => {
            const {
                fields: { day_number, locations },
            } = content;

            if (this.contentList) {
                this.contentList.insertAdjacentHTML(
                    "beforeend",
                    `
                <li role="button" id="day-${day_number}" style="${i >= startIndex && i <= endIndex ? "" : "display:none;"}"> 
                <h4>Day ${day_number}</h4>
                <h5>${locations.single ? locations.start : locations.start + " to " + locations.end}</h5>
                </li>
                <hr style="${i >= startIndex && i < endIndex ? "" : "display:none;"}"/>
            `
                );

                document
                    .getElementById(`day-${day_number}`)
                    ?.addEventListener("click", () => {
                        const mapEl = document.getElementById("map");
                        mapEl?.scrollIntoView({
                            behavior: "smooth",
                            block: "start",
                        });

                        this.updateContent(day_number);
                        this.setDay(day_number);

                        const currentTrack: SegmentAndMarker | undefined =
                            this.segmentsAndMarkers[Number(day_number)];

                        if (currentTrack) {
                            this.updateActiveTrack(
                                currentTrack.segment,
                                currentTrack.marker
                            );
                        }
                    });
            }
        });
    }

    addSearchListener(): void {
        const input = this.searchWrapper?.querySelector("input");
        const searchIcon = this.searchWrapper?.querySelector("#search");

        if (searchIcon) {
            searchIcon.addEventListener("click", (e: Event) => {
                e.preventDefault();
            });
        }

        input?.addEventListener("input", (e: Event) => {
            const target = e.target as HTMLInputElement;

            if (target.value === "") {
                this.populateNav(Object.values(this.content));
            } else {
                const result: Fuse.FuseResult<ContentItem>[] = this.fuse.search(
                    target.value
                );
                const contents: ContentItem[] = Object.values(result).map(
                    (item) => item.item
                );

                this.currentPage = 1;
                this.populateNav(contents);
            }
        });
    }

    reloadLightbox(): void {
        const directFigures: NodeListOf<HTMLElement> | undefined =
            this.contentWrapper?.querySelectorAll(":scope > figure");

        if (directFigures) {
            directFigures.forEach((figure) => {
                const nestedFigures =
                    figure.querySelectorAll(":scope > figure");

                if (nestedFigures) {
                    const mediaWrappers: HTMLAnchorElement[] = [];

                    nestedFigures.forEach((nestedFigure) => {
                        const media:
                            | HTMLImageElement
                            | HTMLVideoElement
                            | null = nestedFigure.querySelector("img, video");

                        if (media) {
                            const mediaWrapper: HTMLAnchorElement =
                                document.createElement("a");
                            mediaWrapper.setAttribute("href", media.src);
                            mediaWrapper.setAttribute(
                                "data-gallery",
                                "gallery"
                            );
                            mediaWrapper.classList.add("glightbox");
                            mediaWrapper.appendChild(media);

                            mediaWrappers.push(mediaWrapper);
                        }
                    });

                    figure.innerHTML = "";

                    mediaWrappers.forEach((wrapper) => {
                        figure.append(wrapper);
                    });
                }
            });
        }

        lightbox.reload();
    }

    /******************************************************
     *
     * LEAFLET / GPX
     *
     *****************************************************/

    getTracks(): void {
        fetch(
            env === "development"
                ? process.env.DEV_BE + "/tracks"
                : process.env.PROD_BE + "/tracks"
        )
            .then((res) => (res.ok ? res.json() : false))
            .then((res) => {
                res.forEach((track: string) => {
                    this.addTrack(track);
                });
            });
    }

    addTrack = (track: string) => {
        const day: string[] = track.split("/");
        const dayNum: string = day[day.length - 1];

        new L.GPX(track, this.mapOptions)
            .on("loaded", (e: L.LeafletEvent) => {
                const segment = e.target;
                const geoJSONSegment = segment.toGeoJSON();

                const coordinates: [number, number][] =
                    geoJSONSegment.features[0].geometry.coordinates;

                // coords need to be reversed.
                const start: [number, number] = [
                    coordinates[0][1],
                    coordinates[0][0],
                ];

                const marker = L.marker(start)
                    .bindTooltip(this.toolTipMarkup(track))
                    //.setIcon(this.blueMarker)
                    .on("click", () => {
                        this.setDay(dayNum);
                        this.updateContent(dayNum);
                        this.populateNav();

                        this.updateActiveTrack(segment, marker);
                    })
                    .addTo(this.map);

                this.segmentsAndMarkers[Number(dayNum)] = { segment, marker };
            })
            .addTo(this.map);
    };

    updateNewTrack(segment: L.Polyline, marker: L.Marker): void {
        //marker.setIcon(this.redMarker);
        segment.setStyle({ color: "red" });
        this.map.fitBounds(segment.getBounds());

        this.currentMarker = marker;
        this.currentSegment = segment;
    }

    resetCurrentTrack(): void {
        if (this.currentMarker && this.currentSegment) {
            //this.currentMarker.setIcon(this.blueMarker);
            this.currentSegment.setStyle({ color: "blue" });
        }
    }

    updateActiveTrack(segment: L.Polyline, marker: L.Marker): void {
        this.resetCurrentTrack();
        this.updateNewTrack(segment, marker);
    }

    toolTipMarkup(track: string): string {
        const day: string[] = track.split("/");
        const day_num: number = Number(day[day.length - 1]);

        const content: ContentItem = this.content[day_num];

        return (
            this.getHeadings(content.title) +
            this.getStats(content.fields.miles_and_elevation)
        );
    }

    /**
     * @link https://jasonwatmore.com/post/2018/08/07/javascript-pure-pagination-logic-in-vanilla-js-typescript
     */
    paginate(
        totalItems: number,
        currentPage = 1,
        pageSize = 10,
        maxPages = 10
    ): Paginate {
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

fetch(
    env === "development"
        ? process.env.DEV_BE + "/content"
        : process.env.PROD_BE + "/content"
)
    .then((res) => (res.ok ? res.json() : false))
    .then((res) => {
        new WheelieBabes(res);
    });
