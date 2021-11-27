import type ymaps from "yandex-maps";
import type {IDataManager} from "yandex-maps";

interface WayPoint {
    name: string
}

type GeoLocation = number[]

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

    async expandSpecialPoints(): Promise<MultiRoute[]> {
        let special: MultiRoute[] = []

        for (const specialPoint of specialPoints) {
            for (let i = 0; i < this.path.length; i++) {
                for (let j = i; j < this.path.length; j++) {
                    let firstPart = await getAutoRoute([
                        this.path[i].startPoint.coordinates,
                        specialPoint,
                        this.path[j].endPoint.coordinates
                    ])
                    if (firstPart === null)
                        continue
                    const pathFinal = this.path.slice(0, i).concat(firstPart).concat(this.path.slice(j + 1))
                    special.push(new MultiRoute(pathFinal))
                }
            }
        }

        return special
    }

    async expandWays(): Promise<MultiRoute[]> {
        let expanded = await this.expandSpecialPoints()

        for (let i = 0; i < this.path.length; i++) {
            for (let j = i; j < this.path.length; j++) {
                let firstPart = await getAutoRoute([this.path[i].startPoint.coordinates, this.path[j].endPoint.coordinates])
                if (firstPart === null)
                    continue
                const pathFinal = this.path.slice(0, i).concat(firstPart).concat(this.path.slice(j + 1))
                expanded.push(new MultiRoute(pathFinal))
            }
        }
        return expanded
    }
}

interface RoutePoint {
    coordinates: GeoLocation
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

    public startPoint: RoutePoint = {coordinates: [0, 0], name: ""}
    public endPoint: RoutePoint = {coordinates: [0, 0], name: ""}
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

    async imitateBetterWays(allRoutes: MultiRoute[]): Promise<MultiRoute[]> {
        let resultWays = allRoutes

        for (const multiWay of allRoutes) {
            const expanded = await multiWay.expandWays()
            resultWays = resultWays.concat(expanded)
        }

        return resultWays
    }


    constructor(allRoutes: MultiRoute[]) {
        if (allRoutes.length == 0)
            return
        this.others = allRoutes
    }

    async build() {
        let allRoutes = await this.imitateBetterWays(this.others)

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

type SegmentModel =
    ymaps.multiRouter.masstransit.TransferSegmentModel
    | ymaps.multiRouter.masstransit.TransportSegmentModel
    | ymaps.multiRouter.masstransit.WalkSegmentModel
    | ymaps.multiRouter.driving.SegmentModel


const specialPoints: GeoLocation[] = [
    [55.805913, 94.329253], // Уяр
    [55.545684, 94.702848], // Саянская
];

function getDistance(segment: SegmentModel): number {
    // @ts-ignore
    return Math.floor(segment.properties.get('distance', {
        text: "1 км",
        value: 1000
    }).value / 1000);
}

function getDuration(segment: SegmentModel): number {
    // @ts-ignore
    return Math.floor(segment.properties.get('duration', {
        text: "30 мин",
        value: 60
        // @ts-ignore
    }).value / 60);
}

function getAddress(coords: number[]): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        // @ts-ignore
        ymaps.geocode(coords).then(function (res) {
            const firstGeoObject = res.geoObjects.get(0);
            resolve(firstGeoObject.getAddressLine());
        });
    });
}


async function getBounds(segments: SegmentModel[], path: ymaps.multiRouter.masstransit.PathModel | ymaps.multiRouter.driving.PathModel): Promise<RoutePoint[][]> {
    const coords: Number[][] = path.properties.get("coordinates", []) as Number[][];
    const result: RoutePoint[][] = [];
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
    result.push([{coordinates: prev.map(it => it.valueOf()), name: await getAddress(prev.map(it => it.valueOf()))}, {
        coordinates: last.map(it => it.valueOf()),
        name: await getAddress(last.map(n => n.valueOf()))
    }]);
    return result;
}

async function YAPIRouteToMultiRoutePublicTransport(route: ymaps.multiRouter.masstransit.Route): Promise<MultiRoute> {
    let model: ymaps.multiRouter.masstransit.RouteModel = route.model
    const path = model.getPaths()[0];
    const segments = path.getSegments();
    const bounds = await getBounds(segments, path);
    const routes = segments.map((segment, index) =>
        new Route(getDuration(segment), getDistance(segment), bounds[index][0], bounds[index][1], {
            // @ts-ignore
            transports: segment.properties.get("transports", []).map((it: { name: string; type: string; }) => {
                return {name: it.name, type: it.type}
            }),
            // @ts-ignore
            text: segment.properties.get("text", ""),
        }, TransportType.publicTransport));
    return new MultiRoute(routes);
}

async function YAPIRouteToMultiDriving(route: ymaps.multiRouter.driving.Route): Promise<MultiRoute> {
    // @ts-ignore
    let model: ymaps.multiRouter.driving.RouteModel = route.model
    const path = model.getPaths()[0];
    const segments = path.getSegments();
    const bounds = await getBounds(segments, path);
    const routes = segments.map((segment, index) =>
        new Route(getDuration(segment), getDistance(segment), bounds[index][0], bounds[index][1], {}, TransportType.publicTransport));
    return new MultiRoute(routes);
}

function getRoutes(waypoints: WayPoint[], params: RequestParams): PossibleRoutes {
    let YaRoutes = getYAMultiRoutes(waypoints, params);

    return new PossibleRoutes([])
}

function getYAMultiRoutes(waypoints: WayPoint[], params: RequestParams): Promise<YAPIRoute[]> {
    return Promise.all([TransportType.car, TransportType.publicTransport, TransportType.pedestrian]
        .filter(value => !params.exclusions.has(value))
        .map((value: TransportType): Promise<YAPIRoute> => {
            console.log(value);
            console.log(waypoints.map(value => value.name))
            // @ts-ignore
            const multiRoute = new ymaps.multiRouter.MultiRoute({
                referencePoints: waypoints.map(value => value.name),
                params: {
                    results: 1,
                    routingMode: value
                },
            });
            return new Promise((resolve: (_: YAPIRoute) => void, reject) => {
                multiRoute.model.events.add('requestsuccess', function () {
                    resolve(multiRoute.getActiveRoute()!);
                })
            });
        }));
}


function getAutoRoute(points: GeoLocation[]): Promise<Route[] | null> {
    // @ts-ignore
    const multiRoute = new ymaps.multiRouter.MultiRoute({
        referencePoints: points,
        params: {
            results: 1,
            routingMode: TransportType.car
        },
    });
    return new Promise( (resolve: (_: Route[] | null) => void, reject) => {
        multiRoute.model.events.add('requestsuccess', function () {
            let route = multiRoute.getActiveRoute()
            if (!route)
                resolve(null)
            YAPIRouteToMultiDriving(route as ymaps.multiRouter.driving.Route).then((value) => {
                resolve(value.path)
            })
        })
    });
}

const mockData: PossibleRoutes = new PossibleRoutes([
    new MultiRoute([
        new Route(123, 180,
            {
                name: "Транспортная улица, 20В",
                coordinates: [0, 0]
            }, {
                name: "посёлок городского типа Березовка",
                coordinates: [0, 0]
            }, {}, TransportType.car)
    ]),
    new MultiRoute([
        new Route(10, 0.520,
            {
                name: "Транспортная улица, 20В",
                coordinates: [0, 0]
            }, {
                name: "Саянская",
                coordinates: [0, 0]
            }, {}, TransportType.pedestrian),
        new Route(170, 40,
            {
                name: "Саянская",
                coordinates: [0, 0]
            }, {
                name: "Красноярск-Пасс.",
                coordinates: [0, 0]
            }, {
                description: "Электричка А — Б"
            }, TransportType.publicTransport),
        new Route(17, 5,
            {
                name: "Железнодорожный вокзал",
                coordinates: [0, 0]
            }, {
                name: "Междугородный автовокзал",
                coordinates: [0, 0]
            }, {
                description: "Автобус 81"
            }, TransportType.publicTransport),
        new Route(21, 4,
            {
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
        new Route(101, 60,
            {
                name: "Транспортная улица, 20В",
                coordinates: [0, 0]
            }, {
                name: "Саянская",
                coordinates: [0, 0]
            }, {}, TransportType.pedestrian),
        new Route(17, 12,
            {
                name: "Саянская",
                coordinates: [0, 0]
            }, {
                name: "Красноярск-Пасс.",
                coordinates: [0, 0]
            }, {
                description: "Электричка А — Б"
            }, TransportType.publicTransport),
        new Route(17, 5,
            {
                name: "Железнодорожный вокзал",
                coordinates: [0, 0]
            }, {
                name: "Междугородный автовокзал",
                coordinates: [0, 0]
            }, {
                description: "Автобус 81"
            }, TransportType.publicTransport),
        new Route(21, 8,
            {
                name: "Красноярск",
                coordinates: [0, 0]
            }, {
                name: "Березовка, перекресток",
                coordinates: [0, 0]
            }, {
                description: "Автобус Красноярск — Канск"
            }, TransportType.publicTransport)
    ])
])
