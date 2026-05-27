const hasDOM = typeof document !== "undefined";
const inputCode = hasDOM ? document.querySelector("#inputCode") : null;
const outputCode = hasDOM ? document.querySelector("#outputCode") : null;
const languageSelect = hasDOM ? document.querySelector("#languageSelect") : null;
const presetSelect = hasDOM ? document.querySelector("#presetSelect") : null;
const compatToggle = hasDOM ? document.querySelector("#compatToggle") : null;
const robloxToggle = hasDOM ? document.querySelector("#robloxToggle") : null;
const bannerToggle = hasDOM ? document.querySelector("#bannerToggle") : null;
const obfuscateBtn = hasDOM ? document.querySelector("#obfuscateBtn") : null;
const sampleBtn = hasDOM ? document.querySelector("#sampleBtn") : null;
const clearBtn = hasDOM ? document.querySelector("#clearBtn") : null;
const pasteBtn = hasDOM ? document.querySelector("#pasteBtn") : null;
const copyBtn = hasDOM ? document.querySelector("#copyBtn") : null;
const downloadBtn = hasDOM ? document.querySelector("#downloadBtn") : null;
const previewPill = hasDOM ? document.querySelector("#previewPill") : null;
const statusPill = hasDOM ? document.querySelector("#statusPill") : null;
const inputBytes = hasDOM ? document.querySelector("#inputBytes") : null;
const outputBytes = hasDOM ? document.querySelector("#outputBytes") : null;
const ratioValue = hasDOM ? document.querySelector("#ratioValue") : null;
const lineCount = hasDOM ? document.querySelector("#lineCount") : null;
const canvas = hasDOM ? document.querySelector("#signalCanvas") : null;
const ctx = canvas ? canvas.getContext("2d") : null;

const translations = {
  id: {
    languageLabel: "Bahasa",
    ready: "Siap",
    processKicker: "Proses tetap",
    processDescription: "Kode Lua dipadatkan ke register-based VM acak dengan opcode polymorphism, instruction mutation, nested dispatch VM, dynamic handler switching, rolling cipher, dan anti-memory dump cleanup.",
    presetLabel: "Level kilau",
    compatLabel: "Loader Lua 5.1+",
    robloxLabel: "Mode Roblox/Luau",
    bannerLabel: "Tambahkan header",
    ratioLabel: "Rasio",
    linesLabel: "Baris",
    obfuscateButton: "Obfuscate Sekarang",
    sampleButton: "Contoh",
    clearButton: "Bersihkan",
    inputTitle: "Kode Lua",
    pasteButton: "Tempel",
    inputPlaceholder: "Tulis atau tempel kode Lua di sini...",
    outputTitle: "Hasil Axiom VM",
    copyButton: "Salin",
    downloadButton: "Unduh",
    outputPlaceholder: "Hasil Axiom VM akan muncul di sini...",
    emptyInput: "Masukkan kode Lua",
    processing: "Memproses di background",
    encodingStrings: "Encode string table",
    encodingPayload: "Encode payload",
    buildingVm: "Bangun VM",
    generatingOutput: "Generate output",
    tooLargeForPreset: "Kode terlalu besar untuk preset ini",
    done: "Axiom VM selesai",
    failed: "Gagal memproses kode",
    noOutput: "Belum ada hasil",
    copied: "Disalin",
    pasted: "Kode ditempel",
    pasteDenied: "Browser menolak paste",
    downloaded: "File dibuat",
    sampleLoaded: "Contoh dimuat",
    cleared: "Dibersihkan",
  },
  en: {
    languageLabel: "Language",
    ready: "Ready",
    processKicker: "Fixed process",
    processDescription: "Lua code is packed into a randomized register-based VM with opcode polymorphism, instruction mutation, nested dispatch VM, dynamic handler switching, rolling ciphers, and anti-memory-dump cleanup.",
    presetLabel: "Shine level",
    compatLabel: "Lua 5.1+ loader",
    robloxLabel: "Roblox/Luau mode",
    bannerLabel: "Add header",
    ratioLabel: "Ratio",
    linesLabel: "Lines",
    obfuscateButton: "Obfuscate Now",
    sampleButton: "Sample",
    clearButton: "Clear",
    inputTitle: "Lua Code",
    pasteButton: "Paste",
    inputPlaceholder: "Write or paste Lua code here...",
    outputTitle: "Axiom VM Output",
    copyButton: "Copy",
    downloadButton: "Download",
    outputPlaceholder: "Axiom VM output will appear here...",
    emptyInput: "Enter Lua code",
    processing: "Processing in background",
    encodingStrings: "Encoding string table",
    encodingPayload: "Encoding payload",
    buildingVm: "Building VM",
    generatingOutput: "Generating output",
    tooLargeForPreset: "Code is too large for this preset",
    done: "Axiom VM complete",
    failed: "Failed to process code",
    noOutput: "No output yet",
    copied: "Copied",
    pasted: "Code pasted",
    pasteDenied: "Browser blocked paste",
    downloaded: "File created",
    sampleLoaded: "Sample loaded",
    cleared: "Cleared",
  },
};

let currentLanguage = "id";
let currentStatusKey = "ready";
let currentStatusType = "ok";
let fullOutputValue = "";
let obfuscationWorker = null;
let obfuscationJob = 0;
let workerBusy = false;

const OUTPUT_PREVIEW_HEAD = 90000;
const OUTPUT_PREVIEW_TAIL = 12000;
const OUTPUT_PREVIEW_LIMIT = OUTPUT_PREVIEW_HEAD + OUTPUT_PREVIEW_TAIL;

const PRESET_LIMITS = {
  compact: 2000000,
  balanced: 1000000,
  heavy: 500000,
  god: 200000,
};

const SAMPLE_CODE = `-- contoh Lua
local playerName = "Nara"
local coins = 125

local function reward(amount)
  coins = coins + amount
  print(playerName .. " mendapat " .. amount .. " koin")
end

for i = 1, 3 do
  reward(i * 10)
end

print("Total:", coins)`;

const encoder = new TextEncoder();
const runtimeStringTableCache = new Map();

const PRESET_PROFILES = {
  compact: {
    chunkRange: [50, 82],
    perLine: 24,
    layers: 1,
    numericArmor: false,
    decoyRatio: 0,
    phantomRatio: 0,
  },
  balanced: {
    chunkRange: [24, 46],
    perLine: 16,
    layers: 1,
    numericArmor: false,
    decoyRatio: 0.08,
    phantomRatio: 0.12,
  },
  heavy: {
    chunkRange: [14, 28],
    perLine: 12,
    layers: 1,
    numericArmor: true,
    decoyRatio: 0.16,
    phantomRatio: 0.22,
  },
  god: {
    chunkRange: [8, 16],
    perLine: 10,
    layers: 2,
    numericArmor: true,
    decoyRatio: 0.22,
    phantomRatio: 0.3,
  },
};

function presetProfile(preset) {
  return PRESET_PROFILES[preset] || PRESET_PROFILES.balanced;
}

function installGodPreset() {
  if (!presetSelect.querySelector('option[value="god"]')) {
    const option = document.createElement("option");
    option.value = "god";
    option.textContent = "Axiom Max VM";
    presetSelect.appendChild(option);
  }

  if (!presetSelect.value) presetSelect.value = "balanced";
}

function translate(key) {
  return translations[currentLanguage][key] || translations.id[key] || key;
}

function setStatus(key, type = "ok") {
  currentStatusKey = key;
  currentStatusType = type;
  statusPill.textContent = translate(key);
  statusPill.classList.toggle("error", type === "error");
}

function setProgressStatus(key, progress = 0) {
  currentStatusKey = "processing";
  currentStatusType = "ok";
  statusPill.textContent = `${translate(key)} ${Math.max(0, Math.min(99, Math.round(progress)))}%`;
  statusPill.classList.remove("error");
}

function applyLanguage(language) {
  currentLanguage = language;
  document.documentElement.lang = language;

  document.querySelectorAll("[data-i18n]").forEach((element) => {
    element.textContent = translate(element.dataset.i18n);
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
    element.placeholder = translate(element.dataset.i18nPlaceholder);
  });

  languageSelect.setAttribute(
    "aria-label",
    language === "id" ? "Pilih bahasa" : "Choose language",
  );
  setStatus(currentStatusKey, currentStatusType);
}

function byteLength(value) {
  return encoder.encode(value).length;
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function currentOutputValue() {
  return fullOutputValue || outputCode.value;
}

function previewOutput(value) {
  if (value.length <= OUTPUT_PREVIEW_LIMIT) return value;

  const hidden = value.length - OUTPUT_PREVIEW_HEAD - OUTPUT_PREVIEW_TAIL;
  return [
    value.slice(0, OUTPUT_PREVIEW_HEAD),
    "",
    `-- [[ Preview dipotong supaya browser tetap ringan. ${hidden.toLocaleString()} karakter disembunyikan di tampilan ini. Salin/Unduh tetap memakai output full: ${formatBytes(byteLength(value))}. ]]`,
    "",
    value.slice(-OUTPUT_PREVIEW_TAIL),
  ].join("\n");
}

function setOutputValue(value, options = {}) {
  const isPreview = value.length > OUTPUT_PREVIEW_LIMIT && !options.error;
  fullOutputValue = options.error ? "" : value;
  outputCode.value = isPreview ? previewOutput(value) : value;
  outputCode.classList.toggle("is-preview", isPreview);

  if (previewPill) {
    previewPill.hidden = !isPreview;
    previewPill.textContent = isPreview ? `Preview ${formatBytes(byteLength(value))}` : "Preview";
  }

  updateStats();
}

function clearOutputValue() {
  fullOutputValue = "";
  outputCode.value = "";
  outputCode.classList.remove("is-preview");
  if (previewPill) previewPill.hidden = true;
  updateStats();
}

function updateStats() {
  const inputSize = byteLength(inputCode.value);
  const outputSize = byteLength(currentOutputValue());
  const lines = inputCode.value ? inputCode.value.split(/\r\n|\r|\n/).length : 0;
  const ratio = inputSize ? Math.round((outputSize / inputSize) * 100) : 0;

  inputBytes.textContent = formatBytes(inputSize);
  outputBytes.textContent = formatBytes(outputSize);
  ratioValue.textContent = `${ratio}%`;
  lineCount.textContent = String(lines);
}

function longBracketInfo(source, index) {
  if (source[index] !== "[") return null;
  let cursor = index + 1;
  while (source[cursor] === "=") cursor += 1;
  if (source[cursor] !== "[") return null;
  const equals = source.slice(index + 1, cursor);
  return {
    openLength: equals.length + 2,
    close: `]${equals}]`,
  };
}

function skipLongBracket(source, index) {
  const info = longBracketInfo(source, index);
  if (!info) return null;
  const start = index + info.openLength;
  const end = source.indexOf(info.close, start);
  const closeEnd = end === -1 ? source.length : end + info.close.length;
  return {
    text: source.slice(index, closeEnd),
    nextIndex: closeEnd,
  };
}

function minifyLua(source) {
  let output = "";
  let i = 0;

  while (i < source.length) {
    const char = source[i];
    const next = source[i + 1];

    if (char === "-" && next === "-") {
      const blockStart = longBracketInfo(source, i + 2);
      if (blockStart) {
        const skipped = skipLongBracket(source, i + 2);
        const commentText = source.slice(i, skipped ? skipped.nextIndex : source.length);
        output += commentText.match(/\r\n|\r|\n/g)?.join("") || " ";
        i = skipped ? skipped.nextIndex : source.length;
      } else {
        const lineEnd = source.indexOf("\n", i + 2);
        if (lineEnd === -1) {
          output += " ";
          i = source.length;
        } else {
          output += "\n";
          i = lineEnd + 1;
        }
      }
      continue;
    }

    if (char === '"' || char === "'") {
      const quote = char;
      output += char;
      i += 1;
      while (i < source.length) {
        output += source[i];
        if (source[i] === "\\") {
          i += 1;
          if (i < source.length) output += source[i];
        } else if (source[i] === quote) {
          i += 1;
          break;
        }
        i += 1;
      }
      continue;
    }

    if (char === "[") {
      const longString = skipLongBracket(source, i);
      if (longString) {
        output += longString.text;
        i = longString.nextIndex;
        continue;
      }
    }

    output += char;
    i += 1;
  }

  return output
    .replace(/^\uFEFF/, "")
    .trim();
}

function randomName() {
  const hex = "0123456789abcdef";
  const alpha = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const style = randomInt(0, 2);

  if (style === 0) {
    let name = "_0x";
    for (let i = 0; i < randomInt(7, 13); i += 1) name += hex[randomInt(0, hex.length - 1)];
    return name;
  }

  if (style === 1) {
    let name = alpha[randomInt(0, alpha.length - 1)];
    const glyphs = ["l", "I", "O", "0", "_"];
    for (let i = 0; i < randomInt(9, 15); i += 1) name += glyphs[randomInt(0, glyphs.length - 1)];
    return name.replace(/0/g, "O");
  }

  let name = "__";
  for (let i = 0; i < randomInt(10, 18); i += 1) {
    name += i % 3 === 0 ? "_" : hex[randomInt(0, hex.length - 1)];
  }
  return name;
}

function randomNames(count) {
  const names = new Set();
  while (names.size < count) names.add(randomName());
  return [...names];
}

function randomInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function gcd(a, b) {
  let x = Math.abs(a);
  let y = Math.abs(b);

  while (y) {
    const next = x % y;
    x = y;
    y = next;
  }

  return x || 1;
}

function modInverse256(value) {
  for (let candidate = 1; candidate < 256; candidate += 2) {
    if ((value * candidate) % 256 === 1) return candidate;
  }

  return 1;
}

function randomOddByte() {
  return randomInt(1, 127) * 2 - 1;
}

function randomStride(length) {
  if (length <= 1) return 1;
  let stride = randomInt(2, Math.max(2, length - 1));
  let attempts = 0;

  while (gcd(stride, length) !== 1 && attempts < 64) {
    stride = randomInt(2, Math.max(2, length - 1));
    attempts += 1;
  }

  return gcd(stride, length) === 1 ? stride : 1;
}

function luaNumber(value, armored = false, chance = 1) {
  if (!armored || Math.random() > chance) return String(value);

  const pad = randomInt(9, 91);
  const scale = randomInt(2, 9);
  const mask = randomInt(37, 199);
  const style = randomInt(0, 5);

  if (style === 0) return `(${value + pad}-${pad})`;
  if (style === 1) return `((${value * scale})/${scale})`;
  if (style === 2) return `(${value + pad + scale}-${pad}-${scale})`;
  if (style === 3) return `(((${value + pad})-${scale})-(${pad}-${scale}))`;
  if (style === 4) return `(((${value + mask})%${mask})+${Math.floor(value / mask) * mask})`;
  return `(((${value + pad})*${scale}-${pad * scale})/${scale})`;
}

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function checksumNumbers(numbers, salt) {
  return numbers.reduce((hash, value, index) => {
    return (hash + value * (index + 1 + salt) + salt) % 65535;
  }, 0);
}

function randomBytes(length) {
  return Array.from({ length }, () => randomInt(0, 255));
}

function chunkNumbers(numbers, perLine = 16, numericArmor = false) {
  const lines = [];
  for (let i = 0; i < numbers.length; i += perLine) {
    lines.push(
      numbers
        .slice(i, i + perLine)
        .map((value) => luaNumber(value, numericArmor, 0.18))
        .join(","),
    );
  }
  return lines.join(",\n");
}

function splitBytes(bytes, preset) {
  const [min, max] = presetProfile(preset).chunkRange;
  const chunks = [];
  let cursor = 0;

  while (cursor < bytes.length) {
    const size = randomInt(min, max);
    chunks.push(bytes.slice(cursor, cursor + size));
    cursor += size;
  }

  return chunks;
}

function decoyChunkBytes(preset) {
  const [min, max] = presetProfile(preset).chunkRange;
  const fakeSnippets = [
    "local _=function(...) return ... end",
    "return function() return nil end",
    "if false then error('tamper') end",
    "local function _0x() return tostring({}) end",
  ];

  if (Math.random() > 0.42) {
    return [...encoder.encode(fakeSnippets[randomInt(0, fakeSnippets.length - 1)])];
  }

  return randomBytes(randomInt(min, Math.max(min, max * 2)));
}

function addDecoyChunks(realChunks, preset) {
  const profile = presetProfile(preset);
  const ratio = profile.decoyRatio || 0;

  if (ratio <= 0 || realChunks.length === 0) return realChunks;

  const decoyCount = Math.min(240, Math.ceil(realChunks.length * ratio) + randomInt(1, 5));
  const decoys = Array.from({ length: decoyCount }, () => encodeChunk(decoyChunkBytes(preset)));

  return realChunks.concat(decoys);
}

function encodeChunk(bytes) {
  const salt = randomInt(7, 251);
  const key = randomInt(1, 255);
  const multiplier = randomOddByte();
  const inverse = modInverse256(multiplier);
  const twist = randomInt(11, 253);
  const phase = randomInt(17, 251);
  const slope = randomInt(3, 97);
  const keyMask = randomInt(300, 1200);
  const keyA = keyMask + key;
  const keyB = keyMask;
  const inverseMask = randomInt(700, 1600);
  const inverseA = inverseMask + inverse;
  const inverseB = inverseMask;
  const twistMask = randomInt(500, 1500);
  const twistA = twistMask + twist;
  const twistB = twistMask;
  const phaseMask = randomInt(900, 1900);
  const phaseA = phaseMask + phase;
  const phaseB = phaseMask;
  const slopeMask = randomInt(1100, 2200);
  const slopeA = slopeMask + slope;
  const slopeB = slopeMask;
  const logical = [];
  let previous = (salt * 5 + key + twist + phase) % 256;

  bytes.forEach((byte, index) => {
    const position = index + 1;
    const roll = (position * salt + (position % 7) * twist + previous + position * phase) % 256;
    const extra = (phase + index * slope) % 256;
    const value = (byte * multiplier + key + roll + previous + twist + extra) % 256;
    logical.push(value);
    previous = value;
  });

  const stride = randomStride(logical.length);
  const offset = logical.length > 1 ? randomInt(0, logical.length - 1) : 0;
  const encoded = [];

  logical.forEach((value, index) => {
    encoded[(index * stride + offset) % logical.length] = value;
  });

  return {
    encoded,
    salt,
    keyA,
    keyB,
    checksum: checksumNumbers(encoded, (salt + twist + inverse + phase + slope) % 65535),
    inverseA,
    inverseB,
    twistA,
    twistB,
    stride,
    offset,
    phaseA,
    phaseB,
    slopeA,
    slopeB,
  };
}

function buildRuntimeStringTable(perLine, numericArmor) {
  const cacheKey = `${perLine}:${numericArmor ? 1 : 0}`;
  if (runtimeStringTableCache.has(cacheKey)) return runtimeStringTableCache.get(cacheKey);

  const values = [
    "debug",
    "gethook",
    "getinfo",
    "error",
    "loadstring",
    "load",
    "runtime blocked",
    "integrity failure",
    "os",
    "clock",
    "collectgarbage",
    "count",
    "print",
    "function",
    "string",
    "table",
    "syn",
    "KRNL_LOADED",
    "identifyexecutor",
    "getexecutorname",
    "hookfunction",
    "hookmetamethod",
    "getrawmetatable",
    "setreadonly",
    "getrenv",
    "getgenv",
    "isexecutorclosure",
    "getgc",
    "getreg",
    "debug.getregistry",
    "newcclosure",
    "checkcaller",
    "islclosure",
    "is_synapse_function",
    "game",
    "PlaceId",
    "JobId",
    "tick",
    "workspace",
    "task",
    "spawn",
    "wait",
    "loadstring unavailable",
    "debug detected",
    "invalid env",
    "sandbox",
    "blocked",
  ];
  const indexes = Object.fromEntries(values.map((value, index) => [value, index + 1]));
  const records = values.map((value) => encodeChunk([...encoder.encode(value)]));

  const table = {
    indexes,
    lua: records.map((record) => luaRecord(record, perLine, numericArmor)).join(",\n"),
  };

  runtimeStringTableCache.set(cacheKey, table);
  return table;
}

function luaRecord(chunk, perLine, numericArmor = false) {
  const fields = [
    chunk.salt,
    chunk.keyA,
    chunk.keyB,
    chunk.checksum,
    chunk.inverseA,
    chunk.inverseB,
    chunk.twistA,
    chunk.twistB,
    chunk.stride,
    chunk.offset,
    chunk.phaseA,
    chunk.phaseB,
    chunk.slopeA,
    chunk.slopeB,
  ].map((value) => luaNumber(value, numericArmor));

  return `{{${chunkNumbers(chunk.encoded, perLine, numericArmor)}},${fields.join(",")}}`;
}

function randomOpcodeValues(count) {
  const values = new Set();
  while (values.size < count) {
    values.add(randomInt(7, 252));
  }
  return shuffle([...values]);
}

function mutateOpcodes(opcodes, seed) {
  const mutated = {};
  const offset = (seed + Math.floor(seed / 7) + (seed % 13)) % 256;

  Object.entries(opcodes).forEach(([key, values]) => {
    mutated[key] = values.map((value) => {
      return 7 + ((value - 7 + offset) % 246);
    });
  });

  return mutated;
}

function opcodePick(value) {
  if (Array.isArray(value)) return value[randomInt(0, value.length - 1)];
  return value;
}

function luaOpcodeSet(values) {
  const list = Array.isArray(values) ? values : [values];
  return `{${list.join(",")}}`;
}

function injectDeadInstructions(records, opcodes, ratio = 0.15) {
  const deadPools = [opcodes.junk, opcodes.noise, opcodes.shadow, opcodes.weave];
  const count = Math.floor(records.length * ratio);

  for (let i = 0; i < count; i += 1) {
    const pool = deadPools[randomInt(0, deadPools.length - 1)];
    const pos = randomInt(0, Math.max(0, records.length - 1));
    records.splice(pos, 0, [
      opcodePick(pool),
      randomInt(1, 65535),
      randomInt(1, 65535),
      0,
    ]);
  }

  return records;
}

function garbageStatement() {
  const variants = [
    `local ${randomName()}=#tostring({})`,
    `local ${randomName()}=({})[1]`,
    `do local ${randomName()}=0 end`,
    `if false then local ${randomName()}=nil end`,
  ];
  return variants[randomInt(0, variants.length - 1)];
}

function garbageSprayLines(lines, density = 0.12) {
  const result = [];
  let tableDepth = 0;

  lines.forEach((line) => {
    const trimmed = String(line).trim();
    result.push(line);

    if (trimmed.endsWith("{")) tableDepth += 1;
    if (trimmed === "}" || trimmed === "},") tableDepth = Math.max(0, tableDepth - 1);

    const unsafe =
      tableDepth > 0 ||
      !trimmed ||
      /^return\b/.test(trimmed) ||
      trimmed === "end" ||
      trimmed === "else" ||
      /\bthen$|\bdo$/.test(trimmed);

    if (!unsafe && Math.random() < density) result.push(garbageStatement());
  });

  return result;
}

function vmInstruction(record, index, mask, seed) {
  const [opcode, a = 0, b = 0, c = 0] = record;
  const salt = randomInt(3, 251);
  const variant = randomInt(0, 3);
  const argMask = randomInt(1, 63);
  return `{${(opcode + salt + index + mask + seed) % 256},${a + argMask},${b + argMask},${c + argMask},${salt},${variant},${argMask}}`;
}

function buildVmProgram(chunkCount, opcodes, mask, phantomRatio = 0) {
  const records = [];
  const guard = randomInt(4000, 9000);
  const op = (name) => opcodePick(opcodes[name]);

  records.push([op("check"), guard, guard]);
  records.push([op("lock"), guard + mask, guard + mask]);
  records.push([op("drift"), randomInt(40, 220), randomInt(40, 220)]);
  for (let i = 1; i <= chunkCount; i += 1) {
    if (i % 5 === 0) records.push([op("probe"), guard + i, guard + i]);
    if (i % 2 === 1) records.push([op("junk"), randomInt(30, 220), randomInt(30, 220)]);
    if (i % 2 === 0) records.push([op("noise"), randomInt(10, 99), randomInt(10, 99)]);
    if (i % 3 === 1) records.push([op("mix"), randomInt(20, 240), randomInt(20, 240)]);
    if (i % 4 === 1) records.push([op("weave"), randomInt(20, 240), randomInt(20, 240)]);
    if (i % 6 === 0) records.push([op("gate"), guard + i + mask, guard + i + mask]);
    records.push([op("part"), i, randomInt(1, 255)]);
    if (i % 4 === 0) records.push([op("junk"), randomInt(30, 220), randomInt(30, 220)]);
    if (i % 4 === 2) records.push([op("shadow"), randomInt(20, 240), randomInt(20, 240)]);
    if (i % 5 === 2) records.push([op("drift"), randomInt(40, 220), randomInt(40, 220)]);
    if (i % 3 === 0) records.push([op("check"), guard + i, guard + i]);
  }
  records.push([op("weave"), randomInt(30, 230), randomInt(30, 230)]);
  records.push([op("gate"), guard + chunkCount + mask, guard + chunkCount + mask]);
  records.push([op("exec"), guard]);
  injectDeadInstructions(records, opcodes, Math.min(0.22, 0.1 + phantomRatio * 0.1));
  const nodes = shuffle(records.map((record, index) => ({ record, logical: index + 1 })));
  const positionByLogical = {};
  nodes.forEach((node, index) => {
    positionByLogical[node.logical] = index + 1;
  });
  const physicalRecords = nodes.map((node) => {
    const next = positionByLogical[node.logical + 1] || 0;
    return [node.record[0], node.record[1], node.record[2], next];
  });
  const opcodePool = Object.values(opcodes).flat();
  const phantomCount = Math.max(0, Math.floor(physicalRecords.length * phantomRatio));

  for (let i = 0; i < phantomCount; i += 1) {
    const opcode = opcodePool[randomInt(0, opcodePool.length - 1)];
    const a = randomInt(1, 65535);
    const b = Math.random() > 0.35 ? a : randomInt(1, 65535);
    const next = randomInt(1, Math.max(1, physicalRecords.length));
    physicalRecords.push([opcode, a, b, next]);
  }

  const seed = (guard + physicalRecords.length + mask + chunkCount) % 256;

  return {
    guard,
    records: physicalRecords,
    seed,
    start: positionByLogical[1],
    encoded: physicalRecords.map((record, index) => vmInstruction(record, index + 1, mask, seed)).join(",\n"),
  };
}

function buildWatermark(perLine, numericArmor) {
  const text = `CLG-${Date.now().toString(36)}-${randomInt(100000, 999999).toString(36)}`;
  return luaRecord(encodeChunk([...encoder.encode(text)]), perLine, numericArmor);
}

function splitLiteralBody(body, minParts = 2) {
  const atoms = [];

  for (let i = 0; i < body.length; i += 1) {
    if (body[i] === "\\" && i + 1 < body.length) {
      atoms.push(body.slice(i, i + 2));
      i += 1;
    } else {
      atoms.push(body[i]);
    }
  }

  if (atoms.length < minParts) return [body];

  const parts = [];
  let cursor = 0;
  while (cursor < atoms.length) {
    const remaining = atoms.length - cursor;
    const size = Math.min(remaining, randomInt(1, Math.max(1, Math.ceil(atoms.length / minParts))));
    parts.push(atoms.slice(cursor, cursor + size).join(""));
    cursor += size;
  }

  return parts.length > 1 ? parts : [body];
}

function splitLuaStringLiteral(raw) {
  const quote = raw[0];
  const body = raw.slice(1, -1);
  const parts = splitLiteralBody(body, body.length > 8 ? 3 : 2);

  if (parts.length <= 1) return raw;

  return `(${parts.map((part) => `${quote}${part}${quote}`).join("..")})`;
}

function opaqueInteger(value) {
  if (!Number.isSafeInteger(value) || value < 0 || value > 9999999) return String(value);

  const pad = randomInt(17, 173);
  const scale = randomInt(2, 9);
  const style = randomInt(0, 4);

  if (style === 0) return `(${value + pad}-${pad})`;
  if (style === 1) return `((${value * scale})/${scale})`;
  if (style === 2) return `((#tostring({})-#tostring({}))+${value})`;
  if (style === 3) return `(((${value + pad})*${scale}-${pad * scale})/${scale})`;
  return `(((${value + pad})-${pad})+((#tostring(function()end)-#tostring(function()end))*0))`;
}

function hardenLuaLiterals(source, options = {}) {
  let output = "";
  let i = 0;
  const splitStrings = options.splitStrings !== false;
  const foldNumbers = options.foldNumbers !== false;

  while (i < source.length) {
    const char = source[i];
    const next = source[i + 1];

    if (char === "-" && next === "-") {
      const blockEnd = longBracketEnd(source, i + 2);
      if (blockEnd !== -1) {
        output += source.slice(i, blockEnd);
        i = blockEnd;
      } else {
        const lineEnd = source.indexOf("\n", i + 2);
        const end = lineEnd === -1 ? source.length : lineEnd + 1;
        output += source.slice(i, end);
        i = end;
      }
      continue;
    }

    if (char === '"' || char === "'") {
      const quote = char;
      let literal = char;
      i += 1;
      while (i < source.length) {
        literal += source[i];
        if (source[i] === "\\") {
          i += 1;
          if (i < source.length) literal += source[i];
        } else if (source[i] === quote) {
          i += 1;
          break;
        }
        i += 1;
      }
      output += splitStrings ? splitLuaStringLiteral(literal) : literal;
      continue;
    }

    if (char === "[") {
      const end = longBracketEnd(source, i);
      if (end !== -1) {
        output += source.slice(i, end);
        i = end;
        continue;
      }
    }

    if (
      foldNumbers &&
      /\d/.test(char) &&
      !luaTokenChar(source[i - 1] || "") &&
      source[i - 1] !== "." &&
      source.slice(i, i + 2).toLowerCase() !== "0x"
    ) {
      let cursor = i;
      while (cursor < source.length && /\d/.test(source[cursor])) cursor += 1;

      const token = source.slice(i, cursor);
      const after = source[cursor] || "";
      if (after !== "." && !luaTokenChar(after)) {
        output += opaqueInteger(Number(token));
        i = cursor;
        continue;
      }
    }

    output += char;
    i += 1;
  }

  return output;
}

function wrapControlFlow(source) {
  const gateName = randomName();
  const seedName = randomName();

  return [
    "do",
    `local ${seedName}=#tostring({})+#tostring(function() end)`,
    `local ${gateName}=(((${seedName}*${seedName}+${seedName})%2)==0) and ((${seedName}+1)>${seedName})`,
    `if ${gateName} then`,
    source,
    "else",
    'error("runtime blocked")',
    "end",
    "end",
  ].join("\n");
}

function armoredSource(source, preset, compatible, robloxMode, progress) {
  const profile = presetProfile(preset);
  let stage = wrapControlFlow(hardenLuaLiterals(minifyLua(source)));

  for (let layer = 0; layer < profile.layers; layer += 1) {
    const stagePreset = layer === 0 ? preset : "compact";
    const stageArmor = profile.numericArmor && (preset === "god" || layer === 0);
    const layerStart = 8 + (layer / profile.layers) * 74;
    const layerSpan = 74 / profile.layers;
    stage = encodeLua(stage, stagePreset, compatible, robloxMode, {
      numericArmor: stageArmor,
      progress,
      progressBase: layerStart,
      progressSpan: layerSpan,
    });

    if (layer < profile.layers - 1) {
      progress?.(layerStart + layerSpan * 0.92, "generatingOutput");
      stage = wrapControlFlow(minifyLua(stage));
    }
  }

  return stage;
}

function encodeLua(source, preset, compatible, robloxMode, options = {}) {
  const profile = presetProfile(preset);
  const numericArmor = options.numericArmor ?? profile.numericArmor;
  const progress = options.progress;
  const progressBase = options.progressBase ?? 10;
  const progressSpan = options.progressSpan ?? 70;
  const names = randomNames(132);
  const bytes = [...encoder.encode(source)];
  const perLine = profile.perLine;

  progress?.(progressBase + progressSpan * 0.05, "encodingStrings");
  const stringTable = buildRuntimeStringTable(perLine, numericArmor);
  const watermark = buildWatermark(perLine, numericArmor);

  progress?.(progressBase + progressSpan * 0.22, "encodingPayload");
  const chunks = splitBytes(bytes, preset).map(encodeChunk);
  const payloadChunks = addDecoyChunks(chunks, preset);
  const payload = payloadChunks.map((chunk) => luaRecord(chunk, perLine, numericArmor)).join(",\n");

  const guard = randomInt(1000, 9000);
  const opaqueA = randomInt(11, 99);
  const opaqueB = opaqueA * 2;
  const opcodeValues = randomOpcodeValues(36);
  const opcodes = {
    part: opcodeValues.slice(0, 3),
    exec: opcodeValues.slice(3, 6),
    noise: opcodeValues.slice(6, 9),
    check: opcodeValues.slice(9, 12),
    junk: opcodeValues.slice(12, 15),
    mix: opcodeValues.slice(15, 18),
    probe: opcodeValues.slice(18, 21),
    shadow: opcodeValues.slice(21, 24),
    gate: opcodeValues.slice(24, 27),
    drift: opcodeValues.slice(27, 30),
    lock: opcodeValues.slice(30, 33),
    weave: opcodeValues.slice(33, 36),
  };
  const opcodeSeed = randomInt(3000, 90000);
  const mutatedOpcodes = mutateOpcodes(opcodes, opcodeSeed);
  const instructionMask = randomInt(17, 231);
  progress?.(progressBase + progressSpan * 0.68, "buildingVm");
  const program = buildVmProgram(chunks.length, mutatedOpcodes, instructionMask, profile.phantomRatio || 0);
  progress?.(progressBase + progressSpan * 0.86, "generatingOutput");
  const loadPrimary = robloxMode || compatible ? stringTable.indexes.loadstring : stringTable.indexes.load;
  const loadFallback = robloxMode || compatible ? stringTable.indexes.load : stringTable.indexes.loadstring;
  const environmentExpr = robloxMode
    ? `(getfenv and getfenv(0)) or _G or _ENV or {}`
    : `_G or _ENV or (getfenv and getfenv()) or {}`;
  const hookScanLine = robloxMode
    ? `for ${names[72]}=1,#${names[71]} do local ${names[73]}=${names[37]}(${names[71]}[${names[72]}]);if ${names[35]}[${names[73]}]~=nil then ${names[85]}=(${names[85]}+#${names[73]}*${names[72]})%65535 end end`
    : `for ${names[72]}=1,#${names[71]} do local ${names[73]}=${names[37]}(${names[71]}[${names[72]}]);if ${names[35]}[${names[73]}]~=nil then return false end end`;

  const noise =
    preset === "heavy" || preset === "god"
      ? [
          `local ${names[44]}=${randomInt(31, 99)}`,
          `local ${names[45]}=function(${names[46]}) return (${names[46]}*${names[44]})%257 end`,
          `${names[44]}=${names[45]}(${names[44]})`,
        ].join("\n")
      : "";

  const lines = [
    `local ${names[0]}=${guard}`,
    `local ${names[18]}=${instructionMask}`,
    `local ${names[64]}=${program.guard}`,
    `local ${names[65]}=${program.records.length}`,
    `local ${names[66]}=${chunks.length}`,
    `local ${names[19]}=${luaOpcodeSet(mutatedOpcodes.part)}`,
    `local ${names[20]}=${luaOpcodeSet(mutatedOpcodes.exec)}`,
    `local ${names[21]}=${luaOpcodeSet(mutatedOpcodes.noise)}`,
    `local ${names[22]}=${luaOpcodeSet(mutatedOpcodes.check)}`,
    `local ${names[68]}=${luaOpcodeSet(mutatedOpcodes.junk)}`,
    `local ${names[78]}=${luaOpcodeSet(mutatedOpcodes.mix)}`,
    `local ${names[79]}=${luaOpcodeSet(mutatedOpcodes.probe)}`,
    `local ${names[80]}=${luaOpcodeSet(mutatedOpcodes.shadow)}`,
    `local ${names[90]}=${luaOpcodeSet(mutatedOpcodes.gate)}`,
    `local ${names[91]}=${luaOpcodeSet(mutatedOpcodes.drift)}`,
    `local ${names[92]}=${luaOpcodeSet(mutatedOpcodes.lock)}`,
    `local ${names[93]}=${luaOpcodeSet(mutatedOpcodes.weave)}`,
    `local ${names[1]}={`,
    payload,
    `}`,
    `local ${names[23]}={`,
    program.encoded,
    `}`,
    `local ${names[33]}={`,
    stringTable.lua,
    `}`,
    `local ${names[34]}=${watermark}`,
    noise,
    `local ${names[2]}=string.char`,
    `local ${names[3]}=table.concat`,
    `local ${names[35]}=${environmentExpr}`,
    `local function ${names[6]}(${names[7]})`,
    `local ${names[8]}=${names[7]}[1]`,
    `local ${names[9]}=${names[7]}[2]`,
    `local ${names[10]}=(${names[7]}[3]-${names[7]}[4])%256`,
    `local ${names[94]}=(${names[7]}[6]-${names[7]}[7])%256`,
    `local ${names[95]}=(${names[7]}[8]-${names[7]}[9])%256`,
    `local ${names[96]}=${names[7]}[10] or 1`,
    `local ${names[97]}=${names[7]}[11] or 0`,
    `local ${names[103]}=((${names[7]}[12] or 0)-(${names[7]}[13] or 0))%256`,
    `local ${names[104]}=((${names[7]}[14] or 0)-(${names[7]}[15] or 0))%256`,
    `local ${names[98]}=(${names[9]}+${names[94]}+${names[95]}+${names[103]}+${names[104]})%65535`,
    `local ${names[11]}=0`,
    `for ${names[12]}=1,#${names[8]} do ${names[11]}=(${names[11]}+${names[8]}[${names[12]}]*(${names[12]}+${names[98]})+${names[98]})%65535 end`,
    `if ${names[11]}~=${names[7]}[5] then error("integrity failure") end`,
    `local ${names[13]}=(${names[9]}*5+${names[10]}+${names[95]}+${names[103]})%256`,
    `local ${names[14]}={}`,
    `local ${names[15]}=(function() local ${names[84]}=#tostring({})+${opaqueA};return (((${names[84]}*${names[84]}+${names[84]})%2)==0) and (${opaqueB}/${opaqueA}>1) end)()`,
    `for ${names[12]}=1,#${names[8]} do`,
    `local ${names[99]}=(((${names[12]}-1)*${names[96]}+${names[97]})%#${names[8]})+1`,
    `local ${names[16]}=${names[8]}[${names[99]}]`,
    `local ${names[100]}=(${names[12]}*${names[9]}+(${names[12]}%7)*${names[95]}+${names[13]}+${names[12]}*${names[103]})%256`,
    `local ${names[105]}=(${names[103]}+(${names[12]}-1)*${names[104]})%256`,
    `if ${names[15]} then ${names[14]}[${names[12]}]=${names[2]}(((${names[16]}-${names[10]}-${names[100]}-${names[13]}-${names[95]}-${names[105]})%256*${names[94]})%256) else error("runtime blocked") end`,
    `${names[13]}=${names[16]}`,
    "end",
    `return ${names[3]}(${names[14]})`,
    "end",
    `local ${names[36]}={}`,
    `local ${names[77]}=0`,
    `local ${names[41]}`,
    `local function ${names[37]}(${names[38]}) ${names[77]}=(${names[77]}+${names[38]}*7+#${names[23]})%251;local ${names[69]}=(${names[0]}+${names[77]}+${names[38]}*13)%251;local ${names[70]}=tostring(${names[38]})..":"..tostring(${names[69]}%13);local ${names[39]}=${names[36]}[${names[70]}];if not ${names[39]} then ${names[39]}=${names[6]}(${names[33]}[${names[38]}]);${names[36]}[${names[70]}]=${names[39]} end;return ${names[39]} end`,
    `${names[41]}=function()`,
    `local ${names[42]}=${names[0]}+#${names[23]}+${names[18]}`,
    `local ${names[43]}=${names[35]}`,
    `pcall(function() local ${names[47]}=0;for ${names[48]},${names[49]} in pairs(${names[43]}) do ${names[42]}=(${names[42]}+#tostring(${names[48]})*(${names[47]}+3)+#tostring(type(${names[49]})))%65535;${names[47]}=${names[47]}+1;if ${names[47]}>64 then break end end end)`,
    `local ${names[50]}=${names[43]}[${names[37]}(${stringTable.indexes.os})]`,
    `if type(${names[50]})=="table" and type(${names[50]}[${names[37]}(${stringTable.indexes.clock})])=="function" then local ${names[51]},${names[52]}=pcall(${names[50]}[${names[37]}(${stringTable.indexes.clock})]);if ${names[51]} then ${names[42]}=(${names[42]}+math.floor((${names[52]}%1)*100000))%65535 end end`,
    `local ${names[86]}=${names[43]}[${names[37]}(${stringTable.indexes.game})]`,
    `if type(${names[86]})=="userdata" or type(${names[86]})=="table" then local ${names[51]},${names[87]}=pcall(function() return tostring(${names[86]}[${names[37]}(${stringTable.indexes.PlaceId})])..tostring(${names[86]}[${names[37]}(${stringTable.indexes.JobId})]) end);if ${names[51]} then for ${names[88]}=1,#${names[87]} do ${names[42]}=(${names[42]}+string.byte(${names[87]},${names[88]})*${names[88]})%65535 end end end`,
    `local ${names[89]}=${names[43]}[${names[37]}(${stringTable.indexes.tick})]`,
    `if type(${names[89]})=="function" then local ${names[51]},${names[52]}=pcall(${names[89]});if ${names[51]} and type(${names[52]})=="number" then ${names[42]}=(${names[42]}+math.floor((${names[52]}%1)*100000))%65535 end end`,
    `local ${names[53]}=${names[43]}[${names[37]}(${stringTable.indexes.collectgarbage})]`,
    `if type(${names[53]})=="function" then local ${names[51]},${names[52]}=pcall(${names[53]},${names[37]}(${stringTable.indexes.count}));if ${names[51]} and type(${names[52]})=="number" then ${names[42]}=(${names[42]}+math.floor(${names[52]}))%65535 end end`,
    `return ${names[42]}%256`,
    "end",
    `local ${names[40]}=${names[35]}[${names[37]}(${stringTable.indexes.error})] or error`,
    `if type(${names[35]})~=${names[37]}(${stringTable.indexes.table}) then ${names[40]}(${names[37]}(${stringTable.indexes["invalid env"]})) end`,
    `if type(getfenv)==${names[37]}(${stringTable.indexes["function"]}) then local ${names[121]}=getfenv();if ${names[121]} and _G and ${names[121]}~=_G then ${names[40]}(${names[37]}(${stringTable.indexes.sandbox})) end end`,
    `if rawget and _G and rawget(_G,${names[37]}(${stringTable.indexes.loadstring}))==nil and rawget(_G,${names[37]}(${stringTable.indexes.load}))==nil then ${names[40]}(${names[37]}(${stringTable.indexes.blocked})) end`,
    `local ${names[122]}=${names[35]}[${names[37]}(${stringTable.indexes.os})];local ${names[123]}=type(${names[122]})==${names[37]}(${stringTable.indexes.table}) and ${names[122]}[${names[37]}(${stringTable.indexes.clock})];if type(${names[123]})==${names[37]}(${stringTable.indexes["function"]}) then local ${names[124]}=${names[123]}();local ${names[125]}=${names[123]}()-${names[124]};if ${names[125]}>0.1 then ${names[40]}(${names[37]}(${stringTable.indexes["debug detected"]})) end end`,
    `local function ${names[54]}()`,
    `local ${names[55]}=${names[35]}[${names[37]}(${stringTable.indexes.debug})]`,
    `if type(${names[55]})=="table" then local ${names[56]}=${names[55]}[${names[37]}(${stringTable.indexes.gethook})];if type(${names[56]})=="function" then local ${names[51]},${names[57]},${names[58]},${names[59]}=pcall(${names[56]});if ${names[51]} and (${names[57]}~=nil or (${names[59]} and ${names[59]}~=0)) then return false end end end`,
    `if type(${names[55]})=="table" then local ${names[83]}=${names[55]}[${names[37]}(${stringTable.indexes.getinfo})];if type(${names[83]})=="function" then pcall(${names[83]},1) end end`,
    `local ${names[60]}=${names[35]}[${names[37]}(${stringTable.indexes.print})]`,
    `if ${names[60]}~=nil and type(${names[60]})~=${names[37]}(${stringTable.indexes["function"]}) then return false end`,
    `local ${names[85]}=0`,
    `local ${names[71]}={${stringTable.indexes.syn},${stringTable.indexes.KRNL_LOADED},${stringTable.indexes.identifyexecutor},${stringTable.indexes.getexecutorname},${stringTable.indexes.hookfunction},${stringTable.indexes.hookmetamethod},${stringTable.indexes.getrawmetatable},${stringTable.indexes.setreadonly},${stringTable.indexes.getrenv},${stringTable.indexes.getgenv},${stringTable.indexes.isexecutorclosure},${stringTable.indexes.getgc},${stringTable.indexes.getreg},${stringTable.indexes.newcclosure},${stringTable.indexes.checkcaller},${stringTable.indexes.islclosure},${stringTable.indexes.is_synapse_function}}`,
    hookScanLine,
    `return true`,
    "end",
    `if not ${names[54]}() then ${names[40]}(${names[37]}(${stringTable.indexes["runtime blocked"]})) end`,
    `local ${names[61]}=${names[6]}(${names[34]})`,
    `if #${names[61]}<4 then ${names[40]}(${names[37]}(${stringTable.indexes["integrity failure"]})) end`,
    `local ${names[4]}=${names[35]}[${names[37]}(${loadPrimary})] or ${names[35]}[${names[37]}(${loadFallback})]`,
    `if type(${names[4]})~=${names[37]}(${stringTable.indexes["function"]}) then ${names[40]}(${names[37]}(${stringTable.indexes["loadstring unavailable"]})) end`,
    `local ${names[74]}=${names[41]}()`,
    `local ${names[24]}={${names[25]}={},${names[26]}=${program.start},${names[27]}=0,${names[75]}=0,${names[108]}={0,0,0,0,0,0,0,0},${names[109]}=0}`,
    `if #${names[23]}~=${program.records.length} then ${names[40]}(${names[37]}(${stringTable.indexes["integrity failure"]})) end`,
    `local function ${names[28]}(${names[29]},${names[30]}) local ${names[62]}=${names[74]};local ${names[67]}=(${names[64]}+${names[65]}+${names[18]}+${names[66]})%256;return (${names[29]}-${names[30]}-${names[24]}.${names[26]}-${names[18]}-${names[67]}+${names[62]})%256 end`,
    `local ${names[63]}={}`,
    `local function ${names[110]}(${names[111]},${names[112]}) for ${names[113]}=1,#${names[111]} do ${names[63]}[(${names[111]}[${names[113]}]+${names[74]})%256]=${names[112]} end end`,
    `${names[110]}(${names[19]},function(${names[31]}) ${names[24]}.${names[108]}[1]=${names[31]}[2];${names[24]}.${names[108]}[2]=#${names[24]}.${names[25]}+1;${names[24]}.${names[25]}[${names[24]}.${names[108]}[2]]=${names[6]}(${names[1]}[${names[24]}.${names[108]}[1]]);${names[24]}.${names[27]}=(${names[24]}.${names[27]}+${names[31]}[3]+#${names[24]}.${names[25]})%65535;${names[24]}.${names[26]}=${names[31]}[4] end)`,
    `${names[110]}(${names[22]},function(${names[31]}) if ${names[31]}[2]~=${names[31]}[3] then ${names[40]}(${names[37]}(${stringTable.indexes["integrity failure"]})) end;${names[24]}.${names[108]}[3]=(${names[31]}[2]+${names[31]}[3])%65535;${names[24]}.${names[26]}=${names[31]}[4] end)`,
    `${names[110]}(${names[21]},function(${names[31]}) ${names[24]}.${names[108]}[4]=(${names[31]}[2]*${names[31]}[3])%65535;${names[24]}.${names[27]}=(${names[24]}.${names[27]}+${names[24]}.${names[108]}[4])%65535;${names[24]}.${names[26]}=${names[31]}[4] end)`,
    `${names[110]}(${names[68]},function(${names[31]}) local ${names[76]}=(${names[31]}[2]*7+${names[31]}[3]*13+#${names[24]}.${names[25]})%257;${names[24]}.${names[75]}=(${names[24]}.${names[75]}+${names[76]}-${names[76]})%65535;${names[24]}.${names[108]}[5]=${names[76]};${names[24]}.${names[26]}=${names[31]}[4] end)`,
    `${names[110]}(${names[78]},function(${names[31]}) local ${names[81]}=(${names[31]}[2]+${names[31]}[3]+${names[24]}.${names[27]})%256;${names[24]}.${names[75]}=(${names[24]}.${names[75]}+${names[81]}-${names[81]})%65535;${names[24]}.${names[108]}[6]=${names[81]};${names[24]}.${names[26]}=${names[31]}[4] end)`,
    `${names[110]}(${names[79]},function(${names[31]}) if ((${names[31]}[2]-${names[31]}[3])%1)~=0 then ${names[40]}(${names[37]}(${stringTable.indexes["integrity failure"]})) end;${names[24]}.${names[26]}=${names[31]}[4] end)`,
    `${names[110]}(${names[80]},function(${names[31]}) local ${names[82]}=tostring(${names[31]}[2]*${names[31]}[3]);if #${names[82]}<1 then ${names[40]}(${names[37]}(${stringTable.indexes["runtime blocked"]})) end;${names[24]}.${names[108]}[7]=#${names[82]};${names[24]}.${names[26]}=${names[31]}[4] end)`,
    `${names[110]}(${names[90]},function(${names[31]}) if ${names[31]}[2]~=${names[31]}[3] then ${names[40]}(${names[37]}(${stringTable.indexes["integrity failure"]})) end;${names[24]}.${names[26]}=${names[31]}[4] end)`,
    `${names[110]}(${names[91]},function(${names[31]}) local ${names[101]}=(${names[31]}[2]*31+${names[31]}[3]*17+${names[24]}.${names[27]})%65535;${names[24]}.${names[108]}[8]=${names[101]};${names[24]}.${names[27]}=(${names[24]}.${names[27]}+${names[101]})%65535;${names[24]}.${names[26]}=${names[31]}[4] end)`,
    `${names[110]}(${names[92]},function(${names[31]}) if ((${names[31]}[2]-${names[31]}[3])+(${names[31]}[3]-${names[31]}[2]))~=0 then ${names[40]}(${names[37]}(${stringTable.indexes["runtime blocked"]})) end;${names[24]}.${names[26]}=${names[31]}[4] end)`,
    `${names[110]}(${names[93]},function(${names[31]}) local ${names[102]}=(${names[31]}[2]*${names[31]}[3]+${names[24]}.${names[75]}+#${names[24]}.${names[25]})%257;${names[24]}.${names[75]}=(${names[24]}.${names[75]}+${names[102]}-${names[102]})%65535;${names[24]}.${names[26]}=${names[31]}[4] end)`,
    `${names[110]}(${names[20]},function() ${names[24]}.${names[26]}=0 end)`,
    `local ${names[114]}={${names[63]},${names[63]}}`,
    `local function ${names[115]}(${names[32]},${names[31]}) local ${names[116]}=${names[114]}[(((${names[24]}.${names[109]}+(${names[31]}[6] or 0))%#${names[114]})+1)];return ${names[116]}[${names[32]}] end`,
    `local function ${names[117]}(${names[5]},${names[31]}) local ${names[119]}=1;local ${names[120]};${names[120]}={function() ${names[24]}.${names[108]}[6]=(${names[24]}.${names[108]}[6]+(${names[31]}[6] or 0)+${names[24]}.${names[26]})%257;${names[119]}=2 end,function() ${names[5]}(${names[31]});${names[119]}=0 end};while ${names[119]}>0 do ${names[120]}[${names[119]}]() end end`,
    `local function ${names[17]}()`,
    `while ${names[24]}.${names[26]} and ${names[24]}.${names[26]}>0 and ${names[24]}.${names[26]}<=#${names[23]} do`,
    `local ${names[31]}=${names[23]}[${names[24]}.${names[26]}]`,
    `if ${names[31]}[7] then local ${names[118]}=${names[31]}[7];${names[31]}[2]=${names[31]}[2]-${names[118]};${names[31]}[3]=${names[31]}[3]-${names[118]};${names[31]}[4]=${names[31]}[4]-${names[118]};${names[31]}[7]=nil end`,
    `${names[24]}.${names[109]}=(${names[24]}.${names[109]}+1)%65535`,
    `local ${names[32]}=${names[28]}(${names[31]}[1],${names[31]}[5])`,
    `local ${names[5]}=${names[115]}(${names[32]},${names[31]})`,
    `if not ${names[5]} then ${names[40]}(${names[37]}(${stringTable.indexes["runtime blocked"]})) end`,
    `if ((((${names[32]}+${names[24]}.${names[26]})*((${names[32]}+${names[24]}.${names[26]})+1))%2)==0) and (((${names[24]}.${names[26]}*${names[24]}.${names[26]}+${names[24]}.${names[26]})%2)==0) then ${names[117]}(${names[5]},${names[31]}) else ${names[40]}(${names[37]}(${stringTable.indexes["runtime blocked"]})) end`,
    "end",
    `${names[1]}=nil;${names[23]}=nil`,
    `return ${names[3]}(${names[24]}.${names[25]})`,
    "end",
    `if ${names[0]}~=${guard} then ${names[40]}(${names[37]}(${stringTable.indexes["runtime blocked"]})) end`,
    `local ${names[106]}=${names[17]}()`,
    `local ${names[16]}=${names[4]}(${names[106]})`,
    `${names[106]}=nil;${names[17]}=nil;${names[1]}=nil;${names[23]}=nil;${names[33]}=nil;${names[34]}=nil;${names[36]}=nil;${names[63]}=nil`,
    `pcall(function() local ${names[107]}=${names[35]}[${names[37]}(${stringTable.indexes.collectgarbage})] or collectgarbage;if type(${names[107]})=="function" then pcall(${names[107]},"collect");pcall(${names[107]},"collect") end end)`,
    `return ${names[16]}()`,
  ].filter(Boolean);

  return garbageSprayLines(lines, preset === "god" ? 0.16 : 0.08).join("\n");
}

function addBanner(source, enabled = bannerToggle?.checked) {
  if (!enabled) return source;
  return [
    "-- Axiom VM",
    "-- Triple-layer VM Pack + Rolling Cipher + Poison Payload Lua Protection",
    "",
    source,
  ].join("\n");
}

function longBracketEnd(source, index) {
  const info = longBracketInfo(source, index);
  if (!info) return -1;
  const start = index + info.openLength;
  const end = source.indexOf(info.close, start);
  return end === -1 ? source.length : end + info.close.length;
}

function luaTokenChar(char) {
  return /[A-Za-z0-9_]/.test(char);
}

function compactNeedsSpace(previous, next) {
  if (!previous || !next) return false;
  if (luaTokenChar(previous) && luaTokenChar(next)) return true;
  if (previous === "-" && next === "-") return true;
  return false;
}

function compactLua(source) {
  let output = "";
  let pendingSpace = false;
  let i = 0;

  while (i < source.length) {
    const char = source[i];
    const next = source[i + 1];

    if (/\s/.test(char)) {
      pendingSpace = true;
      i += 1;
      continue;
    }

    if (char === "-" && next === "-") {
      const blockEnd = longBracketEnd(source, i + 2);
      if (blockEnd !== -1) {
        i = blockEnd;
      } else {
        const lineEnd = source.indexOf("\n", i + 2);
        i = lineEnd === -1 ? source.length : lineEnd + 1;
      }
      pendingSpace = true;
      continue;
    }

    if (char === '"' || char === "'") {
      const previous = output[output.length - 1];
      if (pendingSpace && compactNeedsSpace(previous, char)) output += " ";
      pendingSpace = false;

      const quote = char;
      output += char;
      i += 1;
      while (i < source.length) {
        output += source[i];
        if (source[i] === "\\") {
          i += 1;
          if (i < source.length) output += source[i];
        } else if (source[i] === quote) {
          i += 1;
          break;
        }
        i += 1;
      }
      continue;
    }

    if (char === "[") {
      const end = longBracketEnd(source, i);
      if (end !== -1) {
        const previous = output[output.length - 1];
        if (pendingSpace && compactNeedsSpace(previous, char)) output += " ";
        output += source.slice(i, end);
        pendingSpace = false;
        i = end;
        continue;
      }
    }

    const previous = output[output.length - 1];
    if (pendingSpace && compactNeedsSpace(previous, char)) output += " ";
    output += char;
    pendingSpace = false;
    i += 1;
  }

  return output.trim();
}

function formatGeneratedLua(source) {
  const compact = compactLua(source);
  const hardened = hardenLuaLiterals(compact, {
    splitStrings: true,
    foldNumbers: false,
  });

  return `return(function()${hardened}end)()`;
}

function buildObfuscatedOutput(source, options) {
  const progress = options.progress;
  progress?.(3, "processing");

  const result = formatGeneratedLua(
    armoredSource(source, options.preset, options.compatible, options.robloxMode, progress),
  );

  progress?.(92, "generatingOutput");
  return addBanner(result, options.banner);
}

if (!hasDOM && typeof self !== "undefined") {
  self.onmessage = (event) => {
    const { id, source, options } = event.data || {};

    try {
      const result = buildObfuscatedOutput(source || "", {
        ...(options || {}),
        progress: (progress, status) => self.postMessage({ id, progress, status }),
      });
      self.postMessage({ id, progress: 100, result });
    } catch (error) {
      self.postMessage({
        id,
        progress: 100,
        error: error?.message || "Worker failed",
      });
    }
  };
}

function workerScriptUrl() {
  const script = document.querySelector('script[src$="script.js"]');
  return script ? script.getAttribute("src") : "script.js";
}

function stopObfuscationWorker() {
  if (obfuscationWorker) {
    obfuscationWorker.terminate();
    obfuscationWorker = null;
  }
  workerBusy = false;
}

function obfuscateOnMainThread(source, options) {
  const result = buildObfuscatedOutput(source, {
    ...options,
    progress: (progress, status) => setProgressStatus(status, progress),
  });
  setOutputValue(result);
  setStatus("done");
}

function obfuscateInWorker(source, options) {
  if (typeof Worker === "undefined") {
    obfuscateOnMainThread(source, options);
    return;
  }

  const jobId = obfuscationJob + 1;
  obfuscationJob = jobId;
  if (workerBusy) stopObfuscationWorker();

  if (!obfuscationWorker) {
    try {
      obfuscationWorker = new Worker(workerScriptUrl());
    } catch {
      obfuscateOnMainThread(source, options);
      return;
    }
  }

  obfuscationWorker.onmessage = (event) => {
    if (event.data?.id !== jobId) return;

    if (event.data.progress && event.data.progress < 100) {
      setProgressStatus(event.data.status || "processing", event.data.progress);
      return;
    }

    workerBusy = false;
    if (event.data.error) {
      setStatus("failed", "error");
      setOutputValue(`-- Error: ${event.data.error}`, { error: true });
    } else {
      setOutputValue(event.data.result || "");
      setStatus("done");
    }
  };

  obfuscationWorker.onerror = (error) => {
    if (jobId !== obfuscationJob) return;
    stopObfuscationWorker();
    setStatus("failed", "error");
    setOutputValue(`-- Error: ${error.message || "Worker failed"}`, { error: true });
  };

  workerBusy = true;
  setProgressStatus("processing", 1);
  obfuscationWorker.postMessage({ id: jobId, source, options });
}

function obfuscate() {
  const source = inputCode.value.trim();
  if (!source) {
    clearOutputValue();
    setStatus("emptyInput", "error");
    return;
  }

  const preset = presetSelect.value;
  const sourceSize = byteLength(source);
  const presetLimit = PRESET_LIMITS[preset] || PRESET_LIMITS.balanced;

  if (sourceSize > presetLimit) {
    setStatus("tooLargeForPreset", "error");
    setOutputValue(
      `-- Error: ${translate("tooLargeForPreset")}\n-- Preset: ${preset}\n-- Size: ${formatBytes(sourceSize)} / ${formatBytes(presetLimit)}\n-- Gunakan preset yang lebih ringan atau pecah input menjadi file lebih kecil.`,
      { error: true },
    );
    return;
  }

  try {
    obfuscateInWorker(source, {
      preset,
      compatible: compatToggle.checked,
      robloxMode: robloxToggle.checked,
      banner: bannerToggle.checked,
    });
  } catch (error) {
    setStatus("failed", "error");
    setOutputValue(`-- Error: ${error.message}`, { error: true });
  }
}

async function copyOutput() {
  const value = currentOutputValue();
  if (!value) {
    setStatus("noOutput", "error");
    return;
  }

  try {
    await navigator.clipboard.writeText(value);
    setStatus("copied");
  } catch {
    const mirror = document.createElement("textarea");
    mirror.value = value;
    mirror.setAttribute("readonly", "");
    mirror.style.position = "fixed";
    mirror.style.left = "-9999px";
    mirror.style.top = "0";
    document.body.appendChild(mirror);
    mirror.select();
    document.execCommand("copy");
    mirror.remove();
    setStatus("copied");
  }
}

async function pasteInput() {
  try {
    inputCode.value = await navigator.clipboard.readText();
    setStatus("pasted");
    updateStats();
  } catch {
    setStatus("pasteDenied", "error");
  }
}

function downloadOutput() {
  const value = currentOutputValue();
  if (!value) {
    setStatus("noOutput", "error");
    return;
  }

  const blob = new Blob([value], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "axiom-vm-obfuscated.lua";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  setStatus("downloaded");
}

function resizeCanvas() {
  const pixelRatio = window.devicePixelRatio || 1;
  canvas.width = Math.floor(window.innerWidth * pixelRatio);
  canvas.height = Math.floor(window.innerHeight * pixelRatio);
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
}

let particles = [];

function resetParticles() {
  const count = Math.min(120, Math.max(50, Math.floor(window.innerWidth / 14)));
  particles = Array.from({ length: count }, () => ({
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    speed: 0.35 + Math.random() * 1.2,
    size: 1 + Math.random() * 2.5,
    hue: Math.random() > 0.5 ? "255, 255, 255" : "170, 170, 170",
    alpha: 0.24 + Math.random() * 0.18,
  }));
}

function drawSignal() {
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  ctx.fillStyle = "rgba(255,255,255,0.04)";
  ctx.font = "12px Consolas, monospace";

  particles.forEach((point, index) => {
    point.y += point.speed;
    point.x += Math.sin((point.y + index) * 0.012) * 0.16;
    if (point.y > window.innerHeight + 24) {
      point.y = -24;
      point.x = Math.random() * window.innerWidth;
    }

    ctx.fillStyle = `rgba(${point.hue},${point.alpha})`;
    ctx.fillRect(point.x, point.y, point.size, point.size * 6);

    if (index % 5 === 0) {
      ctx.fillStyle = `rgba(${point.hue},0.18)`;
      ctx.fillText(index % 2 ? "local" : "end", point.x + 8, point.y);
    }
  });

  requestAnimationFrame(drawSignal);
}

if (hasDOM) {
  inputCode.addEventListener("input", updateStats);
  outputCode.addEventListener("input", updateStats);
  languageSelect.addEventListener("change", () => applyLanguage(languageSelect.value));
  obfuscateBtn.addEventListener("click", obfuscate);
  copyBtn.addEventListener("click", copyOutput);
  pasteBtn.addEventListener("click", pasteInput);
  downloadBtn.addEventListener("click", downloadOutput);
  sampleBtn.addEventListener("click", () => {
    inputCode.value = SAMPLE_CODE;
    setStatus("sampleLoaded");
    updateStats();
    obfuscate();
  });
  clearBtn.addEventListener("click", () => {
    inputCode.value = "";
    stopObfuscationWorker();
    clearOutputValue();
    setStatus("cleared");
  });
  window.addEventListener("resize", () => {
    resizeCanvas();
    resetParticles();
  });

  resizeCanvas();
  resetParticles();
  drawSignal();
  installGodPreset();
  applyLanguage(currentLanguage);
  updateStats();
}
