// Motor de tarifas, centralizado. Nada de precios hardcodeados fuera de acá:
// tarifa base + km incluidos + km adicionales + recargos - descuentos = total.
//
// Con tarifa manual (el campo "precio por km" del formulario) se replica
// exactamente el cálculo original: distancia x precio/km, sin mínimo ni km
// incluidos. Eso hace que el resultado no cambie para el flujo actual.
(function (global) {
  'use strict';

  function num(v, fallback) {
    var n = Number(v);
    return isFinite(n) && n >= 0 ? n : fallback;
  }

  function tarifaConfigFor(vehiculo, config) {
    var v = config && config.tarifas && config.tarifas[vehiculo];
    return {
      tarifaMinima: num(v && v.tarifaMinima, 0),
      kmIncluidos: num(v && v.kmIncluidos, 0),
      precioKmAdicional: num(v && v.precioKmAdicional, 0)
    };
  }

  function sumarRecargos(recargos) {
    if (!recargos || !recargos.length) return { total: 0, detalle: [] };
    var total = 0;
    var detalle = [];
    recargos.forEach(function (r) {
      var monto = num(r.monto, 0);
      if (monto <= 0) return;
      total += monto;
      detalle.push({ concepto: r.concepto || r.nombre || 'Recargo', monto: monto });
    });
    return { total: total, detalle: detalle };
  }

  function calcularDescuento(subtotal, descuento) {
    if (!descuento || !descuento.tipo) return 0;
    if (descuento.tipo === 'porcentaje') {
      var pct = num(descuento.valor, 0);
      return Math.min(subtotal, Math.round(subtotal * (pct / 100)));
    }
    if (descuento.tipo === 'monto') {
      return Math.min(subtotal, num(descuento.valor, 0));
    }
    return 0;
  }

  function calcularCotizacion(params) {
    var vehiculo = params.vehiculo;
    var distanciaKm = num(params.distanciaKm, 0);
    var config = params.config || {};
    var recargos = params.recargos || [];
    var descuento = params.descuento || null;

    var precioKmAdicional, tarifaMinima, kmIncluidos;

    if (params.precioKmManual != null && params.precioKmManual > 0) {
      precioKmAdicional = num(params.precioKmManual, 0);
      tarifaMinima = 0;
      kmIncluidos = 0;
    } else {
      var cfg = tarifaConfigFor(vehiculo, config);
      precioKmAdicional = cfg.precioKmAdicional;
      tarifaMinima = cfg.tarifaMinima;
      kmIncluidos = cfg.kmIncluidos;
    }

    var kmAdicionales = Math.max(0, Math.round((distanciaKm - kmIncluidos) * 10) / 10);
    var montoKmAdicional = Math.round(kmAdicionales * precioKmAdicional);
    var tarifaBase = Math.round(tarifaMinima);
    var subtotal = tarifaBase + montoKmAdicional;

    var recargosInfo = sumarRecargos(recargos);
    var conRecargos = subtotal + recargosInfo.total;
    var descuentoTotal = calcularDescuento(conRecargos, descuento);
    var total = Math.max(0, conRecargos - descuentoTotal);

    return {
      vehiculo: vehiculo,
      distanciaKm: distanciaKm,
      tarifaMinima: tarifaMinima,
      kmIncluidos: kmIncluidos,
      kmAdicionales: kmAdicionales,
      precioKmAdicional: precioKmAdicional,
      tarifaBase: tarifaBase,
      montoKmAdicional: montoKmAdicional,
      subtotal: subtotal,
      recargos: recargosInfo.detalle,
      recargosTotal: recargosInfo.total,
      descuento: descuento,
      descuentoTotal: descuentoTotal,
      total: total
    };
  }

  global.Calculator = {
    calcularCotizacion: calcularCotizacion
  };
})(window);
