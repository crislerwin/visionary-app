# Menu Lovable Design

**PR:** [#72](https://github.com/crislerwin/meu-rango/pull/72)  
**Data:** 29/04/2026  
**Autor:** Crisler Wintler

---

## 📋 Descrição

Redesign completo da interface do cardápio público, trazendo uma experiência visual mais moderna e agradável inspirada em apps de entrega populares. Design responsivo, animações suaves e melhor usabilidade.

## 🎯 Objetivo

- Modernizar a aparência do cardápio público
- Melhorar a experiência de navegação nos produtos
- Otimizar para dispositivos móveis (80% dos usuários)
- Facilitar a busca e adição de itens ao carrinho

## 📝 Arquivos Modificados/Adicionados

| Arquivo | Tipo | Descrição |
|---------|------|-----------|
| `src/app/globals.css` | Modificado | Novos estilos CSS, variáveis de tema |
| `src/app/menu/[tenantSlug]/menu-client.tsx` | Modificado | Layout redesenhado |
| `src/components/menu/menu-hero.tsx` | Modificado | Hero com parallax e gradiente |
| `src/components/menu/menu-item-card.tsx` | Modificado | Card de produto redesenhado |
| `src/components/menu/menu-search-bar.tsx` | Novo | Barra de busca com debounce |
| `src/components/menu/menu-cart-drawer.tsx` | Modificado | Drawer de carrinho estilizado |
| `src/components/menu/menu-cart-fab.tsx` | Novo | Botão flutuante do carrinho |
| `src/stores/cart-store.ts` | Modificado | Melhorias no estado do carrinho |
| `src/server/routers/product.ts` | Modificado | Queries otimizadas |
| `src/app/dashboard/products/page.tsx` | Modificado | Preview do cardápio |
| `src/app/sign-in/page.tsx` | Modificado | Estilização do login |
| `src/components/auth/login-form.tsx` | Modificado | Formulário modernizado |
| `bun.lock` | Modificado | Dependências atualizadas |

## 🎨 Features Visuais

### Design System
- **Cores:** Gradiente suave no header, cores do tenant aplicadas dinamicamente
- **Tipografia:** Inter + system fonts, hierarquia clara
- **Sombras:** Sombreado sutil para profundidade
- **Bordas:** Border-radius consistente (8px, 12px, 16px, full)

### Animações
- Entrada suave dos cards (fade + slide)
- Hover nos cards de produto (scale + shadow)
- Skeleton loading para melhor percepção
- Transições no carrinho

### Componentes

#### MenuItemCard
- Imagem em destaque com aspect-ratio 1:1
- Badge de categoria
- Preço em destaque
- Botão de adicionar ao carrinho
- Hover com scale 1.02

#### MenuSearchBar
- Busca em tempo real com debounce
- Ícone de busca
- Limpar busca (X)
- Destaque em categoria ativa

#### MenuCartDrawer
- Slide-in animation
- Lista de itens scrollable
- Controles de quantidade
- Resumo de preços
- Botão de checkout

#### MenuCartFAB
- Floating Action Button para mobile
- Badge com quantidade
- Pulse animation quando adiciona item

## 🔧 Como Usar

### Configuração Visual

O design se adapta automaticamente às cores do tenant:
```typescript
// As cores são aplicadas via CSS variables
:root {
  --tenant-primary: {tenant.primaryColor};
  --tenant-secondary: {tenant.secondaryColor};
}
```

### Preview

Acesse `/menu/{tenantSlug}` para ver o cardápio com o novo design.

## 🧪 Testes

```bash
# Testes E2E cobrem o fluxo completo
npm run test:e2e

# Testes específicos do carrinho
npx playwright test menu-cart-flow.spec.ts
```

## 💡 Notas Técnicas

- Usa `framer-motion` para animações
- CSS variables para cores dinâmicas do tenant
- Virtualização considerada para listas longas (100+ itens)
- Lazy loading das imagens de produtos
- Debounce de 300ms na busca
- Estado do carrinho persistido no localStorage

## 📊 Performance

- **LCP:** < 2.5s em 4G
- **CLS:** < 0.1
- **FCP:** < 1.8s
- Imagens otimizadas com Next.js Image
- Code splitting por rota
