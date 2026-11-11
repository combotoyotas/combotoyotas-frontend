'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { clienteApi } from '@/lib/clienteApi'
import { Cliente, ClienteListResponse, ClienteFiltroEstado, ClienteResumenFiltros } from '@/types/cliente'
import ClienteList from '@/components/ClienteList'
import ClienteForm from '@/components/ClienteForm'
import ClienteDetalle from '@/components/ClienteDetalle'

type ViewMode = 'list' | 'form' | 'detail'

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null)
  const [viewingClienteId, setViewingClienteId] = useState<string | null>(null)
  const [filtroActivo, setFiltroActivo] = useState<ClienteFiltroEstado>('todos')
  const [currentSearch, setCurrentSearch] = useState('')
  const [rifaActual, setRifaActual] = useState<{ id: string; nombre: string; estado: string } | null>(null)
  const [showVendedores, setShowVendedores] = useState(false)
  const [showCreadoPor, setShowCreadoPor] = useState(false)
  const [resumenFiltros, setResumenFiltros] = useState<ClienteResumenFiltros>({
    todos: 0,
    con_boletas: 0,
    pagadas: 0,
    reservadas: 0,
    abonadas: 0
  })
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  })
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
      return
    }
    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}')
      const rol = String(u.rol || '').toUpperCase()
      setShowVendedores(rol === 'SUPER_ADMIN' || rol === 'ADMIN')
      setShowCreadoPor(rol === 'SUPER_ADMIN' || rol === 'ADMIN')
    } catch {
      setShowVendedores(false)
      setShowCreadoPor(false)
    }
    fetchClientes()
  }, [router])

  const fetchClientes = async (
    page: number = 1,
    search: string = '',
    filtro: ClienteFiltroEstado = filtroActivo
  ) => {
    try {
      setLoading(true)
      const response: ClienteListResponse = await clienteApi.getClientes(page, pagination.limit, search, filtro)
      setClientes(response.data)
      setRifaActual(response.rifa_actual || null)
      if (response.resumen_filtros) {
        setResumenFiltros(response.resumen_filtros)
      }
      setPagination(response.pagination)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar clientes')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCliente = () => {
    setEditingCliente(null)
    setViewMode('form')
  }

  const handleEditCliente = (cliente: Cliente) => {
    setEditingCliente(cliente)
    setViewMode('form')
  }

  const handleViewCliente = (cliente: Cliente) => {
    setViewingClienteId(cliente.id)
    setViewMode('detail')
  }

  const handleBackToList = () => {
    setViewMode('list')
    setViewingClienteId(null)
    setEditingCliente(null)
    // Refresh list to get updated data
    fetchClientes(pagination.page, currentSearch, filtroActivo)
  }

  const handleDeleteCliente = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este cliente?')) {
      return
    }

    try {
      await clienteApi.deleteCliente(id)
      fetchClientes(pagination.page, currentSearch, filtroActivo)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar cliente')
    }
  }

  const handleFormSubmit = async (clienteData: any) => {
    try {
      if (editingCliente) {
        await clienteApi.updateCliente(editingCliente.id, clienteData)
      } else {
        await clienteApi.createCliente(clienteData)
      }
      setViewMode('list')
      setEditingCliente(null)
      fetchClientes(pagination.page, currentSearch, filtroActivo)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar cliente')
    }
  }

  const handleSearch = (search: string) => {
    setCurrentSearch(search)
    setFiltroActivo('todos')
    fetchClientes(1, search, 'todos')
  }

  const handlePageChange = (page: number) => {
    fetchClientes(page, currentSearch, filtroActivo)
  }

  const handleFilterEstado = (estado: ClienteFiltroEstado) => {
    setFiltroActivo(estado)
    fetchClientes(1, currentSearch, estado)
  }

  if (loading && clientes.length === 0 && viewMode === 'list') {
    return (
      <div className="px-4 py-16 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500 text-sm">
          <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          Cargando clientes...
        </div>
      </div>
    )
  }

  const pageTitle =
    viewMode === 'detail'
      ? 'Detalle de cliente'
      : viewMode === 'form'
        ? editingCliente
          ? 'Editar cliente'
          : 'Nuevo cliente'
        : 'Clientes'

  return (
    <div className="px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
      <header className="mb-6 pb-4 border-b border-slate-200/80">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Directorio</p>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight mt-1 text-slate-900">
              {pageTitle}
            </h1>
          </div>
          {viewMode === 'list' && (
            <button
              onClick={handleCreateCliente}
              className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-medium text-sm shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 min-h-[44px]"
            >
              + Nuevo cliente
            </button>
          )}
        </div>
      </header>

      <main>
        {error && (
          <div className="bg-red-50 border border-red-100 text-red-700 rounded-xl px-4 py-3 mb-6 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="font-bold">✕</button>
          </div>
        )}

        {viewMode === 'form' && (
          <ClienteForm
            cliente={editingCliente}
            onSubmit={handleFormSubmit}
            onCancel={handleBackToList}
          />
        )}

        {viewMode === 'detail' && viewingClienteId && (
          <ClienteDetalle
            clienteId={viewingClienteId}
            onBack={handleBackToList}
          />
        )}

        {viewMode === 'list' && (
          <ClienteList
            clientes={clientes}
            rifaActual={rifaActual}
            resumenFiltros={resumenFiltros}
            pagination={pagination}
            onEdit={handleEditCliente}
            onDelete={handleDeleteCliente}
            onView={handleViewCliente}
            onSearch={handleSearch}
            onPageChange={handlePageChange}
            onFilterEstado={handleFilterEstado}
            filtroActivo={filtroActivo}
            loading={loading}
            showVendedores={showVendedores}
            showCreadoPor={showCreadoPor}
          />
        )}
      </main>
    </div>
  )
}
