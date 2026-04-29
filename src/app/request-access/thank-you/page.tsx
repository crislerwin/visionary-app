import Link from "next/link";

import "../../landing-theme.css";

export default function ThankYouPage() {
  return (
    <div className="landing-theme min-h-screen bg-background text-foreground flex items-center justify-center">
      <div className="mx-auto max-w-md text-center space-y-6 p-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 text-green-600">
          <svg
            className="w-8 h-8"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            role="img"
            aria-label="Check"
          >
            <title>Check</title>
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>
        <h1
          className="text-3xl font-bold tracking-tight"
          style={{ fontFamily: "var(--font-fraunces), serif" }}
        >
          Obrigado pelo interesse!
        </h1>
        <p className="text-muted-foreground text-lg">
          Nossa equipe entrará em contato em até 24h para liberar seu acesso.
        </p>
        <Link
          href="/"
          className="inline-flex h-10 items-center justify-center rounded-full bg-primary text-primary-foreground px-8 text-sm font-medium"
        >
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}
