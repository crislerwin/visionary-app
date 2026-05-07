# Landing Page do Lovable

**PR:** [#71](https://github.com/crislerwin/food-service/pull/71)  
**Data:** 28/04/2026  
**Autor:** Crisler Wintler

---

## 📋 Descrição

Landing page moderna e atrativa para apresentar o Food Service como produto SaaS. Design criado no Lovable.dev com foco em conversão, apresentando features, preços e CTA claro.

## 🎯 Objetivo

- Apresentar o produto para novos visitantes
- Converter visitantes em leads/trial
- Explicar as principais funcionalidades
- Criar credibilidade com depoimentos

## 📝 Arquivos Modificados/Adicionados

| Arquivo | Tipo | Descrição |
|---------|------|-----------|
| `src/app/page.tsx` | Modificado | Nova landing page |
| `src/components/marketing/hero-section.tsx` | Novo | Seção hero com CTA |
| `src/components/marketing/features-section.tsx` | Novo | Grid de features |
| `src/components/marketing/pricing-section.tsx` | Novo | Tabela de preços |
| `src/components/marketing/testimonials-section.tsx` | Novo | Depoimentos de clientes |
| `src/components/marketing/cta-section.tsx` | Novo | Call-to-action final |
| `src/components/marketing/footer.tsx` | Novo | Footer institucional |
| `src/components/marketing/navbar.tsx` | Novo | Navbar fixa com scroll effect |
| `public/images/marketing/` | Novo | Imagens e assets |

## 🎨 Estrutura da Landing

### 1. Hero Section
- Headline impactante
- Subheadline explicando valor
- CTA buttons ("Começar Grátis", "Ver Demo")
- Mockup do produto
- Animação de entrada

### 2. Features Section
- 6 features principais em grid
- Ícones + descrição breve
- Cards com hover effect
- Categorias: Gestão, Cardápio, Pedidos, Caixa, Equipe, Analytics

### 3. Pricing Section
- 3 planos: Starter, Pro, Enterprise
- Feature comparison
- Destaque no plano recomendado
- Toggle mensal/anual

### 4. Testimonials Section
- 3 depoimentos de clientes
- Avatar + nome + cargo
- Logos de restaurantes

### 5. CTA Section
- Headline de fechamento
- Botão de conversão
- Trust badges ("Sem cartão", "Setup em 5 min")

### 6. Footer
- Links rápidos
- Contato
- Redes sociais
- Copyright

## 🔧 Como Usar

### Edição de Conteúdo

Edite diretamente nos componentes em `src/components/marketing/`:

```typescript
// src/components/marketing/features-section.tsx
const features = [
  {
    icon: MenuIcon,
    title: 'Cardápio Digital',
    description: 'Seu cardápio online e sempre atualizado'
  },
  // ...
];
```

### Deploy

A landing é a página inicial (`/`). É buildada automaticamente junto com o app.

## 🧪 Testes

```bash
# Verifique visualmente em diferentes tamanhos de tela
npm run dev
# Acesse http://localhost:3000

# Teste responsividade com DevTools
```

## 💡 Notas Técnicas

- Design exportado do Lovable.dev
- Componentes totalmente responsivos
- Animações com Framer Motion
- SEO otimizado com Next.js metadata
- Imagens otimizadas com next/image
- Lazy loading das seções abaixo da dobra

## 📱 Responsividade

| Breakpoint | Layout |
|------------|--------|
| Mobile (<640px) | 1 coluna, fontes menores, CTA sticky |
| Tablet (640-1024px) | 2 colunas, hero em stack |
| Desktop (>1024px) | Layout completo, sidebar fixa |

## 🔗 Links Importantes

- **Preview:** <https://food-service-demo.vercel.app>
- **Lovable Project:** [Design original](https://lovable.dev)
