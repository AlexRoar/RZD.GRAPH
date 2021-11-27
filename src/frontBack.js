"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
var TransportType;
(function (TransportType) {
    TransportType["publicTransport"] = "masstransit";
    TransportType["car"] = "auto";
    TransportType["pedestrian"] = "pedestrian";
})(TransportType || (TransportType = {}));
class MultiRoute {
    constructor(duration, distance, path) {
        this.distance = 0;
        this.price = 0;
        this.hiddenPrice = 0;
        this.path = [];
        this.duration = duration;
        this.distance = distance;
        this.path = path;
        this.calcParameters();
    }
    calcParameters() {
        this.price = 0;
        this.hiddenPrice = 0;
        for (const routePart of this.path) {
            this.price += routePart.price;
        }
    }
    countType(type) {
        return this.path.map((value) => {
            return (value.type == type) ? 1 : 0;
        })
            .reduce(((previousValue, currentValue) => previousValue + currentValue));
    }
}
class Route {
    constructor(duration, distance, startPoint, endPoint, info = {}, type) {
        this.rates = {
            simpleCar: 9,
            cargoCar: 11,
            driver: 480,
            worker: 710
        };
        this.duration = 0;
        this.distance = 0;
        this.price = 0;
        this.hiddenPrice = 0;
        this.startPoint = { coordinates: { lat: 0, lon: 0 }, name: "" };
        this.endPoint = { coordinates: { lat: 0, lon: 0 }, name: "" };
        this.info = {};
        this.type = TransportType.car;
        this.duration = duration;
        this.distance = distance;
        this.startPoint = startPoint;
        this.endPoint = endPoint;
        this.info = info;
        this.type = type;
        this.price += this.duration * this.rates.worker / 60;
        switch (this.type) {
            case TransportType.car: {
                this.price += this.distance * this.rates.simpleCar;
                this.price += this.duration * this.rates.driver / 60;
            }
            case TransportType.publicTransport:
            case TransportType.pedestrian: {
                //the same
            }
        }
    }
}
class PossibleRoutes {
    constructor(allRoutes) {
        this.others = [];
        if (allRoutes.length == 0)
            return;
        allRoutes = allRoutes.sort((a, b) => a.duration - b.duration);
        this.fast = allRoutes[0];
        allRoutes = allRoutes.sort((a, b) => a.countType(TransportType.pedestrian) - a.countType(TransportType.pedestrian));
        allRoutes = allRoutes.sort((a, b) => a.countType(TransportType.publicTransport) - a.countType(TransportType.publicTransport));
        allRoutes = allRoutes.sort((a, b) => a.price - b.price);
        this.cheap = allRoutes[0];
        allRoutes = allRoutes.sort((a, b) => a.path.length - b.path.length);
        this.others = allRoutes;
        this.best = allRoutes[0];
    }
}
function getRoutes(waypoints, params) {
    let YaRoutes = getYAMultiRoutes(waypoints, params);
    return new PossibleRoutes([]);
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
function getStations(userPoint, range = 0.1) {
    return __awaiter(this, void 0, void 0, function* () {
        const searchControl = new ymaps.control.SearchControl({
            options: {
                provider: 'yandex#search',
                boundedBy: [[userPoint.lat - range, userPoint.lon - range], [userPoint.lat + range, userPoint.lon + range]],
            }
        });
        const namesDiscriminator = new Set(['железнодорож', 'вокзал', 'станция']);
        const findStations = new Set(['железнодорожная', 'станция', 'платформа']);
        let allResults = [];
        for (const searchString of findStations) {
            yield searchControl.search(searchString);
            const geoObjectsArray = searchControl.getResultsArray();
            allResults = allResults.concat(geoObjectsArray);
        }
        // console.log(allResults)
        allResults = allResults.filter((element, index) => {
            for (const discriminator of namesDiscriminator) {
                if (!element.properties._data.categoriesText) {
                    // console.log(element)
                    return false;
                }
                for (const catWord of element.properties._data.categoriesText.split(' ')) {
                    if (catWord.toLowerCase().includes(discriminator.toLowerCase())) {
                        return true;
                    }
                }
            }
            return false;
        });
        return allResults;
    });
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
const mockData = new PossibleRoutes([
    new MultiRoute(115, 150, [
        new Route(115, 150, {
            name: "Транспортная улица, 20В",
            coordinates: {
                lat: 0, lon: 0
            }
        }, {
            name: "посёлок городского типа Березовка",
            coordinates: {
                lat: 0, lon: 0
            }
        }, {
            duration: 115
        }, TransportType.car)
    ]),
    new MultiRoute(110, 98, [
        new Route(115, 0.520, {
            name: "Транспортная улица, 20В",
            coordinates: {
                lat: 0, lon: 0
            }
        }, {
            name: "Саянская",
            coordinates: {
                lat: 0, lon: 0
            }
        }, {
            duration: 115
        }, TransportType.pedestrian),
        new Route(210, 0, {
            name: "Саянская",
            coordinates: {
                lat: 0, lon: 0
            }
        }, {
            name: "Красноярск-Пасс.",
            coordinates: {
                lat: 0, lon: 0
            }
        }, {
            duration: 210
        }, TransportType.pedestrian),
        new Route(17, 0, {
            name: "Железнодорожный вокзал",
            coordinates: {
                lat: 0, lon: 0
            }
        }, {
            name: "Междугородный автовокзал",
            coordinates: {
                lat: 0, lon: 0
            }
        }, {
            duration: 17,
            description: "Автобус 81"
        }, TransportType.publicTransport),
        new Route(21, 0, {
            name: "Красноярск",
            coordinates: {
                lat: 0, lon: 0
            }
        }, {
            name: "Березовка, перекресток",
            coordinates: {
                lat: 0, lon: 0
            }
        }, {
            duration: 21,
            description: "Автобус Красноярск — Канск"
        }, TransportType.publicTransport)
    ]),
    new MultiRoute(110, 98, [
        new Route(1071, 0, {
            name: "Транспортная улица, 20В",
            coordinates: {
                lat: 0, lon: 0
            }
        }, {
            name: "Саянская",
            coordinates: {
                lat: 0, lon: 0
            }
        }, {
            duration: 115
        }, TransportType.pedestrian),
        new Route(210, 0, {
            name: "Саянская",
            coordinates: {
                lat: 0, lon: 0
            }
        }, {
            name: "Красноярск-Пасс.",
            coordinates: {
                lat: 0, lon: 0
            }
        }, {
            duration: 210
        }, TransportType.publicTransport),
        new Route(17, 0, {
            name: "Железнодорожный вокзал",
            coordinates: {
                lat: 0, lon: 0
            }
        }, {
            name: "Междугородный автовокзал",
            coordinates: {
                lat: 0, lon: 0
            }
        }, {
            duration: 17,
            description: "Автобус 81"
        }, TransportType.publicTransport),
        new Route(21, 0, {
            name: "Красноярск",
            coordinates: {
                lat: 0, lon: 0
            }
        }, {
            name: "Березовка, перекресток",
            coordinates: {
                lat: 0, lon: 0
            }
        }, {
            duration: 21,
            description: "Автобус Красноярск — Канск"
        }, TransportType.publicTransport)
    ])
]);
