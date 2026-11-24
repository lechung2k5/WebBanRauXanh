# -*- coding: utf-8 -*-
"""
Cập nhật mục 3.1.1 Use case tổng quát trong file Word Bao_cao_do_an_HoNa_Fresh.docx:
- Thay thế ảnh cũ/placeholder bằng ảnh sơ đồ Use Case B2B chất lượng cao.
- Cập nhật văn bản mô tả học thuật chuẩn khóa luận tốt nghiệp.
"""

import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH

def set_run_font(run, name='Times New Roman', size_pt=13, bold=False, italic=False, color_rgb=(0, 0, 0)):
    run.font.name = name
    run.font.size = Pt(size_pt)
    run.bold = bold
    run.italic = italic
    run.font.color.rgb = RGBColor(*color_rgb)

def update_section_3_1_1():
    doc_path = 'doc/Bao_cao_do_an_HoNa_Fresh.docx'
    doc = docx.Document(doc_path)

    # Tìm vị trí paragraph 3.1.1
    idx_3_1_1 = None
    for i, p in enumerate(doc.paragraphs):
        if '3.1.1' in p.text and 'Use case' in p.text:
            idx_3_1_1 = i
            break

    if idx_3_1_1 is None:
        print('Không tìm thấy mục 3.1.1 trong tài liệu!')
        return

    print(f'Tìm thấy mục 3.1.1 tại Paragraph {idx_3_1_1}: {doc.paragraphs[idx_3_1_1].text}')

    # Tìm vị trí kết thúc của 3.1.1 (trước 3.1.2)
    idx_3_1_2 = None
    for i in range(idx_3_1_1 + 1, len(doc.paragraphs)):
        p_text = doc.paragraphs[i].text
        if '3.1.2' in p_text:
            idx_3_1_2 = i
            break

    print(f'Tìm thấy mục 3.1.2 tại Paragraph {idx_3_1_2}')

    # 1. Cập nhật tiêu đề 3.1.1
    p_title = doc.paragraphs[idx_3_1_1]
    p_title.text = ''
    r_title = p_title.add_run('3.1.1. Sơ đồ Use case tổng quát')
    set_run_font(r_title, size_pt=14, bold=True, color_rgb=(30, 41, 59))
    p_title.paragraph_format.space_before = Pt(12)
    p_title.paragraph_format.space_after = Pt(6)

    # Các đoạn văn bản cần xóa giữa 3.1.1 và 3.1.2
    # Chúng ta sẽ tái sử dụng p_181 và p_182, xóa các p thừa nếu có
    # Danh sách nội dung cần thêm:
    intro_p1 = (
        "Sơ đồ Use Case tổng quát của nền tảng B2B HONA FRESH mô tả cấu trúc tương tác chức năng "
        "toàn diện giữa các tác nhân trong chuỗi cung ứng nông sản và hệ sinh thái phần mềm. "
        "Nền tảng thiết lập ranh giới hệ thống (System Boundary) bao trùm toàn bộ chuỗi giá trị từ nông trại đến "
        "kho thu mua sỉ, phân định rõ quyền hạn và vai trò của 4 nhóm tác nhân chính: Khách vãng lai (Guest), "
        "Thương lái thu mua (Buyer), Nhà vườn / Hợp tác xã (Farmer), Quản trị viên & Kế toán sàn (Admin), "
        "cùng các dịch vụ ngoại vi tự động hóa (Cổng thanh toán điện tử & Trạm cảm biến IoT). "
        "Mô hình áp dụng kỹ thuật phân rã chức năng từ các Use case mức cha (Parent Use Cases) "
        "đến các Use case con chi tiết thông qua quan hệ mở rộng <<extend>>, giúp cấu trúc nghiệp vụ vừa có chiều sâu "
        "vừa đảm bảo tính module hóa cao."
    )

    caption_text = "Hình 3.1. Sơ đồ Use case tổng quát nền tảng B2B HONA FRESH"

    desc_p1 = "Như được minh họa trên Hình 3.1, hệ thống HONA FRESH phân tách thành 4 phân hệ chức năng tương ứng với 4 nhóm tác nhân tham gia:"
    
    desc_points = [
        ("Phân hệ Khách vãng lai (Guest - Màu xanh lá): ",
         "Cung cấp các chức năng công khai, cho phép người dùng tra cứu thông tin sàn, khám phá danh mục nông sản đạt chuẩn VietGAP/GlobalGAP, xem bảng giá thị trường tham khảo và đăng ký tài khoản tham gia sàn B2B."),
        
        ("Phân hệ Thương lái thu mua (Buyer - Màu xanh dương): ",
         "Cung cấp bộ công cụ thu mua sỉ trọn vẹn, bao gồm quản lý hồ sơ doanh nghiệp, tìm kiếm nguồn cung nông sản theo mùa vụ, tạo yêu cầu báo giá (RFQ) và thương lượng đàm phán nhiều vòng, ký hợp đồng điện tử và nạp tiền ký quỹ Escrow bảo chứng (đợt 1 30%, đợt 2 70%), giám sát hành trình và nhiệt độ xe lạnh theo thời gian thực, và xác nhận bàn giao điện tử (ePOD)."),
         
        ("Phân hệ Nhà vườn / Hợp tác xã (Farmer - Màu xanh ngọc): ",
         "Cung cấp các chức năng hỗ trợ nhà vườn số hóa quy trình tiêu thụ nông sản, gồm quản lý nông trại và chứng nhận tiêu chuẩn canh tác, đăng bán lô nông sản sỉ theo lịch thu hoạch, phản hồi đề xuất báo giá (Counter-offer) từ thương lái, in tem mã QR truy xuất nguồn gốc, bàn giao nông sản cho xe gom First-mile và nhận tiền giải ngân ký quỹ về tài khoản ngân hàng."),
         
        ("Phân hệ Quản trị viên & Kế toán (Admin - Màu vàng cam): ",
         "Đảm nhiệm vai trò giám sát, điều phối và bảo chứng giao dịch, gồm thẩm định hồ sơ thành viên (KYC), kiểm duyệt bài đăng nông sản, hòa giải tranh chấp hợp đồng B2B, điều phối xe lạnh và trạm trung chuyển Hub, kiểm soát tài khoản ký quỹ Escrow và phân tích dữ liệu thị trường bằng trí tuệ nhân tạo (AI)."),
         
        ("Tác nhân ngoại vi (External Services - Màu hồng tím): ",
         "Bao gồm Cổng thanh toán (Payment Gateway) thực hiện xử lý dòng tiền ký quỹ, giải ngân và hoàn cọc; cùng Trạm cảm biến IoT (IoT Sensor Hub) liên tục ghi nhận và đối soát dữ liệu nhiệt độ, độ ẩm của kho lạnh và phương tiện vận tải chuyên dụng.")
    ]

    # Chúng ta xóa các paragraph cũ nằm giữa idx_3_1_1 và idx_3_1_2
    num_to_remove = idx_3_1_2 - (idx_3_1_1 + 1)
    for _ in range(num_to_remove):
        p_remove = doc.paragraphs[idx_3_1_1 + 1]
        p_remove._element.getparent().remove(p_remove._element)

    # Chèn các paragraph mới ngay sau p_title
    target_p = p_title

    def insert_p_after(ref_p, text='', style='Normal'):
        new_p = doc.add_paragraph(style=style)
        ref_p._element.addnext(new_p._element)
        if text:
            r = new_p.add_run(text)
            set_run_font(r, size_pt=13)
            new_p.paragraph_format.line_spacing = 1.3
            new_p.paragraph_format.space_after = Pt(6)
            new_p.paragraph_format.first_line_indent = Inches(0.4)
            new_p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        return new_p

    # 1. Đoạn mở đầu
    p_intro = insert_p_after(target_p, intro_p1)
    target_p = p_intro

    # 2. Đoạn chứa ảnh
    p_img = insert_p_after(target_p)
    p_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_img.paragraph_format.space_before = Pt(8)
    p_img.paragraph_format.space_after = Pt(4)
    run_img = p_img.add_run()
    run_img.add_picture('docs/diagrams/use_case_diagram_b2b.png', width=Inches(6.4))
    target_p = p_img

    # 3. Đoạn caption hình
    p_cap = insert_p_after(target_p)
    p_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_cap.paragraph_format.space_before = Pt(2)
    p_cap.paragraph_format.space_after = Pt(10)
    run_cap = p_cap.add_run(caption_text)
    set_run_font(run_cap, size_pt=11.5, bold=True, italic=True, color_rgb=(51, 65, 85))
    target_p = p_cap

    # 4. Đoạn giới thiệu danh mục tác nhân
    p_desc = insert_p_after(target_p, desc_p1)
    target_p = p_desc

    # 5. Các điểm gạch đầu dòng phân hệ
    for bold_prefix, desc_content in desc_points:
        p_pt = insert_p_after(target_p)
        p_pt.paragraph_format.line_spacing = 1.3
        p_pt.paragraph_format.space_after = Pt(4)
        p_pt.paragraph_format.first_line_indent = Inches(0.4)
        p_pt.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        r_bold = p_pt.add_run(f"• {bold_prefix}")
        set_run_font(r_bold, size_pt=13, bold=True)
        r_body = p_pt.add_run(desc_content)
        set_run_font(r_body, size_pt=13, bold=False)
        target_p = p_pt

    doc.save(doc_path)
    print(f'Đã cập nhật thành công mục 3.1.1 vào file: {doc_path}')

if __name__ == '__main__':
    update_section_3_1_1()
