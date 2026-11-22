import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import fs from 'fs';
import { instituto } from '../config/instituto.js';

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
    'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

// '2026-11-21' -> '21 de noviembre de 2026' (sin pasar por Date, para evitar corrimientos de zona horaria)
export const fechaLarga = (iso) => {
    const [a, m, d] = String(iso).slice(0, 10).split('-').map(Number);
    return `${d} de ${MESES[m - 1]} de ${a}`;
};

const dinero = (n) => '$' + Number(n || 0).toLocaleString('es-CO');
const NIVEL = { tecnico: 'técnico', tecnologo: 'tecnólogo' };
const ESTADO = { activa: 'Activa', graduada: 'Graduada', pendiente: 'Pendiente', retirada: 'Retirada' };
const codigoVisible = (c) => c.match(/.{1,4}/g).join('-');
const nombreCompleto = (d) => `${d.nombres} ${d.apellidos}`.toUpperCase();

const AZUL = '#1f3a5f';
const GRIS = '#555555';
const TEXTO = '#222222';
const MARGEN = 60;
const ANCHO = 595.28 - MARGEN * 2; // A4 menos márgenes

const crearDoc = (titulo) => {
    const doc = new PDFDocument({
        size: 'A4',
        margin: MARGEN,
        info: { Title: titulo, Author: instituto.nombre }
    });
    const partes = [];
    const terminado = new Promise((resolve, reject) => {
        doc.on('data', (p) => partes.push(p));
        doc.on('end', () => resolve(Buffer.concat(partes)));
        doc.on('error', reject);
    });
    return { doc, terminado };
};

const encabezado = (doc) => {
    const hayLogo = instituto.logoPath && fs.existsSync(instituto.logoPath);
    const x = hayLogo ? MARGEN + 90 : MARGEN;
    const ancho = hayLogo ? ANCHO - 90 : ANCHO;
    if (hayLogo) doc.image(instituto.logoPath, MARGEN, 42, { fit: [80, 60] });

    doc.fillColor(AZUL).font('Helvetica-Bold').fontSize(20)
        .text(instituto.nombre, x, 46, { width: ancho, align: 'center' });
    doc.fillColor(GRIS).font('Helvetica').fontSize(10);
    if (instituto.subtitulo) doc.text(instituto.subtitulo, x, doc.y + 2, { width: ancho, align: 'center' });
    const linea = [instituto.nit ? `NIT ${instituto.nit}` : '', instituto.ciudad].filter(Boolean).join('  ·  ');
    if (linea) doc.text(linea, x, doc.y + 1, { width: ancho, align: 'center' });

    doc.moveTo(MARGEN, 112).lineTo(MARGEN + ANCHO, 112).lineWidth(1.5).strokeColor(AZUL).stroke();
};

const titulo = (doc, texto, y) => {
    doc.fillColor(AZUL).font('Helvetica-Bold').fontSize(16)
        .text(texto, MARGEN, y, { width: ANCHO, align: 'center' });
};

// Escribe un párrafo con partes en negrilla: [['texto', false], ['negrilla', true], ...]
const parrafo = (doc, partes, opciones = {}) => {
    const opts = { width: ANCHO, align: 'left', lineGap: 6, ...opciones };
    partes.forEach(([texto, negrita], i) => {
        doc.fillColor(TEXTO).font(negrita ? 'Helvetica-Bold' : 'Helvetica')
            .text(texto, { ...opts, continued: i < partes.length - 1 });
    });
};

const firma = (doc, y) => {
    const x1 = MARGEN + ANCHO / 2 - 110;
    doc.moveTo(x1, y).lineTo(x1 + 220, y).lineWidth(0.8).strokeColor(TEXTO).stroke();
    let siguiente = y + 6;
    if (instituto.firmante) {
        doc.fillColor(TEXTO).font('Helvetica-Bold').fontSize(11)
            .text(instituto.firmante, MARGEN, siguiente, { width: ANCHO, align: 'center' });
        siguiente = doc.y + 1;
    }
    if (instituto.cargoFirmante) {
        doc.fillColor(GRIS).font('Helvetica').fontSize(10)
            .text(instituto.cargoFirmante, MARGEN, siguiente, { width: ANCHO, align: 'center' });
    }
};

// Bloque inferior con QR, código y dirección de verificación
const bloqueVerificacion = async (doc, codigo, url) => {
    const png = await QRCode.toBuffer(url, { margin: 1, width: 300, errorCorrectionLevel: 'M' });
    const y = 676;
    const xt = MARGEN + 108;
    const at = ANCHO - 108;
    doc.moveTo(MARGEN, y - 12).lineTo(MARGEN + ANCHO, y - 12).lineWidth(0.5).strokeColor('#bbbbbb').stroke();
    doc.image(png, MARGEN, y, { width: 92 });
    doc.fillColor(AZUL).font('Helvetica-Bold').fontSize(11)
        .text('Verificación de autenticidad', xt, y + 4, { width: at });
    doc.fillColor(TEXTO).font('Helvetica-Bold').fontSize(10)
        .text(`Código: ${codigoVisible(codigo)}`, xt, doc.y + 4, { width: at });
    doc.fillColor(GRIS).font('Helvetica').fontSize(9)
        .text('Escanee el código QR o ingrese a esta dirección para comprobar que el documento es válido:',
            xt, doc.y + 4, { width: at });
    doc.fillColor(AZUL).fontSize(9).text(url, xt, doc.y + 2, { width: at, link: url });
};

export const construirConstancia = async ({ m, codigo, url, fecha }) => {
    const { doc, terminado } = crearDoc(`Constancia de matrícula - ${m.documento}`);
    encabezado(doc);
    titulo(doc, 'CONSTANCIA DE MATRÍCULA', 150);

    doc.fillColor(TEXTO).font('Helvetica-Bold').fontSize(12)
        .text('HACE CONSTAR', MARGEN, 215, { width: ANCHO, align: 'center' });

    doc.fontSize(12);
    doc.x = MARGEN; doc.y = 250;
    const partes = [
        ['Que ', false], [nombreCompleto(m), true],
        [', identificado(a) con ', false], [`${m.tipo_documento} No. ${m.documento}`, true],
        [', se encuentra matriculado(a) en el programa ', false], [m.programa, true],
        [`, de nivel ${NIVEL[m.nivel] || m.nivel}, en modalidad a distancia, para el periodo académico `, false],
        [m.periodo, true]
    ];
    if (m.duracion_meses) partes.push([`, con una duración de ${m.duracion_meses} meses`, false]);
    partes.push([`. La matrícula se realizó el ${fechaLarga(m.fecha_matricula)} y su estado actual es `, false]);
    partes.push([ESTADO[m.estado] || m.estado, true], ['.', false]);
    parrafo(doc, partes);

    doc.moveDown(1.2);
    parrafo(doc, [[
        `La presente constancia se expide a solicitud del interesado${instituto.ciudad ? ` en ${instituto.ciudad}` : ''}, el ${fechaLarga(fecha)}.`,
        false
    ]]);

    firma(doc, 500);
    await bloqueVerificacion(doc, codigo, url);
    const listo = terminado;
    doc.end();
    return listo;
};

export const construirRecibo = async ({ r, codigo, url }) => {
    const { doc, terminado } = crearDoc(`Recibo de pago ${String(r.id).padStart(6, '0')}`);
    encabezado(doc);
    titulo(doc, 'RECIBO DE PAGO', 150);
    doc.fillColor(GRIS).font('Helvetica').fontSize(11)
        .text(`No. ${String(r.id).padStart(6, '0')}`, MARGEN, 176, { width: ANCHO, align: 'center' });

    const filas = [
        ['Recibido de', nombreCompleto(r)],
        ['Documento', `${r.tipo_documento} ${r.documento}`],
        ['Programa', `${r.programa} (${NIVEL[r.nivel] || r.nivel})`],
        ['Periodo', r.periodo],
        ['Concepto', `Cuota ${r.numero_cuota} de ${r.num_cuotas}`],
        ['Método de pago', r.metodo || '—'],
        ['Fecha de pago', fechaLarga(r.fecha_pago)]
    ];
    let y = 215;
    filas.forEach(([etiqueta, valor]) => {
        doc.fillColor(GRIS).font('Helvetica-Bold').fontSize(10).text(etiqueta, MARGEN, y, { width: 130 });
        doc.fillColor(TEXTO).font('Helvetica').fontSize(11).text(String(valor), MARGEN + 140, y - 1, { width: ANCHO - 140 });
        y = Math.max(doc.y, y + 16) + 6;
    });

    y += 8;
    doc.roundedRect(MARGEN, y, ANCHO, 54, 6).fillAndStroke('#eef3f9', AZUL);
    doc.fillColor(GRIS).font('Helvetica-Bold').fontSize(10).text('VALOR PAGADO', MARGEN + 16, y + 10);
    doc.fillColor(AZUL).font('Helvetica-Bold').fontSize(22)
        .text(dinero(r.valor), MARGEN + 16, y + 24, { width: ANCHO - 32, align: 'right' });

    y += 54 + 22;
    const resumen = [
        ['Valor total de la matrícula', dinero(r.total_cuotas)],
        ['Pagado a la fecha (incluye este recibo)', dinero(r.pagado_hasta_aqui)],
        ['Saldo pendiente', dinero(r.saldo)]
    ];
    resumen.forEach(([etiqueta, valor], i) => {
        const negrita = i === resumen.length - 1;
        doc.fillColor(negrita ? TEXTO : GRIS).font(negrita ? 'Helvetica-Bold' : 'Helvetica').fontSize(10)
            .text(etiqueta, MARGEN, y, { width: ANCHO - 120 });
        doc.fillColor(TEXTO).font(negrita ? 'Helvetica-Bold' : 'Helvetica').fontSize(10)
            .text(valor, MARGEN + ANCHO - 120, y, { width: 120, align: 'right' });
        y += 18;
    });

    firma(doc, 600);
    await bloqueVerificacion(doc, codigo, url);
    const listo = terminado;
    doc.end();
    return listo;
};
