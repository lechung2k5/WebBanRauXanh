# -*- coding: utf-8 -*-
"""
Script to rewrite Chapter 1, Chapter 2, Conclusion and References in doc/Bao_cao_do_an_HoNa_Fresh.docx
Standard graduation thesis format (Khóa luận tốt nghiệp), 0% plagiarism, professional academic tone.
"""

import docx
from docx.shared import Pt, Inches, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.style import WD_STYLE_TYPE
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

DOC_PATH = 'e:/HOCTAP/WWW/BTL_WebBanRau/doc/Bao_cao_do_an_HoNa_Fresh.docx'

def set_run_font(run, name='Times New Roman', size_pt=13, bold=False, italic=False, color_rgb=(0,0,0)):
    run.font.name = name
    run.font.size = Pt(size_pt)
    run.font.bold = bold
    run.font.italic = italic
    run.font.color.rgb = RGBColor(*color_rgb)
    # Ensure EastAsia font is also Times New Roman
    rPr = run._r.get_or_add_rPr()
    rFonts = OxmlElement('w:rFonts')
    rFonts.set(qn('w:ascii'), name)
    rFonts.set(qn('w:hAnsi'), name)
    rFonts.set(qn('w:eastAsia'), name)
    rFonts.set(qn('w:cs'), name)
    rPr.append(rFonts)

def add_styled_paragraph(doc, text, style_type='normal', space_before=0, space_after=6, line_spacing=1.3, align=WD_ALIGN_PARAGRAPH.JUSTIFY):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(space_before)
    p.paragraph_format.space_after = Pt(space_after)
    p.paragraph_format.line_spacing = line_spacing
    p.alignment = align
    
    if style_type == 'h1':
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        p.paragraph_format.space_before = Pt(12)
        p.paragraph_format.space_after = Pt(8)
        run = p.add_run(text)
        set_run_font(run, 'Times New Roman', 16, bold=True, color_rgb=(0, 51, 102))
    elif style_type == 'h2':
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        p.paragraph_format.space_before = Pt(10)
        p.paragraph_format.space_after = Pt(6)
        run = p.add_run(text)
        set_run_font(run, 'Times New Roman', 14, bold=True, color_rgb=(0, 76, 153))
    elif style_type == 'h3':
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        p.paragraph_format.space_before = Pt(8)
        p.paragraph_format.space_after = Pt(4)
        run = p.add_run(text)
        set_run_font(run, 'Times New Roman', 13, bold=True, color_rgb=(34, 34, 34))
    elif style_type == 'h4':
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        p.paragraph_format.space_before = Pt(6)
        p.paragraph_format.space_after = Pt(2)
        run = p.add_run(text)
        set_run_font(run, 'Times New Roman', 13, bold=True, italic=True, color_rgb=(51, 51, 51))
    elif style_type == 'bullet':
        p.paragraph_format.left_indent = Inches(0.25)
        p.paragraph_format.first_line_indent = Inches(-0.25)
        run = p.add_run(text)
        set_run_font(run, 'Times New Roman', 13, bold=False)
    else: # normal
        p.paragraph_format.first_line_indent = Inches(0.5)
        run = p.add_run(text)
        set_run_font(run, 'Times New Roman', 13, bold=False)
    return p

print('Helper definitions ready.')
