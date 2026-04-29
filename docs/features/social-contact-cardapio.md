# Redes Sociais e Contato no Cardápio

**PR:** [#74](https://github.com/crislerwin/food-service/pull/74)  
**Data:** 29/04/2026  
**Autor:** Crisler Wintler

---

## 📋 Descrição

Permite que cada tenant configure suas redes sociais e informações de contato diretamente no cardápio público. Isso inclui WhatsApp, Instagram, Facebook, telefone e endereço.

## 🎯 Objetivo

- Facilitar o contato entre cliente e restaurante
- Permitir que o cliente abra o chat do WhatsApp direto do cardápio
- Exibir redes sociais para engajamento do cliente
- Personalização por tenant das informações de contato

## 📝 Arquivos Modificados/Adicionados

| Arquivo | Tipo | Descrição |
|---------|------|-----------|
| `src/lib/tenant-social.ts` | Novo | Utilitários para gerenciar redes sociais do tenant |
| `src/server/routers/tenant.ts` | Modificado | Adicionado campos de redes sociais no schema |
| `src/components/menu/menu-social-bar.tsx` | Novo | Barra de redes sociais no cardápio |
| `src/components/menu/menu-sticky-bar.tsx` | Novo | Barra sticky com ações rápidas |
| `src/app/dashboard/settings/branding/page.tsx` | Modificado | Formulário de configuração |
| `src/app/menu/[tenantSlug]/menu-client.tsx` | Modificado | Integração com componentes sociais |
| `src/app/menu/[tenantSlug]/page.tsx` | Modificado | Props adicionais |
| `src/components/menu/menu-hero.tsx` | Modificado | Exibição de contato |
| `src/components/menu/menu-preview.tsx` | Modificado | Preview das configurações |

## 🔧 Como Usar

### Configuração no Dashboard

1. Acesse **Configurações > Identidade Visual**
2. Na seção **Redes Sociais**, preencha:
   - WhatsApp (com DDD, ex: 5511999999999)
   - Instagram (apenas o usuário, sem @)
   - Facebook (URL ou nome da página)
   - Telefone
   - Endereço completo

### Visualização no Cardápio

As redes sociais aparecem automaticamente:
- **Social Bar:** Na parte superior do cardápio
- **Sticky Bar:** Botões flutuantes para WhatsApp e telefone
- **Hero Section:** Informações de endereço e telefone

### Links Diretos

- WhatsApp: `https://wa.me/{numero}?text={mensagem}`
- Instagram: `https://instagram.com/{usuario}`
- Facebook: Abre em nova aba

## 🧪 Testes

```bash
# Acesse o cardápio de um tenant configurado
http://localhost:3000/menu/{tenantSlug}

# Verifique se os links de WhatsApp e Instagram funcionam
```

## 💡 Notas Técnicas

- Os dados são armazenados no modelo `Tenant` no Prisma
- Presença dos ícones só é exibida se o dado estiver configurado
- WhatsApp usa a API `wa.me` com mensagem pré-definida
- Ícones usam `lucide-react` e `react-icons`
- Os links abrem em nova aba para não perder o contexto do cardápio

## 📱 UX

- Ícones sempre visíveis em dispositivos móveis
- Botão de WhatsApp em destaque (verde)
- Toque suave nos botões para mobile
- Tooltips mostram o valor ao passar o mouse
