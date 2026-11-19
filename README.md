# Programa Comercial VIVO — Sistema de Acompanhamento

Sistema web para acompanhamento comercial de clientes (consultório de harmonização orofacial),
com espaço isolado para cada cliente. A especificação completa está em
[`SPEC-sistema-acompanhamento.md`](SPEC-sistema-acompanhamento.md).

**Fase atual: 1 — Base** (login, espaços, papéis, permissões, menu, Configurações, Metas,
Métricas comerciais e painel Início).

---

## Como colocar no ar (passo a passo)

Você vai precisar de três contas gratuitas: **GitHub** (já tem), **Supabase** e **Vercel**.
Faça os passos na ordem.

### Passo 1 — Criar o banco de dados no Supabase

1. Acesse **supabase.com** e clique em **Start your project**. Entre com a sua conta do GitHub
   (é mais fácil).
2. Clique em **New project**.
   - **Name:** `sistema-acompanhamento`
   - **Database Password:** clique em **Generate a password** e guarde essa senha num lugar seguro
     (você quase nunca vai precisar dela, mas não perca).
   - **Region:** escolha **South America (São Paulo)**.
   - Clique em **Create new project** e espere uns 2 minutos.
3. Criar as tabelas: no menu da esquerda, clique em **SQL Editor**.
   Aqui você vai colar **todos os arquivos da pasta `supabase/migrations/`, um de cada vez, na
   ordem do nome** (do menor número para o maior).

   Para cada um: abra o arquivo aqui no GitHub, clique no ícone de **copiar** (dois quadradinhos,
   no canto superior direito do arquivo), volte ao Supabase, clique em **+ New query**, cole
   (Ctrl+V / Cmd+V) e clique em **Run**. Deve aparecer *"Success. No rows returned"*.

### Passo 2 — Copiar as chaves do Supabase

1. No Supabase, clique em **Project Settings** (engrenagem, no menu da esquerda) → **Data API**
   (ou **API**).
2. Anote dois valores (você vai colar na Vercel no passo 3):
   - **Project URL**: algo como `https://abcdefgh.supabase.co`
   - **anon public** key: um texto bem longo que começa com `eyJ…` (em **API Keys**)

   > Essas duas chaves são feitas para ficar no site e não são secretas. A proteção dos dados vem
   > das regras do banco (RLS). **Nunca** use a chave `service_role`: essa é secreta e o sistema
   > não precisa dela.

### Passo 3 — Publicar o site na Vercel

1. Acesse **vercel.com** e clique em **Sign Up**. Escolha **Continue with GitHub**.
2. Clique em **Add New… → Project**.
3. Na lista, encontre o repositório **sistemadenavegacao** e clique em **Import**.
   (Se ele não aparecer, clique em *Adjust GitHub App Permissions* e libere esse repositório.)
4. Abra a seção **Environment Variables** e adicione as duas variáveis:

   | Name (nome) | Value (valor) |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | o **Project URL** do passo 2 |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | a chave **anon public** do passo 2 |

5. Clique em **Deploy** e espere uns 2 minutos. Quando terminar, a Vercel mostra o endereço do
   site, algo como `https://sistemadenavegacao.vercel.app`. **Copie esse endereço.**

### Passo 4 — Ligar o login ao endereço do site

De volta ao Supabase:

1. **Authentication → URL Configuration**
   - **Site URL:** cole o endereço da Vercel (ex.: `https://sistemadenavegacao.vercel.app`)
   - **Redirect URLs:** clique em **Add URL** e cole o mesmo endereço seguido de `/**`
     (ex.: `https://sistemadenavegacao.vercel.app/**`). Salve.
2. *(Opcional; só funciona no plano pago ou com um serviço de e-mail próprio configurado.)*
   **Authentication → Emails** (ou *Email Templates*). Altere **dois** modelos: **Magic Link** e
   **Confirm signup**. Em cada um:
   - **Subject (assunto):** `Seu link de acesso`
   - **Body (corpo):** apague tudo e cole o conteúdo do arquivo
     [`docs/modelo-email-acesso.html`](docs/modelo-email-acesso.html). Salve.

   > Por que isso? Com esse modelo, o e-mail fica em português e o link funciona mesmo se a pessoa
   > pedir o acesso no computador e abrir o e-mail no celular. Com o modelo padrão (em inglês), o
   > link precisa ser aberto **no mesmo navegador** em que foi pedido; se não der, use a senha.

### Passo 5 — Primeiro acesso

1. Abra o endereço do site e entre com o seu e-mail (**Receber link de acesso**).
2. Abra o e-mail, toque em **Entrar no sistema**.
3. Na tela de boas-vindas, abra **"Sou consultora: quero criar um espaço"**:
   - **Criar espaço de exemplo** cria um consultório de teste já preenchido, para você ver como
     fica.
   - Ou crie o espaço real da sua cliente com o nome dela.
4. Em **Configurações → Minha conta**, coloque seu nome e (opcional) crie uma senha.
5. Em **Configurações → Pessoas**, convide a cliente pelo e-mail dela e envie a mensagem que
   o sistema mostra.

> **Limite de e-mails:** o plano gratuito do Supabase envia poucos e-mails de login por hora.
> Se alguém não receber o link, espere alguns minutos. Depois do primeiro acesso, criar uma senha
> em Configurações evita esse problema.

---

## Como publicar atualizações

Toda vez que o código novo for salvo no GitHub (na branch principal), a Vercel publica o site
sozinha em 1 ou 2 minutos. Quando uma fase nova trouxer arquivos novos em
`supabase/migrations/`, cole só os arquivos novos no **SQL Editor** do Supabase (passo 1.3),
**antes** de publicar.

---

## Quem pode o quê

| | Em acompanhamento | Acompanhamento encerrado |
|---|---|---|
| **Consultora** | edita tudo, configura, convida | só visualiza (ou é removida pela cliente) |
| **Cliente** | edita metas e métricas (e, nas próximas fases, CRM, rotina etc.); vê e comenta os entregáveis | edita tudo, configura, convida |

Essas regras são garantidas pelo próprio banco (RLS), não só pelas telas.

---

## Identidade visual

- **Cores:** todas ficam no topo de [`src/app/globals.css`](src/app/globals.css).
  A cor de destaque também pode ser trocada por espaço em **Configurações**.
- **Fontes:** em [`src/app/layout.tsx`](src/app/layout.tsx) (fontes do Google Fonts).

---

## Para quem programa

```bash
npm install
cp .env.example .env.local   # preencha com as chaves do Supabase
npm run dev                  # http://localhost:3000
npm test                     # testes dos cálculos
npm run test:db              # testes de permissão (RLS) num PostgreSQL temporário
```

Para um Supabase local completo: `npx supabase start` (precisa de Docker).

Estrutura:

- `supabase/migrations/`: tabelas, funções e regras de RLS
- `testes/banco/`: teste de isolamento entre espaços e de papéis
- `src/app/(app)/`: telas logadas (início, metas, métricas, configurações)
- `src/lib/`: formatos brasileiros, cálculos, carregamento do contexto (espaço e papel)
