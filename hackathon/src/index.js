import { Map as Mapgl, IControl, AddLayerObject, Marker } from '../maplibre-gl-js/dist/maplibre-gl';

import './style.css';
import '../maplibre-gl-js/dist/maplibre-gl.css';
import '@watergis/mapbox-gl-valhalla/css/styles.css';
import controllPanel from './controllPanel';
import layersPanel from './layersPanel';
import * as turf from '@turf/turf';
import 'material-icons/iconfont/material-icons.css';

class Point {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
}

class Edge {
    constructor(start, end) {
        this.start = start || new Point(0, 0);
        this.end = end || new Point(0, 0);
    }
}

class VoronoiDiagram {
    constructor(points) {
        this.points = points;
        this.edges = [];
        this.cells = {};
    }

    create() {
        // Создаем начальную структуру для хранения ребер и ячеек
        for (let i = 0; i < this.points.length; i++) {
            const point = this.points[i];
            this.cells[point] = { edges: [], neighbors: [] };
        }
        console.log(this.cells);

        // Сортируем точки по координате Y
        this.points.sort((a, b) => a.y - b.y);

        let sweepLineY = this.points[0].y;
        let eventQueue = [...this.points];

        while (eventQueue.length > 0) {
            const nextEvent = eventQueue.shift();
            if (nextEvent instanceof Point) {
                this.handlePoint(nextEvent);
            } else {
                this.handleCircleEvent(nextEvent);
            }
        }
        console.log(this.edges);

        return this.edges;
    }

    handlePoint(point) {
        // Обрабатываем точку
    }

    handleCircleEvent(event) {
        // Обрабатываем событие круга
    }

    addEdge(edge) {
        this.edges.push(edge);
    }

    getVoronoiCell(point) {
        return this.cells[point];
    }
}

function area(poly) {
    var s = 0.0;
    if (!poly.coordinates) {
        var ring = poly[0];
    } else {
        var ring = poly.coordinates[0];
    }
    for (let i = 0; i < (ring.length - 1); i++) {
        s += (ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1]);
    }
    return 0.5 * s;
}

function centroid(poly) {
    var c = [0, 0];
    console.log(poly);
    if (!poly.coordinates) {
        var ring = poly[0];
    } else {
        var ring = poly.coordinates[0];
    }

    for (let i = 0; i < (ring.length - 1); i++) {
        c[0] += (ring[i][0] + ring[i + 1][0]) * (ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1]);
        c[1] += (ring[i][1] + ring[i + 1][1]) * (ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1]);
    }
    var a = area(poly);
    c[0] /= a * 6;
    c[1] /= a * 6;
    return c;
}

function centroidMulti(poly) {
    if (poly?.type === 'Feature' && poly?.geometry) {
        poly = poly.geometry;
    }
    return poly.coordinates.map(centroid)
        .reduce((r, pair) => {
            r[0].push(pair[0]);
            r[1].push(pair[1]);
            return r
        }, [[], []])
        .map((a) => a.reduce((p, c) => p + c, 0) / a.length);
}

function decodeGeoMap(str, precision) {
    var index = 0,
        lat = 0,
        lng = 0,
        coordinates = [],
        shift = 0,
        result = 0,
        byte = null,
        latitude_change,
        longitude_change,
        factor = Math.pow(10, precision || 6);

    // Coordinates have variable length when encoded, so just keep
    // track of whether we've hit the end of the string. In each
    // loop iteration, a single coordinate is decoded.
    while (index < str.length) {

        // Reset shift, result, and byte
        byte = null;
        shift = 0;
        result = 0;

        do {
            byte = str.charCodeAt(index++) - 63;
            result |= (byte & 0x1f) << shift;
            shift += 5;
        } while (byte >= 0x20);

        latitude_change = ((result & 1) ? ~(result >> 1) : (result >> 1));

        shift = result = 0;

        do {
            byte = str.charCodeAt(index++) - 63;
            result |= (byte & 0x1f) << shift;
            shift += 5;
        } while (byte >= 0x20);

        longitude_change = ((result & 1) ? ~(result >> 1) : (result >> 1));

        lat += latitude_change;
        lng += longitude_change;

        coordinates.push([lng / factor, lat / factor]);
    }

    return coordinates;
};


const MAPTILER_KEY = 'aeGkrJSdDcp34Gpzgrr5';



const map = new Mapgl({
    container: 'map',
    style: `https://api.maptiler.com/maps/basic-v2/style.json?key=${MAPTILER_KEY}`,
    center: [37.487777, 55.547169],
    hash: true,
    pitch: -108.2,

    zoom: 15.99,
    /*  pitch: 40,
     bearing: 20,
     antialias: true */
});


const controllPanel_ = new controllPanel();
var marker;

var markers_street = [];

var layers_streets_ids = [];
var source_streets_ids = [];

var layers_ids = [];
var source_ids = [];

var last_valhalla_data;

const prefixSource = "uploaded-source_";
const prefixLayer = "uploaded-polygons_";
const srcToGeo = "/geojsons/";

function renderOsm(data, layer) {
    let osm = [];
    osm['Point'] = [];
    osm['Polygon'] = [];
    osm['Line'] = [];
    data.features.forEach((i) => {
        if (i.geometry.type == "Point") {
            osm["Point"].push(i);
        }
        if (i.geometry.type == "Polygon" || i.geometry.type == "MultiPolygon") {
            osm["Polygon"].push(i);
        }
        if (i.geometry.type == "LineString") {
            osm["Line"].push(i);
        }
    });

    map.addSource(prefixSource + layer.src + '_circle', {
        'type': 'geojson',
        'data': {
            "type": "FeatureCollection",
            "features": osm["Point"],
        }
    });
    map.addSource(prefixSource + layer.src + '_line', {
        'type': 'geojson',
        'data': {
            "type": "FeatureCollection",
            "features": osm["Line"],
        }
    });
    map.addSource(prefixSource + layer.src + '_polygon', {
        'type': 'geojson',
        'data': {
            "type": "FeatureCollection",
            "features": osm["Polygon"],
        }
    });

    map.addLayer({
        'id': prefixLayer + layer.src + '_circle',
        'type': 'circle',
        'source': prefixSource + layer.src + '_circle',
        'paint': {
            'circle-radius': 8,
            'circle-color': layer.color['point'],
            "circle-opacity": 0.4,
        }
    });
    map.addLayer({
        'id': prefixLayer + layer.src + '_line',
        'source': prefixSource + layer.src + '_line',
        "type": 'line',
        'paint': {
            'line-color': layer.color['line'],
            "line-width": 4
        }
    });
    map.addLayer({
        'id': prefixLayer + layer.src + '_polygon',
        'type': 'fill',
        'source': prefixSource + layer.src + '_polygon',
        'paint': {
            'fill-color': layer.color['polygon'],
            'fill-opacity': 0.4
        },
        'filter': ['==', '$type', 'Polygon']
    });

}

function readGeoJson(layer) {
    fetch(layer.src)
        .then((res) => res.json())
        .then((text) => {
            const geoJSONcontent = text
            if (layer.type == 'osm') {
                renderOsm(geoJSONcontent, layer);
                return;
            }
            map.addSource(prefixSource + layer.src, {
                'type': 'geojson',
                'data': geoJSONcontent
            });

            if (layer.type == 'metro') {
                map.addLayer({
                    'id': prefixLayer + layer.src,
                    'type': 'circle',
                    'source': prefixSource + layer.src,
                    /* 'layout': {
                        'icon-image': 'subway_image',
                    } */
                    'paint': {
                        'circle-radius': 8,
                        'circle-color': 'green',
                        "circle-opacity": 0.4,
                    }
                });
                return;
            }
            if (layer.type == 'point') {
                map.addLayer({
                    'id': prefixLayer + layer.src,
                    'type': 'circle',
                    'source': prefixSource + layer.src,
                    'paint': {
                        'circle-radius': 8,
                        'circle-color': layer.color ?? '#007cbf',
                        "circle-opacity": 0.4,
                    }
                });
                return
            };

            if (layer.type == "streets") {
                map.addLayer({
                    'id': prefixLayer + layer.src,
                    'source': prefixSource + layer.src,
                    "type": 'line',
                    'paint': {
                        'line-color': layer.color,
                        "line-width": 4
                    }
                });
                return
            }
            voron(geoJSONcontent.features);
            map.addLayer({
                'id': prefixLayer + layer.src,
                'type': 'fill',
                'source': prefixSource + layer.src,
                'paint': {
                    'fill-color': layer.color,
                    'fill-opacity': 0.4
                },
                'filter': ['==', '$type', 'Polygon']
            });
        })
        .catch((e) => console.error(e));

}

function voron(feauters) {
    let points = [];
    feauters.forEach((q) => {
        let point;
        if (q.geometry.type == "MultiPolygon") {
            point = centroidMulti(q.geometry);
        } else {
            point = centroid(q.geometry);
        }
        points.push(new Point(point[1], point[0]));
    });
    console.log(points);
    let voronov = new VoronoiDiagram(points);
    let edges = voronov.create();
    console.log(edges);
}

const houses = [srcToGeo + "House_1_v2.geojson", srcToGeo + "House_2_v2.geojson", srcToGeo + "House_3_v2.geojson"]
const streets = [srcToGeo + "Streets_1_v2.geojson", srcToGeo + "Streets_2_v2.geojson", srcToGeo + "Streets_3_v2.geojson"]

const layersRoad = {
    "House_1_v2.geojson": {
        src: srcToGeo + "House_1_v2.geojson",
        name: "Здания 1",
        color: 'red',
        enabled: true,
        default: false,
    },
    "House_2_v2.geojson": {
        src: srcToGeo + "House_2_v2.geojson",
        name: "Здания 2",
        color: 'red',
        enabled: true,
        default: false,
    },
    "House_3_v2.geojson": {
        src: srcToGeo + "House_3_v2.geojson",
        name: "Здания 3",
        color: 'red',
        enabled: true,
        default: false,
    },
    "Streets_1_v2.geojson": {
        src: srcToGeo + "Streets_1_v2.geojson",
        name: "Улицы 1",
        color: '#b72d2d',
        type: 'streets',
        enabled: true,
        default: false,
    },
    "Streets_2_v2.geojson": {
        src: srcToGeo + "Streets_2_v2.geojson",
        name: "Улицы 2",
        color: '#b7702d',
        type: 'streets',
        enabled: true,
        default: false,
    },
    "Streets_3_v2.geojson": {
        src: srcToGeo + "Streets_3_v2.geojson",
        name: "Улицы 3",
        color: '#86680c',
        type: 'streets',
        enabled: true,
        default: false,
    },
    "subway.geojson": {
        src: srcToGeo + "subway.geojson",
        name: "Метро",
        type: 'metro',
        enabled: true,
        default: false,
    },
    "districts_v2.geojson": {
        src: srcToGeo + "districts_v2.geojson",
        name: "Округа",
        color: "yellow",
        enabled: true,
        default: false,
    },
    "cemetery_house.geojson": {
        src: srcToGeo + "cemetery_house.geojson",
        name: "Тестовый дом",
        color: "pink",
        enabled: true,
        default: false,
    },
    "bank.geojson": {
        src: srcToGeo + "bank.geojson",
        name: "Банки",
        color: "#d28306",
        type: 'point',
        enabled: true,
        default: false,
    },
    "healthcare.geojson": {
        src: srcToGeo + "healthcare.geojson",
        name: "Здравоохранение",
        color: "#ff7",
        type: 'point',
        enabled: true,
        default: false,
    },
    "school.geojson": {
        src: srcToGeo + "school.geojson",
        name: "Школы",
        color: "#2495fa",
        type: 'point',
        enabled: true,
        default: false,
    },
    "post_office.geojson": {
        src: srcToGeo + "post_office.geojson",
        name: "Почтовые службы",
        color: "#6a4bc5",
        type: 'point',
        enabled: true,
        default: false,
    },
    "points.geojson": {
        src: srcToGeo + "points.geojson",
        name: "Тест",
        color: "#dd2222",
        type: 'point',
        enabled: true,
        default: false,
    },
    "osm_data.geojson": {
        src: srcToGeo + "osm_data.geojson",
        name: "osm 1",
        color: {
            'line': '#333',
            'polygon': '#666',
            'point': '#999',
        },
        type: "osm",
        enabled: true,
        default: false,
    },
};

createPanelLayers();
createPanelLines();


/* for (let i = 0; i < houses.length; i++) {
    
}
for (let i = 0; i < streets.length; i++) {
    // readGeoJson(streets[i], 'green')
} */

map.on('load', async () => {
    controllPanel_.setListeners();

    document.addEventListener('getMaps', getTiles);
    // Insert the layer beneath any symbol layer.
    const layers = map.getStyle().layers;

    let labelLayerId;
    for (let i = 0; i < layers.length; i++) {
        if (layers[i].type === 'symbol' && layers[i].layout['text-field']) {
            labelLayerId = layers[i].id;
            break;
        }
    }

    map.addSource('openmaptiles', {
        url: `https://api.maptiler.com/tiles/v3/tiles.json?key=${MAPTILER_KEY}`,
        type: 'vector',
    });

    map.addLayer(
        {
            'id': '3d-buildings',
            'source': 'openmaptiles',
            'source-layer': 'building',
            'type': 'fill-extrusion',
            'minzoom': 15,
            'filter': ['!=', ['get', 'hide_3d'], true],
            'paint': {
                'fill-extrusion-color': [
                    'interpolate',
                    ['linear'],
                    ['get', 'render_height'], 0, 'lightgray', 200, 'royalblue', 400, 'lightblue'
                ],
                'fill-extrusion-height': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    15,
                    0,
                    16,
                    ['get', 'render_height']
                ],
                'fill-extrusion-base': ['case',
                    ['>=', ['get', 'zoom'], 16],
                    ['get', 'render_min_height'], 0
                ]
            }
        },
        labelLayerId
    );
    for (let i of Object.values(layersRoad)) {
        if (i.enabled) {
            addLayerInput(i);
            if (i.default) {
                readGeoJson(i);
            }
        }
    }

    map.on('click', (e) => {
        let coor = e.lngLat.wrap();
        document.getElementById('input_coor').value =
            `${coor['lat']},${coor['lng']}`;
    });
});

function addLayer(feauters) {
    let i = 0;
    feauters.features.forEach((e) => {
        if (e.geometry.type == "Polygon" || e.geometry.type == "MultiPolygon") {
            source_ids.push(`valhalla_${i}_s`);
            map.addSource(`valhalla_${i}_s`, {
                'type': 'geojson',
                'data': { "type": e.type, "geometry": e.geometry },
            });
            layers_ids.push(`valhalla_${i}_l`);
            map.addLayer({
                'id': `valhalla_${i}_l`,
                'source': `valhalla_${i}_s`,
                "type": 'fill',
                'paint': {
                    'fill-color': e.properties.color,
                    "fill-opacity": e.properties.opacity,
                }
            })
            layers_ids.push(`valhalla_${i}`);
            map.addLayer({
                'id': `valhalla_${i}`,
                'source': `valhalla_${i}_s`,
                "type": 'line',
                'paint': {
                    'line-color': '#fff',
                    "line-width": 4
                }
            })
            i++;
        }

        if (e.geometry.type == "Point") {
            marker = new Marker()
                .setLngLat(e.geometry.coordinates)
                .addTo(map);
        }


        /* if(e.geometry.type == "Poin") {
            layers_ids.set(`valhalla-${i}_l`);
            map.addLayer({
                'id': `valhalla-${i}_l`,
                'source': `valhalla-${i}`,
                "type": 'Point',
                'paint': {
                    'fill-color': e.properties.color,
                    "fill-opacity": e.properties.opacity,
                }
            })
            map.addLayer({
                'id': `valhalla-${i}`,
                'source': `valhalla-${i}`,
                "type": 'line',
                'paint': {
                    'line-color': e.properties.color,
                    "line-width": e.properties.contour,

                }
            })
        } */

    });
}

async function getTiles() {
    let url = '/api/isochrone?json=';
    let coor = document.getElementById('input_coor').value;
    if (!coor || coor == '') {
        return;
    }
    coor = coor.split(',');
    console.log(coor);
    map.jumpTo({ center: [coor[1], coor[0]] });

    let range = parseInt(document.getElementById('input_range').value);
    let interval = parseInt(document.getElementById('input_interval').value);
    let mass = [];
    let copy_range = range;
    while (copy_range > 0) {
        mass.push({ "time": copy_range });
        copy_range = copy_range - interval;
    };
    console.log(mass);
    let params = {
        "polygons": true,
        "denoise": 0.1,
        "generalize": 0,
        "show_locations": true,
        "costing": "pedestrian",
        "costing_options": {
            "pedestrian":
            {
                "use_ferry": 1,
                "use_living_streets": 0.5,
                "use_tracks": 0,
                "service_penalty": 15,
                "service_factor": 1,
                "shortest": false,
                "use_hills": 0.5,
                "walking_speed": 5.1,
                "walkway_factor": 1,
                "sidewalk_factor": 1,
                "alley_factor": 2,
                "driveway_factor": 5,
                "step_penalty": 0,
                "max_hiking_difficulty": 1,
                "use_lit": 0,
                "transit_start_end_max_distance": 2145,
                "transit_transfer_max_distance": 800
            }
        }, "contours": [...mass], "locations": [{ "lon": coor[1], "lat": coor[0], "type": "break" }],
        "units": "kilometers",
        "id": "valhalla_isochrones_lonlat_" + coor[1] + "," + coor[0] + "_range_" + range + "_interval_" + interval
    };
    let polygons = await fetch(url, {
        method: 'POST',
        body: JSON.stringify(params)
    }).then(
        response => response.json()
    );
    last_valhalla_data = polygons;
    addCoorsToPanel(mass, polygons.features);
    document.querySelector('.lowPanel').style.display = 'block';
    if (layers_ids.length > 0) {
        layers_ids.forEach(e => {
            map.removeLayer(e);
        })
        source_ids.forEach(e => {
            map.removeSource(e)
        })

        source_ids = []
        layers_ids = [];
        if (marker) {
            marker.remove();
            marker = null;
        }
    }
    console.log(polygons);

    addLayer(polygons);
};

const downloadJSON = (obj, name) => {
    const dataUri = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(obj));
    const anchorElement = document.createElement('a');
    anchorElement.href = dataUri;
    anchorElement.download = `${name}.json`;
    document.body.appendChild(anchorElement);
    anchorElement.click();
    document.body.removeChild(anchorElement);
}

function addCoorsToPanel(time, features) {
    console.log(time);
    let objects = '';
    time.forEach((i, j) => {
        objects += `<div class="" style="display:flex; padding-bottom: .5rem">
                            <div class="" style="display:flex; align-self: center; align-items:center; flex-basis: 140px; gap:0.5rem;">
                                <div class="icon">
                                <span class="material-icons move">
                                query_builder
                                </span>
                                </div>
                                <div class="" style="font-size: .875rem; padding: 0.25rem 0; padding-right: .5rem; font-weight: 700">${i.time} мин</div>
                            </div>
                            <div class="" style="display:flex;align-self: center; align-items:center; gap:0.5rem;">
                                <div class="icon">
                                <span class="material-icons time">
                                trending_up
                                </span>
                                </div>
                                <div class="" style="font-size: .875rem; padding: 0.25rem; font-weight:700">${(Math.round(turf.area(features[j]) / 100000) / 10)} км²</div>
                            </div>
                        </div>`;
    })
    document.getElementById('container_kilometr').innerHTML = objects;

};

addEventListener('DOMContentLoaded', function () {
    document.getElementById('download').addEventListener('click', function () {
        downloadJSON(last_valhalla_data, 'output_geojson');
    });

    document.getElementById('panelLines').addEventListener('submit', function () {
        event.preventDefault();
        getSepts();
    });
    document.getElementById('play').addEventListener('click', function () {

        if (this.classList.contains('active')) {
            return;
        }
        this.classList.add('active');
        changeLayers();
    });

    document.getElementById('test_bb').addEventListener('click', function(){
        getSeptsLayer();
    })

});

function changeLayers() {
    document.getElementById('toggle_' + srcToGeo + 'House_1_v2.geojson').setAttribute('checked', 'true');
    document.getElementById('toggle_' + srcToGeo + 'House_1_v2.geojson').dispatchEvent(new Event('change', { bubbles: true }))
    document.getElementById('toggle_' + srcToGeo + 'Streets_1_v2.geojson').setAttribute('checked', 'true');
    document.getElementById('toggle_' + srcToGeo + 'Streets_1_v2.geojson').dispatchEvent(new Event('change', { bubbles: true }))
    document.getElementById('toggle_' + srcToGeo + 'subway.geojson').setAttribute('checked', 'true');
    document.getElementById('toggle_' + srcToGeo + 'subway.geojson').dispatchEvent(new Event('change', { bubbles: true }))

    setTimeout(function () {
        document.getElementById('toggle_' + srcToGeo + 'Streets_2_v2.geojson').setAttribute('checked', 'true');
        document.getElementById('toggle_' + srcToGeo + 'Streets_2_v2.geojson').dispatchEvent(new Event('change', { bubbles: true }))
        document.getElementById('toggle_' + srcToGeo + 'House_2_v2.geojson').setAttribute('checked', 'true');
        document.getElementById('toggle_' + srcToGeo + 'House_2_v2.geojson').dispatchEvent(new Event('change', { bubbles: true }));

        setTimeout(function () {
            document.getElementById('toggle_' + srcToGeo + 'Streets_3_v2.geojson').setAttribute('checked', 'true');
            document.getElementById('toggle_' + srcToGeo + 'Streets_3_v2.geojson').dispatchEvent(new Event('change', { bubbles: true }))
            document.getElementById('toggle_' + srcToGeo + 'House_3_v2.geojson').setAttribute('checked', 'true');
            document.getElementById('toggle_' + srcToGeo + 'House_3_v2.geojson').dispatchEvent(new Event('change', { bubbles: true }));
        }, 25000);
    }, 20000);
}

function addPlayButton() {

    let button = document.createElement('button');
    button.className = 'button';
    button.setAttribute('type', 'button');
    button.id = 'play';
    button.innerHTML = `<span class="">
                        Процесс застройки
                        </span>`;
    let containerButton = document.createElement('div');
    containerButton.className = 'container_button_play';
    containerButton.appendChild(button);

    let button_test = document.createElement('button');
    button_test.className = 'button';
    button_test.setAttribute('type', 'button');
    button_test.id = 'test_bb';
    button_test.innerHTML = `<span class="">
                        HeatMap
                        </span>`;
    containerButton.appendChild(button_test);

    document.querySelector('.maplibregl-control-container').appendChild(containerButton);
};
addPlayButton();

function createPanelLayers() {

    let container = document.createElement('div');
    container.className = "layersPanel_container";
    let container_flex = document.createElement('div');
    container_flex.className = 'layersPanel';
    container_flex.id = 'layersPanel';
    container.appendChild(container_flex)
    document.querySelector('.maplibregl-ctrl-top-left').appendChild(container)
}

function addLayerInput(data) {
    let layer = document.createElement('div');
    layer.innerHTML = `<label style="display:flex; flex-direction: column; gap: 10px;">
                    <span>${data.name}</span>
                    <input type="checkbox" id="toggle_${data.src}" ${data.default ? 'checked' : ''}/>
                    </label>`;
    layer.querySelector('input').addEventListener('change', (e) => {
        toggleLayer(data.src);
    })
    document.getElementById('layersPanel').appendChild(layer);
}

function toggleLayer(id) {
    if (layersRoad[id.replace(srcToGeo, '')].type == "osm") {
        let is_delete = false;
        if (map.getLayer(prefixLayer + id + '_circle')) {
            map.removeLayer(prefixLayer + id + '_circle');
            map.removeSource(prefixSource + id + '_circle');
            is_delete = true;
        };
        if (map.getLayer(prefixLayer + id + '_line')) {
            map.removeLayer(prefixLayer + id + '_line');
            map.removeSource(prefixSource + id + '_line');
            is_delete = true;
        };
        if (map.getLayer(prefixLayer + id + '_polygon')) {
            map.removeLayer(prefixLayer + id + '_polygon');
            map.removeSource(prefixSource + id + '_polygon');
            is_delete = true;
        };
        if (!is_delete) {
            readGeoJson(layersRoad[id.replace(srcToGeo, '')]);
        }
        return;
    }
    if (map.getLayer(prefixLayer + id)) {
        map.removeLayer(prefixLayer + id);
        map.removeSource(prefixSource + id);
        return;
    };


    readGeoJson(layersRoad[id.replace(srcToGeo, '')]);
}

function addLayerPathPre(featurs) {

    featurs.trip.forEach((q, i)=>{
        let geocoodrd = decodeGeoMap(q.legs[0].shape);
    
        source_streets_ids.push(`valhalla_step_${i}_pres`);
    
        map.addSource(`valhalla_step_${i}_pres`, {
            'type': 'geojson',
            'data': {
                'type': "Feature",
                "geometry": { 'type': 'LineString', 'coordinates': geocoodrd },
            },
        });
        layers_streets_ids.push(`valhalla_step_${i}_prel`);
        map.addLayer({
            'id': `valhalla_step_${i}_prel`,
            'source': `valhalla_step_${i}_pres`,
            "type": 'line',
            'paint': {
                'line-color': '#ff0101',
                "line-width": 6,
                "line-opacity": 0.3
            }
        });

    })


    if (featurs.alternates) {
        featurs.alternates.forEach((q, i) => {
            let geocoodrd = decodeGeoMap(q.trip.legs[0].shape);

            source_streets_ids.push(`valhalla_step_alt_${i}_pres`);
            map.addSource(`valhalla_step_alt_${i}_pres`, {
                'type': 'geojson',
                'data': {
                    'type': "Feature",
                    "geometry": { 'type': 'LineString', 'coordinates': geocoodrd },
                },
            });
            layers_streets_ids.push(`valhalla_step_alt_${i}_prel`);
            map.addLayer({
                'id': `valhalla_step_alt_${i}_prel`,
                'source': `valhalla_step_alt_${i}_pres`,
                "type": 'line',
                'paint': {
                    'line-color': '#ff0101',
                    "line-opacity": 0.1,
                    "line-width": 6
                }
            });
        })
    }
}

async function getSeptsLayer() {
    let steps = await fetch('/geojsons/patheth.json').then(
        response => response.json()
    );
    console.log(steps);
    if (layers_streets_ids.length > 0) {
        layers_streets_ids.forEach(e => {
            map.removeLayer(e);
        })
        source_streets_ids.forEach(e => {
            map.removeSource(e)
        })

        source_streets_ids = []
        layers_streets_ids = [];
        if (marker) {
            marker.remove();
            marker = null;
        }
    }


    addLayerPathPre(steps);
    downloadJSON(steps, 'outSource.json');
}


function addLayerPath(feauters) {

    let geocoodrd = decodeGeoMap(feauters.trip.legs[0].shape);

    source_streets_ids.push('valhalla_step_sss');

    feauters.trip.locations.forEach((q) => {
        markers_street.push(new Marker()
            .setLngLat([q.lon, q.lat])
            .addTo(map))
    })
    console.log(geocoodrd);

    map.addSource(`valhalla_step_sss`, {
        'type': 'geojson',
        'data': {
            'type': "Feature",
            "geometry": { 'type': 'LineString', 'coordinates': geocoodrd },
        },
    });
    layers_streets_ids.push('valhalla_step_lll');
    map.addLayer({
        'id': "valhalla_step_lll",
        'source': 'valhalla_step_sss',
        "type": 'line',
        'paint': {
            'line-color': '#000',
            "line-width": 6
        }
    });

    if (feauters.alternates) {
        feauters.alternates.forEach((q, i) => {
            let geocoodrd = decodeGeoMap(q.trip.legs[0].shape);

            source_streets_ids.push(`valhalla_step_alt_${i}_sss`);
            map.addSource(`valhalla_step_alt_${i}_sss`, {
                'type': 'geojson',
                'data': {
                    'type': "Feature",
                    "geometry": { 'type': 'LineString', 'coordinates': geocoodrd },
                },
            });
            layers_streets_ids.push(`valhalla_step_alt_${i}_lll`);
            map.addLayer({
                'id': `valhalla_step_alt_${i}_lll`,
                'source': `valhalla_step_alt_${i}_sss`,
                "type": 'line',
                'paint': {
                    'line-color': '#000',
                    "line-opacity": 0.4,
                    "line-width": 6
                }
            });
        })
    }
}

async function getSepts() {
    let url = '/api/route?json=';
    let coor_start = document.querySelector('input.step_1').value;
    let coor_last = document.querySelector('input.step_last').value;
    let coor_other = [];
    let is_error = false;
    console.log(coor_start);
    document.querySelectorAll('input.step:not(.step_1, .step_last)').forEach(q => { if (!q.value || q.value == '') { is_error = true; return }; coor_other.push((q.value).split(',')) });

    if (is_error) return;

    if (!coor_start || coor_start == '') {
        return;
    }

    if (!coor_last || coor_last == '') {
        return;
    }

    if (coor_other.length > 0) {
        coor_other.map((q) => {
            return {
                "lon": q[1],
                "lat": q[0],
                "type": "via",
            }
        })
    }

    coor_start = coor_start.split(',');
    coor_last = coor_last.split(',');
    console.log(coor_other);
    console.log(coor_last);
    map.jumpTo({ center: [coor_last[1], coor_last[0]] });

    let params = {
        "costing": "pedestrian",
        "costing_options": {
            "pedestrian": {
                "use_ferry": 1,
                "use_living_streets": 0.5,
                "use_tracks": 0,
                "service_penalty": 15,
                "service_factor": 1,
                "shortest": false,
                "use_hills": 0.5,
                "walking_speed": 5.1,
                "walkway_factor": 1,
                "sidewalk_factor": 1,
                "alley_factor": 2,
                "driveway_factor": 5,
                "step_penalty": 0,
                "max_hiking_difficulty": 1,
                "use_lit": 0,
                "transit_start_end_max_distance": 2145,
                "transit_transfer_max_distance": 800
            }
        },
        "exclude_polygons": [],
        "locations": [
            {
                "lon": coor_start[1],
                "lat": coor_start[0],
                "type": "break"
            }, ...coor_other,
            {
                "lon": coor_last[1],
                "lat": coor_last[0],
                "type": "break"
            }
        ],
        "units": "kilometers",
        "alternates": 3,
        "id": "valhalla_directions"
    };

    let steps = await fetch(url, {
        method: 'POST',
        body: JSON.stringify(params)
    }).then(
        response => response.json()
    );
    console.log(steps);
    if (layers_streets_ids.length > 0) {
        layers_streets_ids.forEach(e => {
            map.removeLayer(e);
        })
        source_streets_ids.forEach(e => {
            map.removeSource(e)
        })

        source_streets_ids = []
        layers_streets_ids = [];
        if (marker) {
            marker.remove();
            marker = null;
        }
    }

    if (markers_street.length > 0) {
        markers_street.forEach((q, i) => {
            q.remove();
        })
        markers_street = [];
    }

    addLayerPath(steps);
    downloadJSON(steps, 'outSource.json');
}

function createPanelLines() {
    let panelLines_container = document.createElement('div');
    panelLines_container.className = 'panelLines_container';


    let panelLines = document.createElement('form');
    panelLines.className = 'panelLines';
    panelLines.id = 'panelLines';

    let disc = document.createElement('p');
    disc.innerText = "Рассчет пути";
    panelLines.appendChild(disc);

    let ullines = document.createElement('ul');
    let lilines = document.createElement('li');
    let liline2 = document.createElement('li');
    lilines.innerHTML = `<div style="margin-bottom: 6px"><span>Начальная точка</span></div>
                        <div><input class="step step_1" type="text"  placeholder="Введите координаты..."/> </div>`
    liline2.innerHTML = `<div style="margin-bottom: 6px"><span>Конечная точка</span></div>
                        <div><input class="step step_last" type="text"  placeholder="Введите координаты..."/> </div>`

    let button = document.createElement('input');
    button.setAttribute('type', 'submit');
    button.value = 'Рассчитать';

    ullines.appendChild(lilines);
    ullines.appendChild(liline2);
    panelLines.appendChild(ullines);
    panelLines.appendChild(button);
    panelLines_container.appendChild(panelLines);
    document.querySelector('.controllPanel_container').appendChild(panelLines_container)

}