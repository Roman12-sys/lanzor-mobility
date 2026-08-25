// UI y estado de Lanzor Mobility. No hace fetch ni cálculo de precio directo:
// delega en Maps, Calculator, Storage, Clients, Quotes, Services, WhatsApp y
// Dashboard. Este archivo solo orquesta pantallas y DOM.
(function () {
  'use strict';

  var ICONS = {
    moto: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="5.5" cy="17.5" r="2.6"/><circle cx="18.2" cy="17.5" r="2.6"/><path d="M5.5 17.5h4.2l2.3-5.2h3.4"/><path d="M11.6 12.3l2.3 3.1h4.3"/><path d="M14.7 7.6h2.6l1.7 2.7"/><path d="M9.2 12.3L7.1 8.9h3.1"/></svg>',
    auto: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 16.3V13l1.8-4.1A2 2 0 0 1 7.6 7.6h8.8a2 2 0 0 1 1.8 1.3L20 13v3.3"/><path d="M4 16.3h16"/><circle cx="7.6" cy="16.3" r="1.7"/><circle cx="16.4" cy="16.3" r="1.7"/></svg>'
  };
  var ICON_EDIT = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>';
  var ICON_TRASH = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>';
  var ICON_CLOSE = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="M6 6l12 12"/></svg>';

  var COLOR_MOTO = '#C2410C';
  var COLOR_AUTO = '#1D5FA8';

  var ESTADO_QUOTE_LABELS = { pendiente: 'Pendiente', aceptado: 'Aceptado', rechazado: 'Rechazado', vencido: 'Vencido', cancelado: 'Cancelado' };
  var ESTADO_SERVICE_LABELS = { pendiente: 'Pendiente', programado: 'Programado', en_preparacion: 'En preparación', en_viaje: 'En viaje', entregado: 'Entregado', cancelado: 'Cancelado' };

  var ZONES = {
    cotizar: ['form', 'loading', 'result', 'presupuesto'],
    clientes: ['clientesList', 'clientesForm'],
    presupuestos: ['presupuestosList'],
    servicios: ['serviciosList', 'servicioForm'],
    estadisticas: ['estadisticas'],
    configuracion: ['configuracion']
  };
  var TOP_LEVEL = ['form', 'clientesList', 'presupuestosList', 'serviciosList', 'estadisticas', 'configuracion'];

  function fmtMoney(n) {
    return Number(n || 0).toLocaleString('es-AR');
  }
  function fmtFecha(iso) {
    return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' });
  }
  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function attachConfirmDelete(btn, onConfirm) {
    var original = btn.innerHTML;
    var timer = null;
    btn.addEventListener('click', function () {
      if (!timer) {
        btn.classList.add('confirm');
        btn.textContent = '¿Eliminar?';
        timer = setTimeout(function () {
          timer = null;
          btn.classList.remove('confirm');
          btn.innerHTML = original;
        }, 3000);
        return;
      }
      clearTimeout(timer);
      onConfirm();
    });
  }

  var els = {
    backBtn: document.getElementById('backBtn'),
    headerTitle: document.getElementById('headerTitle'),
    headerSub: document.getElementById('headerSub'),
    navCotizar: document.getElementById('navCotizar'),
    navClientes: document.getElementById('navClientes'),
    navPresupuestos: document.getElementById('navPresupuestos'),
    navServicios: document.getElementById('navServicios'),
    navEstadisticas: document.getElementById('navEstadisticas'),
    navConfiguracion: document.getElementById('navConfiguracion'),
    screens: {
      form: document.getElementById('screen-form'),
      loading: document.getElementById('screen-loading'),
      result: document.getElementById('screen-result'),
      presupuesto: document.getElementById('screen-presupuesto'),
      clientesList: document.getElementById('screen-clientes-list'),
      clientesForm: document.getElementById('screen-clientes-form'),
      presupuestosList: document.getElementById('screen-presupuestos-list'),
      serviciosList: document.getElementById('screen-servicios-list'),
      servicioForm: document.getElementById('screen-servicio-form'),
      estadisticas: document.getElementById('screen-estadisticas'),
      configuracion: document.getElementById('screen-configuracion')
    },

    btnMoto: document.getElementById('btnMoto'),
    btnAuto: document.getElementById('btnAuto'),
    clienteSelect: document.getElementById('clienteSelect'),
    cliente: document.getElementById('cliente'),
    origen: document.getElementById('origen'),
    paradasList: document.getElementById('paradasList'),
    addParadaBtn: document.getElementById('addParadaBtn'),
    destino: document.getElementById('destino'),
    precioKm: document.getElementById('precioKm'),
    recargosList: document.getElementById('recargosList'),
    descuentoNinguno: document.getElementById('descuentoNinguno'),
    descuentoMonto: document.getElementById('descuentoMonto'),
    descuentoPorcentaje: document.getElementById('descuentoPorcentaje'),
    descuentoRow: document.getElementById('descuentoRow'),
    descuentoValor: document.getElementById('descuentoValor'),
    descuentoUnidad: document.getElementById('descuentoUnidad'),
    notasInternas: document.getElementById('notasInternas'),
    observacionesCliente: document.getElementById('observacionesCliente'),
    formError: document.getElementById('formError'),
    calcularBtn: document.getElementById('calcularBtn'),

    chipIcon: document.getElementById('chipIcon'),
    chipText: document.getElementById('chipText'),
    resOrigen: document.getElementById('resOrigen'),
    resParadas: document.getElementById('resParadas'),
    resDestino: document.getElementById('resDestino'),
    resKm: document.getElementById('resKm'),
    rowTarifaBase: document.getElementById('rowTarifaBase'),
    resTarifaBase: document.getElementById('resTarifaBase'),
    rowKmIncluidos: document.getElementById('rowKmIncluidos'),
    resKmIncluidos: document.getElementById('resKmIncluidos'),
    resKmAdicionales: document.getElementById('resKmAdicionales'),
    rowRecargos: document.getElementById('rowRecargos'),
    rowDescuentos: document.getElementById('rowDescuentos'),
    resDescuentoLabel: document.getElementById('resDescuentoLabel'),
    resDescuentos: document.getElementById('resDescuentos'),
    resTotal: document.getElementById('resTotal'),
    mapLink: document.getElementById('mapLink'),
    generarBtn: document.getElementById('generarBtn'),
    editarBtn: document.getElementById('editarBtn'),

    docEmpresaNombre: document.getElementById('docEmpresaNombre'),
    docNumero: document.getElementById('docNumero'),
    docFecha: document.getElementById('docFecha'),
    docVigencia: document.getElementById('docVigencia'),
    docClienteNombre: document.getElementById('docClienteNombre'),
    docClienteMeta: document.getElementById('docClienteMeta'),
    docVehIcon: document.getElementById('docVehIcon'),
    docVehTexto: document.getElementById('docVehTexto'),
    docRuta: document.getElementById('docRuta'),
    docDetalle: document.getElementById('docDetalle'),
    docTotal: document.getElementById('docTotal'),
    docObservaciones: document.getElementById('docObservaciones'),
    docCondiciones: document.getElementById('docCondiciones'),
    docContacto: document.getElementById('docContacto'),
    docEstadoChip: document.getElementById('docEstadoChip'),
    whatsappBtn: document.getElementById('whatsappBtn'),
    pdfBtn: document.getElementById('pdfBtn'),
    estadoToggle: document.getElementById('estadoToggle'),
    marcarAceptadoBtn: document.getElementById('marcarAceptadoBtn'),
    marcarRechazadoBtn: document.getElementById('marcarRechazadoBtn'),
    convertirServicioBtn: document.getElementById('convertirServicioBtn'),
    nuevaBtn: document.getElementById('nuevaBtn'),

    clientesBuscar: document.getElementById('clientesBuscar'),
    nuevoClienteBtn: document.getElementById('nuevoClienteBtn'),
    clientesEmpty: document.getElementById('clientesEmpty'),
    clientesList: document.getElementById('clientesList'),
    tipoParticular: document.getElementById('tipoParticular'),
    tipoCorporativo: document.getElementById('tipoCorporativo'),
    cfNombre: document.getElementById('cfNombre'),
    cfEmpresa: document.getElementById('cfEmpresa'),
    cfTelefono: document.getElementById('cfTelefono'),
    cfWhatsapp: document.getElementById('cfWhatsapp'),
    cfEmail: document.getElementById('cfEmail'),
    cfDireccion: document.getElementById('cfDireccion'),
    cfTarifaActiva: document.getElementById('cfTarifaActiva'),
    cfTarifaRow: document.getElementById('cfTarifaRow'),
    cfTarifaPrecio: document.getElementById('cfTarifaPrecio'),
    cfNotas: document.getElementById('cfNotas'),
    clienteFormError: document.getElementById('clienteFormError'),
    guardarClienteBtn: document.getElementById('guardarClienteBtn'),
    cancelarClienteBtn: document.getElementById('cancelarClienteBtn'),

    presupuestosBuscar: document.getElementById('presupuestosBuscar'),
    presupuestosFiltros: document.getElementById('presupuestosFiltros'),
    presupuestosEmpty: document.getElementById('presupuestosEmpty'),
    presupuestosList: document.getElementById('presupuestosList'),

    serviciosFiltros: document.getElementById('serviciosFiltros'),
    serviciosEmpty: document.getElementById('serviciosEmpty'),
    serviciosList: document.getElementById('serviciosList'),
    sfClienteLabel: document.getElementById('sfClienteLabel'),
    sfFecha: document.getElementById('sfFecha'),
    sfHora: document.getElementById('sfHora'),
    sfConductor: document.getElementById('sfConductor'),
    sfEstado: document.getElementById('sfEstado'),
    guardarServicioBtn: document.getElementById('guardarServicioBtn'),
    cancelarServicioBtn: document.getElementById('cancelarServicioBtn'),

    dHoyServicios: document.getElementById('dHoyServicios'),
    dHoyPresupuestos: document.getElementById('dHoyPresupuestos'),
    dHoyIngresos: document.getElementById('dHoyIngresos'),
    dHoyKm: document.getElementById('dHoyKm'),
    dMesIngresos: document.getElementById('dMesIngresos'),
    dMesServicios: document.getElementById('dMesServicios'),
    dMesKm: document.getElementById('dMesKm'),
    dMesClientes: document.getElementById('dMesClientes'),
    dMesTicket: document.getElementById('dMesTicket'),
    chartIngresos: document.getElementById('chartIngresos'),
    chartVehiculo: document.getElementById('chartVehiculo'),
    chartClientes: document.getElementById('chartClientes'),

    cfgEmpresaNombre: document.getElementById('cfgEmpresaNombre'),
    cfgEmpresaTelefono: document.getElementById('cfgEmpresaTelefono'),
    cfgEmpresaWhatsapp: document.getElementById('cfgEmpresaWhatsapp'),
    cfgEmpresaEmail: document.getElementById('cfgEmpresaEmail'),
    cfgEmpresaDireccion: document.getElementById('cfgEmpresaDireccion'),
    cfgEmpresaWeb: document.getElementById('cfgEmpresaWeb'),
    cfgMotoMinima: document.getElementById('cfgMotoMinima'),
    cfgMotoKmInc: document.getElementById('cfgMotoKmInc'),
    cfgMotoKmAdic: document.getElementById('cfgMotoKmAdic'),
    cfgAutoMinima: document.getElementById('cfgAutoMinima'),
    cfgAutoKmInc: document.getElementById('cfgAutoKmInc'),
    cfgAutoKmAdic: document.getElementById('cfgAutoKmAdic'),
    cfgRecargosList: document.getElementById('cfgRecargosList'),
    cfgPrefijo: document.getElementById('cfgPrefijo'),
    cfgVigencia: document.getElementById('cfgVigencia'),
    cfgCondiciones: document.getElementById('cfgCondiciones'),
    cfgError: document.getElementById('cfgError'),
    cfgSaved: document.getElementById('cfgSaved'),
    guardarConfigBtn: document.getElementById('guardarConfigBtn')
  };

  var navEls = {
    cotizar: els.navCotizar, clientes: els.navClientes, presupuestos: els.navPresupuestos,
    servicios: els.navServicios, estadisticas: els.navEstadisticas, configuracion: els.navConfiguracion
  };

  var state = {
    vehiculo: 'moto',
    screen: 'form',
    lastScreens: { cotizar: 'form', clientes: 'clientesList', presupuestos: 'presupuestosList', servicios: 'serviciosList', estadisticas: 'estadisticas', configuracion: 'configuracion' },
    clienteSeleccionadoId: null,
    clienteEditandoId: null,
    clienteTipoForm: 'particular',
    descuentoTipo: '',
    result: null,
    editingQuoteId: null,
    currentQuote: null,
    presupuestoOrigen: 'flow',
    presupuestosFiltroEstado: '',
    serviciosFiltroEstado: '',
    servicioEditandoId: null
  };

  var settings = Storage.getSettings();
  var recargoRefs = [];
  var cfgRecargoInputs = [];

  var SCREEN_SUB = {
    form: 'Moto y auto · dirección real',
    loading: 'Calculando...',
    result: 'Resultado del cálculo',
    presupuesto: 'Presupuesto para el cliente',
    clientesList: 'Tus clientes guardados',
    clientesForm: 'Datos del cliente',
    presupuestosList: 'Historial de presupuestos',
    serviciosList: 'Servicios operativos',
    servicioForm: 'Datos del servicio',
    estadisticas: 'Panel de control',
    configuracion: 'Empresa, tarifas y presupuestos'
  };

  function zoneOf(name) {
    return Object.keys(ZONES).filter(function (z) { return ZONES[z].indexOf(name) !== -1; })[0];
  }

  function showScreen(name) {
    state.screen = name;
    Object.keys(els.screens).forEach(function (key) {
      els.screens[key].hidden = key !== name;
    });
    els.headerSub.textContent = SCREEN_SUB[name] || '';
    els.backBtn.style.display = TOP_LEVEL.indexOf(name) !== -1 ? 'none' : 'flex';

    var zone = zoneOf(name);
    if (zone) {
      state.lastScreens[zone] = name;
      Object.keys(navEls).forEach(function (z) { navEls[z].classList.toggle('active', z === zone); });
    }
  }

  els.backBtn.addEventListener('click', function () {
    if (state.screen === 'presupuesto') showScreen(state.presupuestoOrigen === 'historial' ? 'presupuestosList' : 'result');
    else if (state.screen === 'result') showScreen('form');
    else if (state.screen === 'clientesForm') showScreen('clientesList');
    else if (state.screen === 'servicioForm') showScreen('serviciosList');
  });

  els.navCotizar.addEventListener('click', function () { showScreen(state.lastScreens.cotizar); });
  els.navClientes.addEventListener('click', function () { renderClientesList(); showScreen(state.lastScreens.clientes); });
  els.navPresupuestos.addEventListener('click', function () { renderPresupuestosList(); showScreen(state.lastScreens.presupuestos); });
  els.navServicios.addEventListener('click', function () { renderServiciosList(); showScreen(state.lastScreens.servicios); });
  els.navEstadisticas.addEventListener('click', function () { renderDashboard(); showScreen(state.lastScreens.estadisticas); });
  els.navConfiguracion.addEventListener('click', function () { loadConfigForm(); showScreen(state.lastScreens.configuracion); });

  function setVehiculo(v) {
    state.vehiculo = v;
    els.btnMoto.classList.toggle('active', v === 'moto');
    els.btnAuto.classList.toggle('active', v === 'auto');
  }
  els.btnMoto.addEventListener('click', function () { setVehiculo('moto'); });
  els.btnAuto.addEventListener('click', function () { setVehiculo('auto'); });

  function showFormError(msg) { els.formError.textContent = msg; els.formError.hidden = false; }
  function hideFormError() { els.formError.hidden = true; }

  if (settings.ultimoPrecioKm) els.precioKm.value = settings.ultimoPrecioKm;

  // --- Cliente guardado dentro del cotizador ---

  function populateClienteSelect() {
    var clientes = Clients.listar({});
    var current = els.clienteSelect.value;
    els.clienteSelect.innerHTML = '<option value="">— Particular / nuevo —</option>';
    clientes.forEach(function (c) {
      var opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = c.nombre + (c.empresa ? ' (' + c.empresa + ')' : '');
      els.clienteSelect.appendChild(opt);
    });
    if (clientes.some(function (c) { return c.id === current; })) els.clienteSelect.value = current;
  }

  els.clienteSelect.addEventListener('change', function () {
    var id = els.clienteSelect.value;
    state.clienteSeleccionadoId = id || null;
    if (!id) return;
    var c = Clients.obtener(id);
    if (!c) return;
    els.cliente.value = c.nombre;
    if (c.direccionHabitual) els.origen.value = c.direccionHabitual;
    if (c.tarifaPersonalizada && c.tarifaPersonalizada.activa && c.tarifaPersonalizada.precioKm) {
      els.precioKm.value = c.tarifaPersonalizada.precioKm;
    }
  });

  // --- Paradas ---

  function addParadaRow(valor) {
    var row = document.createElement('div');
    row.className = 'parada-row';
    var input = document.createElement('input');
    input.type = 'text';
    input.className = 'parada-input';
    input.placeholder = 'Dirección de la parada';
    input.value = valor || '';
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'remove-btn';
    btn.setAttribute('aria-label', 'Quitar parada');
    btn.innerHTML = ICON_CLOSE;
    btn.addEventListener('click', function () { row.remove(); });
    row.appendChild(input);
    row.appendChild(btn);
    els.paradasList.appendChild(row);
  }
  els.addParadaBtn.addEventListener('click', function () { addParadaRow(''); });

  function getParadas() {
    return Array.prototype.slice.call(els.paradasList.querySelectorAll('.parada-input'))
      .map(function (i) { return i.value.trim(); })
      .filter(Boolean);
  }
  function setParadas(arr) {
    els.paradasList.innerHTML = '';
    (arr || []).forEach(function (p) { addParadaRow(p); });
  }

  // --- Recargos (cotizador) ---

  function renderRecargosCheckboxes() {
    recargoRefs = [];
    els.recargosList.innerHTML = '';
    settings.recargosDisponibles.forEach(function (r) {
      var row = document.createElement('div');
      row.className = 'recargo-row';
      var label = document.createElement('label');
      label.className = 'checkbox-label';
      var chk = document.createElement('input');
      chk.type = 'checkbox';
      var span = document.createElement('span');
      span.textContent = r.nombre;
      label.appendChild(chk);
      label.appendChild(span);
      var monto = document.createElement('input');
      monto.type = 'number';
      monto.value = r.monto || 0;
      row.appendChild(label);
      row.appendChild(monto);
      els.recargosList.appendChild(row);
      recargoRefs.push({ id: r.id, nombre: r.nombre, checkbox: chk, montoInput: monto });
    });
  }
  function getRecargosSeleccionados() {
    return recargoRefs.filter(function (r) { return r.checkbox.checked; })
      .map(function (r) { return { concepto: r.nombre, monto: Number(r.montoInput.value) || 0 }; })
      .filter(function (r) { return r.monto > 0; });
  }
  function setRecargosSeleccionados(lista) {
    recargoRefs.forEach(function (r) {
      var match = (lista || []).filter(function (x) { return x.concepto === r.nombre; })[0];
      r.checkbox.checked = !!match;
      if (match) r.montoInput.value = match.monto;
    });
  }

  // --- Descuento (cotizador) ---

  function setDescuentoTipo(tipo) {
    state.descuentoTipo = tipo;
    els.descuentoNinguno.classList.toggle('active', tipo === '');
    els.descuentoMonto.classList.toggle('active', tipo === 'monto');
    els.descuentoPorcentaje.classList.toggle('active', tipo === 'porcentaje');
    els.descuentoRow.hidden = tipo === '';
    els.descuentoUnidad.textContent = tipo === 'porcentaje' ? '%' : '$';
  }
  [els.descuentoNinguno, els.descuentoMonto, els.descuentoPorcentaje].forEach(function (btn) {
    btn.addEventListener('click', function () { setDescuentoTipo(btn.dataset.tipo); });
  });
  function getDescuento() {
    if (!state.descuentoTipo) return null;
    var valor = Number(els.descuentoValor.value) || 0;
    if (valor <= 0) return null;
    return { tipo: state.descuentoTipo, valor: valor };
  }

  // --- Cotizador: calcular ---

  var calculando = false;

  function calcular() {
    if (calculando) return;

    var cliente = els.cliente.value.trim();
    var origen = els.origen.value.trim();
    var destino = els.destino.value.trim();
    var paradas = getParadas();
    var precioKm = Number(els.precioKm.value);

    if (!cliente || !origen || !destino) {
      showFormError('Completá cliente, dirección de retiro y de entrega.');
      return;
    }
    if (isNaN(precioKm) || precioKm < 0) {
      showFormError('El precio por km no puede ser negativo.');
      return;
    }
    hideFormError();
    calculando = true;
    els.calcularBtn.disabled = true;
    showScreen('loading');

    var direcciones = [origen].concat(paradas, [destino]);

    Promise.all(direcciones.map(Maps.geocode)).then(function (puntos) {
      return Maps.routeDistanceKm(puntos).then(function (km) {
        var kmRounded = Math.round(km * 10) / 10;
        var cotizacion = Calculator.calcularCotizacion({
          vehiculo: state.vehiculo,
          distanciaKm: kmRounded,
          precioKmManual: precioKm > 0 ? precioKm : null,
          config: settings,
          recargos: getRecargosSeleccionados(),
          descuento: getDescuento()
        });
        state.result = {
          cliente: cliente, vehiculo: state.vehiculo,
          origen: origen, paradas: paradas, destino: destino,
          precioKm: precioKm, distanciaKm: kmRounded,
          cotizacion: cotizacion, total: cotizacion.total,
          clienteId: state.clienteSeleccionadoId,
          notasInternas: els.notasInternas.value.trim(),
          observacionesCliente: els.observacionesCliente.value.trim(),
          fecha: new Date(), puntos: puntos
        };
        if (precioKm > 0) {
          settings.ultimoPrecioKm = precioKm;
          Storage.saveSettings(settings);
        }
        fillResultScreen();
        showScreen('result');
      });
    }).catch(function (err) {
      var msg = 'No se pudo calcular la distancia. Revisá la conexión e intentá de nuevo.';
      var m = String(err && err.message || '');
      if (m.indexOf('not_found:') === 0) {
        msg = 'No se encontró la dirección: "' + m.slice(10) + '". Probá agregando altura y localidad.';
      }
      showScreen('form');
      showFormError(msg);
    }).finally(function () {
      calculando = false;
      els.calcularBtn.disabled = false;
    });
  }
  els.calcularBtn.addEventListener('click', calcular);

  [els.cliente, els.origen, els.destino, els.precioKm].forEach(function (input) {
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') calcular();
    });
  });

  function toggleRow(el, show) { el.hidden = !show; }

  function fillResultScreen() {
    var r = state.result;
    var c = r.cotizacion;

    els.chipIcon.innerHTML = ICONS[r.vehiculo];
    els.chipText.textContent = (r.vehiculo === 'moto' ? 'Moto' : 'Auto') + ' · para ' + r.cliente;
    els.resOrigen.textContent = r.origen;

    els.resParadas.innerHTML = '';
    r.paradas.forEach(function (p, i) {
      var wrap = document.createElement('div');
      var lbl = document.createElement('div'); lbl.className = 'label-sm'; lbl.textContent = 'Parada ' + (i + 1);
      var txt = document.createElement('div'); txt.className = 'addr-text'; txt.textContent = p;
      wrap.appendChild(lbl); wrap.appendChild(txt);
      els.resParadas.appendChild(wrap);
    });

    els.resDestino.textContent = r.destino;
    els.resKm.textContent = r.distanciaKm + ' km';

    toggleRow(els.rowTarifaBase, c.tarifaBase > 0);
    if (c.tarifaBase > 0) els.resTarifaBase.textContent = '$ ' + fmtMoney(c.tarifaBase);

    toggleRow(els.rowKmIncluidos, c.kmIncluidos > 0);
    if (c.kmIncluidos > 0) els.resKmIncluidos.textContent = c.kmIncluidos + ' km';

    els.resKmAdicionales.textContent = c.kmAdicionales + ' km × $ ' + fmtMoney(c.precioKmAdicional) + ' = $ ' + fmtMoney(c.montoKmAdicional);

    toggleRow(els.rowRecargos, c.recargosTotal > 0);
    if (c.recargosTotal > 0) {
      var html = '<div class="detail-label">Recargos</div>';
      c.recargos.forEach(function (rec) {
        html += '<div class="detail-row"><span class="detail-label">' + escapeHtml(rec.concepto) + '</span><span class="detail-value">$ ' + fmtMoney(rec.monto) + '</span></div>';
      });
      els.rowRecargos.innerHTML = html;
    }

    toggleRow(els.rowDescuentos, c.descuentoTotal > 0);
    if (c.descuentoTotal > 0) {
      els.resDescuentoLabel.textContent = c.descuento.tipo === 'porcentaje' ? 'Descuento (' + c.descuento.valor + '%)' : 'Descuento';
      els.resDescuentos.textContent = '− $ ' + fmtMoney(c.descuentoTotal);
    }

    els.resTotal.textContent = '$ ' + fmtMoney(c.total);
    var coords = r.puntos.map(function (p) { return p.lat + ',' + p.lon; }).join(';');
    els.mapLink.href = 'https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=' + coords;
  }

  els.generarBtn.addEventListener('click', function () {
    var r = state.result;
    var clienteObj = r.clienteId ? Clients.obtener(r.clienteId) : null;
    var quoteData = {
      clienteId: r.clienteId,
      cliente: r.cliente,
      clienteEmpresa: clienteObj ? clienteObj.empresa : '',
      clienteContacto: clienteObj ? (clienteObj.whatsapp || clienteObj.telefono) : '',
      vehiculo: r.vehiculo,
      origen: r.origen,
      paradas: r.paradas,
      destino: r.destino,
      distanciaKm: r.distanciaKm,
      cotizacion: r.cotizacion,
      total: r.total,
      notasInternas: r.notasInternas,
      observacionesCliente: r.observacionesCliente,
      puntos: r.puntos
    };
    var quote;
    if (state.editingQuoteId) {
      quote = Quotes.actualizar(state.editingQuoteId, quoteData);
      state.editingQuoteId = null;
    } else {
      quote = Quotes.crear(quoteData);
    }
    state.currentQuote = quote;
    state.presupuestoOrigen = 'flow';
    fillPresupuestoScreen(quote);
    showScreen('presupuesto');
  });

  els.editarBtn.addEventListener('click', function () { showScreen('form'); });

  function resetForm() {
    els.cliente.value = '';
    els.origen.value = '';
    els.destino.value = '';
    els.clienteSelect.value = '';
    setParadas([]);
    renderRecargosCheckboxes();
    setDescuentoTipo('');
    els.descuentoValor.value = '';
    els.notasInternas.value = '';
    els.observacionesCliente.value = '';
    state.clienteSeleccionadoId = null;
    state.editingQuoteId = null;
    state.result = null;
    hideFormError();
  }

  els.nuevaBtn.addEventListener('click', function () {
    resetForm();
    showScreen('form');
  });

  // --- Presupuesto profesional (pantalla + PDF + WhatsApp + estado) ---

  function rutaBlock(label, texto) {
    var wrap = document.createElement('div');
    var lbl = document.createElement('div'); lbl.className = 'label-sm'; lbl.textContent = label;
    var txt = document.createElement('div'); txt.className = 'addr-text'; txt.style.fontSize = '14px'; txt.textContent = texto;
    wrap.appendChild(lbl); wrap.appendChild(txt);
    return wrap;
  }
  function detailRowHtml(label, value) {
    return '<div class="detail-row"><span class="detail-label">' + escapeHtml(label) + '</span><span class="detail-value">' + escapeHtml(value) + '</span></div>';
  }

  function actualizarEstadoChipYAcciones(q) {
    els.docEstadoChip.innerHTML = '<span class="badge-estado ' + q.estado + '">' + (ESTADO_QUOTE_LABELS[q.estado] || q.estado) + '</span>';
    els.convertirServicioBtn.hidden = q.estado !== 'aceptado';
    els.estadoToggle.hidden = q.estado !== 'pendiente';
  }

  function fillPresupuestoScreen(q) {
    els.docEmpresaNombre.textContent = settings.empresa.nombre || 'Lanzor Mobility';
    els.docNumero.textContent = q.numero;
    els.docFecha.textContent = fmtFecha(q.fecha);
    els.docVigencia.textContent = fmtFecha(q.vigenciaHasta);
    els.docClienteNombre.textContent = q.cliente;

    var metaParts = [];
    if (q.clienteEmpresa) metaParts.push(q.clienteEmpresa);
    if (q.clienteContacto) metaParts.push(q.clienteContacto);
    els.docClienteMeta.textContent = metaParts.join(' · ');

    els.docVehIcon.innerHTML = ICONS[q.vehiculo];
    els.docVehTexto.textContent = q.vehiculo === 'moto' ? 'Moto' : 'Auto';

    els.docRuta.innerHTML = '';
    els.docRuta.appendChild(rutaBlock('Retiro', q.origen));
    (q.paradas || []).forEach(function (p, i) { els.docRuta.appendChild(rutaBlock('Parada ' + (i + 1), p)); });
    els.docRuta.appendChild(rutaBlock('Entrega', q.destino));

    var c = q.cotizacion;
    var rows = [];
    rows.push(detailRowHtml('Distancia total', q.distanciaKm + ' km'));
    if (c.tarifaBase > 0) rows.push(detailRowHtml('Tarifa base', '$ ' + fmtMoney(c.tarifaBase)));
    if (c.kmIncluidos > 0) rows.push(detailRowHtml('Km incluidos', c.kmIncluidos + ' km'));
    rows.push(detailRowHtml('Km adicionales', c.kmAdicionales + ' km × $ ' + fmtMoney(c.precioKmAdicional)));
    (c.recargos || []).forEach(function (rec) { rows.push(detailRowHtml(rec.concepto, '$ ' + fmtMoney(rec.monto))); });
    if (c.descuentoTotal > 0) {
      var lbl = c.descuento.tipo === 'porcentaje' ? 'Descuento (' + c.descuento.valor + '%)' : 'Descuento';
      rows.push(detailRowHtml(lbl, '− $ ' + fmtMoney(c.descuentoTotal)));
    }
    els.docDetalle.innerHTML = rows.join('');

    els.docTotal.textContent = '$ ' + fmtMoney(q.total);

    if (q.observacionesCliente) { els.docObservaciones.hidden = false; els.docObservaciones.textContent = q.observacionesCliente; }
    else els.docObservaciones.hidden = true;

    els.docCondiciones.textContent = settings.presupuestos.condiciones || '';
    var contactoParts = [];
    if (settings.empresa.telefono) contactoParts.push('Tel: ' + settings.empresa.telefono);
    if (settings.empresa.whatsapp) contactoParts.push('WhatsApp: ' + settings.empresa.whatsapp);
    if (settings.empresa.email) contactoParts.push(settings.empresa.email);
    els.docContacto.textContent = contactoParts.join(' · ');

    actualizarEstadoChipYAcciones(q);
  }

  function verPresupuesto(id) {
    var q = Quotes.obtener(id);
    if (!q) return;
    state.currentQuote = q;
    state.presupuestoOrigen = 'historial';
    fillPresupuestoScreen(q);
    showScreen('presupuesto');
  }

  function editarPresupuesto(id) {
    var q = Quotes.obtener(id);
    if (!q) return;
    state.editingQuoteId = id;
    state.clienteSeleccionadoId = q.clienteId || null;
    setVehiculo(q.vehiculo);
    els.clienteSelect.value = q.clienteId || '';
    els.cliente.value = q.cliente;
    els.origen.value = q.origen;
    setParadas(q.paradas);
    els.destino.value = q.destino;
    var esManual = q.cotizacion.tarifaBase === 0 && q.cotizacion.kmIncluidos === 0;
    els.precioKm.value = esManual ? q.cotizacion.precioKmAdicional : 0;
    renderRecargosCheckboxes();
    setRecargosSeleccionados(q.cotizacion.recargos);
    setDescuentoTipo(q.cotizacion.descuento ? q.cotizacion.descuento.tipo : '');
    els.descuentoValor.value = q.cotizacion.descuento ? q.cotizacion.descuento.valor : '';
    els.notasInternas.value = q.notasInternas || '';
    els.observacionesCliente.value = q.observacionesCliente || '';
    hideFormError();
    showScreen('form');
  }

  els.whatsappBtn.addEventListener('click', function () {
    var q = state.currentQuote;
    if (!q) return;
    var cliente = q.clienteId ? Clients.obtener(q.clienteId) : null;
    var telefono = cliente ? (cliente.whatsapp || cliente.telefono) : '';
    window.open(WhatsApp.link(telefono, WhatsApp.mensaje(q, settings.empresa)), '_blank');
  });

  els.pdfBtn.addEventListener('click', function () { window.print(); });

  els.marcarAceptadoBtn.addEventListener('click', function () {
    var q = Quotes.cambiarEstado(state.currentQuote.id, 'aceptado');
    state.currentQuote = q;
    actualizarEstadoChipYAcciones(q);
  });
  els.marcarRechazadoBtn.addEventListener('click', function () {
    var q = Quotes.cambiarEstado(state.currentQuote.id, 'rechazado');
    state.currentQuote = q;
    actualizarEstadoChipYAcciones(q);
  });

  els.convertirServicioBtn.addEventListener('click', function () {
    var q = state.currentQuote;
    if (!q) return;
    Services.crearDesdeQuote(q, {});
    els.convertirServicioBtn.textContent = 'Convertido ✓';
    els.convertirServicioBtn.style.opacity = '.6';
    els.convertirServicioBtn.disabled = true;
    setTimeout(function () {
      els.convertirServicioBtn.disabled = false;
      els.convertirServicioBtn.style.opacity = '';
      els.convertirServicioBtn.textContent = 'Convertir en servicio';
      renderServiciosList();
      showScreen(state.lastScreens.servicios);
    }, 900);
  });

  // --- Clientes: listado, alta, edición, baja ---

  function renderClientesList() {
    var clientes = Clients.listar({ query: els.clientesBuscar.value });
    els.clientesList.innerHTML = '';
    els.clientesEmpty.hidden = clientes.length > 0;

    clientes.forEach(function (c) {
      var card = document.createElement('div');
      card.className = 'client-card';

      var top = document.createElement('div');
      top.className = 'client-card-top';

      var info = document.createElement('div');
      var nameEl = document.createElement('div');
      nameEl.className = 'client-name';
      nameEl.textContent = c.nombre;

      var metaParts = [];
      if (c.empresa) metaParts.push(c.empresa);
      if (c.telefono) metaParts.push(c.telefono);
      if (c.tarifaPersonalizada && c.tarifaPersonalizada.activa) {
        metaParts.push('$ ' + fmtMoney(c.tarifaPersonalizada.precioKm) + '/km');
      }
      var metaEl = document.createElement('div');
      metaEl.className = 'client-meta';
      metaEl.textContent = metaParts.join(' · ') || 'Sin datos adicionales';

      info.appendChild(nameEl);
      info.appendChild(metaEl);

      var badge = document.createElement('span');
      badge.className = 'client-badge';
      badge.textContent = c.tipo === 'corporativo' ? 'Corporativo' : 'Particular';

      top.appendChild(info);
      top.appendChild(badge);

      var actions = document.createElement('div');
      actions.className = 'client-actions';

      var editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'icon-btn';
      editBtn.setAttribute('aria-label', 'Editar cliente');
      editBtn.innerHTML = ICON_EDIT;
      editBtn.addEventListener('click', function () { openClienteForm(c.id); });

      var delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'icon-btn danger';
      delBtn.setAttribute('aria-label', 'Eliminar cliente');
      delBtn.innerHTML = ICON_TRASH;
      attachConfirmDelete(delBtn, function () {
        Clients.eliminar(c.id);
        renderClientesList();
        populateClienteSelect();
      });

      actions.appendChild(editBtn);
      actions.appendChild(delBtn);

      card.appendChild(top);
      card.appendChild(actions);
      els.clientesList.appendChild(card);
    });
  }
  els.clientesBuscar.addEventListener('input', renderClientesList);

  function setTipoForm(v) {
    state.clienteTipoForm = v;
    els.tipoParticular.classList.toggle('active', v === 'particular');
    els.tipoCorporativo.classList.toggle('active', v === 'corporativo');
  }
  els.tipoParticular.addEventListener('click', function () { setTipoForm('particular'); });
  els.tipoCorporativo.addEventListener('click', function () { setTipoForm('corporativo'); });

  els.cfTarifaActiva.addEventListener('change', function () {
    els.cfTarifaRow.hidden = !els.cfTarifaActiva.checked;
  });

  function showClienteFormError(msg) { els.clienteFormError.textContent = msg; els.clienteFormError.hidden = false; }
  function hideClienteFormError() { els.clienteFormError.hidden = true; }

  function openClienteForm(id) {
    state.clienteEditandoId = id || null;
    hideClienteFormError();
    var c = id ? Clients.obtener(id) : null;

    setTipoForm((c && c.tipo) || 'particular');
    els.cfNombre.value = c ? c.nombre : '';
    els.cfEmpresa.value = c ? c.empresa : '';
    els.cfTelefono.value = c ? c.telefono : '';
    els.cfWhatsapp.value = c ? c.whatsapp : '';
    els.cfEmail.value = c ? c.email : '';
    els.cfDireccion.value = c ? c.direccionHabitual : '';
    els.cfNotas.value = c ? c.notas : '';

    var tarifaActiva = !!(c && c.tarifaPersonalizada && c.tarifaPersonalizada.activa);
    els.cfTarifaActiva.checked = tarifaActiva;
    els.cfTarifaRow.hidden = !tarifaActiva;
    els.cfTarifaPrecio.value = (c && c.tarifaPersonalizada && c.tarifaPersonalizada.precioKm) || '';

    showScreen('clientesForm');
  }
  els.nuevoClienteBtn.addEventListener('click', function () { openClienteForm(null); });
  els.cancelarClienteBtn.addEventListener('click', function () { showScreen('clientesList'); });

  els.guardarClienteBtn.addEventListener('click', function () {
    var data = {
      nombre: els.cfNombre.value, empresa: els.cfEmpresa.value, telefono: els.cfTelefono.value,
      whatsapp: els.cfWhatsapp.value, email: els.cfEmail.value, direccionHabitual: els.cfDireccion.value,
      tipo: state.clienteTipoForm,
      tarifaPersonalizada: { activa: els.cfTarifaActiva.checked, precioKm: els.cfTarifaPrecio.value },
      notas: els.cfNotas.value
    };
    var res = state.clienteEditandoId ? Clients.actualizar(state.clienteEditandoId, data) : Clients.crear(data);
    if (!res.ok) { showClienteFormError(res.errores.join(' ')); return; }
    populateClienteSelect();
    renderClientesList();
    showScreen('clientesList');
  });

  // --- Presupuestos (historial) ---

  function renderPresupuestosList() {
    var quotes = Quotes.listar({ query: els.presupuestosBuscar.value, estado: state.presupuestosFiltroEstado });
    els.presupuestosList.innerHTML = '';
    els.presupuestosEmpty.hidden = quotes.length > 0;

    quotes.forEach(function (q) {
      var card = document.createElement('div');
      card.className = 'quote-card';
      card.innerHTML =
        '<div class="record-top">' +
          '<div><div class="record-title">' + escapeHtml(q.numero) + '</div>' +
          '<div class="record-meta">' + escapeHtml(q.cliente) + ' · ' + escapeHtml(q.origen) + ' → ' + escapeHtml(q.destino) + '</div></div>' +
          '<div style="text-align:right;"><div class="record-total">$ ' + fmtMoney(q.total) + '</div>' +
          '<span class="badge-estado ' + q.estado + '" style="margin-top:6px;display:inline-block;">' + (ESTADO_QUOTE_LABELS[q.estado] || q.estado) + '</span></div>' +
        '</div>' +
        '<div class="record-actions">' +
          '<button type="button" class="icon-btn" data-action="ver">Ver</button>' +
          '<button type="button" class="icon-btn" data-action="editar">Editar</button>' +
          '<button type="button" class="icon-btn" data-action="duplicar">Duplicar</button>' +
          '<button type="button" class="icon-btn danger" data-action="eliminar">Eliminar</button>' +
        '</div>';

      card.querySelector('[data-action="ver"]').addEventListener('click', function () { verPresupuesto(q.id); });
      card.querySelector('[data-action="editar"]').addEventListener('click', function () { editarPresupuesto(q.id); });
      card.querySelector('[data-action="duplicar"]').addEventListener('click', function () { Quotes.duplicar(q.id); renderPresupuestosList(); });
      attachConfirmDelete(card.querySelector('[data-action="eliminar"]'), function () { Quotes.eliminar(q.id); renderPresupuestosList(); });

      els.presupuestosList.appendChild(card);
    });
  }
  els.presupuestosBuscar.addEventListener('input', renderPresupuestosList);
  els.presupuestosFiltros.addEventListener('click', function (e) {
    var btn = e.target.closest('.nav-pill');
    if (!btn) return;
    Array.prototype.forEach.call(els.presupuestosFiltros.children, function (b) { b.classList.toggle('active', b === btn); });
    state.presupuestosFiltroEstado = btn.dataset.estado;
    renderPresupuestosList();
  });

  // --- Servicios ---

  function renderServiciosList() {
    var services = Services.listar({ estado: state.serviciosFiltroEstado });
    els.serviciosList.innerHTML = '';
    els.serviciosEmpty.hidden = services.length > 0;

    services.forEach(function (s) {
      var card = document.createElement('div');
      card.className = 'service-card';
      card.innerHTML =
        '<div class="record-top">' +
          '<div><div class="record-title">' + escapeHtml(s.cliente) + '</div>' +
          '<div class="record-meta">' + escapeHtml(s.fecha) + ' ' + escapeHtml(s.hora || '') + ' · ' + (s.vehiculo === 'moto' ? 'Moto' : 'Auto') + (s.conductor ? ' · ' + escapeHtml(s.conductor) : '') + '</div></div>' +
          '<div class="record-total">$ ' + fmtMoney(s.total) + '</div>' +
        '</div>' +
        '<div class="record-actions">' +
          '<select class="estado-select" style="border:1.5px solid var(--line);border-radius:9px;padding:8px 10px;font-size:12.5px;background:var(--surface);color:var(--ink);"></select>' +
          '<button type="button" class="icon-btn" data-action="editar">Editar</button>' +
          '<button type="button" class="icon-btn danger" data-action="eliminar">Eliminar</button>' +
        '</div>';

      var select = card.querySelector('.estado-select');
      Services.ESTADOS.forEach(function (es) {
        var opt = document.createElement('option');
        opt.value = es; opt.textContent = ESTADO_SERVICE_LABELS[es];
        if (es === s.estado) opt.selected = true;
        select.appendChild(opt);
      });
      select.addEventListener('change', function () { Services.cambiarEstado(s.id, select.value); renderServiciosList(); });

      card.querySelector('[data-action="editar"]').addEventListener('click', function () { editarServicio(s.id); });
      attachConfirmDelete(card.querySelector('[data-action="eliminar"]'), function () { Services.eliminar(s.id); renderServiciosList(); });

      els.serviciosList.appendChild(card);
    });
  }
  els.serviciosFiltros.addEventListener('click', function (e) {
    var btn = e.target.closest('.nav-pill');
    if (!btn) return;
    Array.prototype.forEach.call(els.serviciosFiltros.children, function (b) { b.classList.toggle('active', b === btn); });
    state.serviciosFiltroEstado = btn.dataset.estado;
    renderServiciosList();
  });

  function editarServicio(id) {
    var s = Services.obtener(id);
    if (!s) return;
    state.servicioEditandoId = id;
    els.sfClienteLabel.textContent = s.cliente;
    els.sfFecha.value = s.fecha;
    els.sfHora.value = s.hora;
    els.sfConductor.value = s.conductor || '';
    els.sfEstado.value = s.estado;
    showScreen('servicioForm');
  }
  els.guardarServicioBtn.addEventListener('click', function () {
    Services.actualizar(state.servicioEditandoId, {
      fecha: els.sfFecha.value.trim(), hora: els.sfHora.value.trim(),
      conductor: els.sfConductor.value.trim(), estado: els.sfEstado.value
    });
    renderServiciosList();
    showScreen('serviciosList');
  });
  els.cancelarServicioBtn.addEventListener('click', function () { showScreen('serviciosList'); });

  // --- Estadísticas ---

  function renderBarChart(container, data) {
    if (data.every(function (d) { return d.monto === 0; })) {
      container.innerHTML = '<div class="empty-chart">Sin ingresos registrados todavía.</div>';
      return;
    }
    var w = 280, h = 130;
    var max = Math.max.apply(null, data.map(function (d) { return d.monto; }));
    var barW = w / data.length;
    var svg = data.map(function (d, i) {
      var bh = Math.max(Math.round((d.monto / max) * (h - 26)), 2);
      var x = i * barW + barW * 0.22;
      var bw = barW * 0.56;
      var y = h - 22 - bh;
      return '<rect x="' + x.toFixed(1) + '" y="' + y + '" width="' + bw.toFixed(1) + '" height="' + bh + '" rx="4" fill="' + COLOR_MOTO + '"></rect>' +
        '<text x="' + (x + bw / 2).toFixed(1) + '" y="' + (h - 6) + '" text-anchor="middle" font-size="9" fill="var(--ink-muted)">' + escapeHtml(d.label) + '</text>';
    }).join('');
    container.innerHTML = '<svg viewBox="0 0 ' + w + ' ' + h + '" style="width:100%;height:auto;display:block;">' + svg + '</svg>';
  }

  function renderVehiculoChart(container, data) {
    var total = data.moto + data.auto;
    if (!total) { container.innerHTML = '<div class="empty-chart">Sin servicios este mes.</div>'; return; }
    var motoPct = Math.round((data.moto / total) * 100);
    var autoPct = 100 - motoPct;
    container.innerHTML =
      '<div style="display:flex;flex-direction:column;gap:12px;">' +
        barRow('Moto', data.moto, motoPct, COLOR_MOTO) +
        barRow('Auto', data.auto, autoPct, COLOR_AUTO) +
      '</div>';
  }
  function barRow(label, count, pct, color) {
    return '<div><div style="display:flex;justify-content:space-between;font-size:12.5px;color:var(--ink-muted);margin-bottom:4px;"><span>' + label + '</span><span>' + count + '</span></div>' +
      '<div style="height:10px;border-radius:6px;background:var(--surface-alt);overflow:hidden;"><div style="height:100%;width:' + pct + '%;background:' + color + ';border-radius:6px;"></div></div></div>';
  }

  function renderTopClientes(container, lista) {
    if (!lista.length) { container.innerHTML = '<div class="empty-chart">Sin datos este mes.</div>'; return; }
    container.innerHTML = lista.map(function (c) {
      return '<div class="top-client-row"><span>' + escapeHtml(c.nombre) + '</span><span>$ ' + fmtMoney(c.total) + '</span></div>';
    }).join('');
  }

  function renderDashboard() {
    var hoy = Dashboard.resumenHoy();
    els.dHoyServicios.textContent = hoy.servicios;
    els.dHoyPresupuestos.textContent = hoy.presupuestos;
    els.dHoyIngresos.textContent = '$ ' + fmtMoney(hoy.ingresos);
    els.dHoyKm.textContent = hoy.kilometros + ' km';

    var mes = Dashboard.resumenMes();
    els.dMesIngresos.textContent = '$ ' + fmtMoney(mes.ingresos);
    els.dMesServicios.textContent = mes.servicios;
    els.dMesKm.textContent = mes.kilometros + ' km';
    els.dMesClientes.textContent = mes.clientes;
    els.dMesTicket.textContent = '$ ' + fmtMoney(mes.ticketPromedio);

    renderBarChart(els.chartIngresos, Dashboard.ingresosPorDia(7));
    renderVehiculoChart(els.chartVehiculo, Dashboard.motoVsAuto());
    renderTopClientes(els.chartClientes, Dashboard.principalesClientes(5));
  }

  // --- Configuración ---

  function showCfgError(msg) { els.cfgError.textContent = msg; els.cfgError.hidden = false; }
  function hideCfgError() { els.cfgError.hidden = true; }

  function loadConfigForm() {
    settings = Storage.getSettings();
    els.cfgEmpresaNombre.value = settings.empresa.nombre;
    els.cfgEmpresaTelefono.value = settings.empresa.telefono;
    els.cfgEmpresaWhatsapp.value = settings.empresa.whatsapp;
    els.cfgEmpresaEmail.value = settings.empresa.email;
    els.cfgEmpresaDireccion.value = settings.empresa.direccion;
    els.cfgEmpresaWeb.value = settings.empresa.web;

    els.cfgMotoMinima.value = settings.tarifas.moto.tarifaMinima;
    els.cfgMotoKmInc.value = settings.tarifas.moto.kmIncluidos;
    els.cfgMotoKmAdic.value = settings.tarifas.moto.precioKmAdicional;
    els.cfgAutoMinima.value = settings.tarifas.auto.tarifaMinima;
    els.cfgAutoKmInc.value = settings.tarifas.auto.kmIncluidos;
    els.cfgAutoKmAdic.value = settings.tarifas.auto.precioKmAdicional;

    els.cfgPrefijo.value = settings.presupuestos.prefijo;
    els.cfgVigencia.value = settings.presupuestos.vigenciaDias;
    els.cfgCondiciones.value = settings.presupuestos.condiciones;

    cfgRecargoInputs = [];
    els.cfgRecargosList.innerHTML = '';
    settings.recargosDisponibles.forEach(function (r) {
      var row = document.createElement('div');
      row.className = 'recargo-row';
      var span = document.createElement('span');
      span.style.flex = '1';
      span.textContent = r.nombre;
      var input = document.createElement('input');
      input.type = 'number';
      input.value = r.monto;
      row.appendChild(span);
      row.appendChild(input);
      els.cfgRecargosList.appendChild(row);
      cfgRecargoInputs.push({ id: r.id, nombre: r.nombre, input: input });
    });

    els.cfgSaved.hidden = true;
    hideCfgError();
  }

  els.guardarConfigBtn.addEventListener('click', function () {
    var nombre = els.cfgEmpresaNombre.value.trim();
    if (!nombre) { showCfgError('El nombre de la empresa es obligatorio.'); return; }
    var vigencia = Number(els.cfgVigencia.value);
    if (!(vigencia > 0)) { showCfgError('La vigencia debe ser mayor a 0 días.'); return; }
    hideCfgError();

    settings.empresa = {
      nombre: nombre,
      logo: settings.empresa.logo,
      telefono: els.cfgEmpresaTelefono.value.trim(),
      whatsapp: els.cfgEmpresaWhatsapp.value.trim(),
      email: els.cfgEmpresaEmail.value.trim(),
      direccion: els.cfgEmpresaDireccion.value.trim(),
      web: els.cfgEmpresaWeb.value.trim()
    };
    settings.tarifas.moto = {
      tarifaMinima: Number(els.cfgMotoMinima.value) || 0,
      kmIncluidos: Number(els.cfgMotoKmInc.value) || 0,
      precioKmAdicional: Number(els.cfgMotoKmAdic.value) || 0
    };
    settings.tarifas.auto = {
      tarifaMinima: Number(els.cfgAutoMinima.value) || 0,
      kmIncluidos: Number(els.cfgAutoKmInc.value) || 0,
      precioKmAdicional: Number(els.cfgAutoKmAdic.value) || 0
    };
    settings.recargosDisponibles = cfgRecargoInputs.map(function (r) {
      return { id: r.id, nombre: r.nombre, monto: Number(r.input.value) || 0 };
    });
    settings.presupuestos = {
      prefijo: (els.cfgPrefijo.value.trim() || 'LM').toUpperCase(),
      vigenciaDias: vigencia,
      condiciones: els.cfgCondiciones.value.trim()
    };

    Storage.saveSettings(settings);
    els.headerTitle.textContent = settings.empresa.nombre;
    renderRecargosCheckboxes();
    els.cfgSaved.hidden = false;
  });

  // --- Arranque ---

  els.sfEstado.innerHTML = '';
  Services.ESTADOS.forEach(function (es) {
    var opt = document.createElement('option');
    opt.value = es; opt.textContent = ESTADO_SERVICE_LABELS[es];
    els.sfEstado.appendChild(opt);
  });

  els.headerTitle.textContent = settings.empresa.nombre || 'Lanzor Mobility';
  populateClienteSelect();
  renderRecargosCheckboxes();
  setDescuentoTipo('');
  showScreen('form');
})();
