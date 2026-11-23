# 3.3. SƠ ĐỒ LỚP CHI TIẾT (UML CLASS DIAGRAM) — NỀN TẢNG B2B HONA FRESH

> **Tài liệu phân tích thiết kế hệ thống:** Sơ đồ lớp chi tiết của hệ sinh thái HONA FRESH  
> **Tệp tin HTML xem trực quan:** [class_diagram.html](file:///e:/HOCTAP/WWW/BTL_WebBanRau/docs/diagrams/class_diagram.html)

---

## 1. SƠ ĐỒ LỚP ĐỒ HỌA UML (MERMAID)

```mermaid
classDiagram
    %% PACKAGE 1: IDENTITY & PROFILE
    class User {
        -Long id
        -String email
        -String password
        -String fullName
        -String phone
        -String role
        -String status
        -String kycStatus
        -Boolean emailVerified
        +register()
        +login()
        +updateProfile()
        +verifyKyc()
    }

    class Role {
        -Long id
        -String name
        -String description
    }

    class FarmerProfile {
        -Long id
        -String farmName
        -String farmAddress
        -String province
        -String vietgapCertNumber
        -String pucCode
        -Boolean verified
        +uploadCertification()
        +updateFarmInfo()
    }

    class BuyerProfile {
        -Long id
        -String companyName
        -String taxCode
        -String businessLicense
        -BigDecimal ratingAvg
        +updateCompanyProfile()
    }

    class BuyerWarehouse {
        -Long id
        -String name
        -String address
        -String phone
        -Boolean defaultWarehouse
        +getDeliveryAddress()
    }

    %% PACKAGE 2: MARKETPLACE & RFQ
    class Category {
        -Long id
        -String name
        -String slug
        -String description
    }

    class Product {
        -Long id
        -String name
        -String unit
        -BigDecimal basePrice
    }

    class HarvestLot {
        -Long id
        -String title
        -BigDecimal expectedWeightKg
        -BigDecimal availableWeightKg
        -BigDecimal unitPrice
        -String status
        -LocalDateTime harvestedAt
        -Integer maxStorageDays
        +openForTrading()
        +reserveQuantity(kg)
        +closeLot()
    }

    class RfqNegotiation {
        -Long id
        -String rfqCode
        -BigDecimal targetPrice
        -BigDecimal targetQuantity
        -BigDecimal counterPrice
        -BigDecimal counterQuantity
        -Integer roundNumber
        -String status
        -LocalDateTime expiresAt
        +sendCounterOffer(price, qty)
        +acceptPrice()
        +rejectRfq()
    }

    class B2bChatMessage {
        -Long id
        -Long rfqId
        -String rfqCode
        -String senderRole
        -String messageType
        -String content
        -LocalDateTime createdAt
    }

    %% PACKAGE 3: CONTRACT & ESCROW
    class B2bContract {
        -Long id
        -String contractCode
        -BigDecimal unitPrice
        -BigDecimal totalAmount
        -BigDecimal depositAmount
        -String depositStatus
        -String fulfillmentStatus
        -String status
        -BigDecimal actualHarvestWeightKg
        -String outboundTruckPlate
        +signContract()
        +recordDeposit()
        +recordRemainingPayment()
        +closeContract()
    }

    class PaymentTransaction {
        -Long id
        -BigDecimal amount
        -String paymentType
        -String paymentMethod
        -String status
        -String bankReference
        +confirmTransaction()
    }

    class Settlement {
        -Long id
        -String settlementCode
        -BigDecimal qualifiedWeight
        -BigDecimal unitPrice
        -BigDecimal grossAmount
        -BigDecimal platformFee
        -BigDecimal netPayout
        -Boolean isPaid
        -LocalDateTime paidAt
        +calculateFee()
        +payoutToFarmer()
    }

    %% PACKAGE 4: LOGISTICS & COLD CHAIN
    class WarehouseHub {
        -Long id
        -String hubCode
        -String hubName
        -String address
        -String region
        -BigDecimal capacityTons
    }

    class FleetVehicle {
        -Long id
        -String plateNumber
        -String vehicleType
        -BigDecimal maxPayloadKg
        -Boolean isRefrigerated
    }

    class FleetDriver {
        -Long id
        -String fullName
        -String phone
        -String licenseNumber
    }

    class PickupTrip {
        -Long id
        -String tripCode
        -String status
        -LocalDateTime departedAt
        -LocalDateTime arrivedAt
        +startTrip()
        +completeInbound()
    }

    class PickupTripStop {
        -Long id
        -Integer stopSequence
        -BigDecimal actualWeightKg
        -BigDecimal handoverTemp
        -String status
        +confirmFarmHandover()
    }

    class QcInspection {
        -Long id
        -BigDecimal qcBrix
        -BigDecimal qcNitratePpm
        -Boolean qcPesticideSafe
        -BigDecimal grade1Ratio
        -String status
        +performQc()
    }

    class OutboundDeliveryTrip {
        -Long id
        -String tripCode
        -String status
        -LocalDateTime departedAt
        -LocalDateTime completedAt
        +dispatchTrip()
    }

    class OutboundDeliveryStop {
        -Long id
        -Integer stopSequence
        -BigDecimal expectedWeightKg
        -BigDecimal actualDeliveredWeightKg
        -BigDecimal rejectedWeightKg
        -String buyerSignatureData
        -String status
        +submitDriverDelivery()
        +buyerConfirmEpod()
    }

    class IotSensorLog {
        -Long id
        -Long assetId
        -BigDecimal temperatureC
        -BigDecimal humidityPercent
        -LocalDateTime recordedAt
    }

    %% MỐI QUAN HỆ GIỮA CÁC LỚP (RELATIONSHIPS)
    User "1" *-- "0..1" FarmerProfile : has
    User "1" *-- "0..1" BuyerProfile : has
    BuyerProfile "1" o-- "*" BuyerWarehouse : owns
    User "*" o-- "*" Role : assigned

    Category "1" o-- "*" Product : classifies
    Category "1" o-- "*" HarvestLot : classifies
    User "1" o-- "*" HarvestLot : creates

    HarvestLot "1" o-- "*" RfqNegotiation : negotiates
    User "1" o-- "*" RfqNegotiation : requests
    RfqNegotiation "1" o-- "*" B2bChatMessage : contains

    RfqNegotiation "1" -- "0..1" B2bContract : generates
    HarvestLot "1" -- "*" B2bContract : references
    User "1" -- "*" B2bContract : parties

    B2bContract "1" *-- "*" PaymentTransaction : deposits
    B2bContract "1" *-- "0..1" Settlement : settles
    User "1" -- "*" Settlement : receives

    WarehouseHub "1" o-- "*" FleetVehicle : bases
    WarehouseHub "1" o-- "*" FleetDriver : assigns

    WarehouseHub "1" o-- "*" PickupTrip : dispatches
    FleetVehicle "1" -- "*" PickupTrip : vehicle
    FleetDriver "1" -- "*" PickupTrip : driver
    PickupTrip "1" *-- "*" PickupTripStop : stops
    B2bContract "1" -- "0..1" PickupTripStop : contracts

    B2bContract "1" -- "0..1" QcInspection : inspects

    WarehouseHub "1" o-- "*" OutboundDeliveryTrip : dispatches
    FleetVehicle "1" -- "*" OutboundDeliveryTrip : vehicle
    FleetDriver "1" -- "*" OutboundDeliveryTrip : driver
    OutboundDeliveryTrip "1" *-- "*" OutboundDeliveryStop : stops
    B2bContract "1" -- "0..1" OutboundDeliveryStop : contracts
    BuyerWarehouse "1" -- "*" OutboundDeliveryStop : destination

    B2bContract "1" -- "*" IotSensorLog : monitors
```

---

## 2. NỘI DUNG VĂN BẢN TRÌNH BÀY CHO BÁO CÁO

### 3.3. Sơ đồ lớp (Class Diagram)
Sơ đồ lớp (UML Class Diagram) của nền tảng B2B HONA FRESH mô hình hóa cấu trúc tĩnh của hệ thống, bao gồm các lớp thực thể (Entity Classes) trong kiến trúc backend Spring Data JPA, các thuộc tính dữ liệu, các phương thức nghiệp vụ và mối quan hệ ràng buộc ngữ nghĩa giữa các đối tượng. Hệ thống gồm 22 lớp thực thể chính được tổ chức thành 4 phân hệ gói (Packages) nghiệp vụ cốt lõi:

#### 3.3.1. Phân hệ Định danh & Quản lý đối tác (Identity & Profile Package)
- **Lớp `User`:** Lớp thực thể người dùng trung tâm, quản lý định danh tài khoản, cơ chế băm mật khẩu BCrypt, vai trò hệ thống (Role) và trạng thái xét duyệt KYC. Quan hệ kết tập mạnh (Composition) 1-1 với lớp `FarmerProfile` (hồ sơ nông trại, chứng chỉ VietGAP, mã số vùng trồng PUC) và lớp `BuyerProfile` (hồ sơ doanh nghiệp, giấy phép kinh doanh, điểm uy tín).
- **Lớp `BuyerWarehouse`:** Quản lý danh mục các địa chỉ kho tiếp nhận hàng của thương lái, có quan hệ n-1 với `BuyerProfile` để hỗ trợ giao hàng đa điểm kho.

#### 3.3.2. Phân hệ Chợ sỉ & Đàm phán RFQ (Marketplace & RFQ Package)
- **Lớp `Category` & `Product`:** Quản lý cây phân loại danh mục nông sản (rau ăn lá, củ quả, nấm ăn) và thông tin mặt hàng chuẩn.
- **Lớp `HarvestLot`:** Đại diện cho từng đợt nông sản xuất vườn của nhà vườn, lưu trữ sản lượng dự kiến (`expectedWeightKg`), sản lượng khả dụng (`availableWeightKg`), đơn giá chào bán và ngày thu hoạch. Lớp này chứa các phương thức nghiệp vụ quan trọng như `reserveQuantity()` để giữ hàng khi chốt hợp đồng và `closeLot()` khi kết thúc mùa vụ.
- **Lớp `RfqNegotiation`:** Mô hình hóa phiên đàm phán giá và số lượng hai chiều, lưu trữ các bước trả giá đối ứng (`counterPrice`, `counterQuantity`), số vòng đàm phán (`roundNumber`), trạng thái máy hữu hạn (`status`) và hạn định phản hồi (`expiresAt`). Quan hệ 1-n với `B2bChatMessage` để lưu trữ lịch sử tin nhắn trao đổi.

#### 3.3.3. Phân hệ Hợp đồng & Kế toán Escrow (Contract & Finance Package)
- **Lớp `B2bContract`:** Thực thể pháp lý kinh tế số, được tự động sinh ra khi RFQ đạt trạng thái `ACCEPTED`. Lưu trữ mã hợp đồng duy nhất, tổng giá trị, số tiền cọc 30% bảo chứng Escrow (`depositAmount`), trạng thái thực thi (`fulfillmentStatus`) và các tham chiếu logistics. Quan hệ 1-n với `PaymentTransaction` để ghi nhận các giao dịch cọc 30% và thanh toán 70% còn lại.
- **Lớp `Settlement`:** Quản lý quyết toán tài chính cuối cùng sau khi hoàn tất giao nhận ePOD, tự động khấu trừ tỷ lệ phí dịch vụ sàn (`platformFee`) và hạch toán số tiền giải ngân thực nhận cho nhà vườn (`netPayout`).

#### 3.3.4. Phân hệ Logistics Chuỗi lạnh & Quản lý Trạm Hub (Logistics & Cold Chain Package)
- **Lớp `WarehouseHub`:** Quản lý các trạm trung chuyển nông sản, liên kết trực tiếp với danh sách xe tải lạnh (`FleetVehicle`) và đội ngũ tài xế (`FleetDriver`) được biên chế tại trạm.
- **Lớp `PickupTrip` & `PickupTripStop`:** Điều phối tuyến xe tải lạnh đi gom nông sản tại nhiều vườn nông dân (Inbound Logistics), ghi nhận khối lượng thực tế và nhiệt độ bàn giao tại vườn.
- **Lớp `QcInspection`:** Quản lý kết quả kiểm nghiệm KCS chất lượng tại trạm Hub: độ ngọt quang học (`qcBrix`), dư lượng phân bón Nitrat (`qcNitratePpm`) và an toàn thuốc bảo vệ thực vật, quyết định tỷ lệ phân loại Grade 1 của lô hàng.
- **Lớp `OutboundDeliveryTrip` & `OutboundDeliveryStop`:** Điều phối chuyến xe tải lạnh giao hàng chặng cuối từ Hub đến kho của từng Buyer. Lớp `OutboundDeliveryStop` ghi nhận biên bản giao nhận điện tử ePOD có đính kèm ảnh chụp hiện trường và chữ ký số cảm ứng của người nhận.
- **Lớp `IotSensorLog`:** Lưu trữ chuỗi dữ liệu telemetry cảm biến nhiệt độ (`temperatureC`) và độ ẩm (`humidityPercent`) theo thời gian thực để cảnh báo vi phạm dải bảo quản lạnh an toàn.
