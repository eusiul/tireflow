# TireFlow — Guia de Setup Completo

## Pré-requisitos

- Node.js 20+
- PostgreSQL 15+
- (Opcional) Redis (para filas futuras)

---

## 1. Configuração do Frontend

```bash
# Na raiz do projeto
npm install
npm run dev    # → http://localhost:5173
```

---

## 2. Configuração do Backend

```bash
cd server
npm install

# Copie e configure o .env
cp .env.example .env
```

Edite `server/.env` com suas credenciais:

```env
DATABASE_URL=postgresql://postgres:senha@localhost:5432/tireflow
JWT_SECRET=gere-uma-string-aleatoria-de-32-chars

# Pix (Efi Bank)
EFI_CLIENT_ID=...
EFI_CLIENT_SECRET=...
EFI_PIX_KEY=sua-chave-pix

# NF-e (Focus NF-e)
FOCUS_NFE_TOKEN=...
FOCUS_NFE_SANDBOX=true   # false em produção

# WhatsApp (Evolution API - self-hosted)
EVOLUTION_API_URL=http://localhost:8080
EVOLUTION_API_KEY=...

# Claude AI
ANTHROPIC_API_KEY=sk-ant-...
```

### Criar banco de dados

```bash
# Criar banco
psql -U postgres -c "CREATE DATABASE tireflow;"

# Aplicar schema
npm run db:migrate
```

### Iniciar servidor

```bash
npm run dev    # → http://localhost:3001
```

---

## 3. Configuração Efi Bank (Pix)

1. Crie conta em [efipay.com.br](https://efipay.com.br)
2. Acesse **API** → **Credenciais** → **Nova aplicação**
3. Copie `Client ID` e `Client Secret` para o `.env`
4. Crie uma chave Pix em **Contas** → **Chaves Pix**
5. Em produção, baixe o certificado `.p12` e defina `certPath` no `EfiBankClient`

### Registro do webhook Pix

```bash
curl -X POST http://localhost:3001/api/v1/payments/webhook/register \
  -H "Authorization: Bearer SEU_TOKEN" \
  -d '{"callbackUrl": "https://seu-dominio.com/api/v1/payments/webhook/pix"}'
```

> O webhook precisa de HTTPS. Use [ngrok](https://ngrok.com) em desenvolvimento:
> `ngrok http 3001`

---

## 4. Configuração Focus NF-e

1. Crie conta em [focusnfe.com.br](https://focusnfe.com.br)
2. Copie o token de homologação para `FOCUS_NFE_TOKEN`
3. Configure os dados fiscais do tenant em **Configurações → Empresa**:
   - CNPJ
   - Inscrição Estadual
   - Endereço completo
   - CRT (regime tributário)
4. Para emitir NF-e de uma venda:

```bash
POST /api/v1/nfe/emit/:saleId
Authorization: Bearer TOKEN
{
  "destinatarioNome": "João Silva",
  "destinatarioCpfCnpj": "12345678900",
  "destinatarioEmail": "joao@email.com"
}
```

### NCMs para pneus
| Produto | NCM |
|---|---|
| Pneu para automóvel | 4011.10.00 |
| Pneu para ônibus/caminhão | 4011.20.00 |
| Pneu para motocicleta | 4011.30.00 |
| Roda de alumínio | 8708.70.09 |

---

## 5. Configuração Evolution API (WhatsApp)

### Docker (recomendado)

```bash
docker run -d \
  --name evolution-api \
  -p 8080:8080 \
  -e AUTHENTICATION_API_KEY=sua_api_key \
  atendai/evolution-api:latest
```

### Conectar instância

```bash
# 1. Criar instância
curl -X POST http://localhost:8080/instance/create \
  -H "apikey: sua_api_key" \
  -d '{"instanceName": "tireflow-main", "qrcode": true}'

# 2. Obter QR Code (via dashboard ou API)
GET /api/v1/whatsapp/qrcode
# → escanear com o celular

# 3. Verificar status
GET /api/v1/whatsapp/status
```

### Registrar webhook

```bash
POST /api/v1/whatsapp/register-webhook
{
  "callbackUrl": "https://seu-dominio.com/api/v1/whatsapp/webhook"
}
```

### Testar envio

```bash
POST /api/v1/whatsapp/send
Authorization: Bearer TOKEN
{
  "phone": "5511987654321",
  "message": "Olá! Teste do TireFlow 🚗"
}
```

---

## 6. Configuração Claude AI

1. Obtenha a API key em [console.anthropic.com](https://console.anthropic.com)
2. Defina `ANTHROPIC_API_KEY` no `.env`
3. O assistente responde em PT-BR, ES ou EN (detecta automaticamente)
4. O histórico de conversa é enviado a cada request para contexto

---

## 7. Deploy em Produção

### Backend (Railway / Render / Fly.io)

```bash
# Build
cd server && npm run build

# Variáveis de ambiente no painel do serviço
# DATABASE_URL, JWT_SECRET, EFI_*, FOCUS_NFE_*, EVOLUTION_*, ANTHROPIC_API_KEY
```

### Frontend (Vercel / Netlify)

```bash
# Build command
npm run build

# Env var
VITE_API_URL=https://api.seu-dominio.com/api/v1
```

### Banco de Dados (Supabase / Neon / Railway)

```bash
# Aplicar schema via psql
psql $DATABASE_URL -f DATABASE_SCHEMA.sql
```

---

## 8. Estrutura do Projeto

```
/                           # Frontend React
├── src/
│   ├── components/         # UI components
│   ├── pages/              # Telas
│   ├── store/              # Zustand stores
│   ├── lib/api.ts          # API client ← conecta ao backend
│   └── data/mockData.ts    # Dados demo (substituídos pela API)
│
server/                     # Backend Fastify
├── src/
│   ├── modules/
│   │   ├── auth/           # Login, registro, JWT
│   │   ├── products/       # CRUD + estoque
│   │   ├── sales/          # POS + carrinho + stock deduction
│   │   ├── clients/        # CRM básico
│   │   ├── payments/       # Pix Efi Bank
│   │   ├── nfe/            # Focus NF-e
│   │   └── whatsapp/       # Evolution API + AI handler
│   ├── lib/
│   │   ├── efibank.ts      # Pix client
│   │   ├── focusnfe.ts     # NF-e client
│   │   ├── whatsapp.ts     # WhatsApp client
│   │   └── claude.ts       # Claude AI client
│   ├── plugins/auth.ts     # JWT + roles
│   └── db/client.ts        # PostgreSQL pool
│
DATABASE_SCHEMA.sql         # Schema completo com triggers
ARCHITECTURE.md             # Documentação técnica
```
