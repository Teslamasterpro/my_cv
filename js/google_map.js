/* Patched Google Maps script
 * - Removes deprecated HTTP Geocoding REST call
 * - Uses client-side Geocoder from Maps JS API (works over HTTPS)
 * - Handles multiple addresses, errors, and auto-fit bounds
 * - Keeps your custom marker icon (images/loc.png)
 */

function init() {
  // Default center (fallback) — Brooklyn
  var fallbackCenter = new google.maps.LatLng(40.69847032728747, -73.9514422416687);

  var mapOptions = {
    zoom: 7,
    center: fallbackCenter,
    scrollwheel: false
    // Note: if you had custom styles before, keep them here as `styles: [...]`
  };

  var mapElement = document.getElementById('map');
  if (!mapElement) {
    console.warn('[maps] No #map element found.');
    return;
  }

  var map = new google.maps.Map(mapElement, mapOptions);
  var geocoder = new google.maps.Geocoder();
  var bounds = new google.maps.LatLngBounds();

  // Add your addresses here
  var addresses = ['Brooklyn'];

  if (!addresses || !addresses.length) {
    // Nothing to geocode; ensure we still show the default center
    new google.maps.Marker({ position: fallbackCenter, map: map, icon: 'images/loc.png' });
    return;
  }

  var completed = 0;
  addresses.forEach(function (addr) {
    geocoder.geocode({ address: addr }, function (results, status) {
      completed++;
      if (status === 'OK' && results && results[0]) {
        var loc = results[0].geometry.location;
        new google.maps.Marker({ position: loc, map: map, icon: 'images/loc.png' });
        bounds.extend(loc);
      } else {
        console.warn('[maps] Geocode failed for', addr, '→', status);
      }

      // Once all lookups are done, fit bounds if we placed anything
      if (completed === addresses.length) {
        if (!bounds.isEmpty()) {
          map.fitBounds(bounds);
          // Optional: if only one address, set a reasonable zoom
          if (addresses.length === 1) {
            var listener = google.maps.event.addListenerOnce(map, 'bounds_changed', function () {
              if (map.getZoom() > 14) map.setZoom(14);
            });
          }
        } else {
          map.setCenter(fallbackCenter);
        }
      }
    });
  });
}

// Initialize when the window finishes loading
if (window.google && window.google.maps) {
  google.maps.event.addDomListener(window, 'load', init);
} else {
  // In case the API script loads with a callback, expose init as global
  window.initMap = init;
}
