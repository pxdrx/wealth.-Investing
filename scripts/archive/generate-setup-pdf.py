"""Generate PDF from the MacBook M2 setup guide."""
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.colors import HexColor, black, white
from reportlab.lib.units import mm, cm
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether, HRFlowable, Preformatted
)
from reportlab.lib import colors
import re
import os

# Output path
OUTPUT = os.path.join(os.path.dirname(os.path.dirname(__file__)), "docs", "setup-macbook-m2.pdf")

# Colors
BRAND_BLUE = HexColor("#1a1a2e")
BRAND_ACCENT = HexColor("#4f46e5")
CODE_BG = HexColor("#f1f5f9")
CODE_BORDER = HexColor("#e2e8f0")
SECTION_BG = HexColor("#f8fafc")
CHECK_GREEN = HexColor("#16a34a")
WARN_AMBER = HexColor("#d97706")

styles = getSampleStyleSheet()

# Custom styles
styles.add(ParagraphStyle(
    'DocTitle', parent=styles['Title'],
    fontSize=24, leading=30, textColor=BRAND_BLUE,
    spaceAfter=4, fontName='Helvetica-Bold'
))
styles.add(ParagraphStyle(
    'DocSubtitle', parent=styles['Normal'],
    fontSize=11, leading=14, textColor=HexColor("#64748b"),
    spaceAfter=20, fontName='Helvetica'
))
styles.add(ParagraphStyle(
    'H1', parent=styles['Heading1'],
    fontSize=18, leading=22, textColor=BRAND_BLUE,
    spaceBefore=24, spaceAfter=10, fontName='Helvetica-Bold'
))
styles.add(ParagraphStyle(
    'H2', parent=styles['Heading2'],
    fontSize=14, leading=18, textColor=BRAND_ACCENT,
    spaceBefore=16, spaceAfter=8, fontName='Helvetica-Bold'
))
styles.add(ParagraphStyle(
    'H3', parent=styles['Heading3'],
    fontSize=12, leading=15, textColor=HexColor("#334155"),
    spaceBefore=12, spaceAfter=6, fontName='Helvetica-Bold'
))
styles.add(ParagraphStyle(
    'Body', parent=styles['Normal'],
    fontSize=10, leading=14, textColor=HexColor("#1e293b"),
    spaceAfter=6, fontName='Helvetica'
))
styles.add(ParagraphStyle(
    'CodeBlock', parent=styles['Normal'],
    fontSize=8.5, leading=12, fontName='Courier',
    textColor=HexColor("#1e293b"), backColor=CODE_BG,
    borderColor=CODE_BORDER, borderWidth=0.5, borderPadding=8,
    spaceBefore=4, spaceAfter=8, leftIndent=8, rightIndent=8
))
styles.add(ParagraphStyle(
    'InlineCode', parent=styles['Normal'],
    fontSize=9, fontName='Courier', textColor=BRAND_ACCENT
))
styles.add(ParagraphStyle(
    'BulletItem', parent=styles['Normal'],
    fontSize=10, leading=14, textColor=HexColor("#1e293b"),
    leftIndent=20, bulletIndent=8, spaceAfter=3,
    fontName='Helvetica'
))
styles.add(ParagraphStyle(
    'CheckItem', parent=styles['Normal'],
    fontSize=10, leading=14, textColor=HexColor("#1e293b"),
    leftIndent=20, bulletIndent=8, spaceAfter=3,
    fontName='Helvetica'
))
styles.add(ParagraphStyle(
    'Warning', parent=styles['Normal'],
    fontSize=10, leading=14, textColor=WARN_AMBER,
    backColor=HexColor("#fffbeb"), borderColor=WARN_AMBER,
    borderWidth=0.5, borderPadding=8, spaceBefore=6, spaceAfter=8,
    leftIndent=8, rightIndent=8, fontName='Helvetica-Bold'
))
styles.add(ParagraphStyle(
    'TableCell', parent=styles['Normal'],
    fontSize=9, leading=12, fontName='Helvetica'
))
styles.add(ParagraphStyle(
    'TableHeader', parent=styles['Normal'],
    fontSize=9, leading=12, fontName='Helvetica-Bold', textColor=white
))


def escape_xml(text):
    """Escape XML special chars for reportlab."""
    text = text.replace("&", "&amp;")
    text = text.replace("<", "&lt;")
    text = text.replace(">", "&gt;")
    return text


def format_inline(text):
    """Convert inline markdown to reportlab XML."""
    # Bold
    text = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', text)
    # Inline code
    text = re.sub(r'`([^`]+)`', r'<font name="Courier" size="9" color="#4f46e5">\1</font>', text)
    # Links — just show text
    text = re.sub(r'\[([^\]]+)\]\([^\)]+\)', r'<u>\1</u>', text)
    return text


def parse_markdown_to_flowables(md_text):
    """Parse markdown into reportlab flowables."""
    flowables = []
    lines = md_text.split('\n')
    i = 0
    in_code_block = False
    code_lines = []
    first_heading = True

    while i < len(lines):
        line = lines[i]

        # Code block toggle
        if line.strip().startswith('```'):
            if in_code_block:
                # End code block
                code_text = escape_xml('\n'.join(code_lines))
                if code_text.strip():
                    flowables.append(Paragraph(code_text.replace('\n', '<br/>'), styles['CodeBlock']))
                code_lines = []
                in_code_block = False
            else:
                in_code_block = True
                code_lines = []
            i += 1
            continue

        if in_code_block:
            code_lines.append(line)
            i += 1
            continue

        stripped = line.strip()

        # Skip empty lines
        if not stripped:
            i += 1
            continue

        # Horizontal rule
        if stripped == '---':
            flowables.append(Spacer(1, 6))
            flowables.append(HRFlowable(
                width="100%", thickness=1,
                color=HexColor("#e2e8f0"), spaceAfter=6
            ))
            i += 1
            continue

        # Headings
        if stripped.startswith('# ') and not stripped.startswith('## '):
            text = format_inline(stripped[2:])
            if first_heading:
                flowables.append(Paragraph(text, styles['DocTitle']))
                first_heading = False
            else:
                flowables.append(Paragraph(text, styles['H1']))
            i += 1
            continue

        if stripped.startswith('## '):
            text = format_inline(stripped[3:])
            flowables.append(Paragraph(text, styles['H1']))
            i += 1
            continue

        if stripped.startswith('### '):
            text = format_inline(stripped[4:])
            flowables.append(Paragraph(text, styles['H2']))
            i += 1
            continue

        if stripped.startswith('#### '):
            text = format_inline(stripped[5:])
            flowables.append(Paragraph(text, styles['H3']))
            i += 1
            continue

        # Checkbox items
        if stripped.startswith('[ ] ') or stripped.startswith('[x] '):
            checked = stripped.startswith('[x]')
            text = stripped[4:]
            text = format_inline(escape_xml(text))
            bullet_char = '\u2611' if checked else '\u2610'
            flowables.append(Paragraph(
                f'{bullet_char}  {text}', styles['CheckItem']
            ))
            i += 1
            continue

        # Numbered items
        num_match = re.match(r'^(\d+)\.\s+(.*)', stripped)
        if num_match:
            num = num_match.group(1)
            text = format_inline(escape_xml(num_match.group(2)))
            flowables.append(Paragraph(
                f'<b>{num}.</b>  {text}', styles['BulletItem']
            ))
            i += 1
            continue

        # Bullet items
        if stripped.startswith('- ') or stripped.startswith('* '):
            text = format_inline(escape_xml(stripped[2:]))
            flowables.append(Paragraph(
                f'\u2022  {text}', styles['BulletItem']
            ))
            i += 1
            continue

        # Table
        if stripped.startswith('|') and stripped.endswith('|'):
            table_rows = []
            while i < len(lines) and lines[i].strip().startswith('|'):
                row_text = lines[i].strip()
                # Skip separator row
                if re.match(r'^\|[\s\-:|]+\|$', row_text):
                    i += 1
                    continue
                cells = [c.strip() for c in row_text.split('|')[1:-1]]
                table_rows.append(cells)
                i += 1

            if table_rows:
                # Build table
                col_count = len(table_rows[0])
                avail_width = A4[0] - 4 * cm
                col_width = avail_width / col_count

                t_data = []
                for ri, row in enumerate(table_rows):
                    style_name = 'TableHeader' if ri == 0 else 'TableCell'
                    t_data.append([
                        Paragraph(format_inline(escape_xml(c)), styles[style_name])
                        for c in row
                    ])

                t = Table(t_data, colWidths=[col_width] * col_count)
                t.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), BRAND_BLUE),
                    ('TEXTCOLOR', (0, 0), (-1, 0), white),
                    ('BACKGROUND', (0, 1), (-1, -1), HexColor("#f8fafc")),
                    ('GRID', (0, 0), (-1, -1), 0.5, HexColor("#cbd5e1")),
                    ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                    ('TOPPADDING', (0, 0), (-1, -1), 6),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
                    ('LEFTPADDING', (0, 0), (-1, -1), 8),
                    ('RIGHTPADDING', (0, 0), (-1, -1), 8),
                    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, HexColor("#f8fafc")]),
                ]))
                flowables.append(Spacer(1, 4))
                flowables.append(t)
                flowables.append(Spacer(1, 8))
            continue

        # Regular paragraph
        text = format_inline(escape_xml(stripped))
        flowables.append(Paragraph(text, styles['Body']))
        i += 1

    return flowables


def add_page_number(canvas_obj, doc):
    """Add page number and footer to each page."""
    canvas_obj.saveState()
    # Page number
    canvas_obj.setFont('Helvetica', 8)
    canvas_obj.setFillColor(HexColor("#94a3b8"))
    page_num = canvas_obj.getPageNumber()
    canvas_obj.drawCentredString(A4[0] / 2, 15 * mm, f"— {page_num} —")
    # Header line
    canvas_obj.setStrokeColor(HexColor("#e2e8f0"))
    canvas_obj.setLineWidth(0.5)
    canvas_obj.line(2 * cm, A4[1] - 1.5 * cm, A4[0] - 2 * cm, A4[1] - 1.5 * cm)
    # Header text
    canvas_obj.setFont('Helvetica', 7)
    canvas_obj.drawString(2 * cm, A4[1] - 1.3 * cm, "wealth.Investing — Setup MacBook Air M2")
    canvas_obj.restoreState()


def main():
    # Read markdown
    md_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "docs", "setup-macbook-m2.md")
    with open(md_path, 'r', encoding='utf-8') as f:
        md_text = f.read()

    # Create PDF
    doc = SimpleDocTemplate(
        OUTPUT,
        pagesize=A4,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
        leftMargin=2 * cm,
        rightMargin=2 * cm,
        title="Setup MacBook Air M2 — wealth.Investing",
        author="wealth.Investing"
    )

    # Parse and build
    flowables = parse_markdown_to_flowables(md_text)

    # Add subtitle after title
    flowables.insert(1, Paragraph(
        "Guia completo para replicar o ambiente de dev do Windows no Mac",
        styles['DocSubtitle']
    ))

    doc.build(flowables, onFirstPage=add_page_number, onLaterPages=add_page_number)
    print(f"PDF gerado: {OUTPUT}")


if __name__ == '__main__':
    main()
