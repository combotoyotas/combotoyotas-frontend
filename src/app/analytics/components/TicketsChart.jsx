"use client";
import '@/lib/chartjs';
import React, { useEffect, useState } from 'react';
import { Doughnut } from 'react-chartjs-2';

export default function TicketsChart({ resumen, boletasPeriodo, hayFiltro }) {
  const [legendBottom, setLegendBottom] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    const sync = () => setLegendBottom(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  if (!resumen) return null;

  const usePeriodo = hayFiltro && boletasPeriodo;

  const data = usePeriodo
    ? [
        boletasPeriodo.pagadas,
        boletasPeriodo.reservadas,
        boletasPeriodo.abonadas,
        boletasPeriodo.anuladas
      ]
    : [
        resumen.disponibles,
        resumen.reservadas,
        resumen.abonadas,
        resumen.pagadas,
        resumen.anuladas
      ];

  const labels = usePeriodo
    ? ['Pagadas', 'Reservadas', 'Abonadas', 'Anuladas']
    : ['Disponibles', 'Reservadas', 'Abonadas', 'Pagadas', 'Anuladas'];

  const colors = usePeriodo
    ? ['#34d399', '#fbbf24', '#818cf8', '#f87171']
    : ['#475569', '#fbbf24', '#818cf8', '#34d399', '#f87171'];

  const totalPeriodo = usePeriodo
    ? data.reduce((s, v) => s + Number(v), 0)
    : null;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 lg:p-8 min-w-0 overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4 sm:mb-6 min-w-0">
        <h2 className="text-base sm:text-xl font-semibold text-slate-900 break-words">
          {usePeriodo ? 'Boletas del Periodo' : 'Distribución de Boletas'}
        </h2>
        {usePeriodo && (
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 font-medium self-start">
            {totalPeriodo} movidas
          </span>
        )}
      </div>
      {usePeriodo && totalPeriodo === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 sm:h-64 text-slate-400 px-2 text-center">
          <svg className="w-10 h-10 sm:w-12 sm:h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <p className="text-sm">Sin movimiento de boletas en este periodo</p>
        </div>
      ) : (
        <div className={`relative w-full flex justify-center min-w-0 ${legendBottom ? 'h-72' : 'h-56 sm:h-64'}`}>
          <Doughnut
            options={{
              responsive: true,
              maintainAspectRatio: false,
              cutout: '70%',
              plugins: {
                legend: {
                  position: legendBottom ? 'bottom' : 'right',
                  labels: {
                    color: '#64748b',
                    font: { family: 'inherit', size: 11 },
                    usePointStyle: true,
                    boxWidth: 8,
                    padding: 12,
                  },
                },
              },
            }}
            data={{
              labels,
              datasets: [{
                data,
                backgroundColor: colors,
                borderWidth: 0,
                hoverOffset: 4,
              }],
            }}
          />
        </div>
      )}
    </div>
  );
}
