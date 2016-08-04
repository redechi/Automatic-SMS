const moment = require('moment-timezone');
const socket = require('socket.io-client')();
const $ = require('jquery');
window.jQuery = $;

require('mapbox.js');
require('bootstrap-sass');


// Setup mapbox
L.mapbox.accessToken = mapboxAccessToken;

const map = L.mapbox.map('map', 'automatic.h5kpm228', {
  maxZoom: 16
}).setView([37.9, -122.5], 10);

const geocoder = L.mapbox.geocoder('mapbox.places');
const markers = [];
let previousMarker;
let bounds;
const markerLayer = L.mapbox.featureLayer().addTo(map);
const icon = L.mapbox.marker.icon({
  'marker-size': 'small',
  'marker-color': '#38BE43',
  'marker-symbol': 'circle'
});
const iconLatest = L.mapbox.marker.icon({
  'marker-size': 'small',
  'marker-color': '#E74A4A',
  'marker-symbol': 'circle'
});


// Web socket connection
socket.on('connect', () => {
  updateAlert('Connected', 'Waiting for location');

  socket.emit('initialize', { shareId });
});

socket.on('disconnect', () => {
  if (!$('#alert').is(':visible')) {
    updateAlert('Disconnected');
  }
});

socket.on('event', (data) => {
  hideAlert();
  console.log(data);

  if (data.location) {
    const location = {
      lat: parseFloat(data.location.lat),
      lon: parseFloat(data.location.lon)
    };
    const marker = addMarker(location);

    geocoder.reverseQuery(location, (e, response) => {
      if (e) {
        console.error(e);
      }

      const locationName = formatLocation(response);

      if (locationName) {
        description.push('<b>' + locationName + '</b>');
      }

      description.push(moment(data.created_at).format('MMM D, YYYY h:mm a'));


      marker.bindPopup(description.join('<br>'), {
        className: 'driveEvent-popup'
      });
      marker.openPopup();
    });
  }
});


function addMarker(location) {
  const marker = L.marker(location, {
    icon: iconLatest
  });

  marker.addTo(markerLayer);

  // Change previous marker to standard Icon
  if (previousMarker) {
    previousMarker.setIcon(icon);
    drawLine(previousMarker, marker);
  }
  markers.push(marker);

  previousMarker = marker;

  if (bounds) {
    bounds.extend(location);
  } else {
    bounds = L.latLngBounds(location, location);
  }

  map.panTo(location);
  map.fitBounds(bounds);

  return marker;
}


function drawLine(marker1, marker2) {
  const lineStyle = {
    color: '#5DBEF5',
    opacity: 1,
    weight: 4
  };
  L.polyline([marker1.getLatLng(), marker2.getLatLng()], lineStyle).addTo(map);
}

function updateAlert(title, message) {
  $('#alert')
    .html('<b>' + title + '</b>: ' + message)
    .fadeIn()
    .addClass('alert alert-info');
}


function hideAlert() {
  $('#alert').fadeOut();
}


function formatLocation(response) {
  try {
    return response.features[0].place_name;
  } catch (e) {
    return '';
  }
}
