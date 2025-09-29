const express = require('express');
const router = express.Router();
// services/routeService.js
const geolib = require('geolib');
const axios = require('axios');

class RouteService {
    
    // คำนวณเส้นทางที่เหมาะสมโดยใช้ Nearest Neighbor Algorithm
    async calculateOptimalRoute(requests, startPoint) {
        try {
            const waypoints = requests.map(request => ({
                requestId: request._id,
                coordinates: {
                    lat: request.coordinates.lat,
                    lng: request.coordinates.lng
                },
                address: request.address,
                requestDateTime: request.requestDateTime
            }));

            // เริ่มจากจุดเริ่มต้น
            const optimizedWaypoints = [];
            let currentPosition = startPoint.coordinates;
            let remainingWaypoints = [...waypoints];
            let totalDistance = 0;
            
            // ใช้ Nearest Neighbor Algorithm
            while (remainingWaypoints.length > 0) {
                let nearestIndex = 0;
                let shortestDistance = this.calculateDistance(currentPosition, remainingWaypoints[0].coordinates);
                
                // หาจุดที่ใกล้ที่สุดจากตำแหน่งปัจจุบัน
                for (let i = 1; i < remainingWaypoints.length; i++) {
                    const distance = this.calculateDistance(currentPosition, remainingWaypoints[i].coordinates);
                    if (distance < shortestDistance) {
                        shortestDistance = distance;
                        nearestIndex = i;
                    }
                }
                
                // เพิ่มจุดที่ใกล้ที่สุดเข้าไปในเส้นทาง
                const nearestWaypoint = remainingWaypoints[nearestIndex];
                optimizedWaypoints.push({
                    ...nearestWaypoint,
                    sequence: optimizedWaypoints.length + 1,
                    distanceFromPrevious: shortestDistance
                });
                
                totalDistance += shortestDistance;
                currentPosition = nearestWaypoint.coordinates;
                remainingWaypoints.splice(nearestIndex, 1);
            }
            
            // คำนวณระยะทางกลับจุดเริ่มต้น
            const distanceToStart = this.calculateDistance(currentPosition, startPoint.coordinates);
            totalDistance += distanceToStart;
            
            // คำนวณเวลาโดยประมาณ (สมมติเฉลี่ย 30 km/h ในเมือง)
            const estimatedDuration = Math.round((totalDistance / 1000) * 2); // นาที
            
            return {
                waypoints: optimizedWaypoints,
                totalDistance: Math.round(totalDistance), // เมตร
                totalDuration: estimatedDuration, // นาที
                startPoint: startPoint,
                returnDistance: Math.round(distanceToStart)
            };
            
        } catch (error) {
            throw new Error('เกิดข้อผิดพลาดในการคำนวณเส้นทาง: ' + error.message);
        }
    }
    
    // คำนวณระยะทางระหว่าง 2 จุด (Haversine formula)
    calculateDistance(point1, point2) {
        return geolib.getDistance(
            { latitude: point1.lat, longitude: point1.lng },
            { latitude: point2.lat, longitude: point2.lng }
        );
    }
    
    // แปลงที่อยู่เป็นพิกัด (Geocoding)
    async geocodeAddress(address) {
        try {
            // ใช้ Nominatim (OpenStreetMap) API - ฟรี
            const response = await axios.get('https://nominatim.openstreetmap.org/search', {
                params: {
                    q: address + ', Thailand',
                    format: 'json',
                    limit: 1,
                    countrycodes: 'th'
                },
                headers: {
                    'User-Agent': 'WasteManagementSystem/1.0'
                }
            });
            
            if (response.data && response.data.length > 0) {
                const result = response.data[0];
                return {
                    lat: parseFloat(result.lat),
                    lng: parseFloat(result.lon),
                    formatted_address: result.display_name
                };
            }
            
            throw new Error('ไม่พบพิกัดสำหรับที่อยู่นี้');
            
        } catch (error) {
            throw new Error('เกิดข้อผิดพลาดในการแปลงที่อยู่: ' + error.message);
        }
    }
    
    // ปรับปรุงเส้นทางด้วย 2-opt algorithm (optional - สำหรับผลลัพธ์ที่ดีขึ้น)
    optimize2Opt(waypoints) {
        let improved = true;
        let bestRoute = [...waypoints];
        let bestDistance = this.calculateTotalDistance(bestRoute);
        
        while (improved) {
            improved = false;
            
            for (let i = 1; i < bestRoute.length - 2; i++) {
                for (let j = i + 1; j < bestRoute.length; j++) {
                    if (j - i === 1) continue;
                    
                    const newRoute = this.swap2Opt(bestRoute, i, j);
                    const newDistance = this.calculateTotalDistance(newRoute);
                    
                    if (newDistance < bestDistance) {
                        bestRoute = newRoute;
                        bestDistance = newDistance;
                        improved = true;
                    }
                }
            }
        }
        
        return bestRoute;
    }
    
    swap2Opt(route, i, j) {
        const newRoute = [...route];
        newRoute.splice(i, j - i + 1, ...route.slice(i, j + 1).reverse());
        return newRoute;
    }
    
    calculateTotalDistance(waypoints) {
        let total = 0;
        for (let i = 0; i < waypoints.length - 1; i++) {
            total += this.calculateDistance(waypoints[i].coordinates, waypoints[i + 1].coordinates);
        }
        return total;
    }
}

module.exports = new RouteService();