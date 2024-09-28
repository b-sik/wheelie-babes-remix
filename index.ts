import Fuse from "fuse.js";
import GLightbox from "glightbox";

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

interface MilesAndElevations {
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
    miles_and_elevations: MilesAndElevations;
    wearther: string;
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

export class WheelieBabes {
    contentWrapper: HTMLElement | null;
    navWrapper: HTMLElement | null;
    searchWrapper: HTMLDivElement | null;
    paginationWrapper: HTMLDivElement | null;
    contentList: HTMLOListElement | null | undefined;
    currentPage: number;
    map: L.Map;
    mapOptions: object;
    fuse: Fuse<ContentItem[]>;
    lightbox: GLightbox;

    constructor(public content: AllContent) {
        this.content = content;
        this.contentWrapper = document.querySelector("article");
        this.navWrapper = document.querySelector("nav");
        this.searchWrapper = document.querySelector(".search-wrapper");
        this.paginationWrapper = document.querySelector(".pagination-wrapper");
        this.contentList = this.navWrapper?.querySelector("ol");
        this.currentPage = 1;
        this.lightbox = GLightbox();

        this.populateNav();

        const initialDay = new URLSearchParams(window.location.search).get(
            "day"
        );

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
        this.map = L.map("map").setView([39, -97.5], 4);

        this.mapOptions = {
            async: true,
            marker_options: {
                startIconUrl: undefined,
                endIconUrl: undefined,
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
        const content: ContentItem = this.content[Number(day)];

        if (this.contentWrapper) {
            this.contentWrapper.innerHTML = `<h2>${content.title}</h2>${content.content}`;
        }

        this.reloadLightbox();
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

    populateNav(contents: ContentItem[] | null = null): void {
        if (this.contentList) {
            this.contentList.innerHTML = "";
        }

        if (!contents) {
            contents = Object.values(this.content);
        }

        const paginate: Paginate = this.paginate(
            contents.length,
            this.currentPage,
            10,
            999
        );

        const { endIndex, startIndex, pages } = paginate;

        /**
         * Build pagination.
         */
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
                        this.populateNav(contents);
                    });
            });
        }

        /**
         * Build navigation tabs.
         */
        contents.forEach((content: ContentItem, i: number) => {
            if (this.contentList) {
                this.contentList.insertAdjacentHTML(
                    "beforeend",
                    `
                <li role="button" id="day-${content.fields.day_number}" style="${i >= startIndex && i <= endIndex ? "" : "display:none;"}"> 
                <h4>Day ${content.fields.day_number}</h4>
                <h5>${content.fields.locations.start} to ${content.fields.locations.end}</h5>
                </li>
            `
                );

                document
                    .getElementById(`day-${content.fields.day_number}`)
                    ?.addEventListener("click", () => {
                        this.updateContent(content.fields.day_number);
                        this.setDay(content.fields.day_number);
                    });
            }
        });
    }

    addSearchListener(): void {
        const searchBtn = this.searchWrapper?.querySelector("button#search");
        const clearBtn = this.searchWrapper?.querySelector("button#clear");
        const input = this.searchWrapper?.querySelector("input");

        searchBtn?.addEventListener("click", () => {
            const result: Fuse.FuseResult<ContentItem>[] = this.fuse.search(
                input?.value
            );
            const contents: ContentItem[] = Object.values(result).map(
                (item) => item.item
            );

            this.currentPage = 1;
            this.populateNav(contents);
        });

        clearBtn?.addEventListener("click", () => {
            if (input?.hasOwnProperty("value")) {
                input.value = "";
            }

            this.populateNav(Object.values(this.content));
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

        this.lightbox.reload();
    }

    /******************************************************
     *
     * LEAFLET / GPX
     *
     *****************************************************/

    getTracks(): void {
        fetch("https://127.0.0.1:5000/tracks")
            .then((res) => (res.ok ? res.json() : false))
            .then((res) => {
                res.forEach((track: string) => {
                    this.addTrack(track);
                });
            });
    }

    addTrack(track: string): void {
        const day: string[] = track.split("/");
        const dayNum: string = day[day.length - 1].split(".")[0];

        const gpxLayer = new L.GPX(track, this.mapOptions);

        gpxLayer
            .on("loaded", (e: L.LeafletEvent) => {
                const segment = e.target;
                const geoJSONSegment = segment.toGeoJSON();

                // coords need to be reversed.
                const coordinates: [number, number][] =
                    geoJSONSegment.features[0].geometry.coordinates.map(
                        (coord: [number, number]) => [coord[1], coord[0]]
                    );
                const start: [number, number] = coordinates[0];
                const end: [number, number] =
                    coordinates[coordinates.length - 1];

                L.marker(end)
                    .bindTooltip(this.toolTipMarkupEnd(segment, track))
                    .on("click", () => {
                        this.setDay(dayNum);
                        this.updateContent(dayNum);
                    })
                    .addTo(this.map);

                if (dayNum === "1") {
                    L.marker(start)
                        .bindTooltip(this.toolTipMarkupStart(segment, track))
                        .on("click", () => {
                            this.setDay(dayNum);
                            this.updateContent(dayNum);
                        })
                        .addTo(this.map);
                }
            })
            .addTo(this.map);
    }

    toolTipMarkupStart(segment: any, track: string): string {
        return `📍<code>${segment.get_name().substring(0, 31)}<br />
                    <- ${track}<br />
                    ${segment.get_distance_imp().toFixed(2)} miles</code>`;
    }

    toolTipMarkupEnd(segment: any, track: string): string {
        return `📍<code>${segment.get_name().substring(0, 31)}<br />
                    -> ${track}<br />
                    ${segment.get_distance_imp().toFixed(2)} miles<br />
                    <- ${track}</code>`;
    }

    /**
     * @link https://jasonwatmore.com/post/2018/08/07/javascript-pure-pagination-logic-in-vanilla-js-typescript
     */
    paginate(
        totalItems: number,
        currentPage = 1,
        pageSize = 10,
        maxPages = 10
    ) {
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

fetch("https://127.0.0.1:5000/content")
    .then((res) => (res.ok ? res.json() : false))
    .then((res) => {
        new WheelieBabes(res);
    });
