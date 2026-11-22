import { instituto } from '../config/instituto.js';
import { fechaLarga } from './pdf.js';

const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const NIVEL = { tecnico: 'Técnico', tecnologo: 'Tecnólogo' };
const ESTADO = { activa: 'Activa', graduada: 'Graduada', pendiente: 'Pendiente', retirada: 'Retirada' };
const dinero = (n) => '$' + Number(n || 0).toLocaleString('es-CO');
const codigoVisible = (c) => c.match(/.{1,4}/g).join('-');

// Solo se muestran los últimos 3 dígitos del documento: la página es pública
const documentoOculto = (tipo, numero) => {
    const n = String(numero);
    return `${tipo} ${'•'.repeat(Math.max(0, n.length - 3))}${n.slice(-3)}`;
};

const ESTILOS = `
:root{--fondo:#f2f5f9;--tarjeta:#ffffff;--texto:#1d2733;--suave:#5c6b7a;--linea:#e3e9f0;--azul:#1f3a5f;
--ok:#1a7f4b;--ok-fondo:#e6f5ec;--aviso:#9a6700;--aviso-fondo:#fff4d6;--mal:#b42318;--mal-fondo:#fdeceb}
@media (prefers-color-scheme:dark){:root{--fondo:#10161d;--tarjeta:#18212b;--texto:#e8eef5;--suave:#9aa9b8;--linea:#2a3644;--azul:#8db4ea;
--ok:#5fd394;--ok-fondo:#12301f;--aviso:#f0c14b;--aviso-fondo:#33290e;--mal:#ff8f85;--mal-fondo:#3a1713}}
*{box-sizing:border-box}
body{margin:0;background:var(--fondo);color:var(--texto);font:16px/1.5 system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif}
main{max-width:560px;margin:0 auto;padding:24px 16px 40px}
.marca{text-align:center;margin-bottom:18px}
.marca b{display:block;font-size:22px;color:var(--azul);letter-spacing:.5px}
.marca span{color:var(--suave);font-size:14px}
.tarjeta{background:var(--tarjeta);border:1px solid var(--linea);border-radius:14px;overflow:hidden}
.estado{padding:20px;text-align:center}
.estado .icono{font-size:34px;line-height:1}
.estado h1{margin:8px 0 4px;font-size:22px}
.estado p{margin:0;font-size:15px}
.estado.ok{background:var(--ok-fondo);color:var(--ok)}
.estado.aviso{background:var(--aviso-fondo);color:var(--aviso)}
.estado.mal{background:var(--mal-fondo);color:var(--mal)}
dl{margin:0;padding:6px 20px 14px}
dl div{padding:11px 0;border-bottom:1px solid var(--linea)}
dl div:last-child{border-bottom:0}
dt{font-size:12px;text-transform:uppercase;letter-spacing:.6px;color:var(--suave)}
dd{margin:2px 0 0;font-size:16px;font-weight:600;word-break:break-word}
.codigo{font-family:ui-monospace,Consolas,monospace;letter-spacing:1px}
.nota{margin:16px 4px 0;font-size:13px;color:var(--suave);text-align:center}
form{padding:20px}
label{display:block;font-size:14px;color:var(--suave);margin-bottom:6px}
input{width:100%;padding:12px;font:inherit;font-family:ui-monospace,Consolas,monospace;letter-spacing:1px;
border:1px solid var(--linea);border-radius:10px;background:var(--fondo);color:var(--texto);text-transform:uppercase}
button{margin-top:12px;width:100%;padding:12px;font:inherit;font-weight:600;border:0;border-radius:10px;background:var(--azul);color:#fff;cursor:pointer}
@media (prefers-color-scheme:dark){button{color:#10161d}}
`;

const pagina = (titulo, cuerpo) => `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${esc(titulo)} - ${esc(instituto.nombre)}</title>
<style>${ESTILOS}</style>
</head>
<body>
<main>
<div class="marca"><b>${esc(instituto.nombre)}</b><span>Verificación de documentos</span></div>
${cuerpo}
</main>
</body>
</html>`;

const fila = (etiqueta, valor, clase = '') =>
    `<div><dt>${esc(etiqueta)}</dt><dd${clase ? ` class="${clase}"` : ''}>${esc(valor)}</dd></div>`;

export const paginaFormulario = (mensaje = '') => pagina('Verificar documento', `
<div class="tarjeta">
<form method="GET" action="/verificar">
<label for="codigo">Código del documento</label>
<input id="codigo" name="codigo" placeholder="XXXX-XXXX-XXXX" maxlength="20" autocomplete="off" required>
<button type="submit">Verificar</button>
${mensaje ? `<p class="nota" style="color:var(--mal)">${esc(mensaje)}</p>` : ''}
</form>
</div>
<p class="nota">El código está impreso junto al QR, al final del documento.</p>`);

export const paginaNoEncontrada = () => pagina('Documento no encontrado', `
<div class="tarjeta">
<div class="estado mal">
<div class="icono">✖</div>
<h1>Documento no encontrado</h1>
<p>El código no existe en nuestros registros.</p>
</div>
<dl>${fila('Qué significa', 'Si recibió este documento con ese código, no debe considerarse válido. Verifique que el código esté bien escrito.')}</dl>
</div>
<p class="nota"><a href="/verificar" style="color:var(--azul)">Escribir el código manualmente</a></p>`);

export const paginaError = () => pagina('Error', `
<div class="tarjeta"><div class="estado aviso">
<div class="icono">!</div>
<h1>No pudimos consultar el documento</h1>
<p>Intente de nuevo en unos minutos.</p>
</div></div>`);

// d: fila de la consulta (documento + matrícula + estudiante + programa + pago)
export const paginaDocumento = (d, emitido) => {
    const esRecibo = d.tipo === 'recibo';
    const esCertificado = d.tipo === 'certificado';
    const anulado = !d.vigente;
    // La constancia exige matrícula activa o graduada; el certificado exige que siga graduada
    const matriculaVigente = esCertificado ? d.estado === 'graduada' : ['activa', 'graduada'].includes(d.estado);
    const nombreDoc = esRecibo ? 'Recibo de pago' : esCertificado ? 'Certificado de estudios' : 'Constancia de matrícula';

    let clase = 'ok';
    let icono = '✔';
    let titulo = 'Documento válido';
    let detalle = esRecibo
        ? 'Este recibo fue emitido por la institución.'
        : `Este ${esCertificado ? 'certificado' : 'documento'} fue emitido por la institución y los datos coinciden con nuestros registros.`;

    if (anulado) {
        clase = 'mal'; icono = '✖'; titulo = 'Documento anulado';
        detalle = 'Este documento fue emitido, pero ya no tiene validez.';
    } else if (!esRecibo && !matriculaVigente) {
        clase = 'aviso'; icono = '!'; titulo = 'Documento auténtico, matrícula no vigente';
        detalle = `El documento es auténtico, pero la matrícula hoy figura como ${(ESTADO[d.estado] || d.estado).toLowerCase()}.`;
    }

    const filas = [
        fila('Documento', nombreDoc),
        fila('Estudiante', `${d.nombres} ${d.apellidos}`.toUpperCase()),
        fila('Identificación', documentoOculto(d.tipo_documento, d.documento)),
        fila('Programa', `${d.programa} (${NIVEL[d.nivel] || d.nivel})`),
        fila('Periodo', d.periodo)
    ];
    if (esRecibo) {
        filas.push(fila('Concepto', `Cuota ${d.numero_cuota} de ${d.num_cuotas}`));
        filas.push(fila('Valor pagado', dinero(d.valor)));
        filas.push(fila('Fecha de pago', fechaLarga(d.fecha_pago)));
    } else {
        filas.push(fila('Estado de la matrícula', ESTADO[d.estado] || d.estado));
        filas.push(fila('Fecha de matrícula', fechaLarga(d.fecha_matricula)));
    }
    filas.push(fila('Emitido el', fechaLarga(emitido)));
    filas.push(fila('Código', codigoVisible(d.codigo), 'codigo'));

    return pagina(titulo, `
<div class="tarjeta">
<div class="estado ${clase}">
<div class="icono">${icono}</div>
<h1>${esc(titulo)}</h1>
<p>${esc(detalle)}</p>
</div>
<dl>${filas.join('')}</dl>
</div>
<p class="nota">Compare estos datos con el documento que recibió. Por privacidad, solo se muestran los últimos 3 dígitos de la identificación.</p>`);
};
