interface WayPoint {
    name: string
}

interface GeoLocation {
    lat: number,
    lon: number
}

enum TransportType {
    train,
    publicTransport,
    car,
    pedestrian
}

interface RequestParams {
    datetime: Date
    exclusions: Set<TransportType>
}

class MultiRoute {
    duration: number = 0
    distance: number = 0
    price: number = 0
    hiddenPrice: number = 0

    path: Route[] = []

    constructor() {

    }

    private calcParameters() {

    }
}

interface RoutePoint {
    coordinates: { lat: number, lon: number }
    name: string
}

interface Route {
    duration: number
    distance: number
    price: number
    hiddenPrice: number

    startPoint: RoutePoint
    endPoint: RoutePoint
    info: object
}

class PossibleRoutes {
    fast?: MultiRoute
    cheap?: MultiRoute
    best?: MultiRoute

    others: MultiRoute[] = []

    constructor(allRoutes: MultiRoute[]) {

    }
}

interface YAPIDrivingRoute {

}

interface YAPIPedestrianRoute {

}

interface YAPIMassTransitRoute {

}

type YAPIRoute = YAPIDrivingRoute | YAPIPedestrianRoute | YAPIMassTransitRoute

function getRoutes(waypoints: WayPoint[], params: RequestParams): PossibleRoutes {

}

function getYAMultiRoutes(waypoints: WayPoint[], params: RequestParams): YAPIRoute[] {
    return []
}

/**
 *
 * @param userPoint user's location
 * @param range in degrees
 */
function getStations(userPoint: GeoLocation, range: number): YAPI /* TODO */ {

}

/**
 *
 * @param firstStation
 * @param secondStation
 * @param date
 */
function getSchedule(firstStation: string, secondStation: string, date: Date): TrainSchedule[] /* TODO */ {

}

