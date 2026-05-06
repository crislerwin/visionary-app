# SmartForm Component

Componente de formulário inteligente com React Hook Form + Zod para validação.

## Features

- ✅ Validação automática com Zod
- ✅ Tipagem TypeScript completa
- ✅ Campos pré-configurados: text, email, password, number, textarea, select, date, checkbox
- ✅ Suporte a campos customizados
- ✅ Layout vertical ou horizontal
- ✅ Erros de servidor integrados
- ✅ Transformações de valores (input/output)
- ✅ Loading states

## Uso Básico

```tsx
import { SmartForm, type SmartField } from "@/components/ui/smart-form";
import { z } from "zod";

// 1. Defina o schema
const userSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("Email inválido"),
  age: z.number().min(18, "Deve ser maior de 18"),
  role: z.enum(["admin", "user"]),
});

type UserForm = z.infer<typeof userSchema>;

// 2. Configure os campos
const fields: SmartField<UserForm>[] = [
  {
    name: "name",
    label: "Nome",
    type: "text",
    placeholder: "Digite seu nome",
    required: true,
  },
  {
    name: "email",
    label: "Email",
    type: "email",
    placeholder: "seu@email.com",
    required: true,
  },
  {
    name: "age",
    label: "Idade",
    type: "number",
    required: true,
  },
  {
    name: "role",
    label: "Perfil",
    type: "select",
    options: [
      { label: "Administrador", value: "admin" },
      { label: "Usuário", value: "user" },
    ],
  },
];

// 3. Use o componente
function UserForm() {
  const handleSubmit = async (data: UserForm) => {
    await api.user.create(data);
  };

  return (
    <SmartForm
      schema={userSchema}
      fields={fields}
      onSubmit={handleSubmit}
      submitText="Criar Usuário"
    />
  );
}
```

## Campos Disponíveis

### Text / Email / Password
```tsx
{ name: "email", label: "Email", type: "email" }
```

### Number
```tsx
{ name: "amount", label: "Valor", type: "number" }
```

### Textarea
```tsx
{ name: "description", label: "Descrição", type: "textarea" }
```

### Select
```tsx
{
  name: "status",
  label: "Status",
  type: "select",
  options: [
    { label: "Ativo", value: "active" },
    { label: "Inativo", value: "inactive" },
  ],
}
```

### Date
```tsx
{ name: "birthDate", label: "Data de Nascimento", type: "date" }
```

### Checkbox
```tsx
{ name: "isActive", label: "Ativo", type: "checkbox" }
```

### Custom (Campo Customizado)
```tsx
{
  name: "amount",
  label: "Valor",
  type: "custom",
  customRender: ({ field, form }) => (
    <CurrencyInput
      value={field.value}
      onChange={field.onChange}
      currency="BRL"
    />
  ),
}
```

## Props

### SmartForm

| Prop | Tipo | Descrição |
|------|------|-----------|
| `schema` | `z.ZodType` | Schema Zod para validação |
| `fields` | `SmartField[]` | Configuração dos campos |
| `defaultValues` | `Partial<T>` | Valores iniciais |
| `onSubmit` | `(data: T) => void \| Promise<void>` | Callback de submit |
| `submitText` | `string` | Texto do botão |
| `isLoading` | `boolean` | Estado de loading |
| `layout` | `"vertical" \| "horizontal"` | Layout do form |
| `gap` | `"sm" \| "md" \| "lg"` | Espaçamento entre campos |
| `footer` | `ReactNode \| ((form) => ReactNode)` | Footer customizado |
| `serverErrors` | `Record<string, string>` | Erros do servidor |

### SmartField

| Prop | Tipo | Descrição |
|------|------|-----------|
| `name` | `string` | Nome do campo (key do schema) |
| `label` | `string` | Label exibido |
| `type` | `FieldType` | Tipo do campo |
| `placeholder` | `string` | Placeholder |
| `description` | `string` | Texto de ajuda |
| `options` | `SelectOption[]` | Opções para select |
| `disabled` | `boolean` | Desabilitado |
| `required` | `boolean` | Mostra asterisco |
| `customRender` | `function` | Render customizado |
| `transform` | `{ input?, output? }` | Transformações de valor |

## Layout Horizontal

```tsx
<SmartForm
  schema={userSchema}
  fields={fields}
  onSubmit={handleSubmit}
  layout="horizontal"
  gap="lg"
/>
```

## Erros do Servidor

```tsx
<SmartForm
  schema={userSchema}
  fields={fields}
  onSubmit={handleSubmit}
  serverErrors={{
    email: "Este email já está em uso",
  }}
/>
```

## Footer Customizado

```tsx
<SmartForm
  schema={userSchema}
  fields={fields}
  onSubmit={handleSubmit}
  footer={(form) => (
    <div className="flex gap-2">
      <Button type="button" variant="outline" onClick={() => form.reset()}>
        Limpar
      </Button>
      <Button type="submit">Salvar</Button>
    </div>
  )}
/>
```

## Transformações

```tsx
{
  name: "amount",
  label: "Valor em Centavos",
  type: "number",
  transform: {
    // Converte de centavos para reais na exibição
    input: (value) => value / 100,
    // Converte de reais para centavos no submit
    output: (value) => Math.round(value * 100),
  },
}
```
