// Capa de persistencia. Toda lectura/escritura a localStorage pasa por acá,
// para que el resto de la app no dependa de dónde/cómo se guardan los datos
// (ver Fase 13: esto es lo que después se reemplaza por Supabase sin tocar la UI).
(function (global) {
  'use strict';

  var NS = 'lanzor_';
  var LEGACY_PRECIO_KEY = 'cotizador_precioKm';

  function readJSON(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      if (raw == null) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      return false;
    }
  }

  function generarId(prefix) {
    return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  // ---------- Configuración ----------

  function defaultSettings() {
    return {
      version: 2,
      ultimoPrecioKm: null,
      empresa: {
        nombre: '',
        logo: '',
        telefono: '',
        whatsapp: '',
        email: '',
        direccion: '',
        web: ''
      },
      tarifas: {
        moto: { tarifaMinima: 0, kmIncluidos: 0, precioKmAdicional: 0 },
        auto: { tarifaMinima: 0, kmIncluidos: 0, precioKmAdicional: 0 }
      },
      recargosDisponibles: [
        { id: 'peaje', nombre: 'Peaje', monto: 0 },
        { id: 'espera', nombre: 'Espera', monto: 0 },
        { id: 'parada_adicional', nombre: 'Parada adicional', monto: 0 },
        { id: 'horario_especial', nombre: 'Horario especial', monto: 0 },
        { id: 'urgencia', nombre: 'Urgencia', monto: 0 },
        { id: 'ida_y_vuelta', nombre: 'Ida y vuelta', monto: 0 }
      ],
      presupuestos: {
        prefijo: 'LM',
        vigenciaDias: 3,
        condiciones: 'Presupuesto válido por el plazo indicado. Tarifa sujeta a confirmación de disponibilidad al momento de agendar.'
      },
      whatsapp: {
        plantilla: 'Hola {cliente}, te enviamos el presupuesto #{presupuesto} para el viaje de {origen} a {destino}. El valor es de {precio}.'
      },
      numeracion: { anio: null, siguiente: 1 }
    };
  }

  // Compat con la clave vieja del cotizador (precio/km suelto en localStorage).
  function migrateLegacy(settings) {
    if (settings.ultimoPrecioKm == null) {
      var legacy = null;
      try { legacy = localStorage.getItem(LEGACY_PRECIO_KEY); } catch (e) {}
      if (legacy) settings.ultimoPrecioKm = Number(legacy) || null;
    }
    return settings;
  }

  function getSettings() {
    var def = defaultSettings();
    var stored = readJSON(NS + 'settings', null);
    var settings = Object.assign({}, def, stored || {});
    settings.empresa = Object.assign({}, def.empresa, settings.empresa || {});
    settings.tarifas = {
      moto: Object.assign({}, def.tarifas.moto, (settings.tarifas || {}).moto || {}),
      auto: Object.assign({}, def.tarifas.auto, (settings.tarifas || {}).auto || {})
    };
    settings.recargosDisponibles = settings.recargosDisponibles || def.recargosDisponibles;
    settings.presupuestos = Object.assign({}, def.presupuestos, settings.presupuestos || {});
    settings.whatsapp = Object.assign({}, def.whatsapp, settings.whatsapp || {});
    settings.numeracion = Object.assign({}, def.numeracion, settings.numeracion || {});
    return migrateLegacy(settings);
  }

  function saveSettings(settings) {
    writeJSON(NS + 'settings', settings);
    if (settings && settings.ultimoPrecioKm) {
      try { localStorage.setItem(LEGACY_PRECIO_KEY, String(settings.ultimoPrecioKm)); } catch (e) {}
    }
  }

  // ---------- Clientes ----------

  function getClients() {
    return readJSON(NS + 'clients', []);
  }

  function saveClient(client) {
    var clients = getClients();
    var nuevo = Object.assign({}, client, {
      id: generarId('cli'),
      fechaCreacion: new Date().toISOString()
    });
    clients.push(nuevo);
    writeJSON(NS + 'clients', clients);
    return nuevo;
  }

  function updateClient(id, patch) {
    var clients = getClients();
    var idx = clients.findIndex(function (c) { return c.id === id; });
    if (idx === -1) return null;
    clients[idx] = Object.assign({}, clients[idx], patch, { id: id });
    writeJSON(NS + 'clients', clients);
    return clients[idx];
  }

  function deleteClient(id) {
    var clients = getClients().filter(function (c) { return c.id !== id; });
    writeJSON(NS + 'clients', clients);
  }

  // ---------- Presupuestos ----------

  function getQuotes() {
    return readJSON(NS + 'quotes', []);
  }

  function saveQuote(quote) {
    var quotes = getQuotes();
    var nuevo = Object.assign({}, quote, { id: quote.id || generarId('q') });
    quotes.push(nuevo);
    writeJSON(NS + 'quotes', quotes);
    return nuevo;
  }

  function updateQuote(id, patch) {
    var quotes = getQuotes();
    var idx = quotes.findIndex(function (q) { return q.id === id; });
    if (idx === -1) return null;
    quotes[idx] = Object.assign({}, quotes[idx], patch, { id: id });
    writeJSON(NS + 'quotes', quotes);
    return quotes[idx];
  }

  function deleteQuote(id) {
    var quotes = getQuotes().filter(function (q) { return q.id !== id; });
    writeJSON(NS + 'quotes', quotes);
  }

  // ---------- Servicios ----------

  function getServices() {
    return readJSON(NS + 'services', []);
  }

  function saveService(service) {
    var services = getServices();
    var nuevo = Object.assign({}, service, { id: service.id || generarId('srv') });
    services.push(nuevo);
    writeJSON(NS + 'services', services);
    return nuevo;
  }

  function updateService(id, patch) {
    var services = getServices();
    var idx = services.findIndex(function (s) { return s.id === id; });
    if (idx === -1) return null;
    services[idx] = Object.assign({}, services[idx], patch, { id: id });
    writeJSON(NS + 'services', services);
    return services[idx];
  }

  function deleteService(id) {
    var services = getServices().filter(function (s) { return s.id !== id; });
    writeJSON(NS + 'services', services);
  }

  // ---------- Clientes recientes (solo IDs, para accesos rápidos en el cotizador) ----------

  var MAX_RECIENTES = 6;

  function getRecentClientIds() {
    return readJSON(NS + 'recentClients', []);
  }

  function addRecentClientId(id) {
    if (!id) return;
    var lista = getRecentClientIds().filter(function (x) { return x !== id; });
    lista.unshift(id);
    if (lista.length > MAX_RECIENTES) lista = lista.slice(0, MAX_RECIENTES);
    writeJSON(NS + 'recentClients', lista);
  }

  global.Storage = {
    getSettings: getSettings,
    saveSettings: saveSettings,
    defaultSettings: defaultSettings,
    getClients: getClients,
    saveClient: saveClient,
    updateClient: updateClient,
    deleteClient: deleteClient,
    getQuotes: getQuotes,
    saveQuote: saveQuote,
    updateQuote: updateQuote,
    deleteQuote: deleteQuote,
    getServices: getServices,
    saveService: saveService,
    updateService: updateService,
    deleteService: deleteService,
    getRecentClientIds: getRecentClientIds,
    addRecentClientId: addRecentClientId
  };
})(window);
