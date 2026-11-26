# KẾ HOẠCH TRIỂN KHAI: LÀM LẠI CHỨC NĂNG GIAO HÀNG (OUTBOUND) VỚI BẢN ĐỒ GIÁM SÁT ĐỘI XE & DANH SÁCH CHUYẾN

---

## A. Overview

- **Tên chức năng:** Tái thiết kế phân hệ **Giao hàng (`/admin/outbound-dispatch`)** theo mô hình Control Tower trực quan gồm **Bản đồ Giám sát Đội xe & Tiến độ Giao hàng thời gian thực** kết hợp **Bảng / Thẻ Danh sách Đơn & Chuyến giao hàng**.
- **Mục tiêu:**
  1. Thay thế giao diện chia tab rời rạc hiện tại bằng một màn hình điều hành tập trung:
     - **Khối trên — Bản đồ Giám sát Đội xe (Goong Maps + MapLibre GL JS):** Hiển thị vị trí Hub xuất phát, toàn bộ xe lạnh đang hoạt động/chạy chuyến/sẵn sàng, nhiệt độ buồng lạnh từng xe, bộ lọc đội xe, và click vào xe để xem thẻ thông tin + lộ trình tuyến đường tới điểm giao Buyer.
     - **Khối dưới — Danh sách Đơn & Chuyến giao hàng đa năng:** Thanh tìm kiếm đa trường, chuyển đổi **Dạng Danh Sách / Dạng Thẻ Card**, bộ lọc nhanh theo trạng thái (`Tất Cả`, `Chờ Ghép Chuyến`, `Đang Giao Hàng`, `Chờ Buyer Xác Nhận`, `Hoàn Tất & Quyết Toán`), và các nút thao tác nhanh trực tiếp trên từng dòng.
  2. Giữ nguyên và tối ưu toàn bộ nghiệp vụ cốt lõi hiện có của HONA FRESH (Ghép chuyến đa điểm `confirmOutboundTrip`, Tài xế nộp ePOD, Buyer xác nhận, Quyết toán 70%, In hóa đơn/phiếu xuất kho, Hủy chuyến).
- **Đối tượng sử dụng:** Admin / Điều phối viên Kho HoNa Fresh.

---

## B. Current Architecture

- **Frontend hiện có:**
  - `frontend/src/app/admin/outbound-dispatch/page.tsx`: Đang tổ chức theo 3 tab (`ELIGIBLE`, `TRIPS`, `COMPLETED`), chưa có bản đồ tổng quan đội xe đang hoạt động, chưa có chế độ chuyển Danh sách / Thẻ Card, chưa có bộ lọc nhanh theo trạng thái & đội xe.
  - `frontend/src/components/common/GoongMapViewer.tsx` & `frontend/src/services/goongMapService.ts`: Đã tích hợp sẵn **Goong Maps + MapLibre GL JS** (tải qua CDN, zero-install) và các hàm Geocoding (`geocodeAddress`), lấy tuyến đường (`getRouteDirections`), giải mã polyline (`decodePolyline`).
  - `frontend/src/services/fleetDispatchApi.ts`: Đã có đầy đủ API lấy đơn đủ điều kiện (`getEligibleOutboundContracts`), danh sách chuyến (`getOutboundTrips`), đơn hoàn tất (`getCompletedDeliveries`), xe (`getVehicles`), tài xế (`getDrivers`), xác nhận/hủy chuyến, ePOD, quyết toán.
- **Backend hiện có:**
  - `AdminOutboundDispatchController.java` & `OutboundDispatchService.java`: Đã cung cấp đầy đủ endpoints `/admin/outbound-dispatch/*`.
  - `FleetVehicle.java`, `OutboundDeliveryTrip.java`, `OutboundDeliveryStop.java`: Đã có `plateNumber`, `vehicleType`, `minTemp`/`maxTemp`, `status`, `deliveryAddress`, `hub`.

---

## C. Implementation Scope

### Frontend
1. **Tạo component mới `frontend/src/components/admin/OutboundFleetMap.tsx`:**
   - Tái sử dụng thư viện **MapLibre GL JS + Goong Maps Tiles** (`GOONG_MAP_STYLE_URL` từ `goongMapService.ts`, không cài thêm npm package).
   - **Header bar tối màu (`bg-[#071728]`):**
     - Tiêu đề **GIÁM SÁT ĐỘI XE & TIẾN ĐỘ GIAO HÀNG** + badge đếm số xe đang hoạt động.
     - Nút **Xem Toàn Bộ (X Xe)** (fitBounds toàn bộ marker), badge **Trực Tuyến**, **Bảo quản đạt chuẩn (%)**.
     - Thanh **Bộ lọc đội xe**: `Tất Cả`, `Xe Tải Lạnh`, `Xe Bán Tải / Van`, `Đang Giao Hàng`, `Sẵn Sàng Tại Kho`.
   - **Bản đồ tương tác:**
     - Marker Hub trung tâm (tọa độ theo `selectedHubId` đang chọn trên Header).
     - Marker các xe thuộc Hub (gồm xe đang thực hiện chuyến `ON_DELIVERY`/`ASSIGNED` và xe `AVAILABLE` tại kho): hiển thị icon xe + pill nhãn `Tên tài xế • Nhiệt độ°C` (lấy từ `coldAssets` hoặc `minTemp`/`maxTemp` của xe).
     - Khi click vào một xe trên bản đồ (hoặc bấm "Xem Lộ Trình" từ bảng bên dưới):
       - Hiển thị card thông tin nổi góc trên bên trái (Tên tài xế, Biển số, Kho trực thuộc, Số điểm giao đã gán, Tuyến đường & Nhiệt độ).
       - Vẽ tuyến đường polyline thực tế (hoặc đường nối qua `getRouteDirections`) từ Hub -> các điểm giao Buyer của chuyến đó.
2. **Tái cấu trúc `frontend/src/app/admin/outbound-dispatch/page.tsx`:**
   - **Phần 1:** Nhúng `<OutboundFleetMap />` ở đầu trang (đồng bộ theo `selectedHubId` trên Header).
   - **Phần 2:** Thanh tiêu đề danh sách + nút **"+ Ghép Chuyến Giao Hàng Mới"** (hiển thị badge số đơn `QC_PASSED` đang chờ ghép chuyến).
   - **Phần 3:** Thanh công cụ lọc & tìm kiếm hợp nhất:
     - Ô tìm kiếm nhanh theo mã hợp đồng, mã chuyến, tên Buyer, SĐT, địa chỉ giao, tên tài xế, biển số xe.
     - Nút chuyển đổi hiển thị: **Dạng Danh Sách** (Table) / **Dạng Thẻ Card** (Grid Cards).
     - Nhóm pill lọc trạng thái: `Tất Cả`, `Chờ Ghép Chuyến`, `Đang Giao Hàng`, `Chờ Buyer Xác Nhận`, `Hoàn Tất & Quyết Toán`.
     - Hiển thị bộ đếm: *Đang hiển thị: X đơn / chuyến*.
   - **Phần 4:** Bảng danh sách hợp nhất (hoặc lưới Card khi chọn Dạng Thẻ Card) với các cột:
     - `MÃ ĐƠN & CHUYẾN` (Mã HĐ, Mã chuyến `OB-...`, badge kho/loại)
     - `KHÁCH HÀNG & ĐỊA CHỈ` (Tên Buyer, SĐT, địa chỉ giao)
     - `TÀI XẾ & XE LẠNH` (Tên tài xế, loại xe, biển số, nhiệt độ)
     - `CÒN LẠI (70%)` (Số tiền còn lại cần thanh toán / đã quyết toán)
     - `TRẠNG THÁI` (Badge màu rõ ràng từng bước)
     - `THAO TÁC NHANH` (Ghép Chuyến, Xem Trên Bản Đồ, Tài Xế Giao ePOD, Buyer Xác Nhận, Quyết Toán 70%, Phiếu Giao / Hóa Đơn, Chi Tiết ePOD, Hủy Chuyến).
   - **Phần 5:** Giữ nguyên toàn bộ các Modal nghiệp vụ hiện có (Modal Ghép Chuyến Mới, Modal ePOD, Modal Buyer Xác Nhận, Modal Quyết Toán 70%, Modal Hóa Đơn, Modal Hủy Chuyến).

### Backend
- **Không bắt buộc thay đổi Schema Database hay API Contract.**
- Kiểm tra bổ sung trường `hubId` / `lat` / `lng` (nếu có trong `buyer_warehouses` hoặc `warehouse_hubs`) hoặc trả thêm thông tin điểm giao chuẩn trong `OutboundDispatchService.getTripsByHub` nếu cần để geocode chính xác hơn trên bản đồ (chỉ bổ sung trường đọc thêm, không phá vỡ API cũ).

### Database
- Không thay đổi bảng hay chạy migration.

---

## D. API Contract

Tận dụng 100% các API hiện có:
- `GET /admin/outbound-dispatch/eligible-contracts?hubId={id}` — Danh sách hợp đồng `QC_PASSED` chờ ghép chuyến.
- `GET /admin/outbound-dispatch/trips?hubId={id}` — Danh sách chuyến xe đang hoạt động / đã phân công.
- `GET /admin/outbound-dispatch/completed-deliveries?hubId={id}` — Danh sách điểm giao đã hoàn tất.
- `GET /admin/fleet/vehicles?warehouseId={id}` — Danh sách đội xe tại Hub (lấy cả xe đang chạy và xe sẵn sàng để hiển thị lên bản đồ).
- `GET /admin/fleet/drivers?warehouseId={id}` — Danh sách tài xế tại Hub.
- `GET /admin/cold-assets` — Dữ liệu cảm biến nhiệt độ buồng lạnh của xe.
- Các API thao tác (`confirm-trip`, `cancel`, `epod`, `confirm-settlement`, `invoice`) giữ nguyên.

---

## E. Business Flow

1. Điều phối viên chọn Hub trên Header -> Trang **Giao hàng** tải dữ liệu đơn chờ ghép, chuyến đang chạy, đơn hoàn tất và toàn bộ đội xe tại Hub.
2. **Trên Bản đồ Giám sát:**
   - Hiển thị tất cả xe của Hub (xe đang giao hiển thị vị trí dọc tuyến tới Buyer + nhiệt độ buồng lạnh; xe sẵn sàng đỗ quanh Hub).
   - Điều phối viên có thể lọc theo loại xe / trạng thái, bấm vào 1 xe để xem popup chi tiết & vẽ tuyến đường giao hàng.
3. **Ở Danh sách bên dưới:**
   - Gộp cái nhìn tổng thể các đơn/chuyến thuộc Hub, hỗ trợ tìm kiếm tức thời và lọc theo từng giai đoạn.
   - Bấm **"Ghép Chuyến"** trên đơn `QC_PASSED` (hoặc nút **"+ Ghép Chuyến Giao Hàng Mới"**) để chọn xe + tài xế và xuất phát.
   - Với chuyến đang giao: bấm **"Xem Bản Đồ"** để focus thẳng lên xe đó trên bản đồ; hoặc thực hiện các thao tác nhanh **ePOD**, **Quyết Toán 70%**, **In Phiếu Giao**, **Chi Tiết**.

---

## F. Implementation Steps

1. Tạo `frontend/src/components/admin/OutboundFleetMap.tsx` tích hợp MapLibre GL JS + Goong Maps Tiles, bộ lọc đội xe, marker xe kèm nhiệt độ, popup thông tin xe và vẽ tuyến đường khi chọn xe.
2. Cập nhật `frontend/src/app/admin/outbound-dispatch/page.tsx`:
   - Tải toàn bộ danh sách xe của Hub (`getVehicles(selectedHubId)`) để hiển thị đầy đủ đội xe trên bản đồ.
   - Thay thế giao diện cũ bằng bố cục mới: `<OutboundFleetMap />` ở trên + Thanh tìm kiếm/lọc/chuyển List-Card + Bảng/Card danh sách đơn & chuyến với đầy đủ nút thao tác nhanh.
   - Tích hợp Modal Ghép Chuyến Mới (chọn nhiều hợp đồng `QC_PASSED`, chọn xe, chọn tài xế).
3. Kiểm tra tĩnh TypeScript (`npx tsc --noEmit`) và xác minh toàn bộ luồng nút thao tác nhanh hoạt động khớp API.

---

## G. Risks & Considerations

- **Geocoding địa chỉ Buyer:** Một số địa chỉ giao hàng có thể là chuỗi ngắn hoặc chưa có tọa độ sẵn; cần cache kết quả geocode từ Goong API theo địa chỉ và có fallback tọa độ hợp lý quanh khu vực Hub để tránh gọi API Goong trùng lặp hoặc marker bị mất.
- **Hiệu năng MapLibre:** Chỉ khởi tạo 1 instance MapLibre duy nhất, cập nhật marker qua ref khi đổi bộ lọc hoặc đổi Hub, tránh re-mount bản đồ liên tục.
- **Không thêm dependency mới:** Tái sử dụng hoàn toàn cơ chế tải MapLibre GL JS qua CDN có sẵn trong `GoongMapViewer.tsx`.

---

## H. Acceptance Criteria

1. Trang **Giao hàng** hiển thị **Bản đồ Giám sát Đội xe** trực quan (có bộ lọc xe, số xe đang hoạt động, marker xe kèm tên tài xế & nhiệt độ, click xe hiện card chi tiết & vẽ lộ trình).
2. Danh sách bên dưới hỗ trợ tìm kiếm, lọc trạng thái nhanh, chuyển đổi **Dạng Danh Sách / Dạng Thẻ Card**, và thực hiện đầy đủ các thao tác nhanh (Ghép chuyến, ePOD, Quyết toán 70%, In phiếu giao, Xem bản đồ, Hủy chuyến).
3. Không phát sinh lỗi TypeScript và không làm mất bất kỳ chức năng nghiệp vụ Outbound nào đang có.
