import type ymaps from "yandex-maps";

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

interface TrainSchedule {

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

type YAPIRoute = ymaps.multiRouter.driving.Route | ymaps.multiRouter.masstransit.Route | object

function getRoutes(waypoints: WayPoint[], params: RequestParams): PossibleRoutes {
    let YaRoutes = getYAMultiRoutes(waypoints, params);



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

/**
 * Get railway stations nearby userPoint location
 * @param userPoint user's location
 * @param range in degrees
 */
function getStations(userPoint: GeoLocation, range: number): YAPISearchControlEntity[] {
    const searchControl = new ymaps.control.SearchControl({
        options: {
            provider: 'yandex#search',
            boundedBy: [[userPoint.lat - range, userPoint.lon - range], [userPoint.lat + range, userPoint.lon + range]]
        }
    });

    const namesDiscriminator = new Set<string>(['железнодорож', 'вокзал', 'станция'])
    const findStations = new Set<string>(['железнодорожная', 'станция', 'платформа'])
    let allResults: YAPISearchControlEntity[] = []

    for (const searchString of findStations) {
        searchControl.search(searchString).then(function () {
            const geoObjectsArray = searchControl.getResultsArray();
            allResults = allResults.concat(geoObjectsArray as YAPISearchControlEntity[])
        });
    }

    allResults = allResults.filter((element, index) => {
        for (const discriminator of namesDiscriminator) {
            for (const catWord of element.properties._data.categoriesText.split(' ')) {
                if (catWord.toLowerCase().includes(discriminator.toLowerCase())) {
                    return true
                }
            }
        }
        return false
    })

    return allResults;
}

/**
 *
 * @param firstStation
 * @param secondStation
 * @param date
 */
function getSchedule(firstStation: string, secondStation: string, date: Date): TrainSchedule[] /* TODO */ {
    $.ajax({
        url: `https://kraspg.ru/r?from=${firstStation}&to=${secondStation}&date=${date.getDay()}.${date.getMonth()}.${date.getFullYear()}&search=%D0%9D%D0%B0%D0%B9%D1%82%D0%B8`,
        success: function (result) {
            const dom_nodes = $($.parseHTML(result));
        }
    });
}

