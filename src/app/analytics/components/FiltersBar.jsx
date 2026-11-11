"use client";
import React, { useEffect, useMemo, useState } from 'react';
import { vendedoresStatsApi } from '@/lib/vendedoresStatsApi';

function normalizeRol(v) {
  const raw = v?.rol ?? v?.role ?? '';
  if (raw && typeof raw === 'object') {
    return String(raw.name || raw.rol || '').toUpperCase().trim();
  }
  return String(raw).toUpperCase().trim();
}

function isActiveUser(v) {
  if (v?.activo === false || v?.activo === 0 || v?.activo === 'false' || v?.activo === 'f') {
    return false;
  }
  return true;
}

export default function FiltersBar({
  rifas,
  selectedRifa,
  setSelectedRifa,
  fechaInicio,
  fechaFin,
  setFechaInicio,
  setFechaFin,
  esSuperAdmin = false,
  vendedores = [],
  personFilter = { tipo: 'TODOS', vendedorId: null },
  setPersonFilter = () => {},
}) {
  const [usuariosEquipo, setUsuariosEquipo] = useState(Array.isArray(vendedores) ? vendedores : []);
  const [cargandoUsuarios, setCargandoUsuarios] = useState(false);
  const [errorUsuarios, setErrorUsuarios] = useState('');

  useEffect(() => {
    if (Array.isArray(vendedores) && vendedores.length > 0) {
      setUsuariosEquipo(vendedores);
      setErrorUsuarios('');
    }
  }, [vendedores]);

  useEffect(() => {
    if (!esSuperAdmin) return;
    let cancelado = false;

    const cargar = async () => {
      setCargandoUsuarios(true);
      setErrorUsuarios('');
      try {
        const res = await vendedoresStatsApi.list();
        const lista = Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res)
            ? res
            : [];
        if (!cancelado) {
          if (lista.length > 0) {
            setUsuariosEquipo(lista);
            setErrorUsuarios('');
          } else {
            setErrorUsuarios('La API no devolvió usuarios del equipo.');
          }
        }
      } catch (err) {
        console.warn('No se pudieron cargar usuarios para el filtro:', err);
        if (!cancelado) {
          setErrorUsuarios(err?.message || 'Error al cargar admins');
        }
      } finally {
        if (!cancelado) setCargandoUsuarios(false);
      }
    };

    cargar();
    return () => {
      cancelado = true;
    };
  }, [esSuperAdmin]);

  const admins = useMemo(
    () =>
      usuariosEquipo
        .filter((v) => normalizeRol(v) === 'ADMIN' && isActiveUser(v))
        .sort((a, b) => String(a.nombre || '').localeCompare(String(b.nombre || ''))),
    [usuariosEquipo]
  );

  const soloVendedores = useMemo(
    () =>
      usuariosEquipo
        .filter((v) => normalizeRol(v) === 'VENDEDOR' && isActiveUser(v))
        .sort((a, b) => String(a.nombre || '').localeCompare(String(b.nombre || ''))),
    [usuariosEquipo]
  );

  const toLocalDate = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const hoy = toLocalDate(new Date());

  const isPresetTodo = !fechaInicio && !fechaFin;
  const isPresetHoy = fechaInicio === hoy && fechaFin === hoy;

  const getDaysAgoDate = (days) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return toLocalDate(d);
  };

  const isPreset7 = fechaInicio === getDaysAgoDate(7) && fechaFin === hoy;
  const isPreset30 = fechaInicio === getDaysAgoDate(30) && fechaFin === hoy;

  const setDatePreset = (days) => {
    if (days === null) {
      setFechaInicio('');
      setFechaFin('');
      return;
    }
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    setFechaFin(toLocalDate(end));
    setFechaInicio(toLocalDate(start));
  };

  const chipBase =
    'shrink-0 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-xl transition-colors border border-slate-200 min-h-[40px]';

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-3 sm:p-5 lg:p-6 mb-5 sm:mb-6 flex flex-col gap-4 sm:gap-5 overflow-hidden min-w-0">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4 sm:gap-5 min-w-0">
        <div className="flex flex-col gap-2 min-w-0 flex-1 w-full">
          <label className="text-[10px] sm:text-sm font-bold uppercase tracking-[0.08em] text-slate-500">
            Proyecto seleccionado
          </label>
          <div className="relative min-w-0">
            <select
              className="appearance-none bg-white border border-slate-200 text-slate-900 text-sm sm:text-base font-medium block w-full px-3 sm:px-4 py-2.5 pr-10 outline-none cursor-pointer min-w-0"
              value={selectedRifa || ''}
              onChange={(e) => setSelectedRifa(e.target.value)}
            >
              {rifas.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nombre}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 min-w-0 w-full xl:w-auto">
          <label className="text-[10px] sm:text-sm font-bold uppercase tracking-[0.08em] text-slate-500">
            Periodo
          </label>
          <div className="flex flex-col gap-2 sm:gap-3 min-w-0">
            <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin">
              <button
                type="button"
                onClick={() => setDatePreset(null)}
                className={`${chipBase} ${isPresetTodo ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700'}`}
              >
                Todo
              </button>
              <button
                type="button"
                onClick={() => setDatePreset(0)}
                className={`${chipBase} ${isPresetHoy ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700'}`}
              >
                Hoy
              </button>
              <button
                type="button"
                onClick={() => setDatePreset(7)}
                className={`${chipBase} ${isPreset7 ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700'}`}
              >
                7 Días
              </button>
              <button
                type="button"
                onClick={() => setDatePreset(30)}
                className={`${chipBase} ${isPreset30 ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700'}`}
              >
                30 Días
              </button>
            </div>

            <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 gap-2 min-w-0">
              <label className="flex flex-col gap-1 min-w-0">
                <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Desde</span>
                <input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="w-full min-w-0 bg-white border border-slate-200 text-slate-800 text-sm px-3 py-2 outline-none"
                />
              </label>
              <label className="flex flex-col gap-1 min-w-0">
                <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Hasta</span>
                <input
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  className="w-full min-w-0 bg-white border border-slate-200 text-slate-800 text-sm px-3 py-2 outline-none"
                />
              </label>
            </div>
          </div>
        </div>
      </div>

      {esSuperAdmin && (
        <div className="border-t-[1.5px] border-black pt-4 sm:pt-5 flex flex-col gap-3 sm:gap-4 min-w-0">
          <label className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider text-black bg-[var(--primary)] border border-slate-200 px-2 py-0.5">
              Super Admin
            </span>
            <span className="text-[10px] sm:text-sm font-bold uppercase tracking-[0.08em] text-slate-500">
              Filtrar por usuario
            </span>
          </label>

          <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin">
            {[
              { tipo: 'TODOS', label: 'Todos' },
              { tipo: 'ADMINS', label: 'Todos admins' },
              { tipo: 'ADMIN', label: 'Un admin' },
              { tipo: 'VENDEDOR', label: 'Vendedor' },
            ].map((opt, idx) => (
              <button
                key={opt.tipo}
                type="button"
                onClick={() =>
                  setPersonFilter({
                    tipo: opt.tipo,
                    vendedorId:
                      personFilter.tipo === opt.tipo && (opt.tipo === 'ADMIN' || opt.tipo === 'VENDEDOR')
                        ? personFilter.vendedorId
                        : null,
                  })
                }
                className={`${chipBase} ${idx > 0 ? '' : ''} ${
                  personFilter.tipo === opt.tipo
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-slate-700'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {personFilter.tipo === 'ADMIN' && (
            <div className="w-full min-w-0">
              {cargandoUsuarios ? (
                <p className="text-sm text-slate-500 py-2">Cargando admins…</p>
              ) : admins.length === 0 ? (
                <p className="text-sm text-red-700 py-2">
                  {errorUsuarios || 'No hay admins activos registrados.'}
                </p>
              ) : (
                <div className="border border-slate-200 bg-white max-h-52 sm:max-h-56 overflow-y-auto overscroll-contain">
                  {admins.map((v) => {
                    const selected = personFilter.vendedorId === v.id;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setPersonFilter({ tipo: 'ADMIN', vendedorId: v.id })}
                        className={`w-full text-left px-3 py-3 sm:py-2.5 text-sm border-b border-slate-200 last:border-b-0 transition-colors min-h-[48px] ${
                          selected
                            ? 'bg-indigo-600 text-white font-bold'
                            : 'text-slate-800 hover:bg-white'
                        }`}
                      >
                        <span className="block leading-tight truncate">{v.nombre || v.email}</span>
                        {v.email ? (
                          <span className="block text-[11px] font-normal text-slate-600 mt-0.5 truncate">
                            {v.email}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {personFilter.tipo === 'VENDEDOR' && (
            <div className="w-full min-w-0">
              {cargandoUsuarios ? (
                <p className="text-sm text-slate-500 py-2">Cargando vendedores…</p>
              ) : soloVendedores.length === 0 ? (
                <p className="text-sm text-slate-500 py-2">
                  {errorUsuarios || 'No hay vendedores activos.'}
                </p>
              ) : (
                <div className="border border-slate-200 bg-white max-h-52 sm:max-h-56 overflow-y-auto overscroll-contain">
                  {soloVendedores.map((v) => {
                    const selected = personFilter.vendedorId === v.id;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setPersonFilter({ tipo: 'VENDEDOR', vendedorId: v.id })}
                        className={`w-full text-left px-3 py-3 sm:py-2.5 text-sm border-b border-slate-200 last:border-b-0 transition-colors min-h-[48px] ${
                          selected
                            ? 'bg-indigo-600 text-white font-bold'
                            : 'text-slate-800 hover:bg-white'
                        }`}
                      >
                        <span className="truncate block">{v.nombre || v.email}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {personFilter.tipo !== 'TODOS' && (
            <p className="text-xs text-slate-400 leading-relaxed">
              {personFilter.tipo === 'ADMINS'
                ? 'Ventas de todos los administradores.'
                : personFilter.tipo === 'ADMIN'
                  ? personFilter.vendedorId
                    ? 'Ventas únicamente del admin seleccionado.'
                    : 'Selecciona un admin para aplicar el filtro.'
                  : personFilter.vendedorId
                    ? 'Ventas únicamente del vendedor seleccionado.'
                    : 'Selecciona un vendedor para aplicar el filtro.'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
