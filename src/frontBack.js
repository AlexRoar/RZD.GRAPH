"use strict";
var TransportType;
(function (TransportType) {
    TransportType[TransportType["train"] = 0] = "train";
    TransportType[TransportType["publicTransport"] = 1] = "publicTransport";
    TransportType[TransportType["car"] = 2] = "car";
    TransportType[TransportType["pedestrian"] = 3] = "pedestrian";
})(TransportType || (TransportType = {}));
function getRoute(waypoints, params) {
}
