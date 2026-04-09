package com.gada.api.domain.user

/**
 * Sub-role for ADMIN users.
 * Controls which sections of the admin console an admin can access.
 */
enum class AdminRole {
    SUPER_ADMIN,      // Full access — can do everything
    OPERATIONS_ADMIN, // Workers, teams, companies, jobs, applications, contracts
    CONTENT_ADMIN,    // Content (intro, FAQs, categories), notifications, SMS templates
    SETTLEMENT_ADMIN, // Contracts, financial data, pay records
}
