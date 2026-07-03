export default function Loading() {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "100vh",
      background: "#0b0f14",
      color: "#e6ebf1",
      fontFamily: "system-ui, sans-serif",
      gap: "16px"
    }}>
      <div style={{
        width: "40px",
        height: "40px",
        border: "3px solid #232b36",
        borderTop: "3px solid #4f8cff",
        borderRadius: "50%",
        animation: "spin 0.8s linear infinite"
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <p style={{ fontSize: "18px", fontWeight: "600" }}>TaskFlow</p>
      <p style={{ fontSize: "14px", color: "#8b96a3" }}>Starting up, please wait a moment...</p>
    </div>
  );
}