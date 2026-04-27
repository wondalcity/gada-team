package com.gada.api.infrastructure.persistence.bookmark

import com.gada.api.domain.bookmark.AdminFavorite
import com.gada.api.domain.bookmark.AdminFavoriteTarget
import com.gada.api.domain.bookmark.JobBookmark
import jakarta.persistence.EntityManager
import org.springframework.stereotype.Repository

@Repository
class BookmarkRepository(private val em: EntityManager) {

    // ── Job Bookmarks (Worker) ────────────────────────────────────────────────

    fun findJobBookmark(userId: Long, jobId: Long): JobBookmark? =
        em.createQuery(
            "SELECT b FROM JobBookmark b WHERE b.user.id = :uid AND b.job.id = :jid",
            JobBookmark::class.java
        ).setParameter("uid", userId).setParameter("jid", jobId).resultList.firstOrNull()

    fun findJobBookmarksByUser(userId: Long, page: Int, size: Int): Pair<List<JobBookmark>, Long> {
        val total = em.createQuery(
            "SELECT COUNT(b) FROM JobBookmark b WHERE b.user.id = :uid", Long::class.java
        ).setParameter("uid", userId).singleResult

        val content = em.createQuery(
            "SELECT b FROM JobBookmark b JOIN FETCH b.job j LEFT JOIN FETCH j.site s LEFT JOIN FETCH s.company WHERE b.user.id = :uid ORDER BY b.createdAt DESC",
            JobBookmark::class.java
        ).setParameter("uid", userId)
            .setFirstResult(page * size)
            .setMaxResults(size)
            .resultList

        return Pair(content, total)
    }

    fun saveBookmark(bookmark: JobBookmark): JobBookmark {
        em.persist(bookmark)
        return bookmark
    }

    fun deleteBookmark(bookmark: JobBookmark) {
        em.remove(if (em.contains(bookmark)) bookmark else em.merge(bookmark))
    }

    fun existsBookmark(userId: Long, jobId: Long): Boolean =
        findJobBookmark(userId, jobId) != null

    fun countBookmarksByJob(jobId: Long): Long =
        em.createQuery(
            "SELECT COUNT(b) FROM JobBookmark b WHERE b.job.id = :jid", Long::class.java
        ).setParameter("jid", jobId).singleResult

    // ── Admin Favorites ───────────────────────────────────────────────────────

    fun findAdminFavorite(adminId: Long, workerId: Long?, teamId: Long?): AdminFavorite? {
        val jpql = if (workerId != null)
            "SELECT f FROM AdminFavorite f WHERE f.admin.id = :aid AND f.targetWorker.id = :tid"
        else
            "SELECT f FROM AdminFavorite f WHERE f.admin.id = :aid AND f.targetTeam.id = :tid"
        return em.createQuery(jpql, AdminFavorite::class.java)
            .setParameter("aid", adminId)
            .setParameter("tid", workerId ?: teamId)
            .resultList.firstOrNull()
    }

    fun findAdminFavorites(
        adminId: Long,
        targetType: AdminFavoriteTarget?,
        page: Int,
        size: Int,
    ): Pair<List<AdminFavorite>, Long> {
        val typePred = if (targetType != null) " AND f.targetType = :ttype" else ""

        val total = em.createQuery(
            "SELECT COUNT(f) FROM AdminFavorite f WHERE f.admin.id = :aid$typePred", Long::class.java
        ).also { q ->
            q.setParameter("aid", adminId)
            if (targetType != null) q.setParameter("ttype", targetType)
        }.singleResult

        val content = em.createQuery(
            "SELECT f FROM AdminFavorite f LEFT JOIN FETCH f.targetWorker LEFT JOIN FETCH f.targetTeam" +
                    " WHERE f.admin.id = :aid$typePred ORDER BY f.createdAt DESC",
            AdminFavorite::class.java
        ).also { q ->
            q.setParameter("aid", adminId)
            if (targetType != null) q.setParameter("ttype", targetType)
        }.setFirstResult(page * size).setMaxResults(size).resultList

        return Pair(content, total)
    }

    fun getFavoritedWorkerIds(adminId: Long): Set<Long> =
        em.createQuery(
            "SELECT f.targetWorker.id FROM AdminFavorite f WHERE f.admin.id = :aid AND f.targetType = com.gada.api.domain.bookmark.AdminFavoriteTarget.WORKER AND f.targetWorker IS NOT NULL",
            Long::class.java
        ).setParameter("aid", adminId).resultList.toSet()

    fun getFavoritedTeamIds(adminId: Long): Set<Long> =
        em.createQuery(
            "SELECT f.targetTeam.id FROM AdminFavorite f WHERE f.admin.id = :aid AND f.targetType = com.gada.api.domain.bookmark.AdminFavoriteTarget.TEAM AND f.targetTeam IS NOT NULL",
            Long::class.java
        ).setParameter("aid", adminId).resultList.toSet()

    fun saveFavorite(favorite: AdminFavorite): AdminFavorite {
        em.persist(favorite)
        return favorite
    }

    fun deleteFavorite(favorite: AdminFavorite) {
        em.remove(if (em.contains(favorite)) favorite else em.merge(favorite))
    }
}
