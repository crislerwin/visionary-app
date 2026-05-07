# Configuração de Identidade Visual do Tenant

**PR:** [#50](https://github.com/crislerwin/meu-rango/pull/50) (completa #48)  
**Data:** 28/04/2026  
**Autor:** Crisler Wintler

---

## 📋 Descrição

Sistema de personalização de identidade visual por tenant, permitindo cada restaurante configurar suas próprias cores, logo e tema.

## 🎯 Objetivo

- Cada restaurante com sua própria marca
- Customização de cores primária e secundária
- Upload de logo personalizado
- Aplicação automática no cardápio

## 📝 Arquivos Modificados/Adicionados

| Arquivo | Tipo | Descrição |
|---------|------|-----------|
| `prisma/schema.prisma` | Modificado | Campos de branding no Tenant |
| `src/app/dashboard/settings/branding/page.tsx` | Novo | Página de configuração |
| `src/components/branding/color-picker.tsx` | Novo | Seletor de cor |
| `src/components/branding/logo-upload.tsx` | Novo | Upload de logo |
| `src/components/branding/preview.tsx` | Novo | Preview ao vivo |
| `src/lib/theme.ts` | Novo | Aplicação de tema dinâmico |
| `src/app/menu/[tenantSlug]/layout.tsx` | Modificado | Aplicação de tema |
| `src/server/routers/tenant.ts` | Modificado | Endpoints de branding |

## 🎨 Campos Configuráveis

| Campo | Descrição | Padrão |
|-------|-----------|--------|
| `primaryColor` | Cor principal (botões, links) | `#000000` |
| `secondaryColor` | Cor secundária (destaques) | `#ffffff` |
| `accentColor` | Cor de ênfase | `#f59e0b` |
| `backgroundColor` | Cor de fundo | `#ffffff` |
| `textColor` | Cor do texto | `#1a1a1a` |
| `logoUrl` | URL do logo | - |
| `faviconUrl` | URL do favicon | - |

## 🔧 Como Usar

### Configuração

1. Dashboard > Configurações > Identidade Visual
2. Selecione as cores usando o color picker
3. Faça upload do logo (recomendado: SVG ou PNG transparente)
4. Veja o preview ao vivo
5. Salve as alterações

### Aplicação

O tema é aplicado automaticamente:
- CSS variables injetadas no `:root`
- Componentes shadcn/ui usam as variáveis
- Cardápio público reflete as cores do tenant

## 💡 Notas Técnicas

```typescript
// Aplicação de tema
export function applyTenantTheme(tenant: Tenant) {
  const root = document.documentElement;
  root.style.setProperty('--tenant-primary', tenant.primaryColor);
  root.style.setProperty('--tenant-secondary', tenant.secondaryColor);
  // ...
}
```

- Cores armazenadas em HEX
- Validação de formato de cor
- Preview em tempo real com debounce
- Fallback para tema padrão se não configurado
