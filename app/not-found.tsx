import Link from "next/link";

const SORA = "'Sora', system-ui, sans-serif";
const JAKARTA = "'Plus Jakarta Sans', system-ui, sans-serif";

export default function NotFound() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "24px",
        color: "#F5F6F8",
        fontFamily: JAKARTA,
      }}
    >
      <span
        style={{
          fontFamily: SORA,
          fontWeight: 800,
          fontSize: 26,
          letterSpacing: "-0.04em",
          background: "linear-gradient(135deg, #fff, #FF5A36)",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          WebkitTextFillColor: "transparent",
          marginBottom: 32,
        }}
      >
        KORE
      </span>

      <p
        style={{
          fontFamily: SORA,
          fontSize: 72,
          fontWeight: 800,
          lineHeight: 1,
          background: "linear-gradient(135deg, #FF5A36, #FF8A3D)",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          WebkitTextFillColor: "transparent",
          marginBottom: 16,
        }}
      >
        404
      </p>

      <h1 style={{ fontFamily: SORA, fontSize: 24, fontWeight: 700, marginBottom: 12 }}>
        Página não encontrada
      </h1>

      <p
        style={{
          color: "#9AA0AD",
          fontSize: 15,
          lineHeight: 1.6,
          maxWidth: 420,
          marginBottom: 28,
        }}
      >
        A página que você procura não existe ou foi movida. Vamos te levar de
        volta ao seu time.
      </p>

      <Link
        href="/"
        style={{
          display: "inline-block",
          background: "linear-gradient(135deg, #FF5A36, #FF8A3D)",
          color: "#fff",
          fontWeight: 700,
          fontFamily: JAKARTA,
          fontSize: 14,
          padding: "12px 24px",
          borderRadius: 14,
          textDecoration: "none",
          boxShadow: "0 8px 28px rgba(255,90,54,0.4)",
        }}
      >
        Voltar ao início
      </Link>
    </main>
  );
}
