# Upload de Imagem em Categorias

**PR:** [#57](https://github.com/crislerwin/food-service/pull/57)  
**Data:** 26/04/2026  
**Autor:** Crisler Wintler

---

## 📋 Descrição

Permite adicionar e gerenciar imagens para cada categoria do cardápio. As imagens são exibidas no dashboard e podem ser usadas no cardápio público.

## 🎯 Objetivo

- Visualização mais rica das categorias
- Facilitar identificação visual
- Consistência com produtos (que já tinham imagens)
- Melhor experiência no cardápio

## 📝 Arquivos Modificados/Adicionados

| Arquivo | Tipo | Descrição |
|---------|------|-----------|
| `prisma/schema.prisma` | Modificado | Campo `imageUrl` no modelo Category |
| `src/app/dashboard/categories/` | Modificado | Páginas de categorias |
| `src/components/categories/category-form.tsx` | Modificado | Upload de imagem no formulário |
| `src/components/categories/category-card.tsx` | Modificado | Exibição da imagem |
| `src/server/routers/category.ts` | Modificado | Tratamento do campo imageUrl |
| `src/lib/upload.ts` | Modificado | Validação de tipos para categorias |

## 🎨 Funcionalidades

### Upload
- Drag & drop ou seleção manual
- Preview antes de salvar
- Crop opcional (1:1)
- Compressão automática
- Formatos aceitos: JPG, PNG, WebP
- Tamanho máximo: 2MB

### Exibição
- Thumbnail no list de categorias
- Preview no formulário
- Placeholder quando sem imagem
- Lazy loading das imagens

## 🔧 Como Usar

### Adicionar Imagem

1. Acesse Dashboard > Categorias
2. Clique em "Nova Categoria" ou edite existente
3. Clique na área de upload de imagem
4. Selecione ou arraste uma imagem
5. Faça o crop se desejar
6. Salve a categoria

### Visualizar

- **Dashboard:** Imagem aparece no card da categoria
- **Cardápio:** Pode ser exibida no header da seção de categoria

## 💡 Notas Técnicas

- Mesmo sistema de upload de produtos (S3/MinIO/Local)
- Schema atualizado:
```prisma
model Category {
  id        String   @id @default(uuid())
  name      String
  imageUrl  String?  // Novo campo
  // ...
}
```
- URL salva no banco após upload
- Validação de tipo MIME: `image/*`
- Cleanup: imagem antiga é deletada ao atualizar

## 🧪 Testes

```bash
# Testar upload
curl -X POST http://localhost:3000/api/upload \
  -F "file=@categoria.jpg" \
  -F "type=category"
```

## 📱 UX

- Preview em tempo real
- Loading state durante upload
- Erro claro se imagem for muito grande
- Botão de remover imagem
- Ícone padrão quando sem imagem
