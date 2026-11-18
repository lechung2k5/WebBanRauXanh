# HONA FRESH — KẾ HOẠCH KỸ THUẬT OUTBOUND, ePOD & SETTLEMENT
## Phiên bản 2.1 — Hiệu chỉnh theo Schema PostgreSQL và quyết định nghiệp vụ

- **Dự án:** HONA FRESH
- **Kiến trúc:** Next.js / ReactJS, Java Spring Boot, PostgreSQL
- **Phạm vi:** Kế thừa Inbound Logistics & Receiving Hub; triển khai Outbound Delivery, ePOD, đối soát Q1–Q4 và quyết toán hai đầu.
- **Trạng thái:** **CHỜ PHÊ DUYỆT — CHƯA TRIỂN KHAI**
- **Cơ sở:** `docs/schema_webbanrau_db.sql` và 5 quyết định nghiệp vụ đã được người dùng xác nhận.
- **Nguyên tắc:** Không viết lại Inbound; không tạo WMS tổng quát không cần thiết; không tự ý thay đổi schema/API hiện hữu trước khi khảo sát code và dữ liệu đang chạy.

---

# 1. Quyết định nghiệp vụ đã chốt

| # | Nội dung | Quyết định chính thức | Hệ quả thiết kế |
|---|---|---|---|
| 1 | Một chuyến xe | **MULTI** — một chuyến có thể giao nhiều hợp đồng và nhiều kho Buyer | Một `outbound_delivery_trip` có nhiều `outbound_delivery_stops`. |
| 2 | Số lần giao một hợp đồng | **ONCE** — mỗi hợp đồng chỉ giao một lần | Mỗi hợp đồng chỉ có một stop/shipment Outbound; không hỗ trợ giao bù thành chuyến thứ hai trong phạm vi hiện tại. |
| 3 | Căn cứ tính tiền Nhà vườn | **Q4** — khối lượng Buyer thực nhận và chấp nhận | `settlements.qualified_weight` phải được tính từ khối lượng Q4 được chấp nhận, không lấy mặc định Q2 hoặc Q3. |
| 4 | Buyer xác nhận ePOD | **BOTH** — tài xế ghi nhận tại điểm giao và Buyer đăng nhập Portal xác nhận | ePOD có hai bước xác nhận riêng; tài xế hoàn tất gửi bằng chứng chưa đồng nghĩa Buyer đã xác nhận. |
| 5 | Khiếu nại | **BLOCK** — có khiếu nại đang mở thì khóa toàn bộ quyết toán hợp đồng | Chỉ cho phép chuyển sang trạng thái sẵn sàng quyết toán khi mọi claim của hợp đồng đã được xử lý/đóng. |

## 1.1. Diễn giải bắt buộc cho quy tắc ONCE

- “ONCE” áp dụng ở cấp **hợp đồng**, không phải cấp chuyến xe.
- Một chuyến vẫn có thể gom nhiều hợp đồng và nhiều Buyer Warehouse.
- Nếu Buyer nhận thiếu, từ chối một phần hoặc phát sinh hư hỏng, hệ thống ghi nhận phần thực nhận/từ chối và mở quy trình claim/đối soát.
- Không tạo chuyến giao lần hai cho phần thiếu trong phiên bản này. Phần thiếu được xử lý bằng điều chỉnh thương mại, bồi thường, hoàn tiền hoặc quyết định nghiệp vụ khác đã được phê duyệt.
- Không được tự động biến “giao thiếu” thành “giao nhiều đợt”; muốn thay đổi chính sách ONCE phải có quyết định nghiệp vụ mới và thiết kế lại constraint.

## 1.2. Diễn giải BOTH cho ePOD

1. Tài xế mở đúng stop, nhập số cân/kiện thực tế, ghi nhận hàng từ chối và lý do, chụp ảnh hiện trạng, xác nhận đã bàn giao.
2. Backend lưu bản ghi ePOD ở trạng thái `PENDING_BUYER_CONFIRMATION`.
3. Buyer đăng nhập Portal, xem cùng bộ dữ liệu và ảnh, xác nhận hoặc từ chối/xuất trình tranh chấp.
4. Chỉ khi Buyer xác nhận, ePOD mới ở trạng thái `BUYER_CONFIRMED` và Q4 được khóa làm căn cứ đối soát, trừ quy trình điều chỉnh có audit.
5. Không cho tài xế tự giả lập chữ ký Buyer hoặc tự xác nhận thay Buyer.

---

# 2. Căn cứ Schema hiện tại và đánh giá tái sử dụng

Schema DDL cho thấy hệ thống đã có các nhóm bảng nền tảng sau:

| Nhóm | Bảng | Hướng xử lý |
|---|---|---|
| Hub và đội xe | `warehouse_hubs`, `fleet_vehicles`, `fleet_drivers` | Tái sử dụng. Outbound phải gắn xe/tài xế thuộc Hub xuất phát, không tạo đội xe thứ hai. |
| Inbound | `pickup_trips`, `pickup_trip_stops` | Giữ nguyên vòng đời thu gom; không dùng chung bảng chuyến Inbound và Outbound. |
| Hợp đồng/lô | `b2b_contracts`, `harvest_lots` | Tái sử dụng, bổ sung/chốt state transition sau khi rà soát code. |
| QC/Hub | `hub_inspections`, `qc_inspections`, `cold_assets`, `iot_sensor_logs` | Tái sử dụng kết quả QC và vị trí/buồng lạnh. Không coi hàng đang chờ QC là đủ điều kiện giao. |
| Buyer | `buyer_warehouses` | Tái sử dụng kho nhận hàng. |
| Giao hàng | `shipments` | Tái sử dụng bản ghi giao theo hợp đồng; cần bổ sung quan hệ chuyến/stop và ePOD hai bên. |
| Claim | `spoilage_claims` | Tái sử dụng; claim `OPEN` khóa quyết toán toàn hợp đồng. |
| Tài chính | `settlements`, `gl_journal_entries`, `gl_journal_lines` | Tái sử dụng; bổ sung trạng thái/phê duyệt và kiểm soát hạch toán nếu thiếu. |
| Tài khoản | `users`, `roles`, `users_roles`, `farmer_profiles`, `buyer_profiles` | Tái sử dụng quyền hiện có; rà soát quyền chi tiết ở service/security. |

## 2.1. Những ràng buộc hiện hữu tác động trực tiếp đến thiết kế

DDL hiện tại thể hiện:

- `shipments.contract_id` có `UNIQUE`: hiện một hợp đồng chỉ có một shipment.
- `shipments.truck_id` tham chiếu `cold_assets(id)`, còn `shipments.driver_id` tham chiếu `users(id)`.
- `settlements.contract_id` có `UNIQUE`: hiện một hợp đồng chỉ có một settlement.
- `spoilage_claims` có `contract_id`, `damaged_weight_kg`, `liable_party`, `compensation_amount`, `status`; trạng thái mặc định là `OPEN`.
- `fleet_vehicles.warehouse_id` và `fleet_drivers.warehouse_id` tham chiếu `warehouse_hubs`.
- `b2b_contracts` có nhiều trường phục vụ QC, khối lượng, Outbound và thanh toán; DDL có `qc_status`, `qc_passed_at`, `epod_delivered_weight_kg`, `epod_damaged_weight_kg`, `outbound_dispatched_at`, `outbound_driver_name`, `outbound_truck_plate`, `outbound_manifest_code`, `remaining_payment_status` và các trường liên quan.
- `shipments` đã có `loaded_weight_kg`, `delivered_weight_kg`, `damaged_weight_kg`, `natural_shrinkage_kg`, `epod_signature_name`, `epod_signature_data`, `epod_photo_url`, `departed_at`, `delivered_at`, `status`.

### Kết luận thiết kế

`shipments` hiện hữu phù hợp làm hồ sơ giao hàng theo từng hợp đồng vì `contract_id` đã unique. Tuy nhiên, nó không thể tự đại diện cho một chuyến xe nhiều điểm giao. Cần thêm thực thể chuyến và stop để quản lý tuyến đường, thứ tự điểm dừng, Hub xuất phát và phân công đội xe.

Không tạo lại `warehouse_hubs`, `fleet_vehicles`, `fleet_drivers`, `buyer_warehouses`, `spoilage_claims` hoặc `settlements`.

---

# 3. Mô hình dữ liệu Outbound đề xuất

## 3.1. Quan hệ logic mục tiêu

```text
warehouse_hubs
   ├── fleet_vehicles
   ├── fleet_drivers
   └── outbound_delivery_trips
           ├── fleet_vehicle_id
           ├── fleet_driver_id
           └── outbound_delivery_stops (1..N)
                    ├── contract_id (UNIQUE)
                    ├── buyer_warehouse_id
                    └── shipment_id (UNIQUE, tham chiếu shipments)
                              └── ePOD hai bước xác nhận

b2b_contracts
   ├── harvest_lots
   ├── hub_inspections / QC
   ├── shipments
   ├── spoilage_claims
   └── settlements
          └── gl_journal_entries
                 └── gl_journal_lines
```

## 3.2. Bảng mới: `outbound_delivery_trips`

Mục đích: quản lý một chuyến xe từ một Hub đến nhiều điểm giao Buyer.

Các trường dự kiến:

| Trường | Ý nghĩa |
|---|---|
| `id` | PK |
| `trip_code` | Mã chuyến duy nhất |
| `hub_id` | FK → `warehouse_hubs.id` |
| `vehicle_id` | FK → `fleet_vehicles.id` |
| `driver_id` | FK → `fleet_drivers.id` |
| `status` | Trạng thái chuyến |
| `planned_departure_at` | Giờ xuất phát dự kiến |
| `departed_at` | Giờ xuất bến thực tế |
| `completed_at` | Thời điểm hoàn tất điểm giao cuối cùng |
| `total_loaded_weight_kg` | Tổng khối lượng nạp lên xe |
| `notes` | Ghi chú điều phối |
| `created_by`, `created_at`, `updated_at` | Audit cơ bản |

Trạng thái đề xuất:

- `DRAFT`: phương án đang soạn, chưa khóa nguồn lực.
- `ASSIGNED`: đã xác nhận xe, tài xế và các điểm giao.
- `ON_DELIVERY`: tài xế đã xuất bến.
- `COMPLETED`: tất cả stop đã có kết quả cuối hợp lệ.
- `CANCELLED`: chuyến bị hủy theo quy trình.

Không chuyển xe/tài xế sang trạng thái đang chạy chỉ vì tạo phương án `DRAFT`. Khi xác nhận chuyến mới khóa lịch; khi xuất bến mới chuyển trạng thái vận hành sang trạng thái tương ứng. Khi chuyến kết thúc hoặc hủy hợp lệ mới giải phóng xe/tài xế.

## 3.3. Bảng mới: `outbound_delivery_stops`

Mục đích: mỗi stop tương ứng một hợp đồng và một kho Buyer nhận hàng.

Các trường dự kiến:

| Trường | Ý nghĩa |
|---|---|
| `id` | PK |
| `trip_id` | FK → `outbound_delivery_trips.id` |
| `contract_id` | FK → `b2b_contracts.id`, UNIQUE để thực thi ONCE |
| `shipment_id` | FK → `shipments.id`, UNIQUE; có thể nullable trong lúc tạo draft nếu cần |
| `buyer_warehouse_id` | FK → `buyer_warehouses.id` |
| `stop_sequence` | Thứ tự giao trên tuyến |
| `delivery_address_snapshot` | Địa chỉ chụp tại thời điểm điều phối |
| `contact_name_snapshot`, `contact_phone_snapshot` | Người liên hệ chụp tại thời điểm điều phối |
| `expected_weight_kg` | Khối lượng dự kiến giao |
| `status` | Trạng thái điểm giao |
| `arrived_at` | Thời điểm đến |
| `driver_submitted_at` | Tài xế gửi biên bản |
| `buyer_confirmed_at` | Buyer xác nhận |
| `created_at`, `updated_at` | Audit |

Ràng buộc:

- `UNIQUE(contract_id)` trên stop để đảm bảo ONCE.
- `UNIQUE(shipment_id)` để một shipment không bị gắn vào nhiều stop.
- `UNIQUE(trip_id, stop_sequence)` để không trùng thứ tự điểm giao trong cùng chuyến.
- `CHECK(stop_sequence > 0)`.
- `expected_weight_kg > 0`.
- `buyer_warehouse_id` phải thuộc Buyer của hợp đồng; xác minh bằng service/constraint phù hợp sau khi xác nhận cấu trúc Buyer ID trong entity hiện tại.
- Không xóa cứng stop đã có bằng chứng giao nhận; dùng hủy có audit.

## 3.4. Vai trò của bảng `shipments`

Giữ `shipments` làm hồ sơ giao theo hợp đồng, không tạo bảng shipment thứ hai.

Bổ sung liên kết cần thiết sau khi rà soát code:

- `outbound_stop_id` hoặc liên kết một-một qua `outbound_delivery_stops.shipment_id`; chỉ chọn **một** hướng liên kết để tránh vòng FK và dữ liệu trùng.
- `buyer_warehouse_id` nếu cần truy vấn nhanh, nhưng nếu đã nằm ở stop thì không lưu lặp trừ khi có lý do tương thích.
- Tách dữ liệu ePOD của tài xế và Buyer.
- Chuẩn hóa trạng thái shipment, không để `shipments.status`, `outbound_delivery_stops.status` và `b2b_contracts.status` tự cập nhật rời rạc.

**Khuyến nghị:** stop giữ quan hệ với shipment bằng `shipment_id UNIQUE`; shipment giữ dữ liệu cân giao/ePOD theo hợp đồng. Tránh thêm `trip_id` vào shipment nếu stop đã cung cấp đường liên kết `shipment → stop → trip`.

## 3.5. Tương thích các FK xe/tài xế cũ trong `shipments`

Hiện `shipments.truck_id` tham chiếu `cold_assets`, `shipments.driver_id` tham chiếu `users`, khác với `fleet_vehicles` và `fleet_drivers` của Inbound.

Định hướng:

- Nguồn phân công Outbound chính thức là `outbound_delivery_trips.vehicle_id` và `driver_id`, tham chiếu `fleet_vehicles`/`fleet_drivers`.
- Không tiếp tục dùng `cold_assets` làm nguồn chọn xe Outbound.
- Chưa xóa hoặc đổi kiểu hai FK cũ của `shipments` trong migration đầu tiên.
- Khảo sát entity/service và dữ liệu thực tế để xác định có cần backfill, giữ tương thích hoặc chuyển đổi có kiểm soát.
- Nếu cần ngừng dùng cột cũ, thực hiện ở migration riêng sau khi code đã chuyển và dữ liệu đã đối chiếu.

---

# 4. Quy tắc trạng thái và điều kiện chuyển tiếp

## 4.1. Điều kiện đưa hợp đồng vào hàng đợi Outbound

Một hợp đồng chỉ đủ điều kiện nếu đồng thời:

1. Hợp đồng đã tồn tại và còn hiệu lực giao hàng.
2. Hàng đã được Inbound nhận tại đúng Hub.
3. Kết quả QC tại Hub là đạt (`qc_status = PASSED` theo quy ước đã xác nhận trong ứng dụng).
4. Khối lượng đủ điều kiện giao lớn hơn 0.
5. Chưa có stop Outbound/đơn giao được xác nhận cho hợp đồng.
6. Không có trạng thái chặn nghiệp vụ như hủy hợp đồng, claim/hold trước giao hoặc đã giao.
7. Buyer Warehouse nhận hàng hợp lệ và thuộc Buyer tương ứng.

`AT_HUB_QC` chỉ biểu thị hàng đang ở giai đoạn Hub/QC; không được hiểu mặc định là QC đã đạt. Khi QC đạt, hệ thống chuyển sang trạng thái sẵn sàng Outbound theo state machine hiện hữu sau khi đối chiếu mã trạng thái trong code. Không hardcode `READY_FOR_OUTBOUND` trước khi xác minh enum/string hiện đang dùng.

## 4.2. State machine cấp stop

- `PLANNED`
- `ASSIGNED`
- `ARRIVED`
- `DRIVER_SUBMITTED`
- `PENDING_BUYER_CONFIRMATION`
- `BUYER_CONFIRMED`
- `REJECTED_BY_BUYER` hoặc `DISPUTED`
- `CANCELLED` (chỉ trước khi bàn giao, theo quyền)

`BUYER_CONFIRMED` là điều kiện hoàn tất ePOD chuẩn. Trường hợp Buyer không xác nhận hoặc từ chối phải chuyển sang hàng đợi xử lý ngoại lệ; không tự động chốt Q4.

## 4.3. State machine cấp hợp đồng

Giữ nguyên các trạng thái đã có nếu tương thích; bổ sung chuyển tiếp có kiểm soát:

```text
QC_PASSED / READY_FOR_OUTBOUND
       → OUTBOUND_ASSIGNED
       → OUTBOUND_ON_DELIVERY
       → DELIVERY_PENDING_BUYER_CONFIRMATION
       → DELIVERED
       → PENDING_SETTLEMENT
       → SETTLEMENT_APPROVED
       → SETTLED
```

Đây là luồng trạng thái mục tiêu, không phải khẳng định enum hiện tại đã chứa các giá trị trên. Phải map với status/fulfillment_status thực tế trong Java trước migration.

## 4.4. State machine cấp chuyến

```text
DRAFT → ASSIGNED → ON_DELIVERY → COMPLETED
   └──────────────→ CANCELLED
```

- Chỉ chuyến `ASSIGNED` mới có thể xuất bến.
- Chỉ chuyến `ON_DELIVERY` mới có thể ghi nhận đến điểm giao.
- Chỉ hoàn tất khi mọi stop đã có kết quả hợp lệ: Buyer xác nhận, hoặc có trạng thái ngoại lệ được người có quyền xử lý.
- Hủy chuyến phải giải phóng lịch xe/tài xế và trả các hợp đồng chưa giao về hàng đợi đủ điều kiện; không xóa lịch sử.

---

# 5. Đối soát khối lượng Q1 → Q4

| Ký hiệu | Định nghĩa | Nguồn dữ liệu hiện hữu / đích lưu |
|---|---|---|
| Q1 | Khối lượng cam kết trong hợp đồng | `b2b_contracts.offered_weight_kg` hoặc trường lượng hợp đồng thực sự được code sử dụng |
| Q2 | Khối lượng cân thực tế tại rẫy | `pickup_trip_stops.actual_weight_kg` và/hoặc trường tổng hợp hợp đồng; phải xác định nguồn chuẩn để tránh lệch |
| Q3 | Khối lượng Hub tiếp nhận và đạt QC | `hub_inspections.received_weight_kg`, `qualified_weight_kg`, `rejected_weight_kg` |
| Q4 | Khối lượng Buyer xác nhận chấp nhận | Ghi từ ePOD Buyer-confirmed; đồng bộ sang `shipments` và trường tương ứng trên hợp đồng nếu hiện đang được dùng |

## 5.1. Phân tách Q4

- `received_weight_kg`: tổng lượng Buyer xác nhận đã nhận tại điểm giao.
- `accepted_weight_kg`: lượng Buyer chấp nhận về chất lượng/số lượng.
- `rejected_weight_kg`: lượng Buyer từ chối, có lý do.
- `natural_shrinkage_kg`: lượng hao hụt tự nhiên được hai bên/đơn vị có thẩm quyền xác nhận.
- `loaded_weight_kg`: lượng thực xuất Hub lên xe.

Không đồng nhất `delivered_weight_kg` với `accepted_weight_kg` nếu định nghĩa hiện tại trong code chưa rõ. Cần migration bổ sung trường hoặc mapping có tài liệu rõ ràng.

## 5.2. Kiểm tra cân đối

Công thức kiểm tra tham khảo:

`loaded_weight = received_weight + confirmed_shrinkage + rejected_weight_at_delivery + unexplained_difference`

Phần `unexplained_difference` khác 0 phải tạo cảnh báo/biên bản sai lệch; không tự động phân loại thành hao hụt tự nhiên.

Nếu Buyer chấp nhận một phần, Q4 dùng `accepted_weight_kg`, không dùng tổng khối lượng đã đưa đến cửa kho.

## 5.3. Khóa Q4

- Q4 chỉ được chốt khi Buyer xác nhận ePOD.
- Lưu người xác nhận, thời điểm, giá trị trước/sau nếu sửa, lý do sửa và actor.
- Sau khi chốt không cho cập nhật trực tiếp bằng CRUD thông thường.
- Điều chỉnh sau chốt phải qua nghiệp vụ điều chỉnh có quyền, audit và cập nhật lại settlement nếu chưa chi trả; nếu đã chi trả thì phải có bút toán/biên bản điều chỉnh riêng.

---

# 6. ePOD hai bước — Driver submit + Buyer Portal confirm

## 6.1. Dữ liệu ePOD cần có

Có thể mở rộng `shipments` hoặc tạo bảng chi tiết bằng chứng nếu cần nhiều ảnh/chữ ký. Không lưu một trường ảnh đơn duy nhất nếu một stop cần nhiều loại bằng chứng.

Thông tin tối thiểu:

**Phía tài xế**
- Driver ID từ phiên đăng nhập.
- Thời điểm gửi.
- Khối lượng tổng nhận tại Buyer.
- Khối lượng chấp nhận, từ chối, lý do.
- Ghi chú giao hàng.
- Ảnh kiện hàng, ảnh cân, ảnh biên bản.
- Xác nhận của tài xế.

**Phía Buyer**
- Buyer user ID đã đăng nhập.
- Tên người ký, số điện thoại (nếu cần đối chiếu).
- Thời điểm xác nhận.
- Chữ ký/biên nhận điện tử hoặc hành động xác nhận Portal.
- Kết quả: xác nhận, từ chối hoặc tranh chấp.
- Ghi chú và bằng chứng bổ sung.

## 6.2. Bảng bằng chứng (chỉ tạo nếu schema/code chưa có giải pháp tương đương)

Nếu `uploaded_assets` hoặc dịch vụ lưu trữ hiện hữu đã quản lý file, ưu tiên tái sử dụng. Nếu cần lưu nhiều ảnh/chữ ký theo từng stop, cân nhắc bảng `outbound_epod_evidence`:

- `id`
- `stop_id`
- `evidence_type` (`GOODS_PHOTO`, `WEIGHING_PHOTO`, `PAPER_DOCUMENT`, `DRIVER_SIGNATURE`, `BUYER_SIGNATURE`, ...)
- `asset_id` hoặc URL đã được quản lý bởi hệ thống upload hiện có
- `uploaded_by`
- `created_at`

Không tạo bảng này nếu `uploaded_assets` đã đáp ứng đầy đủ quan hệ, mục đích file và kiểm soát quyền truy cập.

## 6.3. Quy tắc bảo mật

- Tài xế chỉ xem chuyến/stop được phân công.
- Buyer chỉ xem stop thuộc hợp đồng và kho của Buyer đó.
- Không cho Buyer thay đổi số liệu do tài xế nhập mà không tạo lịch sử chỉnh sửa.
- Không dùng URL public không kiểm soát cho chứng từ nhạy cảm nếu hệ thống đang hỗ trợ signed/private URL.
- Ghi audit cho upload, gửi ePOD, xác nhận, từ chối và điều chỉnh.

---

# 7. Xử lý khiếu nại — BLOCK toàn bộ quyết toán hợp đồng

## 7.1. Quy tắc

Nếu một hợp đồng có ít nhất một `spoilage_claims.status = OPEN` (và các trạng thái khác được xác định là đang xử lý sau khi map enum thực tế), hợp đồng không được chuyển sang `PENDING_SETTLEMENT`/`SETTLEMENT_APPROVED`.

- Không tạo quyết toán được duyệt khi còn claim mở.
- Không giải ngân Nhà vườn khi còn claim mở.
- Không đóng hợp đồng `SETTLED` khi còn claim mở.
- Có thể tạo bản nháp tính toán để tham khảo nhưng phải hiển thị rõ `BLOCKED_BY_CLAIM`, không cho thực thi thanh toán.
- Chỉ mở khóa sau khi tất cả claim liên quan đã ở trạng thái kết thúc hợp lệ, ví dụ `RESOLVED` hoặc trạng thái đóng được xác nhận trong code.

## 7.2. Kiểm tra ở backend

Mọi endpoint phê duyệt settlement phải kiểm tra claim trong cùng transaction và khóa dữ liệu cần thiết. Không chỉ ẩn nút trên frontend.

---

# 8. Settlement Nhà vườn và thanh toán Buyer

## 8.1. Settlement Nhà vườn

Tái sử dụng `settlements` với các trường đã có:
- `contract_id`, `farmer_id`
- `qualified_weight`
- `unit_price`
- `gross_amount`
- `platform_fee_percent`, `platform_fee`
- `payout_amount`
- thông tin ngân hàng
- `is_paid`, `paid_at`
- `tax_form_type`

Quy tắc tính:
- `qualified_weight = Q4 accepted_weight_kg`.
- `gross_amount = Q4 × unit_price` theo đơn giá/điều khoản hợp đồng đã chốt.
- `platform_fee` theo chính sách hợp đồng/nền tảng đã xác nhận.
- `payout_amount = gross_amount - platform_fee - các khoản khấu trừ hợp lệ đã được duyệt`.
- Không tự động suy ra thuế, khấu trừ hoặc loại biểu mẫu chỉ từ `tax_form_type`; quy tắc kế toán/thuế phải được người phụ trách chuyên môn xác nhận.

## 8.2. Trạng thái Settlement đề xuất

- `DRAFT`
- `BLOCKED_BY_CLAIM`
- `PENDING_ACCOUNTANT_APPROVAL`
- `APPROVED`
- `PAYOUT_PENDING`
- `PAID`
- `FAILED`
- `CANCELLED` (chỉ khi chưa phát sinh giao dịch không thể đảo ngược)

`is_paid` hiện có có thể giữ để tương thích, nhưng trạng thái chi tiết nên là nguồn nghiệp vụ chính sau khi migration và code được đồng bộ. Không để `is_paid=true` nếu giao dịch ngân hàng chưa được xác minh.

## 8.3. Buyer payment

- Chốt nghĩa vụ Buyer theo Q4 accepted và giá/điều khoản hợp đồng.
- Cấn trừ khoản đặt cọc đã nhận hợp lệ.
- Tính số dư phải trả hoặc khoản hoàn/điều chỉnh.
- Chỉ ghi nhận đã thanh toán khi giao dịch ngân hàng/SePay được xác minh.
- Webhook phải idempotent dựa trên transaction ID duy nhất của nhà cung cấp; không chỉ dựa vào chuỗi `deposit_ref`/`balance_ref` trên hợp đồng.
- Kiểm tra có bảng giao dịch thanh toán tương đương trước khi tạo mới. Nếu chưa có, tạo bảng giao dịch với unique provider transaction ID, payload, amount, currency, status, reference, timestamps và trạng thái xử lý.

## 8.4. Điều kiện đóng hợp đồng

Chỉ chuyển `SETTLED`/`COMPLETED` khi đồng thời:
1. Q4 đã được Buyer xác nhận.
2. Không còn claim mở.
3. Nghĩa vụ Buyer đã được thanh toán/đối soát hoặc có trạng thái công nợ được phê duyệt theo chính sách.
4. Settlement Nhà vườn đã được kế toán phê duyệt và chi trả thành công, hoặc có ngoại lệ được phê duyệt rõ ràng.
5. Các bút toán GL cần thiết đã được ghi nhận và không trùng.

Trạng thái giao hàng và trạng thái thanh toán phải tách riêng. Không được coi `DELIVERED` là `SETTLED`.

---

# 9. API Backend dự kiến

Tên endpoint dưới đây là đề xuất, cần đối chiếu convention và API hiện hữu trước khi chốt.

## 9.1. Admin / Warehouse Dispatch

- `GET /admin/outbound-dispatch/eligible-contracts?hubId=...`
  - Danh sách hợp đồng QC đạt, chưa được phân chuyến.
- `POST /admin/outbound-dispatch/optimize`
  - Tạo phương án đề xuất, không ghi chuyến chính thức nếu chưa xác nhận.
- `POST /admin/outbound-trips`
  - Tạo chuyến nháp.
- `POST /admin/outbound-trips/{tripId}/confirm`
  - Xác nhận chuyến, khóa xe/tài xế/stop trong transaction.
- `POST /admin/outbound-trips/{tripId}/cancel`
  - Hủy theo điều kiện.

## 9.2. Driver Portal

- `GET /driver/outbound-trips`
- `GET /driver/outbound-trips/{tripId}`
- `POST /driver/outbound-trips/{tripId}/depart`
- `POST /driver/outbound-stops/{stopId}/arrive`
- `POST /driver/outbound-stops/{stopId}/submit-epod`

## 9.3. Buyer Portal

- `GET /buyer/outbound-deliveries/pending-confirmation`
- `GET /buyer/outbound-stops/{stopId}/epod`
- `POST /buyer/outbound-stops/{stopId}/confirm-epod`
- `POST /buyer/outbound-stops/{stopId}/dispute`

## 9.4. Accountant Portal

- `GET /accounting/settlements/pending`
- `GET /accounting/settlements/{settlementId}`
- `POST /accounting/settlements/{settlementId}/approve`
- `POST /accounting/settlements/{settlementId}/payout`
- `GET /accounting/contracts/{contractId}/reconciliation`

API payout cần kiểm soát quyền, idempotency, transaction state và kết quả từ nhà cung cấp ngân hàng. Không được coi request gửi đi là bằng chứng tiền đã chuyển thành công.

---

# 10. Frontend Next.js / ReactJS

## 10.1. Admin Outbound Dispatch

Trang dự kiến: `/admin/outbound-dispatch`

- Bộ lọc Hub, vùng giao, thời gian, Buyer.
- Danh sách hợp đồng đủ điều kiện QC.
- Hiển thị Q3 có thể xuất, kho Buyer, địa chỉ, khung giờ, yêu cầu nhiệt độ.
- Gom nhiều hợp đồng/Buyer Warehouse vào một chuyến.
- Chọn/đề xuất xe và tài xế thuộc Hub.
- Hiển thị tải trọng, thể tích và thứ tự stop.
- Xem bản đồ/tuyến đường nếu tích hợp định tuyến hiện hữu.
- Xác nhận chuyến có màn hình review cuối.
- Chặn nếu hợp đồng đã có stop, xe/tài xế xung đột hoặc sức chứa vượt giới hạn.

## 10.2. Driver Portal

Tích hợp vào `/portal/driver`:
- Tab Inbound hiện tại giữ nguyên.
- Tab Outbound hiển thị chuyến được phân công.
- Danh sách stop theo thứ tự.
- Thông tin kho Buyer và liên hệ.
- Nút xuất bến, đến điểm giao, gửi ePOD.
- Form cân/đếm: tổng nhận, chấp nhận, từ chối, lý do, ghi chú.
- Chụp ảnh/đính kèm bằng chứng.
- Hiển thị rõ trạng thái “Chờ Buyer xác nhận”.

## 10.3. Buyer Portal

Tích hợp vào `/portal/buyer`:
- Danh sách chuyến đang đến/đã đến.
- Danh sách hợp đồng/điểm giao của Buyer.
- Xem Q4, số lượng từ chối, ảnh, thông tin người giao.
- Xác nhận hoặc tạo tranh chấp.
- Sau xác nhận hiển thị nghĩa vụ thanh toán, tiền cọc đã cấn trừ và số dư.

## 10.4. Accountant Portal

Tích hợp vào `/portal/accountant`:
- Bảng Q1–Q4 và chênh lệch.
- Tình trạng Buyer payment.
- Danh sách claim; claim mở phải hiển thị khóa toàn bộ settlement.
- Tính toán payout Nhà vườn theo Q4.
- Xem chi tiết platform fee/khấu trừ.
- Phê duyệt và thực hiện payout.
- Xuất chứng từ/bảng kê theo cấu hình đã được kế toán xác nhận.

Không tuyên bố biểu mẫu hoặc hóa đơn “hợp lệ pháp lý” chỉ vì hệ thống xuất được PDF. Mẫu, điều kiện lập và nội dung phải được chuyên gia kế toán/thuế xác nhận trước phát hành.

---

# 11. Migration Plan

## 11.1. Không mặc định V27 là version kế tiếp

Trước khi tạo migration:
1. Đọc `flyway_schema_history` trong database đang chạy.
2. Kiểm tra thư mục migration trong repository.
3. Xác định version cuối, trạng thái success/failed và naming convention.
4. Kiểm tra schema thực tế có drift so với DDL đã gửi không.
5. Chỉ sau đó mới chốt tên migration. `V27__...sql` hiện chỉ là tên dự kiến, chưa được xác nhận.

## 11.2. Migration dự kiến theo nhóm

**Migration A — Outbound trip/stop**
- Tạo `outbound_delivery_trips`.
- Tạo `outbound_delivery_stops`.
- FK tới `warehouse_hubs`, `fleet_vehicles`, `fleet_drivers`, `b2b_contracts`, `buyer_warehouses`, `shipments`.
- Unique constraint bảo đảm ONCE.
- Index cho truy vấn chuyến theo Hub/status/time, stop theo trip/order, contract lookup.

**Migration B — Shipment/ePOD compatibility**
- Bổ sung các trường Buyer confirmation và driver submission còn thiếu.
- Bổ sung buyer warehouse/stop relation theo mô hình đã chốt.
- Không xóa `truck_id`, `driver_id` legacy trong migration đầu.
- Không thêm cột trùng nếu đã có trong schema/code hiện tại.

**Migration C — Settlement state/audit**
- Bổ sung status, approver, approved_at, payout reference/status và thông tin điều chỉnh nếu chưa có tương đương.
- Giữ tương thích `is_paid`, `paid_at` trong giai đoạn chuyển đổi.
- Không bỏ unique `settlements.contract_id` vì chính sách hiện tại là một lần giao/một hợp đồng; chỉ thay đổi nếu yêu cầu nghiệp vụ sau này thay đổi.

**Migration D — Payment transaction idempotency**
- Chỉ tạo nếu khảo sát xác nhận chưa có bảng giao dịch ngân hàng dùng chung.
- Unique provider transaction ID.
- Index reference/contract/status/created_at.
- Lưu kết quả xử lý webhook và khả năng retry an toàn.

## 11.3. An toàn migration

- Backup trước khi áp dụng trên môi trường có dữ liệu.
- Migration theo hướng additive trước; không drop/rename dữ liệu đang dùng.
- Có rollback strategy hoặc migration forward-fix rõ ràng.
- Kiểm tra dữ liệu orphan/duplicate trước khi thêm FK/UNIQUE.
- Không seed giả lập trên production.
- Không sửa trực tiếp database bằng tay thay cho migration quản lý phiên bản.

---

# 12. Backend Implementation Plan

## Phase 0 — Discovery (bắt buộc trước code)

- Đọc Entity/Repository/Service/Controller của `shipments`, `b2b_contracts`, `settlements`, `spoilage_claims`, `fleet_vehicles`, `fleet_drivers`, `buyer_warehouses`, `hub_inspections`.
- Đọc toàn bộ Flyway migration và trạng thái thực tế trong `flyway_schema_history`.
- Đối chiếu status enum/string giữa DB, Java và frontend.
- Kiểm tra SePay webhook và bảng giao dịch hiện có.
- Kiểm tra upload service, `uploaded_assets`, phân quyền Buyer/Driver/Accountant.
- Xác nhận một Buyer có thể có nhiều warehouse và contract đang lưu Buyer warehouse ở đâu.
- Chốt mapping chính xác của Q1–Q4 và quy tắc tính tiền theo hợp đồng.

**Deliverable:** báo cáo gap analysis và ERD cuối. Không sửa code trong Phase 0.

## Phase 1 — Outbound domain

- Entity/Repository cho trip và stop.
- DTO request/response.
- Service tạo draft và xác nhận chuyến.
- Validate Hub–vehicle–driver ownership.
- Validate tải trọng, thể tích, nhiệt độ, lịch xe/tài xế.
- Validate contract đủ QC và chưa được giao.
- Transaction + locking để chống hai điều phối viên gán cùng hợp đồng/xe/tài xế.
- Audit mọi thay đổi quan trọng.

## Phase 2 — Driver execution & ePOD

- Driver query chỉ lấy chuyến được phân công.
- Depart trip.
- Arrive stop.
- Submit ePOD và evidence.
- Buyer confirm/dispute.
- Khóa Q4 sau xác nhận.
- Hỗ trợ retry upload/API mà không tạo ePOD trùng.

## Phase 3 — Claim & reconciliation

- Tính chênh lệch Q1–Q4.
- Tạo/đọc claim từ `spoilage_claims`.
- Chặn settlement khi claim đang mở.
- Quy trình đóng claim và mở khóa.
- Ghi audit mọi điều chỉnh Q4.

## Phase 4 — Settlement & payment

- Tính settlement theo Q4.
- Accountant approve.
- Payout và xác minh giao dịch.
- Buyer balance payment/cấn trừ deposit.
- Webhook idempotency.
- GL journal integration và chống ghi sổ trùng.

## Phase 5 — Frontend & reporting

- Admin Outbound.
- Driver Outbound.
- Buyer ePOD confirmation.
- Accountant reconciliation/settlement.
- Báo cáo tỷ lệ giao đủ, chênh lệch Q1–Q4, claim, thời gian Hub, thời gian giao và công nợ.

---

# 13. Transaction, concurrency và idempotency

Các thao tác sau phải chạy trong transaction phù hợp:

- Confirm trip: khóa/kiểm tra hợp đồng, xe, tài xế và lịch.
- Depart trip: xác thực trạng thái chuyến và người lái.
- Submit ePOD: bảo đảm một lần gửi hợp lệ cho stop; retry không nhân đôi bằng chứng hoặc số liệu.
- Buyer confirm: chỉ một lần xác nhận chính thức; mọi thay đổi sau đó là adjustment có audit.
- Approve settlement: kiểm tra Q4 đã khóa và không có claim mở.
- Payout: chống gửi lệnh chi trùng.
- SePay webhook: unique provider transaction ID, xử lý cùng một transaction chỉ một lần.

Dùng optimistic/pessimistic locking phù hợp; không chỉ dựa vào kiểm tra frontend. Các unique constraint ở DB là lớp bảo vệ cuối cùng cho ONCE và chống trùng.

---

# 14. Phân quyền

| Vai trò | Quyền chính |
|---|---|
| `ROLE_ADMIN` | Xem/điều phối chuyến theo phạm vi được cấp |
| `ROLE_WAREHOUSE_QC` | Xác nhận QC, không tự phê duyệt payout |
| `ROLE_DRIVER` | Xem chuyến được phân công, gửi dữ liệu giao/ePOD |
| `ROLE_BUYER` | Chỉ xem và xác nhận stop/hợp đồng thuộc Buyer |
| `ROLE_ACCOUNTANT` | Xem đối soát, duyệt settlement, thực hiện nghiệp vụ tài chính theo quyền |
| Farmer | Xem kết quả đối soát/payout của hợp đồng mình |

Kiểm tra cả role và ownership của dữ liệu. Không được chỉ kiểm tra role chung rồi cho phép truy cập mọi contract.

---

# 15. Acceptance Criteria

## Outbound dispatch
- [ ] Chỉ hợp đồng đã QC đạt mới xuất hiện.
- [ ] Một chuyến có nhiều stop, nhiều hợp đồng và nhiều Buyer Warehouse.
- [ ] Mỗi hợp đồng chỉ có một stop/shipment Outbound.
- [ ] Xe/tài xế thuộc Hub hợp lệ và không trùng lịch.
- [ ] Quá tải kg hoặc m³ bị chặn.
- [ ] Xác nhận chuyến là atomic; lỗi ở một phần thì không để trạng thái phân công dở dang.

## Driver & ePOD
- [ ] Tài xế chỉ xem chuyến của mình.
- [ ] Tài xế xuất bến và ghi nhận từng stop.
- [ ] Gửi được số lượng nhận/chấp nhận/từ chối và bằng chứng.
- [ ] Buyer đăng nhập Portal xác nhận đúng stop.
- [ ] Chưa có Buyer confirmation thì Q4 chưa được khóa và settlement chưa được duyệt.
- [ ] Không thể giao lần hai cho cùng hợp đồng theo chính sách ONCE.

## Reconciliation & claim
- [ ] Hiển thị Q1, Q2, Q3, Q4 và chênh lệch.
- [ ] Q4 dùng accepted weight do Buyer xác nhận.
- [ ] Có claim mở thì khóa toàn bộ quyết toán hợp đồng.
- [ ] Đóng claim hợp lệ thì mới cho tiếp tục settlement.
- [ ] Mọi điều chỉnh sau xác nhận có audit.

## Finance
- [ ] Settlement Nhà vườn tính theo Q4.
- [ ] Kế toán phải phê duyệt trước payout.
- [ ] Payout retry không chi trùng.
- [ ] SePay webhook trùng không cộng tiền lần hai.
- [ ] Buyer deposit được cấn trừ đúng một lần.
- [ ] Hợp đồng chỉ `SETTLED` khi điều kiện giao nhận và tài chính đều đạt.

## Regression
- [ ] Inbound pickup hiện tại không bị ảnh hưởng.
- [ ] Receiving Hub/QC không bị ảnh hưởng.
- [ ] Fleet management và Inbound dispatch không bị ảnh hưởng.
- [ ] Các màn hình Buyer/Farmer hiện tại không bị lỗi do thay đổi status.
- [ ] Dữ liệu shipment/settlement cũ vẫn đọc được.

---

# 16. Rủi ro và điểm phải xác minh trước khi chốt migration

1. **Migration version:** chưa thể khẳng định V27 cho đến khi kiểm tra `flyway_schema_history` và thư mục migration.
2. **State thực tế:** DDL không chứng minh các giá trị status đang được sử dụng trong production.
3. **QC gate:** cần xác minh code đang dùng `qc_status` hay thêm `fulfillment_status`/status khác làm nguồn chuẩn.
4. **Buyer warehouse ownership:** cần xác minh entity/quan hệ buyer_warehouses với Buyer user và contract.
5. **Legacy shipments FK:** `truck_id → cold_assets`, `driver_id → users` khác với đội xe `fleet_vehicles`/`fleet_drivers`; cần migration tương thích.
6. **Q4 mapping:** phải xác định chính xác `delivered_weight_kg`, `epod_delivered_weight_kg` và `damaged_weight_kg` đang được code hiểu theo nghĩa nào.
7. **Settlement Q4:** `settlements.qualified_weight` hiện là `double precision`; cần đánh giá chuyển `numeric` có ảnh hưởng entity/API và dữ liệu không.
8. **Claim statuses:** xác minh đầy đủ trạng thái nào được coi là đang mở/đang xử lý và trạng thái nào là kết thúc.
9. **SePay:** DDL chưa đủ để kết luận đã có hay chưa có bảng transaction idempotency; cần rà code và toàn bộ schema.
10. **Thuế/chứng từ:** loại biểu mẫu và quy trình lập phải được kế toán xác nhận; không suy diễn hiệu lực pháp lý từ tên cột.

---

# 17. Thứ tự triển khai được đề nghị

| Thứ tự | Hạng mục | Điều kiện hoàn tất |
|---|---|---|
| 0 | Khảo sát codebase, migration, trạng thái DB | ERD và gap analysis được duyệt |
| 1 | Migration trip/stop và tương thích shipment | FK/unique/index đúng, dữ liệu cũ an toàn |
| 2 | Backend dispatch | Tạo/confirm/cancel chuyến an toàn |
| 3 | Driver execution + ePOD | Driver submit, Buyer confirm |
| 4 | Q1–Q4 + claim block | Q4 chính xác, claim mở khóa settlement |
| 5 | Buyer payment + Farmer settlement | Cấn trừ, phê duyệt, payout, webhook an toàn |
| 6 | Frontend hoàn chỉnh + regression | Nghiệm thu toàn luồng |

---

# 18. Trạng thái phê duyệt

**Kế hoạch V2.1 đã phản ánh 5 quyết định nghiệp vụ:**

- MULTI trip.
- ONCE delivery per contract.
- Farmer settlement based on Q4 accepted weight.
- BOTH driver ePOD submission and Buyer Portal confirmation.
- BLOCK full contract settlement while a claim remains open.

**Chưa thực hiện:** sửa code, tạo migration, cập nhật database, chạy build/test, cài package hoặc push.

**Bước tiếp theo sau khi phê duyệt:** thực hiện Phase 0 Discovery trên repository và database hiện tại, sau đó mới chốt migration/API/entity cụ thể. Tên `V27` chỉ được xác nhận sau khi kiểm tra Flyway thực tế.
