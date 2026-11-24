# -*- coding: utf-8 -*-
import docx
from docx.shared import Pt, Inches, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

DOC_PATH = 'e:/HOCTAP/WWW/BTL_WebBanRau/doc/Bao_cao_do_an_HoNa_Fresh_UPDATED.docx'

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

def insert_styled_para_before(doc, target_para, text, style_type):
    p = target_para.insert_paragraph_before()
    p.paragraph_format.line_spacing = 1.3
    p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    
    if style_type == 'h2':
        p.style = doc.styles['Heading 2']
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        p.paragraph_format.space_before = Pt(12)
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
    elif style_type == 'caption':
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_before = Pt(4)
        p.paragraph_format.space_after = Pt(10)
        run = p.add_run(text)
        set_run_font(run, 'Times New Roman', 11, bold=True, italic=True, color_rgb=(80, 80, 80))
    elif style_type == 'bullet':
        p.paragraph_format.space_before = Pt(2)
        p.paragraph_format.space_after = Pt(4)
        p.paragraph_format.left_indent = Inches(0.35)
        p.paragraph_format.first_line_indent = Inches(-0.2)
        run = p.add_run(text)
        set_run_font(run, 'Times New Roman', 13, bold=False)
    else: # normal
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(6)
        p.paragraph_format.first_line_indent = Inches(0.5)
        run = p.add_run(text)
        set_run_font(run, 'Times New Roman', 13, bold=False)
    return p

CLASS_DIAGRAM_SECTION = [
    ("3.3. Sơ đồ lớp (Class Diagram)", "h2"),
    ("Sơ đồ lớp (UML Class Diagram) của nền tảng B2B HONA FRESH mô hình hóa cấu trúc tĩnh của hệ thống, bao gồm các lớp thực thể (Entity Classes) trong kiến trúc backend Spring Data JPA, các thuộc tính dữ liệu, các phương thức nghiệp vụ và mối quan hệ ràng buộc ngữ nghĩa giữa các đối tượng. Hệ thống gồm 22 lớp thực thể chính được tổ chức thành 4 phân hệ gói (Packages) nghiệp vụ cốt lõi:", "normal"),
    
    ("3.3.1. Phân hệ Định danh & Quản lý đối tác (Identity & Profile Package)", "h3"),
    ("• Lớp User: Lớp thực thể người dùng trung tâm, quản lý định danh tài khoản, cơ chế băm mật khẩu BCrypt, vai trò hệ thống (Role) và trạng thái xét duyệt KYC. Quan hệ kết tập mạnh (Composition) 1-1 với lớp FarmerProfile (hồ sơ nông trại, chứng chỉ VietGAP, mã số vùng trồng PUC) và lớp BuyerProfile (hồ sơ doanh nghiệp, giấy phép kinh doanh, điểm uy tín).", "bullet"),
    ("• Lớp BuyerWarehouse: Quản lý danh mục các địa chỉ kho tiếp nhận hàng của thương lái, có quan hệ n-1 với BuyerProfile để hỗ trợ giao hàng đa điểm kho.", "bullet"),

    ("3.3.2. Phân hệ Chợ sỉ & Đàm phán RFQ (Marketplace & RFQ Package)", "h3"),
    ("• Lớp Category & Product: Quản lý cây phân loại danh mục nông sản (rau ăn lá, củ quả, nấm ăn) và thông tin mặt hàng chuẩn.", "bullet"),
    ("• Lớp HarvestLot: Đại diện cho từng đợt nông sản xuất vườn của nhà vườn, lưu trữ sản lượng dự kiến (expectedWeightKg), sản lượng khả dụng (availableWeightKg), đơn giá chào bán và ngày thu hoạch. Lớp này chứa các phương thức nghiệp vụ quan trọng như reserveQuantity() để giữ hàng khi chốt hợp đồng và closeLot() khi kết thúc mùa vụ.", "bullet"),
    ("• Lớp RfqNegotiation: Mô hình hóa phiên đàm phán giá và số lượng hai chiều, lưu trữ các bước trả giá đối ứng (counterPrice, counterQuantity), số vòng đàm phán (roundNumber), trạng thái máy hữu hạn (status) và hạn định phản hồi (expiresAt). Quan hệ 1-n với B2bChatMessage để lưu trữ lịch sử tin nhắn trao đổi.", "bullet"),

    ("3.3.3. Phân hệ Hợp đồng & Kế toán Escrow (Contract & Finance Package)", "h3"),
    ("• Lớp B2bContract: Thực thể pháp lý kinh tế số, được tự động sinh ra khi RFQ đạt trạng thái ACCEPTED. Lưu trữ mã hợp đồng duy nhất, tổng giá trị, số tiền cọc 30% bảo chứng Escrow (depositAmount), trạng thái thực thi (fulfillmentStatus) và các tham chiếu logistics. Quan hệ 1-n với PaymentTransaction để ghi nhận các giao dịch cọc 30% và thanh toán 70% còn lại.", "bullet"),
    ("• Lớp Settlement: Quản lý quyết toán tài chính cuối cùng sau khi hoàn tất giao nhận ePOD, tự động khấu trừ tỷ lệ phí dịch vụ sàn (platformFee) và hạch toán số tiền giải ngân thực nhận cho nhà vườn (netPayout).", "bullet"),

    ("3.3.4. Phân hệ Logistics Chuỗi lạnh & Quản lý Trạm Hub (Logistics & Cold Chain Package)", "h3"),
    ("• Lớp WarehouseHub: Quản lý các trạm trung chuyển nông sản, liên kết trực tiếp với danh sách xe tải lạnh (FleetVehicle) và đội ngũ tài xế (FleetDriver) được biên chế tại trạm.", "bullet"),
    ("• Lớp PickupTrip & PickupTripStop: Điều phối tuyến xe tải lạnh đi gom nông sản tại nhiều vườn nông dân (Inbound Logistics), ghi nhận khối lượng thực tế và nhiệt độ bàn giao tại vườn.", "bullet"),
    ("• Lớp QcInspection: Quản lý kết quả kiểm nghiệm KCS chất lượng tại trạm Hub: độ ngọt quang học (qcBrix), dư lượng phân bón Nitrat (qcNitratePpm) và an toàn thuốc bảo vệ thực vật, quyết định tỷ lệ phân loại Grade 1 của lô hàng.", "bullet"),
    ("• Lớp OutboundDeliveryTrip & OutboundDeliveryStop: Điều phối chuyến xe tải lạnh giao hàng chặng cuối từ Hub đến kho của từng Buyer. Lớp OutboundDeliveryStop ghi nhận biên bản giao nhận điện tử ePOD có đính kèm ảnh chụp hiện trường và chữ ký số cảm ứng của người nhận.", "bullet"),
    ("• Lớp IotSensorLog: Lưu trữ chuỗi dữ liệu telemetry cảm biến nhiệt độ (temperatureC) và độ ẩm (humidityPercent) theo thời gian thực để cảnh báo vi phạm dải bảo quản lạnh an toàn.", "bullet"),

    ("Hình 3.19 Sơ đồ lớp chi tiết hệ thống B2B HONA FRESH (UML Class Diagram)", "caption")
]

def main():
    print('Loading document:', DOC_PATH)
    doc = docx.Document(DOC_PATH)
    
    # Locate Chapter 4 heading
    p_ch4 = None
    for p in doc.paragraphs:
        if p.style.name == 'Heading 1' and 'CHƯƠNG 4' in p.text.strip():
            p_ch4 = p
            break
            
    assert p_ch4 is not None, 'Could not find CHƯƠNG 4'
    print('Found CHƯƠNG 4 paragraph:', p_ch4.text)
    
    # Check if section 3.3 already exists
    exists = any('3.3. Sơ đồ lớp' in p.text for p in doc.paragraphs)
    if exists:
        print('Section 3.3 already exists in document, skipping insertion.')
        return

    print('Inserting Section 3.3 Class Diagram before Chapter 4...')
    for text, stype in CLASS_DIAGRAM_SECTION:
        insert_styled_para_before(doc, p_ch4, text, stype)
        
    doc.save(DOC_PATH)
    print('Section 3.3 Class Diagram inserted successfully and saved to:', DOC_PATH)

if __name__ == '__main__':
    main()
