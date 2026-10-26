package com.btl.webbanrau.util;

import com.btl.webbanrau.model.Category;
import com.btl.webbanrau.model.HarvestLot;
import com.btl.webbanrau.model.Product;
import com.btl.webbanrau.model.Role;
import com.btl.webbanrau.model.User;
import com.btl.webbanrau.repository.CategoryRepository;
import com.btl.webbanrau.repository.HarvestLotRepository;
import com.btl.webbanrau.repository.ProductRepository;
import com.btl.webbanrau.repository.RoleRepository;
import com.btl.webbanrau.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final CategoryRepository categoryRepository;
    private final ProductRepository productRepository;
    private final HarvestLotRepository harvestLotRepository;
    private final PasswordEncoder passwordEncoder;
    private final com.btl.webbanrau.service.AiSearchService aiSearchService;
    private final org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

    @Override
    public void run(String... args) {
        // 1. Tạo Roles
        Role roleAdmin = roleRepository.findByName("ROLE_ADMIN")
                .orElseGet(() -> roleRepository.save(new Role("ROLE_ADMIN", "Quản trị viên toàn quyền")));
        Role roleUser = roleRepository.findByName("ROLE_USER")
                .orElseGet(() -> roleRepository.save(new Role("ROLE_USER", "Khách hàng mua rau")));
        Role roleBuyer = roleRepository.findByName("ROLE_BUYER")
                .orElseGet(() -> roleRepository.save(new Role("ROLE_BUYER", "Thương lái/doanh nghiệp thu mua B2B")));

        // 2. Tạo Users mẫu nếu DB chưa có
        if (userRepository.count() == 0) {
            log.info("Seeding users for BTL Web Ban Rau...");

            User admin = User.builder()
                    .username("admin")
                    .password(passwordEncoder.encode("admin123"))
                    .fullName("Quản Trị Viên")
                    .email("admin@webbanrau.com")
                    .phone("0988888888")
                    .address("Hà Nội")
                    .enabled(true)
                    .roles(new HashSet<>(Set.of(roleAdmin)))
                    .build();

            User user = User.builder()
                    .username("user")
                    .password(passwordEncoder.encode("user123"))
                    .fullName("Nguyễn Văn Khách")
                    .email("user@gmail.com")
                    .phone("0912345678")
                    .address("Cầu Giấy, Hà Nội")
                    .enabled(true)
                    .roles(new HashSet<>(Set.of(roleUser)))
                    .build();

            User lockedUser = User.builder()
                    .username("locked")
                    .password(passwordEncoder.encode("user123"))
                    .fullName("Tài Khoản Bị Khoá")
                    .email("locked@gmail.com")
                    .phone("0900000000")
                    .address("Đống Đa, Hà Nội")
                    .enabled(false) // Tài khoản bị khoá
                    .roles(new HashSet<>(Set.of(roleUser)))
                    .build();

            userRepository.saveAll(List.of(admin, user, lockedUser));
            log.info("Seeded 3 sample accounts: admin/admin123, user/user123, locked/user123");
        }

        if (userRepository.findByUsername("buyer").isEmpty()) {
            User buyer = User.builder()
                    .username("buyer")
                    .password(passwordEncoder.encode("buyer123"))
                    .fullName("Đại diện Buyer Demo")
                    .email("buyer@honafresh.vn")
                    .phone("0909123456")
                    .address("Kho Buyer Demo, TP.HCM")
                    .enabled(true)
                    .roles(new HashSet<>(Set.of(roleBuyer)))
                    .build();
            userRepository.save(buyer);
            log.info("Seeded Buyer account: buyer/buyer123");
        }

        // Đảm bảo tài khoản admin chỉ có ROLE_ADMIN, loại bỏ ROLE_USER nếu có
        userRepository.findByUsername("admin").ifPresent(adminUser -> {
            boolean hasRoleUser = adminUser.getRoles().stream().anyMatch(r -> "ROLE_USER".equals(r.getName()));
            if (hasRoleUser) {
                adminUser.getRoles().removeIf(r -> "ROLE_USER".equals(r.getName()));
                if (adminUser.getRoles().stream().noneMatch(r -> "ROLE_ADMIN".equals(r.getName()))) {
                    adminUser.getRoles().add(roleAdmin);
                }
                userRepository.save(adminUser);
                log.info("Đã loại bỏ ROLE_USER khỏi tài khoản admin. Vai trò hiện tại của admin: {}", adminUser.getRoles());
            }
        });

        // 3. Tạo Categories nếu DB chưa có
        if (categoryRepository.count() == 0) {
            log.info("Seeding vegetable categories...");

            Category cat1 = Category.builder()
                    .name("Rau Ăn Lá")
                    .slug(SlugUtil.toSlug("Rau Ăn Lá"))
                    .description("Các loại rau xanh tươi mát, chuẩn VietGAP và hữu cơ tự nhiên")
                    .imageUrl("https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&auto=format&fit=crop&q=80")
                    .build();

            Category cat2 = Category.builder()
                    .name("Củ & Quả Tươi")
                    .slug(SlugUtil.toSlug("Củ & Quả Tươi"))
                    .description("Cà chua, cà rốt, khoai tây, bí đỏ Đà Lạt tươi ngon")
                    .imageUrl("https://images.unsplash.com/photo-1590779033100-9f60a05a013d?w=600&auto=format&fit=crop&q=80")
                    .build();

            Category cat3 = Category.builder()
                    .name("Nấm Tươi & Hữu Cơ")
                    .slug(SlugUtil.toSlug("Nấm Tươi & Hữu Cơ"))
                    .description("Nấm đùi gà, nấm kim châm, nấm hương tươi sạch giàu dinh dưỡng")
                    .imageUrl("https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600&auto=format&fit=crop&q=80")
                    .build();

            Category cat4 = Category.builder()
                    .name("Rau Gia Vị & Thảo Mộc")
                    .slug(SlugUtil.toSlug("Rau Gia Vị & Thảo Mộc"))
                    .description("Hành lá, ngò rí, húng quế, sả, gừng thơm lừng bữa cơm gia đình")
                    .imageUrl("https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=600&auto=format&fit=crop&q=80")
                    .build();

            categoryRepository.saveAll(List.of(cat1, cat2, cat3, cat4));

            // 4. Tạo Products
            List<Product> products = List.of(
                    Product.builder()
                            .name("Rau Xà Lách Mỡ Đà Lạt")
                            .slug(SlugUtil.toSlug("Rau Xà Lách Mỡ Đà Lạt"))
                            .description("Rau xà lách mỡ canh tác thủy canh chuẩn VietGAP, lá mềm ngọt giòn tan thích hợp làm salad tươi ngon.")
                            .price(BigDecimal.valueOf(25000))
                            .originalPrice(BigDecimal.valueOf(32000))
                            .stockQuantity(150)
                            .unit("gói 500g")
                            .imageUrl("https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?w=600&auto=format&fit=crop&q=80")
                            .origin("Đà Lạt Farm")
                            .isOrganic(true)
                            .isFeatured(true)
                            .isActive(true)
                            .category(cat1)
                            .build(),

                    Product.builder()
                            .name("Cải Bó Xôi Hữu Cơ (Spinach)")
                            .slug(SlugUtil.toSlug("Cải Bó Xôi Hữu Cơ Spinach"))
                            .description("Cải bó xôi giàu sắt và vitamin, trồng hữu cơ không dùng phân bón hóa học hay thuốc trừ sâu.")
                            .price(BigDecimal.valueOf(35000))
                            .originalPrice(BigDecimal.valueOf(42000))
                            .stockQuantity(80)
                            .unit("bó 400g")
                            .imageUrl("https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=600&auto=format&fit=crop&q=80")
                            .origin("Mộc Châu Farm")
                            .isOrganic(true)
                            .isFeatured(true)
                            .isActive(true)
                            .category(cat1)
                            .build(),

                    Product.builder()
                            .name("Cà Chua Cherry Đỏ Đà Lạt")
                            .slug(SlugUtil.toSlug("Cà Chua Cherry Đỏ Đà Lạt"))
                            .description("Cà chua bi ngọt thanh, mọng nước, nhiều chất chống oxy hóa tự nhiên.")
                            .price(BigDecimal.valueOf(45000))
                            .originalPrice(BigDecimal.valueOf(55000))
                            .stockQuantity(100)
                            .unit("hộp 500g")
                            .imageUrl("https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&auto=format&fit=crop&q=80")
                            .origin("Đà Lạt")
                            .isOrganic(true)
                            .isFeatured(true)
                            .isActive(true)
                            .category(cat2)
                            .build(),

                    Product.builder()
                            .name("Cà Rốt Hữu Cơ Tươi")
                            .slug(SlugUtil.toSlug("Cà Rốt Hữu Cơ Tươi"))
                            .description("Cà rốt trồng tại Đà Lạt theo tiêu chuẩn Organic, màu sắc tự nhiên, giòn ngọt đậm vị.")
                            .price(BigDecimal.valueOf(28000))
                            .originalPrice(BigDecimal.valueOf(35000))
                            .stockQuantity(120)
                            .unit("kg")
                            .imageUrl("https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=600&auto=format&fit=crop&q=80")
                            .origin("Đà Lạt")
                            .isOrganic(true)
                            .isFeatured(false)
                            .isActive(true)
                            .category(cat2)
                            .build(),

                    Product.builder()
                            .name("Nấm Đùi Gà Tươi Thượng Hạng")
                            .slug(SlugUtil.toSlug("Nấm Đùi Gà Tươi Thượng Hạng"))
                            .description("Nấm đùi gà thân mập, giòn ngọt, giàu đạm thực vật và khoáng chất quý.")
                            .price(BigDecimal.valueOf(48000))
                            .originalPrice(BigDecimal.valueOf(60000))
                            .stockQuantity(60)
                            .unit("khay 300g")
                            .imageUrl("https://images.unsplash.com/photo-1573732064472-ea7fd2382d22?w=600&auto=format&fit=crop&q=80")
                            .origin("Việt Nam")
                            .isOrganic(true)
                            .isFeatured(true)
                            .isActive(true)
                            .category(cat3)
                            .build(),

                    Product.builder()
                            .name("Húng Quế & Ngò Rí Tươi Sạch")
                            .slug(SlugUtil.toSlug("Húng Quế & Ngò Rí Tươi Sạch"))
                            .description("Bộ gia vị tươi gồm rau thơm, húng quế và ngò gai hái mới mỗi ngày.")
                            .price(BigDecimal.valueOf(15000))
                            .originalPrice(BigDecimal.valueOf(18000))
                            .stockQuantity(200)
                            .unit("combo 200g")
                            .imageUrl("https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=600&auto=format&fit=crop&q=80")
                            .origin("Hà Nội")
                            .isOrganic(true)
                            .isFeatured(false)
                            .isActive(true)
                            .category(cat4)
                            .build(),

                    Product.builder()
                            .name("Rau Muống Nước Thủy Canh")
                            .slug(SlugUtil.toSlug("Rau Muống Nước Thủy Canh"))
                            .description("Rau muống ngọn non xanh mướt, giòn ngọt, chuyên dùng xào tỏi hoặc nấu canh chua, luộc giải nhiệt.")
                            .price(BigDecimal.valueOf(18000))
                            .originalPrice(BigDecimal.valueOf(22000))
                            .stockQuantity(150)
                            .unit("bó 500g")
                            .imageUrl("https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&auto=format&fit=crop&q=80")
                            .origin("Củ Chi")
                            .isOrganic(true)
                            .isFeatured(true)
                            .isActive(true)
                            .category(cat1)
                            .build(),

                    Product.builder()
                            .name("Bí Đỏ Hạt Đậu Đà Lạt")
                            .slug(SlugUtil.toSlug("Bí Đỏ Hạt Đậu Đà Lạt"))
                            .description("Bí đỏ dẻo bùi ngọt thanh, giàu vitamin A, thích hợp nấu canh sườn, súp bí đỏ hoặc hầm xương.")
                            .price(BigDecimal.valueOf(24000))
                            .originalPrice(BigDecimal.valueOf(30000))
                            .stockQuantity(80)
                            .unit("quả 1kg")
                            .imageUrl("https://images.unsplash.com/photo-1570586437503-903009b33cb7?w=600&auto=format&fit=crop&q=80")
                            .origin("Đà Lạt")
                            .isOrganic(true)
                            .isFeatured(false)
                            .isActive(true)
                            .category(cat2)
                            .build(),

                    Product.builder()
                            .name("Nấm Kim Châm Tươi")
                            .slug(SlugUtil.toSlug("Nấm Kim Châm Tươi"))
                            .description("Nấm kim châm trắng giòn, vị ngọt thanh mát, món khoái khẩu để nhúng lẩu, cuộn bò nướng hoặc nấu súp.")
                            .price(BigDecimal.valueOf(16000))
                            .originalPrice(BigDecimal.valueOf(20000))
                            .stockQuantity(100)
                            .unit("gói 150g")
                            .imageUrl("https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80")
                            .origin("Việt Nam")
                            .isOrganic(true)
                            .isFeatured(true)
                            .isActive(true)
                            .category(cat3)
                            .build(),

                    Product.builder()
                            .name("Bông Cải Xanh Baby (Broccoli)")
                            .slug(SlugUtil.toSlug("Bông Cải Xanh Baby (Broccoli)"))
                            .description("Súp lơ xanh giòn ngọt, giàu vitamin C và chất xơ, hỗ trợ giảm cân và bảo vệ tim mạch, xào thịt bò tuyệt ngon.")
                            .price(BigDecimal.valueOf(38000))
                            .originalPrice(BigDecimal.valueOf(45000))
                            .stockQuantity(70)
                            .unit("cây 400g")
                            .imageUrl("https://images.unsplash.com/photo-1459411621453-7b03977f4bfc?w=600&auto=format&fit=crop&q=80")
                            .origin("Đà Lạt")
                            .isOrganic(true)
                            .isFeatured(true)
                            .isActive(true)
                            .category(cat1)
                            .build(),

                    Product.builder()
                            .name("Dưa Leo Baby Giòn Ngọt")
                            .slug(SlugUtil.toSlug("Dưa Leo Baby Giòn Ngọt"))
                            .description("Dưa leo đặc ruột, không chát, mọng nước, cực kỳ thích hợp làm salad, ăn sống thanh lọc cơ thể.")
                            .price(BigDecimal.valueOf(22000))
                            .originalPrice(BigDecimal.valueOf(28000))
                            .stockQuantity(90)
                            .unit("hộp 500g")
                            .imageUrl("https://images.unsplash.com/photo-1449339854873-750e6913301b?w=600&auto=format&fit=crop&q=80")
                            .origin("Lâm Đồng")
                            .isOrganic(true)
                            .isFeatured(false)
                            .isActive(true)
                            .category(cat2)
                            .build()
            );

            productRepository.saveAll(products);
            log.info("Seeded initial categories and products successfully.");
        }

        // 4. Tạo Harvest Lots (Lô nông sản vụ mùa B2B) nếu DB chưa có
        if (harvestLotRepository.count() == 0) {
            log.info("Seeding harvest lots for B2B Lots Catalog (Module 2)...");
            LocalDate now = LocalDate.now();

            List<HarvestLot> sampleLots = List.of(
                    HarvestLot.builder()
                            .lotCode("LOT-LD-2026-001")
                            .farmerId(1L)
                            .farmerName("Liên Minh HTX Rau Sạch Đà Lạt GAP")
                            .productName("Cải Bó Xôi Đà Lạt")
                            .category("RAU_AN_LA")
                            .categoryId(1L)
                            .pucCode("VN-LDO-08-200")
                            .certification("VietGAP, Hữu cơ Organic")
                            .harvestDate(now.minusDays(2))
                            .expiryDate(now.plusDays(10))
                            .totalWeightKg(new BigDecimal("8000.00"))
                            .availableWeightKg(new BigDecimal("6200.00"))
                            .basePricePerKg(new BigDecimal("18000.00"))
                            .tierPricingJson("[{\"minKg\": 500, \"price\": 18000}, {\"minKg\": 2000, \"price\": 16500}, {\"minKg\": 5000, \"price\": 15000}]")
                            .reqTempMin(new BigDecimal("2.0"))
                            .reqTempMax(new BigDecimal("5.0"))
                            .status("OPEN")
                            .imageUrl("https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=600&auto=format&fit=crop&q=80")
                            .warehouseLocation("Trạm Trung Chuyển Đức Trọng - Buồng Lạnh A1")
                            .region("Tây Nguyên & Lâm Đồng")
                            .auditNote("Hồ sơ kiểm định đầy đủ, PUC hợp lệ trên Cục Trồng trọt. Đã kiểm tra dư lượng Nitrate đạt chuẩn.")
                            .build(),

                    HarvestLot.builder()
                            .lotCode("LOT-DD-2026-002")
                            .farmerId(1L)
                            .farmerName("HTX Nông Nghiệp Công Nghệ Cao Đơn Dương")
                            .productName("Bắp Cải Trái Tim Đơn Dương")
                            .category("RAU_AN_LA")
                            .categoryId(1L)
                            .pucCode("VN-LDO-04-100")
                            .certification("VietGAP, OCOP 4 Sao")
                            .harvestDate(now.minusDays(1))
                            .expiryDate(now.plusDays(14))
                            .totalWeightKg(new BigDecimal("15000.00"))
                            .availableWeightKg(new BigDecimal("11500.00"))
                            .basePricePerKg(new BigDecimal("12000.00"))
                            .tierPricingJson("[{\"minKg\": 1000, \"price\": 12000}, {\"minKg\": 5000, \"price\": 10500}]")
                            .reqTempMin(new BigDecimal("2.0"))
                            .reqTempMax(new BigDecimal("6.0"))
                            .status("OPEN")
                            .imageUrl("https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=600&auto=format&fit=crop&q=80")
                            .warehouseLocation("Trạm Trung Chuyển Đức Trọng - Buồng Lạnh A2")
                            .region("Tây Nguyên & Lâm Đồng")
                            .auditNote("Lô hàng chất lượng cao đạt chuẩn OCOP 4 sao, búp cuộn chặt.")
                            .build(),

                    HarvestLot.builder()
                            .lotCode("LOT-DD-2026-003")
                            .farmerId(1L)
                            .farmerName("HTX Nông Nghiệp Công Nghệ Cao Đơn Dương")
                            .productName("Cà Chua Beef Xuất Khẩu")
                            .category("CU_QUA")
                            .categoryId(2L)
                            .pucCode("VN-LDO-04-100")
                            .certification("GlobalGAP")
                            .harvestDate(now)
                            .expiryDate(now.plusDays(12))
                            .totalWeightKg(new BigDecimal("10000.00"))
                            .availableWeightKg(new BigDecimal("10000.00"))
                            .basePricePerKg(new BigDecimal("22000.00"))
                            .tierPricingJson("[{\"minKg\": 500, \"price\": 22000}, {\"minKg\": 2000, \"price\": 20000}]")
                            .reqTempMin(new BigDecimal("4.0"))
                            .reqTempMax(new BigDecimal("8.0"))
                            .status("PENDING_APPROVAL")
                            .imageUrl("https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&auto=format&fit=crop&q=80")
                            .warehouseLocation("Kho Vùng Trồng Thạnh Mỹ - Đơn Dương")
                            .region("Tây Nguyên & Lâm Đồng")
                            .auditNote("Nông dân mới đăng chào bán, đang chờ kỹ thuật viên trạm kiểm tra mẫu Brix và tồn dư hóa chất.")
                            .build(),

                    HarvestLot.builder()
                            .lotCode("LOT-SLA-2026-004")
                            .farmerId(1L)
                            .farmerName("Hợp Tác Xã Nông Nghiệp Xanh Mộc Châu")
                            .productName("Cải Mèo Hữu Cơ Mộc Châu")
                            .category("RAU_AN_LA")
                            .categoryId(1L)
                            .pucCode("VN-SLA-09-300")
                            .certification("VietGAP, OCOP 4 Sao")
                            .harvestDate(now.minusDays(1))
                            .expiryDate(now.plusDays(9))
                            .totalWeightKg(new BigDecimal("6000.00"))
                            .availableWeightKg(new BigDecimal("4800.00"))
                            .basePricePerKg(new BigDecimal("16000.00"))
                            .tierPricingJson("[{\"minKg\": 500, \"price\": 16000}, {\"minKg\": 2000, \"price\": 14500}]")
                            .reqTempMin(new BigDecimal("2.0"))
                            .reqTempMax(new BigDecimal("6.0"))
                            .status("OPEN")
                            .imageUrl("https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&auto=format&fit=crop&q=80")
                            .warehouseLocation("Tổng Kho Mộc Châu - Buồng B1")
                            .region("Bắc Bộ")
                            .auditNote("Rau đặc sản xứ lạnh Mộc Châu, đóng thùng xốp mát đạt chuẩn vận tải Bắc Nam.")
                            .build(),

                    HarvestLot.builder()
                            .lotCode("LOT-LD-2026-005")
                            .farmerId(1L)
                            .farmerName("Nông Hộ Nguyễn Văn Hùng")
                            .productName("Cà Rốt Baby Đà Lạt")
                            .category("CU_QUA")
                            .categoryId(2L)
                            .pucCode("VN-LDO-04-105")
                            .certification("VietGAP")
                            .harvestDate(now.minusDays(3))
                            .expiryDate(now.plusDays(18))
                            .totalWeightKg(new BigDecimal("7000.00"))
                            .availableWeightKg(new BigDecimal("7000.00"))
                            .basePricePerKg(new BigDecimal("15000.00"))
                            .tierPricingJson("[{\"minKg\": 500, \"price\": 15000}, {\"minKg\": 3000, \"price\": 13500}]")
                            .reqTempMin(new BigDecimal("2.0"))
                            .reqTempMax(new BigDecimal("5.0"))
                            .status("SUSPENDED")
                            .rejectionReason("Cảnh báo khiếu nại dư lượng Nitrate trong biên bản QC số QC-2026-88. Tạm dừng giao dịch chờ kết quả xét nghiệm mẫu đối chứng.")
                            .imageUrl("https://images.unsplash.com/photo-1447175008436-054170c2e979?w=600&auto=format&fit=crop&q=80")
                            .warehouseLocation("Khu Kiểm Định Cách Ly Trạm Đức Trọng")
                            .region("Tây Nguyên & Lâm Đồng")
                            .auditNote("Admin kích hoạt tạm khóa bảo vệ sàn.")
                            .build(),

                    HarvestLot.builder()
                            .lotCode("LOT-BTR-2026-006")
                            .farmerId(1L)
                            .farmerName("HTX Nông Sản An Toàn Ba Tri")
                            .productName("Khổ Qua Rừng Ba Tri")
                            .category("CU_QUA")
                            .categoryId(2L)
                            .pucCode("VN-BTR-05-400")
                            .certification("Chuẩn Nông Sản An Toàn")
                            .harvestDate(now.minusDays(1))
                            .expiryDate(now.plusDays(8))
                            .totalWeightKg(new BigDecimal("5000.00"))
                            .availableWeightKg(new BigDecimal("3200.00"))
                            .basePricePerKg(new BigDecimal("25000.00"))
                            .tierPricingJson("[{\"minKg\": 300, \"price\": 25000}, {\"minKg\": 1000, \"price\": 22000}]")
                            .reqTempMin(new BigDecimal("6.0"))
                            .reqTempMax(new BigDecimal("10.0"))
                            .status("OPEN")
                            .imageUrl("https://images.unsplash.com/photo-1589923188900-85dae523342b?w=600&auto=format&fit=crop&q=80")
                            .warehouseLocation("Kho Trung Chuyển Sóng Thần - Dĩ An")
                            .region("Đồng Bằng Sông Cửu Long")
                            .auditNote("Hàng đạt tiêu chuẩn cung cấp cho chuỗi nhà hàng.")
                            .build(),

                    HarvestLot.builder()
                            .lotCode("LOT-LD-2026-007")
                            .farmerId(1L)
                            .farmerName("Liên Minh HTX Rau Sạch Đà Lạt GAP")
                            .productName("Nấm Đùi Gà Thượng Hạng")
                            .category("NAM_TUOI")
                            .categoryId(3L)
                            .pucCode("VN-LDO-08-200")
                            .certification("GlobalGAP, Organic")
                            .harvestDate(now)
                            .expiryDate(now.plusDays(7))
                            .totalWeightKg(new BigDecimal("4000.00"))
                            .availableWeightKg(new BigDecimal("4000.00"))
                            .basePricePerKg(new BigDecimal("48000.00"))
                            .tierPricingJson("[{\"minKg\": 200, \"price\": 48000}, {\"minKg\": 1000, \"price\": 43000}]")
                            .reqTempMin(new BigDecimal("2.0"))
                            .reqTempMax(new BigDecimal("4.0"))
                            .status("PENDING_APPROVAL")
                            .imageUrl("https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600&auto=format&fit=crop&q=80")
                            .warehouseLocation("Kho Lạnh Chuyên Dụng Nấm A3")
                            .region("Tây Nguyên & Lâm Đồng")
                            .auditNote("Lô nấm mới thu hoạch sáng nay, đang kiểm tra nhiệt độ lõi trước khi duyệt.")
                            .build(),

                    HarvestLot.builder()
                            .lotCode("LOT-LD-2026-008")
                            .farmerId(1L)
                            .farmerName("Trang Trại LangBiang Farm")
                            .productName("Ớt Chuông Đà Lạt Đỏ Vàng")
                            .category("CU_QUA")
                            .categoryId(2L)
                            .pucCode("VN-LDO-01-090")
                            .certification("VietGAP")
                            .harvestDate(now.minusDays(5))
                            .expiryDate(now.plusDays(6))
                            .totalWeightKg(new BigDecimal("9000.00"))
                            .availableWeightKg(BigDecimal.ZERO)
                            .basePricePerKg(new BigDecimal("28000.00"))
                            .tierPricingJson("[{\"minKg\": 500, \"price\": 28000}]")
                            .reqTempMin(new BigDecimal("4.0"))
                            .reqTempMax(new BigDecimal("7.0"))
                            .status("SOLD_OUT")
                            .imageUrl("https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=600&auto=format&fit=crop&q=80")
                            .warehouseLocation("Trạm Trung Chuyển Đức Trọng")
                            .region("Tây Nguyên & Lâm Đồng")
                            .auditNote("Đã hoàn tất toàn bộ hợp đồng giao sỉ cho chuỗi siêu thị.")
                            .build()
            );

            harvestLotRepository.saveAll(sampleLots);
            log.info("Seeded {} sample harvest lots successfully.", sampleLots.size());
        }

        // Tự động kiểm tra và đồng bộ vector embedding nếu còn sản phẩm chưa có vector
        try {
            Integer withoutEmbedding = jdbcTemplate.queryForObject(
                    "SELECT count(*) FROM products WHERE embedding IS NULL", Integer.class);
            if (withoutEmbedding != null && withoutEmbedding > 0) {
                log.info("Phát hiện {} sản phẩm chưa có vector embedding. Đang tiến hành đồng bộ pgvector...", withoutEmbedding);
                aiSearchService.syncAllProductEmbeddings();
            }
        } catch (Exception e) {
            log.warn("Không thể tự động đồng bộ vector lúc khởi động: {}", e.getMessage());
        }
    }
}
