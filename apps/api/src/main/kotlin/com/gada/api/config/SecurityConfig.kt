package com.gada.api.config

import org.springframework.boot.web.servlet.FilterRegistrationBean
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.http.HttpStatus
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity
import org.springframework.security.config.http.SessionCreationPolicy
import org.springframework.security.web.SecurityFilterChain
import org.springframework.security.web.authentication.HttpStatusEntryPoint
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter
import org.springframework.web.cors.CorsConfiguration
import org.springframework.web.cors.CorsConfigurationSource
import org.springframework.web.cors.UrlBasedCorsConfigurationSource

@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
class SecurityConfig(
    private val firebaseAuthFilter: FirebaseAuthFilter,
) {

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private var devAuthFilter: DevAuthFilter? = null

    companion object {
        val PUBLIC_PATHS = arrayOf(
            "/api/v1/auth/**",
            "/api/v1/health/**",
            "/api/v1/jobs",
            "/api/v1/jobs/*",
            "/api/v1/categories",
            "/api/v1/categories/**",
            "/api/v1/companies/*/public",
            "/api/v1/companies/*/jobs",
            "/api/v1/teams",
            "/api/v1/teams/*",
            "/api/v1/workers",
            "/api/v1/workers/*",
            "/actuator/health",
            "/v3/api-docs/**",
            "/swagger-ui/**",
            "/swagger-ui.html",
        )
    }

    @Bean
    fun securityFilterChain(http: HttpSecurity): SecurityFilterChain {
        http
            .csrf { it.disable() }
            .cors { it.configurationSource(corsConfigurationSource()) }
            .sessionManagement { it.sessionCreationPolicy(SessionCreationPolicy.STATELESS) }
            .exceptionHandling {
                it.authenticationEntryPoint(HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED))
            }
            .authorizeHttpRequests { auth ->
                auth
                    .requestMatchers(*PUBLIC_PATHS).permitAll()
                    .anyRequest().authenticated()
            }
            .addFilterBefore(firebaseAuthFilter, UsernamePasswordAuthenticationFilter::class.java)
            .also { if (devAuthFilter != null) it.addFilterBefore(devAuthFilter, firebaseAuthFilter::class.java) }

        return http.build()
    }

    /** Prevent DevAuthFilter from double-registering as a servlet filter; it only runs inside Spring Security's chain. */
    @Bean
    @org.springframework.boot.autoconfigure.condition.ConditionalOnBean(DevAuthFilter::class)
    fun devAuthFilterRegistration(filter: DevAuthFilter): FilterRegistrationBean<DevAuthFilter> {
        val reg = FilterRegistrationBean(filter)
        reg.isEnabled = false
        return reg
    }

    @Bean
    fun corsConfigurationSource(): CorsConfigurationSource {
        val config = CorsConfiguration()
        config.allowedOriginPatterns = listOf(
            "http://localhost:*",
            "https://*.gada.kr",
            "https://gada.kr",
        )
        config.allowedMethods = listOf("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
        config.allowedHeaders = listOf("*")
        config.allowCredentials = true
        config.maxAge = 3600L

        val source = UrlBasedCorsConfigurationSource()
        source.registerCorsConfiguration("/api/**", config)
        return source
    }
}
