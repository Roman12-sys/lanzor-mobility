// Lógica de servicios: nacen de un presupuesto aceptado y avanzan por estados
// operativos (distinto del estado comercial del presupuesto).
(function (global) {
  'use strict';

  var ESTADOS = ['pendiente', 'programado', 'en_preparacion', 'en_viaje', 'entregado', 'cancelado'];

  // Historial de estados: se agrega, nunca se pisa.
  function registrarHistorial(service, estado) {
    var historial = (service.historial || []).slice();
    historial.push({ estado: estado, fecha: new Date().toISOString() });
    return historial;
  }

  function crearDesdeQuote(quote, extra) {
    extra = extra || {};
    var ahora = new Date();
    var service = {
      quoteId: quote.id,
      numero: quote.numero,
      fecha: extra.fecha || ahora.toISOString().slice(0, 10),
      hora: extra.hora || ahora.toTimeString().slice(0, 5),
      cliente: quote.cliente,
      clienteId: quote.clienteId || null,
      vehiculo: quote.vehiculo,
      conductor: extra.conductor || '',
      origen: quote.origen,
      paradas: quote.paradas || [],
      destino: quote.destino,
      distanciaKm: quote.distanciaKm,
      total: quote.total,
      estado: 'pendiente',
      historial: [{ estado: 'pendiente', fecha: ahora.toISOString() }]
    };
    return global.Storage.saveService(service);
  }

  function listar(opts) {
    opts = opts || {};
    var services = global.Storage.getServices().slice().sort(function (a, b) {
      var fa = a.fecha + ' ' + (a.hora || '');
      var fb = b.fecha + ' ' + (b.hora || '');
      return fb.localeCompare(fa);
    });
    if (opts.estado) services = services.filter(function (s) { return s.estado === opts.estado; });
    var query = (opts.query || '').trim().toLowerCase();
    if (query) {
      services = services.filter(function (s) {
        return (s.cliente + ' ' + s.origen + ' ' + s.destino).toLowerCase().indexOf(query) !== -1;
      });
    }
    return services;
  }

  function obtener(id) {
    return global.Storage.getServices().find(function (s) { return s.id === id; }) || null;
  }

  function actualizar(id, patch) {
    var actual = obtener(id);
    if (actual && patch.estado && patch.estado !== actual.estado) {
      patch = Object.assign({}, patch, { historial: registrarHistorial(actual, patch.estado) });
    }
    return global.Storage.updateService(id, patch);
  }

  function cambiarEstado(id, estado) {
    if (ESTADOS.indexOf(estado) === -1) return null;
    var actual = obtener(id);
    if (!actual) return null;
    return global.Storage.updateService(id, { estado: estado, historial: registrarHistorial(actual, estado) });
  }

  function eliminar(id) {
    global.Storage.deleteService(id);
  }

  // Crea un servicio nuevo a partir de uno existente (viajes recurrentes).
  // No copia id, historial ni estado: arranca como un servicio nuevo.
  function repetir(id) {
    var original = obtener(id);
    if (!original) return null;
    var ahora = new Date();
    var copia = {
      quoteId: original.quoteId,
      numero: original.numero,
      fecha: ahora.toISOString().slice(0, 10),
      hora: ahora.toTimeString().slice(0, 5),
      cliente: original.cliente,
      clienteId: original.clienteId || null,
      vehiculo: original.vehiculo,
      conductor: original.conductor || '',
      origen: original.origen,
      paradas: original.paradas || [],
      destino: original.destino,
      distanciaKm: original.distanciaKm,
      total: original.total,
      estado: 'pendiente',
      historial: [{ estado: 'pendiente', fecha: ahora.toISOString() }]
    };
    return global.Storage.saveService(copia);
  }

  global.Services = {
    ESTADOS: ESTADOS,
    crearDesdeQuote: crearDesdeQuote,
    listar: listar,
    obtener: obtener,
    actualizar: actualizar,
    cambiarEstado: cambiarEstado,
    repetir: repetir,
    eliminar: eliminar
  };
})(window);
