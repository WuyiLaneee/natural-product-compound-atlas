import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import ts from "typescript";

function asDataUrl(source) {
  return `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
}

async function transpile(relativePath) {
  const sourceUrl = new URL(relativePath, import.meta.url);
  const source = await readFile(sourceUrl, "utf8");
  return ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: sourceUrl.pathname,
  }).outputText;
}

async function importPubChemModule() {
  const commonUrl = asDataUrl(
    await transpile("../lib/evidence/sources/common.ts"),
  );
  const pubchemSource = await transpile(
    "../lib/evidence/sources/pubchem.ts",
  );
  const linkedSource = pubchemSource.replace(
    /from\s+["']\.\/common["'];/,
    `from ${JSON.stringify(commonUrl)};`,
  );
  assert.notEqual(linkedSource, pubchemSource, "PubChem common import was linked");
  return import(asDataUrl(linkedSource));
}

const pubchem = await importPubChemModule();

function propertyFetch(property) {
  return async (input) => {
    const url = String(input);
    assert.match(url, new RegExp(`/compound/cid/${property.CID}/property/`));
    for (const field of [
      "IUPACName",
      "Charge",
      "CovalentUnitCount",
      "DefinedAtomStereoCount",
      "UndefinedAtomStereoCount",
    ]) {
      assert.match(url, new RegExp(field));
    }
    return new Response(
      JSON.stringify({ PropertyTable: { Properties: [property] } }),
      { headers: { "content-type": "application/json" } },
    );
  };
}

test("PubChem CID 5234 preserves salt entity metadata", async () => {
  const resolution = await pubchem.resolvePubChemCompound("5234", {
    fetchImpl: propertyFetch({
      CID: 5234,
      Title: "Sodium Chloride",
      IUPACName: "sodium chloride",
      MolecularFormula: "ClNa",
      MolecularWeight: "58.44",
      Charge: 0,
      CovalentUnitCount: 2,
      DefinedAtomStereoCount: 0,
      UndefinedAtomStereoCount: 0,
      ConnectivitySMILES: "[Na+].[Cl-]",
      SMILES: "[Na+].[Cl-]",
      InChI: "InChI=1S/ClH.Na/h1H;/q;+1/p-1",
      InChIKey: "FAPWRFPIFSIZLT-UHFFFAOYSA-M",
    }),
  });

  assert.equal(resolution.status, "resolved");
  assert.equal(resolution.selected.iupacName, "sodium chloride");
  assert.equal(resolution.selected.charge, 0);
  assert.equal(resolution.selected.covalentUnitCount, 2);
  assert.equal(resolution.selected.definedAtomStereoCount, 0);
  assert.equal(resolution.selected.undefinedAtomStereoCount, 0);
  assert.equal(pubchem.isMultiComponentCompound(resolution.selected), true);
  assert.match(pubchem.buildPubChemEntityNote(resolution.selected), /2 个共价单元/);
  assert.match(pubchem.buildPubChemEntityNote(resolution.selected), /盐/);
});

test("ordinary single-component PubChem records are not marked multi-component", async () => {
  const resolution = await pubchem.resolvePubChemCompound("2244", {
    fetchImpl: propertyFetch({
      CID: 2244,
      Title: "Aspirin",
      IUPACName: "2-acetyloxybenzoic acid",
      MolecularFormula: "C9H8O4",
      MolecularWeight: 180.16,
      Charge: "0",
      CovalentUnitCount: "1",
      DefinedAtomStereoCount: "0",
      UndefinedAtomStereoCount: "0",
      ConnectivitySMILES: "CC(=O)OC1=CC=CC=C1C(=O)O",
      SMILES: "CC(=O)OC1=CC=CC=C1C(=O)O",
      InChIKey: "BSYNRYMUTXBXSQ-UHFFFAOYSA-N",
    }),
  });

  assert.equal(resolution.status, "resolved");
  assert.equal(resolution.selected.iupacName, "2-acetyloxybenzoic acid");
  assert.equal(resolution.selected.covalentUnitCount, 1);
  assert.equal(pubchem.isMultiComponentCompound(resolution.selected), false);
  assert.equal(pubchem.buildPubChemEntityNote(resolution.selected), undefined);
});

test("dot-separated SMILES remains a fallback for older cached entities", () => {
  const legacyEntity = {
    canonicalSmiles: "CC(=O)[O-].[Na+]",
  };
  assert.equal(pubchem.isMultiComponentCompound(legacyEntity), true);
  assert.match(pubchem.buildPubChemEntityNote(legacyEntity), /多个共价单元/);
});
