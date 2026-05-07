# Upload de Imagens de Produtos com Crop

**PR:** [#44](https://github.com/crislerwin/meu-rango/pull/44) (completa #43)  
**Data:** 25/04/2026   
**Autor:** Crisler Wintler

---

## 📋 Descrição

Sistema completo de upload de imagens para produtos com cropping, preview e múltiplas opções de storage (S3, MinIO ou Local).

## 🎯 Objetivo

- Permitir upload de imagens de produtos de forma simples
- Cropping para garantir proporção consistente
- Preview antes de salvar
- Suporte a múltiplos storages (S3, MinIO, Local)
- Compressão automática

## 📝 Arquivos Modificados/Adicionados

| Arquivo | Tipo | Descrição |
|---------|------|-----------|
| `src/components/product/image-upload.tsx` | Novo | Componente de upload com crop |
| `src/components/product/image-cropper.tsx` | Novo | Modal de crop |
| `src/lib/storage/s3.ts` | Novo | Cliente S3 |
| `src/lib/storage/minio.ts` | Novo | Cliente MinIO |
| `src/lib/storage/local.ts` | Novo | Storage local |
| `src/lib/storage/index.ts` | Novo | Factory de storage |
| `src/app/api/upload/route.ts` | Novo | API de upload |
| `src/server/routers/product.ts` | Modificado | Integração com upload |

## 🎨 Componentes

### ImageUpload
- Área de drag & drop
- Preview da imagem atual
- Botão de upload/remover
- Loading state
- Validação de tipo/tamanho

### ImageCropper
- Crop com aspect ratio fixo (1:1 ou 4:3)
- Zoom e pan
- Preview em tempo real
- Botões de confirmação/cancelamento

## 🔧 Como Usar

### Configuração

Defina em `.env`:
```bash
# Opção 1: AWS S3
STORAGE_TYPE=s3
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
AWS_S3_BUCKET=meu-rango
AWS_S3_REGION=us-east-1

# Opção 2: MinIO (self-hosted)
STORAGE_TYPE=minio
MINIO_ENDPOINT=http://localhost:9000
MINIO_ACCESS_KEY=xxx
MINIO_SECRET_KEY=xxx
MINIO_BUCKET=meu-rango

# Opção 3: Local (desenvolvimento)
STORAGE_TYPE=local
UPLOAD_DIR=./uploads
```

### Uso no Formulário

```tsx
import { ImageUpload } from '@/components/product/image-upload';

<ImageUpload
  value={product.imageUrl}
  onChange={(url) => setValue('imageUrl', url)}
  aspectRatio={1}
  maxSize={2 * 1024 * 1024} // 2MB
/>
```

## 💡 Notas Técnicas

- Crop feito no client com `react-cropper`
- Upload em chunks para arquivos grandes
- Geração de thumbnail automática
- URL pública ou signed URL (configurável)
- Cleanup de imagens antigas ao atualizar

## 🧪 Testes

```bash
# Testar upload
curl -X POST http://localhost:3000/api/upload \
  -F "file=@produto.jpg" \
  -F "aspectRatio=1"
```
