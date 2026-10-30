package com.btl.webbanrau;

import com.btl.webbanrau.model.*;
import com.btl.webbanrau.repository.*;
import com.btl.webbanrau.service.*;
import com.fasterxml.jackson.databind.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.*;
import org.springframework.test.web.servlet.*;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.*;
import org.testcontainers.utility.DockerImageName;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import java.util.concurrent.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;

@SpringBootTest(properties={"app.jwt.secret=test-secret-with-more-than-thirty-two-bytes", "spring.jpa.hibernate.ddl-auto=validate", "spring.jpa.show-sql=false"})
@ActiveProfiles("test") @AutoConfigureMockMvc @Testcontainers
class AuthAdminIntegrationTest {
    @Container static PostgreSQLContainer<?> postgres=new PostgreSQLContainer<>(DockerImageName.parse("pgvector/pgvector:pg16").asCompatibleSubstituteFor("postgres"));
    @DynamicPropertySource static void properties(DynamicPropertyRegistry r){r.add("spring.datasource.url",postgres::getJdbcUrl);r.add("spring.datasource.username",postgres::getUsername);r.add("spring.datasource.password",postgres::getPassword);}
    @Autowired MockMvc mvc; @Autowired ObjectMapper json; @Autowired UserRepository users; @Autowired RoleRepository roles; @Autowired PasswordEncoder encoder; @Autowired TokenService tokens; @Autowired JdbcTemplate db;
    @MockBean MailService mail;
    Map<String,String> codes=new ConcurrentHashMap<>();
    @BeforeEach void resetDatabase(){
        db.execute("truncate table users,roles restart identity cascade");
        db.update("update platform_settings set platform_fee_rate=3,deposit_rate=30,temp_min=2,temp_max=6,service_vat_rate=10 where id=1");
        for(String role:List.of("ADMIN","FARMER","BUYER","WAREHOUSE_QC","DRIVER","ACCOUNTANT"))roles.save(new Role("ROLE_"+role,role));
        reset(mail);codes.clear();doAnswer(inv->{codes.put(inv.getArgument(0),inv.getArgument(1));return null;}).when(mail).otp(anyString(),anyString());
    }
    private User user(String name,String role){return users.save(User.builder().username(name).fullName(name).email(name+"@example.com").password(encoder.encode("Password12345!"))
        .emailVerified(true).companyName(name+" Farm").phone("0912345678").address("Da Lat").taxCode("5801234567").bankName("Bank").bankAccountNo("12345").warehouseAddress("HCM").kycStatus("VERIFIED").roles(new HashSet<>(Set.of(roles.findByName("ROLE_"+role).orElseThrow()))).build());}
    private String token(User u){return tokens.issue(u,false,null,null).getAccessToken();}
    private JsonNode call(MockHttpServletRequestBuilder req,String bearer,Object body,int status)throws Exception{
        req.contentType("application/json").with(r->{r.setRemoteAddr("test-"+UUID.randomUUID());return r;});if(bearer!=null)req.header("Authorization","Bearer "+bearer);if(body!=null)req.content(json.writeValueAsBytes(body));
        var response=mvc.perform(req).andReturn().getResponse();assertEquals(status,response.getStatus(),response.getContentAsString());return json.readTree(response.getContentAsString());
    }
    private Map<String,Object> registration(String name){return Map.ofEntries(Map.entry("username",name),Map.entry("password","Password12345!"),Map.entry("email",name+"@example.com"),Map.entry("fullName","Farmer"),Map.entry("phone","0912345678"),Map.entry("address","Da Lat"),Map.entry("registerRole","FARMER"),Map.entry("companyName","Farm"),Map.entry("isHouseholdFarmer",true),Map.entry("bankName","Bank"),Map.entry("bankAccountNo","12345"));}
    @Test void registrationRequiresOtpAndRejectsPrivilegeEscalation()throws Exception{
        var body=new HashMap<>(registration("farmer"));body.put("registerRole","ADMIN");call(post("/auth/register"),null,body,400);
        var response=call(post("/auth/register"),null,registration("farmer"),200);assertTrue(response.path("result").path("requireOtp").asBoolean());assertFalse(response.path("result").has("accessToken"));
        var u=users.findByUsername("farmer").orElseThrow();assertFalse(u.isEmailVerified());assertTrue(encoder.matches("Password12345!",u.getPassword()));
        var login=call(post("/auth/login"),null,Map.of("username","farmer","password","Password12345!"),200);assertTrue(login.path("result").path("requireOtp").asBoolean());
        var verified=call(post("/auth/verify-register-otp"),null,Map.of("email",u.getEmail(),"otp",codes.get(u.getEmail())),200).path("result");
        assertTrue(verified.path("accessToken").asText().split("\\.").length==3);assertEquals("PENDING",verified.path("kycStatus").asText());
        call(get("/auth/me"),verified.path("accessToken").asText(),null,200);
        call(post("/auth/verify-register-otp"),null,Map.of("email",u.getEmail(),"otp",codes.get(u.getEmail())),400);
    }
    @Test void otpLimitsPersistAfterFailuresAndExpiryIsEnforced()throws Exception{
        call(post("/auth/register"),null,registration("limited"),200);
        call(post("/auth/resend-otp"),null,Map.of("email","limited@example.com","type","REGISTER_VERIFICATION"),429);
        String correct=codes.get("limited@example.com"), wrong=correct.equals("000000")?"111111":"000000";
        for(int i=0;i<5;i++)call(post("/auth/verify-register-otp"),null,Map.of("email","limited@example.com","otp",wrong),400);
        assertEquals(5,db.queryForObject("select attempts from email_otp_verifications where email='limited@example.com'",Integer.class));
        call(post("/auth/verify-register-otp"),null,Map.of("email","limited@example.com","otp",correct),400);
        db.update("update email_otp_verifications set attempts=0,used=false,expires_at=CURRENT_TIMESTAMP-interval '1 minute' where email='limited@example.com'");
        call(post("/auth/verify-register-otp"),null,Map.of("email","limited@example.com","otp",correct),400);
    }
    @Test void refreshRotationReplayAndDisabledAccounts()throws Exception{
        User u=user("buyer","BUYER");var issued=tokens.issue(u,false,null,null);String refresh=issued.getRefreshToken();
        assertNotEquals(refresh,db.queryForObject("select token_hash from refresh_tokens where user_id=?",String.class,u.getId()));
        var rotated=call(post("/auth/refresh-token"),null,Map.of("refreshToken",refresh),200).path("result");
        call(post("/auth/refresh-token"),null,Map.of("refreshToken",refresh),401);
        call(post("/auth/refresh-token"),null,Map.of("refreshToken",rotated.path("refreshToken").asText()),401);
        call(get("/auth/me"),rotated.path("accessToken").asText(),null,401);
        u=users.findById(u.getId()).orElseThrow();String access=token(u);u.setEnabled(false);users.save(u);call(get("/auth/me"),access,null,401);
    }
    @Test void securityMatrixAndOtpPurposeIsolation()throws Exception{
        call(get("/admin/users"),null,null,401);call(get("/harvest-lots"),null,null,200);
        for(String role:List.of("FARMER","BUYER","WAREHOUSE_QC","DRIVER","ACCOUNTANT"))call(get("/admin/users"),token(user(role.toLowerCase(),role)),null,403);
        var admin=user("admin","ADMIN");call(get("/admin/users"),token(admin),null,200);
        var buyer=users.findByUsername("buyer").orElseThrow();call(post("/auth/gmail-otp/request"),null,Map.of("email",buyer.getEmail()),200);
        call(post("/auth/verify-register-otp"),null,Map.of("email",buyer.getEmail(),"otp",codes.get(buyer.getEmail())),400);
        call(post("/auth/gmail-otp/verify"),null,Map.of("email",buyer.getEmail(),"otp",codes.get(buyer.getEmail())),200);
        call(get("/harvest-lots/my-lots"),token(buyer),null,403);
        call(post("/ai/config-key"),token(buyer),Map.of("apiKey","test"),403);
    }
    @Test void staffInvitationKycAndSessionRevocation()throws Exception{
        String admin=token(user("admin","ADMIN"));
        var staff=call(post("/admin/users/provision"),admin,Map.of("username","driver","fullName","Driver","email","driver@example.com","role","DRIVER"),200).path("result");assertFalse(staff.path("emailVerified").asBoolean());
        call(post("/auth/activate-staff"),null,Map.of("email","driver@example.com","otp",codes.get("driver@example.com"),"password","DriverPassword123!"),200);
        var driver=users.findByUsername("driver").orElseThrow();assertTrue(driver.isEmailVerified());String access=token(driver);
        call(patch("/admin/users/"+driver.getId()+"/toggle-status"),admin,Map.of(),200);call(get("/auth/me"),access,null,401);
        var buyer=user("buyer","BUYER");buyer.setKycStatus("PENDING");users.save(buyer);
        call(patch("/admin/users/"+buyer.getId()+"/kyc-status"),admin,Map.of("status","REJECTED","note",""),400);
        call(patch("/admin/users/"+buyer.getId()+"/kyc-status"),admin,Map.of("status","VERIFIED","note","Checked"),200);
        assertEquals("VERIFIED",users.findById(buyer.getId()).orElseThrow().getKycStatus());
    }
    private long lot(String admin,Long farmer)throws Exception{
        Map<String,Object> request=new HashMap<>(Map.of("farmerId",farmer,"productName","Tomato","category","Vegetables","pucCode","VN-TEST","certification","VietGAP","harvestDate",LocalDate.now().toString(),"expiryDate",LocalDate.now().plusDays(7).toString(),"totalWeightKg",2000,"basePricePerKg",15000,"tierPricing",List.of(Map.of("minKg",500,"price",15000))));request.put("tempMin",2);request.put("tempMax",6);
        var lotRes=call(post("/admin/harvest-lots"),admin,request,200).path("result");
        long id=lotRes.isObject()?lotRes.path("id").asLong():lotRes.asLong();
        call(patch("/admin/harvest-lots/"+id+"/status"),admin,Map.of("status","OPEN","note","Checked"),200);return id;
    }
    @Test void completeContractQcShipmentEpodSettlementAndBalancedLedger()throws Exception{
        String admin=token(user("admin","ADMIN"));User farmer=user("farmer","FARMER"),buyer=user("buyer","BUYER"),driver=user("driver","DRIVER");long lot=lot(admin,farmer.getId());
        long contract=call(post("/admin/contracts"),admin,Map.of("lotId",lot,"buyerId",buyer.getId(),"weightKg",2000,"pricePerKg",15000,"logisticsFee",100000,"deliveryAddress","HCM"),200).path("result").asLong();
        call(patch("/admin/contracts/"+contract+"/status"),admin,Map.of("status","SETTLED"),400);
        call(patch("/admin/contracts/"+contract+"/status"),admin,Map.of("status","AGREED"),200);
        assertEquals(0,db.queryForObject("select available_weight_kg from harvest_lots where id=?",BigDecimal.class,lot).signum());
        call(patch("/admin/contracts/"+contract+"/status"),admin,Map.of("status","DEPOSIT_PAID","reference","DEP-1","amount",9000000),200);
        call(patch("/admin/contracts/"+contract+"/status"),admin,Map.of("status","DEPOSIT_PAID","reference","DEP-1","amount",9000000),400);
        long room=call(post("/admin/cold-assets"),admin,Map.of("assetCode","ROOM1","assetName","Room","assetType","COLD_ROOM","capacityKg",10000),200).path("result").asLong();
        long truck=call(post("/admin/cold-assets"),admin,Map.of("assetCode","TRUCK1","assetName","Truck","assetType","REFRIGERATED_TRUCK","capacityKg",5000,"driverId",driver.getId()),200).path("result").asLong();
        call(post("/admin/hub-inspections"),admin,Map.of("contractId",contract,"coldRoomId",room,"receivedWeightKg",2000,"qualifiedWeightKg",2000,"brix",8,"moisture",85,"note","Good"),200);
        long shipment=call(post("/admin/shipments"),admin,Map.of("contractId",contract,"truckId",truck,"driverId",driver.getId()),200).path("result").asLong();
        call(patch("/admin/contracts/"+contract+"/status"),admin,Map.of("status","IN_TRANSIT"),200);
        var receipt=Map.of("deliveredWeightKg",2000,"damagedWeightKg",0,"signatureName","Buyer","photoUrl","https://example.com/photo.jpg","signatureData","data:image/png;base64,iVBORw0KGgo=");
        call(post("/buyer/shipments/"+shipment+"/epod"),token(user("outsider","BUYER")),receipt,403);
        call(post("/buyer/shipments/"+shipment+"/epod"),token(buyer),receipt,200);
        call(patch("/admin/contracts/"+contract+"/status"),admin,Map.of("status","DELIVERED","reference","BAL-1","amount",21000000),200);
        var quote=call(get("/admin/contracts/"+contract+"/settlement-quote"),admin,null,200).path("result");assertEquals(0,new BigDecimal("28900000").compareTo(quote.path("payout").decimalValue()));
        call(patch("/admin/contracts/"+contract+"/status"),admin,Map.of("status","SETTLED","reference","PAY-1","amount",28900000),200);
        assertEquals("SETTLED",db.queryForObject("select status from b2b_contracts where id=?",String.class,contract));
        assertEquals(0,db.queryForObject("select count(*) from (select entry_id from gl_journal_lines group by entry_id having sum(debit)<>sum(credit)) t",Integer.class));
        assertEquals(0,db.queryForObject("select sum(credit-debit) from gl_journal_lines where account='3388'",BigDecimal.class).signum());
        call(get("/admin/accounting/vas-reports"),admin,null,200);
        call(post("/admin/iot/inject-fault"),admin,Map.of("assetId",truck,"mode","TEMP_SPIKE"),200);assertEquals("TEMP_WARNING",db.queryForObject("select status from cold_assets where id=?",String.class,truck));
        call(post("/admin/iot/reset-fault"),admin,Map.of("assetId",truck),200);assertEquals(0,new BigDecimal("4").compareTo(db.queryForObject("select current_temp from cold_assets where id=?",BigDecimal.class,truck)));
    }
    @Test void parallelOtpVerificationOnlyOneSucceeds()throws Exception{
        call(post("/auth/register"),null,registration("parallel"),200);String code=codes.get("parallel@example.com");
        try(var executor=Executors.newVirtualThreadPerTaskExecutor()){
            var tasks=new ArrayList<Future<Integer>>();for(int i=0;i<2;i++)tasks.add(executor.submit(()->mvc.perform(post("/auth/verify-register-otp").contentType("application/json").content(json.writeValueAsBytes(Map.of("email","parallel@example.com","otp",code)))).andReturn().getResponse().getStatus()));
            List<Integer> statuses=new ArrayList<>();for(var task:tasks)statuses.add(task.get());Collections.sort(statuses);assertEquals(List.of(200,400),statuses);
        }
    }
}
