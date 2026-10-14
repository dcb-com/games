// Bytes go across as-is: the invoice CSV is hashed at issuance (invoice.csvSha256), so altering them here would break that hash.
export function downloadTextFile(
  filename: string,
  content: string,
  type = "text/csv;charset=utf-8",
): void {
  downloadBlob(filename, new Blob([content], { type }));
}

// Binary file sent as base64 (e.g. report PDFs) whose file tokens expire in seconds, so bytes go through the API rather than a link.
export function downloadBase64File(
  filename: string,
  base64: string,
  type = "application/pdf",
): void {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  downloadBlob(filename, new Blob([bytes], { type }));
}

function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
