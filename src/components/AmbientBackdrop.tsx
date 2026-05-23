export function AmbientBackdrop() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      <div className="hf-blob hf-blob-a" />
      <div className="hf-blob hf-blob-b" />
      <div className="hf-blob hf-blob-c" />
      <div className="hf-blob hf-blob-d" />
      <div className="hf-grain" />
    </div>
  );
}
