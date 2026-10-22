import { describe, expect, it } from "vitest";
import { barcodeVariants, validBarcode } from "./barcode";

describe("validBarcode", () => {
  it("accepts real EAN-13, EAN-8 and UPC-A numbers", () => {
    expect(validBarcode("8402001027482")).toBe(true); // Mercadona olive oil from the sheet
    expect(validBarcode("8402001027475")).toBe(true);
    expect(validBarcode("96385074")).toBe(true);
    expect(validBarcode("036000291452")).toBe(true);
    expect(validBarcode("360002914522")).toBe(true); // what the camera reads for the EAN-13 0360002914522
  });
  it("rejects misreads and wrong lengths", () => {
    expect(validBarcode("8402001027483")).toBe(false);
    expect(validBarcode("84020010274")).toBe(false);
    expect(validBarcode("84020010274x2")).toBe(false);
    expect(validBarcode("")).toBe(false);
  });
});

describe("barcodeVariants", () => {
  it("finds the same product with or without leading zeros", () => {
    expect(barcodeVariants("036000291452")).toEqual(expect.arrayContaining(["036000291452", "36000291452", "0036000291452"]));
    expect(barcodeVariants("0036000291452")).toEqual(expect.arrayContaining(["0036000291452", "036000291452"]));
  });
  it("matches what the camera reports for an EAN-13 that starts with 0", () => {
    expect(barcodeVariants("360002914522")).toContain("0360002914522");
  });
  it("keeps a normal Spanish EAN as it is", () => {
    expect(barcodeVariants("8402001027482")).toEqual(["8402001027482"]);
  });
});
