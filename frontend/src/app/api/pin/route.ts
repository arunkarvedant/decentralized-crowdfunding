import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    const pinataJwt = process.env.PINATA_JWT?.trim();

    // 1. Handling File Upload (multipart/form-data)
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file");

      if (!file || !(file instanceof Blob)) {
        return NextResponse.json(
          { error: "No file provided in form-data field 'file'" },
          { status: 400 }
        );
      }

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `File size exceeds 5MB limit (${(file.size / (1024 * 1024)).toFixed(2)} MB)` },
          { status: 400 }
        );
      }

      if (file.type && !ALLOWED_MIME_TYPES.has(file.type)) {
        return NextResponse.json(
          { error: `Unsupported file type: ${file.type}. Allowed: JPEG, PNG, WebP, GIF.` },
          { status: 400 }
        );
      }

      const fileBuffer = Buffer.from(await file.arrayBuffer());

      // If PINATA_JWT is configured, pin directly to IPFS
      if (pinataJwt) {
        const pinataFormData = new FormData();
        const blob = new Blob([fileBuffer], { type: file.type || "application/octet-stream" });
        pinataFormData.append("file", blob, (file as File).name || "cover-image");

        const pinataRes = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${pinataJwt}`,
          },
          body: pinataFormData,
        });

        if (!pinataRes.ok) {
          const errText = await pinataRes.text();
          console.error("Pinata file pinning failed:", errText);
          return NextResponse.json(
            { error: `Pinata API upload failed: ${pinataRes.statusText}` },
            { status: pinataRes.status }
          );
        }

        const data = (await pinataRes.json()) as { IpfsHash: string };
        return NextResponse.json({
          cid: `ipfs://${data.IpfsHash}`,
          hash: data.IpfsHash,
          url: `https://gateway.pinata.cloud/ipfs/${data.IpfsHash}`,
        });
      }

      // Fallback: Local dev mode when PINATA_JWT is not set
      // Generate deterministic mock CID from SHA256 of file buffer
      const hash = crypto.createHash("sha256").update(fileBuffer).digest("hex");
      const mockCid = `bafybei${hash.slice(0, 52)}`;
      const mime = file.type || "image/png";
      const base64Data = `data:${mime};base64,${fileBuffer.toString("base64")}`;

      return NextResponse.json({
        cid: `ipfs://${mockCid}`,
        hash: mockCid,
        url: base64Data, // Data URL allows local rendering without external gateway
        isLocalFallback: true,
      });
    }

    // 2. Handling JSON Metadata (application/json)
    if (contentType.includes("application/json")) {
      const metadata = await req.json();

      if (!metadata || typeof metadata !== "object") {
        return NextResponse.json(
          { error: "Invalid metadata payload. JSON object expected." },
          { status: 400 }
        );
      }

      const jsonStr = JSON.stringify(metadata);

      if (pinataJwt) {
        const pinataRes = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${pinataJwt}`,
          },
          body: JSON.stringify({
            pinataContent: metadata,
            pinataMetadata: {
              name: `crowdr-campaign-${Date.now()}`,
            },
          }),
        });

        if (!pinataRes.ok) {
          const errText = await pinataRes.text();
          console.error("Pinata JSON pinning failed:", errText);
          return NextResponse.json(
            { error: `Pinata API JSON upload failed: ${pinataRes.statusText}` },
            { status: pinataRes.status }
          );
        }

        const data = (await pinataRes.json()) as { IpfsHash: string };
        return NextResponse.json({
          cid: `ipfs://${data.IpfsHash}`,
          hash: data.IpfsHash,
          url: `https://gateway.pinata.cloud/ipfs/${data.IpfsHash}`,
        });
      }

      // Fallback: Local dev mode when PINATA_JWT is not set
      const hash = crypto.createHash("sha256").update(jsonStr).digest("hex");
      const mockCid = `bafybei${hash.slice(0, 52)}`;
      const dataUrl = `data:application/json;base64,${Buffer.from(jsonStr).toString("base64")}`;

      return NextResponse.json({
        cid: `ipfs://${mockCid}`,
        hash: mockCid,
        url: dataUrl,
        isLocalFallback: true,
      });
    }

    return NextResponse.json(
      { error: "Unsupported Content-Type. Expected multipart/form-data or application/json" },
      { status: 415 }
    );
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : "Internal Server Error";
    console.error("Pinning route error:", error);
    return NextResponse.json({ error: errMessage }, { status: 500 });
  }
}
