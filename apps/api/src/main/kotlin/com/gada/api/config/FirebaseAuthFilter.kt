package com.gada.api.config

import com.google.firebase.FirebaseApp
import com.google.firebase.auth.FirebaseAuth
import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.slf4j.LoggerFactory
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.stereotype.Component
import org.springframework.web.filter.OncePerRequestFilter

/**
 * Validates Firebase ID tokens from the Authorization header.
 * On success, stores a GadaPrincipal in the SecurityContext so downstream
 * controllers can use @CurrentUser to access the authenticated user's data.
 */
@Component
class FirebaseAuthFilter(
    private val firebaseApp: FirebaseApp,
) : OncePerRequestFilter() {

    private val log = LoggerFactory.getLogger(FirebaseAuthFilter::class.java)

    override fun doFilterInternal(
        request: HttpServletRequest,
        response: HttpServletResponse,
        chain: FilterChain,
    ) {
        val token = extractToken(request)
        if (token != null) {
            try {
                val decoded = FirebaseAuth.getInstance(firebaseApp).verifyIdToken(token)
                val uid = decoded.uid
                val phone = decoded.claims["phone_number"] as? String ?: ""
                val userId = decoded.claims["userId"]?.toString()?.toLongOrNull()
                val role = decoded.claims["role"]?.toString()

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
            } catch (e: Exception) {
                log.debug("Firebase token verification failed: {}", e.message)
                // Don't set auth — let Spring Security handle the 401
            }
        }
        chain.doFilter(request, response)
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
