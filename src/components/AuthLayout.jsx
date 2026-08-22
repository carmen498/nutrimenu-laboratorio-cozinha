import React from "react";

export default function AuthLayout({ icon: Icon, title, subtitle, footer, children }) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="w-full py-6 bg-brand flex items-center justify-center px-4">
        <span className="font-heading text-2xl md:text-3xl text-brand-foreground tracking-wide">
          Laboratório de Cozinha
        </span>
      </header>
      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary mb-4">
              <Icon className="w-7 h-7 text-primary-foreground" aria-hidden="true" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">{title}</h1>
            {subtitle && <p className="text-muted-foreground mt-2">{subtitle}</p>}
          </div>
          <div className="bg-card rounded-2xl shadow-sm border border-border p-8">
            {children}
          </div>
          {footer && (
            <p className="text-center text-sm text-muted-foreground mt-6">{footer}</p>
          )}
          <div className="mt-4 flex items-center justify-center gap-3 text-xs text-muted-foreground">
            <a href="/termos" target="_blank" rel="noopener noreferrer" className="hover:text-foreground hover:underline">
              Termos de Uso
            </a>
            <span aria-hidden="true">·</span>
            <a href="/privacidade" target="_blank" rel="noopener noreferrer" className="hover:text-foreground hover:underline">
              Política de Privacidade
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}