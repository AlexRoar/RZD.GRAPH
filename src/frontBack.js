"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var TransportType;
(function (TransportType) {
    TransportType[TransportType["train"] = 0] = "train";
    TransportType["publicTransport"] = "masstransit";
    TransportType["car"] = "auto";
    TransportType["pedestrian"] = "pedestrian";
})(TransportType || (TransportType = {}));
class MultiRoute {
    constructor() {
        this.duration = 0;
        this.distance = 0;
        this.price = 0;
        this.hiddenPrice = 0;
        this.path = [];
    }
    calcParameters() {
    }
}
class PossibleRoutes {
    constructor(allRoutes) {
        this.others = [];
    }
}
function getRoutes(waypoints, params) {
}
function getYAMultiRoutes(waypoints, params) {
    let myMap = new ymaps.Map('map', {
        center: [55.751574, 37.573856],
        zoom: 9,
        controls: []
    });
    return Promise.all([TransportType.car, TransportType.publicTransport, TransportType.pedestrian]
        .filter(value => !params.exclusions.has(value))
        .map((value) => {
        console.log(value);
        console.log(waypoints.map(value => value.name));
        // @ts-ignore
        const multiRoute = new ymaps.multiRouter.MultiRoute({
            referencePoints: waypoints.map(value => value.name),
            params: {
                results: 1,
                // @ts-ignore
                routingMode: value
            },
        });
        const result = new Promise((resolve, reject) => {
            multiRoute.model.events.add('requestsuccess', function () {
                resolve(multiRoute.getActiveRoute());
            });
        });
        myMap.geoObjects.add(multiRoute);
        return result;
    }));
}
/**
 * Get railway stations nearby userPoint location
 * @param userPoint user's location
 * @param range in degrees
 */
function getStations(userPoint, range) {
    const searchControl = new ymaps.control.SearchControl({
        options: {
            provider: 'yandex#search',
            boundedBy: [[userPoint.lat - range, userPoint.lon - range], [userPoint.lat + range, userPoint.lon + range]]
        }
    });
    const namesDiscriminator = new Set(['железнодорож', 'вокзал', 'станция']);
    const findStations = new Set(['железнодорожная', 'станция', 'платформа']);
    let allResults = [];
    for (const searchString of findStations) {
        searchControl.search(searchString).then(function () {
            const geoObjectsArray = searchControl.getResultsArray();
            allResults = allResults.concat(geoObjectsArray);
        });
    }
    allResults = allResults.filter((element, index) => {
        for (const discriminator of namesDiscriminator) {
            for (const catWord of element.properties._data.categoriesText.split(' ')) {
                if (catWord.toLowerCase().includes(discriminator.toLowerCase())) {
                    return true;
                }
            }
        }
        return false;
    });
    return allResults;
}
/**
 *
 * @param firstStation
 * @param secondStation
 * @param date
 */
function getSchedule(firstStation, secondStation, date) {
    $.ajax({
        url: `https://kraspg.ru/r?from=${firstStation}&to=${secondStation}&date=${date.getDay()}.${date.getMonth()}.${date.getFullYear()}&search=%D0%9D%D0%B0%D0%B9%D1%82%D0%B8`,
        success: function (result) {
            const dom_nodes = $($.parseHTML(result));
        }
    });
}
