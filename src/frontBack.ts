import type ymaps from "yandex-maps";

interface WayPoint {
    name: string
}

interface GeoLocation {
    lat: number,
    lon: number
}

enum TransportType {
    publicTransport = "masstransit",
    car = "auto",
    pedestrian = "pedestrian"
}

interface RequestParams {
    datetime: Date
    exclusions: Set<TransportType>
}

class MultiRoute {
    public duration: number = 0
    public distance: number = 0
    public price: number = 0
    public hiddenPrice: number = 0

    public path: Route[] = []

    constructor(path: Route[]) {
        this.path = path
        this.calcParameters()
    }

    private calcParameters() {
        this.price = 0
        this.hiddenPrice = 0
        this.duration = 0
        this.distance = 0

        console.log("New calc")
        for (const routePart of this.path) {
            console.log(routePart)
            this.price += routePart.price
            this.duration += routePart.duration
            this.distance += routePart.distance
        }
    }

    public countType(type: TransportType): number {
        return this.path.map((value) => {
            return (value.type == type) ? 1 : 0 as number
        })
            .reduce(((previousValue, currentValue) => previousValue + currentValue))
    }
}

interface RoutePoint {
    coordinates: { lat: number, lon: number }
    name: string
}

interface TrainSchedule {

}

class Route {
    private rates = {
        simpleCar: 9,
        cargoCar: 11,
        driver: 480,
        worker: 710
    }

    public duration: number = 0
    public distance: number = 0
    public price: number = 0
    public hiddenPrice: number = 0

    public startPoint: RoutePoint = {coordinates: {lat: 0, lon: 0}, name: ""}
    public endPoint: RoutePoint = {coordinates: {lat: 0, lon: 0}, name: ""}
    public info: object = {}
    public type: TransportType = TransportType.car

    constructor(duration: number,
                distance: number,
                startPoint: RoutePoint,
                endPoint: RoutePoint,
                info: object = {},
                type: TransportType) {
        this.duration = duration
        this.distance = distance
        this.startPoint = startPoint
        this.endPoint = endPoint
        this.info = info
        this.type = type

        this.price += this.duration * this.rates.worker / 60
        switch (this.type) {
            case TransportType.car: {
                this.price += this.distance * this.rates.simpleCar
                this.price += this.duration * this.rates.driver / 60
                break
            }
            case TransportType.publicTransport:
            case TransportType.pedestrian: {
                //the same
            }
        }
    }
}

class PossibleRoutes {
    public fast?: MultiRoute
    public cheap?: MultiRoute
    public best?: MultiRoute
    public car?: MultiRoute

    public others: MultiRoute[] = []

    constructor(allRoutes: MultiRoute[]) {
        if (allRoutes.length == 0)
            return

        allRoutes = allRoutes.sort((a, b) => a.duration - b.duration)
        this.fast = allRoutes[0]
        allRoutes = allRoutes.sort((a, b) => a.countType(TransportType.pedestrian) - a.countType(TransportType.pedestrian))
        allRoutes = allRoutes.sort((a, b) => a.countType(TransportType.publicTransport) - a.countType(TransportType.publicTransport))
        allRoutes = allRoutes.sort((a, b) => a.price - b.price)
        this.cheap = allRoutes[0]
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
            let res = 0
            res += (a.path.length - b.path.length) * 0.2 / maxPath
            res += (a.price - b.price) * 0.8 / maxPrice
            res += (a.duration - b.duration) * 0.5 / maxTime
            return res
        })
        this.others = allRoutes
        this.best = allRoutes[0]

        let carOnly = allRoutes.filter((a) => a.countType(TransportType.car) == a.path.length)
        if (carOnly.length)
            this.car = carOnly[0]
    }
}

interface YAPISearchControlEntity {
    geometry: {
        _coordinates: number[],
        _bounds: number[][]
    }
    properties: {
        _data: {
            address: string,
            categories: string[],
            categoriesText: string,
            description: string
        }
    }
}

interface YAPIPedestrianRoute {
    properties: IDataManager;
}

type YAPIRoute = ymaps.multiRouter.driving.Route | ymaps.multiRouter.masstransit.Route | YAPIPedestrianRoute


function getRoutes(waypoints: WayPoint[], params: RequestParams): PossibleRoutes {
    let YaRoutes = getYAMultiRoutes(waypoints, params);

    return new PossibleRoutes([])
}

function getYAMultiRoutes(waypoints: WayPoint[], params: RequestParams): Promise<YAPIRoute[]> {
    let myMap = new ymaps.Map('map', {
        center: [55.751574, 37.573856],
        zoom: 9,
        controls: []
    });
    return Promise.all([TransportType.car, TransportType.publicTransport, TransportType.pedestrian]
        .filter(value => !params.exclusions.has(value))
        .map((value): Promise<YAPIRoute> => {
            console.log(value);
            console.log(waypoints.map(value => value.name))
            // @ts-ignore
            const multiRoute = new ymaps.multiRouter.MultiRoute({
                referencePoints: waypoints.map(value => value.name),
                params: {
                    results: 1,
                    // @ts-ignore
                    routingMode: value
                },
            });
            const result = new Promise((resolve: (_: YAPIRoute) => void, reject) => {
                multiRoute.model.events.add('requestsuccess', function () {
                    resolve(multiRoute.getActiveRoute()!);
                })
            });

            myMap.geoObjects.add(multiRoute);
            return result;
        }));
}


const mockData: PossibleRoutes = new PossibleRoutes([
    new MultiRoute([
        new Route(123, 180,
            {
                name: "Транспортная улица, 20В",
                coordinates: {
                    lat: 0, lon: 0
                }
            }, {
                name: "посёлок городского типа Березовка",
                coordinates: {
                    lat: 0, lon: 0
                }
            }, {}, TransportType.car)
    ]),
    new MultiRoute([
        new Route(10, 0.520,
            {
                name: "Транспортная улица, 20В",
                coordinates: {
                    lat: 0, lon: 0
                }
            }, {
                name: "Саянская",
                coordinates: {
                    lat: 0, lon: 0
                }
            }, {}, TransportType.pedestrian),
        new Route(170, 40,
            {
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
                description: "Электричка А — Б"
            }, TransportType.publicTransport),
        new Route(17, 5,
            {
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
                description: "Автобус 81"
            }, TransportType.publicTransport),
        new Route(21, 4,
            {
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
                description: "Автобус Красноярск — Канск"
            }, TransportType.publicTransport)
    ]),
    new MultiRoute([
        new Route(101, 60,
            {
                name: "Транспортная улица, 20В",
                coordinates: {
                    lat: 0, lon: 0
                }
            }, {
                name: "Саянская",
                coordinates: {
                    lat: 0, lon: 0
                }
            }, {}, TransportType.pedestrian),
        new Route(17, 12,
            {
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
                description: "Электричка А — Б"
            }, TransportType.publicTransport),
        new Route(17, 5,
            {
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
                description: "Автобус 81"
            }, TransportType.publicTransport),
        new Route(21, 8,
            {
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
                description: "Автобус Красноярск — Канск"
            }, TransportType.publicTransport)
    ])
])
