"use client";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

const GlobalError = ({ reset }: Props) => {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: "3rem", textAlign: "center" }}>
        <h1 style={{ fontSize: "1.5rem", marginBottom: "0.75rem" }}>Something went wrong</h1>
        <p style={{ marginBottom: "1.5rem" }}>
          The application could not be loaded. Please try again.
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            background: "#14b8a6",
            color: "#ffffff",
            border: "none",
            borderRadius: "0.5rem",
            padding: "0.6rem 1.4rem",
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
};

export default GlobalError;
