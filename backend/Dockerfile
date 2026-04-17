FROM maven:3.9-eclipse-temurin-21-alpine AS deps
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline -B

FROM maven:3.9-eclipse-temurin-21-alpine AS build
WORKDIR /app
COPY --from=deps /root/.m2 /root/.m2
COPY pom.xml .
COPY src ./src
RUN mvn clean package -DskipTests -B

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
RUN addgroup -S app && adduser -S app -G app
COPY --from=build /app/target/*.jar app.jar
RUN chown app:app app.jar
USER app
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget -qO- http://localhost:8080/api/actuator/health || exit 1
ENTRYPOINT ["java", "-jar", "app.jar"]
