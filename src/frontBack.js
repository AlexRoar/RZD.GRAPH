"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const yandex_maps_1 = __importDefault(require("yandex-maps"));
const dataTypes_1 = require("./dataTypes");
function getRoutes(waypoints, params) {
}
function getYAMultiRoutes(waypoints, params) {
    return [dataTypes_1.TransportType.car, dataTypes_1.TransportType.publicTransport, dataTypes_1.TransportType.pedestrian]
        .filter(value => !params.exclusions.has(value))
        .map(() => new yandex_maps_1.default.multiRouter.MultiRoute({
        referencePoints: waypoints.map(value => value.name),
        params: {
            results: 1
        }
    }));
}
/**
 * Get railway stations nearby userPoint location
 * @param userPoint user's location
 * @param range in degrees
 */
function getStations(userPoint, range) {
    const searchControl = new yandex_maps_1.default.control.SearchControl({
        options: {
            provider: 'yandex#search',
            boundedBy: [[userPoint.lat - range, userPoint.lon - range], [userPoint.lat + range, userPoint.lon + range]]
        }
    });
    const namesDiscriminator = new Set(['железнодорож', 'вокзал', 'станция']);
    const findStations = new Set(['железнодорожная', 'станция', 'платформа']);
    let allResults = [];
    for (const searchString of findStations) {
        searchControl.search(searchString).then(function () {
            const geoObjectsArray = searchControl.getResultsArray();
            allResults = allResults.concat(geoObjectsArray);
        });
    }
    allResults = allResults.filter((element, index) => {
        for (const discriminator of namesDiscriminator) {
            for (const catWord of element.properties._data.categoriesText.split(' ')) {
                if (catWord.toLowerCase().includes(discriminator.toLowerCase())) {
                    return true;
                }
            }
        }
        return false;
    });
    return allResults;
}
/**
 *
 * @param firstStation
 * @param secondStation
 * @param date
 */
function getSchedule(firstStation, secondStation, date) {
}
