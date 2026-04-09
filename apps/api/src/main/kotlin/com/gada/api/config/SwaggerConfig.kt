package com.gada.api.config

import io.swagger.v3.oas.models.Components
import io.swagger.v3.oas.models.OpenAPI
import io.swagger.v3.oas.models.info.Contact
import io.swagger.v3.oas.models.info.Info
import io.swagger.v3.oas.models.info.License
import io.swagger.v3.oas.models.security.SecurityRequirement
import io.swagger.v3.oas.models.security.SecurityScheme
import io.swagger.v3.oas.models.servers.Server
import org.springframework.beans.factory.annotation.Value
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration

@Configuration
class SwaggerConfig {

    @Value("\${server.port:8080}")
    private val serverPort: String = "8080"

    @Bean
    fun openAPI(): OpenAPI = OpenAPI()
        .info(
            Info()
                .title("GADA Hiring Platform API")
                .description(
                    """
                    건설 현장 구인구직 플랫폼 GADA REST API

                    ## Auth
                    Firebase Phone Auth를 통해 발급된 ID Token을 Bearer 토큰으로 사용합니다.

                    ## Entities
                    - **Company** → **Site** → **Job** 계층 구조
                    - Workers / Teams / Employers / Admins
                    """.trimIndent()
                )
                .version("v0.1.0")
                .contact(Contact().name("GADA Dev Team").email("dev@gada.kr").url("https://gada.kr"))
                .license(License().name("Private — All Rights Reserved"))
        )
        .addServersItem(Server().url("http://localhost:$serverPort").description("Local"))
        .components(
            Components()
                .addSecuritySchemes(
                    "BearerAuth",
                    SecurityScheme()
                        .type(SecurityScheme.Type.HTTP)
                        .scheme("bearer")
                        .bearerFormat("Firebase JWT")
                        .description("Firebase ID Token. 형식: `Authorization: Bearer <token>`"),
                )
        )
        .addSecurityItem(SecurityRequirement().addList("BearerAuth"))
}
