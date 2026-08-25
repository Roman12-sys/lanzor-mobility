// Lógica de negocio de clientes: validación y búsqueda sobre la capa de
// persistencia (Storage). La UI (app.js) no toca localStorage directamente.
(function (global) {
  'use strict';

  var TIPOS = ['particular', 'corporativo'];

  function validar(data) {
    var errores = [];
    if (!data.nombre || !data.nombre.trim()) errores.push('El nombre es obligatorio.');
    if (data.email && data.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
      errores.push('El email no es válido.');
    }
    if (data.tipo && TIPOS.indexOf(data.tipo) === -1) errores.push('Tipo de cliente inválido.');
    if (data.tarifaPersonalizada && data.tarifaPersonalizada.activa) {
      var precio = Number(data.tarifaPersonalizada.precioKm);
      if (!(precio > 0)) errores.push('La tarifa personalizada debe ser mayor a 0.');
    }
    return { valido: errores.length === 0, errores: errores };
  }

  function normalizar(data) {
    return {
      nombre: (data.nombre || '').trim(),
      empresa: (data.empresa || '').trim(),
      telefono: (data.telefono || '').trim(),
      whatsapp: (data.whatsapp || '').trim(),
      email: (data.email || '').trim(),
      direccionHabitual: (data.direccionHabitual || '').trim(),
      tipo: TIPOS.indexOf(data.tipo) === -1 ? 'particular' : data.tipo,
      tarifaPersonalizada: {
        activa: !!(data.tarifaPersonalizada && data.tarifaPersonalizada.activa),
        precioKm: Number(data.tarifaPersonalizada && data.tarifaPersonalizada.precioKm) || null
      },
      notas: (data.notas || '').trim()
    };
  }

  function listar(opts) {
    var query = ((opts && opts.query) || '').trim().toLowerCase();
    var clientes = global.Storage.getClients().slice().sort(function (a, b) {
      return a.nombre.localeCompare(b.nombre, 'es');
    });
    if (!query) return clientes;
    return clientes.filter(function (c) {
      return (c.nombre + ' ' + c.empresa + ' ' + c.telefono + ' ' + c.whatsapp)
        .toLowerCase().indexOf(query) !== -1;
    });
  }

  function obtener(id) {
    return global.Storage.getClients().find(function (c) { return c.id === id; }) || null;
  }

  function crear(data) {
    var check = validar(data);
    if (!check.valido) return { ok: false, errores: check.errores };
    var cliente = global.Storage.saveClient(normalizar(data));
    return { ok: true, cliente: cliente };
  }

  function actualizar(id, data) {
    var check = validar(data);
    if (!check.valido) return { ok: false, errores: check.errores };
    var cliente = global.Storage.updateClient(id, normalizar(data));
    return { ok: true, cliente: cliente };
  }

  function eliminar(id) {
    global.Storage.deleteClient(id);
  }

  global.Clients = {
    TIPOS: TIPOS,
    listar: listar,
    obtener: obtener,
    crear: crear,
    actualizar: actualizar,
    eliminar: eliminar,
    validar: validar
  };
})(window);
