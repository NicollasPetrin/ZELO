import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  async headers() {
    // 'unsafe-eval' so e necessario em desenvolvimento, onde o recarregamento
    // rapido avalia codigo em tempo de execucao. Em producao o build ja esta
    // compilado, e manter a permissao apenas amplia o que um XSS conseguiria
    // executar. 'unsafe-inline' continua porque o Next injeta scripts embutidos
    // no HTML; tirar isso exige nonce por requisicao.
    const scriptSrc = ["'self'", "'unsafe-inline'"];

    if (process.env.NODE_ENV !== "production") {
      scriptSrc.push("'unsafe-eval'");
    }

    const contentSecurityPolicy = [
      "default-src 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "style-src 'self' 'unsafe-inline'",
      `script-src ${scriptSrc.join(" ")}`,
      "connect-src 'self'",
      "upgrade-insecure-requests",
    ].join("; ");

    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: contentSecurityPolicy,
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
