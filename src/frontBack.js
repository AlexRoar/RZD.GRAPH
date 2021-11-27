"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var TransportType;
(function (TransportType) {
    TransportType["publicTransport"] = "masstransit";
    TransportType["car"] = "auto";
    TransportType["pedestrian"] = "pedestrian";
})(TransportType || (TransportType = {}));
class MultiRoute {
    constructor(path) {
        this.duration = 0;
        this.distance = 0;
        this.price = 0;
        this.hiddenPrice = 0;
        this.path = [];
        this.path = path;
        this.calcParameters();
    }
    calcParameters() {
        this.price = 0;
        this.hiddenPrice = 0;
        this.duration = 0;
        this.distance = 0;
        console.log("New calc");
        for (const routePart of this.path) {
            console.log(routePart);
            this.price += routePart.price;
            this.duration += routePart.duration;
            this.distance += routePart.distance;
        }
    }
    countType(type) {
        return this.path.map((value) => {
            return (value.type == type) ? 1 : 0;
        })
            .reduce(((previousValue, currentValue) => previousValue + currentValue));
    }
    async expandSpecialPoints() {
        let special = [];
        for (const specialPoint of specialPoints) {
            for (let i = 0; i < this.path.length; i++) {
                for (let j = i; j < this.path.length; j++) {
                    let firstPart = await getAutoRoute([
                        this.path[i].startPoint.coordinates,
                        specialPoint,
                        this.path[j].endPoint.coordinates
                    ]);
                    if (firstPart === null)
                        continue;
                    const pathFinal = this.path.slice(0, i).concat(firstPart).concat(this.path.slice(j + 1));
                    special.push(new MultiRoute(pathFinal));
                }
            }
        }
        return special;
    }
    async expandWays() {
        let expanded = await this.expandSpecialPoints();
        // for (let i = 0; i < this.path.length; i++) {
        //     for (let j = i; j < this.path.length; j++) {
        //         let firstPart = await getAutoRoute([this.path[i].startPoint.coordinates, this.path[j].endPoint.coordinates])
        //         if (firstPart === null)
        //             continue
        //         const pathFinal = this.path.slice(0, i).concat(firstPart).concat(this.path.slice(j + 1))
        //         expanded.push(new MultiRoute(pathFinal))
        //     }
        // }
        return expanded;
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
        this.startPoint = { coordinates: [0, 0], name: "" };
        this.endPoint = { coordinates: [0, 0], name: "" };
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
                break;
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
        this.others = allRoutes;
    }
    async imitateBetterWays(allRoutes) {
        let resultWays = allRoutes;
        for (const multiWay of allRoutes) {
            const expanded = await multiWay.expandWays();
            resultWays = resultWays.concat(expanded);
        }
        return resultWays;
    }
    async build() {
        let allRoutes = this.others.concat(await this.imitateBetterWays(this.others));
        allRoutes = allRoutes.sort((a, b) => a.duration - b.duration);
        this.fast = allRoutes[0];
        allRoutes = allRoutes.sort((a, b) => a.countType(TransportType.pedestrian) - a.countType(TransportType.pedestrian));
        allRoutes = allRoutes.sort((a, b) => a.countType(TransportType.publicTransport) - a.countType(TransportType.publicTransport));
        allRoutes = allRoutes.sort((a, b) => a.price - b.price);
        this.cheap = allRoutes[0];
        const maxPrice = allRoutes.reduce(function (a, b) {
            return Math.max(a, b.price);
        }, 0);
        const maxTime = allRoutes.reduce(function (a, b) {
            return Math.max(a, b.duration);
        }, 0);
        const maxPath = allRoutes.reduce(function (a, b) {
            return Math.max(a, b.path.length);
        }, 0);
        allRoutes = allRoutes.sort((a, b) => {
            let res = 0;
            res += (a.path.length - b.path.length) * 0.2 / maxPath;
            res += (a.price - b.price) * 0.8 / maxPrice;
            res += (a.duration - b.duration) * 0.5 / maxTime;
            return res;
        });
        this.others = allRoutes;
        this.best = allRoutes[0];
        let carOnly = allRoutes.filter((a) => a.countType(TransportType.car) == a.path.length);
        if (carOnly.length)
            this.car = carOnly[0];
    }
}
const specialPoints = [
    [55.805913, 94.329253],
    [55.545684, 94.702848], // Саянская
];
function getDistance(segment) {
    // @ts-ignore
    return segment.properties.get('distance', {
        text: "1 км",
        value: 1000
    }).value / 1000;
}
function getDuration(segment) {
    // @ts-ignore
    return segment.properties.get('duration', {
        text: "30 мин",
        value: 60
        // @ts-ignore
    }).value / 60;
}
function getAddress(coords) {
    return new Promise((resolve, reject) => {
        // @ts-ignore
        ymaps.geocode(coords).then(function (res) {
            const firstGeoObject = res.geoObjects.get(0);
            resolve(firstGeoObject.getAddressLine());
        });
    });
}
async function getBounds(segments, path) {
    const coords = path.properties.get("coordinates", []);
    const result = [];
    // @ts-ignore
    let prev = coords[segments[0].properties.get("lodIndex", 0)];
    for (const segment of segments.slice(1)) {
        // @ts-ignore
        const cur = coords[segment.properties.get("lodIndex", coords.length - 1)];
        result.push([{
                coordinates: prev.map(it => it.valueOf()),
                name: await getAddress(prev.map(it => it.valueOf()))
            }, {
                coordinates: cur.map(it => it.valueOf()),
                name: await getAddress(cur.map(it => it.valueOf()))
            }]);
        prev = cur;
    }
    const last = coords[coords.length - 1];
    result.push([{ coordinates: prev.map(it => it.valueOf()), name: await getAddress(prev.map(it => it.valueOf())) }, {
            coordinates: last.map(it => it.valueOf()),
            name: await getAddress(last.map(n => n.valueOf()))
        }]);
    return result;
}
async function YAPIRouteToMultiRoutePublicTransport(route) {
    let model = route.model;
    const path = model.getPaths()[0];
    const segments = path.getSegments();
    const bounds = await getBounds(segments, path);
    const routes = segments.map((segment, index) => new Route(getDuration(segment), getDistance(segment), bounds[index][0], bounds[index][1], {
        // @ts-ignore
        transports: segment.properties.get("transports", []).map((it) => {
            return { name: it.name, type: it.type };
        }),
        // @ts-ignore
        text: segment.properties.get("text", ""),
    }, TransportType.publicTransport));
    return new MultiRoute(routes);
}
async function YAPIRouteToMultiDriving(route) {
    console.log(route);
    let model = route.model;
    const path = model.getPaths()[0];
    const segments = path.getSegments();
    const bounds = await getBounds(segments, path);
    const routes = segments.map((segment, index) => new Route(getDuration(segment), getDistance(segment), bounds[index][0], bounds[index][1], {}, TransportType.car));
    return new MultiRoute(routes);
}
async function getRoutes(waypoints, params) {
    let YaRoutes = await getYAMultiRoutes(waypoints, params);
    const mRoutes = await Promise.all(YaRoutes.map((it, index) => {
        if (it === null)
            return null;
        if (YaRoutes.length >= 2) {
            if (index == 0) {
                // @ts-ignore
                return YAPIRouteToMultiDriving(it);
            }
            else if (index == 1) {
                // @ts-ignore
                return YAPIRouteToMultiRoutePublicTransport(it);
            }
        }
        else if (YaRoutes.length == 1) {
            // TODO
        }
        // @ts-ignore
        return YAPIRouteToMultiDriving(it);
    }));
    return new PossibleRoutes(mRoutes.filter((a) => a !== null));
}
function getYAMultiRoutes(waypoints, params) {
    return Promise.all([TransportType.car, TransportType.publicTransport]
        .filter(value => !params.exclusions.has(value))
        .map((value) => {
        console.log(value);
        console.log(waypoints.map(value => value.name));
        // @ts-ignore
        const multiRoute = new ymaps.multiRouter.MultiRoute({
            referencePoints: waypoints.map(value => value.name),
            params: {
                results: 1,
                routingMode: value
            },
        });
        return new Promise((resolve, reject) => {
            multiRoute.model.events.add('requestsuccess', function () {
                resolve(multiRoute.getActiveRoute());
            });
        });
    }));
}
function getAutoRoute(points) {
    // @ts-ignore
    const multiRoute = new ymaps.multiRouter.MultiRoute({
        referencePoints: points,
        params: {
            results: 1,
            routingMode: TransportType.car
        },
    });
    return new Promise((resolve, reject) => {
        multiRoute.model.events.add('requestsuccess', function () {
            let route = multiRoute.getActiveRoute();
            if (!route) {
                resolve(null);
                return;
            }
            YAPIRouteToMultiDriving(route).then((value) => {
                resolve(value.path);
            });
        });
    });
}
let mockData;
ymaps.ready(() => {
    mockData = new PossibleRoutes([
        new MultiRoute([
            new Route(123, 180, {
                name: "Транспортная улица, 20В",
                coordinates: [0, 0]
            }, {
                name: "посёлок городского типа Березовка",
                coordinates: [0, 0]
            }, {}, TransportType.car)
        ]),
        new MultiRoute([
            new Route(10, 0.520, {
                name: "Транспортная улица, 20В",
                coordinates: [0, 0]
            }, {
                name: "Саянская",
                coordinates: [0, 0]
            }, {}, TransportType.pedestrian),
            new Route(170, 40, {
                name: "Саянская",
                coordinates: [0, 0]
            }, {
                name: "Красноярск-Пасс.",
                coordinates: [0, 0]
            }, {
                description: "Электричка А — Б"
            }, TransportType.publicTransport),
            new Route(17, 5, {
                name: "Железнодорожный вокзал",
                coordinates: [0, 0]
            }, {
                name: "Междугородный автовокзал",
                coordinates: [0, 0]
            }, {
                description: "Автобус 81"
            }, TransportType.publicTransport),
            new Route(21, 4, {
                name: "Красноярск",
                coordinates: [0, 0]
            }, {
                name: "Березовка, перекресток",
                coordinates: [0, 0]
            }, {
                description: "Автобус Красноярск — Канск"
            }, TransportType.publicTransport)
        ]),
        new MultiRoute([
            new Route(101, 60, {
                name: "Транспортная улица, 20В",
                coordinates: [0, 0]
            }, {
                name: "Саянская",
                coordinates: [0, 0]
            }, {}, TransportType.pedestrian),
            new Route(17, 12, {
                name: "Саянская",
                coordinates: [0, 0]
            }, {
                name: "Красноярск-Пасс.",
                coordinates: [0, 0]
            }, {
                description: "Электричка А — Б"
            }, TransportType.publicTransport),
            new Route(17, 5, {
                name: "Железнодорожный вокзал",
                coordinates: [0, 0]
            }, {
                name: "Междугородный автовокзал",
                coordinates: [0, 0]
            }, {
                description: "Автобус 81"
            }, TransportType.publicTransport),
            new Route(21, 8, {
                name: "Красноярск",
                coordinates: [0, 0]
            }, {
                name: "Березовка, перекресток",
                coordinates: [0, 0]
            }, {
                description: "Автобус Красноярск — Канск"
            }, TransportType.publicTransport)
        ])
    ]);
    mockData.build().then(r => { console.log("Builded mock"); });
});
