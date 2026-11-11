"use client";
import React, { useState, useMemo } from 'react';

const METHOD_CONFIG = {
  NEQUI: { label: 'Nequi', color: '#8B2E8B', icon: '📱', bgColor: 'bg-purple-50', textColor: 'text-purple-700', borderColor: 'border-purple-200' },
  DAVIPLATA: { label: 'Daviplata', color: '#E63946', icon: '💳', bgColor: 'bg-red-50', textColor: 'text-red-700', borderColor: 'border-red-200' },
  EFECTIVO: { label: 'Efectivo', color: '#2D6A4F', icon: '💵', bgColor: 'bg-green-50', textColor: 'text-green-700', borderColor: 'border-green-200' },
  BANCOLOMBIA: { label: 'Bancolombia', color: '#FDDA24', icon: '🏦', bgColor: 'bg-yellow-50', textColor: 'text-yellow-700', borderColor: 'border-yellow-200' },
  TRANSFERENCIA: { label: 'Transferencia', color: '#1D3557', icon: '🔄', bgColor: 'bg-blue-50', textColor: 'text-blue-700', borderColor: 'border-blue-200' },
  WOMPI: { label: 'Wompi', color: '#00BFA6', icon: '🌐', bgColor: 'bg-teal-50', textColor: 'text-teal-700', borderColor: 'border-teal-200' },
  PSE: { label: 'PSE', color: '#0077B6', icon: '🏧', bgColor: 'bg-sky-50', textColor: 'text-sky-700', borderColor: 'border-sky-200' },
  SIN_GATEWAY: { label: 'Sin método', color: '#94A3B8', icon: '❓', bgColor: 'bg-slate-50', textColor: 'text-slate-600', borderColor: 'border-slate-200' },
  VENDEDORES: { label: 'Vendedores', color: '#0891B2', icon: '🤝', bgColor: 'bg-cyan-50', textColor: 'text-cyan-800', borderColor: 'border-cyan-200' },
};

function getMethodConfig(metodo) {
  const key = metodo?.toUpperCase?.()?.replace(/\s+/g, '_') || 'SIN_GATEWAY';
  return METHOD_CONFIG[key] || { label: metodo || 'Otro', color: '#64748B', icon: '📋', bgColor: 'bg-slate-50', textColor: 'text-slate-600', borderColor: 'border-slate-200' };
}

function MethodCard({ method, totalGeneral, isSelected, onSelect }) {
  const config = getMethodConfig(method.metodo);
  const monto = Number(method.total) || 0;
  const cantidad = Number(method.cantidad) || 0;
  const porcentaje = totalGeneral > 0 ? ((monto / totalGeneral) * 100).toFixed(1) : 0;
  const promedio = cantidad > 0 ? monto / cantidad : 0;

  return (
    <button
      onClick={() => onSelect(method.metodo)}
      className={`text-left w-full border border-slate-200 rounded-2xl p-3 sm:p-5 transition-all duration-200 cursor-pointer min-w-0
        ${isSelected
          ? `${config.bgColor} shadow-sm`
          : 'bg-white hover:shadow-sm'
        }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2 sm:mb-3 gap-2 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg sm:text-xl shrink-0">{config.icon}</span>
          <span className={`font-semibold text-xs sm:text-sm truncate ${isSelected ? config.textColor : 'text-slate-700'}`}>
            {config.label}
          </span>
        </div>
        <span className={`text-xs font-bold px-2 py-1 shrink-0 ${isSelected ? `${config.bgColor} ${config.textColor}` : 'bg-slate-100 text-slate-500'}`}>
          {porcentaje}%
        </span>
      </div>

      {/* Monto principal */}
      <p className={`text-lg sm:text-2xl font-bold break-all ${isSelected ? config.textColor : 'text-slate-900'}`}>
        ${monto.toLocaleString('es-CO')}
      </p>

      {/* Barra de progreso */}
      <div className="w-full h-2 bg-slate-100 rounded-full mt-3 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${porcentaje}%`, backgroundColor: config.color }}
        />
      </div>

      {/* Detalles expandidos */}
      {isSelected && (
        <div className={`mt-4 pt-3 border-t ${config.borderColor} space-y-2 text-sm`}>
          <div className="flex justify-between">
            <span className="text-slate-500">Transacciones</span>
            <span className={`font-semibold ${config.textColor}`}>{cantidad.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Promedio por transacción</span>
            <span className={`font-semibold ${config.textColor}`}>${promedio.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Participación</span>
            <span className={`font-semibold ${config.textColor}`}>{porcentaje}% del total</span>
          </div>
        </div>
      )}
    </button>
  );
}

export default function MethodsChart({
  methods,
  methodsVendedores,
  separados = false,
  vendedoresLiquidaciones,
  serieDiaria,
  fechaInicio,
  fechaFin,
}) {
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [selectedVendedor, setSelectedVendedor] = useState(false);
  const hayFiltro = !!(fechaInicio && fechaFin);

  const tieneOficina = methods?.length > 0;
  const tieneVendedores = methodsVendedores?.length > 0 && Number(methodsVendedores[0]?.total) > 0;

  if (!tieneOficina && !tieneVendedores) {
    return hayFiltro ? (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col items-center justify-center min-h-[200px] text-slate-400">
        <svg className="w-10 h-10 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
        <p className="text-sm">Sin pagos en este periodo</p>
      </div>
    ) : null;
  }

  const totalGeneral = (methods || []).reduce((sum, m) => sum + Number(m.total), 0);
  const totalTransacciones = (methods || []).reduce((sum, m) => sum + Number(m.cantidad), 0);
  const vendMethod = tieneVendedores ? methodsVendedores[0] : null;
  const totalVendedores = vendMethod ? Number(vendMethod.total) : 0;
  const txVendedores = vendMethod ? Number(vendMethod.cantidad) : 0;

  // Periodo label
  const periodoLabel = useMemo(() => {
    if (!fechaInicio && !fechaFin) return 'Total acumulado';
    if (fechaInicio === fechaFin) return `Hoy (${fechaInicio})`;
    return `${fechaInicio} → ${fechaFin}`;
  }, [fechaInicio, fechaFin]);

  // Ordenar por monto descendente
  const sortedMethods = [...(methods || [])].sort((a, b) => Number(b.total) - Number(a.total));

  // Método líder (solo oficina)
  const lider = sortedMethods[0];
  const liderConfig = getMethodConfig(lider?.metodo);

  const handleSelect = (metodo) => {
    setSelectedMethod(prev => prev === metodo ? null : metodo);
    setSelectedVendedor(false);
  };

  const handleSelectVendedor = () => {
    setSelectedVendedor((prev) => !prev);
    setSelectedMethod(null);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 space-y-4 sm:space-y-5 min-w-0 overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 min-w-0">
        <div className="min-w-0">
          <h2 className="text-base sm:text-lg font-semibold text-slate-900">Métodos de Pago</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5 break-words">
            {separados ? 'Recaudo oficina (panel + web · registrado por admin)' : periodoLabel}
            {hayFiltro && <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 font-medium">Filtrado</span>}
          </p>
          {separados && (
            <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5">{periodoLabel}</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-slate-900">${totalGeneral.toLocaleString('es-CO')}</p>
          <p className="text-xs text-slate-400">
            {totalTransacciones} transacciones
            {!tieneOficina && separados && tieneVendedores ? ' · oficina' : ''}
          </p>
        </div>
      </div>

      {separados && !tieneOficina && tieneVendedores && (
        <p className="text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
          No hay abonos registrados por admin en este periodo. El cobro de oficina aparece abajo en canal vendedores.
        </p>
      )}

      {/* Resumen rápido - método líder */}
      {lider && (
        <div className={`${liderConfig.bgColor} ${liderConfig.borderColor} border rounded-xl p-4 flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <span className="text-2xl">{liderConfig.icon}</span>
            <div>
              <p className="text-xs text-slate-500 font-medium">Método líder</p>
              <p className={`font-bold ${liderConfig.textColor}`}>{liderConfig.label}</p>
            </div>
          </div>
          <div className="text-right">
            <p className={`text-lg font-bold ${liderConfig.textColor}`}>
              ${Number(lider.total).toLocaleString('es-CO')}
            </p>
            <p className="text-xs text-slate-500">
              {totalGeneral > 0 ? ((Number(lider.total) / totalGeneral) * 100).toFixed(1) : 0}% del total
            </p>
          </div>
        </div>
      )}

      {/* Grid de tarjetas de métodos (oficina) */}
      {tieneOficina && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {sortedMethods.map((m) => (
            <MethodCard
              key={m.metodo}
              method={m}
              totalGeneral={totalGeneral}
              isSelected={selectedMethod === m.metodo}
              onSelect={handleSelect}
            />
          ))}
        </div>
      )}

      {tieneOficina && (
        <div>
          <p className="text-xs text-slate-400 mb-2">Distribución oficina</p>
          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex">
            {sortedMethods.map((m) => {
              const config = getMethodConfig(m.metodo);
              const pct = totalGeneral > 0 ? (Number(m.total) / totalGeneral) * 100 : 0;
              return (
                <div
                  key={m.metodo}
                  className="h-full transition-all duration-500 first:rounded-l-full last:rounded-r-full"
                  style={{ width: `${pct}%`, backgroundColor: config.color }}
                  title={`${config.label}: ${pct.toFixed(1)}%`}
                />
              );
            })}
          </div>
          <div className="flex flex-wrap gap-3 mt-2">
            {sortedMethods.map((m) => {
              const config = getMethodConfig(m.metodo);
              return (
                <span key={m.metodo} className="flex items-center gap-1 text-xs text-slate-500">
                  <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: config.color }} />
                  {config.label}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {separados && tieneVendedores && (
        <div className="border-t border-slate-200 pt-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Canal vendedores</h3>
              <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5">
                Abonos que registró el vendedor en calle (no Nequi/PSE de oficina)
              </p>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-cyan-900">${totalVendedores.toLocaleString('es-CO')}</p>
              <p className="text-xs text-slate-400">{txVendedores} transacciones</p>
            </div>
          </div>
          <MethodCard
            method={vendMethod}
            totalGeneral={totalVendedores}
            isSelected={selectedVendedor}
            onSelect={() => handleSelectVendedor()}
          />
          {selectedVendedor && vendedoresLiquidaciones != null && Number(vendedoresLiquidaciones) >= 0 && (
            <p className="text-[10px] sm:text-xs text-cyan-800/90 bg-cyan-50 border border-cyan-100 rounded-lg px-3 py-2">
              Liquidaciones registradas al panel:{' '}
              <strong>${Number(vendedoresLiquidaciones).toLocaleString('es-CO')}</strong>
              {' '}· entra al recaudo global cuando se registra la entrega
            </p>
          )}
        </div>
      )}
    </div>
  );
}