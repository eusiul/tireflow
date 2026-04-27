import type { Product, Client, Sale, Alert, KPIData } from '@/types'

export const MOCK_PRODUCTS: Product[] = [
  {
    id: 'p01', sku: 'MICH-205-55R16', barcode: '7891234560001',
    name: 'Pilot Sport 4', brand: 'Michelin', size: '205/55R16', category: 'tire',
    costPrice: 320, salePrice: 520, stock: 12, minStock: 4,
    supplier: 'Michelin Brasil', location: 'A-01',
    createdAt: '2024-01-15T10:00:00Z', updatedAt: '2024-11-01T10:00:00Z',
  },
  {
    id: 'p02', sku: 'BRID-185-65R15', barcode: '7891234560002',
    name: 'Ecopia EP150', brand: 'Bridgestone', size: '185/65R15', category: 'tire',
    costPrice: 180, salePrice: 290, stock: 2, minStock: 6,
    supplier: 'Bridgestone Brasil', location: 'A-02',
    createdAt: '2024-01-15T10:00:00Z', updatedAt: '2024-11-01T10:00:00Z',
  },
  {
    id: 'p03', sku: 'CONT-225-45R17', barcode: '7891234560003',
    name: 'ContiSportContact 5', brand: 'Continental', size: '225/45R17', category: 'tire',
    costPrice: 410, salePrice: 680, stock: 8, minStock: 3,
    supplier: 'Continental Brasil', location: 'A-03',
    createdAt: '2024-01-15T10:00:00Z', updatedAt: '2024-11-01T10:00:00Z',
  },
  {
    id: 'p04', sku: 'PIRE-195-55R15', barcode: '7891234560004',
    name: 'P7 Cinturato', brand: 'Pirelli', size: '195/55R15', category: 'tire',
    costPrice: 240, salePrice: 390, stock: 0, minStock: 4,
    supplier: 'Pirelli Brasil', location: 'A-04',
    createdAt: '2024-01-15T10:00:00Z', updatedAt: '2024-11-01T10:00:00Z',
  },
  {
    id: 'p05', sku: 'GOOD-215-60R16', barcode: '7891234560005',
    name: 'Eagle F1 Asymmetric', brand: 'Goodyear', size: '215/60R16', category: 'tire',
    costPrice: 280, salePrice: 450, stock: 15, minStock: 5,
    supplier: 'Goodyear Brasil', location: 'B-01',
    createdAt: '2024-01-15T10:00:00Z', updatedAt: '2024-11-01T10:00:00Z',
  },
  {
    id: 'p06', sku: 'SVC-MONT', barcode: '7891234560006',
    name: 'Montagem de Pneu', brand: 'TireFlow', size: '-', category: 'service',
    costPrice: 10, salePrice: 30, stock: 999, minStock: 0,
    createdAt: '2024-01-15T10:00:00Z', updatedAt: '2024-11-01T10:00:00Z',
  },
  {
    id: 'p07', sku: 'SVC-BAL', barcode: '7891234560007',
    name: 'Balanceamento', brand: 'TireFlow', size: '-', category: 'service',
    costPrice: 12, salePrice: 35, stock: 999, minStock: 0,
    createdAt: '2024-01-15T10:00:00Z', updatedAt: '2024-11-01T10:00:00Z',
  },
  {
    id: 'p08', sku: 'HANK-175-70R13', barcode: '7891234560008',
    name: 'Kinergy Eco', brand: 'Hankook', size: '175/70R13', category: 'tire',
    costPrice: 130, salePrice: 210, stock: 22, minStock: 8,
    supplier: 'Hankook Brasil', location: 'B-02',
    createdAt: '2024-01-15T10:00:00Z', updatedAt: '2024-11-01T10:00:00Z',
  },
]

export const MOCK_CLIENTS: Client[] = [
  {
    id: 'c01', name: 'João Pereira', email: 'joao.pereira@gmail.com',
    phone: '11987654321', document: '123.456.789-00',
    vehiclePlates: ['ABC-1234', 'DEF-5678'],
    totalSpent: 4850, totalVisits: 8, lastVisit: '2024-11-15T10:00:00Z',
    createdAt: '2024-03-10T10:00:00Z',
  },
  {
    id: 'c02', name: 'Maria Santos', email: 'maria.s@hotmail.com',
    phone: '11976543210', document: '987.654.321-00',
    vehiclePlates: ['GHI-9012'],
    totalSpent: 2200, totalVisits: 4, lastVisit: '2024-11-20T10:00:00Z',
    createdAt: '2024-05-22T10:00:00Z',
  },
  {
    id: 'c03', name: 'Carlos Oliveira', email: 'carlos.o@empresa.com.br',
    phone: '11965432109', document: '456.789.123-00',
    vehiclePlates: ['JKL-3456', 'MNO-7890', 'PQR-1234'],
    totalSpent: 12400, totalVisits: 22, lastVisit: '2024-11-28T10:00:00Z',
    notes: 'Cliente VIP - frota empresarial',
    createdAt: '2023-08-01T10:00:00Z',
  },
  {
    id: 'c04', name: 'Ana Rodrigues', email: 'ana.r@gmail.com',
    phone: '11954321098', document: '654.321.987-00',
    vehiclePlates: ['STU-5678'],
    totalSpent: 890, totalVisits: 2, lastVisit: '2024-10-05T10:00:00Z',
    createdAt: '2024-09-15T10:00:00Z',
  },
  {
    id: 'c05', name: 'Roberto Lima', email: 'rlima@transportes.com.br',
    phone: '11943210987', document: '321.654.987-00',
    vehiclePlates: ['VWX-9012', 'YZA-3456'],
    totalSpent: 8600, totalVisits: 15, lastVisit: '2024-11-30T10:00:00Z',
    notes: 'Transportadora - 2 caminhões',
    createdAt: '2023-12-01T10:00:00Z',
  },
]

export const MOCK_SALES: Sale[] = [
  {
    id: 's001', clientId: 'c01', clientName: 'João Pereira',
    items: [
      { productId: 'p01', productName: 'Pilot Sport 4', productSku: 'MICH-205-55R16', qty: 2, unitPrice: 520, discount: 0, total: 1040 },
      { productId: 'p06', productName: 'Montagem de Pneu', productSku: 'SVC-MONT', qty: 2, unitPrice: 30, discount: 0, total: 60 },
    ],
    subtotal: 1100, discount: 0, total: 1100,
    paymentMethod: 'pix', status: 'completed',
    createdAt: '2024-11-28T14:32:00Z', operatorId: 'usr_01', operatorName: 'Carlos Silva',
  },
  {
    id: 's002', clientId: 'c03', clientName: 'Carlos Oliveira',
    items: [
      { productId: 'p03', productName: 'ContiSportContact 5', productSku: 'CONT-225-45R17', qty: 4, unitPrice: 680, discount: 5, total: 2584 },
      { productId: 'p07', productName: 'Balanceamento', productSku: 'SVC-BAL', qty: 4, unitPrice: 35, discount: 0, total: 140 },
    ],
    subtotal: 2724, discount: 0, total: 2724,
    paymentMethod: 'card', status: 'completed',
    createdAt: '2024-11-28T10:15:00Z', operatorId: 'usr_01', operatorName: 'Carlos Silva',
  },
  {
    id: 's003', clientId: 'c02', clientName: 'Maria Santos',
    items: [
      { productId: 'p08', productName: 'Kinergy Eco', productSku: 'HANK-175-70R13', qty: 4, unitPrice: 210, discount: 0, total: 840 },
    ],
    subtotal: 840, discount: 0, total: 840,
    paymentMethod: 'cash', status: 'completed',
    createdAt: '2024-11-27T16:45:00Z', operatorId: 'usr_01', operatorName: 'Carlos Silva',
  },
  {
    id: 's004', clientId: 'c05', clientName: 'Roberto Lima',
    items: [
      { productId: 'p05', productName: 'Eagle F1 Asymmetric', productSku: 'GOOD-215-60R16', qty: 6, unitPrice: 450, discount: 10, total: 2430 },
    ],
    subtotal: 2430, discount: 0, total: 2430,
    paymentMethod: 'transfer', status: 'completed',
    createdAt: '2024-11-27T09:30:00Z', operatorId: 'usr_01', operatorName: 'Carlos Silva',
  },
]

export const MOCK_ALERTS: Alert[] = [
  {
    id: 'al01', type: 'no_stock', severity: 'critical',
    title: 'Sem estoque: Pirelli P7 Cinturato 195/55R15',
    message: 'O produto está com estoque zerado. Solicite reposição imediatamente.',
    productId: 'p04', createdAt: '2024-11-28T08:00:00Z', read: false,
  },
  {
    id: 'al02', type: 'low_stock', severity: 'warning',
    title: 'Estoque baixo: Bridgestone Ecopia EP150',
    message: 'Restam apenas 2 unidades (mínimo: 6). Considere repor o estoque.',
    productId: 'p02', createdAt: '2024-11-28T08:00:00Z', read: false,
  },
  {
    id: 'al03', type: 'low_stock', severity: 'warning',
    title: 'Estoque baixo: Continental ContiSportContact 5',
    message: 'Restam apenas 3 unidades (mínimo: 4). Considere repor o estoque.',
    productId: 'p03', createdAt: '2024-11-27T08:00:00Z', read: true,
  },
]

export const MOCK_KPIS: KPIData[] = [
  {
    label: 'Receita do Mês', value: 42850, change: 12.4, changeType: 'increase',
    format: 'currency', sparkline: [28000, 31000, 29500, 34000, 36000, 38500, 42850],
  },
  {
    label: 'Vendas Hoje', value: 8, change: 33.3, changeType: 'increase',
    format: 'number', sparkline: [4, 6, 5, 7, 8, 6, 8],
  },
  {
    label: 'Ticket Médio', value: 1247.50, change: -3.2, changeType: 'decrease',
    format: 'currency', sparkline: [980, 1100, 1250, 1180, 1320, 1280, 1247.50],
  },
  {
    label: 'Clientes Ativos', value: 142, change: 8.5, changeType: 'increase',
    format: 'number', sparkline: [110, 118, 125, 128, 132, 138, 142],
  },
]

export const REVENUE_CHART_DATA = [
  { month: 'Jun', revenue: 28400, target: 30000 },
  { month: 'Jul', revenue: 31200, target: 32000 },
  { month: 'Ago', revenue: 29800, target: 32000 },
  { month: 'Set', revenue: 35600, target: 34000 },
  { month: 'Out', revenue: 38900, target: 36000 },
  { month: 'Nov', revenue: 42850, target: 40000 },
]

export const CATEGORY_DATA = [
  { name: 'Pneus', value: 68, color: '#ef4444' },
  { name: 'Serviços', value: 22, color: '#b91c1c' },
  { name: 'Acessórios', value: 7, color: '#f87171' },
  { name: 'Rodas', value: 3, color: '#fca5a5' },
]
