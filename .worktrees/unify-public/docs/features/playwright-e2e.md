# Playwright E2E Tests

**PR:** [#39](https://github.com/crislerwin/food-service/pull/39)  
**Data:** 25/04/2026   
**Autor:** Crisler Wintler

---

## 📋 Descrição

Suite de testes end-to-end usando Playwright para garantir o funcionamento dos fluxos principais do cardápio e carrinho.

## 🎯 Objetivo

- Testar fluxos críticos do usuário
- Evitar regressões visuais
- Garantir funcionamento em múltiplos navegadores
- Testar responsividade

## 📝 Arquivos

| Arquivo | Descrição |
|---------|-----------|
| `playwright.config.ts` | Configuração do Playwright |
| `e2e/menu-cart-flow.spec.ts` | Fluxo cardápio + carrinho |
| `e2e/checkout-flow.spec.ts` | Fluxo de checkout |
| `e2e/auth.spec.ts` | Testes de autenticação |
| `.github/workflows/e2e.yml` | CI para E2E |

## 🎭 Cenários de Teste

### Menu + Cart Flow
- [x] Acessar cardápio por tenant slug
- [x] Buscar produtos
- [x] Adicionar item ao carrinho
- [x] Ver carrinho
- [x] Alterar quantidade
- [x] Remover item
- [x] Verificar cálculo de total

### Checkout Flow
- [x] Preencher dados do cliente
- [x] Revisar pedido
- [x] Gerar link WhatsApp
- [x] Salvar pedido no banco

### Auth Flow
- [x] Login com credenciais
- [x] Login com Google OAuth
- [x] Logout
- [x] Redirecionamento pós-login

## 🔧 Como Usar

### Instalar
```bash
npm run test:e2e:install  # Instala browsers
```

### Executar
```bash
npm run test:e2e           # Executa todos
npm run test:e2e -- --ui   # Modo UI interativo
npm run test:e2e -- --headed  # Com browser visível
```

### Debug
```bash
npx playwright test --debug
npx playwright test --trace on
```

## 💡 Notas Técnicas

- Browsers: Chromium, Firefox, WebKit
- Resoluções: Desktop, Mobile (iPhone), Tablet
- Database reset antes de cada teste
- Parallel execution desabilitado (shared DB)
- Screenshots em falhas
- Videos em modo debug

## 📊 CI

Executa em toda PR e push na main:
- Setup Node.js
- Install dependencies
- Run migrations
- Run dev server
- Run E2E tests
- Upload artifacts (screenshots/videos)
