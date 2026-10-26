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

@RestController @RequestMapping("/admin") @RequiredArgsConstructor @PreAuthorize("hasRole('ADMIN')")
public class AdminBusinessController {
    private final AdminBusinessService business;
    private final UserRepository users;
    @GetMapping("/dashboard/stats") public Object stats(){return ApiResponse.success(business.stats());}
    @GetMapping("/contracts") public Object contracts(){return ApiResponse.success(business.contracts());}
    @PostMapping("/contracts") public Object contract(@RequestBody JsonNode n){return ApiResponse.success(business.createContract(n,n.path("buyerId").asLong()));}
    @PatchMapping("/contracts/{id}/status") public Object transition(@PathVariable long id,@RequestBody JsonNode n){business.transition(id,n);return ApiResponse.success("Đã cập nhật hợp đồng",null);}
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
    @PostMapping("/iot/inject-fault") public Object fault(@RequestBody JsonNode n){return ApiResponse.success(business.inject(n,false));}
    @PostMapping("/iot/reset-fault") public Object reset(@RequestBody JsonNode n){return ApiResponse.success(business.inject(n,true));}
    @GetMapping("/settings") public Object settings(){return ApiResponse.success(business.settings());}
    @PutMapping("/settings") public Object settings(@RequestBody JsonNode n){business.updateSettings(n);return ApiResponse.success("Đã lưu cấu hình",null);}
    @GetMapping("/accounting/vas-reports") public Object reports(){return ApiResponse.success(business.reports());}

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
