package com.btl.webbanrau.controller;

import com.btl.webbanrau.dto.response.ApiResponse;
import com.btl.webbanrau.service.*;
import com.btl.webbanrau.repository.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import java.util.*;
import java.util.concurrent.*;

@RestController @RequestMapping("/admin") @RequiredArgsConstructor @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_MANAGER')")
public class AdminBusinessController {
    private final AdminBusinessService business;
    private final UserRepository users;
    @GetMapping("/dashboard/stats") public Object stats(){return ApiResponse.success(business.stats());}
    @GetMapping("/contracts") public Object contracts(@RequestParam(required = false) Long hubId){return ApiResponse.success(business.contracts(hubId));}
    @PostMapping("/contracts") public Object contract(@RequestBody JsonNode n){return ApiResponse.success(business.createContract(n,n.path("buyerId").asLong()));}
    @PatchMapping("/contracts/{id}/status") public Object transition(@PathVariable long id,@RequestBody JsonNode n){business.transition(id,n);return ApiResponse.success("Đã cập nhật hợp đồng",null);}
    @PostMapping("/contracts/{id}/approve-packaging") public Object approvePackaging(@PathVariable long id,@RequestBody(required = false) JsonNode n){business.approvePackaging(id,n);return ApiResponse.success("Đã duyệt quy cách đóng gói và sẵn sàng điều xe",null);}
    @PostMapping("/contracts/{id}/reject-packaging") public Object rejectPackaging(@PathVariable long id,@RequestBody(required = false) JsonNode n){business.rejectPackaging(id,n);return ApiResponse.success("Đã gửi yêu cầu làm lại biên bản thu hoạch/đóng gói tới Nhà vườn",null);}
    @PostMapping("/contracts/{id}/dispatch-pickup") public Object dispatchPickup(@PathVariable long id,@RequestBody JsonNode n){business.dispatchPickup(id,n);return ApiResponse.success("Đã điều phối xe lấy hàng tại vườn",null);}
    @PostMapping("/contracts/{id}/farm-handover") public Object farmHandover(@PathVariable long id,@RequestBody JsonNode n){business.farmHandover(id,n);return ApiResponse.success("Đã xác nhận lấy hàng tại vườn",null);}
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_MANAGER', 'WAREHOUSE_QC')")
    @PostMapping("/contracts/{id}/warehouse-inbound") public Object warehouseInbound(@PathVariable long id,@RequestBody JsonNode n){business.warehouseInbound(id,n);return ApiResponse.success("Đã nhập kho HoNa và kiểm định QC",null);}
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_MANAGER', 'WAREHOUSE_QC')")
    @PostMapping("/contracts/{id}/qc-reject") public Object qcReject(@PathVariable long id,@RequestBody JsonNode n){return ApiResponse.success("Đã ghi nhận lô hàng không đạt kiểm định QC",business.rejectQcLab(id,n));}
    @PostMapping("/contracts/{id}/qc-return-refund") public Object qcReturnRefund(@PathVariable long id,@RequestBody JsonNode n){return ApiResponse.success("Đã hoàn tất thủ tục hoàn hàng về Nhà vườn và hoàn cọc 30% cho Buyer",business.processQcReturnRefund(id,n));}
    @PostMapping("/contracts/{id}/outbound-dispatch") public Object outboundDispatch(@PathVariable long id,@RequestBody JsonNode n){business.outboundDispatch(id,n);return ApiResponse.success("Đã điều phối chuyến xe xuất kho",null);}
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_MANAGER', 'ACCOUNTANT')")
    @PostMapping("/contracts/{id}/settle") public Object settle(@PathVariable long id,@RequestBody JsonNode n){business.transition(id,n);return ApiResponse.success("Đã quyết toán và giải ngân hợp đồng",null);}
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_MANAGER', 'ACCOUNTANT')")
    @GetMapping("/contracts/{id}/settlement-quote") public Object quote(@PathVariable long id){return ApiResponse.success(business.settlementQuote(id));}
    @PostMapping("/contracts/{id}/resolve-dispute") public Object resolve(@PathVariable long id,@RequestBody JsonNode n){business.resolve(id,n);return ApiResponse.success("Đã xử lý tranh chấp",null);}
    @GetMapping("/claims") public Object claims(){return ApiResponse.success(business.claims());}
    @PostMapping("/claims") public Object claim(@RequestBody JsonNode n){return ApiResponse.success(business.claim(n));}
    @GetMapping("/cold-assets") public Object assets(){return ApiResponse.success(business.assets());}
    @PostMapping("/cold-assets") public Object asset(@RequestBody JsonNode n){return ApiResponse.success(business.createAsset(n));}
    @PatchMapping("/cold-assets/{id}/status") public Object assetStatus(@PathVariable long id,@RequestBody JsonNode n){business.assetStatus(id,n);return ApiResponse.success("Đã cập nhật tài sản",null);}
    @GetMapping("/hub-inspections") public Object inspections(){return ApiResponse.success(business.inspections());}
    @PostMapping("/hub-inspections") public Object inspect(@RequestBody JsonNode n){return ApiResponse.success(business.inspect(n));}
    @GetMapping("/shipments") public Object shipments(){return ApiResponse.success(business.shipments());}
    @PostMapping("/shipments") public Object schedule(@RequestBody JsonNode n){return ApiResponse.success(business.schedule(n));}
    @PostMapping("/shipments/{id}/epod") public Object epod(@PathVariable long id,@RequestBody JsonNode n){business.epod(id,n);return ApiResponse.success("Đã lưu ePOD",null);}
    @GetMapping("/iot/telemetry") public Object telemetry(@RequestParam long assetId){return ApiResponse.success(business.telemetry(assetId));}
    @GetMapping("/iot/alerts") public Object coldChainAlerts(){return ApiResponse.success(business.coldChainAlerts());}
    @PostMapping("/iot/alerts/{id}/acknowledge") public Object acknowledgeColdChainAlert(@PathVariable long id,@RequestBody(required=false) JsonNode n){business.acknowledgeColdChainAlert(id,n);return ApiResponse.success("Đã tiếp nhận cảnh báo chuỗi lạnh",null);}
    @PostMapping("/iot/alerts/{id}/resolve") public Object resolveColdChainAlert(@PathVariable long id,@RequestBody(required=false) JsonNode n){business.resolveColdChainAlert(id,n);return ApiResponse.success("Đã xác nhận khắc phục cảnh báo chuỗi lạnh",null);}
    @PostMapping("/iot/inject-fault") public Object fault(@RequestBody JsonNode n){return ApiResponse.success(business.inject(n,false));}
    @PostMapping("/iot/reset-fault") public Object reset(@RequestBody JsonNode n){return ApiResponse.success(business.inject(n,true));}
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_MANAGER', 'ACCOUNTANT')")
    @GetMapping("/settings") public Object settings(){return ApiResponse.success(business.settings());}
    @PreAuthorize("hasAnyRole('ADMIN', 'ACCOUNTANT')")
    @PutMapping("/settings") public Object settings(@RequestBody JsonNode n){business.updateSettings(n);return ApiResponse.success("Đã lưu cấu hình",null);}
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_MANAGER', 'ACCOUNTANT')")
    @GetMapping("/accounting/vas-reports") public Object reports(@RequestParam(required = false) Long hubId){return ApiResponse.success(business.reports(hubId));}
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_MANAGER', 'ACCOUNTANT')")
    @GetMapping("/accounting/cashflow-summary") public Object cashflowSummary(@RequestParam(required = false) Long hubId){return ApiResponse.success(business.cashflowSummary(hubId));}

    // Cookie-authenticated BFF forwards this stream; no token in URL or JavaScript.
    @GetMapping(value="/iot/events",produces="text/event-stream") public SseEmitter events(){
        var actor=AuthService.current();long version=actor.getTokenVersion();
        SseEmitter emitter=new SseEmitter(60_000L);
        ScheduledExecutorService timer=Executors.newSingleThreadScheduledExecutor(Thread.ofVirtual().factory());
        Runnable stop=timer::shutdownNow;emitter.onCompletion(stop);emitter.onTimeout(()->{stop.run();emitter.complete();});emitter.onError(e->stop.run());
        timer.scheduleAtFixedRate(()->{
            try {
                var u=users.findById(actor.getId()).orElseThrow();
                if(!u.isEnabled()||u.getTokenVersion()!=version){emitter.complete();stop.run();return;}
                emitter.send(SseEmitter.event().data(business.assets()));
            }catch(Exception e){emitter.completeWithError(e);stop.run();}
        },0,3,TimeUnit.SECONDS);
        return emitter;
    }
}
