const inputCode = document.querySelector("#inputCode");
const outputCode = document.querySelector("#outputCode");
const languageSelect = document.querySelector("#languageSelect");
const presetSelect = document.querySelector("#presetSelect");
const compatToggle = document.querySelector("#compatToggle");
const robloxToggle = document.querySelector("#robloxToggle");
const bannerToggle = document.querySelector("#bannerToggle");
const obfuscateBtn = document.querySelector("#obfuscateBtn");
const sampleBtn = document.querySelector("#sampleBtn");
const clearBtn = document.querySelector("#clearBtn");
const pasteBtn = document.querySelector("#pasteBtn");
const copyBtn = document.querySelector("#copyBtn");
const downloadBtn = document.querySelector("#downloadBtn");
const statusPill = document.querySelector("#statusPill");
const inputBytes = document.querySelector("#inputBytes");
const outputBytes = document.querySelector("#outputBytes");
const ratioValue = document.querySelector("#ratioValue");
const lineCount = document.querySelector("#lineCount");
const canvas = document.querySelector("#signalCanvas");
const ctx = canvas.getContext("2d");

const translations = {
  id: {
    languageLabel: "Bahasa",
    ready: "Siap",
    processKicker: "Proses tetap",
    processDescription: "Kode Lua dipadatkan ke VM state-machine acak dengan dynamic key, string decrypt on-demand, dan mode Roblox/Luau.",
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
    outputTitle: "Hasil CoolLight v3",
    copyButton: "Salin",
    downloadButton: "Unduh",
    outputPlaceholder: "Hasil CoolLight v3 akan muncul di sini...",
    emptyInput: "Masukkan kode Lua",
    done: "CoolLight v3 selesai",
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
    processDescription: "Lua code is packed into a randomized state-machine VM with dynamic keys, on-demand string decrypt, and Roblox/Luau mode.",
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
    outputTitle: "CoolLight v3 Output",
    copyButton: "Copy",
    downloadButton: "Download",
    outputPlaceholder: "CoolLight v3 output will appear here...",
    emptyInput: "Enter Lua code",
    done: "CoolLight v3 complete",
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

function translate(key) {
  return translations[currentLanguage][key] || translations.id[key] || key;
}

function setStatus(key, type = "ok") {
  currentStatusKey = key;
  currentStatusType = type;
  statusPill.textContent = translate(key);
  statusPill.classList.toggle("error", type === "error");
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

function updateStats() {
  const inputSize = byteLength(inputCode.value);
  const outputSize = byteLength(outputCode.value);
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

function chunkNumbers(numbers, perLine = 16) {
  const lines = [];
  for (let i = 0; i < numbers.length; i += perLine) {
    lines.push(numbers.slice(i, i + perLine).join(","));
  }
  return lines.join(",\n");
}

function splitBytes(bytes, preset) {
  const ranges = {
    compact: [54, 88],
    balanced: [28, 52],
    heavy: [12, 26],
  };
  const [min, max] = ranges[preset] || ranges.balanced;
  const chunks = [];
  let cursor = 0;

  while (cursor < bytes.length) {
    const size = randomInt(min, max);
    chunks.push(bytes.slice(cursor, cursor + size));
    cursor += size;
  }

  return chunks;
}

function encodeChunk(bytes) {
  const salt = randomInt(7, 251);
  const key = randomInt(1, 255);
  const keyMask = randomInt(300, 1200);
  const keyA = keyMask + key;
  const keyB = keyMask;
  const encoded = [];
  let previous = (salt * 3 + key) % 256;

  bytes.forEach((byte, index) => {
    const roll = (((index + 1) * salt) % 256);
    const value = (byte + key + roll + previous) % 256;
    encoded.push(value);
    previous = value;
  });

  return {
    encoded,
    salt,
    keyA,
    keyB,
    checksum: checksumNumbers(encoded, salt),
  };
}

function buildRuntimeStringTable(perLine) {
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
  ];
  const indexes = Object.fromEntries(values.map((value, index) => [value, index + 1]));
  const records = values.map((value) => encodeChunk([...encoder.encode(value)]));

  return {
    indexes,
    lua: records.map((record) => luaRecord(record, perLine)).join(",\n"),
  };
}

function luaRecord(chunk, perLine) {
  return `{{${chunkNumbers(chunk.encoded, perLine)}},${chunk.salt},${chunk.keyA},${chunk.keyB},${chunk.checksum}}`;
}

function vmInstruction(record, index, mask, seed) {
  const [opcode, a = 0, b = 0, c = 0] = record;
  const salt = randomInt(3, 251);
  return `{${(opcode + salt + index + mask + seed) % 256},${a},${b},${c},${salt}}`;
}

function buildVmProgram(chunkCount, opcodes, mask) {
  const records = [];
  const guard = randomInt(4000, 9000);

  records.push([opcodes.check, guard, guard]);
  for (let i = 1; i <= chunkCount; i += 1) {
    if (i % 5 === 0) records.push([opcodes.probe, guard + i, guard + i]);
    if (i % 2 === 1) records.push([opcodes.junk, randomInt(30, 220), randomInt(30, 220)]);
    if (i % 2 === 0) records.push([opcodes.noise, randomInt(10, 99), randomInt(10, 99)]);
    if (i % 3 === 1) records.push([opcodes.mix, randomInt(20, 240), randomInt(20, 240)]);
    records.push([opcodes.part, i, randomInt(1, 255)]);
    if (i % 4 === 0) records.push([opcodes.junk, randomInt(30, 220), randomInt(30, 220)]);
    if (i % 4 === 2) records.push([opcodes.shadow, randomInt(20, 240), randomInt(20, 240)]);
    if (i % 3 === 0) records.push([opcodes.check, guard + i, guard + i]);
  }
  records.push([opcodes.exec, guard]);
  const nodes = shuffle(records.map((record, index) => ({ record, logical: index + 1 })));
  const positionByLogical = {};
  nodes.forEach((node, index) => {
    positionByLogical[node.logical] = index + 1;
  });
  const physicalRecords = nodes.map((node) => {
    const next = positionByLogical[node.logical + 1] || 0;
    return [node.record[0], node.record[1], node.record[2], next];
  });
  const seed = (guard + physicalRecords.length + mask + chunkCount) % 256;

  return {
    guard,
    records: physicalRecords,
    seed,
    start: positionByLogical[1],
    encoded: physicalRecords.map((record, index) => vmInstruction(record, index + 1, mask, seed)).join(",\n"),
  };
}

function buildWatermark(perLine) {
  const text = `CL3-${Date.now().toString(36)}-${randomInt(100000, 999999).toString(36)}`;
  return luaRecord(encodeChunk([...encoder.encode(text)]), perLine);
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

function encodeLua(source, preset, compatible, robloxMode) {
  const names = randomNames(112);
  const bytes = [...encoder.encode(source)];
  const chunks = splitBytes(bytes, preset).map(encodeChunk);
  const perLine = preset === "compact" ? 24 : preset === "heavy" ? 10 : 16;
  const payload = chunks.map((chunk) => luaRecord(chunk, perLine)).join(",\n");
  const stringTable = buildRuntimeStringTable(perLine);
  const watermark = buildWatermark(perLine);
  const guard = randomInt(1000, 9000);
  const opaqueA = randomInt(11, 99);
  const opaqueB = opaqueA * 2;
  const opcodeValues = shuffle([
    randomInt(9, 39),
    randomInt(41, 89),
    randomInt(91, 139),
    randomInt(141, 169),
    randomInt(171, 199),
    randomInt(201, 219),
    randomInt(221, 239),
    randomInt(241, 252),
  ]);
  const opcodes = {
    part: opcodeValues[0],
    exec: opcodeValues[1],
    noise: opcodeValues[2],
    check: opcodeValues[3],
    junk: opcodeValues[4],
    mix: opcodeValues[5],
    probe: opcodeValues[6],
    shadow: opcodeValues[7],
  };
  const instructionMask = randomInt(17, 231);
  const program = buildVmProgram(chunks.length, opcodes, instructionMask);
  const loadPrimary = robloxMode || compatible ? stringTable.indexes.loadstring : stringTable.indexes.load;
  const loadFallback = robloxMode || compatible ? stringTable.indexes.load : stringTable.indexes.loadstring;
  const environmentExpr = robloxMode
    ? `(getfenv and getfenv(0)) or _G or _ENV or {}`
    : `_G or _ENV or (getfenv and getfenv()) or {}`;
  const hookScanLine = robloxMode
    ? `for ${names[72]}=1,#${names[71]} do local ${names[73]}=${names[37]}(${names[71]}[${names[72]}]);if ${names[35]}[${names[73]}]~=nil then ${names[85]}=(${names[85]}+#${names[73]}*${names[72]})%65535 end end`
    : `for ${names[72]}=1,#${names[71]} do local ${names[73]}=${names[37]}(${names[71]}[${names[72]}]);if ${names[35]}[${names[73]}]~=nil then return false end end`;

  const noise =
    preset === "heavy"
      ? [
          `local ${names[44]}=${randomInt(31, 99)}`,
          `local ${names[45]}=function(${names[46]}) return (${names[46]}*${names[44]})%257 end`,
          `${names[44]}=${names[45]}(${names[44]})`,
        ].join("\n")
      : "";

  return [
    `local ${names[0]}=${guard}`,
    `local ${names[18]}=${instructionMask}`,
    `local ${names[64]}=${program.guard}`,
    `local ${names[65]}=${program.records.length}`,
    `local ${names[66]}=${chunks.length}`,
    `local ${names[19]}=${opcodes.part}`,
    `local ${names[20]}=${opcodes.exec}`,
    `local ${names[21]}=${opcodes.noise}`,
    `local ${names[22]}=${opcodes.check}`,
    `local ${names[68]}=${opcodes.junk}`,
    `local ${names[78]}=${opcodes.mix}`,
    `local ${names[79]}=${opcodes.probe}`,
    `local ${names[80]}=${opcodes.shadow}`,
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
    `local ${names[11]}=0`,
    `for ${names[12]}=1,#${names[8]} do ${names[11]}=(${names[11]}+${names[8]}[${names[12]}]*(${names[12]}+${names[9]})+${names[9]})%65535 end`,
    `if ${names[11]}~=${names[7]}[5] then error("integrity failure") end`,
    `local ${names[13]}=(${names[9]}*3+${names[10]})%256`,
    `local ${names[14]}={}`,
    `local ${names[15]}=(function() local ${names[84]}=#tostring({})+${opaqueA};return (((${names[84]}*${names[84]}+${names[84]})%2)==0) and (${opaqueB}/${opaqueA}>1) end)()`,
    `for ${names[12]}=1,#${names[8]} do`,
    `local ${names[16]}=${names[8]}[${names[12]}]`,
    `if ${names[15]} then ${names[14]}[${names[12]}]=${names[2]}((${names[16]}-${names[10]}-((${names[12]}*${names[9]})%256)-${names[13]})%256) else error("runtime blocked") end`,
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
    `local ${names[24]}={${names[25]}={},${names[26]}=${program.start},${names[27]}=0,${names[75]}=0}`,
    `if #${names[23]}~=${program.records.length} then ${names[40]}(${names[37]}(${stringTable.indexes["integrity failure"]})) end`,
    `local function ${names[28]}(${names[29]},${names[30]}) local ${names[62]}=${names[74]};local ${names[67]}=(${names[64]}+${names[65]}+${names[18]}+${names[66]})%256;return (${names[29]}-${names[30]}-${names[24]}.${names[26]}-${names[18]}-${names[67]}+${names[62]})%256 end`,
    `local ${names[63]}={}`,
    `${names[63]}[(${names[19]}+${names[74]})%256]=function(${names[31]}) ${names[24]}.${names[25]}[#${names[24]}.${names[25]}+1]=${names[6]}(${names[1]}[${names[31]}[2]]);${names[24]}.${names[27]}=(${names[24]}.${names[27]}+${names[31]}[3]+#${names[24]}.${names[25]})%65535;${names[24]}.${names[26]}=${names[31]}[4] end`,
    `${names[63]}[(${names[22]}+${names[74]})%256]=function(${names[31]}) if ${names[31]}[2]~=${names[31]}[3] then ${names[40]}(${names[37]}(${stringTable.indexes["integrity failure"]})) end;${names[24]}.${names[26]}=${names[31]}[4] end`,
    `${names[63]}[(${names[21]}+${names[74]})%256]=function(${names[31]}) ${names[24]}.${names[27]}=(${names[24]}.${names[27]}+${names[31]}[2]*${names[31]}[3])%65535;${names[24]}.${names[26]}=${names[31]}[4] end`,
    `${names[63]}[(${names[68]}+${names[74]})%256]=function(${names[31]}) local ${names[76]}=(${names[31]}[2]*7+${names[31]}[3]*13+#${names[24]}.${names[25]})%257;${names[24]}.${names[75]}=(${names[24]}.${names[75]}+${names[76]}-${names[76]})%65535;${names[24]}.${names[26]}=${names[31]}[4] end`,
    `${names[63]}[(${names[78]}+${names[74]})%256]=function(${names[31]}) local ${names[81]}=(${names[31]}[2]+${names[31]}[3]+${names[24]}.${names[27]})%256;${names[24]}.${names[75]}=(${names[24]}.${names[75]}+${names[81]}-${names[81]})%65535;${names[24]}.${names[26]}=${names[31]}[4] end`,
    `${names[63]}[(${names[79]}+${names[74]})%256]=function(${names[31]}) if ((${names[31]}[2]-${names[31]}[3])%1)~=0 then ${names[40]}(${names[37]}(${stringTable.indexes["integrity failure"]})) end;${names[24]}.${names[26]}=${names[31]}[4] end`,
    `${names[63]}[(${names[80]}+${names[74]})%256]=function(${names[31]}) local ${names[82]}=tostring(${names[31]}[2]*${names[31]}[3]);if #${names[82]}<1 then ${names[40]}(${names[37]}(${stringTable.indexes["runtime blocked"]})) end;${names[24]}.${names[26]}=${names[31]}[4] end`,
    `${names[63]}[(${names[20]}+${names[74]})%256]=function() ${names[24]}.${names[26]}=0 end`,
    `local function ${names[17]}()`,
    `while ${names[24]}.${names[26]} and ${names[24]}.${names[26]}>0 and ${names[24]}.${names[26]}<=#${names[23]} do`,
    `local ${names[31]}=${names[23]}[${names[24]}.${names[26]}]`,
    `local ${names[32]}=${names[28]}(${names[31]}[1],${names[31]}[5])`,
    `local ${names[5]}=${names[63]}[${names[32]}]`,
    `if not ${names[5]} then ${names[40]}(${names[37]}(${stringTable.indexes["runtime blocked"]})) end`,
    `if ((((${names[32]}+${names[24]}.${names[26]})*((${names[32]}+${names[24]}.${names[26]})+1))%2)==0) and (((${names[24]}.${names[26]}*${names[24]}.${names[26]}+${names[24]}.${names[26]})%2)==0) then ${names[5]}(${names[31]}) else ${names[40]}(${names[37]}(${stringTable.indexes["runtime blocked"]})) end`,
    "end",
    `${names[1]}=nil;${names[23]}=nil`,
    `return ${names[3]}(${names[24]}.${names[25]})`,
    "end",
    `local ${names[16]}=${names[4]}(${names[17]}())`,
    `${names[17]}=nil`,
    `if ${names[0]}~=${guard} then ${names[40]}(${names[37]}(${stringTable.indexes["runtime blocked"]})) end`,
    `return ${names[16]}()`,
  ].filter(Boolean).join("\n");
}

function addBanner(source) {
  if (!bannerToggle.checked) return source;
  return `-- CoolLight v3\n-- VM Pack + Dynamic Key Lua Protection\n${source}`;
}

function obfuscate() {
  const source = inputCode.value.trim();
  if (!source) {
    outputCode.value = "";
    setStatus("emptyInput", "error");
    updateStats();
    return;
  }

  try {
    const preset = presetSelect.value;
    const base = wrapControlFlow(minifyLua(source));
    const result = encodeLua(base, preset, compatToggle.checked, robloxToggle.checked);

    outputCode.value = addBanner(result);
    setStatus("done");
    updateStats();
  } catch (error) {
    setStatus("failed", "error");
    outputCode.value = `-- Error: ${error.message}`;
    updateStats();
  }
}

async function copyOutput() {
  if (!outputCode.value) {
    setStatus("noOutput", "error");
    return;
  }

  try {
    await navigator.clipboard.writeText(outputCode.value);
    setStatus("copied");
  } catch {
    outputCode.select();
    document.execCommand("copy");
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
  if (!outputCode.value) {
    setStatus("noOutput", "error");
    return;
  }

  const blob = new Blob([outputCode.value], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "coollight-v3-obfuscated.lua";
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
    hue: Math.random() > 0.5 ? "244, 190, 42" : "255, 255, 255",
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
  outputCode.value = "";
  setStatus("cleared");
  updateStats();
});
window.addEventListener("resize", () => {
  resizeCanvas();
  resetParticles();
});

resizeCanvas();
resetParticles();
drawSignal();
applyLanguage(currentLanguage);
updateStats();
