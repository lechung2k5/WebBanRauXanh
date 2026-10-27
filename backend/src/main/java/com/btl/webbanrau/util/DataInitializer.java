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
@org.springframework.context.annotation.Profile("!test")
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
        try {
            jdbcTemplate.execute("ALTER TABLE harvest_lots ALTER COLUMN tier_pricing_json TYPE jsonb USING tier_pricing_json::jsonb");
        } catch (Exception ignored) {}
        for (String name : List.of("ADMIN","ACCOUNTANT","WAREHOUSE_QC","DRIVER","FARMER","BUYER","USER")) {
            roleRepository.findByName("ROLE_"+name).orElseGet(()->roleRepository.save(new Role("ROLE_"+name,name)));
        }

        // 1. Seed Quản trị viên tối cao (ROLE_ADMIN)
        String adminEmail = System.getenv("ADMIN_EMAIL") != null ? System.getenv("ADMIN_EMAIL") : "admin@honafresh.vn";
        String adminPassword = System.getenv("ADMIN_PASSWORD") != null ? System.getenv("ADMIN_PASSWORD") : "Admin@123456";
        User adminUser = userRepository.findByUsername("admin").orElse(null);
        if (adminUser == null) {
            userRepository.save(User.builder()
                .username("admin")
                .email(adminEmail.trim().toLowerCase())
                .password(passwordEncoder.encode(adminPassword))
                .fullName("HoNa Administrator")
                .phone("0901234567")
                .address("Hội sở HoNa Fresh, TP.HCM")
                .companyName("HoNa Fresh Platform Co.")
                .emailVerified(true)
                .kycStatus("VERIFIED")
                .roles(new HashSet<>(Set.of(roleRepository.findByName("ROLE_ADMIN").orElseThrow())))
                .build());
            log.info("Seeded default admin account: admin / {}", adminPassword);
        } else {
            adminUser.setEmail(adminEmail.trim().toLowerCase());
            adminUser.setPassword(passwordEncoder.encode(adminPassword));
            adminUser.setEmailVerified(true);
            adminUser.setKycStatus("VERIFIED");
            if (adminUser.getRoles() == null || adminUser.getRoles().isEmpty()) {
                adminUser.setRoles(new HashSet<>(Set.of(roleRepository.findByName("ROLE_ADMIN").orElseThrow())));
            }
            userRepository.save(adminUser);
            log.info("Synchronized existing admin account: admin / {}", adminPassword);
        }

        // 2. Seed Nông dân B2B (ROLE_FARMER)
        if (!userRepository.existsByUsername("farmer_dalat")) {
            userRepository.save(User.builder()
                .username("farmer_dalat")
                .email("farmer@honafresh.vn")
                .password(passwordEncoder.encode("Farmer@123456"))
                .fullName("Nguyễn Văn Nông")
                .phone("0912345678")
                .address("Xã Lạc Dương, TP. Đà Lạt, Lâm Đồng")
                .companyName("Nông Trại Hữu Cơ Đà Lạt Fresh")
                .taxCode("5801234567")
                .householdFarmer(true)
                .bankName("VietinBank")
                .bankAccountNo("102839281928")
                .pucCode("PUC-LD-001")
                .certification("VietGAP")
                .emailVerified(true)
                .kycStatus("VERIFIED")
                .roles(new HashSet<>(Set.of(roleRepository.findByName("ROLE_FARMER").orElseThrow())))
                .build());
            log.info("Seeded default farmer account: farmer_dalat / Farmer@123456");
        }

        // Seed Khách hàng bán lẻ (ROLE_USER)
        if (!userRepository.existsByUsername("user")) {
            userRepository.save(User.builder()
                .username("user")
                .password(passwordEncoder.encode("user123"))
                .fullName("Nguyễn Văn Khách")
                .email("user@gmail.com")
                .phone("0912345678")
                .address("Cầu Giấy, Hà Nội")
                .enabled(true)
                .emailVerified(true)
                .kycStatus("VERIFIED")
                .roles(new HashSet<>(Set.of(roleRepository.findByName("ROLE_USER").orElseThrow())))
                .build());
            log.info("Seeded default customer account: user / user123");
        }

        // 3. Seed Thương lái B2B (ROLE_BUYER)
        if (!userRepository.existsByUsername("buyer_sg")) {
            userRepository.save(User.builder()
                .username("buyer_sg")
                .email("buyer@honafresh.vn")
                .password(passwordEncoder.encode("Buyer@123456"))
                .fullName("Trần Thị Thương")
                .phone("0987654321")
                .address("Quận Bình Tân, TP.HCM")
                .companyName("Công Ty TNHH Thu Mua Sỉ Nông Sản Sài Gòn")
                .taxCode("0312345678")
                .warehouseAddress("Kho Tổng hợp Chuỗi Lạnh Thủ Đức, TP.HCM")
                .emailVerified(true)
                .kycStatus("VERIFIED")
                .roles(new HashSet<>(Set.of(roleRepository.findByName("ROLE_BUYER").orElseThrow())))
                .build());
            log.info("Seeded default buyer account: buyer_sg / Buyer@123456");
        }

        // 4. Seed Kiểm định viên Trạm QC (ROLE_WAREHOUSE_QC)
        if (!userRepository.existsByUsername("qc_tram1")) {
            userRepository.save(User.builder()
                .username("qc_tram1")
                .email("qc@honafresh.vn")
                .password(passwordEncoder.encode("Qcstaff@123456"))
                .fullName("Kỹ Thuật Viên Kiểm Định 01")
                .phone("0933112233")
                .address("Trạm Trung Chuyển Dầu Giây, Đồng Nai")
                .emailVerified(true)
                .kycStatus("VERIFIED")
                .roles(new HashSet<>(Set.of(roleRepository.findByName("ROLE_WAREHOUSE_QC").orElseThrow())))
                .build());
            log.info("Seeded default QC account: qc_tram1 / Qcstaff@123456");
        }

        // 5. Seed Tài xế vận tải lạnh TMS (ROLE_DRIVER)
        if (!userRepository.existsByUsername("driver_tms")) {
            userRepository.save(User.builder()
                .username("driver_tms")
                .email("driver@honafresh.vn")
                .password(passwordEncoder.encode("Driver@123456"))
                .fullName("Tài Xế Nguyễn Văn Tài")
                .phone("0944556677")
                .address("Đội xe Lạnh HoNa Express, TP.HCM")
                .emailVerified(true)
                .kycStatus("VERIFIED")
                .roles(new HashSet<>(Set.of(roleRepository.findByName("ROLE_DRIVER").orElseThrow())))
                .build());
            log.info("Seeded default driver account: driver_tms / Driver@123456");
        }

        // 6. Seed Kế toán sàn VAS (ROLE_ACCOUNTANT)
        if (!userRepository.existsByUsername("accountant_vas")) {
            userRepository.save(User.builder()
                .username("accountant_vas")
                .email("accountant@honafresh.vn")
                .password(passwordEncoder.encode("Account@123456"))
                .fullName("Kế Toán Viên Lê Thị Thu")
                .phone("0977889900")
                .address("Phòng Tài Chính - Kế Toán HoNa Fresh, TP.HCM")
                .emailVerified(true)
                .kycStatus("VERIFIED")
                .roles(new HashSet<>(Set.of(roleRepository.findByName("ROLE_ACCOUNTANT").orElseThrow())))
                .build());
            log.info("Seeded default accountant account: accountant_vas / Account@123456");
        }

        // Đảm bảo tài khoản admin chỉ có ROLE_ADMIN, loại bỏ ROLE_USER nếu có
        userRepository.findByUsername("admin").ifPresent(targetAdmin -> {
            boolean hasRoleUser = targetAdmin.getRoles().stream().anyMatch(r -> "ROLE_USER".equals(r.getName()));
            if (hasRoleUser) {
                targetAdmin.getRoles().removeIf(r -> "ROLE_USER".equals(r.getName()));
                if (targetAdmin.getRoles().stream().noneMatch(r -> "ROLE_ADMIN".equals(r.getName()))) {
                    targetAdmin.getRoles().add(roleRepository.findByName("ROLE_ADMIN").orElseThrow());
                }
                userRepository.save(targetAdmin);
                log.info("Đã loại bỏ ROLE_USER khỏi tài khoản admin. Vai trò hiện tại của admin: {}", targetAdmin.getRoles());
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
                            .build(),

                    Product.builder()
                            .name("Đậu Bắp Xanh Hữu Cơ VietGAP")
                            .slug(SlugUtil.toSlug("Đậu Bắp Xanh Hữu Cơ VietGAP"))
                            .description("Đậu bắp xanh non giòn ngọt, giàu chất nhầy tự nhiên và vitamin, nguyên liệu kinh điển chuyên dùng nấu canh chua cá, nướng chao hoặc luộc chấm kho quẹt.")
                            .price(BigDecimal.valueOf(22000))
                            .originalPrice(BigDecimal.valueOf(28000))
                            .stockQuantity(120)
                            .unit("gói 500g")
                            .imageUrl("https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=600&auto=format&fit=crop&q=80")
                            .origin("Đơn Dương, Lâm Đồng")
                            .isOrganic(true)
                            .isFeatured(true)
                            .isActive(true)
                            .category(cat2)
                            .build(),

                    Product.builder()
                            .name("Bạc Hà (Dọc Mùng) Sạch Tươi")
                            .slug(SlugUtil.toSlug("Bạc Hà Dọc Mùng Sạch Tươi"))
                            .description("Bạc hà (dọc mùng) tước vỏ sạch sẽ, thân xốp giòn mọng nước, nguyên liệu truyền thống linh hồn của nồi canh chua cá lóc, bún mọc, bún sườn chua.")
                            .price(BigDecimal.valueOf(18000))
                            .originalPrice(BigDecimal.valueOf(24000))
                            .stockQuantity(90)
                            .unit("gói 300g")
                            .imageUrl("https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&auto=format&fit=crop&q=80")
                            .origin("Củ Chi, TP.HCM")
                            .isOrganic(true)
                            .isFeatured(true)
                            .isActive(true)
                            .category(cat1)
                            .build(),

                    Product.builder()
                            .name("Khóm Tân Lập (Dứa / Thơm) Tiền Giang")
                            .slug(SlugUtil.toSlug("Khóm Tân Lập Dứa Thơm Tiền Giang"))
                            .description("Khóm Tân Lập ngọt thanh chua dịu, mắt nông nhiều nước, chuyên dùng nấu canh chua cá, làm xào chua ngọt hoặc ép nước uống thanh nhiệt.")
                            .price(BigDecimal.valueOf(25000))
                            .originalPrice(BigDecimal.valueOf(30000))
                            .stockQuantity(100)
                            .unit("trái 1kg")
                            .imageUrl("https://images.unsplash.com/photo-1550258987-190a2d41a8ba?w=600&auto=format&fit=crop&q=80")
                            .origin("Tiền Giang (Miền Tây)")
                            .isOrganic(false)
                            .isFeatured(true)
                            .isActive(true)
                            .category(cat2)
                            .build(),

                    Product.builder()
                            .name("Cà Chua Beef Trái To Đà Lạt")
                            .slug(SlugUtil.toSlug("Cà Chua Beef Trái To Đà Lạt"))
                            .description("Cà chua beef trái to dày thịt mọng nước, vị chua ngọt đậm đà tự nhiên, tạo màu đỏ đẹp và vị chua thanh chuyên dùng nấu canh chua cá, sốt cà chua và salad.")
                            .price(BigDecimal.valueOf(32000))
                            .originalPrice(BigDecimal.valueOf(40000))
                            .stockQuantity(150)
                            .unit("kg")
                            .imageUrl("https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&auto=format&fit=crop&q=80")
                            .origin("Đà Lạt, Lâm Đồng")
                            .isOrganic(true)
                            .isFeatured(true)
                            .isActive(true)
                            .category(cat2)
                            .build()
            );

            productRepository.saveAll(products);
            log.info("Seeded initial categories and products successfully.");
        }

        // 4. Khởi tạo đúng 50 Harvest Lots ban đầu nếu cơ sở dữ liệu trống (không xóa / reset đè khi người dùng đã thêm lô mới)
        if (harvestLotRepository.count() == 0) {
            log.info("Khởi tạo cơ sở dữ liệu: Nạp 50 lô hàng nông sản B2B ban đầu chia đều 4 danh mục...");
            try {
                org.springframework.core.io.ClassPathResource resource = new org.springframework.core.io.ClassPathResource("db/migration/V5__seed_50_harvest_lots.sql");
                if (resource.exists()) {
                    String sql = new String(resource.getInputStream().readAllBytes(), java.nio.charset.StandardCharsets.UTF_8);
                    jdbcTemplate.execute(sql);
                    log.info("Đã đồng bộ V5__seed_50_harvest_lots.sql thành công! Tổng số lô hàng hiện tại: {}", harvestLotRepository.count());
                }
            } catch (Exception ex) {
                log.warn("Lưu ý đồng bộ V5__seed_50_harvest_lots.sql: {}", ex.getMessage());
            }
        }

        // 5. Tự động kiểm tra và import hợp đồng mẫu B2B & ký quỹ escrow thành công (nếu b2b_contracts đang trống)
        try {
            Long contractCount = jdbcTemplate.queryForObject("SELECT count(*) FROM b2b_contracts", Long.class);
            if (contractCount == null || contractCount == 0) {
                log.info("Khởi tạo tự động: Chưa có hợp đồng B2B trong hệ thống. Đang tự động import mẫu hợp đồng giao dịch thành công...");
                org.springframework.core.io.ClassPathResource resource = new org.springframework.core.io.ClassPathResource("db/migration/V6__seed_sample_b2b_contracts.sql");
                if (resource.exists()) {
                    String sql = new String(resource.getInputStream().readAllBytes(), java.nio.charset.StandardCharsets.UTF_8);
                    jdbcTemplate.execute(sql);
                    log.info("Đã tự động nạp thành công các mẫu hợp đồng B2B & bút toán ký quỹ escrow!");
                }
            }
        } catch (Exception ex) {
            log.warn("Lưu ý đồng bộ hợp đồng mẫu B2B: {}", ex.getMessage());
        }

        // 6. Sửa lỗi font chữ tiếng Việt có dấu cho các tài khoản người dùng B2B
        try {
            jdbcTemplate.update("UPDATE users SET full_name = 'Nguyễn Thị Minh Hạnh', address = '199-205 Nguyễn Thái Học, Quận 1, TP.HCM' WHERE username = 'buyer_coop'");
            jdbcTemplate.update("UPDATE users SET full_name = 'Phạm Hoàng Nam', address = 'Tòa nhà Mplaza Saigon, 39 Lê Duẩn, Bến Nghé, Quận 1, TP.HCM' WHERE username = 'buyer_winmart'");
            jdbcTemplate.update("UPDATE users SET full_name = 'Lê Trọng Đạt', address = '469 Nguyễn Hữu Thọ, Phường Tân Hưng, Quận 7, TP.HCM' WHERE username = 'buyer_lotte'");
            log.info("Đã chuẩn hóa font chữ tiếng Việt cho toàn bộ tài khoản người dùng B2B.");
        } catch (Exception ex) {
            log.warn("Lưu ý chuẩn hóa font chữ tiếng Việt người dùng: {}", ex.getMessage());
        }

        // 7. Tự động sửa lỗi font tiếng Việt cho bảng products nếu có sản phẩm bị lỗi dấu '?'
        try {
            Integer corruptCount = jdbcTemplate.queryForObject("SELECT count(*) FROM products WHERE name LIKE '%?%'", Integer.class);
            if (corruptCount != null && corruptCount > 0) {
                log.info("Phát hiện {} sản phẩm bị lỗi font chữ '?'. Đang tự động sửa lại tiếng Việt chuẩn từ bhx_products.json...", corruptCount);
                java.io.File jsonFile = new java.io.File("database/bhx_products.json");
                if (!jsonFile.exists()) {
                    jsonFile = new java.io.File("../database/bhx_products.json");
                }
                if (!jsonFile.exists()) {
                    jsonFile = new java.io.File("../frontend/public/data/bhx_products.json");
                }
                if (jsonFile.exists()) {
                    com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                    com.fasterxml.jackson.databind.JsonNode root = mapper.readTree(jsonFile);
                    if (root.isArray()) {
                        int fixed = 0;
                        for (com.fasterxml.jackson.databind.JsonNode p : root) {
                            String slug = p.path("slug").asText("");
                            String name = p.path("name").asText("");
                            String description = p.path("description").asText("");
                            if (!slug.isEmpty() && !name.isEmpty()) {
                                int count = jdbcTemplate.update(
                                    "UPDATE products SET name = ?, description = ? WHERE slug = ? AND name LIKE '%?%'",
                                    name, description, slug
                                );
                                fixed += count;
                            }
                        }
                        log.info("Đã khắc phục lỗi font chữ tiếng Việt cho {} sản phẩm!", fixed);
                    }
                }
            }
        } catch (Exception ex) {
            log.warn("Lưu ý đồng bộ font chữ sản phẩm: {}", ex.getMessage());
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
