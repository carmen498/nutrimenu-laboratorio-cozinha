const encoder = new TextEncoder();

function u16(value) {
  return Uint8Array.of(value & 255, (value >>> 8) & 255);
}

function u32(value) {
  return Uint8Array.of(value & 255, (value >>> 8) & 255, (value >>> 16) & 255, (value >>> 24) & 255);
}

function juntar(partes) {
  const total = partes.reduce((soma, parte) => soma + parte.length, 0);
  const saida = new Uint8Array(total);
  let offset = 0;
  for (const parte of partes) {
    saida.set(parte, offset);
    offset += parte.length;
  }
  return saida;
}

function criarTabelaCrc32() {
  const tabela = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    tabela[n] = c >>> 0;
  }
  return tabela;
}

const tabelaCrc32 = criarTabelaCrc32();

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = tabelaCrc32[(crc ^ byte) & 255] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function dataDos(data) {
  const ano = Math.max(1980, data.getUTCFullYear());
  const hora = (data.getUTCHours() << 11) | (data.getUTCMinutes() << 5) | Math.floor(data.getUTCSeconds() / 2);
  const dia = ((ano - 1980) << 9) | ((data.getUTCMonth() + 1) << 5) | data.getUTCDate();
  return { hora, dia };
}

export function textoBytes(texto) {
  return encoder.encode(texto);
}

export async function sha256Hex(bytes) {
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return Array.from(hash, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function criarZipSemCompressao(arquivos, data = new Date()) {
  const locais = [];
  const centrais = [];
  let offset = 0;
  const dos = dataDos(data);

  for (const arquivo of arquivos) {
    const nome = encoder.encode(arquivo.nome);
    const dados = arquivo.bytes;
    const crc = crc32(dados);
    const local = juntar([
      u32(0x04034b50), u16(20), u16(0x0800), u16(0), u16(dos.hora), u16(dos.dia),
      u32(crc), u32(dados.length), u32(dados.length), u16(nome.length), u16(0), nome, dados,
    ]);
    locais.push(local);

    const central = juntar([
      u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(0), u16(dos.hora), u16(dos.dia),
      u32(crc), u32(dados.length), u32(dados.length), u16(nome.length), u16(0), u16(0),
      u16(0), u16(0), u32(0), u32(offset), nome,
    ]);
    centrais.push(central);
    offset += local.length;
  }

  const diretorio = juntar(centrais);
  const fim = juntar([
    u32(0x06054b50), u16(0), u16(0), u16(arquivos.length), u16(arquivos.length),
    u32(diretorio.length), u32(offset), u16(0),
  ]);
  return juntar([...locais, diretorio, fim]);
}