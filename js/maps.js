// Wrapper sobre el proveedor de mapas (hoy Nominatim + OSRM). El resto de la
// app solo llama Maps.geocode() / Maps.routeDistanceKm(); cambiar de proveedor
// más adelante no debería tocar nada fuera de este archivo.
(function (global) {
  'use strict';

  var geocodeCache = {};

  function normalizar(direccion) {
    return String(direccion || '').trim().toLowerCase();
  }

  // Cachea por dirección normalizada (incluye promesas en curso) para no
  // duplicar pedidos si el usuario recalcula con las mismas direcciones.
  function geocode(direccion) {
    var key = normalizar(direccion);
    if (geocodeCache[key]) return geocodeCache[key];

    var url = 'https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=ar&q=' + encodeURIComponent(direccion);
    var promise = fetch(url, { headers: { 'Accept-Language': 'es' } }).then(function (res) {
      if (!res.ok) throw new Error('geocode_failed');
      return res.json();
    }).then(function (data) {
      if (!data.length) throw new Error('not_found:' + direccion);
      return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon), display: data[0].display_name };
    }).catch(function (err) {
      delete geocodeCache[key];
      throw err;
    });

    geocodeCache[key] = promise;
    return promise;
  }

  // points: [{lat,lon}, ...] con 2 o más puntos (origen, paradas..., destino).
  // Un solo pedido a OSRM con todos los waypoints en orden: la distancia total
  // que devuelve ya es la suma real de todos los tramos.
  function routeDistanceKm(points) {
    if (!points || points.length < 2) return Promise.reject(new Error('route_failed'));
    var coords = points.map(function (p) { return p.lon + ',' + p.lat; }).join(';');
    var url = 'https://router.project-osrm.org/route/v1/driving/' + coords + '?overview=false';
    return fetch(url).then(function (res) {
      if (!res.ok) throw new Error('route_failed');
      return res.json();
    }).then(function (data) {
      if (data.code !== 'Ok' || !data.routes || !data.routes.length) throw new Error('no_route');
      return data.routes[0].distance / 1000;
    });
  }

  global.Maps = {
    geocode: geocode,
    routeDistanceKm: routeDistanceKm
  };
})(window);
