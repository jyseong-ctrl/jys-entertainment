# Ensembl Cross-species Protein MSA

Next.js/Vercel app for fetching human-reference ortholog amino acid sequences from Ensembl and running EMBL-EBI Clustal Omega multiple sequence alignment.

## Features

- Human is fixed as the reference sequence.
- Default target species: Mus musculus, Gallus gallus, Anolis carolinensis, Xenopus tropicalis, Latimeria chalumnae.
- Additional species can be searched from the Ensembl species catalog.
- Human query accepts gene symbols, protein descriptions, Ensembl gene IDs, transcript IDs, and protein IDs.
- One-character gene search suggestions are generated from the Ensembl human gene search API, with BioMart fallback.
- Ortholog hits are grouped by human source protein isoform, then the best conserved isoform group is selected by orthology type and percent identity.
- Alignment Viewer uses scientific species names.
- Results include FASTA download, Clustal alignment download, and identity versus human.

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000` and search examples such as `TP53`, `tumor protein p53`, `ENSG00000141510`, or `ENSP00000269305`.

## API

```text
app/api/search/route.ts
  Returns human gene suggestions from Ensembl human gene search data.

app/api/species/route.ts
  Loads Ensembl divisions and species catalog data.

app/api/msa/submit/route.ts
  Resolves the human query, fetches ortholog protein sequences, and submits a Clustal Omega job.

app/api/msa/status/[jobId]/route.ts
  Polls Clustal Omega and returns alignment plus identity summary when finished.

app/api/msa/route.ts
  Compatibility endpoint that waits for the Clustal Omega job in a single request.
```

## Notes

- Ensembl REST is used for exact lookup, ID resolution, and homology queries.
- Ensembl beta gene search is used for fast user-facing human gene suggestions, with BioMart as fallback.
- EBI Clustal Omega requires an email value when submitting jobs.
