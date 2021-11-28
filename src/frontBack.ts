import type ymaps from "yandex-maps";
import type {IDataManager} from "yandex-maps";

interface WayPoint {
    name: string
}

type GeoLocation = number[]
let DATE = new Date()

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
    public isCar: boolean = false

    public path: Route[] = []

    public yapi: YAPIRoute[] = []

    constructor(path: Route[], isCar: boolean = false, yapi: YAPIRoute[] = []) {
        this.path = path;
        this.isCar = isCar;
        this.yapi = yapi;
        this.calcParameters();
    }

    public show(map: ymaps.Map) {
        map.geoObjects.removeAll();
        for (let route of this.yapi) {
            map.geoObjects.add(route);
        }
        map.setBounds(map.geoObjects.getBounds()!);
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
            let fromStart = await getAutoRoute([this.path[0].startPoint.coordinates, specialPoint]);
            console.log("fromStart", [this.path[0].startPoint.coordinates, specialPoint]);
            if (fromStart !== null) {
                console.log("enter");
                let fromSpecial = await getRoutes([{name: await getAddress(specialPoint)}, {name: await getAddress(this.path[this.path.length - 1].endPoint.coordinates)}], {
                    datetime: DATE,
                    exclusions: new Set()
                });
                for (const partial of fromSpecial.others) {
                    if (!partial)
                        continue
                    if (partial.path.length === 0) continue;
                    special.push(new MultiRoute(fromStart.path.concat(partial.path), false, fromStart.yapi.concat(partial.yapi)))
                }
            }
            let toEnd = await getAutoRoute([specialPoint, this.path[this.path.length - 1].endPoint.coordinates]);
            console.log("toEnd", [specialPoint, this.path[this.path.length - 1].endPoint.coordinates], toEnd);
            if (toEnd !== null) {
                console.log("To special", [this.path[0].startPoint, {name: await getAddress(specialPoint)}])
                let toSpecial = await getRoutes([{name: await getAddress(this.path[0].startPoint.coordinates)}, {name: await getAddress(specialPoint)}], {
                    datetime: DATE,
                    exclusions: new Set()
                });
                for (const partial of toSpecial.others) {
                    if (!partial)
                        continue
                    console.log("PArt", partial.path, toEnd);
                    if (partial.path.length === 0)
                        continue;
                    special.push(new MultiRoute(partial.path.concat(toEnd.path), false, toEnd.yapi.concat(partial.yapi)))
                }
            }

        }

        console.log("Special", special)
        return special
    }

    async expandWays(): Promise<MultiRoute[]> {
        let expanded = await this.expandSpecialPoints()
        if (this.isCar)
            return expanded
        // let expanded = []
        let segmentPair = [0, 0]
        let segments: number[][] = [];

        for (let i = 0; i < this.path.length; i++) {
            // @ts-ignore
            if (this.path[i].info.type === "walk" ||
                // @ts-ignore
                this.path[i].info.transports && this.path[i].info.transports.length > 0 &&
                this.path[i].type === TransportType.publicTransport &&
                // @ts-ignore
                this.path[i].info.transports[0].type === "bus") {
                segmentPair[1] += 1
            } else {
                segments.push(segmentPair)
                segmentPair = [i, i]
            }
        }

        console.log(segments, this)

        for (const segment of segments) {
            let firstPart = await getAutoRoute([
                this.path[segment[0]].startPoint.coordinates,
                this.path[segment[1]].endPoint.coordinates
            ])
            if (firstPart === null)
                continue
            console.log(firstPart)
            const pathFinal = this.path.slice(0, segment[0]).concat(firstPart.path).concat(this.path.slice(segment[1] + 1))
            expanded.push(new MultiRoute(pathFinal, false)) // todo mb crash
        }

        console.log(expanded)
        return expanded
    }
}

interface RoutePoint {
    coordinates: GeoLocation
    name: string
}

class Route {
    private rates = {
        simpleCar: 10,
        cargoCar: 11,
        driver: 490,
        worker: 700
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
        const start = allRoutes[0].path[0].startPoint.coordinates
        const end = allRoutes[0].path[allRoutes[0].path.length - 1].endPoint.coordinates
        const cacheKey = createCacheKey(start, end)
        console.log("CACHE", cacheKey)
        const cached = cache.hardCache[cacheKey]
        if (cached) {
            this.others = cached.others
            this.car = cached.car
            this.best = cached.best
            this.fast = cached.fast
            this.cheap = cached.cheap
        } else {
            this.others = allRoutes
        }
    }

    async build() {
        if (this.best)
            return
        const start = this.others[0].path[0].startPoint.coordinates
        const end = this.others[0].path[this.others[0].path.length - 1].endPoint.coordinates
        const cacheKey = createCacheKey(start, end)
        let allRoutes = this.others.concat(await this.imitateBetterWays(this.others))

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
            res += (a.path.length - b.path.length) * 0.05 / maxPath
            res += (a.price - b.price) * 0.85 / maxPrice
            res += (a.duration - b.duration) * 0.3 / maxTime
            return res
        })
        this.others = allRoutes
        this.best = allRoutes[0]

        let carOnly = allRoutes.filter((a) => a.countType(TransportType.car) == a.path.length)
        if (carOnly.length)
            this.car = carOnly[0]

        // @ts-ignore
        // cache.hardCache[cacheKey] = this
        // saveCache()
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

type YAPIRoute = ymaps.multiRouter.driving.Route | ymaps.multiRouter.masstransit.Route

type SegmentModel =
    ymaps.multiRouter.masstransit.TransferSegmentModel
    | ymaps.multiRouter.masstransit.TransportSegmentModel
    | ymaps.multiRouter.masstransit.WalkSegmentModel
    | ymaps.multiRouter.driving.SegmentModel

const specialPoints: GeoLocation[] = [
    [55.805913, 94.329253], // Уяр
    [55.545684, 94.702848], // Саянская
    [56.005599, 92.830408]  // Красноярск
];

interface APICache {
    _ways: string
    _hardCache: string
    ways: object
    hardCache: object
}

const _cache = window.localStorage as unknown as APICache

const cache = {} as APICache

if (!_cache.ways)
    cache.ways = {}
else
    cache.ways = JSON.parse(_cache._ways)

if (!_cache.hardCache)
    cache.hardCache = {}
else
    cache.hardCache = JSON.parse(_cache._hardCache)
saveCache()

function saveCache() {
    _cache._ways = JSON.stringify(cache.ways)
    _cache._hardCache = JSON.stringify(cache.hardCache)
}

function clearCache() {
    cache.ways = {}
    cache.hardCache = {}
    saveCache()
}

function createCacheKey(start: GeoLocation, end: GeoLocation) {
    return start.join(",") + "—" + end.join(",")
}

function simplifyMultiRoute(mRoute: MultiRoute): MultiRoute {
    const paths = mRoute.path;
    if (paths.length == 0)
        return mRoute;
    let newPath = [];
    let isPrevCar = paths[0].type === TransportType.car;
    let prev: Route = paths[0];
    for (let i = 1; i < paths.length; i++) {
        if (paths[i].type !== TransportType.car) {
            if (isPrevCar) {
                newPath.push(prev);
            }
            prev = paths[i];
            isPrevCar = false;
            newPath.push(paths[i]);
            continue;
        }
        if (isPrevCar) {
            prev = new Route(paths[i].duration + prev.duration,
                paths[i].distance + prev.distance, prev.startPoint,
                paths[i].endPoint, {}, TransportType.car);
        } else {
            isPrevCar = true;
            prev = paths[i];
        }
    }
    if (isPrevCar) {
        newPath.push(prev);
    }
    mRoute.path = newPath;
    return mRoute;
}

function getDistance(segment: SegmentModel): number {
    // @ts-ignore
    return segment.properties.get('distance', {
        text: "1 км",
        value: 1000
    }).value / 1000;
}

function getDuration(segment: SegmentModel): number {
    // @ts-ignore
    return segment.properties.get('duration', {
        text: "30 мин",
        value: 60
        // @ts-ignore
    }).value / 60;
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

        if (segment.properties.get("type", "driving") === "driving") {
            result.push([{
                coordinates: prev.map(it => it.valueOf()),
                // @ts-ignore
                name: segment.properties.get("text", "")
            }, {
                coordinates: cur.map(it => it.valueOf()),
                // @ts-ignore
                name: segment.properties.get("text", "")
            }]);
        } else {
            result.push([{
                coordinates: prev.map(it => it.valueOf()),
                name: await getAddress(prev.map(it => it.valueOf()))
            }, {
                coordinates: cur.map(it => it.valueOf()),
                name: await getAddress(cur.map(it => it.valueOf()))
            }]);
        }

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
            type: segment.properties.get("type", "transport"),
            // @ts-ignore
            transports: segment.properties.get("transports", []).map((it: { name: string; type: string; }) => {
                return {name: it.name, type: it.type}
            }),
            // @ts-ignore
            text: segment.properties.get("text", ""),
        }, TransportType.publicTransport));
    return new MultiRoute(routes, false, [route]);
}

async function YAPIRouteToMultiDriving(route: ymaps.multiRouter.driving.Route): Promise<MultiRoute> {
    let model: ymaps.multiRouter.driving.RouteModel = route.model
    const path = model.getPaths()[0];
    const segments = path.getSegments();
    const bounds = await getBounds(segments, path);
    const routes = segments.map((segment, index) =>
        new Route(getDuration(segment), getDistance(segment), bounds[index][0], bounds[index][1], {}, TransportType.car));
    return new MultiRoute(routes, true, [route]);
}

async function getRoutes(waypoints: WayPoint[], params: RequestParams): Promise<PossibleRoutes> {
    let YaRoutes = await getYAMultiRoutes(waypoints, params);
    const mRoutes = await Promise.all(YaRoutes.map((it, index) => {
        if (it === null)
            return null
        if (YaRoutes.length >= 2) {
            if (index == 0) {
                // @ts-ignore
                return YAPIRouteToMultiDriving(it);
            } else if (index == 1) {
                // @ts-ignore
                return YAPIRouteToMultiRoutePublicTransport(it);
            }
        } else if (YaRoutes.length == 1) {
            // TODO
        }
        // @ts-ignore
        return YAPIRouteToMultiDriving(it);
    }));
    return new PossibleRoutes(mRoutes.filter((a) => a !== null) as MultiRoute[]);

}

function getYAMultiRoutes(waypoints: WayPoint[], params: RequestParams): Promise<YAPIRoute[]> {
    return Promise.all([TransportType.car, TransportType.publicTransport]
        .filter(value => !params.exclusions.has(value))
        .map((value: TransportType): Promise<YAPIRoute> => {
            // @ts-ignore
            const multiRoute = new ymaps.multiRouter.MultiRoute({
                referencePoints: waypoints.map(value => value.name),
                params: {
                    results: 1,
                    routingMode: value,
                    // @ts-ignore
                    activeRouteAutoSelection: true
                },
            });
            return new Promise((resolve: (_: YAPIRoute) => void, reject) => {
                multiRoute.model.events.add('requestsuccess', function () {
                    console.log("API Received", multiRoute, multiRoute.getRoutes())
                    resolve(multiRoute.getActiveRoute()!);
                })
            });
        }));
}


function getAutoRoute(points: GeoLocation[]): Promise<MultiRoute | null> {
    // @ts-ignore
    const multiRoute = new ymaps.multiRouter.MultiRoute({
        referencePoints: points,
        params: {
            results: 1,
            routingMode: TransportType.car
        },
    });
    return new Promise((resolve: (_: MultiRoute | null) => void, reject) => {
        multiRoute.model.events.add('requestsuccess', function () {
            let route = multiRoute.getActiveRoute()
            if (!route) {
                resolve(null)
                return;
            }
            YAPIRouteToMultiDriving(route as ymaps.multiRouter.driving.Route).then((value) => {
                resolve(value)
            })
        })
    });
}

