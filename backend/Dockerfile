# =============================================================================
# Stage 1: Build Spring Boot JAR (Java 21 + Gradle)
# =============================================================================
FROM eclipse-temurin:21-jdk-alpine AS builder
WORKDIR /app

# Copy Gradle wrapper & build scripts first to leverage Docker layer cache
COPY gradlew .
COPY gradle gradle
COPY build.gradle settings.gradle ./
RUN chmod +x gradlew && ./gradlew dependencies --no-daemon || true

# Copy source code and build bootJar
COPY src src
RUN ./gradlew bootJar -x test --no-daemon

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
