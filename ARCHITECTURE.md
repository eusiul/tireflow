# TireFlow — Arquitetura do Sistema

## Visão Geral

TireFlow é um SaaS multi-tenant para gestão de caucheiras e lojas de pneus, com foco em experiência visual premium, velocidade operacional e modelo de negócio por assinatura.

---

## Stack Tecnológica

### Frontend
| Tecnologia | Versão | Propósito |
|---|---|---|
| React | 18 | UI declarativo |
| TypeScript | 5.6 | Tipagem estática |
| Vite | 6 | Build tool ultrarrápido |
| Tailwind CSS | 3.4 | Utility-first CSS |
| Framer Motion | 11 | Animações e microinterações |
| Zustand | 5 | State management (5 stores) |
| React Router | 6 | SPA routing com lazy loading |
| Recharts | 2 | Charts e visualizações |
| Lucide React | 0.469 | Ícones premium |
| i18next | 24 | Internacionalização |

### Backend (produção recomendado)
| Tecnologia | Propósito |
|---|---|
| Node.js + Fastify | API REST / WebSocket |
| PostgreSQL 15 | Banco de dados relacional |
| Redis | Cache, sessões, filas |
| BullMQ | Processamento assíncrono |
| JWT + Refresh Tokens | Autenticação |
| Zod | Validação de schemas |

### Integrações
| Serviço | Propósito |
|---|---|
| Pix (API Banco Central) | Pagamentos instantâneos |
| Efi Bank / Gerencianet | Gateway Pix |
| SEFAZ | NF-e via API terceira (Nota Fiscal Express, Focus NF-e) |
| AWS S3 / Cloudflare R2 | Armazenamento de arquivos |
| Resend / SendGrid | E-mails transacionais |

---

## Arquitetura Multi-Tenant

Cada empresa (tenant) é isolada por `tenant_id` em todas as tabelas. O JWT inclui `tenant_id` e `role` para filtragem automática no backend.

```
Request → JWT Middleware → extract(tenant_id, user_id, role)
                        → Row Level Security no PostgreSQL
                        → Controller → Service → Repository
```

### Roles
| Role | Permissões |
|---|---|
| `admin` | Tudo: configurações, usuários, relatórios financeiros, exclusões |
| `seller` | POS, inventário (leitura/edição), clientes, serviços |
| `cashier` | Apenas POS: criar vendas, ver produtos |

---

## Fluxo de Assinatura Pix

```
1. Tenant seleciona plano
2. Sistema gera cobrança Pix (QR Code via API Efi Bank)
3. Tenant paga via aplicativo bancário
4. Webhook recebe notificação de pagamento
5. Sistema atualiza plan_status = 'active'
6. E-mail de confirmação enviado
7. Acesso liberado automaticamente

Em caso de inadimplência:
- D+3: Aviso por e-mail
- D+7: plan_status = 'suspended' (dados preservados, acesso bloqueado)
- D+30: plan_status = 'inactive' (dados em soft-delete por 90 dias)
```

---

## Mapa de Telas

```
/ (redirect to /dashboard)
├── /login               — Tela de login com demo mode
├── /dashboard           — KPIs, gráficos, alertas, vendas recentes
├── /pos                 — Ponto de Venda com leitor de barras
├── /inventory           — Tabela de produtos com filtros avançados
├── /clients             — Lista + painel de detalhe do cliente
├── /services            — Ordens de serviço do dia
├── /reports             — Relatórios visuais e exportação
├── /subscription        — Planos e pagamento Pix
└── /settings            — Empresa, aparência, usuários, segurança
```

---

## Sistema de Design

### Tokens de Cor
```
brand-500  #8b5cf6  Violeta — cor primária, CTAs, foco
brand-600  #7c3aed  Hover dos CTAs
surface-950 #09090b Background da página (dark)
surface-900 #111113 Sidebar, header
surface-800 #1c1c1f Cards, inputs
surface-700 #28282c Hover states, separadores
zinc-100   #f4f4f5 Texto primário (dark mode)
zinc-400   #a1a1aa Texto secundário
zinc-500   #71717a Texto muted, labels
emerald-400          Sucesso, estoque ok
amber-400            Aviso, estoque baixo
red-400              Erro, sem estoque
```

### Tipografia
- Família: **Inter** (sans-serif)
- Mono: **JetBrains Mono** (códigos, SKUs, valores numéricos)
- Hierarquia: `text-xl font-bold` → `text-sm font-medium` → `text-xs text-zinc-500`

### Animações (Framer Motion)
- Entrada de página: `opacity + y: 8` → `200ms`
- Cards stagger: `staggerChildren: 0.07`
- Sidebar: `width: 64 ↔ 220px`, `200ms ease`
- Command palette: `scale: 0.96 + opacity`, `180ms`
- Drawer: `x: 100% → 0`, `300ms ease`
- Toast: `x: 40 + opacity`, `250ms`

---

## Funcionalidades Diferenciadoras

### Command Palette (⌘K)
Busca unificada de ações, navegação, produtos e clientes. Suporta atalhos de teclado e registro dinâmico por página.

### Barcode Scanner (USB HID)
`useBarcodeScan` detecta bursts de keydown (<80ms entre teclas) e interpreta como scan de código de barras. Funciona com qualquer leitor USB no modo emulação de teclado.

### AI Assistant (painel lateral)
Responde perguntas sobre vendas, estoque, clientes e pneus. Arquitetura preparada para integração com Claude API (Anthropic) ou OpenAI. Expansível para WhatsApp via webhook.

### White-Label
Cada tenant pode configurar nome, logo e cor primária. O CSS é regenerado dinamicamente via CSS custom properties injetadas no `<html>`.

### Auditoria Completa
Toda ação (criação, edição, exclusão) é registrada em `audit_logs` com usuário, IP, timestamp e diff de valores.

---

## Estrutura de Pastas

```
src/
├── components/
│   ├── ui/         — Primitivos reutilizáveis (Button, Input, Badge, Modal...)
│   ├── layout/     — AppShell, Sidebar, TopBar
│   ├── command/    — CommandPalette
│   ├── ai/         — AIAssistant panel
│   └── charts/     — Wrappers Recharts
├── pages/          — Uma pasta por rota
├── store/          — Zustand stores
├── hooks/          — Hooks customizados
├── data/           — Mock data (→ substituir por API calls)
├── lib/            — cn(), formatters, validators
├── types/          — Interfaces TypeScript
└── router/         — React Router config
```

---

## Roadmap de Produção

### Fase 1 — MVP (atual)
- ✅ UI/UX completa com tema dark/light
- ✅ POS com carrinho e Pix mock
- ✅ Inventário com alertas
- ✅ Clientes e serviços
- ✅ Dashboard com analytics
- ✅ AI Assistant
- ✅ Command palette

### Fase 2 — Infraestrutura
- [ ] Backend Fastify + PostgreSQL
- [ ] Autenticação JWT + refresh tokens
- [ ] Multi-tenancy real
- [ ] Integração Pix (Efi Bank)
- [ ] E-mails transacionais

### Fase 3 — Avançado
- [ ] NF-e via Focus NF-e API
- [ ] WhatsApp via Evolution API
- [ ] App mobile React Native
- [ ] Integrações contábeis (Conta Azul, Omie)
- [ ] API pública para parceiros
