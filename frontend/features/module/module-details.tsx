export function ModuleDetails({ text }: { text: string }) {
  return (
    <section className="flex flex-col gap-2.5 rounded bg-[rgba(149,149,131,0.05)] p-4">
      <h2 className="font-display text-sm font-semibold leading-6 text-ink-subtle">
        About this module
      </h2>
      <p className="font-display text-sm leading-6 text-ink-subtle">{text}</p>
    </section>
  );
}
