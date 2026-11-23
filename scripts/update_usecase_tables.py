# -*- coding: utf-8 -*-
"""
Script to update Section 3.1.2 (Bảng 3.1: Danh sách tác nhân và mô tả)
and Section 3.1.3 (Bảng 3.2: Danh sách các tình huống hoạt động Use Cases)
in doc/Bao_cao_do_an_HoNa_Fresh.docx to strictly match HONA FRESH B2B platform.
"""

import docx
from docx.shared import Pt, Inches, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

DOC_PATH = 'e:/HOCTAP/WWW/BTL_WebBanRau/doc/Bao_cao_do_an_HoNa_Fresh.docx'

def set_cell_background(cell, fill_hex):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:val'), 'clear')
    shd.set(qn('w:color'), 'auto')
    shd.set(qn('w:fill'), fill_hex)
    tcPr.append(shd)

def set_cell_margins(cell, top=120, bottom=120, left=150, right=150):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for m, val in [('w:top', top), ('w:bottom', bottom), ('w:left', left), ('w:right', right)]:
        node = OxmlElement(m)
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)

def set_run_font(run, name='Times New Roman', size_pt=11, bold=False, italic=False, color_rgb=(0,0,0)):
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

ACTORS_DATA = [
    ("Guest\n(Khách vãng lai)", 
     "Người dùng truy cập hệ thống nhưng chưa đăng nhập hoặc chưa có tài khoản. Guest có quyền xem trang chủ thị trường nông sản, xem giới thiệu nền tảng, tìm kiếm và lọc nguồn cung lô hàng theo tiêu chuẩn VietGAP hoặc vùng trồng, xem chi tiết lô hàng thu hoạch và thực hiện đăng ký tài khoản (chọn vai trò Farmer hoặc Buyer), đăng nhập, khôi phục mật khẩu qua mã OTP."),

    ("Buyer\n(Thương lái / Thu mua)", 
     "Đơn vị thu mua nông sản số lượng lớn (doanh nghiệp chế biến, siêu thị, tiểu thương chợ đầu mối). Buyer thực hiện quản lý hồ sơ doanh nghiệp (GPKD) và danh sách kho nhận hàng; tìm kiếm lô hàng thu hoạch; tạo và gửi yêu cầu báo giá (Create RFQ); đàm phán trả giá đối ứng (Counter-Offer) nhiều vòng và chat thương lượng trực tuyến theo lô; chấp thuận giá chốt để tự động sinh Hợp đồng B2B điện tử; thanh toán tiền cọc 30% bảo chứng Escrow qua VietQR/SePay; theo dõi hành trình xe lạnh giao hàng; kiểm đếm và ký nhận biên bản điện tử ePOD tại kho; thanh toán 70% giá trị hợp đồng còn lại; gửi khiếu nại bồi thường nếu hàng bị dập nát/hao hụt và đánh giá uy tín nhà vườn."),

    ("Farmer\n(Nhà vườn / Hợp tác xã)", 
     "Đơn vị canh tác và cung ứng nông sản trực tiếp. Farmer thực hiện khai báo hồ sơ nông trại, địa chỉ vườn, tải lên chứng nhận an toàn thực phẩm (VietGAP) và mã số vùng trồng (PUC); đăng bán các lô hàng thu hoạch (Harvest Lot) kèm sản lượng dự kiến, ngày thu hoạch, giá bán và quy cách đóng gói; tiếp nhận các yêu cầu báo giá RFQ từ thương lái; đàm phán trả giá đối ứng hoặc chấp thuận giá chốt hợp đồng B2B; cập nhật hình ảnh kiểm chứng bao bì trước khi thu hoạch; phối hợp cân hàng và ký biên bản giao nhận cho tài xế xe gom lạnh tại vườn; theo dõi quyết toán doanh thu bán hàng được giải ngân vào tài khoản ngân hàng và tương tác với Trợ lý AI tư vấn kỹ thuật nông vụ."),

    ("Driver\n(Tài xế xe tải lạnh)", 
     "Nhân sự vận tải thuộc đội xe lạnh của sàn hoặc đơn vị logistics liên kết. Driver tiếp nhận lệnh điều phối chuyến xe gom hàng tại vườn (Inbound Pickup); đến từng vườn cân đo khối lượng thực tế, đo nhiệt độ ban đầu của rau củ và ký biên bản bàn giao với nông dân; vận chuyển nông sản về Trạm Hub trung chuyển; tiếp nhận lệnh chuyến giao hàng chặng cuối (Outbound Delivery); vận chuyển hàng từ Hub đến kho của từng Buyer, kiểm đếm và lấy chữ ký xác nhận của thủ kho trên biên bản điện tử ePOD."),

    ("Hub Staff / QC\n(Chuyên viên Trạm Hub & KCS)", 
     "Nhân sự vận hành và kiểm soát chất lượng tại Trạm trung chuyển nông sản. Thực hiện cân tổng và cân bì (Gross/Tare) để xác định khối lượng tịnh nhập trạm; lấy mẫu và kiểm định các chỉ tiêu KCS (độ ngọt khúc xạ quang học Brix, dư lượng phân bón Nitrat NO3- ppm, an toàn thuốc BVTV) để phân loại hàng đạt chuẩn Grade 1; quản lý sắp xếp lưu kho lạnh theo nguyên tắc FEFO (Hết hạn trước - Xuất trước); đóng gói và điều phối xuất kho lên xe tải lạnh giao hàng chặng cuối."),

    ("Admin / Accountant\n(Quản trị & Kế toán sàn)", 
     "Quản trị viên và bộ phận tài chính điều phối hoạt động toàn hệ thống. Thẩm định và phê duyệt hồ sơ pháp lý đối tác (KYC); quản lý danh mục rau củ và kiểm duyệt lô nông sản đăng bán; giám sát tiến độ thực hiện các hợp đồng B2B; xử lý phân xử khiếu nại đền bù hư hỏng; điều phối tuyến xe gom vườn Inbound và tuyến xe giao hàng Outbound; giám sát nhiệt độ thùng lạnh qua cảm biến IoT; quản lý tài khoản ký quỹ bảo chứng Escrow; thực hiện lệnh quyết toán chi trả tiền cho nhà vườn và tự động hạch toán các bút toán kế toán kép (General Ledger) theo chuẩn mực kế toán Việt Nam."),

    ("Payment Gateway\n(External Service)", 
     "Cổng thanh toán và hệ thống ngân hàng liên kết (VietQR / SePay Webhook). Tiếp nhận các giao dịch chuyển khoản đặt cọc 30% và thanh toán 70% từ Buyer, tự động đối soát giao dịch thời gian thực và gửi webhook xác nhận về hệ thống HONA FRESH để cập nhật trạng thái hợp đồng."),

    ("IoT Sensor Hub\n(External Service)", 
     "Hệ thống cảm biến giám sát chuỗi lạnh từ xa. Thu thập dữ liệu telemetry nhiệt độ, độ ẩm trên thùng xe tải lạnh và kho bảo quản theo thời gian thực, kích hoạt cảnh báo vi phạm dải nhiệt độ bảo quản an toàn của rau củ.")
]

USE_CASES_DATA = [
    # 1. Phân hệ Khách vãng lai (Guest)
    ("UC01", "Xem trang chủ và thông tin thị trường nông sản", "Guest, Buyer, Farmer"),
    ("UC02", "Xem giới thiệu nền tảng HONA FRESH", "Guest"),
    ("UC03", "Xem quy trình chuỗi cung ứng B2B", "Guest"),
    ("UC04", "Tìm kiếm nguồn cung nông sản theo từ khóa", "Guest, Buyer"),
    ("UC05", "Lọc nông sản theo danh mục, tiêu chuẩn VietGAP và vùng trồng", "Guest, Buyer"),
    ("UC06", "Xem chi tiết lô nông sản thu hoạch (Harvest Lot)", "Guest, Buyer"),
    ("UC07", "Đăng ký tài khoản (chọn vai trò Farmer hoặc Buyer)", "Guest"),
    ("UC08", "Đăng nhập hệ thống (Email / Mật khẩu / Google SSO)", "Guest, Buyer, Farmer, Driver, Hub Staff, Admin"),
    ("UC09", "Quên mật khẩu và đặt lại qua mã xác thực OTP Email", "Guest, Buyer, Farmer"),

    # 2. Phân hệ Thương lái (Buyer)
    ("UC10", "Quản lý thông tin hồ sơ doanh nghiệp và pháp lý (GPKD)", "Buyer"),
    ("UC11", "Quản lý danh sách kho nhận hàng (Buyer Warehouse)", "Buyer"),
    ("UC12", "Đổi mật khẩu và cài đặt bảo mật tài khoản", "Buyer, Farmer, Driver, Hub Staff, Admin"),
    ("UC13", "Tạo và gửi yêu cầu báo giá (Create RFQ) theo lô hàng", "Buyer"),
    ("UC14", "Đàm phán trả giá nhiều vòng (Counter-Offer)", "Buyer, Farmer"),
    ("UC15", "Chat thương lượng trực tuyến theo lô hàng", "Buyer, Farmer"),
    ("UC16", "Chấp thuận mức giá đàm phán chốt thỏa thuận", "Buyer, Farmer"),
    ("UC17", "Xem danh sách và chi tiết Hợp đồng điện tử B2B", "Buyer, Farmer, Admin"),
    ("UC18", "Ký kết hợp đồng điện tử B2B", "Buyer, Farmer"),
    ("UC19", "Thanh toán tiền cọc 30% bảo chứng Escrow qua VietQR", "Buyer, Payment Gateway"),
    ("UC20", "Theo dõi tiến độ thu hoạch và vận chuyển đơn hàng", "Buyer"),
    ("UC21", "Kiểm đếm và ký nhận biên bản điện tử ePOD tại kho", "Buyer, Driver"),
    ("UC22", "Thanh toán 70% giá trị hợp đồng còn lại sau giao nhận", "Buyer, Payment Gateway"),
    ("UC23", "Gửi khiếu nại bồi thường hàng hư hỏng / dập nát (Claim Spoilage)", "Buyer"),
    ("UC24", "Đánh giá uy tín và xếp hạng chất lượng nhà vườn", "Buyer"),

    # 3. Phân hệ Nhà vườn (Farmer)
    ("UC25", "Khai báo thông tin nông trại và địa chỉ vườn", "Farmer"),
    ("UC26", "Nộp hồ sơ chứng nhận VietGAP và Mã số vùng trồng (PUC)", "Farmer"),
    ("UC27", "Đăng bán lô nông sản thu hoạch mới (Harvest Lot)", "Farmer"),
    ("UC28", "Cập nhật sản lượng khả dụng và giá chào bán", "Farmer"),
    ("UC29", "Ngừng chào bán / Đóng lô nông sản", "Farmer"),
    ("UC30", "Xem hộp thư đàm phán báo giá RFQ từ thương lái", "Farmer"),
    ("UC31", "Cập nhật hình ảnh kiểm chứng bao bì và sẵn sàng thu hoạch", "Farmer"),
    ("UC32", "Bàn giao hàng tại vườn và ký biên bản với tài xế xe gom", "Farmer, Driver"),
    ("UC33", "Theo dõi quyết toán doanh thu bán hàng giải ngân về tài khoản", "Farmer"),
    ("UC34", "Hỏi đáp tư vấn kỹ thuật nông vụ với Trợ lý AI Gemini", "Farmer"),

    # 4. Phân hệ Tài xế đội xe lạnh (Driver)
    ("UC35", "Tiếp nhận chuyến xe gom hàng tận vườn (Inbound Pickup)", "Driver"),
    ("UC36", "Đo nhiệt độ ban đầu, cân đo và ký biên bản tại vườn", "Driver, Farmer"),
    ("UC37", "Tiếp nhận chuyến xe giao hàng chặng cuối (Outbound Delivery)", "Driver"),
    ("UC38", "Giao hàng tận kho Buyer và lấy chữ ký điện tử ePOD", "Driver, Buyer"),

    # 5. Phân hệ Trạm Hub & KCS (Hub Staff)
    ("UC39", "Tiếp nhận và cân tổng / cân bì nhập trạm Hub (Gross/Tare)", "Hub Staff"),
    ("UC40", "Lấy mẫu và kiểm định chỉ tiêu KCS (Brix, Nitrat, thuốc BVTV)", "Hub Staff"),
    ("UC41", "Quản lý lưu trữ kho lạnh trạm Hub theo chuẩn FEFO", "Hub Staff"),
    ("UC42", "Đóng gói và điều phối xuất kho lên xe tải lạnh", "Hub Staff"),

    # 6. Phân hệ Quản trị & Kế toán sàn (Admin / Accountant)
    ("UC43", "Quản lý người dùng và thẩm định / phê duyệt hồ sơ KYC đối tác", "Admin"),
    ("UC44", "Khóa và mở khóa tài khoản người dùng vi phạm", "Admin"),
    ("UC45", "Quản lý danh mục rau củ và kiểm duyệt lô hàng đăng bán", "Admin"),
    ("UC46", "Giám sát tiến độ hợp đồng và phân xử khiếu nại bồi thường", "Admin"),
    ("UC47", "Quản lý thông tin đội xe tải lạnh và phân bổ tài xế", "Admin"),
    ("UC48", "Lập lệnh điều phối chuyến xe gom vườn (Inbound Dispatch)", "Admin"),
    ("UC49", "Lập lệnh điều phối chuyến xe giao kho Buyer (Outbound Dispatch)", "Admin"),
    ("UC50", "Giám sát hành trình xe và nhiệt độ chuỗi lạnh qua IoT", "Admin"),
    ("UC51", "Quản lý tài khoản ký quỹ bảo chứng Escrow và phí nền tảng", "Admin"),
    ("UC52", "Thực hiện lệnh quyết toán chi trả doanh thu cho nhà vườn", "Admin"),
    ("UC53", "Tự động hạch toán Sổ nhật ký chung kế toán kép (General Ledger)", "Admin"),
    ("UC54", "Báo cáo thống kê sản lượng tiêu thụ và doanh thu sàn", "Admin"),

    # 7. Dịch vụ tích hợp bên ngoài (External Services)
    ("UC55", "Xử lý giao dịch thanh toán và gửi Webhook đối soát tự động", "Payment Gateway"),
    ("UC56", "Thu thập telemetry cảm biến nhiệt độ và kích hoạt cảnh báo lạnh", "IoT Sensor Hub")
]

def format_table(table, col_widths, headers, data, is_uc_table=False):
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    
    # Header Row
    hdr_cells = table.rows[0].cells
    for i, h in enumerate(headers):
        hdr_cells[i].text = h
        set_cell_background(hdr_cells[i], '003366')
        set_cell_margins(hdr_cells[i], top=140, bottom=140, left=150, right=150)
        p = hdr_cells[i].paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        for run in p.runs:
            set_run_font(run, 'Times New Roman', 12, bold=True, color_rgb=(255, 255, 255))
            
    # Body Rows
    for row_idx, row_data in enumerate(data):
        row_cells = table.add_row().cells
        bg_color = 'F8FAFC' if row_idx % 2 == 1 else 'FFFFFF'
        for col_idx, text in enumerate(row_data):
            cell = row_cells[col_idx]
            cell.text = text
            set_cell_background(cell, bg_color)
            set_cell_margins(cell, top=100, bottom=100, left=150, right=150)
            p = cell.paragraphs[0]
            p.paragraph_format.line_spacing = 1.2
            p.paragraph_format.space_before = Pt(0)
            p.paragraph_format.space_after = Pt(0)
            
            if is_uc_table:
                if col_idx == 0: # ID
                    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                    for r in p.runs:
                        set_run_font(r, 'Times New Roman', 11, bold=True, color_rgb=(0, 51, 102))
                elif col_idx == 1: # Name
                    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
                    for r in p.runs:
                        set_run_font(r, 'Times New Roman', 11, bold=False, color_rgb=(17, 24, 39))
                else: # Actor
                    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
                    for r in p.runs:
                        set_run_font(r, 'Times New Roman', 10, italic=True, color_rgb=(55, 65, 81))
            else: # Actors table
                if col_idx == 0:
                    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
                    for r in p.runs:
                        set_run_font(r, 'Times New Roman', 11, bold=True, color_rgb=(0, 51, 102))
                else:
                    p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
                    for r in p.runs:
                        set_run_font(r, 'Times New Roman', 11, bold=False, color_rgb=(17, 24, 39))

    # Set Column Widths
    for row in table.rows:
        for idx, width in enumerate(col_widths):
            row.cells[idx].width = width

def main():
    print('Loading document:', DOC_PATH)
    doc = docx.Document(DOC_PATH)

    # Table 1: Bảng 3.1 Danh sách tác nhân và mô tả
    t1 = doc.tables[1]
    parent1 = t1._element.getparent()
    idx1 = parent1.index(t1._element)

    print('Building new Table 1 (Actors)...')
    new_t1 = doc.add_table(rows=1, cols=2)
    format_table(new_t1, [Inches(1.8), Inches(4.7)], ['Tác nhân', 'Mô tả tác nhân trong hệ thống HONA FRESH'], ACTORS_DATA, is_uc_table=False)
    parent1.insert(idx1, new_t1._element)
    parent1.remove(t1._element)
    print('Table 1 replaced successfully.')

    # Table 2: Bảng 3.2 Danh sách các tình huống hoạt động (Use cases)
    # Notice: Table 2 is now at doc.tables[2]
    t2 = doc.tables[2]
    parent2 = t2._element.getparent()
    idx2 = parent2.index(t2._element)

    print('Building new Table 2 (Use Cases)...')
    new_t2 = doc.add_table(rows=1, cols=3)
    format_table(new_t2, [Inches(1.0), Inches(3.7), Inches(1.8)], ['Mã UC', 'Tên Tình Huống Hoạt Động (Use Case)', 'Tác Nhân Thực Hiện'], USE_CASES_DATA, is_uc_table=True)
    parent2.insert(idx2, new_t2._element)
    parent2.remove(t2._element)
    print('Table 2 replaced successfully.')

    doc.save(DOC_PATH)
    print('Document saved successfully with updated Use Case tables!')

if __name__ == '__main__':
    main()
