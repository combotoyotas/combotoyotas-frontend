"use client";

import { useEffect, useState } from "react";
import { getReporteRifa, getResumenVendedoresRifa } from "./services/analytics.service";
import FiltersBar from "./components/FiltersBar";
import KPISection from "./components/KPISection";
import MethodsChart from "./components/MethodsChart";
import TicketsChart from "./components/TicketsChart";

type Rifa = {
  id: string;
  nombre: string;
};

type Vendedor = {
  id: string;
  nombre: string;
  rol: string;
};

type Scope = 'global' | 'mis-ventas';

export type PersonFilter = {
  tipo: 'TODOS' | 'ADMINS' | 'ADMIN' | 'VENDEDOR';
  vendedorId: string | null;
};

type Props = {
  rifas: Rifa[];
  scope?: Scope;
  title?: string;
  esSuperAdmin?: boolean;
  vendedores?: Vendedor[];
};

export default function AnalyticsDashboard({ rifas, scope = 'global', title, esSuperAdmin = false, vendedores = [] }: Props) {
  const headerTitle = title ?? (scope === 'mis-ventas' ? 'Mis Reportes' : 'Análisis de proyectos');

  const [selectedRifa, setSelectedRifa] = useState<string | null>(
    rifas.length ? rifas[0].id : null
  );

  const hoy = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();
  const [fechaInicio, setFechaInicio] = useState(hoy);
  const [fechaFin, setFechaFin] = useState(hoy);
  const [personFilter, setPersonFilter] = useState<PersonFilter>({ tipo: 'TODOS', vendedorId: null });
  const [data, setData] = useState<any>(null);
  const [vendedoresData, setVendedoresData] = useState<any>(null);
  const [reportView, setReportView] = useState<'general' | 'vendedores'>('general');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const extraFilters = (() => {
    if (!esSuperAdmin || scope !== 'global') return {};
    if (personFilter.tipo === 'ADMINS') return { filtroRol: 'ADMINS' };
    if (personFilter.tipo === 'ADMIN' && personFilter.vendedorId) {
      return { vendedorId: personFilter.vendedorId };
    }
    if (personFilter.tipo === 'VENDEDOR' && personFilter.vendedorId) {
      return { vendedorId: personFilter.vendedorId };
    }
    return {};
  })();

  useEffect(() => {
    if (!selectedRifa) return;

    let cancelado = false;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [result, venRes] = await Promise.all([
          getReporteRifa(selectedRifa, fechaInicio, fechaFin, scope, extraFilters),
          scope === 'global' && esSuperAdmin
            ? getResumenVendedoresRifa(selectedRifa, fechaInicio, fechaFin).catch(() => null)
            : Promise.resolve(null),
        ]);
        if (!cancelado) {
          setData(result);
          setVendedoresData(venRes);
        }
      } catch (err: any) {
        if (!cancelado) {
          const msg =
            err?.code === 'ECONNABORTED'
              ? 'El servidor tardó demasiado en responder. Intenta de nuevo.'
              : err?.response?.data?.message || err?.message || 'No se pudo cargar el reporte. Intenta de nuevo.';
          setError(msg);
        }
      } finally {
        if (!cancelado) setLoading(false);
      }
    };

    fetchData();

    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRifa, fechaInicio, fechaFin, scope, personFilter.tipo, personFilter.vendedorId]);

  if (!rifas.length) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-slate-500">No hay proyectos disponibles</div>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 px-3 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
      <header className="mb-4 sm:mb-6 pb-3 sm:pb-4 border-b border-slate-200/80">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Dashboard</p>
        <h1 className="text-xl sm:text-3xl lg:text-4xl font-semibold tracking-tight text-slate-900 mt-1 break-words">
          {headerTitle}
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
          Recaudo, boletas y métodos de pago del periodo. Usa el menú para cambiar de módulo.
        </p>
      </header>

      <div className="w-full min-w-0 max-w-[1200px]">
        {scope === 'global' && esSuperAdmin && (
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={() => setReportView('general')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                reportView === 'general'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white border border-slate-200 text-slate-700'
              }`}
            >
              Reporte general
            </button>
            <button
              type="button"
              onClick={() => setReportView('vendedores')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                reportView === 'vendedores'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-700'
              }`}
            >
              Vendedores
            </button>
          </div>
        )}

        <FiltersBar
          rifas={rifas}
          selectedRifa={selectedRifa}
          setSelectedRifa={setSelectedRifa}
          fechaInicio={fechaInicio}
          fechaFin={fechaFin}
          setFechaInicio={setFechaInicio}
          setFechaFin={setFechaFin}
          esSuperAdmin={esSuperAdmin && scope === 'global'}
          vendedores={vendedores as any}
          personFilter={personFilter as any}
          setPersonFilter={setPersonFilter as any}
        />

        {error && !loading ? (
          <div className="flex flex-col items-center justify-center py-12 sm:py-16 gap-4 bg-white border border-slate-200 rounded-2xl px-4">
            <div className="text-red-700 font-medium text-center max-w-md text-sm sm:text-base">{error}</div>
            <button
              onClick={() => {
                setError(null);
                setLoading(true);
                getReporteRifa(selectedRifa!, fechaInicio, fechaFin, scope, extraFilters)
                  .then((r) => setData(r))
                  .catch((err: any) =>
                    setError(err?.response?.data?.message || err?.message || 'No se pudo cargar el reporte.')
                  )
                  .finally(() => setLoading(false));
              }}
              className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-medium text-sm hover:bg-indigo-700 min-h-[44px]"
            >
              Reintentar
            </button>
          </div>
        ) : loading && !data ? (
          <div className="flex justify-center items-center py-16 sm:py-20 bg-white border border-slate-200 rounded-2xl">
            <div className="text-slate-500 animate-pulse font-medium text-sm">Procesando métricas...</div>
          </div>
        ) : data && reportView === 'vendedores' && vendedoresData ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 space-y-4">
            <div className="flex flex-wrap gap-4 text-sm">
              <div>
                <span className="text-slate-500">Vendedores con movimiento:</span>{' '}
                <strong>{vendedoresData.totales?.vendedores ?? 0}</strong>
              </div>
              <div>
                <span className="text-slate-500">Boletas (canal vendedor):</span>{' '}
                <strong>{vendedoresData.totales?.boletas ?? 0}</strong>
              </div>
              <div>
                <span className="text-slate-500">Ingreso vendedores:</span>{' '}
                <strong>
                  ${Number(vendedoresData.totales?.ingreso || 0).toLocaleString('es-CO')}
                </strong>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                  <tr>
                    <th className="px-3 py-2 text-left">Vendedor</th>
                    <th className="px-3 py-2 text-right">Comisión %</th>
                    <th className="px-3 py-2 text-right">Boletas</th>
                    <th className="px-3 py-2 text-right">Pagadas</th>
                    <th className="px-3 py-2 text-right">Abonadas</th>
                    <th className="px-3 py-2 text-right">Reservadas</th>
                    <th className="px-3 py-2 text-right">Abonos reg.</th>
                    <th className="px-3 py-2 text-right">Liquidado</th>
                    <th className="px-3 py-2 text-right">Ingreso total</th>
                  </tr>
                </thead>
                <tbody>
                  {(vendedoresData.vendedores || []).map((v: any) => (
                    <tr key={v.id} className="border-t border-slate-100">
                      <td className="px-3 py-2 font-medium">{v.nombre}</td>
                      <td className="px-3 py-2 text-right">{Number(v.comision_porcentaje)}%</td>
                      <td className="px-3 py-2 text-right">{v.boletas_movimiento}</td>
                      <td className="px-3 py-2 text-right">{v.boletas_pagadas}</td>
                      <td className="px-3 py-2 text-right">{v.boletas_abonadas}</td>
                      <td className="px-3 py-2 text-right">{v.boletas_reservadas}</td>
                      <td className="px-3 py-2 text-right">
                        ${Number(v.abonos_registrados_monto || 0).toLocaleString('es-CO')}
                      </td>
                      <td className="px-3 py-2 text-right">
                        ${Number(v.total_liquidado || 0).toLocaleString('es-CO')}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-indigo-700">
                        ${Number(v.ingreso_vendedores || 0).toLocaleString('es-CO')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : data ? (
          <div className={`space-y-4 sm:space-y-6 min-w-0 ${loading ? 'opacity-60 pointer-events-none' : ''}`}>
            <KPISection
              data={data}
              fechaInicio={fechaInicio}
              fechaFin={fechaFin}
              scope={scope}
              extraFilters={extraFilters}
              showCanalDesglose={esSuperAdmin && scope === 'global' && personFilter.tipo === 'TODOS'}
            />
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6 min-w-0">
              <div className="min-w-0 overflow-hidden">
                <MethodsChart
                  methods={data.metodos_pago}
                  methodsVendedores={data.metodos_pago_vendedores}
                  separados={!!data.metodos_pago_separados}
                  vendedoresLiquidaciones={data.finanzas?.vendedores_entregado}
                  serieDiaria={data.serie_diaria}
                  fechaInicio={fechaInicio}
                  fechaFin={fechaFin}
                />
              </div>
              <div className="min-w-0 overflow-hidden">
                <TicketsChart resumen={data.resumen_boletas} boletasPeriodo={data.boletas_periodo} hayFiltro={!!(fechaInicio && fechaFin)} />
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
