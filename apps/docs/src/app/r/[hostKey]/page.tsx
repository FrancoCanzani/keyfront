import { ReferencePage } from "@/components/reference-page";
import { fetchReference, getReferencePage } from "@/lib/reference";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { DocsBody, DocsPage } from "fumadocs-ui/page";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ hostKey: string }> };

async function loadReference(hostKey: string) {
  const token = (await cookies()).get(`kf_ref_${hostKey}`)?.value;
  if (!token) return null;
  return fetchReference(hostKey, token);
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { hostKey } = await props.params;
  const reference = await loadReference(hostKey);
  return {
    title: reference ? `${reference.service.name} API reference` : "API reference",
    robots: { index: false },
  };
}

export default async function Page(props: Props) {
  const { hostKey } = await props.params;
  const reference = await loadReference(hostKey);
  if (!reference) {
    return (
      <main className="flex min-h-svh flex-col items-center justify-center gap-2 p-8 text-center">
        <h1 className="text-lg font-medium">This link has expired</h1>
        <p className="text-sm text-fd-muted-foreground">
          Open the reference again from the Keyfront dashboard to get a fresh
          link.
        </p>
      </main>
    );
  }

  const page = await getReferencePage(reference);
  if (!page) notFound();

  return (
    <DocsLayout
      tree={{ name: reference.service.name, children: [] }}
      sidebar={{ enabled: false }}
      nav={{ title: `${reference.service.name} API` }}
    >
      <DocsPage toc={page.toc} full>
        <DocsBody>
          <ReferencePage {...page.getOpenAPIPageProps()} />
        </DocsBody>
      </DocsPage>
    </DocsLayout>
  );
}
