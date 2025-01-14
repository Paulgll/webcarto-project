// Définir la carte centrée sur Nantes
var map = L.map('map').setView([47.218371, -1.553621], 12);

// Ajouter les calques de fond
var osm = L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: 'Map data © OpenStreetMap contributors'
});

var satellite = L.tileLayer('http://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
    attribution: 'Map data © OpenTopoMap contributors'
});
var cartodb = L.tileLayer('http://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png' , {
    attribution: 'Map data © OpenTopoMap contributors'
});

osm.addTo(map);

// Contrôle pour changer le fond de carte
var baseMaps = {
    "OpenStreetMap": osm,
    "HOTOSM": satellite,
    "cartodb":cartodb
};
L.control.layers(baseMaps).addTo(map);

// Variable pour garder une trace du polygone sélectionné
var selectedPolygon = null;

// Fonction pour appliquer un style par défaut
function style(feature) {
    return {
        fillColor: 'white',
        weight: 1,
        opacity: 1,
        color: 'blue',
        dashArray: '3',
        fillOpacity: 0.5
    };
}

// Fonction pour appliquer le style de sélection
function highlightStyle() {
    return {
        fillColor: 'yellow',
        weight: 3,
        color: 'red',
        dashArray: '',
        fillOpacity: 0.7
    };
}

// Fonction pour créer un tampon de 300 m autour d'un point
function creerTampon(latlng) {
    return L.circle(latlng, {
        radius: 300,
        color: 'green',
        fillColor: '#32CD32',
        fillOpacity: 0.5
    });
}

// Fonction pour afficher un graphique en donut
var chartInstance;
function afficherGraphique(votes) {
    var ctx = document.getElementById('chart').getContext('2d');
    if (chartInstance) {
        chartInstance.destroy();
    }
    chartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['M. Emmanuel MACRON', 'Mme. Marine LE PEN', 'Blancs'],
            datasets: [{
                data: [votes.macron, votes.lepen, votes.blanc],
                backgroundColor: ['#F0902A', '#3885D3', '#CCCCCC']
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// Fonction pour afficher la photo du gagnant
function afficherPhotoGagnant(gagnant) {
    var photoElement = document.getElementById('winner-photo');
    if (gagnant === 'M. Emmanuel MACRON') {
        photoElement.src = 'img/macron.webp';
    } else if (gagnant === 'Mme. Marine LE PEN') {
        photoElement.src = 'img/marine.jpg';
    } else {
        photoElement.src = '';
    }
}

// Ajouter les polygones depuis la variable vote
var geoJsonLayer = L.geoJson(vote, {
    style: style,
    onEachFeature: function (feature, layer) {
        layer.bindPopup(
            '<b>Gagnant:</b> ' + feature.properties.Gagnant + '<br>' +
            '<b>Bureau de vote:</b> ' + feature.properties.numero_bureau + '<br>' +
            '<b>Site:</b> ' + feature.properties.site + '<br>' +
            '<b>Nom:</b> ' + feature.properties.nom
        );

        layer.on('click', function () {
            if (selectedPolygon) {
                geoJsonLayer.resetStyle(selectedPolygon);
            }
            layer.setStyle(highlightStyle());
            layer.openPopup();
            selectedPolygon = layer;

            var votes = {
                macron: parseFloat(feature.properties['M. Emmanuel MACRON']) || 0,
                lepen: parseFloat(feature.properties['Mme. Marine LE PEN']) || 0,
                blanc: parseFloat(feature.properties['Blancs']) || 0
            };

            afficherGraphique(votes);
            afficherPhotoGagnant(feature.properties.Gagnant);
        });
    }
}).addTo(map);

// Ajuster la vue pour inclure tous les polygones
map.fitBounds(geoJsonLayer.getBounds());

// Ajouter les entités ponctuelles avec clusters et tampons dynamiques
var markers = L.markerClusterGroup();
L.geoJson(bureau_vote, {
    pointToLayer: function (feature, latlng) {
        return L.marker(latlng, {
            icon: L.icon({
                iconUrl: 'img/bureau_vote.png',
                iconSize: [17, 17],
                iconAnchor: [16, 32],
                popupAnchor: [0, -32]
            })
        });
    },
    onEachFeature: function (feature, layer) {
        layer.bindPopup(
            '<b>Bureau de vote:</b> ' + feature.properties.numero_bureau + '<br>' +
            '<b>Nom:</b> ' + feature.properties.nom + '<br>' +
            '<b>Site:</b> ' + feature.properties.site
        );

        let tampon = null;
        layer.on('mouseover', function () {
            tampon = creerTampon(layer.getLatLng());
            tampon.addTo(map);
        });
        layer.on('mouseout', function () {
            if (tampon) {
                map.removeLayer(tampon);
                tampon = null;
            }
        });
        markers.addLayer(layer);
    }
}).addTo(markers);
map.addLayer(markers);


// Ajouter une échelle à la carte
L.control.scale({
    metric: true,
    imperial: false
}).addTo(map);

// Fonction pour charger un GeoJSON via fetch
async function chargerGeoJSON(url) {
    try {
        let response = await fetch(url);
        if (!response.ok) throw new Error("Erreur de chargement du GeoJSON");
        let data = await response.json();
        L.geoJSON(data).addTo(map);
    } catch (error) {
        console.error("Erreur :", error);
    }
}

// Exemple d'appel pour charger un GeoJSON
chargerGeoJSON('data/tan.geojson');

// Ajouter une légende dynamique améliorée
var legend = L.control({ position: 'bottomright' });

legend.onAdd = function () {
    var div = L.DomUtil.create('div', 'info legend');

    div.innerHTML = `
        <h4></h4>
        <div>
            <img src="img/bureau_vote.png" alt="Bureau de vote">
            Bureau de vote
        </div>
        <div>
            <div class="legend-square" style="background: blue;"></div>
            Découpage géographique des bureaux de vote
        </div>
    `;
    return div;
};

legend.addTo(map);

// Créer des groupes de couches pour les polygones et les entités ponctuelles
var layerGroupPolygons = L.layerGroup().addTo(map);
var layerGroupPoints = L.layerGroup().addTo(map);

// Ajouter les couches à leurs groupes respectifs
geoJsonLayer.addTo(layerGroupPolygons);
markers.addTo(layerGroupPoints);

// Ajouter un contrôle de couches avec une position personnalisée (bas à gauche)
var overlayMaps = {
    "Découpage géographique des bureaux de vote": layerGroupPolygons,
    "bureaux de vote": layerGroupPoints
};
var layersControl = L.control.layers(null, overlayMaps, {
    collapsed: false, // Garde les couches toujours visibles
    position: 'bottomleft' // Positionne en bas à gauche
}).addTo(map);
