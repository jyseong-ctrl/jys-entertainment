import { NextRequest, NextResponse } from "next/server";
import { getClustalOmegaAlignment, getClustalOmegaStatus, parseClustal, summarizeIdentity } from "../../../../../lib/msa";

export const runtime = "nodejs";
export const maxDuration = 60;

const JOB_ID_PATTERN = /^clustalo-[A-Za-z0-9-]+$/;

export async function GET(_request: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  try {
    const { jobId } = await params;
    if (!JOB_ID_PATTERN.test(jobId)) {
      return NextResponse.json({ error: "Invalid Clustal Omega job id." }, { status: 400 });
    }

    const status = await getClustalOmegaStatus(jobId);
    if (status !== "FINISHED") {
      return NextResponse.json({ status, clustalJobId: jobId });
    }

    const alignment = await getClustalOmegaAlignment(jobId);
    const aligned = parseClustal(alignment);
    const identity = summarizeIdentity(aligned);

    return NextResponse.json({
      status,
      clustalJobId: jobId,
      alignment,
      identity
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
