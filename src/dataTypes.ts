import ymaps from "yandex-maps";

export interface WayPoint {
    name: string
}

export interface GeoLocation {
    lat: number,
    lon: number
}

export enum TransportType {
    train,
    publicTransport = "masstransit",
    car = "auto",
    pedestrian = "pedestrian"
}

export interface RequestParams {
    datetime: Date
    exclusions: Set<TransportType>
}

export class MultiRoute {
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

export interface RoutePoint {
    coordinates: { lat: number, lon: number }
    name: string
}

export interface Route {
    duration: number
    distance: number
    price: number
    hiddenPrice: number

    startPoint: RoutePoint
    endPoint: RoutePoint
    info: object
}

export class PossibleRoutes {
    fast?: MultiRoute
    cheap?: MultiRoute
    best?: MultiRoute

    others: MultiRoute[] = []

    constructor(allRoutes: MultiRoute[]) {

    }
}

export interface YAPISearchControlEntity {
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

export type YAPIRoute = ymaps.multiRouter.driving.Route | ymaps.multiRouter.masstransit.Route | object


