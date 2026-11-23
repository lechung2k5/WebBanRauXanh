# -*- coding: utf-8 -*-
"""
Script vẽ sơ đồ Use Case Tổng Quát cho hệ thống HONA FRESH theo đúng form chuẩn khóa luận tốt nghiệp.
Bao gồm:
- 4 Tác nhân chính: Guest (Xanh lá), Buyer (Xanh dương), Farmer (Xanh ngọc), Admin (Cam).
- 2 Tác nhân ngoại vi: Payment Gateway & IoT Sensor Hub (Hồng tím).
- Khung hệ thống (System boundary) với Header tiêu đề chuẩn.
- Các Use case cha và Use case con liên kết bằng quan hệ <<extend>>.
"""

import matplotlib.pyplot as plt
import matplotlib.patches as patches
from matplotlib.patches import FancyBboxPatch, Circle
import numpy as np

# Cấu hình font chữ hỗ trợ tiếng Việt
plt.rcParams['font.sans-serif'] = ['Segoe UI', 'Arial', 'DejaVu Sans', 'Tahoma']
plt.rcParams['axes.unicode_minus'] = False

def draw_stick_figure(ax, x, y, name, subname, color):
    """Vẽ biểu tượng tác nhân (Actor stick figure) chuẩn UML"""
    head_radius = 1.4
    head_y = y + 4.2
    # Đầu tròn
    head = Circle((x, head_y), head_radius, facecolor='white', edgecolor=color, linewidth=2.0, zorder=5)
    ax.add_patch(head)
    # Thân
    ax.plot([x, x], [head_y - head_radius, y - 1.2], color=color, linewidth=2.0, zorder=5)
    # Tay
    ax.plot([x - 2.6, x + 2.6], [y + 1.2, y + 1.2], color=color, linewidth=2.0, zorder=5)
    # Chân
    ax.plot([x, x - 2.2], [y - 1.2, y - 5.0], color=color, linewidth=2.0, zorder=5)
    ax.plot([x, x + 2.2], [y - 1.2, y - 5.0], color=color, linewidth=2.0, zorder=5)
    
    # Nhãn tên tác nhân bên dưới
    ax.text(x, y - 7.0, name, ha='center', va='top', fontsize=9.5, fontweight='bold', color=color, zorder=6)
    if subname:
        ax.text(x, y - 9.2, f"({subname})", ha='center', va='top', fontsize=8.0, color='#374151', zorder=6)

def draw_use_case(ax, x, y, w, h, text, bg_color, border_color, border_width=1.2, is_bold=False, fontsize=8.0):
    """Vẽ oval Use Case chuẩn UML với bo góc mềm mại"""
    # Sử dụng FancyBboxPatch với boxstyle round để tạo hình oval/viên thuốc đẹp mắt
    bbox = FancyBboxPatch(
        (x - w / 2, y - h / 2), w, h,
        boxstyle=f"round,pad=0.2,rounding_size={h / 2}",
        facecolor=bg_color,
        edgecolor=border_color,
        linewidth=border_width,
        zorder=3
    )
    ax.add_patch(bbox)
    fontweight = 'bold' if is_bold else 'normal'
    ax.text(x, y, text, ha='center', va='center', fontsize=fontsize, fontweight=fontweight, color='#111827', zorder=4)

def draw_actor_link(ax, x1, y1, x2, y2, color):
    """Đường nối liền nét từ Tác nhân tới Use case cha"""
    ax.plot([x1, x2], [y1, y2], color=color, linewidth=1.1, linestyle='-', zorder=2)

def draw_extend_link(ax, x1, y1, x2, y2, direction='right'):
    """Đường nối đứt nét <<extend>> từ Use case cha sang Use case con"""
    # Nối từ mép của UC1 sang mép của UC2
    ax.plot([x1, x2], [y1, y2], color='#6b7280', linewidth=0.9, linestyle='--', zorder=2)
    # Đặt nhãn <<extend>> ở giữa
    mx = (x1 + x2) / 2
    my = (y1 + y2) / 2
    ax.text(mx, my + 0.35, '<<extend>>', ha='center', va='bottom', fontsize=5.8, fontstyle='italic', color='#4b5563', zorder=5)

def generate_hona_fresh_use_case_diagram():
    fig = plt.figure(figsize=(25, 17), dpi=220)
    ax = fig.add_axes([0.02, 0.02, 0.96, 0.96])
    ax.set_xlim(0, 250)
    ax.set_ylim(0, 170)
    ax.axis('off')

    # 1. KHUNG HỆ THỐNG (SYSTEM BOUNDARY)
    box_left = 18
    box_right = 232
    box_bottom = 8
    box_top = 164
    
    # Đường bao ngoài
    system_rect = patches.Rectangle(
        (box_left, box_bottom), box_right - box_left, box_top - box_bottom,
        linewidth=1.8, edgecolor='#1f2937', facecolor='#fafafa', zorder=1
    )
    ax.add_patch(system_rect)

    # Khung tiêu đề hệ thống ở trên cùng
    title_w = 140
    title_h = 5.5
    title_x = (box_left + box_right) / 2
    title_y = box_top - 4.5
    title_rect = patches.Rectangle(
        (title_x - title_w / 2, title_y - title_h / 2), title_w, title_h,
        linewidth=1.4, edgecolor='#1f2937', facecolor='#ffffff', zorder=2
    )
    ax.add_patch(title_rect)
    ax.text(title_x, title_y, 'HỆ THỐNG NỀN TẢNG B2B NÔNG SẢN VÀ CHUỖI CUNG ỨNG HONA FRESH', 
            ha='center', va='center', fontsize=12.5, fontweight='bold', color='#111827', zorder=4)

    # ==========================================================
    # CỘT TRÁI (LEFT SIDE): GUEST & BUYER
    # ==========================================================
    # TỌA ĐỘ CÁC CỘT:
    # Actor Left: x = 9
    # Parent UC Left: x = 40 (w = 21, h = 2.8)
    # Child UC Left: x = 75 (w = 26, h = 2.4)

    # ----------------------------------------------------------
    # 1. ACTOR GUEST (XANH LÁ)
    # ----------------------------------------------------------
    draw_stick_figure(ax, 9, 134, 'Guest', 'Khách vãng lai', '#2e7d32')
    guest_actor_x, guest_actor_y = 11, 136

    guest_parents = [
        ('Xem thông tin nền tảng', 152, [
            'Xem trang chủ & banner thị trường',
            'Xem giới thiệu quy trình B2B HoNa',
            'Xem quy chuẩn chất lượng VietGAP'
        ]),
        ('Xem nông sản & nhà vườn', 140, [
            'Tìm kiếm nông sản sỉ trực tuyến',
            'Lọc theo tiêu chuẩn & vùng trồng',
            'Xem danh mục ngành hàng rau củ',
            'Xem hồ sơ năng lực nhà vườn',
            'Xem bảng giá thị trường tham khảo'
        ]),
        ('Xem chính sách nền tảng', 126, [
            'Xem chính sách bảo chứng Escrow',
            'Xem quy định kiểm định trạm Hub'
        ]),
        ('Quản lý đăng ký tài khoản', 115, [
            'Đăng ký tài khoản (Buyer / Farmer)',
            'Đăng nhập vào hệ thống',
            'Quên mật khẩu / Xác thực qua OTP',
            'Đặt lại mật khẩu mới'
        ])
    ]

    for p_text, p_y, children in guest_parents:
        # Vẽ Parent UC
        draw_use_case(ax, 40, p_y, 22, 2.9, p_text, '#c8e6c9', '#2e7d32', border_width=1.4, is_bold=True, fontsize=8.0)
        draw_actor_link(ax, guest_actor_x, guest_actor_y, 40 - 11, p_y, '#2e7d32')

        # Vẽ Children UCs
        num_c = len(children)
        c_step = 2.7
        total_h = (num_c - 1) * c_step
        start_cy = p_y + total_h / 2
        for idx, c_text in enumerate(children):
            cy = start_cy - idx * c_step
            draw_use_case(ax, 77, cy, 28, 2.3, c_text, '#e8f5e9', '#81c784', border_width=1.0, is_bold=False, fontsize=7.4)
            draw_extend_link(ax, 40 + 11, p_y, 77 - 14, cy)

    # ----------------------------------------------------------
    # 2. ACTOR BUYER (XANH DƯƠNG)
    # ----------------------------------------------------------
    draw_stick_figure(ax, 9, 62, 'Buyer', 'Thương lái thu mua', '#1565c0')
    buyer_actor_x, buyer_actor_y = 11, 64

    buyer_parents = [
        ('Quản lý hồ sơ doanh nghiệp', 96, [
            'Xem thông tin doanh nghiệp',
            'Cập nhật GPKD & địa chỉ nhận hàng',
            'Đổi mật khẩu & cài đặt bảo mật'
        ]),
        ('Tìm kiếm & chọn nguồn hàng', 84, [
            'Tìm kiếm nông sản theo từ khóa / AI',
            'Lọc nguồn hàng theo mùa vụ & giá',
            'Xem hồ sơ chứng nhận nhà vườn'
        ]),
        ('Tạo & đàm phán báo giá (RFQ)', 70, [
            'Tạo yêu cầu báo giá sỉ (RFQ)',
            'Đề xuất mức giá & số lượng sỉ',
            'Thương lượng điều khoản (Counter-offer)',
            'Chấp nhận giá chốt lô nông sản'
        ]),
        ('Quản lý hợp đồng & ký quỹ', 53, [
            'Xem hợp đồng điện tử B2B',
            'Ký số hợp đồng thỏa thuận',
            'Nạp ký quỹ Escrow đợt 1 (30%)',
            'Thanh toán số tiền còn lại (70%)'
        ]),
        ('Theo dõi điều phối & nhận hàng', 35, [
            'Theo dõi hành trình xe lạnh trên bản đồ',
            'Giám sát nhiệt độ / độ ẩm xe lạnh',
            'Kiểm tra biên bản giám định Hub QC',
            'Xác nhận nhận hàng & ký biên bản ePOD'
        ]),
        ('Đánh giá & đối soát quyết toán', 18, [
            'Đánh giá chất lượng nông sản & đối tác',
            'Xem biên bản đối soát tài chính',
            'Gửi khiếu nại chất lượng hàng (nếu có)'
        ])
    ]

    for p_text, p_y, children in buyer_parents:
        draw_use_case(ax, 40, p_y, 23, 2.9, p_text, '#bbdefb', '#1565c0', border_width=1.4, is_bold=True, fontsize=8.0)
        draw_actor_link(ax, buyer_actor_x, buyer_actor_y, 40 - 11.5, p_y, '#1565c0')

        num_c = len(children)
        c_step = 2.6
        total_h = (num_c - 1) * c_step
        start_cy = p_y + total_h / 2
        for idx, c_text in enumerate(children):
            cy = start_cy - idx * c_step
            draw_use_case(ax, 77, cy, 28, 2.3, c_text, '#e3f2fd', '#90caf9', border_width=1.0, is_bold=False, fontsize=7.3)
            draw_extend_link(ax, 40 + 11.5, p_y, 77 - 14, cy)

    # ==========================================================
    # CỘT PHẢI (RIGHT SIDE): FARMER & ADMIN
    # ==========================================================
    # Actor Right: x = 241
    # Parent UC Right: x = 210 (w = 22, h = 2.9)
    # Child UC Right: x = 173 (w = 28, h = 2.4)

    # ----------------------------------------------------------
    # 3. ACTOR FARMER (XANH NGỌC / TEAL)
    # ----------------------------------------------------------
    draw_stick_figure(ax, 241, 134, 'Farmer', 'Nhà vườn / HTX', '#00695c')
    farmer_actor_x, farmer_actor_y = 239, 136

    farmer_parents = [
        ('Quản lý nông trại & hồ sơ', 152, [
            'Xem thông tin nông trại / HTX',
            'Cập nhật chứng nhận VietGAP / GlobalGAP',
            'Cập nhật diện tích canh tác & vùng trồng'
        ]),
        ('Quản lý đăng bán lô nông sản', 140, [
            'Đăng bán lô nông sản sỉ mới',
            'Cập nhật ngày thu hoạch dự kiến',
            'Quản lý sản lượng & trạng thái mở bán'
        ]),
        ('Xử lý đàm phán báo giá RFQ', 126, [
            'Xem danh sách RFQ từ thương lái',
            'Gửi phản hồi báo giá (Counter-offer)',
            'Đồng ý chốt giá thỏa thuận với buyer'
        ]),
        ('Thực hiện hợp đồng & giao hàng', 111, [
            'Xác nhận & ký hợp đồng B2B điện tử',
            'Thu hoạch & đóng gói theo quy cách',
            'In mã vạch truy xuất nguồn gốc QR',
            'Bàn giao nông sản cho xe gom First-mile'
        ]),
        ('Quản lý tài chính & ví tiền', 95, [
            'Theo dõi tiền ký quỹ Escrow bảo chứng',
            'Nhận tiền thanh toán giải ngân sau giao',
            'Yêu cầu rút tiền về tài khoản ngân hàng'
        ])
    ]

    for p_text, p_y, children in farmer_parents:
        draw_use_case(ax, 210, p_y, 23, 2.9, p_text, '#b2dfdb', '#00695c', border_width=1.4, is_bold=True, fontsize=8.0)
        draw_actor_link(ax, farmer_actor_x, farmer_actor_y, 210 + 11.5, p_y, '#00695c')

        num_c = len(children)
        c_step = 2.6
        total_h = (num_c - 1) * c_step
        start_cy = p_y + total_h / 2
        for idx, c_text in enumerate(children):
            cy = start_cy - idx * c_step
            draw_use_case(ax, 173, cy, 28, 2.3, c_text, '#e0f2f1', '#80cbc4', border_width=1.0, is_bold=False, fontsize=7.3)
            draw_extend_link(ax, 210 - 11.5, p_y, 173 + 14, cy)

    # ----------------------------------------------------------
    # 4. ACTOR ADMIN (VÀNG CAM)
    # ----------------------------------------------------------
    draw_stick_figure(ax, 241, 48, 'Admin', 'Quản trị viên & Kế toán', '#e65100')
    admin_actor_x, admin_actor_y = 239, 50

    admin_parents = [
        ('Quản lý tài khoản & định danh', 80, [
            'Thẩm định hồ sơ Nhà vườn / Thương lái',
            'Xem danh sách người dùng & phân quyền',
            'Khóa / Mở khóa tài khoản thành viên'
        ]),
        ('Kiểm duyệt sàn & danh mục', 66, [
            'Kiểm duyệt bài đăng lô nông sản sỉ',
            'Quản lý danh mục chủng loại nông sản',
            'Gỡ bỏ bài đăng vi phạm quy chế sàn'
        ]),
        ('Quản lý hợp đồng & hòa giải', 52, [
            'Giám sát tiến độ hợp đồng B2B toàn sàn',
            'Tiếp nhận & xử lý tranh chấp khiếu nại',
            'Xử lý vi phạm & chế tài phạt cọc Escrow'
        ]),
        ('Điều phối Logistics & Trạm Hub', 38, [
            'Phân công tài xế điều xe gom / xe tuyến',
            'Giám sát hoạt động xuất nhập kho trạm Hub',
            'Cảnh báo vi phạm ngưỡng nhiệt độ kho lạnh'
        ]),
        ('Quản lý tài chính & Escrow', 24, [
            'Kiểm soát dòng tiền tài khoản Escrow',
            'Đối soát phí sàn & khấu trừ dịch vụ Hub/Xe',
            'Phê duyệt lệnh rút tiền của đối tác'
        ]),
        ('Báo cáo thống kê & Trợ lý AI', 13, [
            'Báo cáo doanh thu & sản lượng giao dịch',
            'Báo cáo tỷ lệ hao hụt nông sản chuỗi cung ứng',
            'Phân tích biến động giá & dự báo cung cầu AI'
        ])
    ]

    for p_text, p_y, children in admin_parents:
        draw_use_case(ax, 210, p_y, 23, 2.9, p_text, '#ffe0b2', '#e65100', border_width=1.4, is_bold=True, fontsize=8.0)
        draw_actor_link(ax, admin_actor_x, admin_actor_y, 210 + 11.5, p_y, '#e65100')

        num_c = len(children)
        c_step = 2.5
        total_h = (num_c - 1) * c_step
        start_cy = p_y + total_h / 2
        for idx, c_text in enumerate(children):
            cy = start_cy - idx * c_step
            draw_use_case(ax, 173, cy, 28, 2.3, c_text, '#fff3e0', '#ffb74d', border_width=1.0, is_bold=False, fontsize=7.2)
            draw_extend_link(ax, 210 - 11.5, p_y, 173 + 14, cy)

    # ==========================================================
    # TÁC NHÂN NGOẠI VI DƯỚI CÙNG (EXTERNAL SERVICES)
    # ==========================================================
    # 1. Payment Gateway (Hồng)
    draw_stick_figure(ax, 114, 4.5, 'Payment Gateway', 'External Service', '#c2185b')
    # Đường nối từ Payment Gateway đến các UC thanh toán:
    # Buyer UC: Nạp ký quỹ Escrow đợt 1 (30%) & Thanh toán 70%
    ax.plot([114, 105, 91], [4.5, 48, 51.5], color='#c2185b', linewidth=1.1, linestyle='-', zorder=3)
    # Farmer UC: Yêu cầu rút tiền về ngân hàng
    ax.plot([114, 130, 159], [4.5, 85, 92.4], color='#c2185b', linewidth=1.1, linestyle='-', zorder=3)

    # 2. IoT Sensor Hub (Tím)
    draw_stick_figure(ax, 136, 4.5, 'IoT Sensor Hub', 'External Service', '#7b1fa2')
    # Đường nối tới Giám sát nhiệt độ / độ ẩm xe lạnh
    ax.plot([136, 125, 91], [4.5, 28, 36.3], color='#7b1fa2', linewidth=1.1, linestyle='-', zorder=3)
    # Đường nối tới Cảnh báo vi phạm ngưỡng nhiệt độ kho lạnh
    ax.plot([136, 145, 159], [4.5, 30, 35.5], color='#7b1fa2', linewidth=1.1, linestyle='-', zorder=3)

    # Lưu file PNG chất lượng cao và SVG
    png_path = 'docs/diagrams/use_case_diagram_b2b.png'
    svg_path = 'docs/diagrams/use_case_diagram_b2b.svg'
    fig.savefig(png_path, dpi=220, bbox_inches='tight', facecolor='#ffffff')
    fig.savefig(svg_path, bbox_inches='tight', facecolor='#ffffff')
    print(f'Saved: {png_path}')
    print(f'Saved: {svg_path}')
    plt.close(fig)

if __name__ == '__main__':
    generate_hona_fresh_use_case_diagram()
