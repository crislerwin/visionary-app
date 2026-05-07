# Backoffice

**PR:** [#69](https://github.com/crislerwin/meu-rango/pull/69)  
**Data:** 28/04/2026  
**Autor:** Crisler Wintler

---

## 📋 Descrição

Painel administrativo completo para gerenciamento do sistema. Inclui gerenciamento de tenants, usuários, configurações globais e monitoramento.

## 🎯 Objetivo

- Permitir administração centralizada do SaaS
- Gerenciar tenants (restaurantes)
- Visualizar métricas e uso
- Configurar parâmetros globais

## 📝 Arquivos Modificados/Adicionados

| Arquivo | Tipo | Descrição |
|---------|------|-----------|
| `src/app/dashboard/admin/` | Novo | Rota de administração |
| `src/app/dashboard/admin/page.tsx` | Novo | Dashboard do backoffice |
| `src/app/dashboard/admin/tenants/` | Novo | Gestão de tenants |
| `src/app/dashboard/admin/users/` | Novo | Gestão de usuários |
| `src/app/dashboard/admin/settings/` | Novo | Configurações globais |
| `src/components/admin/` | Novo | Componentes do backoffice |
| `src/components/admin/admin-sidebar.tsx` | Novo | Sidebar de admin |
| `src/components/admin/tenant-table.tsx` | Novo | Tabela de tenants |
| `src/components/admin/user-table.tsx` | Novo | Tabela de usuários |
| `src/server/routers/admin.ts` | Novo | Router tRPC para admin |
| `src/middleware.ts` | Modificado | Verificação de role admin |
| `src/lib/auth.ts` | Modificado | Role-based access |

## 🔐 Permissões

| Role | Acesso |
|------|--------|
| `SUPER_ADMIN` | Acesso total ao backoffice |
| `ADMIN` | Apenas seu próprio tenant |
| `OWNER` | Apenas seu próprio tenant |
| `MEMBER` | Sem acesso |
| `VIEWER` | Sem acesso |

## 🎨 Features do Backoffice

### Dashboard Admin
- Cards com KPIs: total de tenants, usuários ativos, receita
- Gráfico de novos tenants por mês
- Gráfico de MRR (Monthly Recurring Revenue)
- Lista de atividades recentes
- Alertas de tenants com problemas

### Gestão de Tenants
- Lista paginada de todos os tenants
- Filtros: ativo, plano, data de criação
- Ações: ativar/desativar, editar, impersonate
- Detalhes: owner, plano, data de criação, uso
- Exportar CSV

### Gestão de Usuários
- Lista de todos os usuários do sistema
- Filtros por tenant, role, data
- Ações: editar, desativar, resetar senha
- Visualização de último login

### Configurações Globais
- Configurações de email (SMTP)
- Configurações de storage (S3/MinIO)
- Feature flags
- Limites de planos (quotas)
- Mensagens de manutenção

## 🔧 Como Usar

### Acesso

1. Usuários com role `SUPER_ADMIN` veem o menu "Administração" no sidebar
2. URL direta: `/dashboard/admin`

### Criar Super Admin

```bash
# Via Prisma Studio ou query SQL
UPDATE "User" SET role = 'SUPER_ADMIN' WHERE email = 'admin@example.com';
```

## 🧪 Testes

```bash
# Verificar middleware
npm run test

# Testar acesso
# 1. Logue com usuário comum
# 2. Tente acessar /dashboard/admin
# 3. Deve redirecionar para dashboard

# 4. Logue com SUPER_ADMIN
# 5. Deve ver o menu Administração
```

## 💡 Notas Técnicas

- Middleware verifica role antes de permitir acesso
- Queries tRPC usam `isSuperAdmin()` para validação
- UI adaptativa baseada no role do usuário
- Logs de auditoria para ações administrativas
- Impersonate cria sessão temporária como outro usuário

## 📊 Schema

```prisma
enum UserRole {
  SUPER_ADMIN
  ADMIN
  OWNER
  MEMBER
  VIEWER
}

model User {
  id    String   @id @default(uuid())
  role  UserRole @default(MEMBER)
  // ...
}
```
