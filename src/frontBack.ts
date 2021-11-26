interface WayPoint {
    name: string
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

interface MultiRoute {
    duration: number
    distance: number
    price: number
    hiddenPrice: number

    path: Route[]
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

interface PossibleRoutes {
    fast: MultiRoute
    cheap: MultiRoute
    best: MultiRoute

    others: MultiRoute[]
}

function getRoute(waypoints: WayPoint[], params: RequestParams): PossibleRoutes {
    return {};
}