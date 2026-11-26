# =============================================================================
# Stage 1: Build Spring Boot JAR (Gradle 8.10.2 + Java 21)
# =============================================================================
FROM gradle:8.10.2-jdk21-alpine AS builder
WORKDIR /app

COPY build.gradle settings.gradle ./
RUN gradle dependencies --no-daemon || true

COPY src src
RUN gradle bootJar -x test --no-daemon

# =============================================================================
# Stage 2: Lightweight Production Runtime (JRE 21 Alpine, non-root user)
# =============================================================================
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

RUN addgroup -S spring && adduser -S spring -G spring && \
    apk add --no-cache wget tzdata

ENV TZ=Asia/Ho_Chi_Minh

COPY --from=builder /app/build/libs/*.jar app.jar
RUN chown spring:spring app.jar

USER spring:spring
EXPOSE 8080

ENTRYPOINT ["java", "-Djava.security.egd=file:/dev/./urandom", "-jar", "app.jar"]
