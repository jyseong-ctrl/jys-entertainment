import { NextRequest, NextResponse } from "next/server";
import { defaultTargetSpeciesKeys, fetchOrthologs, submitClustalOmega, type SpeciesInfo } from "../../../../lib/msa";

export const runtime = "nodejs";
export const maxDuration = 60;

type RequestBody = {
  gene?: string;
  email?: string;
  species?: Array<string | SpeciesInfo>;
};

function normalizeQuery(gene: string) {
  return gene.trim().replace(/\s+/g, " ");
}

export async function POST(request: NextRequest) {
  const start = Date.now();

  try {
    const body = (await request.json()) as RequestBody;
    const gene = normalizeQuery(body.gene ?? "");
    const email = body.email?.trim() || "anonymous@example.com";
    const species = body.species?.length ? body.species : defaultTargetSpeciesKeys();

    if (!gene) {
      return NextResponse.json({ error: "Human gene, protein name, or Ensembl ID is required. Example: TP53, tumor protein p53, ENSG00000141510" }, { status: 400 });
    }

    const orthologResult = await fetchOrthologs(gene, species);
    const jobId = await submitClustalOmega(orthologResult.fasta, email);
    const resolvedGene = orthologResult.resolvedQuery.symbol || orthologResult.resolvedQuery.geneId;

    return NextResponse.json({
      gene: resolvedGene,
      submittedQuery: gene,
      geneId: orthologResult.resolvedQuery.geneId,
      matchedBy: orthologResult.resolvedQuery.matchedBy,
      email,
      elapsedSeconds: Math.round((Date.now() - start) / 100) / 10,
      ensemblUrl: orthologResult.ensemblUrl,
      ensemblUrls: orthologResult.ensemblUrls,
      clustalJobId: jobId,
      records: orthologResult.records,
      missing: orthologResult.missing,
      fasta: orthologResult.fasta
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
