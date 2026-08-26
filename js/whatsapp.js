// Arma el mensaje de WhatsApp y el link wa.me a partir de un presupuesto.
(function (global) {
  'use strict';

  function fmtMoney(n) {
    return Number(n || 0).toLocaleString('es-AR');
  }

  function fmtFecha(iso) {
    return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' });
  }

  function mensaje(quote, empresa) {
    var lineas = [];
    lineas.push('Hola ' + quote.cliente + ' 👋');
    lineas.push('');
    lineas.push('Te compartimos el presupuesto de ' + (empresa && empresa.nombre ? empresa.nombre : 'Tu Empresa') + '.');
    lineas.push('');
    lineas.push('📍 Retiro: ' + quote.origen);
    (quote.paradas || []).forEach(function (p, i) {
      if (p) lineas.push('📍 Parada ' + (i + 1) + ': ' + p);
    });
    lineas.push('📍 Entrega: ' + quote.destino);
    lineas.push('🚗 Vehículo: ' + (quote.vehiculo === 'moto' ? 'Moto' : 'Auto'));
    lineas.push('📏 Distancia: ' + quote.distanciaKm + ' km');
    lineas.push('');
    lineas.push('💰 Total: $ ' + fmtMoney(quote.total));
    lineas.push('');
    lineas.push('Presupuesto: ' + quote.numero);
    lineas.push('Vigencia: ' + fmtFecha(quote.vigenciaHasta));
    return lineas.join('\n');
  }

  // En desktop, wa.me hace una redirección extra antes de llegar a WhatsApp
  // Web que a veces se queda "colgada" (interstitial, cookies de terceros).
  // Yendo directo a web.whatsapp.com/send nos salteamos ese salto.
  function link(telefono, texto) {
    var digits = String(telefono || '').replace(/\D/g, '');
    var esMobile = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '');
    if (esMobile) {
      return (digits ? 'https://wa.me/' + digits : 'https://wa.me/') + '?text=' + encodeURIComponent(texto);
    }
    return 'https://web.whatsapp.com/send?' + (digits ? 'phone=' + digits + '&' : '') + 'text=' + encodeURIComponent(texto);
  }

  global.WhatsApp = {
    mensaje: mensaje,
    link: link
  };
})(window);
