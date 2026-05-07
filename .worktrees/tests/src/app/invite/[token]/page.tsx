import { AcceptInviteForm } from "@/components/auth/accept-invite-form";

export default function AcceptInvitePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-md bg-card rounded-2xl border shadow-lg p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold tracking-tight">Aceitar Convite</h1>
          <p className="text-sm text-muted-foreground mt-2">Defina sua senha para entrar no time</p>
        </div>
        <AcceptInviteForm />
      </div>
    </div>
  );
}
