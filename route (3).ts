import { NextRequest, NextResponse } from "next/server";
import {
  defaultTargetSpeciesKeys,
  fetchOrthologs,
  getClustalOmegaAlignment,
  getClustalOmegaStatus,
  parseClustal,
  submitClustalOmega,
  summarizeIdentity,
  type SpeciesInfo
} from "../../../lib/msa";

export const runtime = "nodejs";
export const maxDuration = 300;

type RequestBody = {
  gene?: string;
  email?: string;
  species?: Array<string | SpeciesInfo>;
};

const POLL_INTERVAL_MS = 3_000;

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

    const started = Date.now();
    while (Date.now() - started < 270_000) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      const status = await getClustalOmegaStatus(jobId);
      if (status === "FINISHED") {
        const alignment = await getClustalOmegaAlignment(jobId);
        const aligned = parseClustal(alignment);
        const identity = summarizeIdentity(aligned);

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
          fasta: orthologResult.fasta,
          alignment,
          identity
        });
      }

      if (["ERROR", "FAILURE", "NOT_FOUND"].includes(status)) {
        throw new Error(`Clustal Omega job failed. status=${status}, job=${jobId}`);
      }
    }

    throw new Error(`Clustal Omega job timed out on this serverless request. job=${jobId}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
