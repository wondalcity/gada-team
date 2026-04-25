package com.gada.api.config

import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
import com.google.firebase.FirebaseApp
import com.google.firebase.auth.FirebaseAuth
import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.stereotype.Component
import org.springframework.web.filter.OncePerRequestFilter
import java.util.Base64

/**
 * Validates Bearer tokens from the Authorization header.
 * Tries our own JWT first (issued on password login/register), then falls back
 * to Firebase ID token verification (OTP-based auth).
 *
 * In local dev (dev.auth.bypass=true), Firebase signature verification is skipped.
 */
@Component
class FirebaseAuthFilter(
    private val firebaseApp: FirebaseApp,
    private val jwtService: JwtService,
) : OncePerRequestFilter() {

    private val log = LoggerFactory.getLogger(FirebaseAuthFilter::class.java)
    private val jsonMapper = jacksonObjectMapper()

    @Value("\${dev.auth.bypass:false}")
    private var devAuthBypass: Boolean = false

    override fun doFilterInternal(
        request: HttpServletRequest,
        response: HttpServletResponse,
        chain: FilterChain,
    ) {
        val token = extractToken(request)
        if (token != null) {
            // 1. Try our own JWT first (password-based auth)
            val ourClaims = jwtService.parseToken(token)
            if (ourClaims != null) {
                val principal = GadaPrincipal(
                    firebaseUid = "",
                    phone = ourClaims.phone,
                    userId = ourClaims.userId,
                    role = ourClaims.role,
                )
                val authorities = ourClaims.role?.let { listOf(SimpleGrantedAuthority("ROLE_$it")) } ?: emptyList()
                SecurityContextHolder.getContext().authentication =
                    UsernamePasswordAuthenticationToken(principal, null, authorities)
                chain.doFilter(request, response)
                return
            }

            // 2. Fall back to Firebase ID token (OTP-based auth)
            try {
                val uid: String
                val phone: String
                val userId: Long?
                val role: String?

                if (devAuthBypass) {
                    val claims = decodeJwtPayload(token)
                    uid = claims["sub"] as? String ?: ""
                    phone = claims["phone_number"] as? String ?: ""
                    userId = claims["userId"]?.toString()?.toLongOrNull()
                    role = claims["role"]?.toString()
                } else {
                    val decoded = FirebaseAuth.getInstance(firebaseApp).verifyIdToken(token)
                    uid = decoded.uid
                    phone = decoded.claims["phone_number"] as? String ?: ""
                    userId = decoded.claims["userId"]?.toString()?.toLongOrNull()
                    role = decoded.claims["role"]?.toString()
                }

                if (uid.isNotBlank()) {
                    val principal = GadaPrincipal(
                        firebaseUid = uid,
                        phone = phone,
                        userId = userId,
                        role = role,
                    )
                    val authorities = if (role != null) {
                        listOf(SimpleGrantedAuthority("ROLE_$role"))
                    } else {
                        emptyList()
                    }
                    val auth = UsernamePasswordAuthenticationToken(principal, null, authorities)
                    SecurityContextHolder.getContext().authentication = auth
                }
            } catch (e: Exception) {
                log.debug("Firebase token verification failed: {}", e.message)
            }
        }
        chain.doFilter(request, response)
    }

    private fun decodeJwtPayload(token: String): Map<String, Any?> {
        val parts = token.split(".")
        if (parts.size < 2) return emptyMap()
        val padded = parts[1].padEnd((parts[1].length + 3) / 4 * 4, '=')
        val payload = Base64.getUrlDecoder().decode(padded)
        return jsonMapper.readValue(payload)
    }

    private fun extractToken(request: HttpServletRequest): String? {
        val header = request.getHeader("Authorization") ?: return null
        if (!header.startsWith("Bearer ")) return null
        val token = header.removePrefix("Bearer ").trim()
        return token.ifBlank { null }
    }
}

/**
 * Represents the authenticated Firebase user extracted from the ID token.
 * [userId] is null until the user has called /auth/login and been persisted.
 */
data class GadaPrincipal(
    val firebaseUid: String,
    val phone: String,
    val userId: Long?,
    val role: String?,
)
