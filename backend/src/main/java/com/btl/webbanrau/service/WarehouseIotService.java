package com.btl.webbanrau.service;

import com.btl.webbanrau.dto.request.WarehouseIotTelemetryRequest;
import com.btl.webbanrau.model.WarehouseHub;
import com.btl.webbanrau.model.WarehouseIotLog;
import com.btl.webbanrau.model.WarehouseZone;
import com.btl.webbanrau.repository.WarehouseHubRepository;
import com.btl.webbanrau.repository.WarehouseIotLogRepository;
import com.btl.webbanrau.repository.WarehouseZoneRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class WarehouseIotService {

    private final WarehouseHubRepository hubRepository;
    private final WarehouseZoneRepository zoneRepository;
    private final WarehouseIotLogRepository iotLogRepository;
    private final B2bRealtimeService realtimeService;

    @Transactional
    public Map<String, Object> recordTelemetry(WarehouseIotTelemetryRequest request) {
        Long hubId = request.getHubId() != null && request.getHubId() > 0 ? request.getHubId() : 2L;
        WarehouseHub hub = hubRepository.findById(hubId)
                .orElseThrow(() -> new AuthException(404, "HUB_NOT_FOUND", "Không tìm thấy kho hàng ID: " + hubId));

        List<WarehouseZone> zones = zoneRepository.findByWarehouseIdOrderByZoneCodeAsc(hub.getId());
        WarehouseZone matchedZone = resolveZone(zones, request.getZoneId(), request.getZoneCode());

        String resolvedZoneCode = matchedZone != null
                ? matchedZone.getZoneCode()
                : (request.getZoneCode() != null && !request.getZoneCode().isBlank()
                    ? request.getZoneCode().trim().toUpperCase()
                    : "ZONE-A");

        BigDecimal tempMin = matchedZone != null && matchedZone.getTempMin() != null
                ? matchedZone.getTempMin()
                : new BigDecimal("2.0");
        BigDecimal tempMax = matchedZone != null && matchedZone.getTempMax() != null
                ? matchedZone.getTempMax()
                : new BigDecimal("6.0");
        int humidityTarget = matchedZone != null && matchedZone.getHumidityTarget() != null
                ? matchedZone.getHumidityTarget()
                : 90;
        int humidityMin = matchedZone != null && matchedZone.getHumidityMin() != null
                ? matchedZone.getHumidityMin()
                : Math.max(0, humidityTarget - 5);
        int humidityMax = matchedZone != null && matchedZone.getHumidityMax() != null
                ? matchedZone.getHumidityMax()
                : Math.min(100, humidityTarget + 5);

        BigDecimal temp = request.getTemperature();
        BigDecimal humidity = request.getHumidity();

        List<String> alerts = new ArrayList<>();
        if (temp.compareTo(tempMin) < 0) {
            alerts.add(String.format("Nhiệt độ %.1f°C thấp hơn ngưỡng tối thiểu %.1f°C", temp, tempMin));
        } else if (temp.compareTo(tempMax) > 0) {
            alerts.add(String.format("Nhiệt độ %.1f°C vượt ngưỡng tối đa %.1f°C", temp, tempMax));
        }
        double humVal = humidity.doubleValue();
        if (humVal < humidityMin) {
            alerts.add(String.format("Độ ẩm %.1f%% thấp hơn ngưỡng tối thiểu %d%%", humidity, humidityMin));
        } else if (humVal > humidityMax) {
            alerts.add(String.format("Độ ẩm %.1f%% vượt ngưỡng tối đa %d%%", humidity, humidityMax));
        }

        boolean isAlert = !alerts.isEmpty();
        String alertMessage = isAlert ? String.join("; ", alerts) : null;

        String source = request.getSource() != null && !request.getSource().isBlank()
                ? request.getSource().trim().toUpperCase()
                : "WOKWI";
        String deviceId = request.getDeviceId() != null && !request.getDeviceId().isBlank()
                ? request.getDeviceId().trim()
                : ("SIMULATOR".equals(source) ? "WEB-SIMULATOR" : "WOKWI-ESP32");

        WarehouseIotLog saved = iotLogRepository.save(WarehouseIotLog.builder()
                .warehouseId(hub.getId())
                .zoneId(matchedZone != null ? matchedZone.getId() : null)
                .zoneCode(resolvedZoneCode)
                .deviceId(deviceId)
                .source(source)
                .temperature(temp)
                .humidity(humidity)
                .alert(isAlert)
                .alertMessage(alertMessage)
                .recordedAt(LocalDateTime.now())
                .build());

        Map<String, Object> view = toTelemetryView(saved, matchedZone, hub);
        realtimeService.notifyWarehouseIotUpdated(hub.getId(), view);
        return view;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getLatestByHub(Long hubId) {
        WarehouseHub hub = hubRepository.findById(hubId)
                .orElseThrow(() -> new AuthException(404, "HUB_NOT_FOUND", "Không tìm thấy kho hàng ID: " + hubId));
        List<WarehouseZone> zones = zoneRepository.findByWarehouseIdOrderByZoneCodeAsc(hub.getId());
        List<Map<String, Object>> results = new ArrayList<>();

        for (WarehouseZone zone : zones) {
            Optional<WarehouseIotLog> latest = iotLogRepository
                    .findTopByWarehouseIdAndZoneCodeOrderByRecordedAtDescIdDesc(hub.getId(), zone.getZoneCode());
            if (latest.isPresent()) {
                results.add(toTelemetryView(latest.get(), zone, hub));
            } else {
                Map<String, Object> fallback = new LinkedHashMap<>();
                BigDecimal midTemp = zone.getTempMin().add(zone.getTempMax()).divide(new BigDecimal("2"));
                fallback.put("id", null);
                fallback.put("hubId", hub.getId());
                fallback.put("hubName", hub.getHubName());
                fallback.put("zoneId", zone.getId());
                fallback.put("zoneCode", zone.getZoneCode());
                fallback.put("zoneName", zone.getZoneName());
                fallback.put("deviceId", "DEFAULT-SENSOR");
                fallback.put("source", "BASELINE");
                fallback.put("temperature", midTemp);
                fallback.put("humidity", zone.getHumidityTarget() != null ? zone.getHumidityTarget() : 90);
                int zTarget = zone.getHumidityTarget() != null ? zone.getHumidityTarget() : 90;
                int zMin = zone.getHumidityMin() != null ? zone.getHumidityMin() : Math.max(0, zTarget - 5);
                int zMax = zone.getHumidityMax() != null ? zone.getHumidityMax() : Math.min(100, zTarget + 5);
                fallback.put("tempMin", zone.getTempMin());
                fallback.put("tempMax", zone.getTempMax());
                fallback.put("humidityTarget", zTarget);
                fallback.put("humidityMin", zMin);
                fallback.put("humidityMax", zMax);
                fallback.put("alert", false);
                fallback.put("alertMessage", null);
                fallback.put("recordedAt", null);
                results.add(fallback);
            }
        }
        return results;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getHistoryByHub(Long hubId, String zoneCode, int limit) {
        int safeLimit = Math.max(1, Math.min(limit, 100));
        WarehouseHub hub = hubRepository.findById(hubId)
                .orElseThrow(() -> new AuthException(404, "HUB_NOT_FOUND", "Không tìm thấy kho hàng ID: " + hubId));
        List<WarehouseZone> zones = zoneRepository.findByWarehouseIdOrderByZoneCodeAsc(hub.getId());
        Map<String, WarehouseZone> zoneByCode = new HashMap<>();
        for (WarehouseZone z : zones) {
            zoneByCode.put(z.getZoneCode().toUpperCase(), z);
        }

        List<WarehouseIotLog> logs = (zoneCode != null && !zoneCode.isBlank())
                ? iotLogRepository.findByWarehouseIdAndZoneCodeOrderByRecordedAtDescIdDesc(
                        hub.getId(), zoneCode.trim().toUpperCase(), PageRequest.of(0, safeLimit))
                : iotLogRepository.findByWarehouseIdOrderByRecordedAtDescIdDesc(
                        hub.getId(), PageRequest.of(0, safeLimit));

        List<Map<String, Object>> result = new ArrayList<>();
        for (WarehouseIotLog log : logs) {
            result.add(toTelemetryView(log, zoneByCode.get(log.getZoneCode().toUpperCase()), hub));
        }
        return result;
    }

    private WarehouseZone resolveZone(List<WarehouseZone> zones, Long zoneId, String zoneCode) {
        if (zoneId != null) {
            for (WarehouseZone z : zones) {
                if (Objects.equals(z.getId(), zoneId)) return z;
            }
        }
        if (zoneCode != null && !zoneCode.isBlank()) {
            String normalized = zoneCode.trim().toUpperCase();
            for (WarehouseZone z : zones) {
                if (z.getZoneCode() != null && z.getZoneCode().trim().equalsIgnoreCase(normalized)) {
                    return z;
                }
            }
        }
        return zones.isEmpty() ? null : zones.getFirst();
    }

    private Map<String, Object> toTelemetryView(WarehouseIotLog log, WarehouseZone zone, WarehouseHub hub) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", log.getId());
        map.put("hubId", log.getWarehouseId());
        map.put("hubName", hub.getHubName());
        map.put("zoneId", log.getZoneId() != null ? log.getZoneId() : (zone != null ? zone.getId() : null));
        map.put("zoneCode", log.getZoneCode());
        map.put("zoneName", zone != null ? zone.getZoneName() : log.getZoneCode());
        map.put("deviceId", log.getDeviceId());
        map.put("source", log.getSource());
        map.put("temperature", log.getTemperature());
        map.put("humidity", log.getHumidity());
        int zTarget = zone != null && zone.getHumidityTarget() != null ? zone.getHumidityTarget() : 90;
        int zMin = zone != null && zone.getHumidityMin() != null ? zone.getHumidityMin() : Math.max(0, zTarget - 5);
        int zMax = zone != null && zone.getHumidityMax() != null ? zone.getHumidityMax() : Math.min(100, zTarget + 5);
        map.put("tempMin", zone != null ? zone.getTempMin() : new BigDecimal("2.0"));
        map.put("tempMax", zone != null ? zone.getTempMax() : new BigDecimal("6.0"));
        map.put("humidityTarget", zTarget);
        map.put("humidityMin", zMin);
        map.put("humidityMax", zMax);
        map.put("alert", log.isAlert());
        map.put("alertMessage", log.getAlertMessage());
        map.put("recordedAt", log.getRecordedAt());
        return map;
    }
}
