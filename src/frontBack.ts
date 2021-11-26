import ymaps from "yandex-maps";
import {
    WayPoint,
    GeoLocation,
    PossibleRoutes,
    RequestParams,
    TransportType,
    YAPIRoute,
    YAPISearchControlEntity
} from "./dataTypes";

function getRoutes(waypoints: WayPoint[], params: RequestParams): PossibleRoutes {

}

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
        for(const discriminator of namesDiscriminator) {
            for(const catWord of element.properties._data.categoriesText.split(' ')){
                if(catWord.toLowerCase().includes(discriminator.toLowerCase())) {
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

}

