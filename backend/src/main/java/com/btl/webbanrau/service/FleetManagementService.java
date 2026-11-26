package com.btl.webbanrau.service;

import com.btl.webbanrau.dto.request.FleetDriverRequest;
import com.btl.webbanrau.dto.request.FleetVehicleRequest;
import com.btl.webbanrau.model.FleetDriver;
import com.btl.webbanrau.model.FleetVehicle;
import com.btl.webbanrau.model.Role;
import com.btl.webbanrau.model.User;
import com.btl.webbanrau.model.WarehouseHub;
import com.btl.webbanrau.repository.FleetDriverRepository;
import com.btl.webbanrau.repository.FleetVehicleRepository;
import com.btl.webbanrau.repository.RoleRepository;
import com.btl.webbanrau.repository.UserRepository;
import com.btl.webbanrau.repository.WarehouseHubRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class FleetManagementService {

    private final WarehouseHubRepository warehouseHubRepository;
    private final FleetVehicleRepository fleetVehicleRepository;
    private final FleetDriverRepository fleetDriverRepository;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final JdbcTemplate jdbcTemplate;

    // --- HUBS ---
    public List<WarehouseHub> getAllHubs() {
        return warehouseHubRepository.findByActiveTrueOrderByHubNameAsc();
    }

    public WarehouseHub getHubById(Long id) {
        return warehouseHubRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy Hub với ID: " + id));
    }

    // --- VEHICLES ---
    public List<FleetVehicle> getVehiclesByHub(Long hubId) {
        return fleetVehicleRepository.findByWarehouseIdOrderByPlateNumberAsc(hubId);
    }

    public List<FleetVehicle> getAvailableVehiclesByHub(Long hubId) {
        return fleetVehicleRepository.findByWarehouseIdAndStatusOrderByCapacityKgDesc(hubId, "AVAILABLE");
    }

    @Transactional
    public FleetVehicle createVehicle(FleetVehicleRequest req) {
        WarehouseHub hub = getHubById(req.getWarehouseId());
        if (fleetVehicleRepository.findByPlateNumber(req.getPlateNumber()).isPresent()) {
            throw new IllegalArgumentException("Biển số xe đã tồn tại trong hệ thống: " + req.getPlateNumber());
        }

        FleetVehicle vehicle = FleetVehicle.builder()
                .warehouse(hub)
                .plateNumber(req.getPlateNumber().trim().toUpperCase())
                .vehicleModel(req.getVehicleModel().trim())
                .vehicleType(req.getVehicleType() != null ? req.getVehicleType().trim() : "REFRIGERATED_TRUCK")
                .capacityKg(req.getCapacityKg())
                .volumeM3(req.getVolumeM3())
                .minTemp(req.getMinTemp())
                .maxTemp(req.getMaxTemp())
                .status(req.getStatus() != null ? req.getStatus() : "AVAILABLE")
                .notes(req.getNotes())
                .build();

        return fleetVehicleRepository.save(vehicle);
    }

    @Transactional
    public FleetVehicle updateVehicleStatus(Long id, String status) {
        FleetVehicle vehicle = fleetVehicleRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy phương tiện với ID: " + id));
        vehicle.setStatus(status);
        return fleetVehicleRepository.save(vehicle);
    }

    // --- DRIVERS & WAREHOUSE STAFF ---
    public List<FleetDriver> getDriversByHub(Long hubId) {
        return fleetDriverRepository.findByWarehouseIdOrderByFullNameAsc(hubId);
    }

    public List<FleetDriver> getStaff(Long hubId, String role) {
        List<FleetDriver> list = (hubId != null)
                ? fleetDriverRepository.findByWarehouseIdOrderByFullNameAsc(hubId)
                : fleetDriverRepository.findAllByOrderByWarehouseIdAscFullNameAsc();

        if (role == null || role.isBlank() || "ALL".equalsIgnoreCase(role)) {
            return list;
        }
        String r = role.trim().toUpperCase();
        return list.stream().filter(d -> {
            String lc = d.getLicenseClass() != null ? d.getLicenseClass().toUpperCase() : "";
            if ("QC_TECH".equals(r)) return "QC_TECH".equals(lc);
            if ("WH_STAFF".equals(r) || "WAREHOUSE_STAFF".equals(r)) return "WH_STAFF".equals(lc);
            if ("DISPATCH".equals(r) || "DISPATCHER".equals(r)) return "DISPATCH".equals(lc);
            if ("ACCOUNTANT".equals(r)) return "ACCOUNTANT".equals(lc);
            if ("DRIVER".equals(r)) {
                return !"QC_TECH".equals(lc) && !"WH_STAFF".equals(lc)
                        && !"DISPATCH".equals(lc) && !"ACCOUNTANT".equals(lc);
            }
            return true;
        }).toList();
    }

    public List<FleetDriver> getAvailableDriversByHub(Long hubId) {
        return fleetDriverRepository.findByWarehouseIdAndStatusOrderByExperienceYearsDesc(hubId, "AVAILABLE")
                .stream()
                .filter(d -> {
                    String lc = d.getLicenseClass() != null ? d.getLicenseClass().toUpperCase() : "";
                    return !"QC_TECH".equals(lc) && !"WH_STAFF".equals(lc)
                            && !"DISPATCH".equals(lc) && !"ACCOUNTANT".equals(lc);
                })
                .toList();
    }

    private String resolveSystemRoleName(String licenseClass) {
        String lc = licenseClass != null ? licenseClass.trim().toUpperCase() : "";
        if ("QC_TECH".equals(lc) || "WH_STAFF".equals(lc) || "DISPATCH".equals(lc)) {
            return "ROLE_WAREHOUSE_QC";
        }
        if ("ACCOUNTANT".equals(lc)) {
            return "ROLE_ACCOUNTANT";
        }
        return "ROLE_DRIVER";
    }

    private User syncLinkedUserAccount(
            Long existingUserId,
            String username,
            String email,
            String rawPassword,
            String fullName,
            String phone,
            WarehouseHub hub,
            String licenseClass,
            String status
    ) {
        userRepository.findByUsername(username).ifPresent(u -> {
            if (existingUserId == null || !u.getId().equals(existingUserId)) {
                throw new IllegalArgumentException("Username đã được sử dụng: " + username);
            }
        });
        userRepository.findByEmail(email).ifPresent(u -> {
            if (existingUserId == null || !u.getId().equals(existingUserId)) {
                throw new IllegalArgumentException("Email đã được sử dụng: " + email);
            }
        });

        String roleName = resolveSystemRoleName(licenseClass);
        Role role = roleRepository.findByName(roleName)
                .orElseThrow(() -> new IllegalStateException("Không tìm thấy role hệ thống: " + roleName));

        User user = (existingUserId != null)
                ? userRepository.findById(existingUserId).orElseGet(User::new)
                : new User();

        user.setUsername(username);
        user.setEmail(email);
        user.setFullName(fullName);
        user.setPhone(phone);
        user.setAddress(hub.getHubName());
        user.setAssignedHubId(hub.getId());
        user.setEnabled(!"OFF_DUTY".equalsIgnoreCase(status));
        user.setEmailVerified(true);
        user.setKycStatus("VERIFIED");
        user.setRoles(new HashSet<>(Set.of(role)));
        if (rawPassword != null && !rawPassword.isBlank()) {
            user.setPassword(passwordEncoder.encode(rawPassword));
        }
        return userRepository.save(user);
    }

    @Transactional
    public FleetDriver createDriver(FleetDriverRequest req) {
        WarehouseHub hub = getHubById(req.getWarehouseId());
        String code = req.getDriverCode().trim().toUpperCase();
        String license = req.getLicenseNumber().trim();
        if (fleetDriverRepository.findByDriverCode(code).isPresent()) {
            throw new IllegalArgumentException("Mã tài xế đã tồn tại: " + code);
        }
        if (fleetDriverRepository.findByLicenseNumber(license).isPresent()) {
            throw new IllegalArgumentException("Số GPLX đã tồn tại: " + license);
        }
        if (req.getUsername() == null || req.getUsername().isBlank()) {
            throw new IllegalArgumentException("Username không được để trống");
        }
        if (req.getEmail() == null || req.getEmail().isBlank()) {
            throw new IllegalArgumentException("Email không được để trống");
        }
        if (req.getPassword() == null || req.getPassword().length() < 6) {
            throw new IllegalArgumentException("Mật khẩu phải có ít nhất 6 ký tự");
        }

        String username = req.getUsername().trim().toLowerCase();
        String email = req.getEmail().trim().toLowerCase();
        if (fleetDriverRepository.findByUsername(username).isPresent()) {
            throw new IllegalArgumentException("Username nhân viên đã tồn tại: " + username);
        }
        if (fleetDriverRepository.findByEmail(email).isPresent()) {
            throw new IllegalArgumentException("Email nhân viên đã tồn tại: " + email);
        }

        String status = req.getStatus() != null ? req.getStatus().trim().toUpperCase() : "AVAILABLE";
        String licenseClass = req.getLicenseClass().trim().toUpperCase();
        String passwordHash = passwordEncoder.encode(req.getPassword());

        User linkedUser = syncLinkedUserAccount(
                null,
                username,
                email,
                req.getPassword(),
                req.getFullName().trim(),
                req.getPhone().trim(),
                hub,
                licenseClass,
                status
        );

        FleetDriver driver = FleetDriver.builder()
                .warehouse(hub)
                .driverCode(code)
                .fullName(req.getFullName().trim())
                .phone(req.getPhone().trim())
                .licenseNumber(license)
                .licenseClass(licenseClass)
                .status(status)
                .experienceYears(req.getExperienceYears() != null ? req.getExperienceYears() : 1)
                .username(username)
                .email(email)
                .passwordHash(passwordHash)
                .userId(linkedUser.getId())
                .build();

        return fleetDriverRepository.save(driver);
    }

    @Transactional
    public FleetDriver updateDriverStatus(Long id, String status) {
        FleetDriver driver = fleetDriverRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy nhân viên với ID: " + id));
        driver.setStatus(status);
        return fleetDriverRepository.save(driver);
    }

    @Transactional
    public FleetDriver updateDriver(Long id, FleetDriverRequest req) {
        FleetDriver driver = fleetDriverRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy nhân viên với ID: " + id));
        WarehouseHub hub = getHubById(req.getWarehouseId());

        String nextCode = req.getDriverCode().trim().toUpperCase();
        fleetDriverRepository.findByDriverCode(nextCode).ifPresent(existing -> {
            if (!existing.getId().equals(id)) {
                throw new IllegalArgumentException("Mã nhân viên đã tồn tại: " + nextCode);
            }
        });

        String nextLicense = req.getLicenseNumber().trim();
        fleetDriverRepository.findByLicenseNumber(nextLicense).ifPresent(existing -> {
            if (!existing.getId().equals(id)) {
                throw new IllegalArgumentException("Số GPLX / mã chứng chỉ đã tồn tại: " + nextLicense);
            }
        });

        String nextUsername = req.getUsername() != null && !req.getUsername().isBlank()
                ? req.getUsername().trim().toLowerCase()
                : driver.getUsername();
        String nextEmail = req.getEmail() != null && !req.getEmail().isBlank()
                ? req.getEmail().trim().toLowerCase()
                : driver.getEmail();

        if (nextUsername == null || nextUsername.isBlank()) {
            throw new IllegalArgumentException("Username không được để trống");
        }
        if (nextEmail == null || nextEmail.isBlank()) {
            throw new IllegalArgumentException("Email không được để trống");
        }
        fleetDriverRepository.findByUsername(nextUsername).ifPresent(existing -> {
            if (!existing.getId().equals(id)) {
                throw new IllegalArgumentException("Username nhân viên đã tồn tại: " + nextUsername);
            }
        });
        fleetDriverRepository.findByEmail(nextEmail).ifPresent(existing -> {
            if (!existing.getId().equals(id)) {
                throw new IllegalArgumentException("Email nhân viên đã tồn tại: " + nextEmail);
            }
        });

        String nextPassword = (req.getPassword() != null && !req.getPassword().isBlank()) ? req.getPassword() : null;
        if (nextPassword != null && nextPassword.length() < 6) {
            throw new IllegalArgumentException("Mật khẩu mới phải có ít nhất 6 ký tự");
        }
        if (nextPassword != null) {
            driver.setPasswordHash(passwordEncoder.encode(nextPassword));
        }

        String nextStatus = (req.getStatus() != null && !req.getStatus().isBlank())
                ? req.getStatus().trim().toUpperCase()
                : driver.getStatus();
        String nextLicenseClass = req.getLicenseClass().trim().toUpperCase();

        User linkedUser = syncLinkedUserAccount(
                driver.getUserId(),
                nextUsername,
                nextEmail,
                nextPassword != null ? nextPassword : (driver.getUserId() == null ? "Staff@123456" : null),
                req.getFullName().trim(),
                req.getPhone().trim(),
                hub,
                nextLicenseClass,
                nextStatus
        );

        driver.setWarehouse(hub);
        driver.setDriverCode(nextCode);
        driver.setFullName(req.getFullName().trim());
        driver.setPhone(req.getPhone().trim());
        driver.setLicenseNumber(nextLicense);
        driver.setLicenseClass(nextLicenseClass);
        driver.setUsername(nextUsername);
        driver.setEmail(nextEmail);
        driver.setUserId(linkedUser.getId());
        if (req.getExperienceYears() != null) {
            driver.setExperienceYears(req.getExperienceYears());
        }
        driver.setStatus(nextStatus);
        return fleetDriverRepository.save(driver);
    }

    @Transactional
    public void deleteDriver(Long id) {
        FleetDriver driver = fleetDriverRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy nhân viên với ID: " + id));
        if ("ASSIGNED".equalsIgnoreCase(driver.getStatus()) || "ON_TRIP".equalsIgnoreCase(driver.getStatus())) {
            throw new IllegalArgumentException("Nhân viên đang thực hiện chuyến vận chuyển, không thể xóa.");
        }
        Integer pickupCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM pickup_trips WHERE driver_id = ?",
                Integer.class,
                id
        );
        int outboundCount = 0;
        try {
            Integer oc = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM outbound_delivery_trips WHERE driver_id = ?",
                    Integer.class,
                    id
            );
            outboundCount = oc != null ? oc : 0;
        } catch (Exception ignored) {
        }
        if ((pickupCount != null && pickupCount > 0) || outboundCount > 0) {
            throw new IllegalArgumentException("Nhân viên đã có lịch sử chuyến vận chuyển. Vui lòng chuyển sang trạng thái OFF_DUTY (Nghỉ phép / Ngừng hoạt động) thay vì xóa.");
        }
        fleetDriverRepository.delete(driver);
    }
}
