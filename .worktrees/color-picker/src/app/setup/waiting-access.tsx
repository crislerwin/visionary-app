import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail } from "lucide-react";

export function WaitingAccess() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
          <Mail className="w-6 h-6 text-primary" />
        </div>
        <CardTitle className="text-2xl text-center">Aguardando acesso</CardTitle>
        <CardDescription className="text-center">
          Você ainda não foi adicionado a nenhum estabelecimento. Entre em contato com o
          administrador para receber um convite.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground text-center">
          Assim que for convidado, você poderá acessar o dashboard do estabelecimento.
        </p>
      </CardContent>
    </Card>
  );
}
