package com.btl.webbanrau.util;

import com.btl.webbanrau.model.Category;
import com.btl.webbanrau.model.Product;
import com.btl.webbanrau.model.Role;
import com.btl.webbanrau.model.User;
import com.btl.webbanrau.repository.CategoryRepository;
import com.btl.webbanrau.repository.ProductRepository;
import com.btl.webbanrau.repository.RoleRepository;
import com.btl.webbanrau.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
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
    private final PasswordEncoder passwordEncoder;
    private final com.btl.webbanrau.service.AiSearchService aiSearchService;
    private final org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

    @Override
    public void run(String... args) {
        for (String name : List.of("ADMIN","ACCOUNTANT","WAREHOUSE_QC","DRIVER","FARMER","BUYER")) {
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
