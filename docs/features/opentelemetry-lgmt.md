# OpenTelemetry + LGTM Stack

**PR:** [#67](https://github.com/crislerwin/meu-rango/pull/67)  
**Data:** 27/04/2026  
**Autor:** Crisler Wintler

---

## 📋 Descrição

Implementação de observabilidade completa usando OpenTelemetry para instrumentação e LGTM stack (Loki + Grafana + Tempo + Mimir/Prometheus) para coleta, análise e visualização de logs, métricas e traces.

## 🎯 Objetivo

- Monitorar performance da aplicação em tempo real
- Facilitar debugging com distributed tracing
- Centralizar logs de todos os serviços
- Criar dashboards de métricas personalizados
- Alertas proativos para problemas

## 🏗️ Arquitetura LGTM

| Componente | Função | Porta |
|------------|--------|-------|
| **Loki** | Agregação de logs | 3100 |
| **Grafana** | Visualização | 3000 |
| **Tempo** | Distributed tracing | 3200 |
| **Mimir** | Métricas (TSDB) | 8080 |
| **Prometheus** | Coleta de métricas | 9090 |
| **OpenTelemetry Collector** | Recebimento e exportação de traces | 4317/4318 |

## 📝 Arquivos Modificados/Adicionados

| Arquivo | Tipo | Descrição |
|---------|------|-----------|
| `docker-compose.observability.yml` | Novo | Stack LGTM completo |
| `otel-collector-config.yaml` | Novo | Configuração do OTel Collector |
| `src/lib/otel.ts` | Novo | Configuração OpenTelemetry |
| `src/instrumentation.ts` | Novo | Instrumentação Next.js |
| `src/instrumentation.node.ts` | Novo | Instrumentação Node.js |
| `next.config.ts` | Modificado | Configuração experimental OTel |
| `package.json` | Modificado | Dependências OTel |
| `grafana/dashboards/` | Novo | Dashboards pré-configurados |
| `grafana/datasources/` | Novo | Data sources config |

## 🔧 Como Usar

### Iniciar Stack

```bash
# Iniciar apenas observabilidade
docker-compose -f docker-compose.observability.yml up -d

# Ou junto com o app
docker-compose -f docker-compose.yml -f docker-compose.observability.yml up -d
```

### Acessar Interfaces

| Serviço | URL |
|---------|-----|
| Grafana | http://localhost:3000 (admin/admin) |
| Tempo | http://localhost:3200 |
| Prometheus | http://localhost:9090 |

### Dashboards Disponíveis

1. **Application Overview** - Visão geral da saúde do app
2. **HTTP Requests** - Latência, taxa de erro, throughput
3. **Database Queries** - Performance do Prisma/PostgreSQL
4. **JVM/Node Metrics** - Memória, CPU, event loop
5. **Custom Business Metrics** - Pedidos, usuários, etc.

## 📊 Métricas Coletadas

### Auto-instrumentadas
- HTTP requests (método, rota, status, duração)
- Database queries (SQL, duração, tabela)
- External HTTP calls
- Runtime metrics (GC, memory, CPU)

### Custom
- Pedidos criados (contador)
- Tempo de checkout (histograma)
- Usuários ativos (gauge)
- Erros de autenticação (contador)

## 📝 Configuração

```typescript
// src/lib/otel.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({
    url: 'http://localhost:4318/v1/traces'
  }),
  serviceName: 'meu-rango',
});

sdk.start();
```

## 💡 Notas Técnicas

- Auto-instrumentação via `@opentelemetry/auto-instrumentations-node`
- Traces propagados via headers W3C Trace Context
- Sampling configurável (100% em dev, 10% em prod)
- Logs estruturados em JSON para Loki
- Correlação trace-id em todos os logs
- Retenção: 7 dias traces, 30 dias métricas

## 🧪 Testes

```bash
# Gerar carga
ab -n 1000 -c 10 http://localhost:3000/api/trpc/health

# Verificar traces no Tempo/Tempo
# Acesse Grafana > Explore > Tempo
```

## 🔗 Links Úteis

- [OpenTelemetry Docs](https://opentelemetry.io/docs/)
- [Grafana LGTM](https://grafana.com/go/observabilitycon/2023/lgtm/)
- [Tempo Documentation](https://grafana.com/docs/tempo/)
