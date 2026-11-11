import React, { useMemo, useState } from 'react';
import VentasGeneralModal from './VentasGeneralModal';

function CanalDesgloseInline({ pagina, panel, vendedores, total, fmt, money = false, compact = true }) {
  const fmtVal = (n) => (money ? fmt(n) : Number(n).toLocaleString('es-CO'));
  const cls = compact ? 'text-[10px] sm:text-xs leading-snug' : 'text-xs sm:text-sm';
  return (
    <div className={`${cls} text-slate-600 mt-2 space-y-0.5`}>
      <div className="flex flex-wrap gap-x-2 gap-y-0.5">
        <span>Pág. <strong className="text-slate-800">{fmtVal(pagina)}</strong></span>
        <span>·</span>
        <span>Panel <strong className="text-slate-800">{fmtVal(panel)}</strong></span>
        <span>·</span>
        <span>Vend. <strong className="text-slate-800">{fmtVal(vendedores)}</strong></span>
      </div>
      <div className="text-slate-500">
        Total <strong className="text-slate-800">{fmtVal(total)}</strong>
      </div>
    </div>
  );
}

function RecaudoGlobalInline({ oficina, pagina, panel, vendedores, total, fmt }) {
  return (
    <div className="text-[10px] sm:text-xs text-slate-600 mt-2 space-y-1">
      <div className="flex justify-between gap-2">
        <span>Oficina (panel + web)</span>
        <strong className="text-slate-800">{fmt(oficina)}</strong>
      </div>
      {(pagina > 0 || panel > 0) && (
        <div className="flex flex-wrap gap-x-2 text-slate-500 pl-1">
          <span>Pág. {fmt(pagina)}</span>
          <span>·</span>
          <span>Panel {fmt(panel)}</span>
        </div>
      )}
      <div className="flex justify-between gap-2">
        <span>Vendedores (entregado)</span>
        <strong className="text-cyan-800">{fmt(vendedores)}</strong>
      </div>
      <div className="flex justify-between gap-2 border-t border-slate-200 pt-1 text-slate-700">
        <span className="font-medium">Global</span>
        <strong>{fmt(total)}</strong>
      </div>
    </div>
  );
}

function RecaudoOficinaInline({ pagina, panel, fmt }) {
  return (
    <div className="text-[10px] sm:text-xs text-slate-600 mt-2 flex flex-wrap gap-x-2 gap-y-0.5">
      <span>Página <strong className="text-slate-800">{fmt(pagina)}</strong></span>
      <span>·</span>
      <span>Panel <strong className="text-slate-800">{fmt(panel)}</strong></span>
    </div>
  );
}

function KPICard({ title, value, belowValue, subtitle, icon, color, expanded, onToggle }) {
  const colorMap = {
    green: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-600', iconBg: 'bg-emerald-100' },
    blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-600', iconBg: 'bg-blue-100' },
    amber: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-600', iconBg: 'bg-amber-100' },
    purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-600', iconBg: 'bg-purple-100' },
    slate: { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-600', iconBg: 'bg-slate-100' },
    rose: { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-600', iconBg: 'bg-rose-100' },
    cyan: { bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-600', iconBg: 'bg-cyan-100' },
    emerald: { bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-700', iconBg: 'bg-emerald-100' },
  };
  const c = colorMap[color] || colorMap.slate;

  return (
    <button
      type="button"
      onClick={onToggle}
      className={`text-left w-full border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col gap-2 sm:gap-3 transition-all duration-200 cursor-pointer min-w-0
        ${expanded ? `${c.bg} shadow-sm` : `bg-white hover:shadow-sm`}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className={`w-9 h-9 sm:w-10 sm:h-10 ${c.iconBg} flex items-center justify-center border border-black shrink-0`}>
          <span className="text-base sm:text-lg">{icon}</span>
        </div>
        {subtitle && (
          <svg className={`w-4 h-4 transition-transform shrink-0 ${expanded ? 'rotate-180' : ''} text-slate-400`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </div>
      <div className="min-w-0">
        <h3 className="text-xs sm:text-sm font-medium text-slate-500 truncate">{title}</h3>
        <p className={`text-xl sm:text-2xl font-semibold ${c.text} mt-1 break-all`}>{value}</p>
        {belowValue && <div className="min-w-0">{belowValue}</div>}
      </div>
      {expanded && subtitle && (
        <div className={`text-xs sm:text-sm ${c.text} font-medium bg-white/60 px-3 py-2 mt-1 border ${c.border} break-words`}>
          {subtitle}
        </div>
      )}
    </button>
  );
}

export default function KPISection({ data, fechaInicio, fechaFin, scope = 'global', extraFilters = {}, showCanalDesglose = false }) {
  const { finanzas, resumen_boletas, rifa, boletas_periodo, ventas_periodo, filtro_aplicado, desglose_canal } = data;
  const dc = showCanalDesglose ? desglose_canal : null;
  const [expandedCard, setExpandedCard] = useState(null);
  const [showVentasModal, setShowVentasModal] = useState(false);

  const precioBoleta = Number(rifa?.precio_boleta) || 0;
  const hayFiltro = !!(fechaInicio && fechaFin);

  const periodoLabel = useMemo(() => {
    if (!fechaInicio && !fechaFin) return 'Total acumulado';
    if (fechaInicio === fechaFin) return `Hoy (${fechaInicio})`;
    return `${fechaInicio} → ${fechaFin}`;
  }, [fechaInicio, fechaFin]);

  const pagadasGlobal = Number(resumen_boletas?.pagadas) || 0;
  const reservadasGlobal = Number(resumen_boletas?.reservadas) || 0;
  const abonadasGlobal = Number(resumen_boletas?.abonadas) || 0;
  const disponibles = Number(resumen_boletas?.disponibles) || 0;
  const anuladasGlobal = Number(resumen_boletas?.anuladas) || 0;
  const totalBoletas = Number(resumen_boletas?.total_boletas) || 0;

  const bp = boletas_periodo || {};
  const pagadas = hayFiltro ? (Number(bp.pagadas) || 0) : pagadasGlobal;
  const reservadas = hayFiltro ? (Number(bp.reservadas) || 0) : reservadasGlobal;
  const abonadas = hayFiltro ? (Number(bp.abonadas) || 0) : abonadasGlobal;
  const anuladas = hayFiltro ? (Number(bp.anuladas) || 0) : anuladasGlobal;

  const recaudoReal = finanzas.recaudo_real || 0;
  const recaudoOficina = finanzas.recaudo_oficina ?? recaudoReal;
  const recaudoGlobal = finanzas.recaudo_global ?? recaudoOficina + (finanzas.vendedores_entregado ?? 0);
  const recaudoTotal = finanzas.recaudo_total || finanzas.recaudo_real || 0;
  const misGanancias = finanzas.mis_ganancias;

  const vendedoresEntregado = finanzas.vendedores_entregado ?? finanzas.recaudo_vendedores ?? 0;
  const vendedoresPorCobrar = finanzas.vendedores_por_cobrar ?? 0;
  const vendedoresCobradoClientes = finanzas.vendedores_cobrado_clientes ?? 0;
  const vendedoresDebeOrg = finanzas.vendedores_debe_organizacion ?? 0;
  const vendedoresLiq = finanzas.recaudo_vendedores_liquidaciones ?? 0;

  const dineroPagedas = pagadas * precioBoleta;
  const dineroReservadas = reservadas * precioBoleta;
  const dineroAbonadoAbonadas = finanzas.abonado_abonadas ?? 0;
  const deudaAbonadas = finanzas.deuda_abonadas ?? 0;
  const dineroDisponibles = disponibles * precioBoleta;

  const totalVentas = Number(ventas_periodo?.total_ventas) || 0;

  const fmt = (n) => `$${Number(n).toLocaleString('es-CO')}`;

  const toggle = (id) => setExpandedCard(prev => prev === id ? null : id);

  const canalBoletasInline = (key) => {
    if (!dc?.boletas) return null;
    const b = dc.boletas;
    return (
      <CanalDesgloseInline
        pagina={b.pagina[key]}
        panel={b.panel[key]}
        vendedores={b.vendedores[key]}
        total={b.total[key]}
        fmt={fmt}
      />
    );
  };

  const canalVentasInline = dc?.ventas ? (
    <CanalDesgloseInline
      pagina={dc.ventas.pagina}
      panel={dc.ventas.panel}
      vendedores={dc.ventas.vendedores}
      total={dc.ventas.total}
      fmt={fmt}
    />
  ) : null;

  const cuentaVendedoresInline = dc?.ingreso_vendedores ? (
    <div className="text-[10px] sm:text-xs text-slate-600 mt-2 space-y-1 border-t border-cyan-100 pt-2">
      <div className="flex justify-between gap-2">
        <span className="text-rose-600 font-medium">Por cobrar (vendedores)</span>
        <strong className="text-rose-700">{fmt(vendedoresPorCobrar)}</strong>
      </div>
      <div className="flex justify-between gap-2 text-slate-500">
        <span>Cobrado a clientes (canal vendedor)</span>
        <span>{fmt(vendedoresCobradoClientes)}</span>
      </div>
      <div className="flex justify-between gap-2 text-slate-500">
        <span>Debe pendiente (vendedores)</span>
        <span>{fmt(vendedoresDebeOrg)}</span>
      </div>
      <div className="flex justify-between gap-2 text-slate-500">
        <span>Liquidaciones registradas</span>
        <span>{fmt(vendedoresLiq)}</span>
      </div>
    </div>
  ) : null;

  const recaudoOficinaInline =
    dc?.recaudo_directo ? (
      <RecaudoOficinaInline
        pagina={dc.recaudo_directo.pagina ?? 0}
        panel={dc.recaudo_directo.panel ?? 0}
        fmt={fmt}
      />
    ) : null;

  const recaudoGlobalInline = dc?.recaudo_global ? (
    <RecaudoGlobalInline
      oficina={dc.recaudo_global.oficina ?? 0}
      pagina={dc.recaudo_global.pagina ?? 0}
      panel={dc.recaudo_global.panel ?? 0}
      vendedores={dc.recaudo_global.vendedores ?? 0}
      total={dc.recaudo_global.total ?? 0}
      fmt={fmt}
    />
  ) : null;

  return (
    <div className="space-y-3 sm:space-y-4 min-w-0">
      <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-slate-500">
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="break-all">{periodoLabel}</span>
        {hayFiltro && (
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 font-medium">
            Filtrado
          </span>
        )}
        {precioBoleta > 0 && (
          <span className="sm:ml-auto text-xs bg-slate-100 text-slate-600 px-2 py-1">
            Boleta: {fmt(precioBoleta)}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 min-w-0">
        {scope === 'mis-ventas' && misGanancias != null && (
          <KPICard
            title="Mis ganancias"
            value={fmt(misGanancias)}
            subtitle="Mismo % de Ajustes: precio en pagadas y lo abonado en abonadas"
            icon="🎯"
            color="purple"
            expanded={expandedCard === 'ganancias'}
            onToggle={() => toggle('ganancias')}
          />
        )}
        {scope === 'global' && showCanalDesglose ? (
          <>
            <KPICard
              title="Recaudo oficina"
              value={fmt(recaudoOficina)}
              belowValue={
                <>
                  <p className="text-[10px] sm:text-xs text-emerald-700/80 mt-0.5">
                    Abonos registrados por admin / web (no cuenta lo que aún tiene el vendedor)
                  </p>
                  {recaudoOficinaInline}
                </>
              }
              subtitle="Panel + página · entra al recaudo del sistema al confirmar abono"
              icon="🏢"
              color="green"
              expanded={expandedCard === 'recaudo-oficina'}
              onToggle={() => toggle('recaudo-oficina')}
            />
            <KPICard
              title="Recaudo vendedores"
              value={fmt(vendedoresEntregado)}
              belowValue={
                <>
                  <p className="text-[10px] sm:text-xs text-cyan-700/80 mt-0.5">
                    Solo liquidaciones registradas · el cobrado en calle no entra hasta la entrega
                  </p>
                  {cuentaVendedoresInline}
                </>
              }
              subtitle="Por cobrar = parte org. pendiente de entrega"
              icon="🤝"
              color="cyan"
              expanded={expandedCard === 'vendedores'}
              onToggle={() => toggle('vendedores')}
            />
            <KPICard
              title="Recaudo global"
              value={fmt(recaudoGlobal)}
              belowValue={recaudoGlobalInline}
              subtitle="Oficina + vendedores (entregado) · lo que suma al negocio"
              icon="💰"
              color="emerald"
              expanded={expandedCard === 'recaudo-global'}
              onToggle={() => toggle('recaudo-global')}
            />
          </>
        ) : (
          <KPICard
            title={scope === 'global' && !filtro_aplicado ? 'Recaudo directo' : 'Recaudo Real'}
            value={fmt(recaudoReal)}
            subtitle={hayFiltro ? `Total histórico: ${fmt(recaudoTotal)}` : null}
            icon="💰"
            color="green"
            expanded={expandedCard === 'recaudo'}
            onToggle={() => toggle('recaudo')}
          />
        )}
        {scope === 'global' && !showCanalDesglose && (finanzas.recaudo_vendedores || 0) > 0 && (
          <KPICard
            title="Ingreso vendedores"
            value={fmt(finanzas.recaudo_vendedores)}
            subtitle="Abonos registrados por vendedores + liquidaciones"
            icon="🤝"
            color="cyan"
            expanded={expandedCard === 'vendedores'}
            onToggle={() => toggle('vendedores')}
          />
        )}
        <KPICard
          title="Proyección Total"
          value={fmt(finanzas.proyeccion_total)}
          subtitle={`${totalBoletas.toLocaleString()} boletas × ${fmt(precioBoleta)}`}
          icon="📊"
          color="blue"
          expanded={expandedCard === 'proyeccion'}
          onToggle={() => toggle('proyeccion')}
        />
        <KPICard
          title="Cumplimiento"
          value={`${hayFiltro ? finanzas.porcentaje_periodo : finanzas.porcentaje_cumplimiento}%`}
          subtitle={hayFiltro
            ? `Global: ${finanzas.porcentaje_cumplimiento}% | Faltan ${fmt(finanzas.proyeccion_total - recaudoTotal)}`
            : `Faltan ${fmt(finanzas.proyeccion_total - recaudoReal)} para la meta`
          }
          icon="🎯"
          color="cyan"
          expanded={expandedCard === 'cumplimiento'}
          onToggle={() => toggle('cumplimiento')}
        />
        <div
          className={`text-left w-full rounded-2xl shadow-sm border p-4 sm:p-5 flex flex-col gap-2 min-w-0
            ${expandedCard === 'ventas' ? 'bg-amber-50 border-amber-200 ring-2 ring-amber-300' : 'bg-white border-slate-200 hover:shadow-md hover:border-amber-200'}`}
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <span className="text-lg">🛒</span>
            </div>
            <button
              type="button"
              onClick={() => toggle('ventas')}
              className="p-1"
              aria-label="Más opciones ventas"
            >
              <svg className={`w-4 h-4 transition-transform ${expandedCard === 'ventas' ? 'rotate-180' : ''} text-slate-400`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
          <div>
            <h3 className="text-sm font-medium text-slate-500">Ventas Realizadas</h3>
            <p className="text-2xl font-semibold text-amber-600 mt-1">{totalVentas.toLocaleString()}</p>
            {canalVentasInline}
          </div>
          {expandedCard === 'ventas' && (
            <button
              type="button"
              onClick={() => setShowVentasModal(true)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-amber-600 text-white text-xs font-semibold rounded-lg hover:bg-amber-700 transition-colors shadow-sm"
            >
              Ver Ventas
            </button>
          )}
        </div>
      </div>

      <VentasGeneralModal
        isOpen={showVentasModal}
        onClose={() => setShowVentasModal(false)}
        rifaId={rifa?.id}
        fechaInicio={fechaInicio}
        fechaFin={fechaFin}
        rifaNombre={rifa?.nombre}
        scope={scope}
        extraFilters={extraFilters}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 min-w-0">
        <KPICard
          title={hayFiltro ? 'Pagadas en periodo' : 'Boletas Pagadas'}
          value={pagadas.toLocaleString()}
          belowValue={canalBoletasInline('pagadas')}
          subtitle={hayFiltro
            ? `Global: ${pagadasGlobal} pagadas | ${fmt(pagadas * precioBoleta)}`
            : `Equivale a ${fmt(dineroPagedas)}`
          }
          icon="✅"
          color="green"
          expanded={expandedCard === 'pagadas'}
          onToggle={() => toggle('pagadas')}
        />
        <KPICard
          title={hayFiltro ? 'Reservadas en periodo' : 'Boletas Reservadas'}
          value={reservadas.toLocaleString()}
          belowValue={canalBoletasInline('reservadas')}
          subtitle={hayFiltro
            ? `Global: ${reservadasGlobal} reservadas | ${fmt(reservadas * precioBoleta)}`
            : `Potencial: ${fmt(dineroReservadas)}`
          }
          icon="🔒"
          color="amber"
          expanded={expandedCard === 'reservadas'}
          onToggle={() => toggle('reservadas')}
        />
        <KPICard
          title={hayFiltro ? 'Abonadas en periodo' : 'Boletas Abonadas'}
          value={abonadas.toLocaleString()}
          belowValue={canalBoletasInline('abonadas')}
          subtitle={
            <div className="flex flex-col gap-1">
              <span><span className="font-bold text-purple-700">Abonado:</span> <span className="font-bold text-slate-900">{fmt(dineroAbonadoAbonadas)}</span></span>
              <span><span className="font-bold text-rose-700">Deuda:</span> <span className="font-bold text-slate-900">{fmt(deudaAbonadas)}</span></span>
              {hayFiltro && <span className="text-xs text-slate-400">Global: {abonadasGlobal} abonadas</span>}
            </div>
          }
          icon="💳"
          color="purple"
          expanded={expandedCard === 'abonadas'}
          onToggle={() => toggle('abonadas')}
        />
        <KPICard
          title="Boletas Disponibles"
          value={disponibles.toLocaleString()}
          subtitle={`Potencial sin vender: ${fmt(dineroDisponibles)}`}
          icon="🎟️"
          color="slate"
          expanded={expandedCard === 'disponibles'}
          onToggle={() => toggle('disponibles')}
        />
      </div>

      <div className="bg-white border border-slate-200 p-3 sm:p-5 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-3 min-w-0">
          <span className="text-xs sm:text-sm font-medium text-slate-600 break-words">
            Distribución de Boletas {hayFiltro ? '(estado actual global)' : ''}
          </span>
          <span className="text-xs text-slate-400 shrink-0">{totalBoletas.toLocaleString()} total</span>
        </div>
        <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden flex">
          {pagadasGlobal > 0 && (
            <div
              className="bg-emerald-500 h-full transition-all duration-500"
              style={{ width: `${(pagadasGlobal / totalBoletas) * 100}%` }}
              title={`Pagadas: ${pagadasGlobal}`}
            />
          )}
          {abonadasGlobal > 0 && (
            <div
              className="bg-purple-500 h-full transition-all duration-500"
              style={{ width: `${(abonadasGlobal / totalBoletas) * 100}%` }}
              title={`Abonadas: ${abonadasGlobal}`}
            />
          )}
          {reservadasGlobal > 0 && (
            <div
              className="bg-amber-400 h-full transition-all duration-500"
              style={{ width: `${(reservadasGlobal / totalBoletas) * 100}%` }}
              title={`Reservadas: ${reservadasGlobal}`}
            />
          )}
          {disponibles > 0 && (
            <div
              className="bg-slate-200 h-full transition-all duration-500"
              style={{ width: `${(disponibles / totalBoletas) * 100}%` }}
              title={`Disponibles: ${disponibles}`}
            />
          )}
          {anuladasGlobal > 0 && (
            <div
              className="bg-rose-400 h-full transition-all duration-500"
              style={{ width: `${(anuladasGlobal / totalBoletas) * 100}%` }}
              title={`Anuladas: ${anuladasGlobal}`}
            />
          )}
        </div>
        <div className="flex flex-wrap gap-4 mt-3 text-xs text-slate-500">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Pagadas ({pagadasGlobal})</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span> Abonadas ({abonadasGlobal})</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span> Reservadas ({reservadasGlobal})</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-slate-200 border border-slate-300"></span> Disponibles ({disponibles})</span>
          {anuladasGlobal > 0 && <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-rose-400"></span> Anuladas ({anuladasGlobal})</span>}
        </div>
      </div>
    </div>
  );
}
