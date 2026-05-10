export default function Snippet({ html }) {
  return (
    <p
      className="snippet text-sm leading-relaxed text-slate-700"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
