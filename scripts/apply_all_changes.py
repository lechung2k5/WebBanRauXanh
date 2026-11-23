# -*- coding: utf-8 -*-
"""
Robust execution script to apply Chapter 1, Chapter 2, Conclusion and References rewrite.
Preserves Chapter 3 and Chapter 4 completely intact.
"""

import docx
from docx.shared import Pt, Inches, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
import sys
import os

sys.path.append(os.path.dirname(__file__))
from content_ch1 import CHAPTER_1_CONTENT
from content_ch2 import CHAPTER_2_CONTENT
from content_ch5_ref import CHAPTER_5_CONCLUSION, REFERENCES_CONTENT

DOC_PATH = 'e:/HOCTAP/WWW/BTL_WebBanRau/doc/Bao_cao_do_an_HoNa_Fresh.docx'

def set_run_font(run, name='Times New Roman', size_pt=13, bold=False, italic=False, color_rgb=(0,0,0)):
    run.font.name = name
    run.font.size = Pt(size_pt)
    run.font.bold = bold
    run.font.italic = italic
    run.font.color.rgb = RGBColor(*color_rgb)
    rPr = run._r.get_or_add_rPr()
    rFonts = OxmlElement('w:rFonts')
    rFonts.set(qn('w:ascii'), name)
    rFonts.set(qn('w:hAnsi'), name)
    rFonts.set(qn('w:eastAsia'), name)
    rFonts.set(qn('w:cs'), name)
    rPr.append(rFonts)

def insert_item_before(doc, target_para, text, style_type):
    p = target_para.insert_paragraph_before()
    p.paragraph_format.line_spacing = 1.3
    p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    
    if style_type == 'h1':
        p.style = doc.styles['Heading 1']
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        p.paragraph_format.space_before = Pt(14)
        p.paragraph_format.space_after = Pt(8)
        run = p.add_run(text)
        set_run_font(run, 'Times New Roman', 16, bold=True, color_rgb=(0, 51, 102))
    elif style_type == 'h2':
        p.style = doc.styles['Heading 2']
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        p.paragraph_format.space_before = Pt(10)
        p.paragraph_format.space_after = Pt(6)
        run = p.add_run(text)
        set_run_font(run, 'Times New Roman', 14, bold=True, color_rgb=(0, 76, 153))
    elif style_type == 'h3':
        p.style = doc.styles['Heading 3']
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        p.paragraph_format.space_before = Pt(8)
        p.paragraph_format.space_after = Pt(4)
        run = p.add_run(text)
        set_run_font(run, 'Times New Roman', 13, bold=True, color_rgb=(34, 34, 34))
    elif style_type == 'h4':
        p.style = doc.styles['Heading 4']
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        p.paragraph_format.space_before = Pt(6)
        p.paragraph_format.space_after = Pt(2)
        run = p.add_run(text)
        set_run_font(run, 'Times New Roman', 13, bold=True, italic=True, color_rgb=(51, 51, 51))
    elif style_type == 'bullet':
        p.paragraph_format.space_before = Pt(2)
        p.paragraph_format.space_after = Pt(4)
        p.paragraph_format.left_indent = Inches(0.35)
        p.paragraph_format.first_line_indent = Inches(-0.2)
        run = p.add_run(text)
        set_run_font(run, 'Times New Roman', 13, bold=False)
    else: # normal body text
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(6)
        p.paragraph_format.first_line_indent = Inches(0.5)
        run = p.add_run(text)
        set_run_font(run, 'Times New Roman', 13, bold=False)
    return p

def main():
    print('Loading document:', DOC_PATH)
    doc = docx.Document(DOC_PATH)
    
    # 1. Update Title on Cover page
    p11 = doc.paragraphs[11]
    p12 = doc.paragraphs[12]
    p11.text = 'HONA FRESH – NỀN TẢNG B2B KẾT NỐI THƯƠNG LÁI VÀ NHÀ VƯỜN,'
    p12.text = 'QUẢN LÝ CHUỖI CUNG ỨNG NÔNG SẢN TRỰC TUYẾN'
    for p in (p11, p12):
        for run in p.runs:
            set_run_font(run, 'Times New Roman', 16, bold=True, color_rgb=(0, 51, 102))
    print('Updated Cover page Title.')

    # 2. Identify CH1 (idx 29) and CH3 (idx 173)
    p_ch1 = doc.paragraphs[29]
    p_ch3 = doc.paragraphs[173]
    assert 'CHƯƠNG 1' in p_ch1.text, f'Expected CH1 at 29, got {p_ch1.text}'
    assert 'CHƯƠNG 3' in p_ch3.text, f'Expected CH3 at 173, got {p_ch3.text}'
    print(f'Located CH1 at 29 ({p_ch1.text[:30]}) and CH3 at 173 ({p_ch3.text[:30]})')

    old_ch1_ch2_elements = [doc.paragraphs[k]._element for k in range(29, 173)]

    # Insert Chapter 1 and Chapter 2 before p_ch3
    print('Inserting Chapter 1 paragraphs...')
    for text, stype in CHAPTER_1_CONTENT:
        insert_item_before(doc, p_ch3, text, stype)

    print('Inserting Chapter 2 paragraphs...')
    for text, stype in CHAPTER_2_CONTENT:
        insert_item_before(doc, p_ch3, text, stype)

    # Remove old Chapter 1 and Chapter 2 elements
    print(f'Removing {len(old_ch1_ch2_elements)} old paragraphs from Ch1 and Ch2...')
    for el in old_ch1_ch2_elements:
        el.getparent().remove(el)

    # 3. Locate CH5 by exact Heading 1 and text
    p_ch5 = None
    for p in doc.paragraphs:
        if p.style.name == 'Heading 1' and 'CHƯƠNG 5' in p.text.strip():
            p_ch5 = p
            break

    assert p_ch5 is not None, 'Could not locate CHƯƠNG 5 Heading 1 paragraph'
    print(f'Located Chapter 5 paragraph: {p_ch5.text}')

    # Find the index of p_ch5 in doc.paragraphs by XML element
    idx_ch5 = [p._element for p in doc.paragraphs].index(p_ch5._element)
    print(f'CH5 index in doc.paragraphs: {idx_ch5}')

    old_end_elements = [doc.paragraphs[k]._element for k in range(idx_ch5, len(doc.paragraphs))]

    # Insert new Chapter 5 conclusion and References before p_ch5
    print('Inserting Chapter 5 Conclusion...')
    for text, stype in CHAPTER_5_CONCLUSION:
        insert_item_before(doc, p_ch5, text, stype)

    print('Inserting References...')
    for text, stype in REFERENCES_CONTENT:
        insert_item_before(doc, p_ch5, text, stype)

    # Remove old elements
    print(f'Removing {len(old_end_elements)} old paragraphs from CH5 and old references...')
    for el in old_end_elements:
        el.getparent().remove(el)

    # Save modified document
    doc.save(DOC_PATH)
    print('Document successfully updated and saved to:', DOC_PATH)

if __name__ == '__main__':
    main()
