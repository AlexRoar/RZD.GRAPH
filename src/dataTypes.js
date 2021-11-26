"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PossibleRoutes = exports.MultiRoute = exports.TransportType = void 0;
var TransportType;
(function (TransportType) {
    TransportType[TransportType["train"] = 0] = "train";
    TransportType["publicTransport"] = "masstransit";
    TransportType["car"] = "auto";
    TransportType["pedestrian"] = "pedestrian";
})(TransportType = exports.TransportType || (exports.TransportType = {}));
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
exports.MultiRoute = MultiRoute;
class PossibleRoutes {
    constructor(allRoutes) {
        this.others = [];
    }
}
exports.PossibleRoutes = PossibleRoutes;
