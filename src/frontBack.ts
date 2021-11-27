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
    public duration: number
    public distance: number = 0
    public price: number = 0
    public hiddenPrice: number = 0

    public path: Route[] = []

    constructor(duration: number, distance: number, path: Route[]) {
        this.duration = duration
        this.distance = distance
        this.path = path

        this.calcParameters()
    }

    private calcParameters() {
        this.price = 0
        this.hiddenPrice = 0

        for (const routePart of this.path) {
            this.price += routePart.price
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
        allRoutes = allRoutes.sort((a, b) => a.path.length - b.path.length)
        this.others = allRoutes
        this.best = allRoutes[0]
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

function YAPIRouteToMultiRoute(route: YAPIRoute): MultiRoute {
    // @ts-ignore
    let model: ymaps.multiRouter.driving.RouteModel = route.model
    model.getPaths().flatMap(path => path.getSegments()).map(segment => new Route(Math.floor(segment.properties.get('duration', {
            text: "30 мин",
            value: 60 * 30
            // @ts-ignore
        }).value / 60),
        new Route(Math.floor(segment.properties.get('distance', {
            text: "1 км",
            value: 1000
            // @ts-ignore
        }).value / 1000)), {coordinates: {lat: path.}}
    ))
    return new MultiRoute(Math.floor(route.properties.get('duration', {
        text: "30 мин",
        value: 60 * 30
        // @ts-ignore
    }).value / 60), Math.floor(route.properties.get('distance', {text: "1 км", value: 1000}).value / 1000), []);
}

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
    new MultiRoute(115, 150, [
        new Route(115, 150,
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
            }, {
                duration: 115
            }, TransportType.car)
    ]),
    new MultiRoute(110, 98, [
        new Route(115, 0.520,
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
            }, {
                duration: 115
            }, TransportType.pedestrian),
        new Route(210, 0,
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
                duration: 210
            }, TransportType.pedestrian),
        new Route(17, 0,
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
                duration: 17,
                description: "Автобус 81"
            }, TransportType.publicTransport),
        new Route(21, 0,
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
                duration: 21,
                description: "Автобус Красноярск — Канск"
            }, TransportType.publicTransport)
    ]),
    new MultiRoute(110, 98, [
        new Route(1071, 0,
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
            }, {
                duration: 115
            }, TransportType.pedestrian),
        new Route(210, 0,
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
                duration: 210
            }, TransportType.publicTransport),
        new Route(17, 0,
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
                duration: 17,
                description: "Автобус 81"
            }, TransportType.publicTransport),
        new Route(21, 0,
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
                duration: 21,
                description: "Автобус Красноярск — Канск"
            }, TransportType.publicTransport)
    ])
])
