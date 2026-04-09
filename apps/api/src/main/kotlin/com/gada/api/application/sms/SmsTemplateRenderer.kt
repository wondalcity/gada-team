package com.gada.api.application.sms

import org.springframework.stereotype.Component

/**
 * Simple {{variable}} template renderer.
 * No dependency on any templating engine — keeps it fast and dependency-free.
 */
@Component
class SmsTemplateRenderer {

    fun render(template: String, variables: Map<String, String>): String {
        var result = template
        variables.forEach { (key, value) ->
            result = result.replace("{{$key}}", value)
        }
        return result
    }

    /**
     * Returns list of variable names found in a template string.
     * Used for admin preview validation.
     */
    fun extractVariables(template: String): List<String> {
        val regex = Regex("\\{\\{(\\w+)\\}\\}")
        return regex.findAll(template).map { it.groupValues[1] }.distinct().toList()
    }
}
