export type CsvRow = Record<string, string>;

function normalizeHeader(value: string) {
  return value
    .replace(/^\uFEFF/, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function detectDelimiter(text: string) {
  let quoted = false;
  const counts: Record<string, number> = { ",": 0, ";": 0, "\t": 0 };

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (char === '"') {
      if (quoted && text[index + 1] === '"') {
        index += 1;
        continue;
      }
      quoted = !quoted;
      continue;
    }

    if (!quoted && (char === "\n" || char === "\r")) break;
    if (!quoted && Object.prototype.hasOwnProperty.call(counts, char)) counts[char] += 1;
  }

  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || ",";
}

export function parseCsv(text: string) {
  const source = text.replace(/^\uFEFF/, "");
  const delimiter = detectDelimiter(source);
  const matrix: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];

    if (char === '"') {
      if (quoted && source[index + 1] === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (!quoted && char === delimiter) {
      row.push(field.trim());
      field = "";
      continue;
    }

    if (!quoted && (char === "\n" || char === "\r")) {
      if (char === "\r" && source[index + 1] === "\n") index += 1;
      row.push(field.trim());
      field = "";
      if (row.some((cell) => cell.length > 0)) matrix.push(row);
      row = [];
      continue;
    }

    field += char;
  }

  if (quoted) throw new Error("El CSV tiene comillas sin cerrar.");

  row.push(field.trim());
  if (row.some((cell) => cell.length > 0)) matrix.push(row);

  if (matrix.length < 2) throw new Error("El CSV debe tener encabezados y al menos una fila de datos.");

  const headers = matrix[0].map(normalizeHeader);
  if (headers.some((header) => !header)) throw new Error("Hay una columna sin nombre en el encabezado.");
  if (new Set(headers).size !== headers.length) throw new Error("Hay columnas duplicadas en el encabezado.");

  const rows: CsvRow[] = matrix.slice(1).map((cells) => {
    const result: CsvRow = {};
    headers.forEach((header, index) => {
      result[header] = (cells[index] || "").trim();
    });
    return result;
  });

  return { headers, rows, delimiter };
}

export function pick(row: CsvRow, aliases: string[]) {
  for (const alias of aliases) {
    const normalized = normalizeHeader(alias);
    if (row[normalized] !== undefined && row[normalized] !== "") return row[normalized];
  }
  return "";
}

export function normalizePhone(value: string) {
  return value.replace(/\D/g, "");
}

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function parseFlexibleNumber(value: string) {
  const raw = value.trim();
  if (!raw) return null;

  let normalized = raw.replace(/[^0-9,.-]/g, "");
  if (!normalized) return null;

  const lastComma = normalized.lastIndexOf(",");
  const lastDot = normalized.lastIndexOf(".");

  if (lastComma >= 0 && lastDot >= 0) {
    const decimalSeparator = lastComma > lastDot ? "," : ".";
    const thousandSeparator = decimalSeparator === "," ? "." : ",";
    normalized = normalized.split(thousandSeparator).join("");
    normalized = normalized.replace(decimalSeparator, ".");
  } else if (lastComma >= 0) {
    const decimals = normalized.length - lastComma - 1;
    normalized = decimals === 3 ? normalized.replace(/,/g, "") : normalized.replace(",", ".");
  } else if (lastDot >= 0) {
    const decimals = normalized.length - lastDot - 1;
    if (decimals === 3) normalized = normalized.replace(/\./g, "");
  }

  const result = Number(normalized);
  return Number.isFinite(result) ? result : null;
}
