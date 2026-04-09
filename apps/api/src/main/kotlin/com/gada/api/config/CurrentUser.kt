package com.gada.api.config

import org.springframework.security.core.annotation.AuthenticationPrincipal

/**
 * Convenience annotation to inject the authenticated [GadaPrincipal] into
 * controller method parameters.
 *
 * Usage:
 *   fun getProfile(@CurrentUser principal: GadaPrincipal): ...
 */
@Target(AnnotationTarget.VALUE_PARAMETER)
@Retention(AnnotationRetention.RUNTIME)
@AuthenticationPrincipal
annotation class CurrentUser
