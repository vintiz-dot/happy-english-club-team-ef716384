import { describe, expect, test } from "bun:test";
import { isShrinkablePhoto, jpegName, shrinkTarget } from "../src/lib/shrinkPhoto";

describe("shrinkTarget", () => {
  test("caps the long edge at 2000, keeping the shape", () => {
    expect(shrinkTarget(4032, 3024)).toEqual({ width: 2000, height: 1500 });
    expect(shrinkTarget(3024, 4032)).toEqual({ width: 1500, height: 2000 });
  });
  test("never enlarges", () => {
    expect(shrinkTarget(800, 600)).toEqual({ width: 800, height: 600 });
  });
  test("survives a zero-size image", () => {
    expect(shrinkTarget(0, 0)).toEqual({ width: 1, height: 1 });
  });
});

describe("isShrinkablePhoto", () => {
  test("big JPEG, PNG and WebP photos are shrunk", () => {
    for (const t of ["image/jpeg", "image/png", "image/webp"]) expect(isShrinkablePhoto(t, 3_000_000)).toBe(true);
  });
  test("small photos, PDFs, audio, HEIC and GIF pass through", () => {
    expect(isShrinkablePhoto("image/jpeg", 200_000)).toBe(false);
    for (const t of ["application/pdf", "audio/mpeg", "image/heic", "image/gif", ""]) expect(isShrinkablePhoto(t, 3_000_000)).toBe(false);
  });
});

describe("jpegName", () => {
  test("swaps the extension for .jpg", () => {
    expect(jpegName("IMG_1234.PNG")).toBe("IMG_1234.jpg");
    expect(jpegName("worksheet.page1.jpeg")).toBe("worksheet.page1.jpg");
    expect(jpegName("noext")).toBe("noext.jpg");
    expect(jpegName(".png")).toBe("photo.jpg");
  });
});
