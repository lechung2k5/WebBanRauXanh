package com.btl.webbanrau.service;

import com.btl.webbanrau.dto.request.FleetDriverRequest;
import com.btl.webbanrau.dto.request.FleetVehicleRequest;
import com.btl.webbanrau.model.FleetDriver;
import com.btl.webbanrau.model.FleetVehicle;
import com.btl.webbanrau.model.WarehouseHub;
import com.btl.webbanrau.repository.FleetDriverRepository;
import com.btl.webbanrau.repository.FleetVehicleRepository;
import com.btl.webbanrau.repository.WarehouseHubRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class FleetManagementService {

    private final WarehouseHubRepository warehouseHubRepository;
    private final FleetVehicleRepository fleetVehicleRepository;
    private final FleetDriverRepository fleetDriverRepository;

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

    // --- DRIVERS ---
    public List<FleetDriver> getDriversByHub(Long hubId) {
        return fleetDriverRepository.findByWarehouseIdOrderByFullNameAsc(hubId);
    }

    public List<FleetDriver> getAvailableDriversByHub(Long hubId) {
        return fleetDriverRepository.findByWarehouseIdAndStatusOrderByExperienceYearsDesc(hubId, "AVAILABLE");
    }

    @Transactional
    public FleetDriver createDriver(FleetDriverRequest req) {
        WarehouseHub hub = getHubById(req.getWarehouseId());
        if (fleetDriverRepository.findByDriverCode(req.getDriverCode()).isPresent()) {
            throw new IllegalArgumentException("Mã tài xế đã tồn tại: " + req.getDriverCode());
        }
        if (fleetDriverRepository.findByLicenseNumber(req.getLicenseNumber()).isPresent()) {
            throw new IllegalArgumentException("Số GPLX đã tồn tại: " + req.getLicenseNumber());
        }

        FleetDriver driver = FleetDriver.builder()
                .warehouse(hub)
                .driverCode(req.getDriverCode().trim().toUpperCase())
                .fullName(req.getFullName().trim())
                .phone(req.getPhone().trim())
                .licenseNumber(req.getLicenseNumber().trim())
                .licenseClass(req.getLicenseClass().trim().toUpperCase())
                .status(req.getStatus() != null ? req.getStatus() : "AVAILABLE")
                .experienceYears(req.getExperienceYears() != null ? req.getExperienceYears() : 1)
                .build();

        return fleetDriverRepository.save(driver);
    }

    @Transactional
    public FleetDriver updateDriverStatus(Long id, String status) {
        FleetDriver driver = fleetDriverRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy tài xế với ID: " + id));
        driver.setStatus(status);
        return fleetDriverRepository.save(driver);
    }
}
