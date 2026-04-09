package com.gada.api.common

import kotlin.math.*

object GeoUtils {

    private const val EARTH_RADIUS_KM = 6371.0

    /**
     * Haversine formula — returns distance in km between two lat/lng points.
     */
    fun haversineKm(lat1: Double, lon1: Double, lat2: Double, lon2: Double): Double {
        val dLat = toRadians(lat2 - lat1)
        val dLon = toRadians(lon2 - lon1)
        val a = sin(dLat / 2).pow(2) +
                cos(toRadians(lat1)) * cos(toRadians(lat2)) * sin(dLon / 2).pow(2)
        return 2 * EARTH_RADIUS_KM * asin(sqrt(a))
    }

    /**
     * Returns a lat/lng bounding box for a circle of [radiusKm] around [lat],[lon].
     * Use this for SQL pre-filtering before exact Haversine.
     */
    fun boundingBox(lat: Double, lon: Double, radiusKm: Double): BoundingBox {
        val latDelta = radiusKm / 111.0
        val lngDelta = radiusKm / (111.0 * cos(toRadians(lat)))
        return BoundingBox(
            minLat = lat - latDelta,
            maxLat = lat + latDelta,
            minLng = lon - lngDelta,
            maxLng = lon + lngDelta,
        )
    }

    private fun toRadians(deg: Double) = deg * PI / 180.0

    data class BoundingBox(
        val minLat: Double, val maxLat: Double,
        val minLng: Double, val maxLng: Double,
    )
}
