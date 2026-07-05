export function SectionHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <h2 className="m-0 min-w-0 text-xs leading-snug">
      <span className="font-medium text-foreground">{title}.</span>{" "}
      <span className="text-muted-foreground">{description}</span>
    </h2>
  );
}
