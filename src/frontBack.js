"use strict";
var TransportType;
(function (TransportType) {
    TransportType[TransportType["train"] = 0] = "train";
    TransportType[TransportType["publicTransport"] = 1] = "publicTransport";
    TransportType[TransportType["car"] = 2] = "car";
    TransportType[TransportType["pedestrian"] = 3] = "pedestrian";
})(TransportType || (TransportType = {}));
class MultiRoute {
    constructor() {
        this.duration = 0;
        this.distance = 0;
        this.price = 0;
        this.hiddenPrice = 0;
        this.path = [];
    }
    calcParameters() {
    }
}
class PossibleRoutes {
    constructor(allRoutes) {
        this.others = [];
    }
}
function getRoutes(waypoints, params) {
}
function getYAMultiRoutes(waypoints, params) {
    return [];
}
/**
 *
 * @param userPoint user's location
 * @param range in degrees
 */
function getStations(userPoint, range) {
}
/**
 *
 * @param firstStation
 * @param secondStation
 * @param date
 */
function getSchedule(firstStation, secondStation, date) {
}
