package com.btl.webbanrau.util;

import com.btl.webbanrau.model.*;
import com.btl.webbanrau.repository.*;
import java.time.LocalDateTime;import com.btl.webbanrau.model.Product;
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
import java.util.ArrayList;
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
    private final OrderRepository orderRepository;
    private final HarvestLotRepository harvestLotRepository;
    private final FarmerProfileRepository farmerProfileRepository;
    private final RfqNegotiationRepository rfqNegotiationRepository;
    private final B2bContractRepository b2bContractRepository;
    private final QcInspectionRepository qcInspectionRepository;
    private final SettlementRepository settlementRepository;
    private final PasswordEncoder passwordEncoder;
    private final com.btl.webbanrau.service.AiSearchService aiSearchService;
    private final org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

    @Override
    public void run(String... args) {
        // 1. Tạo Roles
        try {
            jdbcTemplate.execute("ALTER TABLE harvest_lots ALTER COLUMN tier_pricing_json TYPE jsonb USING tier_pricing_json::jsonb");
            jdbcTemplate.execute("""
                ALTER TABLE b2b_contracts ADD COLUMN IF NOT EXISTS offered_weight_kg NUMERIC(12,2);
                ALTER TABLE b2b_contracts ADD COLUMN IF NOT EXISTS offered_price_per_kg NUMERIC(15,2);
                ALTER TABLE b2b_contracts ADD COLUMN IF NOT EXISTS total_goods_amount NUMERIC(18,2);
                ALTER TABLE b2b_contracts ADD COLUMN IF NOT EXISTS deposit_30_amount NUMERIC(18,2);
                ALTER TABLE b2b_contracts ADD COLUMN IF NOT EXISTS platform_fee_rate NUMERIC(5,2) DEFAULT 3.0;
                ALTER TABLE b2b_contracts ADD COLUMN IF NOT EXISTS platform_fee_amount NUMERIC(18,2) DEFAULT 0;
                ALTER TABLE b2b_contracts ADD COLUMN IF NOT EXISTS logistics_fee_amount NUMERIC(18,2) DEFAULT 0;
                ALTER TABLE b2b_contracts ADD COLUMN IF NOT EXISTS service_vat_rate NUMERIC(5,2) DEFAULT 10;
                ALTER TABLE b2b_contracts ADD COLUMN IF NOT EXISTS deposit_received NUMERIC(18,2) DEFAULT 0;
                ALTER TABLE b2b_contracts ADD COLUMN IF NOT EXISTS balance_received NUMERIC(18,2) DEFAULT 0;
                ALTER TABLE b2b_contracts ADD COLUMN IF NOT EXISTS payout_amount NUMERIC(18,2) DEFAULT 0;
                ALTER TABLE b2b_contracts ADD COLUMN IF NOT EXISTS refund_amount NUMERIC(18,2) DEFAULT 0;
                ALTER TABLE b2b_contracts ADD COLUMN IF NOT EXISTS deposit_ref VARCHAR(100);
                ALTER TABLE b2b_contracts ADD COLUMN IF NOT EXISTS balance_ref VARCHAR(100);
                ALTER TABLE b2b_contracts ADD COLUMN IF NOT EXISTS payout_ref VARCHAR(100);
                ALTER TABLE b2b_contracts ADD COLUMN IF NOT EXISTS lot_id BIGINT;
                ALTER TABLE b2b_contracts ALTER COLUMN buyer_name DROP NOT NULL;
                ALTER TABLE b2b_contracts ALTER COLUMN quantity DROP NOT NULL;
                ALTER TABLE b2b_contracts ALTER COLUMN unit_price DROP NOT NULL;
                ALTER TABLE b2b_contracts ALTER COLUMN total_amount DROP NOT NULL;
                ALTER TABLE b2b_contracts ALTER COLUMN deposit_amount DROP NOT NULL;
                ALTER TABLE b2b_contracts ALTER COLUMN harvest_lot_id DROP NOT NULL;
                ALTER TABLE b2b_contracts ALTER COLUMN rfq_id DROP NOT NULL;
                ALTER TABLE b2b_contracts ALTER COLUMN created_at SET DEFAULT NOW();
                ALTER TABLE b2b_contracts ALTER COLUMN updated_at SET DEFAULT NOW();
            """);

            // Chuẩn hóa dứt điểm lỗi font chữ tiếng Việt (Mojibake UTF-8) cho các nhà vườn và tài khoản nông dân
            jdbcTemplate.execute("""
                UPDATE farmer_profiles SET 
                    farm_name = 'HTX Nông Nghiệp Đà Lạt GAP',
                    location = 'Tiểu khu 158, Phường 8, TP. Đà Lạt, Tỉnh Lâm Đồng',
                    bank_account_name = 'HTX NONG NGHIEP DA LAT GAP'
                WHERE user_id = (SELECT id FROM users WHERE username = 'farmer_dalat');

                UPDATE farmer_profiles SET 
                    farm_name = 'HTX Nông Nghiệp Rau Sạch Đơn Dương',
                    location = 'Xã Tu Tra, Huyện Đơn Dương, Tỉnh Lâm Đồng',
                    bank_account_name = 'HTX NONG NGHIEP DON DUONG'
                WHERE user_id = (SELECT id FROM users WHERE username = 'farmer_donduong');

                UPDATE farmer_profiles SET 
                    farm_name = 'Hợp Tác Xã Rau Củ Quả Buôn Hồ',
                    location = 'Phường An Lạc, Thị xã Buôn Hồ, Đắk Lắk',
                    bank_account_name = 'HTX RAU CU QUA BUON HO'
                WHERE user_id = (SELECT id FROM users WHERE username = 'farmer_buonho');

                UPDATE farmer_profiles SET 
                    farm_name = 'HTX Nông Nghiệp Công Nghệ Cao Củ Chi',
                    location = 'Xã Nhuận Đức, Huyện Củ Chi, TP.HCM',
                    bank_account_name = 'HTX NN CONG NGHE CAO CU CHI'
                WHERE user_id = (SELECT id FROM users WHERE username = 'farmer_saigon');

                UPDATE farmer_profiles SET 
                    farm_name = 'Hợp Tác Xã Nông Nghiệp Xanh Mộc Châu',
                    location = 'Thị trấn Nông Trường Mộc Châu, Sơn La',
                    bank_account_name = 'HTX NONG NGHIEP XANH MOC CHAU'
                WHERE user_id = (SELECT id FROM users WHERE username = 'farmer_mocchau');

                UPDATE users SET 
                    full_name = 'Nguyễn Văn Nông',
                    company_name = 'HTX Nông Nghiệp Đà Lạt GAP',
                    address = 'Tiểu khu 158, Phường 8, TP. Đà Lạt, Tỉnh Lâm Đồng'
                WHERE username = 'farmer_dalat';

                UPDATE users SET 
                    full_name = 'Ông Nguyễn Văn Thành',
                    company_name = 'HTX Nông Nghiệp Rau Sạch Đơn Dương',
                    address = 'Xã Tu Tra, Huyện Đơn Dương, Tỉnh Lâm Đồng'
                WHERE username = 'farmer_donduong';

                UPDATE users SET 
                    full_name = 'Bà Hoàng Thị Mai',
                    company_name = 'Hợp Tác Xã Rau Củ Quả Buôn Hồ',
                    address = 'Phường An Lạc, Thị xã Buôn Hồ, Đắk Lắk'
                WHERE username = 'farmer_buonho';

                UPDATE users SET 
                    full_name = 'Ông Phan Văn Giàu',
                    company_name = 'HTX Nông Nghiệp Công Nghệ Cao Củ Chi',
                    address = 'Xã Nhuận Đức, Huyện Củ Chi, TP.HCM'
                WHERE username = 'farmer_saigon';

                UPDATE users SET 
                    full_name = 'Kỹ sư Vũ Đình Trọng',
                    company_name = 'Hợp Tác Xã Nông Nghiệp Xanh Mộc Châu',
                    address = 'Thị trấn Nông Trường Mộc Châu, Sơn La'
                WHERE username = 'farmer_mocchau';

                UPDATE harvest_lots SET farmer_name = 'HTX Nông Nghiệp Đà Lạt GAP' 
                WHERE farmer_id = (SELECT id FROM users WHERE username = 'farmer_dalat');

                UPDATE harvest_lots SET farmer_name = 'HTX Nông Nghiệp Rau Sạch Đơn Dương' 
                WHERE farmer_id = (SELECT id FROM users WHERE username = 'farmer_donduong');

                UPDATE harvest_lots SET farmer_name = 'Hợp Tác Xã Rau Củ Quả Buôn Hồ' 
                WHERE farmer_id = (SELECT id FROM users WHERE username = 'farmer_buonho');

                UPDATE harvest_lots SET farmer_name = 'HTX Nông Nghiệp Công Nghệ Cao Củ Chi' 
                WHERE farmer_id = (SELECT id FROM users WHERE username = 'farmer_saigon');

                UPDATE harvest_lots SET farmer_name = 'Hợp Tác Xã Nông Nghiệp Xanh Mộc Châu' 
                WHERE farmer_id = (SELECT id FROM users WHERE username = 'farmer_mocchau');
            """);
            log.info("Normalized farmer Vietnamese font encoding in DataInitializer");
        } catch (Exception ignored) {}
        for (String name : List.of("ADMIN","ACCOUNTANT","WAREHOUSE_QC","DRIVER","FARMER","BUYER","USER")) {
            roleRepository.findByName("ROLE_"+name).orElseGet(()->roleRepository.save(new Role("ROLE_"+name,name)));
        }
        Role roleAdmin = roleRepository.findByName("ROLE_ADMIN").orElseThrow();
        Role roleUser = roleRepository.findByName("ROLE_USER").orElseThrow();
        Role roleBuyer = roleRepository.findByName("ROLE_BUYER").orElseThrow();

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
        User farmerUser = userRepository.findByUsername("farmer_dalat").orElse(null);
        if (farmerUser == null) {
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
                .enabled(true)
                .emailVerified(true)
                .kycStatus("VERIFIED")
                .roles(new HashSet<>(Set.of(roleRepository.findByName("ROLE_FARMER").orElseThrow())))
                .build());
            log.info("Seeded default farmer account: farmer_dalat / Farmer@123456");
        } else {
            farmerUser.setEnabled(true);
            farmerUser.setEmailVerified(true);
            farmerUser.setKycStatus("VERIFIED");
            farmerUser.setPassword(passwordEncoder.encode("Farmer@123456"));
            if (farmerUser.getRoles() == null || farmerUser.getRoles().isEmpty()) {
                farmerUser.setRoles(new HashSet<>(Set.of(roleRepository.findByName("ROLE_FARMER").orElseThrow())));
            }
            userRepository.save(farmerUser);
            log.info("Synchronized existing farmer account: farmer_dalat / Farmer@123456");
        }

        // Seed Khách hàng bán lẻ (ROLE_USER)
        User custUser = userRepository.findByUsername("user").orElse(null);
        if (custUser == null) {
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
        } else {
            custUser.setEnabled(true);
            custUser.setEmailVerified(true);
            custUser.setPassword(passwordEncoder.encode("user123"));
            userRepository.save(custUser);
            log.info("Synchronized existing customer account: user / user123");
        }

        // 3. Seed Thương lái B2B (ROLE_BUYER)
        if (!userRepository.existsByUsername("buyer_sg")) {
            userRepository.save(User.builder()
                .username("buyer_sg")
                .email("buyer_sg@honafresh.vn")
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

        if (userRepository.findByUsername("buyer").isEmpty() && userRepository.findByEmail("buyer_demo@honafresh.vn").isEmpty()) {
            User buyer = User.builder()
                    .username("buyer")
                    .password(passwordEncoder.encode("buyer123"))
                    .fullName("Đại diện Buyer Demo")
                    .email("buyer_demo@honafresh.vn")
                    .phone("0909123456")
                    .address("Kho Buyer Demo, TP.HCM")
                    .enabled(true)
                    .roles(new HashSet<>(Set.of(roleBuyer)))
                    .build();
            userRepository.save(buyer);
            log.info("Seeded Buyer account: buyer/buyer123");
        }
        userRepository.findByUsername("buyer").ifPresent(buyer -> {
            buyer.setEmailVerified(true);
            buyer.setKycStatus("VERIFIED");
            if (buyer.getCompanyName() == null || buyer.getCompanyName().isBlank()) buyer.setCompanyName("HoNa Fresh Buyer Demo");
            if (buyer.getWarehouseAddress() == null || buyer.getWarehouseAddress().isBlank()) buyer.setWarehouseAddress("Kho Buyer Demo, TP.HCM");
            userRepository.save(buyer);
        });

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

        // 4. Luôn đồng bộ 50 Harvest Lots mới nhất từ file migration (idempotent ON CONFLICT)
        try {
            org.springframework.core.io.ClassPathResource resource = new org.springframework.core.io.ClassPathResource("db/migration/V5__seed_50_harvest_lots.sql");
            if (resource.exists()) {
                String sql = new String(resource.getInputStream().readAllBytes(), java.nio.charset.StandardCharsets.UTF_8);
                jdbcTemplate.execute(sql);
                log.info("Đã đồng bộ 50 lô hàng vụ mùa chuẩn thành công! Tổng số lô hàng hiện tại: {}", harvestLotRepository.count());
            }
        } catch (Exception ex) {
            log.warn("Lưu ý đồng bộ V5__seed_50_harvest_lots.sql: {}", ex.getMessage());
        }

        // 5. Đồng bộ cấu trúc hợp đồng B2B & đảm bảo cột lot_id tồn tại
        try {
            jdbcTemplate.execute("ALTER TABLE b2b_contracts ADD COLUMN IF NOT EXISTS lot_id BIGINT REFERENCES harvest_lots(id)");
            jdbcTemplate.execute("UPDATE b2b_contracts SET lot_id = harvest_lot_id WHERE lot_id IS NULL AND harvest_lot_id IS NOT NULL");
        } catch (Exception ex) {
            log.warn("Lưu ý đồng bộ cột lot_id trên b2b_contracts: {}", ex.getMessage());
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

        // Seed Farmer Portal Demo Data
        Role roleFarmer = roleRepository.findByName("ROLE_FARMER").orElseThrow();
        seedFarmerPortalData(roleFarmer);

        // Seed orders linked to Buyer accounts so Admin and Buyer read the same database records.
        try {
            seedBuyerOrders();
        } catch (Exception e) {
            log.warn("Không thể seed đơn hàng mẫu cho Buyer: {}", e.getMessage());
        }
    }

    private void seedBuyerOrders() {
        List<Product> products = productRepository.findAll();
        if (products.size() < 3) {
            log.warn("Bỏ qua seed đơn Buyer vì database chưa có đủ 3 sản phẩm.");
            return;
        }

        List<User> buyers = userRepository.findAll().stream()
                .filter(user -> user.getRoles() != null && user.getRoles().stream()
                        .anyMatch(role -> "ROLE_BUYER".equals(role.getName())))
                .toList();

        for (User buyer : buyers) {
            String codePrefix = "ORD-DEMO-" + buyer.getUsername().toUpperCase().replaceAll("[^A-Z0-9]", "-");
            if (codePrefix.length() > 41) codePrefix = codePrefix.substring(0, 41);
            String recipientName = buyer.getFullName() == null || buyer.getFullName().isBlank()
                    ? buyer.getUsername() : buyer.getFullName();
            String recipientPhone = buyer.getPhone() == null || buyer.getPhone().isBlank()
                    ? "0900000000" : buyer.getPhone();
            String shippingAddress = buyer.getWarehouseAddress() == null || buyer.getWarehouseAddress().isBlank()
                    ? buyer.getAddress() : buyer.getWarehouseAddress();
            if (shippingAddress == null || shippingAddress.isBlank()) shippingAddress = "Kho Buyer, TP.HCM";

            seedBuyerOrderIfMissing(codePrefix + "-01", buyer, products.get(0), 5,
                    recipientName, recipientPhone, shippingAddress, "COD", OrderStatus.PENDING, false);
            seedBuyerOrderIfMissing(codePrefix + "-02", buyer, products.get(1), 8,
                    recipientName, recipientPhone, shippingAddress, "BANK_TRANSFER", OrderStatus.SHIPPING, true);
            seedBuyerOrderIfMissing(codePrefix + "-03", buyer, products.get(2), 4,
                    recipientName, recipientPhone, shippingAddress, "COD", OrderStatus.DELIVERED, true);
        }
        log.info("Đã đồng bộ dữ liệu đơn hàng mẫu cho {} tài khoản Buyer.", buyers.size());
    }

    private void seedBuyerOrderIfMissing(String orderCode, User buyer, Product product, int quantity,
                                         String recipientName, String recipientPhone, String shippingAddress,
                                         String paymentMethod, OrderStatus status, boolean paid) {
        if (orderRepository.findByOrderCode(orderCode).isPresent()) return;
        if (product.getStockQuantity() == null || product.getStockQuantity() < quantity) {
            log.warn("Bỏ qua đơn mẫu {} vì sản phẩm {} không đủ tồn kho.", orderCode, product.getName());
            return;
        }

        BigDecimal unitPrice = product.getPrice() == null ? BigDecimal.ZERO : product.getPrice();
        BigDecimal totalPrice = unitPrice.multiply(BigDecimal.valueOf(quantity));
        Order order = Order.builder()
                .orderCode(orderCode)
                .user(buyer)
                .recipientName(recipientName)
                .recipientPhone(recipientPhone)
                .shippingAddress(shippingAddress)
                .note("Đơn hàng mẫu đồng bộ Buyer - Admin")
                .paymentMethod(paymentMethod)
                .isPaid(paid)
                .status(status)
                .totalAmount(totalPrice)
                .items(new ArrayList<>())
                .build();
        order.addItem(OrderItem.builder()
                .product(product)
                .quantity(quantity)
                .unitPrice(unitPrice)
                .totalPrice(totalPrice)
                .build());
        orderRepository.save(order);

        // Giữ tồn kho nhất quán với các đơn thật: khi Admin hủy đơn mẫu, logic hoàn kho cũng đúng.
        product.setStockQuantity(product.getStockQuantity() - quantity);
        productRepository.save(product);
    }

    private void seedFarmerPortalData(Role roleFarmer) {
        try {
            User farmer = userRepository.findByUsername("farmer_dalat").orElseGet(() -> {
                User f = User.builder()
                        .username("farmer_dalat")
                        .password(passwordEncoder.encode("farmer123"))
                        .fullName("HTX Nông Nghiệp Đà Lạt GAP")
                        .email("farmer@webbanrau.com")
                        .phone("0988100222")
                        .address("Xã Xuân Thọ, TP. Đà Lạt, Tỉnh Lâm Đồng")
                        .enabled(true)
                        .roles(new HashSet<>(Set.of(roleFarmer)))
                        .build();
                return userRepository.save(f);
            });

            farmerProfileRepository.findByUser(farmer).orElseGet(() -> {
                FarmerProfile p = FarmerProfile.builder()
                        .user(farmer)
                        .farmName("Hợp Tác Xã Nông Sản Sạch Đà Lạt GAP")
                        .farmerType("COOPERATIVE")
                        .pucCode("VN-LDO-PUC-0849")
                        .certifications("VietGAP, GlobalGAP, Organic")
                        .certExpiryDate(LocalDate.now().plusMonths(18))
                        .taxCode("5801456789")
                        .idCardNumber("068095001234")
                        .bankAccount("5400205219999")
                        .bankAccountName("HTX RAU SACH DA LAT GAP")
                        .bankName("Agribank - Chi Nhánh Lâm Đồng")
                        .location("Xã Xuân Thọ, TP. Đà Lạt, Tỉnh Lâm Đồng")
                        .cultivatedArea("45 Hecta")
                        .certImageUrl("https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?w=500&auto=format&fit=crop&q=80")
                        .build();
                return farmerProfileRepository.save(p);
            });

            if (harvestLotRepository.count() == 0) {
                log.info("Seeding Farmer Portal Harvest Lots & Contracts...");

                HarvestLot lot1 = HarvestLot.builder()
                        .lotCode("LOT-2026-DL01")
                        .productName("Cà Chua Beef Đà Lạt Chuẩn VietGAP")
                        .categorySlug("cu-qua-tuoi")
                        .imageUrl("https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&auto=format&fit=crop&q=80")
                        .pucCode("VN-LDO-PUC-0849")
                        .harvestDate(LocalDate.now().plusDays(2))
                        .expiryDate(LocalDate.now().plusDays(16))
                        .totalQuantity(5000.0)
                        .remainingQuantity(2000.0)
                        .unit("kg")
                        .minTemp(2.0)
                        .maxTemp(6.0)
                        .tierPricingJson("[{\"minKg\":500,\"pricePerKg\":15000},{\"minKg\":2000,\"pricePerKg\":13500},{\"minKg\":5000,\"pricePerKg\":12000}]")
                        .status("NEGOTIATING")
                        .farmer(farmer)
                        .hubLocation("Trạm Lạnh Cross-docking Đức Trọng, Lâm Đồng")
                        .build();

                HarvestLot lot2 = HarvestLot.builder()
                        .lotCode("LOT-2026-DL02")
                        .productName("Xà Lách Lô Lô Xanh Thủy Canh")
                        .categorySlug("rau-sach")
                        .imageUrl("https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?w=600&auto=format&fit=crop&q=80")
                        .pucCode("VN-LDO-PUC-0850")
                        .harvestDate(LocalDate.now().plusDays(3))
                        .expiryDate(LocalDate.now().plusDays(10))
                        .totalQuantity(3500.0)
                        .remainingQuantity(3500.0)
                        .unit("kg")
                        .minTemp(2.0)
                        .maxTemp(4.0)
                        .tierPricingJson("[{\"minKg\":300,\"pricePerKg\":22000},{\"minKg\":1000,\"pricePerKg\":19500},{\"minKg\":3000,\"pricePerKg\":17500}]")
                        .status("OPEN")
                        .farmer(farmer)
                        .hubLocation("Trạm Lạnh Cross-docking Đức Trọng, Lâm Đồng")
                        .build();

                HarvestLot lot3 = HarvestLot.builder()
                        .lotCode("LOT-2026-DL03")
                        .productName("Bắp Cải Trái Tim Đà Lạt Hữu Cơ")
                        .categorySlug("rau-sach")
                        .imageUrl("https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=600&auto=format&fit=crop&q=80")
                        .pucCode("VN-LDO-PUC-0849")
                        .harvestDate(LocalDate.now().plusDays(5))
                        .expiryDate(LocalDate.now().plusDays(25))
                        .totalQuantity(10000.0)
                        .remainingQuantity(10000.0)
                        .unit("kg")
                        .minTemp(2.0)
                        .maxTemp(6.0)
                        .tierPricingJson("[{\"minKg\":1000,\"pricePerKg\":12000},{\"minKg\":5000,\"pricePerKg\":10500}]")
                        .status("OPEN")
                        .farmer(farmer)
                        .hubLocation("Trạm Lạnh Cross-docking Đức Trọng, Lâm Đồng")
                        .build();

                harvestLotRepository.saveAll(List.of(lot1, lot2, lot3));

                // RFQ 1 & 2
                RfqNegotiation rfq1 = RfqNegotiation.builder()
                        .rfqCode("RFQ-2026-0042")
                        .harvestLot(lot1)
                        .buyerName("Bách Hóa XANH Logistics")
                        .buyerPhone("0912888999")
                        .buyerCompany("Công Ty Cổ Phần Thương Mại Bách Hóa XANH")
                        .requestedQuantity(3000.0)
                        .targetPrice(BigDecimal.valueOf(13500))
                        .deliveryDate(LocalDate.now().plusDays(2))
                        .hubLocation("Trạm Lạnh Cross-docking Đức Trọng, Lâm Đồng")
                        .status("ACCEPTED")
                        .build();

                RfqNegotiation rfq2 = RfqNegotiation.builder()
                        .rfqCode("RFQ-2026-0058")
                        .harvestLot(lot2)
                        .buyerName("Hải Âu Catering Sài Gòn")
                        .buyerPhone("0903111222")
                        .buyerCompany("Công Ty Suất Ăn Công Nghiệp Hải Âu")
                        .requestedQuantity(1500.0)
                        .targetPrice(BigDecimal.valueOf(18000))
                        .deliveryDate(LocalDate.now().plusDays(4))
                        .hubLocation("Trạm Lạnh Cross-docking Đức Trọng, Lâm Đồng")
                        .status("PENDING")
                        .build();

                rfqNegotiationRepository.saveAll(List.of(rfq1, rfq2));

                // B2B Contract for RFQ 1
                BigDecimal totalAmount = BigDecimal.valueOf(3000.0 * 13500.0);
                BigDecimal depositAmount = totalAmount.multiply(BigDecimal.valueOf(0.3));

                B2bContract contract = B2bContract.builder()
                        .contractCode("HD-2026-0089")
                        .rfq(rfq1)
                        .harvestLot(lot1)
                        .farmer(farmer)
                        .buyerName(rfq1.getBuyerName())
                        .buyerPhone(rfq1.getBuyerPhone())
                        .quantity(3000.0)
                        .unitPrice(BigDecimal.valueOf(13500))
                        .totalAmount(totalAmount)
                        .depositAmount(depositAmount)
                        .depositStatus("DEPOSIT_PAID")
                        .fulfillmentStatus("HUB_DELIVERED")
                        .depositPaidAt(LocalDateTime.now().minusDays(2))
                        .hubDeliveryDate(LocalDate.now())
                        .hubName(rfq1.getHubLocation())
                        .build();

                b2bContractRepository.save(contract);

                // QC Inspection
                QcInspection qc = QcInspection.builder()
                        .contract(contract)
                        .grossWeight(3050.0)
                        .netQualifiedWeight(2980.0)
                        .rejectedWeight(70.0)
                        .qualifiedPercent(97.7)
                        .brixScore(12.5)
                        .moisturePercent(84.0)
                        .inspectorName("KS. Trần Hữu Phúc")
                        .qcNotes("Cà chua chín đỏ đều, vỏ bóng không nứt, độ ngọt Brix 12.5 đạt chuẩn xuất khẩu sang chuỗi siêu thị.")
                        .samplePhotoUrl("https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&auto=format&fit=crop&q=80")
                        .inspectedAt(LocalDateTime.now().minusHours(4))
                        .build();

                qcInspectionRepository.save(qc);

                // Settlement
                BigDecimal grossPayout = BigDecimal.valueOf(2980.0 * 13500.0);
                BigDecimal fee = grossPayout.multiply(BigDecimal.valueOf(0.03));
                BigDecimal netPayout = grossPayout.subtract(fee);

                Settlement settlement = Settlement.builder()
                        .settlementCode("STL-2026-0089")
                        .contract(contract)
                        .farmer(farmer)
                        .qualifiedWeight(2980.0)
                        .unitPrice(BigDecimal.valueOf(13500))
                        .grossAmount(grossPayout)
                        .platformFeePercent(3.0)
                        .platformFee(fee)
                        .payoutAmount(netPayout)
                        .bankAccount("5400205219999")
                        .bankName("Agribank - Chi Nhánh Lâm Đồng")
                        .bankAccountName("HTX RAU SACH DA LAT GAP")
                        .bankReference("FT2610269871")
                        .isPaid(true)
                        .paidAt(LocalDateTime.now().minusHours(2))
                        .taxFormType("FORM_01_TNDN")
                        .build();

                settlementRepository.save(settlement);
                log.info("Seeded Farmer Portal complete flow successfully!");
            }
        } catch (Exception ex) {
            log.error("Error seeding Farmer Portal data: {}", ex.getMessage());
        }
    }
}
