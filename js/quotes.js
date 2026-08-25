// Lógica de presupuestos: numeración LM-AAAA-NNNNNN, vigencia y estados.
// Todo pasa por Storage; nada de localStorage directo acá.
(function (global) {
  'use strict';

  var ESTADOS = ['pendiente', 'aceptado', 'rechazado', 'vencido', 'cancelado'];

  function siguienteNumero() {
    var settings = global.Storage.getSettings();
    var anioActual = new Date().getFullYear();
    if (settings.numeracion.anio !== anioActual) {
      settings.numeracion.anio = anioActual;
      settings.numeracion.siguiente = 1;
    }
    var n = settings.numeracion.siguiente;
    settings.numeracion.siguiente = n + 1;
    global.Storage.saveSettings(settings);
    var pad = String(n).padStart(6, '0');
    return (settings.presupuestos.prefijo || 'LM') + '-' + anioActual + '-' + pad;
  }

  function vigenciaHasta(desde) {
    var settings = global.Storage.getSettings();
    var dias = Number(settings.presupuestos.vigenciaDias) || 3;
    var fecha = new Date(desde);
    fecha.setDate(fecha.getDate() + dias);
    return fecha.toISOString();
  }

  // Marca como vencido cualquier pendiente cuya vigencia ya pasó.
  function aplicarVencimientos() {
    var quotes = global.Storage.getQuotes();
    var ahora = Date.now();
    quotes.forEach(function (q) {
      if (q.estado === 'pendiente' && q.vigenciaHasta && new Date(q.vigenciaHasta).getTime() < ahora) {
        global.Storage.updateQuote(q.id, { estado: 'vencido' });
      }
    });
  }

  function crear(data) {
    var ahora = new Date().toISOString();
    var quote = Object.assign({}, data, {
      numero: siguienteNumero(),
      fecha: ahora,
      vigenciaHasta: vigenciaHasta(ahora),
      estado: 'pendiente'
    });
    return global.Storage.saveQuote(quote);
  }

  function listar(opts) {
    aplicarVencimientos();
    opts = opts || {};
    var query = (opts.query || '').trim().toLowerCase();
    var quotes = global.Storage.getQuotes().slice().sort(function (a, b) {
      return new Date(b.fecha) - new Date(a.fecha);
    });
    if (opts.estado) quotes = quotes.filter(function (q) { return q.estado === opts.estado; });
    if (opts.clienteId) quotes = quotes.filter(function (q) { return q.clienteId === opts.clienteId; });
    if (query) {
      quotes = quotes.filter(function (q) {
        return (q.numero + ' ' + q.cliente + ' ' + q.origen + ' ' + q.destino).toLowerCase().indexOf(query) !== -1;
      });
    }
    return quotes;
  }

  function obtener(id) {
    return global.Storage.getQuotes().find(function (q) { return q.id === id; }) || null;
  }

  function actualizar(id, patch) {
    return global.Storage.updateQuote(id, patch);
  }

  function cambiarEstado(id, estado) {
    if (ESTADOS.indexOf(estado) === -1) return null;
    return global.Storage.updateQuote(id, { estado: estado });
  }

  function duplicar(id) {
    var original = obtener(id);
    if (!original) return null;
    var ahora = new Date().toISOString();
    var copia = Object.assign({}, original, {
      id: undefined,
      numero: siguienteNumero(),
      fecha: ahora,
      vigenciaHasta: vigenciaHasta(ahora),
      estado: 'pendiente'
    });
    return global.Storage.saveQuote(copia);
  }

  function eliminar(id) {
    global.Storage.deleteQuote(id);
  }

  global.Quotes = {
    ESTADOS: ESTADOS,
    crear: crear,
    listar: listar,
    obtener: obtener,
    actualizar: actualizar,
    cambiarEstado: cambiarEstado,
    duplicar: duplicar,
    eliminar: eliminar
  };
})(window);
