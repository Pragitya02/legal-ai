import { jsPDF } from 'jspdf'

// Builds a real PDF (via the existing jsPDF dependency) from Markdown-style text.
const BRONZE: [number, number, number] = [194, 118, 53]

// Characters the built-in PDF font (WinAnsi) can draw as real, selectable text.
// Anything else (Hindi/Devanagari, Gurmukhi, Tamil, ₹, arrows, emoji ...) is drawn by the
// browser's own text engine onto a canvas, which handles Unicode shaping correctly,
// and embedded as an image. No font files or extra libraries are needed.
const VECTOR_SAFE =
  /^[\u0020-\u007E\u00A0-\u00FF\u2013\u2014\u2018\u2019\u201C\u201D\u2022\u2026\u20AC\u2122]*$/
const CANVAS_FONT =
  '"Noto Sans","Noto Sans Devanagari","Noto Sans Gurmukhi","Noto Sans Bengali","Noto Sans Tamil","Nirmala UI","Mangal","Segoe UI","Arial Unicode MS","Apple Color Emoji","Segoe UI Emoji",sans-serif'
const SCALE = 3

function graphemes(text: string): string[] {
  const Seg = (Intl as unknown as { Segmenter?: new (l?: string, o?: object) => { segment(s: string): Iterable<{ segment: string }> } }).Segmenter
  return Seg ? Array.from(new Seg(undefined, { granularity: 'grapheme' }).segment(text), (x) => x.segment) : Array.from(text)
}

function wrapCanvas(ctx: CanvasRenderingContext2D, text: string, maxPx: number): string[] {
  const out: string[] = []
  let line = ''
  const push = (w: string) => {
    const test = line ? `${line} ${w}` : w
    if (ctx.measureText(test).width <= maxPx) {
      line = test
      return
    }
    if (line) out.push(line)
    line = ''
    if (ctx.measureText(w).width <= maxPx) {
      line = w
      return
    }
    for (const g of graphemes(w)) {
      if (line && ctx.measureText(line + g).width > maxPx) {
        out.push(line)
        line = ''
      }
      line += g
    }
  }
  text.split(/\s+/).filter(Boolean).forEach(push)
  if (line) out.push(line)
  return out.length ? out : ['']
}

const strip = (s: string) =>
  s
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/(^|\s)[*_](.+?)[*_](?=\s|$)/g, '$1$2')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)')

export function buildPdf(title: string, markdown: string): jsPDF {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  const M = 56
  const maxW = W - M * 2
  let y = M

  const ensure = (h: number) => {
    if (y + h > H - M) {
      doc.addPage()
      y = M
    }
  }

  const write = (
    text: string,
    size: number,
    style: 'normal' | 'bold',
    indent = 0,
    gap = 4,
    color: [number, number, number] = [30, 30, 30],
  ) => {
    const lh = size * 1.35
    const width = maxW - indent

    if (VECTOR_SAFE.test(text)) {
      doc.setFont('helvetica', style)
      doc.setFontSize(size)
      doc.setTextColor(...color)
      for (const line of doc.splitTextToSize(text, width) as string[]) {
        ensure(lh)
        doc.text(line, M + indent, y + size)
        y += lh
      }
    } else {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Canvas is not available for non-Latin text.')
      const font = `${style === 'bold' ? 'bold ' : ''}${size * SCALE}px ${CANVAS_FONT}`
      ctx.font = font
      const lines = wrapCanvas(ctx, text, width * SCALE)
      canvas.width = Math.ceil(width * SCALE)
      canvas.height = Math.ceil(lh * SCALE)
      for (const line of lines) {
        ensure(lh)
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.font = font // resizing a canvas resets its state
        ctx.fillStyle = `rgb(${color.join(',')})`
        ctx.textBaseline = 'middle'
        ctx.fillText(line, 0, canvas.height / 2)
        doc.addImage(canvas.toDataURL('image/png'), 'PNG', M + indent, y, width, lh, undefined, 'FAST')
        y += lh
      }
    }
    y += gap
  }

  const rows = markdown.replace(/\r/g, '').split('\n')
  let firstHeading = true

  for (const raw of rows) {
    const line = raw.trimEnd()
    if (!line.trim()) {
      y += 4
      continue
    }
    const h = line.match(/^(#{1,4})\s+(.*)$/)
    if (h) {
      const level = h[1].length
      const text = strip(h[2])
      if (level === 1 && firstHeading) {
        firstHeading = false
        write(text, 22, 'bold', 0, 6, BRONZE)
        doc.setDrawColor(...BRONZE)
        doc.setLineWidth(1)
        doc.line(M, y, W - M, y)
        y += 14
      } else {
        y += level <= 2 ? 6 : 2
        write(text, level <= 2 ? 15 : 12, 'bold', 0, 4)
      }
      continue
    }
    if (/^\s*(-{3,}|\*{3,})\s*$/.test(line)) {
      ensure(10)
      doc.setDrawColor(200, 200, 200)
      doc.line(M, y + 4, W - M, y + 4)
      y += 10
      continue
    }
    const bullet = line.match(/^(\s*)[-*•]\s+(.*)$/)
    if (bullet) {
      const ind = 14 + Math.min(bullet[1].length, 8) * 4
      ensure(14)
      doc.setFillColor(...BRONZE)
      doc.circle(M + ind - 8, y + 7, 1.8, 'F')
      write(strip(bullet[2]), 11, 'normal', ind, 2)
      continue
    }
    const num = line.match(/^(\s*)(\d+)[.)]\s+(.*)$/)
    if (num) {
      write(`${num[2]}.  ${strip(num[3])}`, 11, 'normal', 14, 2)
      continue
    }
    if (/^\|.*\|$/.test(line.trim())) {
      if (/^\|[\s:|-]+\|$/.test(line.trim())) continue
      const cells = line.trim().slice(1, -1).split('|').map((c) => strip(c.trim()))
      write(cells.join('   |   '), 10, 'normal', 0, 2)
      continue
    }
    write(strip(line), 11, 'normal', 0, 6)
  }

  const pages = doc.getNumberOfPages()
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(140, 140, 140)
    if (VECTOR_SAFE.test(title)) doc.text(title.slice(0, 70), M, H - 28)
    doc.text(`Page ${i} of ${pages}`, W - M, H - 28, { align: 'right' })
  }
  return doc
}

export const pdfFileName = (title: string) =>
  (title.replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '').slice(0, 60) || 'document') + '.pdf'

export function pdfBlobUrl(title: string, markdown: string): string {
  return URL.createObjectURL(buildPdf(title, markdown).output('blob'))
}

export function downloadPdf(title: string, markdown: string) {
  buildPdf(title, markdown).save(pdfFileName(title))
}
