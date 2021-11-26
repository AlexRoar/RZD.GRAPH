function init() {
    var myMap = new ymaps.Map('map', {
        center: [55.74, 37.58],
        zoom: 13,
        controls: []
    });

    // Создадим экземпляр элемента управления «поиск по карте»
    // с установленной опцией провайдера данных для поиска по организациям.
    var searchControl = new ymaps.control.SearchControl({
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

ymaps.ready(init);

