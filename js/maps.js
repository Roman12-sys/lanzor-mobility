// Wrapper sobre el proveedor de mapas (hoy Nominatim + OSRM). El resto de la
// app solo llama Maps.resolverUbicacion() / Maps.routeDistanceKm(); cambiar
// de proveedor más adelante no debería tocar nada fuera de este archivo.
//
// Sistema de Ubicaciones: una dirección puede venir como texto libre,
// coordenadas pegadas a mano, o un link de Google Maps. resolverUbicacion()
// detecta cuál es y devuelve siempre la misma forma:
//   { texto, lat, lon, fuente, direccionFormateada, mapsUrl }
// fuente: 'geocodificado' | 'coordenadas' | 'maps_link'
//
// Las coordenadas ya resueltas quedan cacheadas en localStorage por texto
// normalizado: la MISMA dirección escrita igual siempre devuelve las MISMAS
// coordenadas, en vez de volver a interpretarse (y potencialmente variar)
// cada vez contra Nominatim.
(function (global) {
  'use strict';

  var GEOCODE_CACHE_KEY = 'lanzor_geocode_cache';
  var ROUTE_CACHE_KEY = 'lanzor_route_cache';
  var MAX_CACHE_ENTRIES = 400;
  var TIMEOUT_MS = 12000;

  var geocodeInFlight = {}; // texto normalizado -> Promise (evita pedidos duplicados en la misma carga de página)

  function normalizar(texto) {
    return String(texto || '').trim().toLowerCase().replace(/\s+/g, ' ');
  }

  function leerCache(key) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  }

  function guardarCache(key, cache) {
    try {
      var keys = Object.keys(cache);
      if (keys.length > MAX_CACHE_ENTRIES) {
        keys.sort(function (a, b) { return (cache[a]._ts || 0) - (cache[b]._ts || 0); });
        keys.slice(0, keys.length - MAX_CACHE_ENTRIES).forEach(function (k) { delete cache[k]; });
      }
      localStorage.setItem(key, JSON.stringify(cache));
    } catch (e) {}
  }

  function fetchConTimeout(url, opts) {
    var controller = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    var timer = controller ? setTimeout(function () { controller.abort(); }, TIMEOUT_MS) : null;
    var finalOpts = Object.assign({}, opts, controller ? { signal: controller.signal } : {});
    return fetch(url, finalOpts).then(function (res) {
      if (timer) clearTimeout(timer);
      return res;
    }).catch(function (err) {
      if (timer) clearTimeout(timer);
      if (err && err.name === 'AbortError') throw new Error('timeout');
      throw err;
    });
  }

  // ---------- Geocodificación de texto libre (con caché persistente) ----------

  function geocode(direccion) {
    var key = normalizar(direccion);
    if (geocodeInFlight[key]) return geocodeInFlight[key];

    var cache = leerCache(GEOCODE_CACHE_KEY);
    if (cache[key]) return Promise.resolve(cache[key].resultado);

    var url = 'https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=ar&q=' + encodeURIComponent(direccion);
    var promise = fetchConTimeout(url, { headers: { 'Accept-Language': 'es' } }).then(function (res) {
      if (!res.ok) throw new Error('geocode_failed');
      return res.json();
    }).then(function (data) {
      if (!data.length) throw new Error('not_found:' + direccion);
      var resultado = { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon), display: data[0].display_name };
      var c = leerCache(GEOCODE_CACHE_KEY);
      c[key] = { resultado: resultado, _ts: Date.now() };
      guardarCache(GEOCODE_CACHE_KEY, c);
      return resultado;
    }).finally(function () {
      delete geocodeInFlight[key];
    });

    geocodeInFlight[key] = promise;
    return promise;
  }

  // Coordenadas → dirección legible. Nunca rechaza: si falla, muestra las
  // coordenadas como texto en vez de bloquear el flujo (las coordenadas ya
  // son la referencia real, esto es solo para mostrar algo entendible).
  function reverseGeocode(lat, lon) {
    var url = 'https://nominatim.openstreetmap.org/reverse?format=json&lat=' + lat + '&lon=' + lon;
    return fetchConTimeout(url, { headers: { 'Accept-Language': 'es' } }).then(function (res) {
      if (!res.ok) throw new Error('reverse_failed');
      return res.json();
    }).then(function (data) {
      return (data && data.display_name) || (lat.toFixed(5) + ', ' + lon.toFixed(5));
    }).catch(function () {
      return lat.toFixed(5) + ', ' + lon.toFixed(5);
    });
  }

  // ---------- Detección de coordenadas / links de Google Maps ----------

  function parseCoordenadas(texto) {
    var m = /^\(?\s*(-?\d{1,3}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*\)?$/.exec(String(texto || '').trim());
    if (!m) return null;
    var lat = parseFloat(m[1]), lon = parseFloat(m[2]);
    if (isNaN(lat) || isNaN(lon)) return null;
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
    return { lat: lat, lon: lon };
  }

  function esLinkCorto(texto) {
    return /^https?:\/\/(maps\.app\.goo\.gl|goo\.gl\/maps|g\.co\/maps)/i.test(String(texto || '').trim());
  }

  // Links "largos" de Google Maps traen las coordenadas en la propia URL
  // (@lat,lon, ?q=lat,lon, !3dlat!4dlon...). Los cortos (maps.app.goo.gl,
  // goo.gl/maps) son redirecciones: no se pueden resolver sin backend por
  // CORS, así que ni se intenta - se avisa al usuario en vez de fallar mudo.
  function parseGoogleMapsUrl(texto) {
    var t = String(texto || '').trim();
    if (!/^https?:\/\//i.test(t)) return null;
    if (!/google\.[a-z.]+\/maps|maps\.google\./i.test(t)) return null;

    var patrones = [
      /@(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/,
      /[?&]q=(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/,
      /[?&]ll=(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/,
      /!3d(-?\d{1,3}\.\d+)!4d(-?\d{1,3}\.\d+)/
    ];
    for (var i = 0; i < patrones.length; i++) {
      var m = patrones[i].exec(t);
      if (m) {
        var lat = parseFloat(m[1]), lon = parseFloat(m[2]);
        if (!isNaN(lat) && !isNaN(lon)) return { lat: lat, lon: lon };
      }
    }
    return null;
  }

  // ---------- Punto de entrada único: texto -> Ubicacion ----------
  //
  // Ubicacion = { texto, lat, lon, fuente, direccionFormateada, mapsUrl }
  // fuente: 'geocodificado' (dirección de toda la vida) | 'coordenadas'
  //         (el usuario pegó lat,lon) | 'maps_link' (pegó un link largo)
  function resolverUbicacion(texto) {
    var input = String(texto || '').trim();
    if (!input) return Promise.reject(new Error('vacio'));

    var coords = parseCoordenadas(input);
    if (coords) {
      return reverseGeocode(coords.lat, coords.lon).then(function (label) {
        return { texto: input, lat: coords.lat, lon: coords.lon, fuente: 'coordenadas', direccionFormateada: label, mapsUrl: null };
      });
    }

    if (esLinkCorto(input)) {
      return Promise.reject(new Error('link_corto'));
    }

    var coordsUrl = parseGoogleMapsUrl(input);
    if (coordsUrl) {
      return reverseGeocode(coordsUrl.lat, coordsUrl.lon).then(function (label) {
        return { texto: input, lat: coordsUrl.lat, lon: coordsUrl.lon, fuente: 'maps_link', direccionFormateada: label, mapsUrl: input };
      });
    }

    return geocode(input).then(function (r) {
      return { texto: input, lat: r.lat, lon: r.lon, fuente: 'geocodificado', direccionFormateada: r.display, mapsUrl: null };
    });
  }

  // ---------- Ruta (con caché persistente por par de coordenadas) ----------

  function claveRuta(points) {
    return points.map(function (p) { return p.lat.toFixed(6) + ',' + p.lon.toFixed(6); }).join(';');
  }

  // points: [{lat,lon}, ...] con 2 o más puntos (origen, paradas..., destino).
  // Un solo pedido a OSRM con todos los waypoints en orden: la distancia que
  // devuelve ya es la suma real de todos los tramos.
  function routeDistanceKm(points) {
    if (!points || points.length < 2) return Promise.reject(new Error('route_failed'));

    var key = claveRuta(points);
    var cache = leerCache(ROUTE_CACHE_KEY);
    if (cache[key] != null) return Promise.resolve(cache[key].km);

    var coords = points.map(function (p) { return p.lon + ',' + p.lat; }).join(';');
    var url = 'https://router.project-osrm.org/route/v1/driving/' + coords + '?overview=false';
    return fetchConTimeout(url).then(function (res) {
      if (!res.ok) throw new Error('route_failed');
      return res.json();
    }).then(function (data) {
      if (data.code !== 'Ok' || !data.routes || !data.routes.length) throw new Error('no_route');
      var km = data.routes[0].distance / 1000;
      var c = leerCache(ROUTE_CACHE_KEY);
      c[key] = { km: km, _ts: Date.now() };
      guardarCache(ROUTE_CACHE_KEY, c);
      return km;
    });
  }

  global.Maps = {
    geocode: geocode,
    reverseGeocode: reverseGeocode,
    resolverUbicacion: resolverUbicacion,
    parseCoordenadas: parseCoordenadas,
    parseGoogleMapsUrl: parseGoogleMapsUrl,
    esLinkCorto: esLinkCorto,
    routeDistanceKm: routeDistanceKm
  };
})(window);
