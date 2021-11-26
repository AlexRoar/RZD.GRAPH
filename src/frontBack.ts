import ymaps, {driving, masstransit} from "yandex-maps";

interface WayPoint {
    name: string
}

interface GeoLocation {
    lat: number,
    lon: number
}

enum TransportType {
    train,
    publicTransport = "masstransit",
    car = "auto",
    pedestrian = "pedestrian"
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

function getRoutes(waypoints: WayPoint[], params: RequestParams): PossibleRoutes {

}

type YAPIRoute = ymaps.multiRouter.driving.Route | ymaps.multiRouter.masstransit.Route | object

function getYAMultiRoutes(waypoints: WayPoint[], params: RequestParams): YAPIRoute[] {
    return [TransportType.car, TransportType.publicTransport, TransportType.pedestrian]
        .filter(value => !params.exclusions.has(value))
        .map(() => new ymaps.multiRouter.MultiRoute({
                referencePoints: waypoints.map(value => value.name),
                params: {
                    results: 1
                }
            })
        );
}

/**
 *
 * @param userPoint user's location
 * @param range in degrees
 */
function getStations(userPoint: GeoLocation, range: number): YAPI /* TODO */ {
    const searchControl = new ymaps.control.SearchControl({
        options: {
            provider: 'yandex#search',
            boundedBy: [[55.918502, 37.517399], [55.937514, 37.533705]]
        }
    });

    myMap.controls.add(searchControl);

    // Программно выполним поиск определённых кафе в текущей
    // прямоугольной области карты.


    searchControl.search('станция').then(function () {
        var geoObjectsArray = searchControl.getResultsArray();
        if (geoObjectsArray.length) {
            // Выводит свойство name первого геообъекта из результатов запроса.
            console.log(geoObjectsArray);
        }
    });
}

/**
 *
 * @param firstStation
 * @param secondStation
 * @param date
 */
function getSchedule(firstStation: string, secondStation: string, date: Date): TrainSchedule[] /* TODO */ {

}

