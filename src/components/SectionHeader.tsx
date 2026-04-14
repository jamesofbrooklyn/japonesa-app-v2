export default function SectionHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <header className="mb-6">
      <h1 className="text-3xl font-bold text-stone-900 tracking-tight">
        {title}
      </h1>
      {subtitle && (
        <p className="mt-1 text-sm text-stone-500">{subtitle}</p>
      )}
    </header>
  );
}
