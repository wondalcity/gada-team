# ── Stage 1: Build ────────────────────────────────────────────
FROM eclipse-temurin:21-jdk-alpine AS builder

WORKDIR /workspace

# Copy gradle wrapper + build files
COPY gradlew settings.gradle.kts build.gradle.kts ./
COPY gradle ./gradle
RUN chmod +x gradlew

# Download dependencies first (cached layer)
RUN ./gradlew dependencies --no-daemon -q || true

# Copy source
COPY src ./src

# Build JAR (skip tests)
RUN ./gradlew bootJar --no-daemon -x test

# ── Stage 2: Runtime ───────────────────────────────────────────
FROM eclipse-temurin:21-jre-alpine AS runtime

# Non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
WORKDIR /app

# Copy JAR from builder
COPY --from=builder /workspace/build/libs/*.jar app.jar

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget -qO- http://localhost:${SERVER_PORT:-8090}/actuator/health || exit 1

USER appuser

ENV SPRING_PROFILES_ACTIVE=prod
ENV SERVER_PORT=8090

EXPOSE 8090

ENTRYPOINT ["java", \
  "-XX:+UseContainerSupport", \
  "-XX:MaxRAMPercentage=75.0", \
  "-Djava.security.egd=file:/dev/./urandom", \
  "-jar", "app.jar"]
