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
    duration: number
    distance: number = 0
    price: number = 0
    hiddenPrice: number = 0

    path: Route[] = []

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

    duration: number = 0
    distance: number = 0
    price: number = 0
    hiddenPrice: number = 0

    startPoint: RoutePoint = {coordinates: {lat: 0, lon: 0}, name: ""}
    endPoint: RoutePoint = {coordinates: {lat: 0, lon: 0}, name: ""}
    info: object = {}
    type: TransportType = TransportType.car

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
            case TransportType.train:
            case TransportType.publicTransport:
            case TransportType.pedestrian: {
                //the same
            }
        }
    }
}

class PossibleRoutes {
    fast?: MultiRoute
    cheap?: MultiRoute
    best?: MultiRoute

    others: MultiRoute[] = []

    constructor(allRoutes: MultiRoute[]) {
        if (allRoutes.length == 0)
            return

        allRoutes = allRoutes.sort((a, b) => a.duration - b.duration)
        this.fast = allRoutes[0]
        allRoutes = allRoutes.sort((a, b) => a.countType(TransportType.pedestrian) - a.countType(TransportType.pedestrian))
        allRoutes = allRoutes.sort((a, b) => a.countType(TransportType.train) - a.countType(TransportType.train))
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

type YAPIRoute = ymaps.multiRouter.driving.Route | ymaps.multiRouter.masstransit.Route | object

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

/**
 * Get railway stations nearby userPoint location
 * @param userPoint user's location
 * @param range in degrees
 */
async function getStations(userPoint: GeoLocation, range: number = 0.1): Promise<YAPISearchControlEntity[]> {
    const searchControl = new ymaps.control.SearchControl({
        options: {
            provider: 'yandex#search',
            boundedBy: [[userPoint.lat - range, userPoint.lon - range], [userPoint.lat + range, userPoint.lon + range]],
        }
    });

    const namesDiscriminator = new Set<string>(['железнодорож', 'вокзал', 'станция'])
    const findStations = new Set<string>(['железнодорожная', 'станция', 'платформа'])
    let allResults: YAPISearchControlEntity[] = []

    for (const searchString of findStations) {
        await searchControl.search(searchString)
        const geoObjectsArray = searchControl.getResultsArray();
        allResults = allResults.concat(geoObjectsArray as YAPISearchControlEntity[])

    }
    // console.log(allResults)
    allResults = allResults.filter((element, index) => {
        for (const discriminator of namesDiscriminator) {
            if (!element.properties._data.categoriesText) {
                // console.log(element)
                return false
            }
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
    ])
])
