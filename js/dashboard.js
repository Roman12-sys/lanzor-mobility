// Cálculo de métricas del dashboard a partir de Servicios/Presupuestos.
// Solo números y arrays; el dibujo (SVG, DOM) vive en app.js.
(function (global) {
  'use strict';

  function hoyStr() {
    return new Date().toISOString().slice(0, 10);
  }

  function esDelMes(fechaStr, ref) {
    var f = new Date(fechaStr + 'T00:00:00');
    return f.getFullYear() === ref.getFullYear() && f.getMonth() === ref.getMonth();
  }

  function resumenHoy() {
    var hoy = hoyStr();
    var services = global.Storage.getServices();
    var quotes = global.Storage.getQuotes();

    var serviciosHoy = services.filter(function (s) { return s.fecha === hoy; });
    var entregadosHoy = serviciosHoy.filter(function (s) { return s.estado === 'entregado'; });
    var presupuestosHoy = quotes.filter(function (q) { return (q.fecha || '').slice(0, 10) === hoy; });

    return {
      servicios: serviciosHoy.length,
      presupuestos: presupuestosHoy.length,
      ingresos: entregadosHoy.reduce(function (acc, s) { return acc + (s.total || 0); }, 0),
      kilometros: Math.round(entregadosHoy.reduce(function (acc, s) { return acc + (s.distanciaKm || 0); }, 0) * 10) / 10
    };
  }

  function resumenMes() {
    var ref = new Date();
    var services = global.Storage.getServices().filter(function (s) { return esDelMes(s.fecha, ref); });
    var entregados = services.filter(function (s) { return s.estado === 'entregado'; });
    var ingresos = entregados.reduce(function (acc, s) { return acc + (s.total || 0); }, 0);
    var clientesUnicos = {};
    services.forEach(function (s) { clientesUnicos[s.clienteId || s.cliente] = true; });

    return {
      ingresos: ingresos,
      servicios: services.length,
      kilometros: Math.round(entregados.reduce(function (acc, s) { return acc + (s.distanciaKm || 0); }, 0) * 10) / 10,
      clientes: Object.keys(clientesUnicos).length,
      ticketPromedio: entregados.length ? Math.round(ingresos / entregados.length) : 0
    };
  }

  function ingresosPorDia(dias) {
    dias = dias || 7;
    var services = global.Storage.getServices().filter(function (s) { return s.estado === 'entregado'; });
    var resultado = [];
    for (var i = dias - 1; i >= 0; i--) {
      var d = new Date();
      d.setDate(d.getDate() - i);
      var key = d.toISOString().slice(0, 10);
      var monto = services.filter(function (s) { return s.fecha === key; })
        .reduce(function (acc, s) { return acc + (s.total || 0); }, 0);
      resultado.push({ fecha: key, label: d.toLocaleDateString('es-AR', { weekday: 'short' }), monto: monto });
    }
    return resultado;
  }

  function motoVsAuto() {
    var ref = new Date();
    var services = global.Storage.getServices().filter(function (s) { return esDelMes(s.fecha, ref); });
    var moto = services.filter(function (s) { return s.vehiculo === 'moto'; }).length;
    var auto = services.filter(function (s) { return s.vehiculo === 'auto'; }).length;
    return { moto: moto, auto: auto };
  }

  function principalesClientes(limite) {
    limite = limite || 5;
    var ref = new Date();
    var services = global.Storage.getServices()
      .filter(function (s) { return esDelMes(s.fecha, ref) && s.estado === 'entregado'; });
    var porCliente = {};
    services.forEach(function (s) {
      var key = s.cliente || 'Sin nombre';
      porCliente[key] = (porCliente[key] || 0) + (s.total || 0);
    });
    return Object.keys(porCliente)
      .map(function (nombre) { return { nombre: nombre, total: porCliente[nombre] }; })
      .sort(function (a, b) { return b.total - a.total; })
      .slice(0, limite);
  }

  global.Dashboard = {
    resumenHoy: resumenHoy,
    resumenMes: resumenMes,
    ingresosPorDia: ingresosPorDia,
    motoVsAuto: motoVsAuto,
    principalesClientes: principalesClientes
  };
})(window);
