import { jsPDF } from 'jspdf'

// Builds a real PDF (via the existing jsPDF dependency) from Markdown-style text.
const BRONZE: [number, number, number] = [194, 118, 53]

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
    doc.setFont('helvetica', style)
    doc.setFontSize(size)
    doc.setTextColor(...color)
    const lines = doc.splitTextToSize(text, maxW - indent) as string[]
    const lh = size * 1.35
    for (const line of lines) {
      ensure(lh)
      doc.text(line, M + indent, y + size)
      y += lh
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
    doc.text(`${title.slice(0, 70)}`, M, H - 28)
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
